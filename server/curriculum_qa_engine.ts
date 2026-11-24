import { db } from './db.ts';
import { parseJsonSafe } from './security.ts';

export type CoverageStatus =
  | 'not_started'
  | 'planned'
  | 'in_development'
  | 'content_review'
  | 'published'
  | 'substantially_complete'
  | 'needs_improvement';

export type EditorialStage =
  | 'planned'
  | 'blueprint_available'
  | 'course_in_development'
  | 'draft_content_available'
  | 'awaiting_review'
  | 'published'
  | 'substantially_complete'
  | 'needs_improvement';

export interface CompletenessConfig {
  courseWeights: {
    hasDescription: number;
    hasObjectives: number;
    hasPrerequisites: number;
    minModules: number;
    minTopics: number;
    minPublishedLessons: number;
    minCodeExamples: number;
    minExercises: number;
    minQuizQuestions: number;
    minAssignments: number;
    minProjects: number;
  };
  courseThresholds: {
    minModules: number;
    minTopics: number;
    minPublishedLessons: number;
    minCodeExamples: number;
    minExercises: number;
    minQuizQuestions: number;
    minAssignments: number;
    minProjects: number;
    minLessonWordCount: number;
  };
  learningPathWeights: {
    hasDescription: number;
    hasPrerequisites: number;
    minOrderedCourses: number;
    hasMilestones: number;
    hasProjects: number;
    hasCompletionRule: number;
  };
  learningPathThresholds: {
    minOrderedCourses: number;
    minMilestones: number;
    minProjects: number;
  };
  technologySubstantialThreshold: number;
}

export interface CompletenessPolicyRow {
  config: CompletenessConfig;
  requireIndependentReview: boolean;
  aiDailyGenerationLimit: number;
  updatedBy: string;
  updatedAt: string;
}

const DEFAULT_CONFIG: CompletenessConfig = {
  courseWeights: {
    hasDescription: 8,
    hasObjectives: 8,
    hasPrerequisites: 5,
    minModules: 10,
    minTopics: 8,
    minPublishedLessons: 20,
    minCodeExamples: 12,
    minExercises: 12,
    minQuizQuestions: 10,
    minAssignments: 7,
    minProjects: 8,
  },
  courseThresholds: {
    minModules: 2,
    minTopics: 4,
    minPublishedLessons: 5,
    minCodeExamples: 4,
    minExercises: 3,
    minQuizQuestions: 3,
    minAssignments: 1,
    minProjects: 1,
    minLessonWordCount: 45,
  },
  learningPathWeights: {
    hasDescription: 15,
    hasPrerequisites: 15,
    minOrderedCourses: 25,
    hasMilestones: 20,
    hasProjects: 15,
    hasCompletionRule: 10,
  },
  learningPathThresholds: {
    minOrderedCourses: 2,
    minMilestones: 2,
    minProjects: 1,
  },
  technologySubstantialThreshold: 75,
};

export function getCompletenessPolicy(): CompletenessPolicyRow {
  const row = db.prepare(`SELECT * FROM completeness_rules WHERE id = 1`).get() as
    | {
        config_json: string;
        require_independent_review: number;
        ai_daily_generation_limit: number;
        updated_by: string;
        updated_at: string;
      }
    | undefined;
  const parsed = parseJsonSafe<Partial<CompletenessConfig>>(row?.config_json, {});
  const config: CompletenessConfig = {
    courseWeights: { ...DEFAULT_CONFIG.courseWeights, ...(parsed.courseWeights || {}) },
    courseThresholds: { ...DEFAULT_CONFIG.courseThresholds, ...(parsed.courseThresholds || {}) },
    learningPathWeights: { ...DEFAULT_CONFIG.learningPathWeights, ...(parsed.learningPathWeights || {}) },
    learningPathThresholds: { ...DEFAULT_CONFIG.learningPathThresholds, ...(parsed.learningPathThresholds || {}) },
    technologySubstantialThreshold: Number(
      parsed.technologySubstantialThreshold ?? DEFAULT_CONFIG.technologySubstantialThreshold
    ),
  };
  return {
    config,
    requireIndependentReview: Boolean(row?.require_independent_review),
    aiDailyGenerationLimit: Number(row?.ai_daily_generation_limit || 80),
    updatedBy: row?.updated_by || 'system',
    updatedAt: row?.updated_at || new Date().toISOString(),
  };
}

