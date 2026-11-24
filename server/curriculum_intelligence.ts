import { db } from './db.ts';
import { evaluateCourseCompleteness, getCompletenessPolicy } from './curriculum_qa_engine.ts';
import { executeInMemorySqlLab, validateLabSubmission } from './practical_labs.ts';
import { parseJsonSafe } from './security.ts';
import { resolveTechnologyCapability } from '../shared/technologyCapabilities.ts';

// =========================================================
// SANITIZATION & MEDIA SAFETY
// =========================================================

export function validateMediaUrl(rawUrl: string): { valid: boolean; sanitized: string; reason?: string } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { valid: true, sanitized: '' };
  if (/^(javascript|vbscript|data:text\/html)/i.test(trimmed)) {
    return { valid: false, sanitized: '', reason: 'Unsafe URI scheme rejected.' };
  }
  if (trimmed.startsWith('/')) {
    return { valid: true, sanitized: trimmed };
  }
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return { valid: true, sanitized: trimmed };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return { valid: true, sanitized: parsed.toString() };
    }
    return { valid: false, sanitized: '', reason: `Unsupported protocol "${parsed.protocol}".` };
  } catch {
    return { valid: false, sanitized: '', reason: 'Malformed media URL.' };
  }
}

export function sanitizeRichText(raw: string): string {
  let out = String(raw || '');
  if (!out) return '';
  out = out
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:')
    .replace(/vbscript\s*:/gi, 'blocked:');
  return out;
}

