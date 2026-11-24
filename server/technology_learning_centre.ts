import type { DatabaseSync } from 'node:sqlite';
import { db } from './db.ts';
import { parseJsonSafe } from './security.ts';
import {
  CERTIFICATION_EXAM_SEEDS,
  TECHNOLOGY_LEARNING_CENTRE_SEEDS,
  type BestPracticeSpec,
  type CertificationBlueprintSpec,
  type ChallengeSpec,
  type GuidedExampleSpec,
  type InterviewQuestionSpec,
  type LearningCentreSectionDef,
  type ReferenceTableSpec,
  type StudyPlanWeekSpec,
  type TechnologyCentreSeed,
  type TopicGroupSpec,
  type WebsiteProjectSpec,
} from './technology_centre_data.ts';
import {
  resolveTechnologyCapability,
  type TechnologyCapabilityProfile,
} from '../shared/technologyCapabilities.ts';

export interface HydratedCertificationExam {
  id: string;
  courseId: string;
  courseSlug: string;
  title: string;
  type: string;
  mode: string;
  timeLimitSec: number;
  passingScorePct: number;
  xpReward: number;
  questionCount: number;
  userBestScorePct?: number | null;
  userPassed?: boolean;
}

export interface HydratedTechnologyLearningCentre {
  slug: string;
  technologyId: string;
  source: 'curated_centre' | 'dynamic_blueprint';
  environmentType: string;
  environmentLabel: string;
  interactiveTools: Array<'px_em_converter' | 'color_contrast' | 'sql_schema_viewer' | 'snippet_runner'>;
  sections: LearningCentreSectionDef[];
  topicGroups: TopicGroupSpec[];
  guidedExamples: GuidedExampleSpec[];
  challenges: ChallengeSpec[];
  websiteProject: WebsiteProjectSpec | null;
  syllabusSummary: Array<{ unit: string; title: string; outcomes: string[]; hours: number }>;
  studyPlan: StudyPlanWeekSpec[];
  interviewPrep: InterviewQuestionSpec[];
  summaryPoints: string[];
  bestPractices: BestPracticeSpec[];
  certification: CertificationBlueprintSpec;
  certificationExams: HydratedCertificationExam[];
  references: ReferenceTableSpec[];
  metrics: {
    totalSections: number;
    totalTopics: number;
    availableInteractiveTopics: number;
    guidedExamplesCount: number;
    challengesCount: number;
    studyWeeks: number;
    interviewQuestionsCount: number;
    referenceEntriesCount: number;
  };
}

