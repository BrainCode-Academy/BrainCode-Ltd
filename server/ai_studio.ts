import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { config } from './config.ts';
import { db, recordAuditLog } from './db.ts';
import { getCompletenessPolicy, runLessonQualityCheck } from './curriculum_qa_engine.ts';
import { evaluateLessonIntelligence, sanitizeRichText } from './curriculum_intelligence.ts';
import { parseJsonSafe, type AuthUser } from './security.ts';
import {
  classifyAiError,
  createAiError,
  getAiHealthState,
  getConfiguredGeminiKey,
  isGeminiKeyConfigured,
  recordAiHealthFailure,
  recordAiHealthSuccess,
} from './ai_errors.ts';

export type StudioTargetType =
  | 'course_outline'
  | 'module_outline'
  | 'topic_outline'
  | 'full_lesson'
  | 'code_examples'
  | 'exercises'
  | 'quiz'
  | 'assignment'
  | 'project_template'
  | 'reference_summary'
  | 'revision_notes';

export type StudioMode =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Professional'
  | 'Exam preparation'
  | 'Project-based learning';

export interface StudioGenerateInput {
  user: AuthUser;
  technologyId: string;
  learningPathId?: string;
  courseId?: string;
  moduleId?: string;
  topicName?: string;
  lessonTitle?: string;
  targetType: StudioTargetType;
  difficultyMode: StudioMode;
  targetAudience?: string;
  count?: number;
  learningObjectives?: string[];
  regenerateSection?: string;
  existingDraftJson?: Record<string, unknown>;
}