export function updateCompletenessPolicy(
  actorId: string,
  input: {
    config?: Partial<CompletenessConfig>;
    requireIndependentReview?: boolean;
    aiDailyGenerationLimit?: number;
  }
): CompletenessPolicyRow {
  const current = getCompletenessPolicy();
  const nextConfig: CompletenessConfig = {
    courseWeights: { ...current.config.courseWeights, ...(input.config?.courseWeights || {}) },
    courseThresholds: { ...current.config.courseThresholds, ...(input.config?.courseThresholds || {}) },
    learningPathWeights: { ...current.config.learningPathWeights, ...(input.config?.learningPathWeights || {}) },
    learningPathThresholds: { ...current.config.learningPathThresholds, ...(input.config?.learningPathThresholds || {}) },
    technologySubstantialThreshold: Math.min(
      100,
      Math.max(40, Number(input.config?.technologySubstantialThreshold ?? current.config.technologySubstantialThreshold))
    ),
  };
  const requireIndependent =
    input.requireIndependentReview !== undefined
      ? input.requireIndependentReview
        ? 1
        : 0
      : current.requireIndependentReview
        ? 1
        : 0;
  const aiLimit = Math.min(
    1000,
    Math.max(5, Number(input.aiDailyGenerationLimit ?? current.aiDailyGenerationLimit))
  );
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO completeness_rules (id, config_json, require_independent_review, ai_daily_generation_limit, updated_by, updated_at)
     VALUES (1, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       config_json = excluded.config_json,
       require_independent_review = excluded.require_independent_review,
       ai_daily_generation_limit = excluded.ai_daily_generation_limit,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`
  ).run(JSON.stringify(nextConfig), requireIndependent, aiLimit, actorId, now);

  return getCompletenessPolicy();
}

export interface CompletenessEvaluation {
  entityType: 'course' | 'learning_path';
  entityId: string;
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  missingRequirements: string[];
  failedRules: string[];
  recommendedActions: string[];
  metrics: Record<string, number | boolean | string>;
}

export function evaluateCourseCompleteness(courseId: string, policy?: CompletenessPolicyRow): CompletenessEvaluation | null {
  const course = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(courseId) as Record<string, unknown> | undefined;
  if (!course) return null;

  const activePolicy = policy || getCompletenessPolicy();
  const w = activePolicy.config.courseWeights;
  const t = activePolicy.config.courseThresholds;

  const objectives = parseJsonSafe<string[]>(String(course.objectives_json || '[]'), []);
  const prerequisites = parseJsonSafe<string[]>(String(course.prerequisites_json || '[]'), []);

  const moduleCount = (
    db.prepare(`SELECT COUNT(*) as c FROM modules WHERE course_id = ?`).get(courseId) as { c: number }
  ).c;
  const topicCount = (
    db.prepare(`SELECT COUNT(*) as c FROM course_topics WHERE course_id = ?`).get(courseId) as { c: number }
  ).c;
  const publishedLessons = (
    db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND status = 'published'`).get(courseId) as {
      c: number;
    }
  ).c;
  const totalLessons = (
    db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE course_id = ?`).get(courseId) as { c: number }
  ).c;
  const codeExampleRows = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM code_examples ce JOIN lessons l ON l.id = ce.lesson_id WHERE l.course_id = ?`
      )
      .get(courseId) as { c: number }
  ).c;
  const inlineCodeLessons = (
    db
      .prepare(`SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND LENGTH(TRIM(COALESCE(code_example,''))) > 15`)
      .get(courseId) as { c: number }
  ).c;
  const codeExamplesCount = Math.max(codeExampleRows, inlineCodeLessons);
  const exercisesCount = (
    db.prepare(`SELECT COUNT(*) as c FROM exercises WHERE course_id = ?`).get(courseId) as { c: number }
  ).c;
  const assessments = db
    .prepare(`SELECT questions_json FROM assessments WHERE course_id = ?`)
    .all(courseId) as Array<{ questions_json: string }>;
  const quizQuestionsCount = assessments.reduce(
    (sum, a) => sum + parseJsonSafe<unknown[]>(a.questions_json, []).length,
    0
  );
  const assignmentsCount = (
    db.prepare(`SELECT COUNT(*) as c FROM assignments WHERE course_id = ?`).get(courseId) as { c: number }
  ).c;
  const projectsCount = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM project_templates WHERE course_id = ? OR (technology_id != '' AND technology_id = ?)`
      )
      .get(courseId, String(course.technology_id || '')) as { c: number }
  ).c;

  let earned = 0;
  let maxScore = 0;
  const missingRequirements: string[] = [];
  const failedRules: string[] = [];
  const recommendedActions: string[] = [];

  const checkRule = (
    weight: number,
    passed: boolean,
    missingLabel: string,
    ruleCode: string,
    actionLabel: string
  ) => {
    maxScore += weight;
    if (passed) {
      earned += weight;
    } else {
      missingRequirements.push(missingLabel);
      failedRules.push(ruleCode);
      recommendedActions.push(actionLabel);
    }
  };

  checkRule(
    w.hasDescription,
    String(course.description || '').trim().length >= 30,
    'Course description (<30 chars)',
    'COURSE_DESCRIPTION_REQUIRED',
    'Expand course overview and real-world scope.'
  );
  checkRule(
    w.hasObjectives,
    objectives.length >= 2,
    'Learning objectives (need >= 2)',
    'COURSE_OBJECTIVES_REQUIRED',
    'Add at least 2 measurable learning objectives.'
  );
  checkRule(
    w.hasPrerequisites,
    prerequisites.length >= 1,
    'Course prerequisites',
    'COURSE_PREREQUISITES_REQUIRED',
    'Specify target audience prerequisites.'
  );
  checkRule(
    w.minModules,
    moduleCount >= t.minModules,
    `Modules (${moduleCount}/${t.minModules})`,
    'COURSE_MIN_MODULES',
    `Add ${Math.max(1, t.minModules - moduleCount)} more structured module(s).`
  );
  checkRule(
    w.minTopics,
    topicCount >= t.minTopics || totalLessons >= t.minTopics,
    `Topics (${Math.max(topicCount, totalLessons)}/${t.minTopics})`,
    'COURSE_MIN_TOPICS',
    'Define granular module topics or blueprint lessons.'
  );
  checkRule(
    w.minPublishedLessons,
    publishedLessons >= t.minPublishedLessons,
    `Published lessons (${publishedLessons}/${t.minPublishedLessons})`,
    'COURSE_MIN_PUBLISHED_LESSONS',
    `Author and publish ${Math.max(1, t.minPublishedLessons - publishedLessons)} more lesson(s).`
  );
  checkRule(
    w.minCodeExamples,
    codeExamplesCount >= t.minCodeExamples,
    `Code examples (${codeExamplesCount}/${t.minCodeExamples})`,
    'COURSE_MIN_CODE_EXAMPLES',
    'Add runnable or annotated code examples with expected output.'
  );
  checkRule(
    w.minExercises,
    exercisesCount >= t.minExercises,
    `Interactive exercises (${exercisesCount}/${t.minExercises})`,
    'COURSE_MIN_EXERCISES',
    'Create interactive practice exercises linked to lessons.'
  );
  checkRule(
    w.minQuizQuestions,
    quizQuestionsCount >= t.minQuizQuestions,
    `Assessment questions (${quizQuestionsCount}/${t.minQuizQuestions})`,
    'COURSE_MIN_QUIZ_QUESTIONS',
    'Add an end-of-course or module quiz with >= 3 questions.'
  );
  checkRule(
    w.minAssignments,
    assignmentsCount >= t.minAssignments,
    `Practical assignments (${assignmentsCount}/${t.minAssignments})`,
    'COURSE_MIN_ASSIGNMENTS',
    'Add at least one instructor-reviewed assignment rubric.'
  );
  checkRule(
    w.minProjects,
    projectsCount >= t.minProjects,
    `Capstone project templates (${projectsCount}/${t.minProjects})`,
    'COURSE_MIN_PROJECTS',
    'Attach a starter project template for portfolio completion.'
  );

  const percentage = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;
  const passed =
    percentage >= activePolicy.config.technologySubstantialThreshold &&
    publishedLessons >= t.minPublishedLessons;

  db.prepare(`UPDATE courses SET completeness_score = ? WHERE id = ?`).run(percentage, courseId);

  return {
    entityType: 'course',
    entityId: courseId,
    title: String(course.title || ''),
    score: earned,
    maxScore,
    percentage,
    passed,
    missingRequirements,
    failedRules,
    recommendedActions,
    metrics: {
      moduleCount,
      topicCount,
      publishedLessons,
      totalLessons,
      codeExamplesCount,
      exercisesCount,
      quizQuestionsCount,
      assignmentsCount,
      projectsCount,
      workflowStatus: String(course.workflow_status || course.status || 'draft'),
    },
  };
}

export function evaluateLearningPathCompleteness(
  pathId: string,
  policy?: CompletenessPolicyRow
): CompletenessEvaluation | null {
  const row = db.prepare(`SELECT * FROM learning_paths WHERE id = ?`).get(pathId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;

  const activePolicy = policy || getCompletenessPolicy();
  const w = activePolicy.config.learningPathWeights;
  const t = activePolicy.config.learningPathThresholds;

  const courseIds = parseJsonSafe<string[]>(String(row.course_ids_json || '[]'), []);
  const prerequisites = parseJsonSafe<string[]>(String(row.prerequisites_json || '[]'), []);
  const milestones = parseJsonSafe<unknown[]>(String(row.milestones_json || '[]'), []);
  const projectIds = parseJsonSafe<string[]>(String(row.project_template_ids_json || '[]'), []);
  const linkedTemplates = (
    db.prepare(`SELECT COUNT(*) as c FROM project_templates WHERE learning_path_id = ?`).get(pathId) as { c: number }
  ).c;

  let earned = 0;
  let maxScore = 0;
  const missingRequirements: string[] = [];
  const failedRules: string[] = [];
  const recommendedActions: string[] = [];

  const checkRule = (weight: number, passed: boolean, missing: string, code: string, action: string) => {
    maxScore += weight;
    if (passed) earned += weight;
    else {
      missingRequirements.push(missing);
      failedRules.push(code);
      recommendedActions.push(action);
    }
  };

  checkRule(
    w.hasDescription,
    String(row.description || '').trim().length >= 25,
    'Path introduction (<25 chars)',
    'PATH_DESCRIPTION_REQUIRED',
    'Add clear career outcome description.'
  );
  checkRule(
    w.hasPrerequisites,
    prerequisites.length >= 1,
    'Prerequisites',
    'PATH_PREREQUISITES_REQUIRED',
    'List entry prerequisites for learners.'
  );
  checkRule(
    w.minOrderedCourses,
    courseIds.length >= t.minOrderedCourses,
    `Ordered courses (${courseIds.length}/${t.minOrderedCourses})`,
    'PATH_MIN_COURSES',
    'Link at least 2 ordered courses to the learning path.'
  );
  checkRule(
    w.hasMilestones,
    milestones.length >= t.minMilestones,
    `Milestones (${milestones.length}/${t.minMilestones})`,
    'PATH_MIN_MILESTONES',
    'Define structured progression milestones.'
  );
  checkRule(
    w.hasProjects,
    Math.max(projectIds.length, linkedTemplates) >= t.minProjects,
    'Capstone project',
    'PATH_PROJECT_REQUIRED',
    'Attach a practical capstone project template.'
  );
  checkRule(
    w.hasCompletionRule,
    courseIds.length > 0 && Boolean(row.is_published),
    'Published path completion criteria',
    'PATH_COMPLETION_CRITERIA',
    'Publish path with linked courses for path certification.'
  );

  const percentage = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;
  db.prepare(`UPDATE learning_paths SET completeness_score = ? WHERE id = ?`).run(percentage, pathId);

  return {
    entityType: 'learning_path',
    entityId: pathId,
    title: String(row.title || ''),
    score: earned,
    maxScore,
    percentage,
    passed: percentage >= activePolicy.config.technologySubstantialThreshold,
    missingRequirements,
    failedRules,
    recommendedActions,
    metrics: {
      courseCount: courseIds.length,
      milestonesCount: milestones.length,
      projectsCount: Math.max(projectIds.length, linkedTemplates),
    },
  };
}

export interface QualityCheckResult {
  id: string;
  entityType: 'lesson' | 'course';
  entityId: string;
  validationStatus: 'pass' | 'warning' | 'fail';
  score: number;
  missingSections: string[];
  educationalWarnings: string[];
  technicalWarnings: string[];
  checksDetail: Array<{ category: 'structural' | 'educational' | 'technical'; check: string; status: 'pass' | 'warning' | 'fail'; detail: string }>;
  checkedAt: string;
  staticInspectionNote: string;
}

const KNOWN_LANGUAGES = new Set([
  'html',
  'css',
  'javascript',
  'js',
  'jsx',
  'typescript',
  'ts',
  'tsx',
  'python',
  'py',
  'sql',
  'java',
  'cpp',
  'c',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'bash',
  'sh',
  'json',
  'yaml',
  'dockerfile',
  'markdown',
  'text',
]);

function inspectCodeSyntaxStatic(
  code: string,
  language: string
): { warnings: string[]; criticalFail: boolean } {
  const warnings: string[] = [];
  let criticalFail = false;
  const trimmed = code.trim();
  const lang = language.toLowerCase();

  if (!trimmed) {
    return { warnings: [], criticalFail: false };
  }

  // Unsafe pattern scan across all languages
  if (/\beval\s*\(/.test(trimmed) || /document\.write\s*\(/.test(trimmed) || /sk_live_[A-Za-z0-9]{10,}/.test(trimmed)) {
    warnings.push('Unsafe or sensitive pattern detected (e.g. eval(), document.write(), or secret-like literal).');
  }

  if (lang === 'javascript' || lang === 'js') {
    const looksLikeEsm = /^\s*(import\s+[\s\S]*?from\s+|export\s+(default\s+)?)/m.test(trimmed);
    const parseTarget = looksLikeEsm
      ? trimmed
          .replace(/^\s*import\s+[\s\S]*?;\s*$/gm, '')
          .replace(/^\s*export\s+default\s+/gm, '')
          .replace(/^\s*export\s+(?=(const|let|var|function|async|class)\b)/gm, '')
      : trimmed;
    try {
      // Static parse only via Function constructor — NEVER invoked
      // eslint-disable-next-line no-new-func
      new Function(parseTarget);
    } catch (err) {
      criticalFail = true;
      warnings.push(`JavaScript static syntax error: ${(err as Error).message}`);
    }
  } else if (lang === 'typescript' || lang === 'ts' || lang === 'jsx' || lang === 'tsx') {
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      criticalFail = true;
      warnings.push(`Unbalanced curly braces (${openBraces} '{' vs ${closeBraces} '}').`);
    }
  } else if (lang === 'json') {
    try {
      JSON.parse(trimmed);
    } catch (err) {
      criticalFail = true;
      warnings.push(`JSON static parse error: ${(err as Error).message}`);
    }
  } else if (lang === 'html') {
    const opens = (trimmed.match(/<(div|section|article|main|header|footer|form|table|ul|ol)\b/gi) || []).length;
    const closes = (trimmed.match(/<\/(div|section|article|main|header|footer|form|table|ul|ol)>/gi) || []).length;
    if (opens !== closes) {
      warnings.push(`HTML container tag mismatch detected (${opens} opening vs ${closes} closing structural tags).`);
    }
  } else if (lang === 'python' || lang === 'py') {
    const lines = trimmed.split('\n');
    const badDef = lines.some((ln) => /^\s*(def |class |if |for |while )/.test(ln) && !ln.trim().endsWith(':') && !ln.trim().endsWith('\\'));
    if (badDef) {
      warnings.push('Python block header appears to be missing a trailing colon (`:`).');
    }
  } else if (lang === 'cpp' || lang === 'c' || lang === 'java') {
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      criticalFail = true;
      warnings.push(`Unbalanced curly braces (${openBraces} '{' vs ${closeBraces} '}').`);
    }
  }

  return { warnings, criticalFail };
}

export function runLessonQualityCheck(lessonId: string, checkedBy = 'system'): QualityCheckResult | null {
  const lesson = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(lessonId) as Record<string, unknown> | undefined;
  if (!lesson) return null;

  const policy = getCompletenessPolicy();
  const minWords = policy.config.courseThresholds.minLessonWordCount || 45;

  const missingSections: string[] = [];
  const educationalWarnings: string[] = [];
  const technicalWarnings: string[] = [];
  const checksDetail: QualityCheckResult['checksDetail'] = [];

  const title = String(lesson.title || '').trim();
  const summary = String(lesson.summary || '').trim();
  const markdown = String(lesson.content_markdown || '').trim();
  const objectives = parseJsonSafe<string[]>(String(lesson.objectives_json || '[]'), []);
  const language = String(lesson.language || 'javascript').trim().toLowerCase();
  const inlineCode = String(lesson.code_example || '').trim();

  const courseExists = Boolean(db.prepare(`SELECT 1 FROM courses WHERE id = ?`).get(String(lesson.course_id || '')));
  const moduleExists = Boolean(db.prepare(`SELECT 1 FROM modules WHERE id = ?`).get(String(lesson.module_id || '')));
  const blocks = db
    .prepare(`SELECT * FROM lesson_content_blocks WHERE lesson_id = ?`)
    .all(lessonId) as Array<{ block_type: string; content_markdown: string }>;
  const codeExamples = db
    .prepare(`SELECT * FROM code_examples WHERE lesson_id = ?`)
    .all(lessonId) as Array<{ title: string; language: string; code: string; expected_output: string }>;
  const exerciseCount = (
    db.prepare(`SELECT COUNT(*) as c FROM exercises WHERE lesson_id = ?`).get(lessonId) as { c: number }
  ).c;

  // 1. Structural Checks
  let criticalErrors = 0;
  if (title.length < 4) {
    criticalErrors++;
    missingSections.push('Valid lesson title (>= 4 chars)');
    checksDetail.push({ category: 'structural', check: 'Title present', status: 'fail', detail: 'Lesson title is empty or too short.' });
  } else {
    checksDetail.push({ category: 'structural', check: 'Title present', status: 'pass', detail: title });
  }

  const combinedText = [markdown, ...blocks.map((b) => b.content_markdown)].join(' ').trim();
  const wordCount = combinedText ? combinedText.split(/\s+/).length : 0;
  if (!combinedText || wordCount < 10) {
    criticalErrors++;
    missingSections.push('Lesson body content');
    checksDetail.push({ category: 'structural', check: 'Content present', status: 'fail', detail: `Only ${wordCount} words found.` });
  } else {
    checksDetail.push({ category: 'structural', check: 'Content present', status: 'pass', detail: `${wordCount} words across markdown/blocks.` });
  }

  if (!courseExists || !moduleExists) {
    criticalErrors++;
    missingSections.push('Valid parent course/module link');
    checksDetail.push({ category: 'structural', check: 'Parent foreign keys', status: 'fail', detail: 'Missing valid course or module reference.' });
  } else {
    checksDetail.push({ category: 'structural', check: 'Parent foreign keys', status: 'pass', detail: 'Linked to valid course and module.' });
  }

  const dupSibling = db
    .prepare(`SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND LOWER(title) = LOWER(?) AND id != ?`)
    .get(String(lesson.course_id || ''), title, lessonId) as { c: number };
  if (dupSibling.c > 0) {
    criticalErrors++;
    educationalWarnings.push('Duplicate lesson title detected within the same course.');
    checksDetail.push({ category: 'structural', check: 'Duplicate check', status: 'fail', detail: 'Another lesson in this course shares this title.' });
  } else {
    checksDetail.push({ category: 'structural', check: 'Duplicate check', status: 'pass', detail: 'Unique title within course.' });
  }

  if (summary.length < 15) {
    missingSections.push('Lesson summary');
    checksDetail.push({ category: 'structural', check: 'Summary present', status: 'warning', detail: 'Summary is short (<15 chars).' });
  }
  if (objectives.length === 0) {
    missingSections.push('Learning objectives');
    checksDetail.push({ category: 'educational', check: 'Learning objectives', status: 'warning', detail: 'No structured objectives attached.' });
  } else {
    checksDetail.push({ category: 'educational', check: 'Learning objectives', status: 'pass', detail: `${objectives.length} objective(s) defined.` });
  }

  // 2. Educational Checks
  if (wordCount >= 10 && wordCount < minWords) {
    educationalWarnings.push(`Lesson explanation is brief (${wordCount} words; recommended >= ${minWords} words for clarity).`);
    checksDetail.push({ category: 'educational', check: 'Explanation depth', status: 'warning', detail: `${wordCount} words (< ${minWords}).` });
  } else if (wordCount >= minWords) {
    checksDetail.push({ category: 'educational', check: 'Explanation depth', status: 'pass', detail: `${wordCount} words.` });
  }

  const hasAnyCode = Boolean(inlineCode) || codeExamples.length > 0;
  if (!hasAnyCode) {
    missingSections.push('Code example');
    educationalWarnings.push('No concrete code example attached to illustrate the concept.');
    checksDetail.push({ category: 'educational', check: 'Code examples', status: 'warning', detail: 'Missing code snippet.' });
  } else {
    checksDetail.push({ category: 'educational', check: 'Code examples', status: 'pass', detail: `${Math.max(codeExamples.length, inlineCode ? 1 : 0)} example(s) available.` });
  }

  const hasPractice = Boolean(String(lesson.exercise_prompt || '').trim()) || exerciseCount > 0;
  if (!hasPractice) {
    missingSections.push('Practice exercise');
    educationalWarnings.push('No practice prompt or interactive exercise linked to this lesson.');
    checksDetail.push({ category: 'educational', check: 'Practice alignment', status: 'warning', detail: 'No exercise linked.' });
  } else {
    checksDetail.push({ category: 'educational', check: 'Practice alignment', status: 'pass', detail: 'Exercise prompt or interactive task present.' });
  }

  // 3. Technical Checks (Static inspection only when remote sandbox unavailable)
  if (!KNOWN_LANGUAGES.has(language)) {
    technicalWarnings.push(`Unrecognized programming language identifier "${language}".`);
    checksDetail.push({ category: 'technical', check: 'Language tag', status: 'warning', detail: `Unknown language: ${language}` });
  } else {
    checksDetail.push({ category: 'technical', check: 'Language tag', status: 'pass', detail: language });
  }

  const snippetsToInspect: Array<{ label: string; lang: string; code: string; expected?: string }> = [];
  if (inlineCode) snippetsToInspect.push({ label: 'Primary code_example', lang: language, code: inlineCode });
  for (const ce of codeExamples) {
    snippetsToInspect.push({
      label: ce.title || 'Code Example',
      lang: ce.language || language,
      code: ce.code || '',
      expected: ce.expected_output || '',
    });
  }

  for (const snip of snippetsToInspect) {
    const inspected = inspectCodeSyntaxStatic(snip.code, snip.lang);
    for (const w of inspected.warnings) {
      technicalWarnings.push(`${snip.label}: ${w}`);
    }
    if (inspected.criticalFail) {
      criticalErrors++;
      checksDetail.push({ category: 'technical', check: `Static syntax (${snip.label})`, status: 'fail', detail: inspected.warnings.join(' ') });
    } else if (inspected.warnings.length > 0) {
      checksDetail.push({ category: 'technical', check: `Static syntax (${snip.label})`, status: 'warning', detail: inspected.warnings.join(' ') });
    } else {
      checksDetail.push({ category: 'technical', check: `Static syntax (${snip.label})`, status: 'pass', detail: 'Static syntax check clean.' });
    }
    if (snip.expected !== undefined && !snip.expected.trim() && ['javascript', 'python', 'sql', 'java', 'cpp'].includes(snip.lang.toLowerCase())) {
      technicalWarnings.push(`${snip.label}: Missing expected_output annotation for learner verification.`);
    }
  }

  const totalWarnings = educationalWarnings.length + technicalWarnings.length + missingSections.length;
  const validationStatus: 'pass' | 'warning' | 'fail' =
    criticalErrors > 0 ? 'fail' : totalWarnings > 0 ? 'warning' : 'pass';
  const rawScore = Math.max(0, Math.min(100, 100 - criticalErrors * 30 - totalWarnings * 7));
  const now = new Date().toISOString();
  const checkId = `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  db.prepare(
    `INSERT INTO content_quality_checks (id, entity_type, entity_id, validation_status, score, missing_sections_json, educational_warnings_json, technical_warnings_json, checks_detail_json, checked_by, checked_at)
     VALUES (?, 'lesson', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    checkId,
    lessonId,
    validationStatus,
    rawScore,
    JSON.stringify(missingSections),
    JSON.stringify(educationalWarnings),
    JSON.stringify(technicalWarnings),
    JSON.stringify(checksDetail),
    checkedBy,
    now
  );

  db.prepare(`UPDATE lessons SET qa_status = ? WHERE id = ?`).run(validationStatus, lessonId);

  return {
    id: checkId,
    entityType: 'lesson',
    entityId: lessonId,
    validationStatus,
    score: rawScore,
    missingSections,
    educationalWarnings,
    technicalWarnings,
    checksDetail,
    checkedAt: now,
    staticInspectionNote: 'Technical checks inspect code syntax and unsafe patterns statically; remote runtime execution requires CODE_SANDBOX_URL.',
  };
}

export function runCourseQualityCheck(courseId: string, checkedBy = 'system'): QualityCheckResult | null {
  const courseEval = evaluateCourseCompleteness(courseId);
  if (!courseEval) return null;

  const lessons = db.prepare(`SELECT id, title FROM lessons WHERE course_id = ?`).all(courseId) as Array<{
    id: string;
    title: string;
  }>;

  const lessonFailures: string[] = [];
  const lessonWarnings: string[] = [];
  for (const les of lessons) {
    const res = runLessonQualityCheck(les.id, checkedBy);
    if (res?.validationStatus === 'fail') {
      lessonFailures.push(`Lesson "${les.title}" failed QA checks.`);
    } else if (res?.validationStatus === 'warning') {
      lessonWarnings.push(`Lesson "${les.title}" has QA warnings.`);
    }
  }

  const missingSections = [...courseEval.missingRequirements];
  const educationalWarnings = [...lessonWarnings, ...courseEval.recommendedActions];
  const technicalWarnings = [...lessonFailures];

  const criticalFail = lessons.length === 0 || lessonFailures.length > 0 || String(courseEval.metrics.workflowStatus) === 'draft' && lessons.length === 0;
  const validationStatus: 'pass' | 'warning' | 'fail' = criticalFail
    ? 'fail'
    : missingSections.length > 0 || lessonWarnings.length > 0
      ? 'warning'
      : 'pass';

  const now = new Date().toISOString();
  const checkId = `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const checksDetail: QualityCheckResult['checksDetail'] = [
    {
      category: 'structural',
      check: 'Course completeness evaluation',
      status: courseEval.passed ? 'pass' : 'warning',
      detail: `${courseEval.percentage}% (${courseEval.score}/${courseEval.maxScore})`,
    },
    {
      category: 'technical',
      check: 'Child lesson QA sweep',
      status: lessonFailures.length > 0 ? 'fail' : lessonWarnings.length > 0 ? 'warning' : 'pass',
      detail: `${lessons.length} lesson(s) scanned (${lessonFailures.length} failed, ${lessonWarnings.length} warning).`,
    },
  ];

  db.prepare(
    `INSERT INTO content_quality_checks (id, entity_type, entity_id, validation_status, score, missing_sections_json, educational_warnings_json, technical_warnings_json, checks_detail_json, checked_by, checked_at)
     VALUES (?, 'course', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    checkId,
    courseId,
    validationStatus,
    courseEval.percentage,
    JSON.stringify(missingSections),
    JSON.stringify(educationalWarnings),
    JSON.stringify(technicalWarnings),
    JSON.stringify(checksDetail),
    checkedBy,
    now
  );

  db.prepare(`UPDATE courses SET qa_status = ?, completeness_score = ? WHERE id = ?`).run(
    validationStatus,
    courseEval.percentage,
    courseId
  );

  return {
    id: checkId,
    entityType: 'course',
    entityId: courseId,
    validationStatus,
    score: courseEval.percentage,
    missingSections,
    educationalWarnings,
    technicalWarnings,
    checksDetail,
    checkedAt: now,
    staticInspectionNote: 'Course QA aggregates course completeness rules and static child lesson checks.',
  };
}

// =========================================================
// COVERAGE DASHBOARD CALCULATOR (PHASE 2)
// =========================================================

export interface TechnologyCoverageRow {
  technologyId: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  difficulty: string;
  isPublished: boolean;
  hasBlueprint: boolean;
  blueprintModulesCount: number;
  blueprintTopicsCount: number;
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  reviewCourses: number;
  totalModules: number;
  totalTopics: number;
  publishedLessons: number;
  draftLessons: number;
  reviewLessons: number;
  codeExamplesCount: number;
  exercisesCount: number;
  quizzesCount: number;
  assignmentsCount: number;
  projectsCount: number;
  learningPathsCount: number;
  aiGeneratedCount: number;
  qaIssuesCount: number;
  currentlyGenerating: boolean;
  completenessScore: number;
  calculatedStatus: CoverageStatus;
  editorialStage: EditorialStage;
  assignedInstructors: string[];
  lastUpdatedAt: string;
}

export interface IncompleteCourseSummary {
  courseId: string;
  title: string;
  slug: string;
  technologyId: string;
  technologyName: string;
  status: string;
  workflowStatus: string;
  publishedLessons: number;
  draftOrReviewLessons: number;
  exercisesCount: number;
  quizzesCount: number;
  projectsCount: number;
  completenessScore: number;
  updatedAt: string;
}

export function computeAllTechnologyCoverage(): {
  rows: TechnologyCoverageRow[];
  incompleteCourses: IncompleteCourseSummary[];
  summary: {
    totalTechnologies: number;
    byStatus: Record<CoverageStatus, number>;
    totalCourses: number;
    publishedCourses: number;
    incompleteCoursesCount: number;
    totalLessons: number;
    publishedLessons: number;
    draftLessons: number;
    reviewLessons: number;
    lessonsAwaitingReview: number;
    qaFailuresCount: number;
    technologiesAwaitingContent: number;
    technologiesCurrentlyGenerating: number;
    exerciseCoverageCount: number;
    assessmentCoverageCount: number;
    projectCoverageCount: number;
    totalExercises: number;
    totalAssessments: number;
    totalProjects: number;
    averageCompleteness: number;
    productionProgressPct: number;
  };
} {
  const policy = getCompletenessPolicy();
  const w = policy.config.courseWeights;
  const t = policy.config.courseThresholds;
  const minPublishedLessonsForSubstantial = t.minPublishedLessons;
  const substantialThreshold = policy.config.technologySubstantialThreshold;

  const techs = db
    .prepare(
      `SELECT t.*, c.name as category_name
       FROM technologies t
       LEFT JOIN categories c ON c.id = t.category_id
       ORDER BY t.sort_order ASC, t.name ASC`
    )
    .all() as Array<Record<string, unknown>>;

  const blueprints = db.prepare(`SELECT technology_id, module_outline_json, updated_at FROM curriculum_blueprints`).all() as Array<{
    technology_id: string;
    module_outline_json: string;
    updated_at: string;
  }>;
  const bpMap = new Map<string, { modules: number; topics: number; updatedAt: string }>();
  for (const bp of blueprints) {
    const mods = parseJsonSafe<Array<{ topics?: unknown[] }>>(bp.module_outline_json, []);
    const topics = mods.reduce((s, m) => s + (Array.isArray(m.topics) ? m.topics.length : 0), 0);
    bpMap.set(bp.technology_id, { modules: mods.length, topics, updatedAt: bp.updated_at });
  }

  const courses = db
    .prepare(
      `SELECT c.id, c.technology_id, c.title, c.slug, c.description, c.objectives_json, c.prerequisites_json,
              c.is_published, c.status, c.workflow_status, c.is_ai_generated,
              c.qa_status, c.completeness_score, c.instructor_id, c.assigned_instructor_id,
              c.created_at, c.updated_at, u.full_name as instructor_name
       FROM courses c
       LEFT JOIN users u ON u.id = COALESCE(NULLIF(c.assigned_instructor_id,''), c.instructor_id)`
    )
    .all() as Array<Record<string, unknown>>;

  const modules = db.prepare(`SELECT id, course_id FROM modules`).all() as Array<{ id: string; course_id: string }>;
  const topics = db.prepare(`SELECT id, course_id FROM course_topics`).all() as Array<{ id: string; course_id: string }>;
  const lessons = db
    .prepare(
      `SELECT id, course_id, status, workflow_status, is_ai_generated, qa_status, code_example, updated_at FROM lessons`
    )
    .all() as Array<Record<string, unknown>>;
  const codeExamples = db
    .prepare(`SELECT ce.id, l.course_id FROM code_examples ce JOIN lessons l ON l.id = ce.lesson_id`)
    .all() as Array<{ id: string; course_id: string }>;
  const exercises = db
    .prepare(`SELECT id, course_id, technology_id FROM exercises`)
    .all() as Array<{ id: string; course_id: string; technology_id: string }>;
  const assessments = db
    .prepare(`SELECT id, course_id, questions_json FROM assessments`)
    .all() as Array<{ id: string; course_id: string; questions_json: string }>;
  const assignments = db
    .prepare(`SELECT id, course_id, technology_id FROM assignments`)
    .all() as Array<{ id: string; course_id: string; technology_id: string }>;
  const projects = db
    .prepare(`SELECT id, course_id, technology_id FROM project_templates`)
    .all() as Array<{ id: string; course_id: string; technology_id: string }>;
  const paths = db.prepare(`SELECT id, course_ids_json FROM learning_paths`).all() as Array<{
    id: string;
    course_ids_json: string;
  }>;

  const activeGeneratingTechIds = new Set(
    (
      db
        .prepare(
          `SELECT DISTINCT ji.technology_id
           FROM ai_generation_job_items ji
           JOIN ai_generation_jobs j ON j.id = ji.job_id
           WHERE j.status IN ('running', 'queued') AND ji.status = 'pending'`
        )
        .all() as Array<{ technology_id: string }>
    ).map((r) => r.technology_id)
  );

  // Pre-index counts by course_id
  const countByCourse = (arr: Array<{ course_id: string }>) => {
    const m = new Map<string, number>();
    for (const item of arr) {
      m.set(item.course_id, (m.get(item.course_id) || 0) + 1);
    }
    return m;
  };
  const modCountMap = countByCourse(modules);
  const topicCountMap = countByCourse(topics);
  const exCountMap = countByCourse(exercises);
  const asmCountMap = countByCourse(assessments);
  const asnCountMap = countByCourse(assignments);
  const codeExCountMap = countByCourse(codeExamples);

  const quizQuestionCountMap = new Map<string, number>();
  for (const a of assessments) {
    const qLen = parseJsonSafe<unknown[]>(a.questions_json, []).length;
    quizQuestionCountMap.set(a.course_id, (quizQuestionCountMap.get(a.course_id) || 0) + qLen);
  }

  const byStatus: Record<CoverageStatus, number> = {
    not_started: 0,
    planned: 0,
    in_development: 0,
    content_review: 0,
    published: 0,
    substantially_complete: 0,
    needs_improvement: 0,
  };

  let sumCompleteness = 0;
  let totalPublishedLessonsAll = 0;
  let totalDraftLessonsAll = 0;
  let totalReviewLessonsAll = 0;
  let totalQaFailuresAll = 0;
  let exerciseCoverageCount = 0;
  let assessmentCoverageCount = 0;
  let projectCoverageCount = 0;
  const incompleteCourses: IncompleteCourseSummary[] = [];

  const computeCourseScoreExact = (c: Record<string, unknown>, cLessons: Array<Record<string, unknown>>, techProjectsCount: number) => {
    const cid = String(c.id);
    const objectives = parseJsonSafe<string[]>(String(c.objectives_json || '[]'), []);
    const prerequisites = parseJsonSafe<string[]>(String(c.prerequisites_json || '[]'), []);
    const cMod = modCountMap.get(cid) || 0;
    const cTop = topicCountMap.get(cid) || 0;
    const cPubLes = cLessons.filter((l) => String(l.status) === 'published').length;
    const cTotalLes = cLessons.length;
    const cInlineCode = cLessons.filter((l) => String(l.code_example || '').trim().length > 15).length;
    const cCode = Math.max(codeExCountMap.get(cid) || 0, cInlineCode);
    const cEx = exCountMap.get(cid) || 0;
    const cQQuestions = quizQuestionCountMap.get(cid) || 0;
    const cAsn = asnCountMap.get(cid) || 0;
    const cProj = Math.max(
      projects.filter((p) => p.course_id === cid).length,
      techProjectsCount > 0 ? 1 : 0
    );

    const maxScore =
      w.hasDescription +
      w.hasObjectives +
      w.hasPrerequisites +
      w.minModules +
      w.minTopics +
      w.minPublishedLessons +
      w.minCodeExamples +
      w.minExercises +
      w.minQuizQuestions +
      w.minAssignments +
      w.minProjects;

    let earned = 0;
    if (String(c.description || '').trim().length >= 30) earned += w.hasDescription;
    if (objectives.length >= 2) earned += w.hasObjectives;
    if (prerequisites.length >= 1) earned += w.hasPrerequisites;
    if (cMod >= t.minModules) earned += w.minModules;
    if (cTop >= t.minTopics || cTotalLes >= t.minTopics) earned += w.minTopics;
    if (cPubLes >= t.minPublishedLessons) earned += w.minPublishedLessons;
    if (cCode >= t.minCodeExamples) earned += w.minCodeExamples;
    if (cEx >= t.minExercises) earned += w.minExercises;
    if (cQQuestions >= t.minQuizQuestions) earned += w.minQuizQuestions;
    if (cAsn >= t.minAssignments) earned += w.minAssignments;
    if (cProj >= t.minProjects) earned += w.minProjects;

    return maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0;
  };

  const rows: TechnologyCoverageRow[] = techs.map((tech) => {
    const techId = String(tech.id);
    const bp = bpMap.get(techId);
    const techCourses = courses.filter((c) => String(c.technology_id) === techId);
    const techCourseIds = new Set(techCourses.map((c) => String(c.id)));

    const publishedCourses = techCourses.filter(
      (c) => Number(c.is_published) === 1 && String(c.status) === 'published'
    ).length;
    const reviewCourses = techCourses.filter((c) =>
      ['review', 'approved'].includes(String(c.workflow_status || ''))
    ).length;
    const draftCourses = techCourses.filter(
      (c) => String(c.workflow_status || c.status) === 'draft' || Number(c.is_published) === 0
    ).length;

    const techLessons = lessons.filter((l) => techCourseIds.has(String(l.course_id)));
    const publishedLessons = techLessons.filter((l) => String(l.status) === 'published').length;
    const reviewLessons = techLessons.filter(
      (l) => String(l.status) !== 'published' && ['review', 'approved'].includes(String(l.workflow_status || ''))
    ).length;
    const draftLessons = techLessons.filter(
      (l) => String(l.status) === 'draft' && String(l.workflow_status || 'draft') === 'draft'
    ).length;

    totalPublishedLessonsAll += publishedLessons;
    totalDraftLessonsAll += draftLessons;
    totalReviewLessonsAll += reviewLessons;

    let totalModules = 0;
    let totalTopics = 0;
    let codeExamplesCount = 0;
    let exercisesCount = 0;
    let quizzesCount = 0;
    let assignmentsCount = 0;

    for (const cid of techCourseIds) {
      totalModules += modCountMap.get(cid) || 0;
      totalTopics += topicCountMap.get(cid) || 0;
      codeExamplesCount += codeExCountMap.get(cid) || 0;
      exercisesCount += exCountMap.get(cid) || 0;
      quizzesCount += asmCountMap.get(cid) || 0;
      assignmentsCount += asnCountMap.get(cid) || 0;
    }

    const inlineCodeLessons = techLessons.filter(
      (l) => String(l.code_example || '').trim().length > 10
    ).length;
    codeExamplesCount = Math.max(codeExamplesCount, inlineCodeLessons);

    const directExercises = exercises.filter((e) => e.technology_id === techId && !techCourseIds.has(e.course_id)).length;
    exercisesCount += directExercises;
    const directAssignments = assignments.filter((a) => a.technology_id === techId && !techCourseIds.has(a.course_id)).length;
    assignmentsCount += directAssignments;

    const projectsCount = projects.filter(
      (p) => p.technology_id === techId || techCourseIds.has(p.course_id)
    ).length;

    if (exercisesCount > 0) exerciseCoverageCount += 1;
    if (quizzesCount > 0) assessmentCoverageCount += 1;
    if (projectsCount > 0) projectCoverageCount += 1;

    const learningPathsCount = paths.filter((p) => {
      const cids = parseJsonSafe<string[]>(p.course_ids_json, []);
      return cids.some((cid) => techCourseIds.has(cid));
    }).length;

    const aiGeneratedCount =
      techCourses.filter((c) => Number(c.is_ai_generated) === 1).length +
      techLessons.filter((l) => Number(l.is_ai_generated) === 1).length;

    const qaIssuesCount =
      techCourses.filter((c) => String(c.qa_status) === 'fail').length +
      techLessons.filter((l) => String(l.qa_status) === 'fail').length;
    const publishedQaIssuesCount =
      techCourses.filter((c) => Number(c.is_published) === 1 && String(c.status) === 'published' && String(c.qa_status) === 'fail').length +
      techLessons.filter((l) => String(l.status) === 'published' && String(l.qa_status) === 'fail').length;
    totalQaFailuresAll += qaIssuesCount;

    let completenessScore = 0;
    if (techCourses.length > 0) {
      let best = 0;
      for (const c of techCourses) {
        const cLessons = techLessons.filter((l) => String(l.course_id) === String(c.id));
        const liveScore = computeCourseScoreExact(c, cLessons, projectsCount);
        best = Math.max(best, liveScore);

        const cPub = cLessons.filter((l) => String(l.status) === 'published').length;
        const cDraftOrRev = cLessons.filter((l) => String(l.status) !== 'published').length;
        if (liveScore < substantialThreshold || cPub < minPublishedLessonsForSubstantial || cDraftOrRev > 0) {
          incompleteCourses.push({
            courseId: String(c.id),
            title: String(c.title || ''),
            slug: String(c.slug || ''),
            technologyId: techId,
            technologyName: String(tech.name || ''),
            status: String(c.status || 'draft'),
            workflowStatus: String(c.workflow_status || c.status || 'draft'),
            publishedLessons: cPub,
            draftOrReviewLessons: cDraftOrRev,
            exercisesCount: exCountMap.get(String(c.id)) || 0,
            quizzesCount: asmCountMap.get(String(c.id)) || 0,
            projectsCount: projects.filter((p) => p.course_id === String(c.id)).length,
            completenessScore: liveScore,
            updatedAt: String(c.updated_at || c.created_at || ''),
          });
        }
      }
      completenessScore = best;
    } else if (bp) {
      completenessScore = 10;
    }

    let calculatedStatus: CoverageStatus;
    if (
      publishedQaIssuesCount > 0 ||
      (publishedCourses === 0 && qaIssuesCount > 0) ||
      (publishedCourses > 0 && publishedLessons > 0 && exercisesCount === 0 && completenessScore < 45)
    ) {
      calculatedStatus = 'needs_improvement';
    } else if (
      publishedCourses > 0 &&
      publishedLessons >= minPublishedLessonsForSubstantial &&
      completenessScore >= substantialThreshold &&
      exercisesCount >= 1
    ) {
      calculatedStatus = 'substantially_complete';
    } else if (publishedCourses > 0 && publishedLessons > 0) {
      calculatedStatus = 'published';
    } else if (reviewCourses > 0 || reviewLessons > 0) {
      calculatedStatus = 'content_review';
    } else if (techCourses.length > 0 || techLessons.length > 0) {
      calculatedStatus = 'in_development';
    } else if (bp) {
      calculatedStatus = 'planned';
    } else {
      calculatedStatus = 'not_started';
    }

    byStatus[calculatedStatus] += 1;
    sumCompleteness += completenessScore;

    const assignedInstructors = Array.from(
      new Set(
        techCourses
          .map((c) => String(c.instructor_name || '').trim())
          .filter(Boolean)
      )
    );

    const timestamps = [
      String(tech.created_at || ''),
      bp?.updatedAt || '',
      ...techCourses.map((c) => String(c.updated_at || c.created_at || '')),
      ...techLessons.map((l) => String(l.updated_at || '')),
    ].filter(Boolean);
    const lastUpdatedAt = timestamps.sort().reverse()[0] || '';

    let editorialStage: EditorialStage;
    if (calculatedStatus === 'needs_improvement') {
      editorialStage = 'needs_improvement';
    } else if (calculatedStatus === 'substantially_complete') {
      editorialStage = 'substantially_complete';
    } else if (calculatedStatus === 'published') {
      editorialStage = 'published';
    } else if (calculatedStatus === 'content_review' || reviewLessons > 0 || reviewCourses > 0) {
      editorialStage = 'awaiting_review';
    } else if (draftLessons > 0) {
      editorialStage = 'draft_content_available';
    } else if (techCourses.length > 0) {
      editorialStage = 'course_in_development';
    } else if (bp) {
      editorialStage = 'blueprint_available';
    } else {
      editorialStage = 'planned';
    }

    return {
      technologyId: techId,
      name: String(tech.name),
      slug: String(tech.slug),
      categoryId: String(tech.category_id),
      categoryName: String(tech.category_name || ''),
      difficulty: String(tech.difficulty || 'Beginner'),
      isPublished: Number(tech.is_published) === 1,
      hasBlueprint: Boolean(bp),
      blueprintModulesCount: bp?.modules || 0,
      blueprintTopicsCount: bp?.topics || 0,
      totalCourses: techCourses.length,
      publishedCourses,
      draftCourses,
      reviewCourses,
      totalModules,
      totalTopics,
      publishedLessons,
      draftLessons,
      reviewLessons,
      codeExamplesCount,
      exercisesCount,
      quizzesCount,
      assignmentsCount,
      projectsCount,
      learningPathsCount,
      aiGeneratedCount,
      qaIssuesCount,
      currentlyGenerating: activeGeneratingTechIds.has(techId),
      completenessScore,
      calculatedStatus,
      editorialStage,
      assignedInstructors,
      lastUpdatedAt,
    };
  });

  const totalAssessments = assessments.length;
  const totalExercises = exercises.length;
  const totalProjects = projects.length;
  const technologiesAwaitingContent = byStatus.not_started + byStatus.planned;
  const technologiesCurrentlyGenerating = rows.filter((r) => r.currentlyGenerating).length;
  const productionProgressPct =
    rows.length > 0
      ? Math.round(
          ((byStatus.substantially_complete +
            byStatus.published * 0.5 +
            byStatus.content_review * 0.35 +
            byStatus.in_development * 0.2) /
            rows.length) *
            100
        )
      : 0;

  incompleteCourses.sort((a, b) => b.completenessScore - a.completenessScore || a.title.localeCompare(b.title));

  return {
    rows,
    incompleteCourses,
    summary: {
      totalTechnologies: rows.length,
      byStatus,
      totalCourses: courses.length,
      publishedCourses: courses.filter((c) => Number(c.is_published) === 1 && String(c.status) === 'published').length,
      incompleteCoursesCount: incompleteCourses.length,
      totalLessons: lessons.length,
      publishedLessons: totalPublishedLessonsAll,
      draftLessons: totalDraftLessonsAll,
      reviewLessons: totalReviewLessonsAll,
      lessonsAwaitingReview: totalReviewLessonsAll,
      qaFailuresCount: totalQaFailuresAll,
      technologiesAwaitingContent,
      technologiesCurrentlyGenerating,
      exerciseCoverageCount,
      assessmentCoverageCount,
      projectCoverageCount,
      totalExercises,
      totalAssessments,
      totalProjects,
      averageCompleteness: rows.length > 0 ? Math.round(sumCompleteness / rows.length) : 0,
      productionProgressPct,
    },
  };
}

export function getTechnologyDetailedReport(technologyIdOrSlug: string) {
  const tech = db
    .prepare(
      `SELECT t.*, c.name as category_name
       FROM technologies t LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.id = ? OR t.slug = ? LIMIT 1`
    )
    .get(technologyIdOrSlug, technologyIdOrSlug) as (Record<string, unknown> & { id: string }) | undefined;
  if (!tech) return null;

  const { rows } = computeAllTechnologyCoverage();
  const coverage = rows.find((r) => r.technologyId === tech.id);
  const blueprint = db
    .prepare(`SELECT * FROM curriculum_blueprints WHERE technology_id = ? LIMIT 1`)
    .get(tech.id) as Record<string, unknown> | undefined;

  const courses = db
    .prepare(`SELECT * FROM courses WHERE technology_id = ? ORDER BY created_at DESC`)
    .all(tech.id) as Array<Record<string, unknown>>;

  const courseEvaluations = courses
    .map((c) => evaluateCourseCompleteness(String(c.id)))
    .filter(Boolean);

  const lessons = db
    .prepare(
      `SELECT l.id, l.course_id, l.module_id, l.title, l.slug, l.status, l.workflow_status, l.qa_status, l.is_ai_generated, l.version, l.updated_at, m.title as module_title
       FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE l.course_id IN (SELECT id FROM courses WHERE technology_id = ?)
       ORDER BY m.sort_order ASC, l.sort_order ASC`
    )
    .all(tech.id);

  return {
    technology: tech,
    coverage,
    blueprint: blueprint
      ? {
          ...blueprint,
          modules: parseJsonSafe<unknown[]>(String(blueprint.module_outline_json || '[]'), []),
        }
      : null,
    courses: courseEvaluations,
    lessons,
  };
}

// =========================================================
// CONTENT VERSIONING & ROLLBACK (PHASE 9)
// =========================================================

export function createContentRevisionSnapshot(
  entityType: 'course' | 'lesson' | 'assessment' | 'exercise',
  entityId: string,
  editorId: string,
  changeSummary: string
): { id: string; versionNumber: number } | null {
  let snapshot: Record<string, unknown> | undefined;
  if (entityType === 'lesson') {
    const lesson = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(entityId) as Record<string, unknown> | undefined;
    if (!lesson) return null;
    const blocks = db.prepare(`SELECT * FROM lesson_content_blocks WHERE lesson_id = ? ORDER BY sort_order ASC`).all(entityId);
    const codeExamples = db.prepare(`SELECT * FROM code_examples WHERE lesson_id = ? ORDER BY sort_order ASC`).all(entityId);
    snapshot = { lesson, blocks, codeExamples };
  } else if (entityType === 'course') {
    const course = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(entityId) as Record<string, unknown> | undefined;
    if (!course) return null;
    snapshot = { course };
  } else if (entityType === 'assessment') {
    snapshot = db.prepare(`SELECT * FROM assessments WHERE id = ?`).get(entityId) as Record<string, unknown> | undefined;
  } else if (entityType === 'exercise') {
    snapshot = db.prepare(`SELECT * FROM exercises WHERE id = ?`).get(entityId) as Record<string, unknown> | undefined;
  }
  if (!snapshot) return null;

  const maxRow = db
    .prepare(`SELECT COALESCE(MAX(version_number), 0) as v FROM content_revisions WHERE entity_type = ? AND entity_id = ?`)
    .get(entityType, entityId) as { v: number };
  const versionNumber = maxRow.v + 1;
  const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(
    `INSERT INTO content_revisions (id, entity_type, entity_id, version_number, snapshot_json, change_summary, editor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, entityType, entityId, versionNumber, JSON.stringify(snapshot), changeSummary, editorId, new Date().toISOString());

  return { id, versionNumber };
}

export function listContentRevisions(entityType: string, entityId: string) {
  return (
    db
      .prepare(
        `SELECT r.*, u.full_name as editor_name, u.email as editor_email
         FROM content_revisions r LEFT JOIN users u ON u.id = r.editor_id
         WHERE r.entity_type = ? AND r.entity_id = ?
         ORDER BY r.version_number DESC`
      )
      .all(entityType, entityId) as Array<Record<string, unknown>>
  ).map((r) => ({
    ...r,
    snapshot: parseJsonSafe<Record<string, unknown>>(String(r.snapshot_json || '{}'), {}),
  }));
}

export function restoreContentRevision(
  revisionId: string,
  adminId: string
): { entityType: string; entityId: string; restoredVersion: number; newSnapshotVersion: number } {
  const rev = db.prepare(`SELECT * FROM content_revisions WHERE id = ?`).get(revisionId) as
    | { id: string; entity_type: string; entity_id: string; version_number: number; snapshot_json: string }
    | undefined;
  if (!rev) {
    throw new Error('Revision snapshot not found.');
  }

  const snapshot = parseJsonSafe<Record<string, unknown>>(rev.snapshot_json, {});
  const now = new Date().toISOString();

  // Preserve current live state cleanly before rolling back
  const preRestoreSnap = createContentRevisionSnapshot(
    rev.entity_type as 'course' | 'lesson' | 'assessment' | 'exercise',
    rev.entity_id,
    adminId,
    `Auto-snapshot prior to restoring v${rev.version_number}`
  );

  if (rev.entity_type === 'lesson') {
    const les = snapshot.lesson as Record<string, unknown> | undefined;
    if (!les) throw new Error('Corrupt lesson snapshot payload.');
    // Preserve completed learner progress & certificates — update existing lesson row in place without deleting ID!
    db.prepare(
      `UPDATE lessons
       SET title = ?, topic_name = ?, summary = ?, content_markdown = ?, code_example = ?,
           language = ?, access_tier = ?, duration_minutes = ?, exercise_prompt = ?, starter_code = ?,
           solution_hint = ?, objectives_json = ?, prerequisites_json = ?,
           version = version + 1, updated_at = ?
       WHERE id = ?`
    ).run(
      String(les.title || ''),
      String(les.topic_name || ''),
      String(les.summary || ''),
      String(les.content_markdown || ''),
      String(les.code_example || ''),
      String(les.language || 'javascript'),
      String(les.access_tier || 'free'),
      Number(les.duration_minutes || 15),
      String(les.exercise_prompt || ''),
      String(les.starter_code || ''),
      String(les.solution_hint || ''),
      String(les.objectives_json || '[]'),
      String(les.prerequisites_json || '[]'),
      now,
      rev.entity_id
    );
  } else if (rev.entity_type === 'course') {
    const crs = snapshot.course as Record<string, unknown> | undefined;
    if (!crs) throw new Error('Corrupt course snapshot payload.');
    db.prepare(
      `UPDATE courses
       SET title = ?, description = ?, objectives_json = ?, prerequisites_json = ?,
           difficulty = ?, estimated_hours = ?, completion_rule = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      String(crs.title || ''),
      String(crs.description || ''),
      String(crs.objectives_json || '[]'),
      String(crs.prerequisites_json || '[]'),
      String(crs.difficulty || 'Intermediate'),
      Number(crs.estimated_hours || 10),
      String(crs.completion_rule || 'all_lessons'),
      now,
      rev.entity_id
    );
  } else {
    throw new Error(`Rollback for ${rev.entity_type} is not supported yet.`);
  }

  return {
    entityType: rev.entity_type,
    entityId: rev.entity_id,
    restoredVersion: rev.version_number,
    newSnapshotVersion: preRestoreSnap?.versionNumber || rev.version_number + 1,
  };
}