export function seedTechnologyLearningCentres(database: DatabaseSync) {
  const now = new Date().toISOString();

  const techStmt = database.prepare(`SELECT id, slug FROM technologies WHERE slug = ? LIMIT 1`);
  const insertCentre = database.prepare(
    `INSERT OR IGNORE INTO technology_learning_centres (
       technology_id, slug, interactive_tools_json, sections_config_json, topic_groups_json,
       guided_examples_json, challenges_json, website_project_json, syllabus_json,
       study_plan_json, interview_prep_json, summary_json, best_practices_json,
       certification_config_json, references_json, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const [slug, seed] of Object.entries(TECHNOLOGY_LEARNING_CENTRE_SEEDS)) {
    const tech = techStmt.get(slug) as { id: string; slug: string } | undefined;
    if (!tech) continue;
    insertCentre.run(
      tech.id,
      seed.slug,
      JSON.stringify(seed.interactiveTools),
      JSON.stringify(seed.sections),
      JSON.stringify(seed.topicGroups),
      JSON.stringify(seed.guidedExamples),
      JSON.stringify(seed.challenges),
      JSON.stringify(seed.websiteProject),
      JSON.stringify(seed.syllabusSummary),
      JSON.stringify(seed.studyPlan),
      JSON.stringify(seed.interviewPrep),
      JSON.stringify(seed.summaryPoints),
      JSON.stringify(seed.bestPractices),
      JSON.stringify(seed.certification),
      JSON.stringify(seed.references),
      now
    );
  }

  const checkCourse = database.prepare(`SELECT id FROM courses WHERE id = ? LIMIT 1`);
  const insertExam = database.prepare(
    `INSERT OR IGNORE INTO assessments (
       id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward,
       passing_score_pct, questions_json, objective_tags_json, question_bank_size,
       allow_partial_credit, shuffle_options, created_at
     ) VALUES (?, ?, '', ?, 'exam', 'timed', ?, ?, ?, ?, ?, ?, 1, 0, ?)`
  );

  for (const exam of CERTIFICATION_EXAM_SEEDS) {
    const courseExists = checkCourse.get(exam.courseId) as { id: string } | undefined;
    if (!courseExists) continue;
    insertExam.run(
      exam.id,
      exam.courseId,
      exam.title,
      exam.timeLimitSec,
      exam.xpReward,
      exam.passingScorePct,
      JSON.stringify(exam.questions),
      JSON.stringify(exam.objectiveTags),
      exam.questions.length,
      now
    );
  }
}

export interface CourseOutlineForMapping {
  id: string;
  slug: string;
  title: string;
  description?: string;
  difficulty?: string;
  estimated_hours?: number;
  objectives?: string[];
  modules: Array<{
    id: string;
    title: string;
    topic?: string;
    lessons: Array<{
      id: string;
      title: string;
      slug?: string;
      topic_name?: string;
      summary?: string;
      duration_minutes?: number;
      language?: string;
    }>;
  }>;
  assessments?: Array<{
    id: string;
    title: string;
    type: string;
    mode: string;
    time_limit_sec?: number;
    xp_reward: number;
    passing_score_pct?: number;
  }>;
}

export function resolveTopicMappings(
  topicGroups: TopicGroupSpec[],
  courses: CourseOutlineForMapping[]
): TopicGroupSpec[] {
  const flatLessons: Array<{
    id: string;
    courseSlug: string;
    haystack: string;
    titleLower: string;
  }> = [];

  for (const course of courses) {
    for (const mod of course.modules || []) {
      for (const lesson of mod.lessons || []) {
        flatLessons.push({
          id: String(lesson.id),
          courseSlug: String(course.slug),
          titleLower: String(lesson.title || '').toLowerCase(),
          haystack: `${lesson.title || ''} ${lesson.topic_name || ''} ${lesson.summary || ''} ${mod.title || ''}`.toLowerCase(),
        });
      }
    }
  }

  const hasPublishedCourses = flatLessons.length > 0;

  return topicGroups.map((group) => ({
    ...group,
    topics: (group.topics || []).map((topic) => {
      if (topic.lessonId) {
        const direct = flatLessons.find((l) => l.id === topic.lessonId);
        if (direct) {
          return {
            ...topic,
            lessonId: direct.id,
            courseSlug: direct.courseSlug,
            status: 'available' as const,
          };
        }
      }

      let bestLesson: (typeof flatLessons)[number] | null = null;
      let bestScore = 0;

      const keywords = (topic.matchKeywords || []).map((k) => k.toLowerCase().trim()).filter(Boolean);
      const titleTokens = topic.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4);

      for (const lesson of flatLessons) {
        let score = 0;
        for (const kw of keywords) {
          if (lesson.titleLower.includes(kw)) score += 5;
          else if (lesson.haystack.includes(kw)) score += 3;
        }
        for (const tok of titleTokens) {
          if (lesson.titleLower.includes(tok)) score += 2;
          else if (lesson.haystack.includes(tok)) score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          bestLesson = lesson;
        }
      }

      if (bestLesson && bestScore >= 2) {
        return {
          ...topic,
          lessonId: bestLesson.id,
          courseSlug: bestLesson.courseSlug,
          status: 'available' as const,
        };
      }

      return {
        ...topic,
        lessonId: null,
        courseSlug: courses[0]?.slug || null,
        status: hasPublishedCourses ? ('in_development' as const) : ('planned' as const),
      };
    }),
  }));
}

interface BlueprintModuleItem {
  title: string;
  topic?: string;
  level?: string;
  summary?: string;
  topics?: string[];
  lessons?: Array<{ title: string; summary?: string; difficulty?: string; minutes?: number }>;
}

interface BlueprintPayload {
  modules?: BlueprintModuleItem[];
  outcomes?: string[];
}

export function buildDynamicLearningCentre(params: {
  tech: { id: string; slug: string; name: string; description?: string; difficulty?: string; category_name?: string };
  capability: TechnologyCapabilityProfile;
  courses: CourseOutlineForMapping[];
  resources: Array<{ id?: string; title: string; type?: string; summary?: string; code_snippet?: string }>;
  projectTemplates: Array<{ id: string; title: string; summary?: string; difficulty?: string; estimated_hours?: number }>;
  blueprint?: BlueprintPayload | null;
}): Omit<TechnologyCentreSeed, 'slug'> & { source: 'dynamic_blueprint' } {
  const { tech, capability, courses, resources, projectTemplates, blueprint } = params;
  const env = capability.environmentType;

  const isWebOrFrontend = env === 'web_dev_lab' || env === 'frontend_framework_lab';
  const isSql = env === 'database_sql_lab';
  const isDesign = env === 'design_uiux_lab';
  const isSecurity = env === 'security_network_lab';
  const isCloud = env === 'cloud_devops_lab';
  const isAiData = env === 'ai_data_lab';

  const sections: LearningCentreSectionDef[] = isWebOrFrontend
    ? [
        { id: 'tutorial', label: `${tech.name} Fundamentals`, group: 'curriculum', order: 1, summary: `Core ${tech.name} architecture, syntax, state & patterns.` },
        { id: 'advanced', label: `${tech.name} Patterns & APIs`, group: 'curriculum', order: 2, summary: `Interactive components, routing, state lifecycle & browser integration.` },
        { id: 'projects', label: `${tech.name} Applied Projects`, group: 'practice', order: 3, summary: `Milestone portfolio projects and production deliverables.` },
        { id: 'examples', label: 'Examples & Sandbox Lab', group: 'practice', order: 4, summary: `Editable ${tech.name} code snippets runnable directly inside the lab.` },
        { id: 'challenges', label: 'Exercises & Challenges', group: 'practice', order: 5, summary: `Practical tasks validated against ${tech.name} quality rules.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `Structured 4-week study roadmap for mastering ${tech.name}.` },
        { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 7, summary: `Technical interview scenarios & architecture tradeoffs.` },
        { id: 'best_practices', label: 'Best Practices & Summary', group: 'planning', order: 8, summary: `Maintainability, accessibility and performance standards.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Certification readiness rubric and verified assessment tracking.` },
        { id: 'references', label: `${tech.name} Reference Library`, group: 'reference', order: 10, summary: `Core syntax cheat sheet, configuration flags and tools.` },
      ]
    : isSql
    ? [
        { id: 'tutorial', label: `${tech.name} Core Querying`, group: 'curriculum', order: 1, summary: `Schemas, filtering, sorting, joins and aggregations in ${tech.name}.` },
        { id: 'advanced', label: 'Modeling & Performance', group: 'curriculum', order: 2, summary: `Indexing, constraints, transactions and query optimization.` },
        { id: 'projects', label: 'Database Labs & Projects', group: 'practice', order: 3, summary: `Schema design and analytical reporting capstones.` },
        { id: 'examples', label: 'Interactive SQL Examples', group: 'practice', order: 4, summary: `Run queries directly against BrainCode's isolated SQLite sandbox.` },
        { id: 'challenges', label: 'Query Challenges', group: 'practice', order: 5, summary: `Hands-on SQL challenges tested against live result sets.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `4-week relational modeling & querying plan.` },
        { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 7, summary: `Real database engineering & query plan interview scenarios.` },
        { id: 'best_practices', label: 'Indexing & Safety Guide', group: 'planning', order: 8, summary: `Parameterized queries, normalization & transaction safety.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Competency readiness & exam blueprint.` },
        { id: 'references', label: `${tech.name} Reference`, group: 'reference', order: 10, summary: `Clauses, functions, schema reference & sandbox tables.` },
      ]
    : isDesign
    ? [
        { id: 'tutorial', label: `${tech.name} Design Foundations`, group: 'curriculum', order: 1, summary: `Visual hierarchy, grids, color tokens and component systems.` },
        { id: 'advanced', label: 'Systems, SVG & Accessibility', group: 'curriculum', order: 2, summary: `Scalable tokens, WCAG contrast ratios and handoff specs.` },
        { id: 'projects', label: 'Design Case Studies', group: 'practice', order: 3, summary: `End-to-end UI systems and responsive interface blueprints.` },
        { id: 'examples', label: 'Token & SVG Examples', group: 'practice', order: 4, summary: `Inspectable SVG & CSS token previews.` },
        { id: 'challenges', label: 'Critique & Lab Challenges', group: 'practice', order: 5, summary: `Contrast checks, spacing scale audits and semantic handoffs.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `4-week visual & product design roadmap.` },
        { id: 'interview', label: 'Design Portfolio & Interview', group: 'planning', order: 7, summary: `System thinking, usability and accessibility defense questions.` },
        { id: 'best_practices', label: 'WCAG & System Standards', group: 'planning', order: 8, summary: `Contrast compliance, touch targets and reusable token discipline.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Design systems & accessibility assessment criteria.` },
        { id: 'references', label: 'Design & Token Reference', group: 'reference', order: 10, summary: `Typography scale, contrast thresholds & token naming guide.` },
      ]
    : isSecurity
    ? [
        { id: 'tutorial', label: `${tech.name} Core Concepts`, group: 'curriculum', order: 1, summary: `Threat modeling, protocols, authentication and defensive architecture.` },
        { id: 'advanced', label: 'Hardening & Auditing', group: 'curriculum', order: 2, summary: `Controls, headers, cryptography, monitoring & incident triage.` },
        { id: 'projects', label: 'Security Labs & Audits', group: 'practice', order: 3, summary: `Controlled defensive verification exercises & audit checklists.` },
        { id: 'examples', label: 'Config & Policy Examples', group: 'practice', order: 4, summary: `Hardened security configurations and diagnostic examples.` },
        { id: 'challenges', label: 'Defensive Challenges', group: 'practice', order: 5, summary: `Identify misconfigurations and apply least-privilege controls.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `4-week defensive security progression.` },
        { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 7, summary: `Security engineering scenarios & threat analysis Q&A.` },
        { id: 'best_practices', label: 'Security Hardening Guide', group: 'planning', order: 8, summary: `Least privilege, secret management and safe parsing.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Readiness metrics and competency verification.` },
        { id: 'references', label: 'Security Reference', group: 'reference', order: 10, summary: `Control matrix, common headers & audit checklist.` },
      ]
    : isCloud
    ? [
        { id: 'tutorial', label: `${tech.name} Architecture`, group: 'curriculum', order: 1, summary: `Core ${tech.name} primitives, declarative manifests & workflows.` },
        { id: 'advanced', label: 'Deployment, Scaling & CI/CD', group: 'curriculum', order: 2, summary: `Health probes, rollouts, secrets, networking & observability.` },
        { id: 'projects', label: 'Infrastructure Labs', group: 'practice', order: 3, summary: `Production-grade deployment blueprints and runbooks.` },
        { id: 'examples', label: 'Manifest & CLI Examples', group: 'practice', order: 4, summary: `Editable configuration files validated by manifest linters.` },
        { id: 'challenges', label: 'Ops Challenges', group: 'practice', order: 5, summary: `Diagnose config issues and harden infrastructure definitions.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `4-week cloud & reliability study schedule.` },
        { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 7, summary: `Reliability, scaling, zero-downtime deployment & triage Q&A.` },
        { id: 'best_practices', label: 'Reliability Best Practices', group: 'planning', order: 8, summary: `Resource limits, pinned versions, probes and immutable builds.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Certification readiness and skill verification.` },
        { id: 'references', label: `${tech.name} CLI & Spec Reference`, group: 'reference', order: 10, summary: `Key commands, manifest fields and diagnostic flags.` },
      ]
    : isAiData
    ? [
        { id: 'tutorial', label: `${tech.name} Data & Foundations`, group: 'curriculum', order: 1, summary: `Data representation, preprocessing, metrics and ${tech.name} workflows.` },
        { id: 'advanced', label: 'Modeling & Evaluation', group: 'curriculum', order: 2, summary: `Validation splits, hyperparameters, inference and diagnostics.` },
        { id: 'projects', label: 'Applied Data Projects', group: 'practice', order: 3, summary: `Reproducible pipelines and evaluation capstones.` },
        { id: 'examples', label: 'Code & Pipeline Examples', group: 'practice', order: 4, summary: `Clean ${tech.name} starter scripts ready for analysis.` },
        { id: 'challenges', label: 'Analytical Challenges', group: 'practice', order: 5, summary: `Pipeline debugging and metric interpretation exercises.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `4-week structured study schedule.` },
        { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 7, summary: `Bias-variance, data leakage, evaluation and scaling Q&A.` },
        { id: 'best_practices', label: 'Reproducibility & Summary', group: 'planning', order: 8, summary: `Deterministic seeds, clean validation splits and model cards.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Assessment weights and mastery tracking.` },
        { id: 'references', label: `${tech.name} Quick Reference`, group: 'reference', order: 10, summary: `Core APIs, evaluation formulas and workflows.` },
      ]
    : [
        { id: 'tutorial', label: `${tech.name} Core Language`, group: 'curriculum', order: 1, summary: `Syntax, types, control flow, modular structure & core idioms of ${tech.name}.` },
        { id: 'advanced', label: `${tech.name} Applied Patterns`, group: 'curriculum', order: 2, summary: `Data structures, concurrency/architecture, error handling & testing.` },
        { id: 'projects', label: `${tech.name} Applied Projects`, group: 'practice', order: 3, summary: `Guided builds transforming concepts into real software.` },
        { id: 'examples', label: 'Examples & Live Lab', group: 'practice', order: 4, summary: `Runnable or lint-checked ${tech.name} code samples.` },
        { id: 'challenges', label: 'Exercises & Challenges', group: 'practice', order: 5, summary: `Practice tasks and algorithmic checks.` },
        { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 6, summary: `4-week structured ${tech.name} progression.` },
        { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 7, summary: `Practical engineering & debugging interview questions.` },
        { id: 'best_practices', label: 'Best Practices & Summary', group: 'planning', order: 8, summary: `Code clarity, safety invariants and testing habits.` },
        { id: 'certification', label: `${tech.name} Certification`, group: 'certification', order: 9, summary: `Mastery rubric and assessment overview.` },
        { id: 'references', label: `${tech.name} Quick Reference`, group: 'reference', order: 10, summary: `Core constructs, commands and diagnostics.` },
      ];

  const topicGroups: TopicGroupSpec[] = [];
  if (courses.length > 0) {
    let modCounter = 0;
    for (const course of courses) {
      for (const mod of course.modules || []) {
        modCounter += 1;
        const targetSection = modCounter === 1 ? 'tutorial' : modCounter === 2 ? 'advanced' : 'tutorial';
        topicGroups.push({
          id: `${tech.slug}_grp_${mod.id}`,
          sectionId: targetSection,
          title: `${modCounter}. ${mod.title}`,
          description: mod.topic ? `Focus area: ${mod.topic}` : `Structured lessons in ${course.title}.`,
          order: modCounter,
          topics: (mod.lessons || []).map((l) => ({
            id: `${tech.slug}_top_${l.id}`,
            title: l.title,
            subtopics: [l.topic_name || mod.topic || tech.name, l.summary ? l.summary.slice(0, 72) : 'Guided practice'].filter(Boolean),
            difficulty: (course.difficulty === 'Intermediate' || course.difficulty === 'Advanced' ? course.difficulty : 'Beginner') as
              | 'Beginner'
              | 'Intermediate'
              | 'Advanced',
            estimatedMinutes: Number(l.duration_minutes || 15),
            kind: 'lesson' as const,
            lessonId: l.id,
            courseSlug: course.slug,
            status: 'available' as const,
          })),
        });
      }
    }
  } else if (blueprint?.modules && blueprint.modules.length > 0) {
    blueprint.modules.forEach((mod, idx) => {
      const lessonItems =
        mod.lessons && mod.lessons.length > 0
          ? mod.lessons.map((les, lIdx) => ({
              id: `${tech.slug}_bpt_${idx + 1}_${lIdx + 1}`,
              title: les.title,
              subtopics: [les.summary || `${tech.name} core concept`],
              difficulty: (les.difficulty === 'Intermediate' || les.difficulty === 'Advanced' ? les.difficulty : 'Beginner') as
                | 'Beginner'
                | 'Intermediate'
                | 'Advanced',
              estimatedMinutes: Number(les.minutes || 15),
              kind: 'lesson' as const,
              lessonId: null,
              courseSlug: null,
              status: 'planned' as const,
            }))
          : (mod.topics || []).map((tName, lIdx) => ({
              id: `${tech.slug}_bpt_${idx + 1}_${lIdx + 1}`,
              title: tName,
              subtopics: [mod.summary || `${tech.name} structured blueprint`],
              difficulty: (mod.level === 'Intermediate' || mod.level === 'Advanced' ? mod.level : 'Beginner') as
                | 'Beginner'
                | 'Intermediate'
                | 'Advanced',
              estimatedMinutes: 15,
              kind: 'lesson' as const,
              lessonId: null,
              courseSlug: null,
              status: 'planned' as const,
            }));

      topicGroups.push({
        id: `${tech.slug}_bp_${idx + 1}`,
        sectionId: idx === 0 ? 'tutorial' : 'advanced',
        title: `${idx + 1}. ${mod.title}`,
        description: mod.summary || (mod.topic ? `Curriculum focus: ${mod.topic}` : `Planned structured track for ${tech.name}.`),
        order: idx + 1,
        topics: lessonItems,
      });
    });
  } else {
    topicGroups.push(
      {
        id: `${tech.slug}_dyn_1`,
        sectionId: 'tutorial',
        title: `1. ${tech.name} Core Foundations`,
        description: `Essential mental models, environment setup, and foundational patterns for ${tech.name}.`,
        order: 1,
        topics: [
          {
            id: `${tech.slug}_t1`,
            title: `Introduction & Mental Model of ${tech.name}`,
            subtopics: ['Role in modern architecture', 'Workspace setup', 'Starter structure'],
            difficulty: 'Beginner',
            estimatedMinutes: 15,
            kind: 'lesson',
            status: 'planned',
          },
          {
            id: `${tech.slug}_t2`,
            title: `${tech.name} Core Syntax & Primitives`,
            subtopics: ['Primary constructs', 'Configuration conventions', 'Reading diagnostics'],
            difficulty: 'Beginner',
            estimatedMinutes: 20,
            kind: 'lesson',
            status: 'planned',
          },
        ],
      },
      {
        id: `${tech.slug}_dyn_2`,
        sectionId: 'advanced',
        title: `2. Applied ${tech.name} Engineering`,
        description: `Moving from syntax to resilient, testable workflows in ${tech.name}.`,
        order: 2,
        topics: [
          {
            id: `${tech.slug}_t3`,
            title: `Testing, Debugging & Production Patterns`,
            subtopics: ['Common failure modes', 'Performance awareness', 'Maintainability'],
            difficulty: 'Intermediate',
            estimatedMinutes: 25,
            kind: 'practice',
            status: 'planned',
          },
        ],
      }
    );
  }

  const guidedExamples: GuidedExampleSpec[] = (capability.starterFiles || []).slice(0, 3).map((file, idx) => ({
    id: `${tech.slug}_ex_${idx + 1}`,
    title: `${file.filename} — ${tech.name} Starter Pattern`,
    topic: capability.environmentLabel,
    language: file.language,
    description: `Prepared starter template from the ${capability.environmentLabel} (${capability.requiredWorkspaceTools.join(', ')}).`,
    code: file.code,
    expectedOutput: capability.knownLimitations,
  }));

  for (const res of resources.slice(0, 2)) {
    if (res.code_snippet) {
      guidedExamples.push({
        id: `${tech.slug}_res_${res.id || guidedExamples.length}`,
        title: res.title,
        topic: res.type || 'Reference',
        language: capability.editorConfig.primaryLanguage,
        description: res.summary || `Reference snippet for ${tech.name}.`,
        code: res.code_snippet,
        expectedOutput: `Verified ${tech.name} reference snippet.`,
      });
    }
  }

  const challenges: ChallengeSpec[] = [
    {
      id: `${tech.slug}_ch_1`,
      title: capability.guidedTask.title,
      difficulty: 'Beginner',
      estimatedMinutes: 15,
      objective: `Verify core ${tech.name} implementation habits in ${capability.editorConfig.primaryFilename}.`,
      prompt: capability.guidedTask.instructions,
      starterCode: capability.starterFiles[0]?.code || `// Starter workspace for ${tech.name}`,
      hint: `Ensure required constructs appear cleanly: ${capability.guidedTask.requiredTokens.join(', ')}.`,
      xpReward: 40,
    },
  ];

  const totalHours = Math.max(
    6,
    courses.reduce((sum, c) => sum + Number(c.estimated_hours || 6), 0) || 12
  );

  const studyPlan: StudyPlanWeekSpec[] = [
    {
      week: 1,
      title: `Foundations & ${tech.name} Setup`,
      focus: `Establish accurate mental models and write your first verified ${tech.name} artifacts.`,
      milestones: [`Complete ${tech.name} Foundations topics`, `Run starter examples in ${capability.environmentLabel}`],
      estimatedHours: Math.max(2, Math.round(totalHours * 0.25)),
    },
    {
      week: 2,
      title: 'Core Workflows & Practical Exercises',
      focus: `Practice modular patterns, edge cases, and error prevention in ${tech.name}.`,
      milestones: ['Solve guided exercises cleanly', 'Inspect diagnostics and refactor anti-patterns'],
      estimatedHours: Math.max(3, Math.round(totalHours * 0.3)),
    },
    {
      week: 3,
      title: 'Applied Project Build',
      focus: `Assemble an end-to-end ${tech.name} deliverable matching BrainCode project rubrics.`,
      milestones: [
        projectTemplates[0] ? `Complete ${projectTemplates[0].title}` : `Build applied ${tech.name} milestone`,
        'Validate structure and edge cases',
      ],
      estimatedHours: Math.max(3, Math.round(totalHours * 0.25)),
    },
    {
      week: 4,
      title: 'Review, Interview Prep & Certification',
      focus: `Synthesize best practices, answer engineering scenarios, and sit the assessment.`,
      milestones: ['Pass practice assessments', 'Complete certification checklist'],
      estimatedHours: Math.max(2, Math.round(totalHours * 0.2)),
    },
  ];

  const interviewPrep: InterviewQuestionSpec[] = [
    {
      id: `${tech.slug}_iq_1`,
      question: `When choosing ${tech.name} for a production team, what core problem does it solve and what tradeoffs must you manage?`,
      level: 'Junior',
      keyPoints: ['Core problem fit', 'Team maintainability', 'Operational constraints'],
      sampleAnswer: `${tech.name} fits best where its core abstractions (${tech.category_name || capability.environmentLabel}) simplify delivery without hiding critical performance, security, or debugging visibility.`,
    },
    {
      id: `${tech.slug}_iq_2`,
      question: `How do you validate quality, prevent silent failures, and test changes when working with ${tech.name}?`,
      level: 'Mid-Level',
      keyPoints: [capability.assessmentMethod, 'Explicit error handling', 'Automated verification'],
      sampleAnswer: `Combine automated checks (${capability.assessmentMethod}), clear boundary validation, and repeatable local verification before shipping changes.`,
    },
  ];

  const bestPractices: BestPracticeSpec[] = [
    {
      id: `${tech.slug}_bp_1`,
      category: 'Structure',
      title: `Keep ${tech.name} units small, named intentionally, and single-purpose`,
      guidance: 'Break complex logic or configurations into cohesive modules with explicit inputs and predictable outputs.',
      antiPattern: 'Monolithic files mixing unrelated concerns with implicit shared state.',
    },
    {
      id: `${tech.slug}_bp_2`,
      category: 'Verification',
      title: 'Validate inputs and edge cases at system boundaries',
      guidance: `Rely on ${capability.assessmentMethod} and explicit error checks rather than assuming happy-path data.`,
      antiPattern: 'Silently swallowing errors or trusting unvalidated external input.',
    },
  ];

  const outcomes =
    blueprint?.outcomes && blueprint.outcomes.length > 0
      ? blueprint.outcomes
      : courses[0]?.objectives && courses[0].objectives.length > 0
      ? courses[0].objectives
      : [
          `Apply core ${tech.name} principles cleanly`,
          `Use ${capability.environmentLabel} tools effectively`,
          `Build and verify a realistic ${tech.name} project deliverable`,
        ];

  const syllabusSummary = [
    { unit: 'Unit 1', title: `${tech.name} Core Architecture & Syntax`, outcomes: outcomes.slice(0, 2), hours: Math.max(2, Math.round(totalHours * 0.3)) },
    { unit: 'Unit 2', title: `Applied Workflows & Verification`, outcomes: outcomes.slice(1, 3), hours: Math.max(3, Math.round(totalHours * 0.4)) },
    { unit: 'Unit 3', title: `Capstone Delivery & Readiness`, outcomes: [capability.guidedTask.title, 'Best Practices Audit'], hours: Math.max(2, Math.round(totalHours * 0.3)) },
  ];

  const references: ReferenceTableSpec[] = [
    {
      id: `${tech.slug}_ref_env`,
      title: `${tech.name} Environment & Capability Spec`,
      description: `Verified tooling and validation configuration for ${tech.name} inside BrainCode Academy.`,
      columns: ['Property', 'Configured Setting', 'Notes'],
      rows: [
        { symbol: 'Environment', syntax: capability.environmentLabel, description: capability.knownLimitations },
        { symbol: 'Primary File', syntax: capability.editorConfig.primaryFilename, description: `Language mode: ${capability.editorConfig.primaryLanguage}` },
        { symbol: 'File Types', syntax: capability.supportedFileTypes.join(', '), description: capability.editorConfig.multiFileSupported ? 'Multi-file editing enabled' : 'Single-file sandbox' },
        { symbol: 'Validation', syntax: capability.assessmentMethod, description: `Tools: ${capability.requiredWorkspaceTools.join(', ')}` },
      ],
    },
  ];

  if (resources.length > 0) {
    references.push({
      id: `${tech.slug}_ref_lib`,
      title: `${tech.name} Quick Snippets`,
      description: 'Published reference entries attached to this technology.',
      columns: ['Reference', 'Format', 'Summary'],
      rows: resources.map((r) => ({
        symbol: r.title,
        syntax: r.type || 'guide',
        description: r.summary || `Reference material for ${tech.name}.`,
      })),
    });
  }

  const certification: CertificationBlueprintSpec = {
    examTitle: `${tech.name} Competency Assessment`,
    passingScorePct: 75,
    durationMinutes: 40,
    questionCount: courses.flatMap((c) => c.assessments || []).length > 0 ? 15 : 10,
    prerequisiteSummary:
      courses.length > 0
        ? `Complete modules in ${courses[0].title} and verify practical skills.`
        : `Roadmap blueprint active. Complete prerequisite foundation courses while full ${tech.name} certification lessons are authored.`,
    examSections: [
      { domain: `${tech.name} Core Concepts`, weightPct: 45, topics: outcomes.slice(0, 2) },
      { domain: 'Practical Implementation & Debugging', weightPct: 35, topics: [capability.guidedTask.title, 'Boundary checks'] },
      { domain: 'Best Practices & Architecture', weightPct: 20, topics: ['Maintainability', 'Safety & Performance'] },
    ],
    preparationTips: [
      `Complete the guided task: ${capability.guidedTask.title}.`,
      `Review all anti-patterns listed in the Best Practices section.`,
      `Practice under timed assessment conditions inside the Course Studio.`,
    ],
  };

  const websiteProject: WebsiteProjectSpec = projectTemplates[0]
    ? {
        title: projectTemplates[0].title,
        summary: projectTemplates[0].summary || `Applied capstone project for ${tech.name}.`,
        phases: [
          { phase: 'Phase 1', title: 'Setup & Architecture', deliverables: [`Initialize ${capability.editorConfig.primaryFilename}`, 'Verify core requirements'] },
          { phase: 'Phase 2', title: 'Implementation & Validation', deliverables: ['Complete core functionality', `Run ${capability.assessmentMethod}`] },
          { phase: 'Phase 3', title: 'Polish & Submission', deliverables: ['Audit against best practices', 'Submit for rubric grading'] },
        ],
      }
    : {
        title: `${tech.name} Applied Capstone`,
        summary: `Structured end-to-end build applying ${tech.name} fundamentals in a clean portfolio deliverable.`,
        phases: [
          { phase: 'Phase 1', title: 'Scope & Environment', deliverables: [`Configure ${capability.editorConfig.primaryFilename}`, 'Define clear requirements'] },
          { phase: 'Phase 2', title: 'Core Build', deliverables: ['Implement primary workflow cleanly', 'Handle invalid inputs gracefully'] },
          { phase: 'Phase 3', title: 'Verification', deliverables: ['Document usage and tradeoffs', 'Complete final review'] },
        ],
      };

  const interactiveTools: Array<'px_em_converter' | 'color_contrast' | 'sql_schema_viewer' | 'snippet_runner'> = ['snippet_runner'];
  if (isSql) interactiveTools.push('sql_schema_viewer');
  if (tech.slug === 'html' || tech.slug === 'css') interactiveTools.push('px_em_converter');

  return {
    source: 'dynamic_blueprint',
    interactiveTools,
    sections,
    topicGroups,
    guidedExamples,
    challenges,
    websiteProject,
    syllabusSummary,
    studyPlan,
    interviewPrep,
    summaryPoints: [
      `${tech.name} operates inside BrainCode's ${capability.environmentLabel}.`,
      ...outcomes.slice(0, 3),
    ],
    bestPractices,
    certification,
    references,
  };
}