function getStudioAiClient(): GoogleGenAI {
  const apiKey = getConfiguredGeminiKey();
  if (!apiKey) {
    throw createAiError({
      code: 'AI_NOT_CONFIGURED',
      statusCode: 503,
      retryable: false,
      userMessage:
        'GEMINI_API_KEY is not configured on the server. Set GEMINI_API_KEY in environment secrets to run AI curriculum generation.',
      detail: 'Missing or placeholder GEMINI_API_KEY',
    });
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isStudioAiConfigured(): boolean {
  return isGeminiKeyConfigured();
}

export function getActiveStudioModel(): string {
  const aiCfg = db.prepare(`SELECT model_name FROM ai_config WHERE id = 1`).get() as { model_name?: string } | undefined;
  return aiCfg?.model_name || config.aiModel || 'gemini-4-hydrogen';
}

export function getStudioQuotaStatus(userId: string) {
  const policy = getCompletenessPolicy();
  const limit = policy.aiDailyGenerationLimit || 80;
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT COUNT(*) as calls, COALESCE(SUM(prompt_tokens_est), 0) as tokens
       FROM ai_usage_logs
       WHERE user_id = ? AND created_at LIKE ? AND context_type LIKE 'studio_%'`
    )
    .get(userId, `${todayPrefix}%`) as { calls: number; tokens: number };

  return {
    usedToday: row.calls,
    tokensToday: row.tokens,
    dailyLimit: limit,
    remaining: Math.max(0, limit - row.calls),
    aiConfigured: isStudioAiConfigured(),
    modelName: getActiveStudioModel(),
    aiStatus: getAiHealthState(),
  };
}

async function generateWithTransientRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  maxAttempts = 2
) {
  const modelName = String(params.model || getActiveStudioModel());
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      recordAiHealthSuccess(modelName);
      return response;
    } catch (err) {
      const classified = recordAiHealthFailure(err, modelName);
      lastError = createAiError(classified);
      // Critical guardrail: NEVER retry billing, invalid API key, quota exhaustion, or missing model errors
      if (!classified.retryable || attempt >= maxAttempts) {
        throw lastError;
      }
      const backoffMs = 450 * attempt;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
  throw lastError;
}

function assertStudioQuota(userId: string) {
  const quota = getStudioQuotaStatus(userId);
  if (quota.remaining <= 0) {
    const err = new Error(
      `Daily AI Studio generation quota reached (${quota.dailyLimit} generations/day). Increase limit in Completeness Policy or resume tomorrow.`
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 429;
    err.code = 'AI_QUOTA_EXCEEDED';
    throw err;
  }
  return quota;
}

function getStudioSchema(targetType: StudioTargetType) {
  if (targetType === 'full_lesson') {
    return {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        topic_name: { type: Type.STRING },
        language: { type: Type.STRING },
        summary: { type: Type.STRING },
        prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        concept_explanation: { type: Type.STRING },
        code_examples: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              language: { type: Type.STRING },
              code: { type: Type.STRING },
              expected_output: { type: Type.STRING },
            },
            required: ['title', 'language', 'code', 'expected_output'],
          },
        },
        syntax_rules: { type: Type.ARRAY, items: { type: Type.STRING } },
        practical_usage: { type: Type.STRING },
        common_mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
        best_practices: { type: Type.ARRAY, items: { type: Type.STRING } },
        mini_exercise: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            prompt: { type: Type.STRING },
            starter_code: { type: Type.STRING },
            hint: { type: Type.STRING },
            explanation: { type: Type.STRING },
          },
          required: ['title', 'prompt', 'hint'],
        },
        quick_check_questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              prompt: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correct_answer: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['prompt', 'options', 'correct_answer'],
          },
        },
        key_takeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
        next_topic: { type: Type.STRING },
        source_references: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['title', 'summary', 'objectives', 'concept_explanation', 'code_examples', 'key_takeaways'],
    };
  }

  if (targetType === 'exercises' || targetType === 'quiz') {
    return {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              kind: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              prompt: { type: Type.STRING },
              starter_code: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correct_answer: { type: Type.STRING },
              hint: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['prompt', 'correct_answer', 'explanation'],
          },
        },
      },
      required: ['title', 'items'],
    };
  }

  if (targetType === 'course_outline' || targetType === 'module_outline' || targetType === 'topic_outline') {
    return {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        difficulty: { type: Type.STRING },
        prerequisites: { type: Type.ARRAY, items: { type: Type.STRING } },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        modules: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              topics: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'topics'],
          },
        },
      },
      required: ['title', 'description', 'objectives', 'modules'],
    };
  }

  return {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      summary: { type: Type.STRING },
      content_markdown: { type: Type.STRING },
      requirements: { type: Type.ARRAY, items: { type: Type.STRING } },
      deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
      starter_code: { type: Type.STRING },
      language: { type: Type.STRING },
      source_references: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['title', 'summary', 'content_markdown'],
  };
}

export async function generateStudioDraftContent(input: StudioGenerateInput) {
  assertStudioQuota(input.user.id);

  const tech = db
    .prepare(`SELECT t.*, c.name as category_name FROM technologies t LEFT JOIN categories c ON c.id = t.category_id WHERE t.id = ?`)
    .get(input.technologyId) as Record<string, unknown> | undefined;
  if (!tech) {
    throw new Error('Selected technology not found.');
  }

  const blueprint = db
    .prepare(`SELECT title, summary, module_outline_json FROM curriculum_blueprints WHERE technology_id = ? LIMIT 1`)
    .get(input.technologyId) as { title: string; summary: string; module_outline_json: string } | undefined;

  const course = input.courseId
    ? (db.prepare(`SELECT title, difficulty, description FROM courses WHERE id = ?`).get(input.courseId) as
        | { title: string; difficulty: string; description: string }
        | undefined)
    : undefined;

  const aiCfg = db.prepare(`SELECT model_name FROM ai_config WHERE id = 1`).get() as { model_name?: string } | undefined;
  const modelName = aiCfg?.model_name || 'gemini-4-hydrogen';

  const count = Math.min(10, Math.max(1, Number(input.count || 3)));
  const topicLabel = input.lessonTitle || input.topicName || `${String(tech.name)} Core Workflow`;

  const prompt = [
    `You are a senior technology curriculum author writing structured educational material for Braincode.`,
    `Technology: ${String(tech.name)} (Category: ${String(tech.category_name || '')}, Slug: ${String(tech.slug)})`,
    `Technology Summary: ${String(tech.description || '')}`,
    blueprint ? `Curriculum Blueprint: ${blueprint.title} — ${blueprint.summary}` : '',
    course ? `Parent Course: ${course.title} (${course.difficulty})` : '',
    `Target Generation Type: ${input.targetType}`,
    `Difficulty / Pedagogy Mode: ${input.difficultyMode}`,
    input.targetAudience ? `Target Audience: ${input.targetAudience}` : '',
    `Topic / Lesson Focus: ${topicLabel}`,
    `Requested Item Count: ${count}`,
    input.learningObjectives?.length ? `Author Objectives: ${input.learningObjectives.join('; ')}` : '',
    input.regenerateSection
      ? `IMPORTANT: Specifically improve and regenerate the "${input.regenerateSection}" section while preserving coherent structure with the rest of the draft.`
      : '',
    input.existingDraftJson
      ? `Existing Draft JSON Context:\n${JSON.stringify(input.existingDraftJson).slice(0, 2200)}`
      : '',
    `Requirements: Output technically accurate, domain-specific ${String(tech.name)} content, concrete working code examples with expected outputs, common learner pitfalls, and zero placeholder lorem ipsum.`,
  ]
    .filter(Boolean)
    .join('\n');

  const ai = getStudioAiClient();
  const response = await generateWithTransientRetry(ai, {
    model: modelName,
    contents: prompt,
    config: {
      systemInstruction:
        'Respond strictly with valid JSON matching the provided schema. Never invent deprecated APIs. Keep explanations clear, structured, and verified.',
      responseMimeType: 'application/json',
      responseSchema: getStudioSchema(input.targetType),
      thinkingConfig: modelName === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
    },
  });

  const rawText = response.text || '';
  if (!rawText.trim()) {
    throw new Error('Gemini returned an empty curriculum response.');
  }

  const parsed = parseJsonSafe<Record<string, unknown> | null>(rawText, null);
  if (!parsed) {
    throw new Error('AI response could not be parsed as valid structured curriculum JSON.');
  }

  const estimatedTokens = Math.ceil((prompt.length + rawText.length) / 4);
  db.prepare(
    `INSERT INTO ai_usage_logs (id, user_id, context_type, prompt_tokens_est, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(
    `ailog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    input.user.id,
    `studio_${input.targetType}`,
    estimatedTokens,
    new Date().toISOString()
  );

  return {
    draft: parsed,
    model: modelName,
    estimatedTokens,
    workflowNotice: 'Generated content must be reviewed and saved as Draft before instructor approval and publication.',
    quota: getStudioQuotaStatus(input.user.id),
  };
}

export function build12SectionLessonMarkdown(draft: Record<string, unknown>): string {
  const sections: string[] = [];
  if (draft.summary) sections.push(`### 1. Topic Overview\n\n${String(draft.summary)}`);
  const prereqs = Array.isArray(draft.prerequisites) ? draft.prerequisites : [];
  if (prereqs.length) sections.push(`### 2. Prerequisites\n\n${prereqs.map((p) => `- ${String(p)}`).join('\n')}`);
  const objs = Array.isArray(draft.objectives) ? draft.objectives : [];
  if (objs.length) sections.push(`### 3. Learning Objectives\n\n${objs.map((o) => `- ${String(o)}`).join('\n')}`);
  if (draft.concept_explanation) sections.push(`### 4. Concept Explanation\n\n${String(draft.concept_explanation)}`);
  const rules = Array.isArray(draft.syntax_rules) ? draft.syntax_rules : [];
  if (rules.length) sections.push(`### 5. Syntax & Core Rules\n\n${rules.map((r) => `- ${String(r)}`).join('\n')}`);
  if (draft.practical_usage) sections.push(`### 6. Real-World Usage\n\n${String(draft.practical_usage)}`);
  const mistakes = Array.isArray(draft.common_mistakes) ? draft.common_mistakes : [];
  if (mistakes.length) sections.push(`### 7. Common Mistakes\n\n${mistakes.map((m) => `- ${String(m)}`).join('\n')}`);
  const practices = Array.isArray(draft.best_practices) ? draft.best_practices : [];
  if (practices.length) sections.push(`### 8. Best Practices\n\n${practices.map((b) => `- ${String(b)}`).join('\n')}`);
  const takeaways = Array.isArray(draft.key_takeaways) ? draft.key_takeaways : [];
  if (takeaways.length) sections.push(`### 9. Key Takeaways\n\n${takeaways.map((t) => `- ${String(t)}`).join('\n')}`);
  if (draft.next_topic) sections.push(`### 10. Next Recommended Topic\n\n${String(draft.next_topic)}`);
  if (sections.length === 0 && draft.content_markdown) return String(draft.content_markdown);
  return sections.join('\n\n');
}

export function saveAiDraftToCurriculum(params: {
  actorId: string;
  technologyId: string;
  courseId?: string;
  moduleId?: string;
  targetType: StudioTargetType;
  draft: Record<string, unknown>;
}): { entityType: string; entityId: string; workflowStatus: 'draft'; qaStatus: string; title: string } {
  const now = new Date().toISOString();
  const tech = db.prepare(`SELECT id, category_id, name, slug FROM technologies WHERE id = ?`).get(params.technologyId) as
    | { id: string; category_id: string; name: string; slug: string }
    | undefined;
  if (!tech) throw new Error('Technology not found.');

  const d = params.draft;
  const title = String(d.title || `${tech.name} Draft Unit`).trim();
  const sourceRefs = Array.isArray(d.source_references) ? d.source_references.map(String) : [];

  // Course outline saves a strict DRAFT course + modules + topics
  if (params.targetType === 'course_outline' || params.targetType === 'module_outline' || params.targetType === 'topic_outline') {
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `${tech.slug}-course`;
    let slug = baseSlug;
    let idx = 1;
    while (db.prepare(`SELECT 1 FROM courses WHERE slug = ?`).get(slug)) {
      slug = `${baseSlug}-${idx++}`;
    }
    const courseId = params.courseId || `crs_ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const existingCourse = params.courseId
      ? (db.prepare(`SELECT id FROM courses WHERE id = ?`).get(params.courseId) as { id: string } | undefined)
      : undefined;

    if (!existingCourse) {
      db.prepare(
        `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, prerequisites_json, difficulty, estimated_hours, instructor_id, assigned_instructor_id, thumbnail_url, is_published, status, workflow_status, is_ai_generated, qa_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 12, ?, ?, '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', 0, 'draft', 'draft', 1, 'pending', ?, ?)`
      ).run(
        courseId,
        tech.category_id,
        tech.id,
        title,
        slug,
        String(d.description || `${tech.name} structured draft course.`),
        JSON.stringify(Array.isArray(d.objectives) ? d.objectives : [`Master ${tech.name} fundamentals`]),
        JSON.stringify(Array.isArray(d.prerequisites) ? d.prerequisites : []),
        String(d.difficulty || 'Beginner'),
        params.actorId,
        params.actorId,
        now,
        now
      );
    }

    const modules = Array.isArray(d.modules) ? (d.modules as Array<Record<string, unknown>>) : [];
    modules.forEach((mod, mIdx) => {
      const mTitle = String(mod.title || `Module ${mIdx + 1}`).trim();
      const modId = `mod_ai_${Date.now()}_${mIdx}_${Math.random().toString(36).slice(2, 4)}`;
      db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
        modId,
        courseId,
        mTitle,
        String(mod.summary || mTitle),
        mIdx + 1
      );
      const topics = Array.isArray(mod.topics) ? mod.topics : [];
      topics.forEach((tp, tIdx) => {
        const tpTitle = String(tp).trim();
        if (!tpTitle) return;
        const tpSlug = `${tpTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${tIdx + 1}`;
        db.prepare(
          `INSERT INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(`top_ai_${Date.now()}_${mIdx}_${tIdx}`, courseId, modId, tpTitle, tpSlug, tpTitle, tIdx + 1, now);
      });
    });

    recordAuditLog(params.actorId, 'ai_studio.draft_course_saved', 'course', courseId, { technologyId: tech.id, title });
    return { entityType: 'course', entityId: courseId, workflowStatus: 'draft', qaStatus: 'pending', title };
  }

  // Ensure target course & module exist (create draft container course if none provided)
  let targetCourseId = params.courseId || '';
  if (!targetCourseId || !db.prepare(`SELECT 1 FROM courses WHERE id = ?`).get(targetCourseId)) {
    const draftCourse = db
      .prepare(`SELECT id FROM courses WHERE technology_id = ? AND status = 'draft' ORDER BY created_at DESC LIMIT 1`)
      .get(tech.id) as { id: string } | undefined;
    if (draftCourse) {
      targetCourseId = draftCourse.id;
    } else {
      targetCourseId = `crs_draft_${tech.slug}_${Date.now().toString().slice(-4)}`;
      db.prepare(
        `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, assigned_instructor_id, thumbnail_url, is_published, status, workflow_status, is_ai_generated, qa_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Beginner', 10, ?, ?, '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', 0, 'draft', 'draft', 1, 'pending', ?, ?)`
      ).run(
        targetCourseId,
        tech.category_id,
        tech.id,
        `${tech.name} Curriculum Draft Track`,
        `${tech.slug}-draft-${Date.now().toString().slice(-4)}`,
        `Draft curriculum workspace for ${tech.name}. Review and enrich before publication.`,
        JSON.stringify([`Apply core ${tech.name} concepts in practical workflows`]),
        params.actorId,
        params.actorId,
        now,
        now
      );
    }
  }

  let targetModuleId = params.moduleId || '';
  if (!targetModuleId || !db.prepare(`SELECT 1 FROM modules WHERE id = ? AND course_id = ?`).get(targetModuleId, targetCourseId)) {
    const existingMod = db
      .prepare(`SELECT id FROM modules WHERE course_id = ? ORDER BY sort_order ASC LIMIT 1`)
      .get(targetCourseId) as { id: string } | undefined;
    if (existingMod) {
      targetModuleId = existingMod.id;
    } else {
      targetModuleId = `mod_draft_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, 1)`).run(
        targetModuleId,
        targetCourseId,
        `Module 1: ${tech.name} Core Units`,
        `${tech.name} Foundations`
      );
    }
  }

  if (params.targetType === 'project_template') {
    const ptId = `ptpl_ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;
    db.prepare(
      `INSERT INTO project_templates (id, technology_id, learning_path_id, course_id, title, slug, category, difficulty, estimated_hours, summary, requirements_json, starter_files_json, deliverables_json, created_at)
       VALUES (?, ?, '', ?, ?, ?, ?, 'Intermediate', 6, ?, ?, ?, ?, ?)`
    ).run(
      ptId,
      tech.id,
      targetCourseId,
      title,
      slug,
      `${tech.name} Project`,
      String(d.summary || title),
      JSON.stringify(Array.isArray(d.requirements) ? d.requirements : [String(d.content_markdown || 'Implement project specification')]),
      JSON.stringify({ 'README.md': String(d.content_markdown || `# ${title}`), 'starter.txt': String(d.starter_code || '') }),
      JSON.stringify(Array.isArray(d.deliverables) ? d.deliverables : ['Working solution']),
      now
    );
    return { entityType: 'project_template', entityId: ptId, workflowStatus: 'draft', qaStatus: 'pending', title };
  }

  if (params.targetType === 'assignment') {
    const asnId = `asn_ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    db.prepare(
      `INSERT INTO assignments (id, course_id, module_id, technology_id, title, description, instructions_markdown, requirements_json, difficulty, xp_reward, due_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Intermediate', 120, 7, ?)`
    ).run(
      asnId,
      targetCourseId,
      targetModuleId,
      tech.id,
      title,
      String(d.summary || title),
      String(d.content_markdown || d.summary || title),
      JSON.stringify(Array.isArray(d.requirements) ? d.requirements : []),
      now
    );
    return { entityType: 'assignment', entityId: asnId, workflowStatus: 'draft', qaStatus: 'pending', title };
  }

  if (params.targetType === 'quiz' || params.targetType === 'exercises') {
    const items = Array.isArray(d.items) ? (d.items as Array<Record<string, unknown>>) : [];
    if (params.targetType === 'quiz') {
      const asmId = `asm_ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      const questions = items.map((q, idx) => ({
        id: `aiq_${idx + 1}`,
        kind: String(q.kind || 'multiple_choice'),
        prompt: String(q.prompt || ''),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: String(q.correct_answer || ''),
        explanation: String(q.explanation || ''),
      }));
      db.prepare(
        `INSERT INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, created_at)
         VALUES (?, ?, '', ?, 'quiz', 'untimed', 0, 90, ?, 70, ?)`
      ).run(asmId, targetCourseId, title, JSON.stringify(questions), now);
      return { entityType: 'assessment', entityId: asmId, workflowStatus: 'draft', qaStatus: 'pending', title };
    } else {
      let lastId = '';
      items.forEach((ex, idx) => {
        const exId = `ex_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 4)}`;
        lastId = exId;
        db.prepare(
          `INSERT INTO exercises (id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty, prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation, hint_text, xp_reward, sort_order, created_at)
           VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 25, ?, ?)`
        ).run(
          exId,
          targetCourseId,
          targetModuleId,
          tech.id,
          String(ex.title || `${tech.name} Practice ${idx + 1}`),
          Array.isArray(ex.options) && ex.options.length > 0 ? 'multiple_choice' : 'short_answer',
          String(ex.difficulty || 'Beginner'),
          String(ex.prompt || ''),
          String(ex.starter_code || ''),
          JSON.stringify(Array.isArray(ex.options) ? ex.options : []),
          String(ex.correct_answer || ''),
          JSON.stringify({ mode: 'exact_case_insensitive' }),
          String(ex.explanation || ''),
          String(ex.hint || ''),
          idx + 1,
          now
        );
      });
      return { entityType: 'exercise', entityId: lastId || 'batch', workflowStatus: 'draft', qaStatus: 'pending', title };
    }
  }

  // Default: Save structured 12-section lesson strictly as DRAFT
  const existingDup = db
    .prepare(`SELECT id FROM lessons WHERE course_id = ? AND LOWER(title) = LOWER(?) LIMIT 1`)
    .get(targetCourseId, title) as { id: string } | undefined;
  const finalTitle = existingDup ? `${title} (Draft ${Date.now().toString().slice(-3)})` : title;

  const lessonId = `les_ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
  const slug = `${finalTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50)}-${Date.now().toString().slice(-4)}`;
  const maxSort = (
    db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM lessons WHERE module_id = ?`).get(targetModuleId) as { m: number }
  ).m;

  const codeExamples = Array.isArray(d.code_examples) ? (d.code_examples as Array<Record<string, unknown>>) : [];
  const primaryExample = codeExamples[0];
  const markdown = build12SectionLessonMarkdown(d);
  const miniEx = (d.mini_exercise || {}) as Record<string, unknown>;
  const lang = String(d.language || primaryExample?.language || tech.slug || 'javascript').toLowerCase();

  const lessonCommonMistakes = Array.isArray(d.common_mistakes) ? d.common_mistakes.map((x) => sanitizeRichText(String(x))) : [];
  const lessonBestPractices = Array.isArray(d.best_practices) ? d.best_practices.map((x) => sanitizeRichText(String(x))) : [];
  const lessonTakeaways = Array.isArray(d.key_takeaways) ? d.key_takeaways.map((x) => sanitizeRichText(String(x))) : [];
  const nextGuidance = sanitizeRichText(String(d.next_topic || 'Continue to the next guided lesson and apply these concepts in the coding workspace.'));

  db.prepare(
    `INSERT INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, code_example, language, access_tier, duration_minutes, estimated_minutes, difficulty, exercise_prompt, starter_code, solution_hint, status, workflow_status, qa_status, quality_status, technical_verified, author_id, is_ai_generated, source_references_json, objectives_json, prerequisites_json, common_mistakes_json, best_practices_json, further_practice_json, next_step_guidance, version, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'free', 18, 18, 'Beginner', ?, ?, ?, 'draft', 'draft', 'pending', 'Incomplete', 0, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    lessonId,
    targetModuleId,
    targetCourseId,
    sanitizeRichText(finalTitle),
    slug,
    sanitizeRichText(String(d.topic_name || finalTitle)),
    sanitizeRichText(String(d.summary || finalTitle)),
    sanitizeRichText(markdown || `### ${finalTitle}\n\n${String(d.summary || '')}`),
    String(primaryExample?.code || d.starter_code || ''),
    lang,
    sanitizeRichText(String(miniEx.prompt || '')),
    String(miniEx.starter_code || ''),
    sanitizeRichText(String(miniEx.hint || '')),
    params.actorId,
    JSON.stringify(sourceRefs),
    JSON.stringify(Array.isArray(d.objectives) ? d.objectives.map((x) => sanitizeRichText(String(x))) : []),
    JSON.stringify(Array.isArray(d.prerequisites) ? d.prerequisites.map((x) => sanitizeRichText(String(x))) : []),
    JSON.stringify(lessonCommonMistakes),
    JSON.stringify(lessonBestPractices),
    JSON.stringify(lessonTakeaways),
    nextGuidance,
    maxSort + 1,
    now
  );

  // Persist structured lesson_content_blocks cleanly in draft
  const insBlk = db.prepare(
    `INSERT INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
     VALUES (?, ?, ?, ?, ?, '{}', ?)`
  );
  let blkSort = 1;
  if (d.concept_explanation) {
    insBlk.run(`blk_ai_${Date.now()}_${blkSort}`, lessonId, 'paragraph', 'Core Concept Explanation', sanitizeRichText(String(d.concept_explanation)), blkSort++);
  }
  if (lessonCommonMistakes.length > 0) {
    insBlk.run(`blk_ai_${Date.now()}_${blkSort}`, lessonId, 'common_mistakes', 'Common Learner Mistakes', lessonCommonMistakes.map((m) => `- ${m}`).join('\n'), blkSort++);
  }
  if (lessonBestPractices.length > 0) {
    insBlk.run(`blk_ai_${Date.now()}_${blkSort}`, lessonId, 'best_practices', 'Recommended Best Practices', lessonBestPractices.map((b) => `- ${b}`).join('\n'), blkSort++);
  }
  if (lessonTakeaways.length > 0) {
    insBlk.run(`blk_ai_${Date.now()}_${blkSort}`, lessonId, 'summary', 'Lesson Summary & Key Takeaways', lessonTakeaways.map((t) => `- ${t}`).join('\n'), blkSort++);
  }

  // Save multi-example records & structured lesson blocks
  codeExamples.forEach((ce, idx) => {
    db.prepare(
      `INSERT INTO code_examples (id, lesson_id, title, description, language, code, expected_output, is_runnable, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
    ).run(
      `ce_ai_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 4)}`,
      lessonId,
      String(ce.title || `Example ${idx + 1}`),
      String(ce.description || ''),
      String(ce.language || lang),
      String(ce.code || ''),
      String(ce.expected_output || ''),
      idx + 1
    );
  });

  if (miniEx.prompt) {
    db.prepare(
      `INSERT INTO exercises (id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty, prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation, hint_text, xp_reward, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'short_answer', 'Beginner', ?, ?, '[]', '', ?, ?, ?, 25, 1, ?)`
    ).run(
      `ex_ai_${Date.now()}_${Math.random().toString(36).slice(2, 4)}`,
      targetCourseId,
      targetModuleId,
      lessonId,
      tech.id,
      String(miniEx.title || `${finalTitle} Practice`),
      String(miniEx.prompt),
      String(miniEx.starter_code || ''),
      JSON.stringify({ mode: 'keyword_rubric', minLength: 10, keywords: [] }),
      String(miniEx.explanation || ''),
      String(miniEx.hint || ''),
      now
    );
  }

  const qa = runLessonQualityCheck(lessonId, params.actorId);
  evaluateLessonIntelligence(lessonId, params.actorId, true);
  recordAuditLog(params.actorId, 'ai_studio.draft_lesson_saved', 'lesson', lessonId, {
    technologyId: tech.id,
    title: finalTitle,
    qaStatus: qa?.validationStatus || 'pending',
  });

  return {
    entityType: 'lesson',
    entityId: lessonId,
    workflowStatus: 'draft',
    qaStatus: qa?.validationStatus || 'pending',
    title: finalTitle,
  };
}

// =========================================================
// BATCH CURRICULUM GENERATION ENGINE (PHASE 6)
// =========================================================

export function createBatchGenerationJob(params: {
  userId: string;
  technologyIds: string[];
  difficultyMode: StudioMode;
  targetAudience?: string;
  maxLessonsPerTech?: number;
}) {
  const normalizedTechIds = Array.from(new Set(params.technologyIds.slice(0, 10))).sort();
  const activeJobs = db
    .prepare(`SELECT id, status, config_json FROM ai_generation_jobs WHERE status IN ('queued', 'running', 'paused')`)
    .all() as Array<{ id: string; status: string; config_json: string }>;

  for (const job of activeJobs) {
    const cfg = parseJsonSafe<{ technologyIds?: string[]; difficultyMode?: string }>(job.config_json, {});
    const existingIds = Array.from(new Set((cfg.technologyIds || []).map(String))).sort();
    if (
      cfg.difficultyMode === params.difficultyMode &&
      existingIds.length === normalizedTechIds.length &&
      existingIds.every((val, i) => val === normalizedTechIds[i])
    ) {
      const err = new Error(
        `An active batch job (${job.id}, status: ${job.status}) already targets these technologies at ${params.difficultyMode} level. Resume or cancel it before creating a duplicate.`
      ) as Error & { statusCode?: number; code?: string; existingJobId?: string };
      err.statusCode = 409;
      err.code = 'DUPLICATE_BATCH_JOB';
      err.existingJobId = job.id;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const maxPerTech = Math.min(18, Math.max(1, Number(params.maxLessonsPerTech || 6)));

  const queuedItems: Array<{
    id: string;
    technologyId: string;
    blueprintId: string;
    moduleTitle: string;
    lessonTitle: string;
  }> = [];

  for (const techId of params.technologyIds.slice(0, 10)) {
    const bp = db
      .prepare(`SELECT id, module_outline_json FROM curriculum_blueprints WHERE technology_id = ? LIMIT 1`)
      .get(techId) as { id: string; module_outline_json: string } | undefined;
    if (!bp) continue;
    const mods = parseJsonSafe<Array<{ title: string; topics: string[] }>>(bp.module_outline_json, []);
    let added = 0;
    for (const mod of mods) {
      for (const topic of mod.topics || []) {
        if (added >= maxPerTech) break;
        queuedItems.push({
          id: `jitem_${Date.now()}_${queuedItems.length}_${Math.random().toString(36).slice(2, 5)}`,
          technologyId: techId,
          blueprintId: bp.id,
          moduleTitle: mod.title,
          lessonTitle: topic,
        });
        added++;
      }
      if (added >= maxPerTech) break;
    }
  }

  if (queuedItems.length === 0) {
    throw new Error('No blueprint topics found for the selected technologies.');
  }

  db.prepare(
    `INSERT INTO ai_generation_jobs (id, created_by, job_type, status, total_items, completed_items, failed_items, skipped_items, tokens_used_est, config_json, created_at, updated_at)
     VALUES (?, ?, 'batch_blueprint', 'queued', ?, 0, 0, 0, 0, ?, ?, ?)`
  ).run(
    jobId,
    params.userId,
    queuedItems.length,
    JSON.stringify({
      technologyIds: params.technologyIds,
      difficultyMode: params.difficultyMode,
      targetAudience: params.targetAudience || '',
      maxLessonsPerTech: maxPerTech,
    }),
    now,
    now
  );

  const insItem = db.prepare(
    `INSERT INTO ai_generation_job_items (id, job_id, technology_id, blueprint_id, module_title, lesson_title, status, attempts, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?)`
  );
  for (const item of queuedItems) {
    insItem.run(item.id, jobId, item.technologyId, item.blueprintId, item.moduleTitle, item.lessonTitle, now);
  }

  recordAuditLog(params.userId, 'ai_studio.batch_job_created', 'ai_generation_job', jobId, {
    totalItems: queuedItems.length,
    technologyIds: params.technologyIds,
  });

  return getBatchJobDetail(jobId);
}

export async function processBatchGenerationJob(jobId: string, actor: AuthUser, maxItemsToRun = 5) {
  const job = db.prepare(`SELECT * FROM ai_generation_jobs WHERE id = ?`).get(jobId) as Record<string, unknown> | undefined;
  if (!job) throw new Error('Generation job not found.');
  if (String(job.status) === 'cancelled') {
    throw new Error('Generation job was cancelled. Use Retry to re-queue cancelled or failed items.');
  }

  const cfg = parseJsonSafe<{ difficultyMode?: StudioMode; targetAudience?: string }>(String(job.config_json || '{}'), {});
  const items = db
    .prepare(
      `SELECT * FROM ai_generation_job_items WHERE job_id = ? AND status IN ('pending', 'failed') ORDER BY rowid ASC LIMIT ?`
    )
    .all(jobId, maxItemsToRun) as Array<Record<string, unknown>>;

  db.prepare(`UPDATE ai_generation_jobs SET status = 'running', updated_at = ? WHERE id = ?`).run(
    new Date().toISOString(),
    jobId
  );

  for (const item of items) {
    // Cooperative stop if job was paused or cancelled externally
    const latestJobState = db.prepare(`SELECT status FROM ai_generation_jobs WHERE id = ?`).get(jobId) as
      | { status: string }
      | undefined;
    if (latestJobState?.status === 'paused' || latestJobState?.status === 'cancelled') {
      break;
    }

    const itemId = String(item.id);
    const techId = String(item.technology_id);
    const lessonTitle = String(item.lesson_title);

    // Duplicate lesson check before incurring AI call
    const existingDup = db
      .prepare(
        `SELECT l.id FROM lessons l
         JOIN courses c ON c.id = l.course_id
         WHERE c.technology_id = ? AND LOWER(l.title) = LOWER(?) LIMIT 1`
      )
      .get(techId, lessonTitle) as { id: string } | undefined;

    if (existingDup) {
      db.prepare(
        `UPDATE ai_generation_job_items SET status = 'skipped_duplicate', generated_lesson_id = ?, updated_at = ? WHERE id = ?`
      ).run(existingDup.id, new Date().toISOString(), itemId);
      continue;
    }

    try {
      const generated = await generateStudioDraftContent({
        user: actor,
        technologyId: techId,
        topicName: String(item.module_title),
        lessonTitle,
        targetType: 'full_lesson',
        difficultyMode: cfg.difficultyMode || 'Beginner',
        targetAudience: cfg.targetAudience || '',
      });

      const saved = saveAiDraftToCurriculum({
        actorId: actor.id,
        technologyId: techId,
        targetType: 'full_lesson',
        draft: generated.draft,
      });

      db.prepare(
        `UPDATE ai_generation_job_items
         SET status = 'completed', generated_lesson_id = ?, tokens_used_est = ?, error_message = '', attempts = attempts + 1, updated_at = ?
         WHERE id = ?`
      ).run(saved.entityId, generated.estimatedTokens, new Date().toISOString(), itemId);
    } catch (err) {
      const classified = classifyAiError(err);
      const msg = classified.message || (err as Error).message || 'Generation failed.';
      const code = (err as Error & { code?: string }).code || classified.code;
      const nonRetryableHalts = new Set([
        'AI_NOT_CONFIGURED',
        'AI_QUOTA_EXCEEDED',
        'AI_BILLING_REQUIRED',
        'AI_AUTH_INVALID',
        'AI_UPSTREAM_QUOTA',
        'AI_MODEL_NOT_FOUND',
      ]);

      db.prepare(
        `UPDATE ai_generation_job_items
         SET status = 'failed', error_message = ?, attempts = attempts + 1, updated_at = ?
         WHERE id = ?`
      ).run(msg, new Date().toISOString(), itemId);

      if (nonRetryableHalts.has(code)) {
        db.prepare(`UPDATE ai_generation_jobs SET status = 'paused', error_message = ?, updated_at = ? WHERE id = ?`).run(
          `${code}: ${msg}`,
          new Date().toISOString(),
          jobId
        );
        const detail = recalculateBatchJobCounters(jobId);
        if (detail?.job && String(detail.job.status) !== 'paused') {
          db.prepare(`UPDATE ai_generation_jobs SET status = 'paused', updated_at = ? WHERE id = ?`).run(
            new Date().toISOString(),
            jobId
          );
        }
        return getBatchJobDetail(jobId);
      }
    }
  }

  return recalculateBatchJobCounters(jobId);
}

export function pauseBatchGenerationJob(jobId: string, actorId: string) {
  const job = db.prepare(`SELECT * FROM ai_generation_jobs WHERE id = ?`).get(jobId) as Record<string, unknown> | undefined;
  if (!job) throw new Error('Generation job not found.');
  if (String(job.status) === 'completed' || String(job.status) === 'cancelled') {
    throw new Error(`Cannot pause a job with status "${String(job.status)}".`);
  }
  const now = new Date().toISOString();
  db.prepare(`UPDATE ai_generation_jobs SET status = 'paused', updated_at = ? WHERE id = ?`).run(now, jobId);
  recordAuditLog(actorId, 'ai_studio.batch_job_paused', 'ai_generation_job', jobId, {});
  return getBatchJobDetail(jobId);
}

export function cancelBatchGenerationJob(jobId: string, actorId: string) {
  const job = db.prepare(`SELECT * FROM ai_generation_jobs WHERE id = ?`).get(jobId) as Record<string, unknown> | undefined;
  if (!job) throw new Error('Generation job not found.');
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE ai_generation_job_items SET status = 'cancelled', updated_at = ? WHERE job_id = ? AND status = 'pending'`
  ).run(now, jobId);
  db.prepare(`UPDATE ai_generation_jobs SET status = 'cancelled', completed_at = ?, updated_at = ? WHERE id = ?`).run(
    now,
    now,
    jobId
  );
  recordAuditLog(actorId, 'ai_studio.batch_job_cancelled', 'ai_generation_job', jobId, {});
  return getBatchJobDetail(jobId);
}