export function sanitizeStructuredMetadata(meta: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta || {})) {
    if (typeof v === 'string') {
      if (/url|src|href|image|video/i.test(k)) {
        const checked = validateMediaUrl(v);
        clean[k] = checked.valid ? checked.sanitized : '';
      } else {
        clean[k] = sanitizeRichText(v);
      }
    } else if (Array.isArray(v)) {
      clean[k] = v.map((item) => (typeof item === 'string' ? sanitizeRichText(item) : item));
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

// =========================================================
// REVIEW STATUS & QUALITY EVALUATION ENGINE (100-PT SCALE)
// =========================================================

export type QualityReviewStatus =
  | 'Not Audited'
  | 'Incomplete'
  | 'Needs Improvement'
  | 'Needs Technical Review'
  | 'Needs Editorial Review'
  | 'Ready for Approval'
  | 'Approved'
  | 'Published';

export interface QualityDimensionResult {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: 'pass' | 'partial' | 'fail' | 'exempt';
  detail: string;
}

export interface QualityEvaluationResult {
  id: string;
  entityType: 'course' | 'lesson';
  entityId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  reviewStatus: QualityReviewStatus;
  editorialStage: string;
  technicalVerified: boolean;
  technicalVerifiedBy: string;
  technicalVerifiedAt: string;
  dimensions: QualityDimensionResult[];
  missingRequirements: string[];
  warnings: string[];
  recommendations: string[];
  evaluatedBy: string;
  evaluatedAt: string;
}

function mapReviewStatusToLabel(params: {
  percentage: number;
  workflowStatus: string;
  isPublished: boolean;
  technicalVerified: boolean;
  missingCount: number;
  qaStatus: string;
}): QualityReviewStatus {
  if (params.isPublished && params.percentage >= 70 && params.technicalVerified) {
    return 'Published';
  }
  if (params.workflowStatus === 'approved') {
    return params.technicalVerified ? 'Approved' : 'Needs Technical Review';
  }
  if (params.qaStatus === 'fail' || params.percentage < 45) {
    return 'Incomplete';
  }
  if (params.percentage < 65 || params.missingCount >= 3) {
    return 'Needs Improvement';
  }
  if (!params.technicalVerified) {
    return 'Needs Technical Review';
  }
  if (params.workflowStatus === 'review') {
    return 'Needs Editorial Review';
  }
  if (params.isPublished) {
    return 'Published';
  }
  return 'Ready for Approval';
}

export function evaluateLessonIntelligence(
  lessonId: string,
  evaluatedBy = 'system',
  persist = true
): QualityEvaluationResult | null {
  const lesson = db
    .prepare(
      `SELECT l.*, c.title as course_title, c.technology_id, t.slug as tech_slug, t.name as tech_name, t.category_id,
              cat.slug as category_slug, cat.name as category_name
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN technologies t ON t.id = c.technology_id
       LEFT JOIN categories cat ON cat.id = t.category_id
       WHERE l.id = ?`
    )
    .get(lessonId) as Record<string, unknown> | undefined;

  if (!lesson) return null;

  const capability = lesson.tech_slug
    ? resolveTechnologyCapability({
        id: String(lesson.technology_id || ''),
        slug: String(lesson.tech_slug),
        name: String(lesson.tech_name || lesson.tech_slug),
        categoryId: String(lesson.category_id || ''),
        categorySlug: String(lesson.category_slug || ''),
        categoryName: String(lesson.category_name || ''),
      })
    : null;

  const isCodeOptional =
    capability?.environmentType === 'design_uiux_lab' || capability?.previewCapability === 'static_inspection_only';

  const objectives = parseJsonSafe<string[]>(String(lesson.objectives_json || '[]'), []);
  const prereqs = parseJsonSafe<string[]>(String(lesson.prerequisites_json || '[]'), []);
  const mistakes = parseJsonSafe<string[]>(String(lesson.common_mistakes_json || '[]'), []);
  const practices = parseJsonSafe<string[]>(String(lesson.best_practices_json || '[]'), []);
  const furtherPractice = parseJsonSafe<string[]>(String(lesson.further_practice_json || '[]'), []);

  const blocks = db
    .prepare(`SELECT id, block_type, title, content_markdown FROM lesson_content_blocks WHERE lesson_id = ?`)
    .all(lessonId) as Array<{ id: string; block_type: string; title: string; content_markdown: string }>;

  const codeExamples = db
    .prepare(`SELECT id, code, expected_output FROM code_examples WHERE lesson_id = ?`)
    .all(lessonId) as Array<{ id: string; code: string; expected_output: string }>;

  const exercises = db
    .prepare(`SELECT id, correct_answer, explanation FROM exercises WHERE lesson_id = ?`)
    .all(lessonId) as Array<{ id: string; correct_answer: string; explanation: string }>;

  const markdown = String(lesson.content_markdown || '');
  const summary = String(lesson.summary || '');
  const inlineCode = String(lesson.code_example || '');
  const visualMd = String(lesson.visual_explanation_markdown || '');
  const nextGuidance = String(lesson.next_step_guidance || '');

  const dims: QualityDimensionResult[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];
  const recs: string[] = [];

  // 1. Summary & Introduction Clarity (8)
  const introScore = summary.trim().length >= 30 ? 8 : summary.trim().length >= 10 ? 4 : 0;
  dims.push({
    key: 'intro_clarity',
    label: 'Summary & Introduction',
    score: introScore,
    maxScore: 8,
    status: introScore === 8 ? 'pass' : introScore > 0 ? 'partial' : 'fail',
    detail: summary.trim().length >= 30 ? 'Clear lesson overview present.' : 'Lesson summary is too short or missing.',
  });
  if (introScore < 8) {
    missing.push('Add a clear 1–2 sentence lesson summary explaining why the topic matters.');
  }

  // 2. Learning Objectives (10)
  const objScore = objectives.length >= 2 ? 10 : objectives.length === 1 ? 6 : 0;
  dims.push({
    key: 'objectives',
    label: 'Learning Objectives',
    score: objScore,
    maxScore: 10,
    status: objScore === 10 ? 'pass' : objScore > 0 ? 'partial' : 'fail',
    detail: `${objectives.length} learning objective(s) defined.`,
  });
  if (objectives.length === 0) {
    missing.push('Define at least 2 measurable learning objectives.');
  }

  // 3. Prerequisites & Difficulty / Estimated Time (7)
  const hasPrereqs = prereqs.length > 0;
  const hasDuration = Number(lesson.duration_minutes || 0) >= 5;
  const hasDifficulty = Boolean(String(lesson.difficulty || '').trim());
  const metaScore = (hasPrereqs ? 3 : 0) + (hasDuration ? 2 : 0) + (hasDifficulty ? 2 : 0);
  dims.push({
    key: 'progression_meta',
    label: 'Prerequisites & Progression Metadata',
    score: metaScore,
    maxScore: 7,
    status: metaScore >= 6 ? 'pass' : metaScore >= 3 ? 'partial' : 'fail',
    detail: `Prerequisites: ${prereqs.length}, Duration: ${Number(lesson.duration_minutes || 0)}m`,
  });
  if (!hasPrereqs) recs.push('Specify explicit lesson prerequisites so learners know what to review first.');

  // 4. Concept Explanation Depth (15)
  const charLen = markdown.trim().length;
  const explainScore = charLen >= 450 ? 15 : charLen >= 250 ? 11 : charLen >= 120 ? 6 : 0;
  dims.push({
    key: 'explanation_depth',
    label: 'Concept Explanation Depth',
    score: explainScore,
    maxScore: 15,
    status: explainScore === 15 ? 'pass' : explainScore >= 10 ? 'partial' : 'fail',
    detail: `${charLen} characters across structured markdown body.`,
  });
  if (charLen < 250) {
    missing.push(`Lesson explanation is brief (${charLen} chars; recommend >= 250 chars with clear step-by-step teaching).`);
  }

  // 5. Structured Content Blocks (10)
  const blockTypes = new Set(blocks.map((b) => b.block_type));
  const blocksScore = blocks.length >= 3 ? 10 : blocks.length >= 1 ? 6 : markdown.includes('###') ? 7 : 0;
  dims.push({
    key: 'structured_blocks',
    label: 'Structured Content Blocks',
    score: blocksScore,
    maxScore: 10,
    status: blocksScore >= 9 ? 'pass' : blocksScore >= 5 ? 'partial' : 'fail',
    detail: `${blocks.length} structured content block(s) (${Array.from(blockTypes).join(', ') || 'markdown sections'}).`,
  });
  if (blocks.length === 0 && !markdown.includes('###')) {
    warnings.push('No structured content blocks or sectioned headings found.');
  }

  // 6. Step-by-Step Walkthrough / Syntax Rules (10)
  const hasSteps =
    /step|syntax|how it works|walkthrough|example/i.test(markdown) ||
    blocks.some((b) => ['list', 'code_example', 'table'].includes(b.block_type));
  const stepScore = hasSteps ? 10 : 4;
  dims.push({
    key: 'walkthrough',
    label: 'Step-by-Step Walkthrough',
    score: stepScore,
    maxScore: 10,
    status: stepScore === 10 ? 'pass' : 'partial',
    detail: hasSteps ? 'Step-by-step instructional progression detected.' : 'Consider adding numbered steps or syntax rules.',
  });

  // 7. Code Examples & Expected Outputs (10)
  const totalCodeSnippets = Math.max(codeExamples.length, inlineCode.trim().length > 15 ? 1 : 0);
  const hasExpectedOut = codeExamples.some((ce) => String(ce.expected_output || '').trim().length > 0);
  let codeScore = 0;
  if (isCodeOptional && totalCodeSnippets === 0) {
    codeScore = 10;
  } else if (totalCodeSnippets >= 1 && (hasExpectedOut || capability?.previewCapability === 'live_browser_dom')) {
    codeScore = 10;
  } else if (totalCodeSnippets >= 1) {
    codeScore = 7;
  }
  dims.push({
    key: 'code_examples',
    label: 'Code Examples & Expected Output',
    score: codeScore,
    maxScore: 10,
    status: isCodeOptional && totalCodeSnippets === 0 ? 'exempt' : codeScore === 10 ? 'pass' : codeScore > 0 ? 'partial' : 'fail',
    detail:
      isCodeOptional && totalCodeSnippets === 0
        ? 'Exempt: design/architecture lesson uses visual/diagram artifact instead of runtime code.'
        : `${totalCodeSnippets} code example(s), expected output annotated: ${hasExpectedOut ? 'yes' : 'no'}.`,
  });
  if (totalCodeSnippets === 0 && !isCodeOptional) {
    missing.push('Add at least one working, technology-appropriate code example.');
  }

  // 8. Visual / Best Practices / Common Mistakes (10)
  const hasVisualOrCallouts =
    Boolean(visualMd.trim()) ||
    mistakes.length > 0 ||
    practices.length > 0 ||
    blocks.some((b) => ['diagram', 'table', 'callout', 'visual_explanation', 'common_mistakes', 'best_practices', 'image'].includes(b.block_type)) ||
    /mistake|pitfall|best practice|summary|takeaway/i.test(markdown);
  const enrichmentScore =
    (visualMd.trim() || blocks.some((b) => ['diagram', 'table', 'visual_explanation', 'image'].includes(b.block_type)) ? 4 : 0) +
    (mistakes.length > 0 || /mistake|pitfall/i.test(markdown) || blockTypes.has('common_mistakes') ? 3 : 0) +
    (practices.length > 0 || /best practice/i.test(markdown) || blockTypes.has('best_practices') ? 3 : 0);
  dims.push({
    key: 'pedagogical_enrichment',
    label: 'Visuals, Mistakes & Best Practices',
    score: hasVisualOrCallouts ? Math.max(6, enrichmentScore) : 0,
    maxScore: 10,
    status: enrichmentScore >= 8 ? 'pass' : hasVisualOrCallouts ? 'partial' : 'fail',
    detail: `Mistakes: ${mistakes.length}, Best Practices: ${practices.length}, Visual notes: ${visualMd.trim() ? 'yes' : 'inline/blocks'}.`,
  });
  if (!hasVisualOrCallouts) {
    recs.push('Include common learner mistakes, best practices, or a visual/diagram comparison.');
  }

  // 9. Practical Activity / Exercises (10)
  const hasExPrompt = String(lesson.exercise_prompt || '').trim().length >= 15;
  const validExercises = exercises.filter((e) => String(e.explanation || '').trim().length > 0);
  const exScore = exercises.length >= 1 && validExercises.length === exercises.length ? 10 : hasExPrompt || exercises.length >= 1 ? 6 : 0;
  dims.push({
    key: 'practical_exercises',
    label: 'Practical Activity & Exercises',
    score: exScore,
    maxScore: 10,
    status: exScore === 10 ? 'pass' : exScore > 0 ? 'partial' : 'fail',
    detail: `${exercises.length} structured exercise(s); inline prompt: ${hasExPrompt ? 'yes' : 'no'}.`,
  });
  if (exScore < 6) {
    missing.push('Add a practical activity or structured interactive exercise with explanation.');
  }

  // 10. Summary & Next Step Guidance (5)
  const closureScore =
    (nextGuidance.trim().length > 10 || /next|takeaway|summary/i.test(markdown) ? 3 : 0) +
    (furtherPractice.length > 0 || blockTypes.has('summary') || blockTypes.has('next_steps') ? 2 : 0);
  dims.push({
    key: 'closure_guidance',
    label: 'Summary & Next Steps',
    score: closureScore,
    maxScore: 5,
    status: closureScore >= 4 ? 'pass' : closureScore > 0 ? 'partial' : 'fail',
    detail: nextGuidance ? 'Next lesson guidance provided.' : 'Check summary / next-lesson bridge.',
  });

  // 11. Technical Verification & QA Safety (5)
  const technicalVerified = Boolean(lesson.technical_verified);
  const qaOk = String(lesson.qa_status || 'pending') !== 'fail';
  const verScore = (technicalVerified ? 3 : 0) + (qaOk ? 2 : 0);
  dims.push({
    key: 'technical_verification',
    label: 'Technical Verification & QA Status',
    score: verScore,
    maxScore: 5,
    status: technicalVerified && qaOk ? 'pass' : qaOk ? 'partial' : 'fail',
    detail: technicalVerified
      ? `Independently verified by ${String(lesson.technical_verified_by || 'reviewer')}.`
      : 'Automated checks only — awaiting explicit human technical verification.',
  });
  if (!technicalVerified) {
    warnings.push('Automated quality score does NOT replace independent technical review.');
  }

  const totalScore = dims.reduce((s, d) => s + d.score, 0);
  const maxScore = dims.reduce((s, d) => s + d.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const reviewStatus = mapReviewStatusToLabel({
    percentage,
    workflowStatus: String(lesson.workflow_status || 'draft'),
    isPublished: String(lesson.status || 'draft') === 'published',
    technicalVerified,
    missingCount: missing.length,
    qaStatus: String(lesson.qa_status || 'pending'),
  });

  const evalId = `qev_les_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  if (persist) {
    db.prepare(
      `INSERT INTO curriculum_quality_evaluations
       (id, entity_type, entity_id, total_score, max_score, percentage, dimensions_json, missing_requirements_json, warnings_json, recommendations_json, review_status, technical_verified, evaluated_by, evaluated_at)
       VALUES (?, 'lesson', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      evalId,
      lessonId,
      totalScore,
      maxScore,
      percentage,
      JSON.stringify(dims),
      JSON.stringify(missing),
      JSON.stringify(warnings),
      JSON.stringify(recs),
      reviewStatus,
      technicalVerified ? 1 : 0,
      evaluatedBy,
      now
    );

    db.prepare(`UPDATE lessons SET quality_status = ? WHERE id = ?`).run(reviewStatus, lessonId);
  }

  return {
    id: evalId,
    entityType: 'lesson',
    entityId: lessonId,
    title: String(lesson.title || lessonId),
    score: totalScore,
    maxScore,
    percentage,
    reviewStatus,
    editorialStage: String(lesson.workflow_status || lesson.status || 'draft'),
    technicalVerified,
    technicalVerifiedBy: String(lesson.technical_verified_by || ''),
    technicalVerifiedAt: String(lesson.technical_verified_at || ''),
    dimensions: dims,
    missingRequirements: missing,
    warnings,
    recommendations: recs,
    evaluatedBy,
    evaluatedAt: now,
  };
}

export function evaluateCourseIntelligence(
  courseId: string,
  evaluatedBy = 'system',
  persist = true
): QualityEvaluationResult | null {
  const course = db
    .prepare(
      `SELECT c.*, t.slug as tech_slug, t.name as tech_name, t.category_id,
              cat.slug as category_slug, cat.name as category_name
       FROM courses c
       LEFT JOIN technologies t ON t.id = c.technology_id
       LEFT JOIN categories cat ON cat.id = c.category_id
       WHERE c.id = ?`
    )
    .get(courseId) as Record<string, unknown> | undefined;
  if (!course) return null;

  const baseComp = evaluateCourseCompleteness(courseId);
  const policy = getCompletenessPolicy();
  const t = policy.config.courseThresholds;

  const capability = course.tech_slug
    ? resolveTechnologyCapability({
        id: String(course.technology_id || ''),
        slug: String(course.tech_slug),
        name: String(course.tech_name || course.tech_slug),
        categoryId: String(course.category_id || ''),
        categorySlug: String(course.category_slug || ''),
        categoryName: String(course.category_name || ''),
      })
    : null;
  const isCodeOptional =
    capability?.environmentType === 'design_uiux_lab' || capability?.previewCapability === 'static_inspection_only';

  const objectives = parseJsonSafe<string[]>(String(course.objectives_json || '[]'), []);
  const outcomes = parseJsonSafe<string[]>(String(course.learning_outcomes_json || '[]'), []);
  const prereqs = parseJsonSafe<string[]>(String(course.prerequisites_json || '[]'), []);

  const modules = db.prepare(`SELECT id, title, estimated_minutes FROM modules WHERE course_id = ?`).all(courseId) as Array<
    Record<string, unknown>
  >;
  const lessons = db
    .prepare(`SELECT id, status, content_markdown, objectives_json, code_example, duration_minutes FROM lessons WHERE course_id = ?`)
    .all(courseId) as Array<Record<string, unknown>>;

  const publishedLessons = lessons.filter((l) => String(l.status) === 'published');
  const briefLessons = lessons.filter((l) => String(l.content_markdown || '').trim().length < 250);
  const lessonsMissingObj = lessons.filter((l) => parseJsonSafe<string[]>(String(l.objectives_json || '[]'), []).length === 0);

  const blocksCount = (
    db
      .prepare(`SELECT COUNT(*) as c FROM lesson_content_blocks b JOIN lessons l ON l.id = b.lesson_id WHERE l.course_id = ?`)
      .get(courseId) as { c: number }
  ).c;
  const codeExamplesCount = Math.max(
    (
      db
        .prepare(`SELECT COUNT(*) as c FROM code_examples ce JOIN lessons l ON l.id = ce.lesson_id WHERE l.course_id = ?`)
        .get(courseId) as { c: number }
    ).c,
    lessons.filter((l) => String(l.code_example || '').trim().length > 15).length
  );
  const exercisesCount = (
    db.prepare(`SELECT COUNT(*) as c FROM exercises WHERE course_id = ?`).get(courseId) as { c: number }
  ).c;
  const assessments = db
    .prepare(`SELECT id, questions_json, objective_tags_json FROM assessments WHERE course_id = ?`)
    .all(courseId) as Array<{ id: string; questions_json: string; objective_tags_json?: string }>;
  const totalQuizQuestions = assessments.reduce(
    (s, a) => s + parseJsonSafe<unknown[]>(a.questions_json, []).length,
    0
  );
  const assignments = db.prepare(`SELECT id, rubric_json FROM assignments WHERE course_id = ?`).all(courseId) as Array<{
    id: string;
    rubric_json: string;
  }>;
  const projectTemplates = db
    .prepare(`SELECT id, rubric_json FROM project_templates WHERE course_id = ? OR technology_id = ?`)
    .all(courseId, String(course.technology_id || '')) as Array<{ id: string; rubric_json: string }>;

  const dims: QualityDimensionResult[] = [];
  const missing: string[] = [];
  const warnings: string[] = [];
  const recs: string[] = [];

  // 12 Dimensions (total 100 pts)
  const descLen = String(course.description || '').trim().length;
  dims.push({
    key: 'overview_clarity',
    label: 'Course Overview & Value Proposition',
    score: descLen >= 60 ? 8 : descLen >= 25 ? 5 : 0,
    maxScore: 8,
    status: descLen >= 60 ? 'pass' : descLen >= 25 ? 'partial' : 'fail',
    detail: `Description length: ${descLen} chars.`,
  });

  const objCount = Math.max(objectives.length, outcomes.length);
  dims.push({
    key: 'objectives_alignment',
    label: 'Objectives & Learning Outcomes Alignment',
    score: objCount >= 3 ? 9 : objCount >= 1 ? 5 : 0,
    maxScore: 9,
    status: objCount >= 3 ? 'pass' : objCount >= 1 ? 'partial' : 'fail',
    detail: `${objCount} course-level objective/outcome statement(s); ${lessonsMissingObj.length} lesson(s) without objectives.`,
  });
  if (objCount === 0) missing.push('Course has no learning objectives defined.');
  if (lessonsMissingObj.length > 0) warnings.push(`${lessonsMissingObj.length} lesson(s) are missing individual learning objectives.`);

  dims.push({
    key: 'prerequisites_level',
    label: 'Prerequisites & Skill Level Clarity',
    score: (prereqs.length >= 1 ? 5 : 0) + (String(course.difficulty || '').trim() ? 3 : 0),
    maxScore: 8,
    status: prereqs.length >= 1 ? 'pass' : 'partial',
    detail: `Difficulty: ${String(course.difficulty || 'Unset')}, Prerequisites: ${prereqs.length}.`,
  });
  if (prereqs.length === 0) missing.push('Add prerequisite guidance for learners entering this course.');

  const emptyModules = modules.filter(
    (m) =>
      (db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE module_id = ?`).get(String(m.id)) as { c: number }).c === 0
  );
  dims.push({
    key: 'module_sequence',
    label: 'Module Structure & Coherence',
    score: modules.length >= t.minModules && emptyModules.length === 0 ? 8 : modules.length >= 1 ? 4 : 0,
    maxScore: 8,
    status: modules.length >= t.minModules && emptyModules.length === 0 ? 'pass' : modules.length >= 1 ? 'partial' : 'fail',
    detail: `${modules.length} module(s), ${emptyModules.length} empty module(s).`,
  });
  if (emptyModules.length > 0) missing.push(`${emptyModules.length} module(s) contain 0 lessons.`);

  const lessonCovScore =
    publishedLessons.length >= t.minPublishedLessons
      ? 12
      : publishedLessons.length >= 2
        ? 7
        : lessons.length >= 1
          ? 3
          : 0;
  dims.push({
    key: 'lesson_coverage',
    label: 'Published Lesson Coverage',
    score: lessonCovScore,
    maxScore: 12,
    status: lessonCovScore === 12 ? 'pass' : lessonCovScore > 0 ? 'partial' : 'fail',
    detail: `${publishedLessons.length} published / ${lessons.length} total lesson(s) (threshold: ${t.minPublishedLessons}).`,
  });
  if (publishedLessons.length < t.minPublishedLessons) {
    missing.push(`Publish at least ${t.minPublishedLessons} lessons (currently ${publishedLessons.length}).`);
  }

  const deepRatio = lessons.length > 0 ? (lessons.length - briefLessons.length) / lessons.length : 0;
  const contentDepthScore = lessons.length === 0 ? 0 : Math.round(deepRatio * 7) + (blocksCount >= lessons.length ? 3 : blocksCount > 0 ? 1 : 0);
  dims.push({
    key: 'explanation_depth',
    label: 'Lesson Explanations & Content Blocks',
    score: Math.min(10, contentDepthScore),
    maxScore: 10,
    status: contentDepthScore >= 8 ? 'pass' : contentDepthScore >= 4 ? 'partial' : 'fail',
    detail: `${lessons.length - briefLessons.length}/${lessons.length} lessons >= 250 chars; ${blocksCount} structured block(s).`,
  });
  if (briefLessons.length > 0) {
    warnings.push(`${briefLessons.length} lesson(s) have brief explanations (< 250 chars) and need deeper enrichment.`);
  }

  const codeScore = isCodeOptional
    ? 9
    : codeExamplesCount >= t.minCodeExamples
      ? 9
      : codeExamplesCount >= 1
        ? 5
        : 0;
  dims.push({
    key: 'code_examples',
    label: 'Code Examples & Technical Walkthroughs',
    score: codeScore,
    maxScore: 9,
    status: isCodeOptional ? 'exempt' : codeScore === 9 ? 'pass' : codeScore > 0 ? 'partial' : 'fail',
    detail: isCodeOptional ? 'Exempt by technology capability profile.' : `${codeExamplesCount} code example(s).`,
  });

  dims.push({
    key: 'exercises_practice',
    label: 'Interactive Exercises & Knowledge Checks',
    score: exercisesCount >= t.minExercises ? 10 : exercisesCount >= 1 ? 5 : 0,
    maxScore: 10,
    status: exercisesCount >= t.minExercises ? 'pass' : exercisesCount >= 1 ? 'partial' : 'fail',
    detail: `${exercisesCount} exercise(s) linked to course.`,
  });
  if (exercisesCount === 0) missing.push('Add interactive exercises for learner mastery checks.');

  const asmAligned = assessments.some((a) => parseJsonSafe<string[]>(String(a.objective_tags_json || '[]'), []).length > 0);
  const asmScore =
    assessments.length >= 1 && totalQuizQuestions >= t.minQuizQuestions
      ? asmAligned
        ? 8
        : 6
      : assessments.length >= 1
        ? 4
        : 0;
  dims.push({
    key: 'assessment_alignment',
    label: 'Assessments & Objective Alignment',
    score: asmScore,
    maxScore: 8,
    status: asmScore >= 7 ? 'pass' : asmScore > 0 ? 'partial' : 'fail',
    detail: `${assessments.length} assessment(s), ${totalQuizQuestions} question(s).`,
  });
  if (assessments.length === 0) missing.push('Add at least one graded assessment.');

  const hasRubricProjects =
    assignments.some((a) => parseJsonSafe<unknown[]>(a.rubric_json, []).length > 0) ||
    projectTemplates.some((p) => parseJsonSafe<unknown[]>(p.rubric_json, []).length > 0);
  const pracScore =
    (assignments.length >= t.minAssignments || projectTemplates.length >= t.minProjects) && hasRubricProjects
      ? 8
      : assignments.length + projectTemplates.length > 0
        ? 5
        : 0;
  dims.push({
    key: 'projects_rubrics',
    label: 'Practical Assignments, Projects & Rubrics',
    score: pracScore,
    maxScore: 8,
    status: pracScore === 8 ? 'pass' : pracScore > 0 ? 'partial' : 'fail',
    detail: `${assignments.length} assignment(s), ${projectTemplates.length} project template(s), rubric present: ${hasRubricProjects ? 'yes' : 'no'}.`,
  });
  if (assignments.length + projectTemplates.length === 0) {
    missing.push('Attach a practical assignment or capstone project template.');
  }

  const totalLessonMinutes = lessons.reduce((s, l) => s + Number(l.duration_minutes || 0), 0);
  const progScore = Number(course.estimated_hours || 0) > 0 && totalLessonMinutes > 0 ? 5 : 2;
  dims.push({
    key: 'progression_time',
    label: 'Progression Model & Study Time Realism',
    score: progScore,
    maxScore: 5,
    status: progScore === 5 ? 'pass' : 'partial',
    detail: `Estimated ${Number(course.estimated_hours || 0)}h (~${totalLessonMinutes}m across lessons).`,
  });

  const technicalVerified = Boolean(course.technical_verified);
  const qaOk = String(course.qa_status || 'pending') !== 'fail';
  dims.push({
    key: 'technical_review',
    label: 'Technical Review & Editorial Verification',
    score: (technicalVerified ? 3 : 0) + (qaOk ? 2 : 0),
    maxScore: 5,
    status: technicalVerified && qaOk ? 'pass' : qaOk ? 'partial' : 'fail',
    detail: technicalVerified
      ? `Verified by ${String(course.technical_verified_by || 'reviewer')}.`
      : 'Not yet technically verified by human SME/instructor.',
  });
  if (!technicalVerified) {
    warnings.push('Independent human technical verification not yet recorded.');
  }

  const totalScore = dims.reduce((s, d) => s + d.score, 0);
  const maxScore = dims.reduce((s, d) => s + d.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  if (baseComp?.recommendedActions.length) {
    for (const r of baseComp.recommendedActions) {
      if (!recs.includes(r)) recs.push(r);
    }
  }

  const reviewStatus = mapReviewStatusToLabel({
    percentage,
    workflowStatus: String(course.workflow_status || 'draft'),
    isPublished: Number(course.is_published) === 1 && String(course.status) === 'published',
    technicalVerified,
    missingCount: missing.length,
    qaStatus: String(course.qa_status || 'pending'),
  });

  const evalId = `qev_crs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  if (persist) {
    db.prepare(
      `INSERT INTO curriculum_quality_evaluations
       (id, entity_type, entity_id, total_score, max_score, percentage, dimensions_json, missing_requirements_json, warnings_json, recommendations_json, review_status, technical_verified, evaluated_by, evaluated_at)
       VALUES (?, 'course', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      evalId,
      courseId,
      totalScore,
      maxScore,
      percentage,
      JSON.stringify(dims),
      JSON.stringify(missing),
      JSON.stringify(warnings),
      JSON.stringify(recs),
      reviewStatus,
      technicalVerified ? 1 : 0,
      evaluatedBy,
      now
    );

    db.prepare(`UPDATE courses SET quality_status = ?, completeness_score = ? WHERE id = ?`).run(
      reviewStatus,
      percentage,
      courseId
    );
  }

  return {
    id: evalId,
    entityType: 'course',
    entityId: courseId,
    title: String(course.title || courseId),
    score: totalScore,
    maxScore,
    percentage,
    reviewStatus,
    editorialStage: String(course.workflow_status || course.status || 'draft'),
    technicalVerified,
    technicalVerifiedBy: String(course.technical_verified_by || ''),
    technicalVerifiedAt: String(course.technical_verified_at || ''),
    dimensions: dims,
    missingRequirements: missing,
    warnings,
    recommendations: recs,
    evaluatedBy,
    evaluatedAt: now,
  };
}

// =========================================================
// MASTER CURRICULUM AUDIT REPORT (PHASE 24 PART A)
// =========================================================

export interface AuditFindingLink {
  entityType: 'course' | 'module' | 'lesson' | 'exercise' | 'assessment' | 'assignment' | 'project_template';
  entityId: string;
  title: string;
  courseId?: string;
  courseTitle?: string;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
}

export function generateMasterCurriculumAudit() {
  const counts = {
    categories: (db.prepare(`SELECT COUNT(*) as c FROM categories`).get() as { c: number }).c,
    technologies: (db.prepare(`SELECT COUNT(*) as c FROM technologies`).get() as { c: number }).c,
    blueprints: (db.prepare(`SELECT COUNT(*) as c FROM curriculum_blueprints`).get() as { c: number }).c,
    learningPaths: (db.prepare(`SELECT COUNT(*) as c FROM learning_paths`).get() as { c: number }).c,
    courses: (db.prepare(`SELECT COUNT(*) as c FROM courses`).get() as { c: number }).c,
    publishedCourses: (
      db.prepare(`SELECT COUNT(*) as c FROM courses WHERE is_published = 1 AND status = 'published'`).get() as { c: number }
    ).c,
    draftCourses: (db.prepare(`SELECT COUNT(*) as c FROM courses WHERE is_published = 0 OR status != 'published'`).get() as { c: number }).c,
    modules: (db.prepare(`SELECT COUNT(*) as c FROM modules`).get() as { c: number }).c,
    lessons: (db.prepare(`SELECT COUNT(*) as c FROM lessons`).get() as { c: number }).c,
    publishedLessons: (db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE status = 'published'`).get() as { c: number }).c,
    draftLessons: (db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE status != 'published'`).get() as { c: number }).c,
    codeExamples: (db.prepare(`SELECT COUNT(*) as c FROM code_examples`).get() as { c: number }).c,
    exercises: (db.prepare(`SELECT COUNT(*) as c FROM exercises`).get() as { c: number }).c,
    assessments: (db.prepare(`SELECT COUNT(*) as c FROM assessments`).get() as { c: number }).c,
    assignments: (db.prepare(`SELECT COUNT(*) as c FROM assignments`).get() as { c: number }).c,
    projectTemplates: (db.prepare(`SELECT COUNT(*) as c FROM project_templates`).get() as { c: number }).c,
    learningObjectives: (db.prepare(`SELECT COUNT(*) as c FROM learning_objectives`).get() as { c: number }).c,
  };

  const courses = db
    .prepare(
      `SELECT c.*, t.name as technology_name, t.slug as technology_slug, cat.name as category_name
       FROM courses c
       LEFT JOIN technologies t ON t.id = c.technology_id
       LEFT JOIN categories cat ON cat.id = c.category_id
       ORDER BY c.title ASC`
    )
    .all() as Array<Record<string, unknown>>;

  const courseTitleMap = new Map<string, string>();
  for (const c of courses) courseTitleMap.set(String(c.id), String(c.title));

  const links: AuditFindingLink[] = [];

  const emptyCourses = db
    .prepare(`SELECT c.id, c.title FROM courses c WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.course_id = c.id)`)
    .all() as Array<{ id: string; title: string }>;
  emptyCourses.forEach((c) =>
    links.push({
      entityType: 'course',
      entityId: c.id,
      title: c.title,
      courseId: c.id,
      courseTitle: c.title,
      issue: 'Empty course with 0 lessons',
      severity: 'critical',
    })
  );

  const emptyModules = db
    .prepare(
      `SELECT m.id, m.title, m.course_id FROM modules m WHERE NOT EXISTS (SELECT 1 FROM lessons l WHERE l.module_id = m.id)`
    )
    .all() as Array<{ id: string; title: string; course_id: string }>;
  emptyModules.forEach((m) =>
    links.push({
      entityType: 'module',
      entityId: m.id,
      title: m.title,
      courseId: m.course_id,
      courseTitle: courseTitleMap.get(m.course_id) || '',
      issue: 'Empty module with 0 lessons',
      severity: 'warning',
    })
  );

  const lessons = db.prepare(`SELECT * FROM lessons`).all() as Array<Record<string, unknown>>;
  let lessonsMissingObjectives = 0;
  let lessonsBriefContent = 0;
  let lessonsMissingCodeExample = 0;
  let lessonsMissingBlocks = 0;
  let lessonsUnverifiedTechnical = 0;

  for (const l of lessons) {
    const lid = String(l.id);
    const cid = String(l.course_id);
    const cTitle = courseTitleMap.get(cid) || '';
    const objs = parseJsonSafe<string[]>(String(l.objectives_json || '[]'), []);
    if (objs.length === 0) {
      lessonsMissingObjectives++;
      links.push({
        entityType: 'lesson',
        entityId: lid,
        title: String(l.title),
        courseId: cid,
        courseTitle: cTitle,
        issue: 'Missing learning objectives',
        severity: 'warning',
      });
    }
    const contentLen = String(l.content_markdown || '').trim().length;
    if (contentLen < 250) {
      lessonsBriefContent++;
      links.push({
        entityType: 'lesson',
        entityId: lid,
        title: String(l.title),
        courseId: cid,
        courseTitle: cTitle,
        issue: `Brief explanation (${contentLen} chars < 250 recommended)`,
        severity: contentLen < 120 ? 'critical' : 'warning',
      });
    }
    const ceCount = (db.prepare(`SELECT COUNT(*) as c FROM code_examples WHERE lesson_id = ?`).get(lid) as { c: number }).c;
    if (ceCount === 0 && String(l.code_example || '').trim().length < 10) {
      lessonsMissingCodeExample++;
      links.push({
        entityType: 'lesson',
        entityId: lid,
        title: String(l.title),
        courseId: cid,
        courseTitle: cTitle,
        issue: 'Missing runnable/illustrative code example',
        severity: 'info',
      });
    }
    const blkCount = (
      db.prepare(`SELECT COUNT(*) as c FROM lesson_content_blocks WHERE lesson_id = ?`).get(lid) as { c: number }
    ).c;
    if (blkCount === 0) lessonsMissingBlocks++;
    if (!Number(l.technical_verified)) lessonsUnverifiedTechnical++;
  }

  const dupLessons = db
    .prepare(
      `SELECT course_id, LOWER(TRIM(title)) as norm_title, COUNT(*) as cnt
       FROM lessons GROUP BY course_id, LOWER(TRIM(title)) HAVING COUNT(*) > 1`
    )
    .all() as Array<{ course_id: string; norm_title: string; cnt: number }>;

  const exercises = db.prepare(`SELECT * FROM exercises`).all() as Array<Record<string, unknown>>;
  let exercisesMissingAnswer = 0;
  let exercisesMissingExplanation = 0;
  for (const ex of exercises) {
    if (!String(ex.correct_answer || '').trim() && !['short_answer', 'practical_task', 'design_submission'].includes(String(ex.exercise_type))) {
      exercisesMissingAnswer++;
    }
    if (!String(ex.explanation || '').trim()) {
      exercisesMissingExplanation++;
      links.push({
        entityType: 'exercise',
        entityId: String(ex.id),
        title: String(ex.title),
        courseId: String(ex.course_id),
        courseTitle: courseTitleMap.get(String(ex.course_id)) || '',
        issue: 'Exercise missing feedback explanation',
        severity: 'warning',
      });
    }
  }

  const assessments = db.prepare(`SELECT * FROM assessments`).all() as Array<Record<string, unknown>>;
  let assessmentsMissingQuestions = 0;
  let assessmentsMissingObjectives = 0;
  for (const a of assessments) {
    const qs = parseJsonSafe<unknown[]>(String(a.questions_json || '[]'), []);
    if (qs.length === 0) {
      assessmentsMissingQuestions++;
      links.push({
        entityType: 'assessment',
        entityId: String(a.id),
        title: String(a.title),
        courseId: String(a.course_id),
        courseTitle: courseTitleMap.get(String(a.course_id)) || '',
        issue: 'Assessment has 0 questions',
        severity: 'critical',
      });
    }
    const tags = parseJsonSafe<string[]>(String(a.objective_tags_json || '[]'), []);
    if (tags.length === 0) assessmentsMissingObjectives++;
  }

  const assignmentsMissingRubric = (
    db
      .prepare(`SELECT COUNT(*) as c FROM assignments WHERE rubric_json IS NULL OR TRIM(rubric_json) IN ('', '[]')`)
      .get() as { c: number }
  ).c;
  const projectTemplatesMissingRubric = (
    db
      .prepare(`SELECT COUNT(*) as c FROM project_templates WHERE rubric_json IS NULL OR TRIM(rubric_json) IN ('', '[]')`)
      .get() as { c: number }
  ).c;

  const coursesWithoutProjectsList = courses.filter((c) => {
    const cid = String(c.id);
    const ptCount = (db.prepare(`SELECT COUNT(*) as c FROM project_templates WHERE course_id = ?`).get(cid) as { c: number }).c;
    return ptCount === 0;
  });
  coursesWithoutProjectsList.forEach((c) =>
    links.push({
      entityType: 'course',
      entityId: String(c.id),
      title: String(c.title),
      courseId: String(c.id),
      courseTitle: String(c.title),
      issue: 'Course has 0 linked project templates',
      severity: 'warning',
    })
  );

  const coursesMissingObjectives = courses.filter(
    (c) => parseJsonSafe<string[]>(String(c.objectives_json || '[]'), []).length === 0
  ).length;
  const coursesMissingPrereqs = courses.filter(
    (c) => parseJsonSafe<string[]>(String(c.prerequisites_json || '[]'), []).length === 0
  ).length;
  const coursesUnverifiedTechnical = courses.filter((c) => !Number(c.technical_verified)).length;
  const techWithPublishedCourses = new Set(
    courses.filter((c) => Number(c.is_published) === 1 && String(c.status) === 'published').map((c) => String(c.technology_id))
  ).size;

  const courseScores = courses.map((c) => evaluateCourseIntelligence(String(c.id), 'audit', false)).filter(Boolean) as QualityEvaluationResult[];
  const averageCourseQuality = courseScores.length
    ? Math.round(courseScores.reduce((s, r) => s + r.percentage, 0) / courseScores.length)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: counts,
    coverage: {
      technologiesWithPublishedCourses: techWithPublishedCourses,
      technologiesWithoutPublishedCourses: Math.max(0, counts.technologies - techWithPublishedCourses),
      averageCourseQualityScore: averageCourseQuality,
    },
    findings: {
      emptyCourses: emptyCourses.length,
      emptyModules: emptyModules.length,
      coursesMissingObjectives,
      coursesMissingPrerequisites: coursesMissingPrereqs,
      coursesWithoutProjects: coursesWithoutProjectsList.length,
      lessonsMissingObjectives,
      lessonsBriefContent,
      lessonsMissingCodeExample,
      lessonsMissingBlocks,
      duplicateLessonTitlesSameCourse: dupLessons.length,
      exercisesMissingAnswer,
      exercisesMissingExplanation,
      assessmentsMissingQuestions,
      assessmentsMissingObjectives,
      assignmentsMissingRubric,
      projectTemplatesMissingRubric,
      coursesUnverifiedTechnical,
      lessonsUnverifiedTechnical,
    },
    actionableLinks: links.slice(0, 120),
    courseSummaries: courseScores.map((ev) => {
      const courseRow = courses.find((c) => String(c.id) === ev.entityId) || {};
      return {
        courseId: ev.entityId,
        title: ev.title,
        slug: String(courseRow.slug || ''),
        technologyId: String(courseRow.technology_id || ''),
        technologyName: String(courseRow.technology_name || ''),
        categoryName: String(courseRow.category_name || ''),
        difficulty: String(courseRow.difficulty || 'Beginner'),
        status: String(courseRow.status || 'draft'),
        workflowStatus: String(courseRow.workflow_status || 'draft'),
        isPublished: Number(courseRow.is_published) === 1,
        score: ev.score,
        maxScore: ev.maxScore,
        percentage: ev.percentage,
        reviewStatus: ev.reviewStatus,
        technicalVerified: ev.technicalVerified,
        missingCount: ev.missingRequirements.length,
        warningCount: ev.warnings.length,
        missingRequirements: ev.missingRequirements,
        warnings: ev.warnings,
      };
    }),
  };
}

// =========================================================
// ENHANCED MULTI-TYPE EXERCISE & ASSESSMENT GRADING ENGINE
// =========================================================

function normalizeScalar(val: unknown): string {
  return String(val ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseListAnswer(raw: string): string[] {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('[')) {
    const arr = parseJsonSafe<unknown[]>(trimmed, []);
    if (Array.isArray(arr)) return arr.map((x) => normalizeScalar(x)).filter(Boolean);
  }
  if (trimmed.includes('\n')) {
    return trimmed.split('\n').map(normalizeScalar).filter(Boolean);
  }
  return trimmed.split(',').map(normalizeScalar).filter(Boolean);
}

function parseMapAnswer(raw: string): Record<string, string> {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return {};
  if (trimmed.startsWith('{')) {
    const obj = parseJsonSafe<Record<string, unknown>>(trimmed, {});
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[normalizeScalar(k)] = normalizeScalar(v);
    }
    return out;
  }
  const out: Record<string, string> = {};
  for (const part of trimmed.split(/[\n;,]+/)) {
    const sep = part.includes('->') ? '->' : part.includes(':') ? ':' : '=';
    const idx = part.indexOf(sep);
    if (idx > 0) {
      const k = normalizeScalar(part.slice(0, idx));
      const v = normalizeScalar(part.slice(idx + sep.length));
      if (k) out[k] = v;
    }
  }
  return out;
}

function stableRowSignature(row: Record<string, unknown>): string {
  const keys = Object.keys(row).sort();
  return JSON.stringify(keys.map((k) => [k.toLowerCase(), row[k] === null ? null : String(row[k]).trim()]));
}

export function evaluateSqlAgainstReference(userSql: string, referenceSqlOrRule: string): {
  executed: boolean;
  isCorrect: boolean;
  score: number;
  feedback: string;
  stdout: string;
} {
  const userExec = executeInMemorySqlLab(userSql);
  if (!userExec.ok) {
    return {
      executed: true,
      isCorrect: false,
      score: 0,
      feedback: `SQL execution error: ${userExec.error || 'Query failed to run.'}`,
      stdout: '',
    };
  }

  const refTrimmed = String(referenceSqlOrRule || '').trim();
  if (/^(SELECT|WITH)\b/i.test(refTrimmed)) {
    const expectedExec = executeInMemorySqlLab(refTrimmed);
    if (expectedExec.ok) {
      const userSigs = userExec.rows.map(stableRowSignature);
      const expSigs = expectedExec.rows.map(stableRowSignature);
      const expColSet = new Set(expectedExec.columns.map((c) => c.toLowerCase()));
      const userColSet = new Set(userExec.columns.map((c) => c.toLowerCase()));
      const colOverlap = [...expColSet].filter((c) => userColSet.has(c)).length;

      if (expSigs.length === userSigs.length && expSigs.every((sig, idx) => sig === userSigs[idx])) {
        return {
          executed: true,
          isCorrect: true,
          score: 100,
          feedback: `Query executed against sandbox SQLite database (${userExec.rowCount} row(s)) and matched expected output.`,
          stdout: JSON.stringify(userExec.rows.slice(0, 10)),
        };
      }
      // Partial credit if columns match or row set overlaps
      const expSet = new Set(expSigs);
      const rowMatches = userSigs.filter((s) => expSet.has(s)).length;
      const partial = Math.min(
        90,
        Math.round(
          ((colOverlap / Math.max(1, expColSet.size)) * 35) +
          ((rowMatches / Math.max(1, expSigs.length)) * 55)
        )
      );
      return {
        executed: true,
        isCorrect: false,
        score: Math.max(10, partial),
        feedback: `Query ran (${userExec.rowCount} row(s)), expected ${expectedExec.rowCount} matching row(s) with columns [${expectedExec.columns.join(', ')}].`,
        stdout: JSON.stringify(userExec.rows.slice(0, 10)),
      };
    }
  }

  return {
    executed: true,
    isCorrect: userExec.rowCount > 0 || userExec.changes > 0,
    score: userExec.rowCount > 0 || userExec.changes > 0 ? 100 : 25,
    feedback: `Executed cleanly (${userExec.rowCount} row(s) returned, ${userExec.changes} change(s)).`,
    stdout: JSON.stringify(userExec.rows.slice(0, 10)),
  };
}

export function evaluateEnhancedExerciseAnswer(
  ex: {
    exercise_type: string;
    correct_answer: string;
    validation_rule_json: string;
    xp_reward: number;
    allow_partial_credit?: number;
    marks?: number;
  },
  answerText: string,
  codeSubmitted: string
): {
  isCorrect: boolean;
  score: number;
  status: 'graded' | 'pending_review';
  feedback: string;
  partialCreditApplied: boolean;
} {
  const rule = parseJsonSafe<{
    mode?: string;
    tokens?: string[];
    keywords?: string[];
    minLength?: number;
    jsTestExpression?: string;
    jsExpectedResult?: string;
    partialCredit?: boolean;
  }>(ex.validation_rule_json || '{}', {});

  const allowPartial = Boolean(ex.allow_partial_credit ?? rule.partialCredit ?? true);
  const rawInput = (codeSubmitted || answerText || '').trim();
  const normalizedInput = normalizeScalar(rawInput);
  const normalizedExpected = normalizeScalar(ex.correct_answer || '');
  const exType = String(ex.exercise_type || 'multiple_choice').toLowerCase();

  if (!rawInput) {
    return {
      isCorrect: false,
      score: 0,
      status: 'graded',
      feedback: 'Please provide an answer or code solution before submitting.',
      partialCreditApplied: false,
    };
  }

  if (exType === 'sql_write' || rule.mode === 'sql_execute') {
    const sqlRes = evaluateSqlAgainstReference(rawInput, ex.correct_answer);
    const finalScore = allowPartial || sqlRes.isCorrect ? sqlRes.score : sqlRes.isCorrect ? 100 : 0;
    return {
      isCorrect: sqlRes.isCorrect,
      score: finalScore,
      status: 'graded',
      feedback: sqlRes.feedback,
      partialCreditApplied: allowPartial && !sqlRes.isCorrect && finalScore > 0,
    };
  }

  if (exType === 'multi_select') {
    const expected = new Set(parseListAnswer(ex.correct_answer));
    const chosen = new Set(parseListAnswer(rawInput));
    if (expected.size === 0) {
      return { isCorrect: false, score: 0, status: 'graded', feedback: 'Exercise configuration missing expected options.', partialCreditApplied: false };
    }
    let hits = 0;
    let wrong = 0;
    for (const c of chosen) {
      if (expected.has(c)) hits++;
      else wrong++;
    }
    const exact = hits === expected.size && wrong === 0;
    const rawPct = Math.max(0, Math.round(((hits - wrong * 0.5) / expected.size) * 100));
    const score = exact ? 100 : allowPartial ? Math.min(95, rawPct) : 0;
    return {
      isCorrect: exact,
      score,
      status: 'graded',
      feedback: exact
        ? 'All correct options selected!'
        : `Matched ${hits}/${expected.size} expected option(s)${wrong > 0 ? ` (${wrong} incorrect selection)` : ''}.`,
      partialCreditApplied: allowPartial && !exact && score > 0,
    };
  }

  if (exType === 'matching') {
    const expectedMap = parseMapAnswer(ex.correct_answer);
    const actualMap = parseMapAnswer(rawInput);
    const totalPairs = Object.keys(expectedMap).length;
    if (totalPairs === 0) {
      const exact = normalizedInput === normalizedExpected;
      return { isCorrect: exact, score: exact ? 100 : 0, status: 'graded', feedback: exact ? 'Correct match!' : 'Review pairings and try again.', partialCreditApplied: false };
    }
    let matched = 0;
    for (const [k, v] of Object.entries(expectedMap)) {
      if (actualMap[k] && actualMap[k] === v) matched++;
    }
    const exact = matched === totalPairs && Object.keys(actualMap).length === totalPairs;
    const score = exact ? 100 : allowPartial ? Math.round((matched / totalPairs) * 100) : 0;
    return {
      isCorrect: exact,
      score,
      status: 'graded',
      feedback: exact ? 'All pairs matched accurately!' : `Matched ${matched}/${totalPairs} pairs correctly.`,
      partialCreditApplied: allowPartial && !exact && score > 0,
    };
  }

  if (exType === 'ordering') {
    const expectedList = parseListAnswer(ex.correct_answer);
    const actualList = parseListAnswer(rawInput);
    if (expectedList.length === 0) {
      const exact = normalizedInput === normalizedExpected;
      return { isCorrect: exact, score: exact ? 100 : 0, status: 'graded', feedback: exact ? 'Correct sequence!' : 'Check step order.', partialCreditApplied: false };
    }
    let posMatches = 0;
    expectedList.forEach((item, idx) => {
      if (actualList[idx] === item) posMatches++;
    });
    const exact = posMatches === expectedList.length && actualList.length === expectedList.length;
    const score = exact ? 100 : allowPartial ? Math.round((posMatches / expectedList.length) * 100) : 0;
    return {
      isCorrect: exact,
      score,
      status: 'graded',
      feedback: exact ? 'Sequence order is completely accurate!' : `${posMatches}/${expectedList.length} item(s) in the right position.`,
      partialCreditApplied: allowPartial && !exact && score > 0,
    };
  }

  if (exType === 'write_code' || exType === 'practical_task' || rule.mode === 'contains_tokens') {
    const tokens = Array.isArray(rule.tokens) && rule.tokens.length > 0 ? rule.tokens : [normalizedExpected].filter(Boolean);
    if (rule.jsTestExpression) {
      const vmRes = validateLabSubmission({
        language: 'javascript',
        code: rawInput,
        requiredTokens: tokens,
        jsTestExpression: rule.jsTestExpression,
        jsExpectedResult: rule.jsExpectedResult,
      });
      const score = vmRes.passedTaskChecks ? 100 : allowPartial && vmRes.valid ? Math.max(20, Math.round(((tokens.length - vmRes.missingTokens.length) / Math.max(1, tokens.length)) * 75)) : 0;
      return {
        isCorrect: vmRes.passedTaskChecks,
        score,
        status: 'graded',
        feedback: vmRes.passedTaskChecks
          ? `VM tests passed! Output: ${vmRes.stdout || 'verified'}`
          : vmRes.errors[0] || `Missing required patterns: ${vmRes.missingTokens.join(', ')}.`,
        partialCreditApplied: allowPartial && !vmRes.passedTaskChecks && score > 0,
      };
    }

    const missing = tokens.filter((tk) => !rawInput.toLowerCase().includes(String(tk).toLowerCase()));
    if (missing.length === 0) {
      return {
        isCorrect: true,
        score: 100,
        status: 'graded',
        feedback: `Passed automated checks! Required constructs (${tokens.join(', ')}) verified.`,
        partialCreditApplied: false,
      };
    }
    const partialScore = allowPartial ? Math.round(((tokens.length - missing.length) / Math.max(1, tokens.length)) * 100) : 0;
    return {
      isCorrect: false,
      score: partialScore,
      status: 'graded',
      feedback: `Check missing required pattern(s): ${missing.join(', ')}. Review the hint and try again.`,
      partialCreditApplied: allowPartial && partialScore > 0,
    };
  }

  if (exType === 'short_answer' || exType === 'scenario_analysis' || exType === 'design_submission' || rule.mode === 'keyword_rubric') {
    const minLen = Number(rule.minLength || 15);
    const keywords = Array.isArray(rule.keywords) && rule.keywords.length > 0 ? rule.keywords : [];
    const matched = keywords.filter((kw) => normalizedInput.includes(String(kw).toLowerCase()));
    if (rawInput.length < minLen) {
      return {
        isCorrect: false,
        score: allowPartial ? 20 : 0,
        status: 'graded',
        feedback: `Your response is too brief (${rawInput.length}/${minLen} characters minimum). Elaborate with clear reasoning.`,
        partialCreditApplied: allowPartial,
      };
    }
    if (keywords.length > 0) {
      const targetHits = Math.min(keywords.length, Math.max(2, Math.ceil(keywords.length * 0.6)));
      const score = Math.min(100, Math.round((matched.length / targetHits) * 100));
      const fullPass = matched.length >= targetHits;
      return {
        isCorrect: fullPass,
        score: allowPartial ? score : fullPass ? 100 : 0,
        status: fullPass ? 'graded' : 'pending_review',
        feedback: fullPass
          ? `Strong technical explanation! Covered key concept(s): ${matched.join(', ')}.`
          : `Covered ${matched.length}/${targetHits} target concept(s). Key concepts to include: ${keywords.slice(0, 4).join(', ')}.`,
        partialCreditApplied: allowPartial && !fullPass && score > 0,
      };
    }
    return {
      isCorrect: true,
      score: 85,
      status: 'pending_review',
      feedback: 'Submitted for instructor rubric review.',
      partialCreditApplied: false,
    };
  }

  // Exact match (multiple_choice, true_false, fill_blank, code_completion, find_error, predict_output)
  const isCorrect = normalizedInput === normalizedExpected;
  return {
    isCorrect,
    score: isCorrect ? 100 : 0,
    status: 'graded',
    feedback: isCorrect
      ? 'Correct! Well reasoned.'
      : 'Not quite right yet. Review the lesson example or use a hint before retrying.',
    partialCreditApplied: false,
  };
}

export interface AssessmentQuestionItem {
  id: string;
  kind: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  marks?: number;
  objectiveTag?: string;
  allowPartialCredit?: boolean;
  keywords?: string[];
}

export function gradeAssessmentSubmission(params: {
  questions: AssessmentQuestionItem[];
  submittedAnswers: Record<string, unknown>;
  passingScorePct: number;
  allowPartialCredit: boolean;
}) {
  let totalEarned = 0;
  let totalMax = 0;
  let hasSubjective = false;
  const objectiveStats = new Map<string, { earned: number; max: number }>();

  const feedback = params.questions.map((q) => {
    const marks = Math.max(1, Number(q.marks || 1));
    totalMax += marks;
    const objTag = String(q.objectiveTag || 'Core Concepts').trim();
    if (!objectiveStats.has(objTag)) objectiveStats.set(objTag, { earned: 0, max: 0 });
    const objBucket = objectiveStats.get(objTag)!;
    objBucket.max += marks;

    const rawAns = params.submittedAnswers[q.id];
    const answerStr = Array.isArray(rawAns)
      ? JSON.stringify(rawAns)
      : rawAns && typeof rawAns === 'object'
        ? JSON.stringify(rawAns)
        : String(rawAns ?? '').trim();

    if (q.kind === 'practical' || q.kind === 'design_submission') {
      hasSubjective = true;
      return {
        id: q.id,
        kind: q.kind,
        prompt: q.prompt,
        objectiveTag: objTag,
        userAnswer: answerStr,
        correctAnswer: 'Instructor Rubric Review',
        isCorrect: false,
        marksEarned: 0,
        marksPossible: marks,
        partialCredit: false,
        explanation: q.explanation,
        note: answerStr.length >= 10 ? 'Recorded for instructor review (no auto-marks awarded without execution/review).' : 'No submission text provided.',
      };
    }

    const qAllowPartial = q.allowPartialCredit ?? params.allowPartialCredit;
    const evalRes = evaluateEnhancedExerciseAnswer(
      {
        exercise_type: q.kind || 'multiple_choice',
        correct_answer: String(q.correctAnswer || ''),
        validation_rule_json: JSON.stringify({
          partialCredit: qAllowPartial,
          keywords: q.keywords || [],
        }),
        xp_reward: 0,
        allow_partial_credit: qAllowPartial ? 1 : 0,
        marks,
      },
      answerStr,
      answerStr
    );

    const earned = Number(((evalRes.score / 100) * marks).toFixed(2));
    totalEarned += earned;
    objBucket.earned += earned;

    return {
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      objectiveTag: objTag,
      userAnswer: answerStr,
      correctAnswer: q.correctAnswer,
      isCorrect: evalRes.isCorrect,
      marksEarned: earned,
      marksPossible: marks,
      partialCredit: evalRes.partialCreditApplied,
      explanation: q.explanation,
      note: evalRes.feedback,
    };
  });

  const roundedEarned = Number(totalEarned.toFixed(2));
  const safeMax = Math.max(1, totalMax);
  const percentage = Math.round((totalEarned / safeMax) * 100);
  const passed = !hasSubjective && percentage >= params.passingScorePct;

  const objectivePerformance = Array.from(objectiveStats.entries()).map(([objective, stat]) => ({
    objective,
    earned: Number(stat.earned.toFixed(2)),
    max: stat.max,
    percentage: stat.max > 0 ? Math.round((stat.earned / stat.max) * 100) : 0,
  }));

  return {
    score: roundedEarned,
    maxScore: safeMax,
    percentage,
    passed,
    hasSubjectiveQuestions: hasSubjective,
    status: hasSubjective ? ('pending_review' as const) : ('graded' as const),
    feedback,
    objectivePerformance,
  };
}

// =========================================================
// WEIGHTED RUBRIC GRADING & COMPETENCY TRACKING
// =========================================================

export interface RubricCriterionInput {
  criterion: string;
  points: number;
}

function normalizeRubricCriteria(
  items: Array<RubricCriterionInput | string | Record<string, unknown>>
): RubricCriterionInput[] {
  return (items || [])
    .map((rc) => {
      if (typeof rc === 'string') {
        const label = rc.trim();
        const pctMatch = label.match(/\((\d{1,3})\s*(?:%|pts|points)?\)/i);
        return { criterion: label, points: pctMatch ? Math.max(1, Number(pctMatch[1])) : 25 };
      }
      const obj = (rc || {}) as Record<string, unknown>;
      const label = String(obj.criterion || obj.title || obj.label || '').trim();
      const rawPts = obj.points ?? obj.weight ?? obj.maxPoints ?? 25;
      return { criterion: label, points: Math.max(1, Number(rawPts || 25)) };
    })
    .filter((rc) => rc.criterion.length > 0);
}

export function computeRubricScore(
  rubricCriteria: Array<RubricCriterionInput | string | Record<string, unknown>>,
  criterionScores: Array<{ criterion: string; awarded: number; comment?: string }>
) {
  const normalizedCriteria = normalizeRubricCriteria(rubricCriteria);
  let maxTotal = 0;
  let earnedTotal = 0;
  const normalizedDetails = normalizedCriteria.map((rc) => {
    const maxPts = Math.max(1, Number(rc.points || 0));
    maxTotal += maxPts;
    const match = criterionScores.find(
      (cs) => normalizeScalar(cs.criterion) === normalizeScalar(rc.criterion)
    );
    const awarded = Math.min(maxPts, Math.max(0, Number(match?.awarded ?? 0)));
    earnedTotal += awarded;
    return {
      criterion: rc.criterion,
      maxPoints: maxPts,
      awardedPoints: awarded,
      comment: String(match?.comment || '').trim(),
    };
  });

  const percentage = maxTotal > 0 ? Math.round((earnedTotal / maxTotal) * 100) : 0;
  return {
    earnedTotal,
    maxTotal,
    percentage,
    breakdown: normalizedDetails,
  };
}

export function recordLearnerCompetency(params: {
  userId: string;
  courseId: string;
  objectiveKey: string;
  objectiveTitle: string;
  scoreDeltaPct: number;
  evidenceType: 'lesson' | 'exercise' | 'assessment' | 'assignment' | 'project';
  evidenceId: string;
}) {
  const key = String(params.objectiveKey || params.objectiveTitle || 'core').trim().slice(0, 120);
  if (!key) return;

  const existing = db
    .prepare(
      `SELECT id, mastery_pct, evidence_count FROM learner_competencies
       WHERE user_id = ? AND course_id = ? AND objective_key = ?`
    )
    .get(params.userId, params.courseId, key) as
    | { id: string; mastery_pct: number; evidence_count: number }
    | undefined;

  const boundedPct = Math.min(100, Math.max(0, Math.round(params.scoreDeltaPct)));
  const now = new Date().toISOString();

  if (existing) {
    const nextMastery = Math.max(existing.mastery_pct, boundedPct);
    const nextStatus = nextMastery >= 80 ? 'mastered' : nextMastery >= 50 ? 'developing' : 'needs_review';
    db.prepare(
      `UPDATE learner_competencies
       SET mastery_pct = ?, status = ?, evidence_count = evidence_count + 1, last_evidence_type = ?, last_evidence_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(nextMastery, nextStatus, params.evidenceType, params.evidenceId, now, existing.id);
  } else {
    const nextStatus = boundedPct >= 80 ? 'mastered' : boundedPct >= 50 ? 'developing' : 'needs_review';
    db.prepare(
      `INSERT INTO learner_competencies
       (id, user_id, course_id, objective_key, objective_title, status, mastery_pct, evidence_count, last_evidence_type, last_evidence_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(
      `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      params.userId,
      params.courseId,
      key,
      String(params.objectiveTitle || key).slice(0, 220),
      nextStatus,
      boundedPct,
      params.evidenceType,
      params.evidenceId,
      now
    );
  }
}

export function getCourseCompetencySummary(courseId: string, userId?: string) {
  const course = db
    .prepare(`SELECT id, title, objectives_json, learning_outcomes_json, min_certificate_score, require_practical_projects FROM courses WHERE id = ?`)
    .get(courseId) as Record<string, unknown> | undefined;
  if (!course) return null;

  const objectives = parseJsonSafe<string[]>(String(course.objectives_json || '[]'), []);
  const normObjs = db
    .prepare(`SELECT * FROM learning_objectives WHERE entity_type = 'course' AND entity_id = ? ORDER BY sort_order ASC`)
    .all(courseId) as Array<Record<string, unknown>>;

  const targetObjectives =
    normObjs.length > 0
      ? normObjs.map((o) => ({ key: String(o.objective_code || o.id), title: String(o.title) }))
      : objectives.map((title, idx) => ({ key: `obj_${idx + 1}`, title }));

  const competencies = userId
    ? (db
        .prepare(`SELECT * FROM learner_competencies WHERE user_id = ? AND course_id = ?`)
        .all(userId, courseId) as Array<Record<string, unknown>>)
    : [];

  const compByKey = new Map<string, Record<string, unknown>>();
  for (const c of competencies) {
    compByKey.set(normalizeScalar(c.objective_key), c);
    compByKey.set(normalizeScalar(c.objective_title), c);
  }

  const totalLessons = (
    db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND status = 'published'`).get(courseId) as { c: number }
  ).c;
  const completedLessons = userId
    ? (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
             WHERE lp.course_id = ? AND lp.user_id = ? AND lp.completed = 1 AND l.status = 'published'`
          )
          .get(courseId, userId) as { c: number }
      ).c
    : 0;

  const totalExercises = (db.prepare(`SELECT COUNT(*) as c FROM exercises WHERE course_id = ?`).get(courseId) as { c: number }).c;
  const solvedExercises = userId
    ? (
        db
          .prepare(
            `SELECT COUNT(DISTINCT es.exercise_id) as c FROM exercise_submissions es
             JOIN exercises e ON e.id = es.exercise_id
             WHERE es.user_id = ? AND e.course_id = ? AND es.is_correct = 1`
          )
          .get(userId, courseId) as { c: number }
      ).c
    : 0;

  const assessmentBest = userId
    ? (db
        .prepare(
          `SELECT MAX(aa.percentage) as best_pct
           FROM assessment_attempts aa JOIN assessments a ON a.id = aa.assessment_id
           WHERE aa.user_id = ? AND a.course_id = ?`
        )
        .get(userId, courseId) as { best_pct: number | null })
    : { best_pct: null };

  const approvedPracticalCount = userId
    ? (
        db
          .prepare(
            `SELECT
              (SELECT COUNT(*) FROM assignment_submissions sub JOIN assignments a ON a.id = sub.assignment_id
               WHERE sub.user_id = ? AND a.course_id = ? AND sub.status IN ('approved','graded') AND sub.score >= 60) +
              (SELECT COUNT(*) FROM projects p JOIN project_templates pt ON pt.id = p.template_id
               WHERE p.owner_id = ? AND pt.course_id = ? AND p.status IN ('approved','submitted')) as cnt`
          )
          .get(userId, courseId, userId, courseId) as { cnt: number }
      ).cnt
    : 0;

  const matchedCompIds = new Set<string>();
  const items = targetObjectives.map((obj) => {
    const rec = compByKey.get(normalizeScalar(obj.key)) || compByKey.get(normalizeScalar(obj.title));
    if (rec?.id) matchedCompIds.add(String(rec.id));
    return {
      key: obj.key,
      title: obj.title,
      status: rec ? String(rec.status) : 'not_started',
      masteryPct: rec ? Number(rec.mastery_pct || 0) : 0,
      evidenceCount: rec ? Number(rec.evidence_count || 0) : 0,
    };
  });

  for (const c of competencies) {
    if (!matchedCompIds.has(String(c.id))) {
      items.push({
        key: String(c.objective_key || c.id),
        title: String(c.objective_title || c.objective_key || 'Objective'),
        status: String(c.status || 'developing'),
        masteryPct: Number(c.mastery_pct || 0),
        evidenceCount: Number(c.evidence_count || 1),
      });
    }
  }

  const avgMastery = items.length
    ? Math.round(items.reduce((s, it) => s + it.masteryPct, 0) / items.length)
    : totalLessons > 0
      ? Math.round((completedLessons / totalLessons) * 100)
      : 0;

  return {
    courseId,
    courseTitle: String(course.title || ''),
    minCertificateScore: Number(course.min_certificate_score || 0),
    requirePracticalProjects: Boolean(course.require_practical_projects),
    metrics: {
      completedLessons,
      totalLessons,
      solvedExercises,
      totalExercises,
      bestAssessmentPct: assessmentBest?.best_pct !== null ? Number(assessmentBest.best_pct) : null,
      approvedPracticalCount,
      averageMasteryPct: avgMastery,
    },
    objectives: items,
  };
}

// =========================================================
// RULE-BASED EXPLAINABLE LEARNER RECOMMENDATIONS
// =========================================================

export interface LearnerRecommendation {
  id: string;
  category:
    | 'continue_lesson'
    | 'retry_assessment'
    | 'review_weak_objective'
    | 'practice_exercise'
    | 'complete_assignment'
    | 'next_course';
  title: string;
  reason: string;
  actionLabel: string;
  targetType: 'course' | 'lesson' | 'assessment' | 'assignment';
  targetId: string;
  courseSlug?: string;
  lessonId?: string;
  requiresUpgrade?: boolean;
  priority: number;
}

export function getLearnerRecommendations(params: {
  userId: string;
  canAccessPremium: boolean;
  courseId?: string;
}): LearnerRecommendation[] {
  const recs: LearnerRecommendation[] = [];

  // 1. Failed or low-scoring recent assessments -> recommend remedial review lesson
  const failedAttempts = db
    .prepare(
      `SELECT aa.assessment_id, aa.percentage, aa.feedback_json, a.title as assessment_title, a.course_id, a.lesson_id,
              c.slug as course_slug, c.title as course_title
       FROM assessment_attempts aa
       JOIN assessments a ON a.id = aa.assessment_id
       JOIN courses c ON c.id = a.course_id
       WHERE aa.user_id = ? AND aa.passed = 0 AND c.is_published = 1
         AND (? = '' OR c.id = ?)
       ORDER BY aa.created_at DESC LIMIT 4`
    )
    .all(params.userId, params.courseId || '', params.courseId || '') as Array<Record<string, unknown>>;

  const seenAssessmentIds = new Set<string>();
  for (const att of failedAttempts) {
    const aid = String(att.assessment_id);
    if (seenAssessmentIds.has(aid)) continue;
    seenAssessmentIds.add(aid);
    // Check if learner subsequently passed this same assessment
    const passedLater = db
      .prepare(`SELECT 1 FROM assessment_attempts WHERE user_id = ? AND assessment_id = ? AND passed = 1 LIMIT 1`)
      .get(params.userId, aid);
    if (passedLater) continue;

    const fb = parseJsonSafe<Array<{ isCorrect?: boolean; objectiveTag?: string }>>(String(att.feedback_json || '[]'), []);
    const missedObjs = Array.from(
      new Set(fb.filter((f) => f.isCorrect === false && f.objectiveTag).map((f) => String(f.objectiveTag)))
    );

    const linkedLessonId = String(att.lesson_id || '');
    const fallbackLesson = !linkedLessonId
      ? (db
          .prepare(`SELECT id, title FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order ASC LIMIT 1`)
          .get(String(att.course_id)) as { id: string; title: string } | undefined)
      : undefined;

    recs.push({
      id: `rec_asm_${aid}`,
      category: 'retry_assessment',
      title: `Strengthen mastery before retaking "${String(att.assessment_title)}"`,
      reason: `Your last score was ${Number(att.percentage || 0)}%${missedObjs.length ? ` (missed: ${missedObjs.slice(0, 2).join(', ')})` : ''}. Review the lesson concepts and retry.`,
      actionLabel: 'Review & Retry',
      targetType: linkedLessonId || fallbackLesson ? 'lesson' : 'assessment',
      targetId: linkedLessonId || fallbackLesson?.id || aid,
      courseSlug: String(att.course_slug),
      lessonId: linkedLessonId || fallbackLesson?.id,
      priority: 100,
    });
  }

  // 2. Weak competency records (< 70%)
  const weakComps = db
    .prepare(
      `SELECT lc.*, c.slug as course_slug, c.title as course_title
       FROM learner_competencies lc
       JOIN courses c ON c.id = lc.course_id
       WHERE lc.user_id = ? AND lc.mastery_pct < 70 AND c.is_published = 1
         AND (? = '' OR c.id = ?)
       ORDER BY lc.mastery_pct ASC, lc.updated_at DESC LIMIT 3`
    )
    .all(params.userId, params.courseId || '', params.courseId || '') as Array<Record<string, unknown>>;

  for (const wc of weakComps) {
    recs.push({
      id: `rec_comp_${String(wc.id)}`,
      category: 'review_weak_objective',
      title: `Review objective: ${String(wc.objective_title)}`,
      reason: `Current mastery in "${String(wc.course_title)}" is ${Number(wc.mastery_pct)}% based on your submitted work.`,
      actionLabel: 'Practice Objective',
      targetType: 'course',
      targetId: String(wc.course_id),
      courseSlug: String(wc.course_slug),
      priority: 92,
    });
  }

  // 3. Enrolled courses -> next incomplete published lesson
  const enrolledCourses = db
    .prepare(
      `SELECT e.course_id, c.title as course_title, c.slug as course_slug
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? AND c.is_published = 1 AND c.status = 'published'
         AND (? = '' OR c.id = ?)
       ORDER BY e.enrolled_at DESC`
    )
    .all(params.userId, params.courseId || '', params.courseId || '') as Array<{
    course_id: string;
    course_title: string;
    course_slug: string;
  }>;

  for (const ec of enrolledCourses) {
    const nextLesson = db
      .prepare(
        `SELECT l.id, l.title, l.access_tier, l.duration_minutes
         FROM lessons l
         WHERE l.course_id = ? AND l.status = 'published'
           AND NOT EXISTS (
             SELECT 1 FROM lesson_progress lp WHERE lp.user_id = ? AND lp.lesson_id = l.id AND lp.completed = 1
           )
         ORDER BY l.sort_order ASC LIMIT 1`
      )
      .get(ec.course_id, params.userId) as
      | { id: string; title: string; access_tier: string; duration_minutes: number }
      | undefined;

    if (nextLesson) {
      const locked = nextLesson.access_tier === 'premium' && !params.canAccessPremium;
      recs.push({
        id: `rec_next_${nextLesson.id}`,
        category: 'continue_lesson',
        title: `Continue "${ec.course_title}": ${nextLesson.title}`,
        reason: locked
          ? `Next lesson in your enrolled course (${nextLesson.duration_minutes}m) requires Pro Learner access.`
          : `Next sequential lesson in your active course (~${nextLesson.duration_minutes} min).`,
        actionLabel: locked ? 'View Course Outline' : 'Resume Lesson',
        targetType: locked ? 'course' : 'lesson',
        targetId: locked ? ec.course_id : nextLesson.id,
        courseSlug: ec.course_slug,
        lessonId: locked ? undefined : nextLesson.id,
        requiresUpgrade: locked,
        priority: locked ? 70 : 88,
      });
    }
  }

  // 4. Unsolved exercises on completed lessons
  const pendingExercises = db
    .prepare(
      `SELECT e.id, e.title, e.lesson_id, e.course_id, c.slug as course_slug, l.title as lesson_title, l.access_tier
       FROM lesson_progress lp
       JOIN lessons l ON l.id = lp.lesson_id
       JOIN courses c ON c.id = l.course_id
       JOIN exercises e ON e.lesson_id = l.id
       WHERE lp.user_id = ? AND lp.completed = 1 AND l.status = 'published'
         AND (? = '' OR c.id = ?)
         AND NOT EXISTS (
           SELECT 1 FROM exercise_submissions es WHERE es.user_id = ? AND es.exercise_id = e.id AND es.is_correct = 1
         )
       LIMIT 3`
    )
    .all(params.userId, params.courseId || '', params.courseId || '', params.userId) as Array<Record<string, unknown>>;

  for (const pe of pendingExercises) {
    const locked = String(pe.access_tier) === 'premium' && !params.canAccessPremium;
    if (locked) continue;
    recs.push({
      id: `rec_ex_${String(pe.id)}`,
      category: 'practice_exercise',
      title: `Solve practice exercise: ${String(pe.title)}`,
      reason: `You completed "${String(pe.lesson_title)}" — reinforce the skill with its hands-on exercise.`,
      actionLabel: 'Open Exercise',
      targetType: 'lesson',
      targetId: String(pe.lesson_id),
      courseSlug: String(pe.course_slug),
      lessonId: String(pe.lesson_id),
      priority: 82,
    });
  }

  // 5. Assignments needing revision
  const needsRevision = db
    .prepare(
      `SELECT asub.assignment_id, a.title, a.course_id, c.slug as course_slug
       FROM assignment_submissions asub
       JOIN assignments a ON a.id = asub.assignment_id
       JOIN courses c ON c.id = a.course_id
       WHERE asub.user_id = ? AND asub.status = 'needs_revision'
         AND (? = '' OR c.id = ?)
       ORDER BY asub.updated_at DESC LIMIT 2`
    )
    .all(params.userId, params.courseId || '', params.courseId || '') as Array<Record<string, unknown>>;

  for (const nr of needsRevision) {
    recs.push({
      id: `rec_asn_${String(nr.assignment_id)}`,
      category: 'complete_assignment',
      title: `Revise assignment: ${String(nr.title)}`,
      reason: 'An instructor requested revisions on your submission.',
      actionLabel: 'Update Submission',
      targetType: 'assignment',
      targetId: String(nr.assignment_id),
      courseSlug: String(nr.course_slug),
      priority: 95,
    });
  }

  // 6. Beginner fallback for learners with no active recommendations yet
  if (recs.length === 0) {
    const userRow = db.prepare(`SELECT preferred_techs_json FROM users WHERE id = ?`).get(params.userId) as
      | { preferred_techs_json?: string }
      | undefined;
    const preferred = parseJsonSafe<string[]>(String(userRow?.preferred_techs_json || '[]'), []);
    const starterCourses = db
      .prepare(
        `SELECT c.id, c.title, c.slug, c.difficulty, t.name as tech_name
         FROM courses c JOIN technologies t ON t.id = c.technology_id
         WHERE c.is_published = 1 AND c.status = 'published'
           AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = ?)
         ORDER BY CASE LOWER(c.difficulty) WHEN 'beginner' THEN 1 WHEN 'intermediate' THEN 2 ELSE 3 END, c.created_at ASC
         LIMIT 6`
      )
      .all(params.userId) as Array<Record<string, unknown>>;

    starterCourses.sort((a, b) => {
      const am = preferred.some((p) => String(a.tech_name).toLowerCase().includes(p.toLowerCase())) ? 1 : 0;
      const bm = preferred.some((p) => String(b.tech_name).toLowerCase().includes(p.toLowerCase())) ? 1 : 0;
      return bm - am;
    });

    for (const sc of starterCourses.slice(0, 3)) {
      recs.push({
        id: `rec_crs_${String(sc.id)}`,
        category: 'next_course',
        title: `Start ${String(sc.title)}`,
        reason: `${String(sc.difficulty || 'Beginner')} ${String(sc.tech_name)} course aligned to your learning track.`,
        actionLabel: 'Explore Course',
        targetType: 'course',
        targetId: String(sc.id),
        courseSlug: String(sc.slug),
        priority: 65,
      });
    }
  }

  return recs.sort((a, b) => b.priority - a.priority).slice(0, 8);
}