export function getTechnologyLearningCentre(params: {
  slug: string;
  userId?: string;
  tech?: {
    id: string;
    slug: string;
    name: string;
    description?: string;
    difficulty?: string;
    category_id?: string;
    category_slug?: string;
    category_name?: string;
  };
  capability?: TechnologyCapabilityProfile;
  courses?: CourseOutlineForMapping[];
  resources?: Array<{ id?: string; title: string; type?: string; summary?: string; code_snippet?: string }>;
  projectTemplates?: Array<{ id: string; title: string; summary?: string; difficulty?: string; estimated_hours?: number }>;
}): HydratedTechnologyLearningCentre | null {
  const techRow =
    params.tech ||
    (db
      .prepare(
        `SELECT t.id, t.slug, t.name, t.description, t.difficulty, t.category_id, cat.slug as category_slug, cat.name as category_name
         FROM technologies t
         JOIN categories cat ON cat.id = t.category_id
         WHERE t.slug = ? AND t.is_published = 1`
      )
      .get(params.slug) as
      | {
          id: string;
          slug: string;
          name: string;
          description?: string;
          difficulty?: string;
          category_id?: string;
          category_slug?: string;
          category_name?: string;
        }
      | undefined);

  if (!techRow) return null;

  const capability =
    params.capability ||
    resolveTechnologyCapability({
      id: techRow.id,
      slug: techRow.slug,
      name: techRow.name,
      categoryId: String(techRow.category_id || ''),
      categorySlug: String(techRow.category_slug || ''),
      categoryName: String(techRow.category_name || ''),
    });

  let courses = params.courses;
  if (!courses) {
    const rawCourses = db
      .prepare(
        `SELECT id, slug, title, description, difficulty, estimated_hours, objectives_json
         FROM courses
         WHERE technology_id = ? AND is_published = 1 AND status = 'published'
         ORDER BY created_at ASC`
      )
      .all(techRow.id) as Array<Record<string, unknown>>;

    courses = rawCourses.map((c) => {
      const mods = db
        .prepare(`SELECT id, title, topic FROM modules WHERE course_id = ? ORDER BY sort_order ASC`)
        .all(String(c.id)) as Array<{ id: string; title: string; topic?: string }>;
      const lessons = db
        .prepare(
          `SELECT id, module_id, title, slug, topic_name, summary, duration_minutes, language
           FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order ASC`
        )
        .all(String(c.id)) as Array<{
        id: string;
        module_id: string;
        title: string;
        slug?: string;
        topic_name?: string;
        summary?: string;
        duration_minutes?: number;
        language?: string;
      }>;
      const assessments = db
        .prepare(
          `SELECT id, title, type, mode, time_limit_sec, xp_reward, passing_score_pct
           FROM assessments WHERE course_id = ?`
        )
        .all(String(c.id)) as Array<{
        id: string;
        title: string;
        type: string;
        mode: string;
        time_limit_sec?: number;
        xp_reward: number;
        passing_score_pct?: number;
      }>;

      return {
        id: String(c.id),
        slug: String(c.slug),
        title: String(c.title),
        description: String(c.description || ''),
        difficulty: String(c.difficulty || 'Beginner'),
        estimated_hours: Number(c.estimated_hours || 6),
        objectives: parseJsonSafe<string[]>(String(c.objectives_json || '[]'), []),
        modules: mods.map((m) => ({
          ...m,
          lessons: lessons.filter((l) => l.module_id === m.id),
        })),
        assessments,
      };
    });
  }

  const resources =
    params.resources ||
    (db
      .prepare(
        `SELECT id, title, type, summary, code_snippet FROM resources
         WHERE LOWER(technology) = LOWER(?) OR LOWER(title) LIKE ?
         ORDER BY created_at DESC LIMIT 8`
      )
      .all(techRow.name, `%${techRow.name.toLowerCase()}%`) as Array<{
      id?: string;
      title: string;
      type?: string;
      summary?: string;
      code_snippet?: string;
    }>);

  const projectTemplates =
    params.projectTemplates ||
    (db
      .prepare(`SELECT id, title, summary, difficulty, estimated_hours FROM project_templates WHERE technology_id = ?`)
      .all(techRow.id) as Array<{
      id: string;
      title: string;
      summary?: string;
      difficulty?: string;
      estimated_hours?: number;
    }>);

  const stored = db
    .prepare(`SELECT * FROM technology_learning_centres WHERE technology_id = ? OR slug = ? LIMIT 1`)
    .get(techRow.id, techRow.slug) as Record<string, unknown> | undefined;

  let source: 'curated_centre' | 'dynamic_blueprint' = 'dynamic_blueprint';
  let resolvedSeed: Omit<TechnologyCentreSeed, 'slug'>;

  if (stored) {
    source = 'curated_centre';
    resolvedSeed = {
      interactiveTools: parseJsonSafe(String(stored.interactive_tools_json || '["snippet_runner"]'), ['snippet_runner']),
      sections: parseJsonSafe(String(stored.sections_config_json || '[]'), []),
      topicGroups: parseJsonSafe(String(stored.topic_groups_json || '[]'), []),
      guidedExamples: parseJsonSafe(String(stored.guided_examples_json || '[]'), []),
      challenges: parseJsonSafe(String(stored.challenges_json || '[]'), []),
      websiteProject: parseJsonSafe(String(stored.website_project_json || 'null'), {
        title: `${techRow.name} Capstone`,
        summary: '',
        phases: [],
      }),
      syllabusSummary: parseJsonSafe(String(stored.syllabus_json || '[]'), []),
      studyPlan: parseJsonSafe(String(stored.study_plan_json || '[]'), []),
      interviewPrep: parseJsonSafe(String(stored.interview_prep_json || '[]'), []),
      summaryPoints: parseJsonSafe(String(stored.summary_json || '[]'), []),
      bestPractices: parseJsonSafe(String(stored.best_practices_json || '[]'), []),
      certification: parseJsonSafe(String(stored.certification_config_json || '{}'), {
        examTitle: `${techRow.name} Certification`,
        passingScorePct: 75,
        durationMinutes: 45,
        questionCount: 10,
        prerequisiteSummary: '',
        examSections: [],
        preparationTips: [],
      }),
      references: parseJsonSafe(String(stored.references_json || '[]'), []),
    };
  } else {
    const bpRow = db
      .prepare(`SELECT module_outline_json, summary FROM curriculum_blueprints WHERE technology_id = ? LIMIT 1`)
      .get(techRow.id) as { module_outline_json?: string; summary?: string } | undefined;
    const rawOutline = bpRow?.module_outline_json
      ? parseJsonSafe<BlueprintModuleItem[] | BlueprintPayload | null>(bpRow.module_outline_json, null)
      : null;
    const blueprint: BlueprintPayload | null = Array.isArray(rawOutline)
      ? { modules: rawOutline }
      : rawOutline;
    resolvedSeed = buildDynamicLearningCentre({
      tech: techRow,
      capability,
      courses,
      resources,
      projectTemplates,
      blueprint,
    });
  }

  const mappedTopicGroups = resolveTopicMappings(resolvedSeed.topicGroups, courses);

  const courseIds = courses.map((c) => c.id);
  const certificationExams: HydratedCertificationExam[] = [];
  if (courseIds.length > 0) {
    const examRows = db
      .prepare(
        `SELECT a.id, a.course_id, a.title, a.type, a.mode, a.time_limit_sec, a.xp_reward, a.passing_score_pct, a.questions_json
         FROM assessments a
         WHERE a.course_id IN (${courseIds.map(() => '?').join(',')})
         ORDER BY CASE WHEN a.type = 'exam' THEN 0 ELSE 1 END, a.created_at ASC`
      )
      .all(...courseIds) as Array<{
      id: string;
      course_id: string;
      title: string;
      type: string;
      mode: string;
      time_limit_sec: number;
      xp_reward: number;
      passing_score_pct: number;
      questions_json: string;
    }>;

    for (const ex of examRows) {
      const courseMatch = courses.find((c) => c.id === ex.course_id);
      const qList = parseJsonSafe<unknown[]>(ex.questions_json || '[]', []);
      let userBestScorePct: number | null = null;
      let userPassed = false;
      if (params.userId) {
        const best = db
          .prepare(
            `SELECT MAX(CASE WHEN max_score > 0 THEN ROUND((score * 100.0) / max_score) ELSE 0 END) as best_pct
             FROM assessment_attempts
             WHERE assessment_id = ? AND user_id = ?`
          )
          .get(ex.id, params.userId) as { best_pct: number | null } | undefined;
        if (best && best.best_pct !== null) {
          userBestScorePct = Number(best.best_pct);
          userPassed = userBestScorePct >= Number(ex.passing_score_pct || 70);
        }
      }
      certificationExams.push({
        id: ex.id,
        courseId: ex.course_id,
        courseSlug: courseMatch?.slug || '',
        title: ex.title,
        type: ex.type,
        mode: ex.mode,
        timeLimitSec: Number(ex.time_limit_sec || 0),
        passingScorePct: Number(ex.passing_score_pct || 70),
        xpReward: Number(ex.xp_reward || 50),
        questionCount: qList.length,
        userBestScorePct,
        userPassed,
      });
    }
  }

  const allTopics = mappedTopicGroups.flatMap((g) => g.topics || []);
  const availableInteractiveTopics = allTopics.filter((t) => t.status === 'available').length;
  const referenceEntriesCount = resolvedSeed.references.reduce((sum, tbl) => sum + (tbl.rows?.length || 0), 0);

  return {
    slug: techRow.slug,
    technologyId: techRow.id,
    source,
    environmentType: capability.environmentType,
    environmentLabel: capability.environmentLabel,
    interactiveTools: resolvedSeed.interactiveTools,
    sections: [...resolvedSeed.sections].sort((a, b) => a.order - b.order),
    topicGroups: [...mappedTopicGroups].sort((a, b) => a.order - b.order),
    guidedExamples: resolvedSeed.guidedExamples,
    challenges: resolvedSeed.challenges,
    websiteProject: resolvedSeed.websiteProject?.title ? resolvedSeed.websiteProject : null,
    syllabusSummary: resolvedSeed.syllabusSummary,
    studyPlan: resolvedSeed.studyPlan,
    interviewPrep: resolvedSeed.interviewPrep,
    summaryPoints: resolvedSeed.summaryPoints,
    bestPractices: resolvedSeed.bestPractices,
    certification: resolvedSeed.certification,
    certificationExams,
    references: resolvedSeed.references,
    metrics: {
      totalSections: resolvedSeed.sections.length,
      totalTopics: allTopics.length,
      availableInteractiveTopics,
      guidedExamplesCount: resolvedSeed.guidedExamples.length,
      challengesCount: resolvedSeed.challenges.length,
      studyWeeks: resolvedSeed.studyPlan.length,
      interviewQuestionsCount: resolvedSeed.interviewPrep.length,
      referenceEntriesCount,
    },
  };
}