export async function retryBatchGenerationJob(jobId: string, actor: AuthUser, maxItemsToRun = 5) {
  const job = db.prepare(`SELECT * FROM ai_generation_jobs WHERE id = ?`).get(jobId) as Record<string, unknown> | undefined;
  if (!job) throw new Error('Generation job not found.');
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE ai_generation_job_items
     SET status = 'pending', error_message = '', updated_at = ?
     WHERE job_id = ? AND status IN ('failed', 'cancelled')`
  ).run(now, jobId);
  db.prepare(`UPDATE ai_generation_jobs SET status = 'queued', error_message = '', updated_at = ? WHERE id = ?`).run(
    now,
    jobId
  );
  recordAuditLog(actor.id, 'ai_studio.batch_job_retried', 'ai_generation_job', jobId, {});
  return processBatchGenerationJob(jobId, actor, maxItemsToRun);
}

export function recalculateBatchJobCounters(jobId: string) {
  const existingJob = db.prepare(`SELECT status FROM ai_generation_jobs WHERE id = ?`).get(jobId) as
    | { status: string }
    | undefined;
  const counts = db
    .prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status = 'skipped_duplicate' THEN 1 ELSE 0 END) as skipped,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
         COALESCE(SUM(tokens_used_est), 0) as tokens
       FROM ai_generation_job_items WHERE job_id = ?`
    )
    .get(jobId) as {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    pending: number;
    cancelled: number;
    tokens: number;
  };

  let status = 'completed';
  if (existingJob?.status === 'cancelled' && (counts.pending || 0) === 0) status = 'cancelled';
  else if (existingJob?.status === 'paused' && (counts.pending || 0) > 0) status = 'paused';
  else if ((counts.pending || 0) > 0 && (counts.failed || 0) > 0) status = 'paused';
  else if ((counts.pending || 0) > 0) status = 'queued';
  else if ((counts.failed || 0) > 0 && (counts.completed || 0) > 0) status = 'partial_failed';
  else if ((counts.failed || 0) > 0) status = 'failed';
  else if ((counts.cancelled || 0) > 0 && (counts.completed || 0) === 0) status = 'cancelled';

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE ai_generation_jobs
     SET total_items = ?, completed_items = ?, failed_items = ?, skipped_items = ?, tokens_used_est = ?,
         status = ?, updated_at = ?, completed_at = ?
     WHERE id = ?`
  ).run(
    counts.total || 0,
    counts.completed || 0,
    counts.failed || 0,
    counts.skipped || 0,
    counts.tokens || 0,
    status,
    now,
    status === 'completed' || status === 'cancelled' ? now : '',
    jobId
  );

  return getBatchJobDetail(jobId);
}

export function listBatchJobs() {
  return db
    .prepare(
      `SELECT j.*, u.full_name as creator_name
       FROM ai_generation_jobs j LEFT JOIN users u ON u.id = j.created_by
       ORDER BY j.created_at DESC LIMIT 40`
    )
    .all();
}

export function getBatchJobDetail(jobId: string) {
  const job = db
    .prepare(
      `SELECT j.*, u.full_name as creator_name
       FROM ai_generation_jobs j LEFT JOIN users u ON u.id = j.created_by
       WHERE j.id = ?`
    )
    .get(jobId) as Record<string, unknown> | undefined;
  if (!job) return null;
  const items = db
    .prepare(
      `SELECT i.*, t.name as technology_name
       FROM ai_generation_job_items i LEFT JOIN technologies t ON t.id = i.technology_id
       WHERE i.job_id = ? ORDER BY i.rowid ASC`
    )
    .all(jobId);
  return { job, items };
}
