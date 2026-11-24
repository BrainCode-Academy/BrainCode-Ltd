import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { config } from './config.ts';
import { db, getUserEntitlement } from './db.ts';
import { parseJsonSafe, type AuthUser } from './security.ts';
import {
  classifyAiError,
  createAiError,
  getAiHealthState,
  getConfiguredGeminiKey,
  recordAiHealthFailure,
  recordAiHealthSuccess,
} from './ai_errors.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = getConfiguredGeminiKey();
  if (!apiKey) {
    throw createAiError({
      code: 'AI_NOT_CONFIGURED',
      statusCode: 503,
      retryable: false,
      userMessage: 'GEMINI_API_KEY is not configured on the server. AI features are currently unavailable.',
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

export function getAiUsageSummary(userId: string) {
  const entitlement = getUserEntitlement(userId);
  const aiCfg = db.prepare(`SELECT * FROM ai_config WHERE id = 1`).get() as {
    daily_free_limit: number;
    daily_premium_limit: number;
    model_name: string;
    system_guardrail: string;
  };
  const todayPrefix = new Date().toISOString().slice(0, 10);
  const row = db
    .prepare(
      `SELECT COUNT(*) as requests_today, COALESCE(SUM(prompt_tokens_est), 0) as tokens_today
       FROM ai_usage_logs
       WHERE user_id = ? AND created_at LIKE ?`
    )
    .get(userId, `${todayPrefix}%`) as { requests_today: number; tokens_today: number };

  const dailyLimit = entitlement.isPremium
    ? Math.max(entitlement.limits.aiDailyLimit, aiCfg?.daily_premium_limit || 250)
    : aiCfg?.daily_free_limit || entitlement.limits.aiDailyLimit || 15;

  return {
    requestsToday: row.requests_today,
    tokensToday: row.tokens_today,
    dailyLimit,
    remaining: Math.max(0, dailyLimit - row.requests_today),
    model: aiCfg?.model_name || config.aiModel || 'gemini-4-hydrogen',
    aiConfigured: Boolean(getConfiguredGeminiKey()),
    aiStatus: getAiHealthState(),
  };
}

export interface AiAssistInput {
  user: AuthUser;
  prompt: string;
  mode:
    | 'explain_concept'
    | 'explain_code'
    | 'debug_error'
    | 'hint_only'
    | 'summarize_lesson'
    | 'practice_questions'
    | 'simplify_topic'
    | 'compare_techs'
    | 'review_code'
    | 'recommend_next'
    | 'explain_assessment'
    | 'platform_help';
  lessonId?: string;
  courseId?: string;
  exerciseId?: string;
  assessmentId?: string;
  codeSnippet?: string;
  errorText?: string;
}

export async function runAiAssistant(input: AiAssistInput) {
  const summary = getAiUsageSummary(input.user.id);
  if (summary.remaining <= 0) {
    const err = new Error(
      `Daily AI prompt limit reached (${summary.dailyLimit} prompts/day on your current plan). Upgrade or try again tomorrow.`
    );
    (err as Error & { statusCode?: number; code?: string }).statusCode = 429;
    (err as Error & { statusCode?: number; code?: string }).code = 'AI_QUOTA_EXCEEDED';
    throw err;
  }

  const aiCfg = db.prepare(`SELECT * FROM ai_config WHERE id = 1`).get() as {
    model_name: string;
    system_guardrail: string;
  };
  const entitlement = getUserEntitlement(input.user.id);

  // Only inject authorized lesson/course/exercise context (verify access tier before reading full content)
  let authorizedLessonContext = '';
  if (input.lessonId) {
    const lesson = db
      .prepare(`SELECT id, course_id, title, summary, content_markdown, access_tier FROM lessons WHERE id = ?`)
      .get(input.lessonId) as
      | { id: string; course_id: string; title: string; summary: string; content_markdown: string; access_tier: string }
      | undefined;

    if (lesson) {
      if (lesson.access_tier === 'free' || entitlement.limits.canAccessPremiumCourses) {
        authorizedLessonContext = `\nCurrent Authorized Lesson: "${lesson.title}"\nSummary: ${lesson.summary}\nContent Excerpt:\n${lesson.content_markdown.slice(0, 1400)}`;
      } else {
        authorizedLessonContext = `\nCurrent Lesson Title: "${lesson.title}" (Summary only — user has not unlocked premium content: ${lesson.summary})`;
      }
    }
  }

  let authorizedCourseContext = '';
  if (input.courseId) {
    const course = db
      .prepare(`SELECT c.title, c.difficulty, c.description, t.name as tech_name FROM courses c LEFT JOIN technologies t ON t.id = c.technology_id WHERE c.id = ?`)
      .get(input.courseId) as { title: string; difficulty: string; description: string; tech_name: string } | undefined;
    if (course) {
      authorizedCourseContext = `\nActive Course: "${course.title}" (${course.difficulty}, Technology: ${course.tech_name || 'General'})\nCourse Overview: ${course.description}`;
    }
  }

  let authorizedExerciseContext = '';
  if (input.exerciseId) {
    const ex = db
      .prepare(
        `SELECT e.title, e.exercise_type, e.prompt, e.hint_text, l.access_tier
         FROM exercises e LEFT JOIN lessons l ON l.id = e.lesson_id
         WHERE e.id = ?`
      )
      .get(input.exerciseId) as
      | { title: string; exercise_type: string; prompt: string; hint_text: string; access_tier: string | null }
      | undefined;
    if (ex) {
      if (!ex.access_tier || ex.access_tier === 'free' || entitlement.limits.canAccessPremiumCourses) {
        authorizedExerciseContext = `\nActive Exercise (${ex.exercise_type}): "${ex.title}"\nPrompt: ${ex.prompt}${ex.hint_text ? `\nAvailable Hint Direction: ${ex.hint_text}` : ''}\nIMPORTANT: Do NOT output the direct final answer unless user asks to review an already-written attempt; guide them step-by-step.`;
      } else {
        authorizedExerciseContext = `\nActive Exercise: "${ex.title}" (Premium exercise — provide general conceptual guidance only).`;
      }
    }
  }

  let authorizedAssessmentContext = '';
  if (input.assessmentId) {
    const asm = db
      .prepare(`SELECT title, type, passing_score_pct FROM assessments WHERE id = ?`)
      .get(input.assessmentId) as { title: string; type: string; passing_score_pct: number } | undefined;
    if (asm) {
      authorizedAssessmentContext = `\nAssessment Context: "${asm.title}" (${asm.type}, passing threshold ${asm.passing_score_pct || 70}%). Never reveal direct quiz answer keys; explain underlying principles and mistake analysis.`;
    }
  }

  // Non-sensitive learner profile context
  const preferredTechs = parseJsonSafe<string[]>(input.user.preferred_techs_json, []);
  const enrolledCourses = db
    .prepare(
      `SELECT c.title, c.difficulty FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = ?`
    )
    .all(input.user.id) as Array<{ title: string; difficulty: string }>;

  const contextParts: string[] = [
    `Learner Skill Level: ${input.user.skill_level || 'beginner'}`,
    preferredTechs.length ? `Preferred Technologies: ${preferredTechs.join(', ')}` : '',
    enrolledCourses.length
      ? `Enrolled Courses: ${enrolledCourses.map((c) => `${c.title} (${c.difficulty})`).join('; ')}`
      : '',
    `Requested Assist Mode: ${input.mode}`,
    authorizedCourseContext,
    authorizedLessonContext,
    authorizedExerciseContext,
    authorizedAssessmentContext,
    input.codeSnippet ? `\nWorkspace Code Snippet:\n\`\`\`\n${input.codeSnippet.slice(0, 3500)}\n\`\`\`` : '',
    input.errorText ? `\nObserved Error Output:\n${input.errorText.slice(0, 1000)}` : '',
  ].filter(Boolean);

  const modeDirectives: Record<AiAssistInput['mode'], string> = {
    explain_concept: 'Explain the concept in clear, accessible steps with one short concrete example.',
    explain_code: 'Walk through how the provided code executes line by line and highlight key patterns.',
    debug_error: 'Identify the probable root cause of the error and outline clear debugging steps.',
    hint_only: 'Provide progressive hints and guiding questions WITHOUT giving away the complete final answer.',
    summarize_lesson: 'Summarize the authorized lesson into concise key takeaways and practical action points.',
    practice_questions: 'Generate 3 targeted practice questions (with answer keys clearly separated at the bottom) based strictly on the topic.',
    simplify_topic: 'Explain the topic in plain, beginner-friendly language using everyday analogies and minimal jargon.',
    compare_techs: 'Compare the technologies objectively across syntax/paradigm, strengths, ideal use cases, and trade-offs in a crisp comparison.',
    review_code: 'Conduct a constructive code review covering correctness, edge cases, readability, maintainability, and concrete improvements.',
    recommend_next: 'Suggest the most logical next learning steps, courses, or Braincode career paths based on the learner skill level and enrolled courses.',
    explain_assessment: 'Explain why a concept or answer pattern works or fails in an assessment without leaking active quiz answer keys.',
    platform_help: 'Guide the user clearly through Braincode features (courses, exercises, coding workspace, learning paths, certificates, billing).',
  };

  const directive = modeDirectives[input.mode] || modeDirectives.explain_concept;
  const systemInstruction = `${aiCfg?.system_guardrail || ''}\n\n${directive}\nNever fabricate user account data. Remind learners briefly when appropriate that AI explanations are assistive guidance and should be verified by running tests.`;

  const fullPrompt = `${contextParts.join('\n')}\n\nUser Question:\n${input.prompt.slice(0, 2000)}`;
  const modelName = aiCfg?.model_name || 'gemini-4-hydrogen';

  const ai = getAiClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: {
        systemInstruction,
        thinkingConfig: modelName === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
      },
    });
    recordAiHealthSuccess(modelName);
  } catch (err) {
    const classified = recordAiHealthFailure(err, modelName);
    throw createAiError(classified);
  }

  const replyText = response.text || '';
  if (!replyText.trim()) {
    throw new Error('The AI assistant returned an empty response. Please refine your prompt and try again.');
  }

  const estimatedTokens = Math.ceil((fullPrompt.length + replyText.length) / 4);
  db.prepare(
    `INSERT INTO ai_usage_logs (id, user_id, context_type, prompt_tokens_est, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    `ailog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    input.user.id,
    input.mode,
    estimatedTokens,
    new Date().toISOString()
  );

  return {
    reply: replyText,
    model: modelName,
    disclaimer: 'AI-generated learning assistance — verify code behavior in the workspace sandbox.',
    usage: getAiUsageSummary(input.user.id),
  };
}
