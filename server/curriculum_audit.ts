import { db } from './db.ts';
import { parseJsonSafe } from './security.ts';

export type CurriculumAuditGapType =
  | 'missing_objective'
  | 'empty_module'
  | 'empty_course'
  | 'course_without_project'
  | 'technology_without_course'
  | 'technology_without_project'
  | 'missing_assessment'
  | 'brief_content'
  | 'missing_code_example'
  | 'unverified_technical';

export type AuditSeverity = 'critical' | 'warning' | 'info';

export interface CurriculumAuditGapItem {
  id: string;
  gapType: CurriculumAuditGapType;
  severity: AuditSeverity;
  entityType: 'technology' | 'course' | 'module' | 'lesson';
  entityId: string;
  entityTitle: string;
  courseId?: string;
  courseTitle?: string;
  technologyId?: string;
  technologyName?: string;
  technologySlug?: string;
  detail: string;
  recommendation: string;
  actionTarget: 'lesson_editor' | 'course_inspector' | 'technology_catalog';
}

export interface TechnologyAuditEntry {
  technologyId: string;
  name: string;
  slug: string;
  categoryName: string;
  difficulty: string;
  contentStatus: string;
  totalCourses: number;
  publishedCourses: number;
  totalModules: number;
  emptyModules: number;
  totalLessons: number;
  lessonsMissingObjectives: number;
  projectTemplatesCount: number;
  exercisesCount: number;
  assessmentsCount: number;
  hasBlueprint: boolean;
  hasLearningCentre: boolean;
  healthStatus: 'healthy' | 'needs_attention' | 'critical_gaps' | 'unstarted';
  gaps: string[];
}

export interface CourseAuditDetailEntry {
  courseId: string;
  title: string;
  slug: string;
  technologyId: string;
  technologyName: string;
  technologySlug: string;
  status: string;
  isPublished: boolean;
  modulesCount: number;
  emptyModulesCount: number;
  lessonsCount: number;
  lessonsMissingObjectives: number;
  missingObjectives: boolean;
  projectTemplatesCount: number;
  assignmentsCount: number;
  missingProject: boolean;
  assessmentsCount: number;
  exercisesCount: number;
  technicalVerified: boolean;
  gaps: string[];
}

export interface EmptyModuleGapEntry {
  moduleId: string;
  moduleTitle: string;
  courseId: string;
  courseTitle: string;
  technologyId: string;
  technologyName: string;
  technologySlug: string;
}

export interface CurriculumQualityReport {
  reportId: string;
  reportTitle: string;
  generatedAt: string;
  summary: {
    totalTechnologies: number;
    healthyTechnologies: number;
    technologiesWithGaps: number;
    unstartedTechnologies: number;
    totalCourses: number;
    emptyCourses: number;
    coursesMissingObjectives: number;
    coursesWithoutProjects: number;
    coursesMissingAssessments: number;
    totalModules: number;
    emptyModules: number;
    totalLessons: number;
    lessonsMissingObjectives: number;
    lessonsBriefContent: number;
    lessonsMissingCodeExample: number;
    lessonsMissingBlocks: number;
    unverifiedCourses: number;
    unverifiedLessons: number;
    totalGaps: number;
    criticalGaps: number;
    warningGaps: number;
    infoGaps: number;
    overallHealthScorePct: number;
  };
  byGapType: Record<CurriculumAuditGapType, number>;
  technologyAudits: TechnologyAuditEntry[];
  courseAudits: CourseAuditDetailEntry[];
  emptyModules: EmptyModuleGapEntry[];
  gaps: CurriculumAuditGapItem[];
}

export function generateStructuredCurriculumQualityReport(): CurriculumQualityReport {
  const generatedAt = new Date().toISOString();
  const reportId = `cqr_${Date.now()}`;

  const technologies = db
    .prepare(
      `SELECT t.id, t.name, t.slug, t.difficulty, t.content_status, cat.name as category_name
       FROM technologies t
       LEFT JOIN categories cat ON cat.id = t.category_id
       ORDER BY cat.sort_order ASC, t.sort_order ASC, t.name ASC`
    )
    .all() as Array<{
    id: string;
    name: string;
    slug: string;
    difficulty: string;
    content_status: string;
    category_name: string;
  }>;

  const courses = db
    .prepare(
      `SELECT c.*, t.name as technology_name, t.slug as technology_slug
       FROM courses c
       LEFT JOIN technologies t ON t.id = c.technology_id
       ORDER BY c.title ASC`
    )
    .all() as Array<Record<string, unknown>>;

  const modules = db
    .prepare(`SELECT m.*, c.technology_id FROM modules m JOIN courses c ON c.id = m.course_id ORDER BY m.course_id, m.sort_order ASC`)
    .all() as Array<Record<string, unknown>>;

  const lessons = db
    .prepare(`SELECT l.*, m.title as module_title FROM lessons l LEFT JOIN modules m ON m.id = l.module_id ORDER BY l.course_id, l.sort_order ASC`)
    .all() as Array<Record<string, unknown>>;

  const projectTemplates = db
    .prepare(`SELECT id, course_id, technology_id FROM project_templates`)
    .all() as Array<{ id: string; course_id: string; technology_id: string }>;

  const assignments = db
    .prepare(`SELECT id, course_id, technology_id FROM assignments`)
    .all() as Array<{ id: string; course_id: string; technology_id: string }>;

  const exercises = db
    .prepare(`SELECT id, course_id, technology_id FROM exercises`)
    .all() as Array<{ id: string; course_id: string; technology_id: string }>;

  const assessments = db
    .prepare(`SELECT id, course_id FROM assessments`)
    .all() as Array<{ id: string; course_id: string }>;

  const blueprintTechIds = new Set(
    (db.prepare(`SELECT technology_id FROM curriculum_blueprints`).all() as Array<{ technology_id: string }>).map(
      (r) => r.technology_id
    )
  );
  const learningCentreTechIds = new Set(
    (db.prepare(`SELECT technology_id FROM technology_learning_centres`).all() as Array<{ technology_id: string }>).map(
      (r) => r.technology_id
    )
  );
  const blockCounts = new Map<string, number>();
  for (const row of db
    .prepare(`SELECT lesson_id, COUNT(*) as c FROM lesson_content_blocks GROUP BY lesson_id`)
    .all() as Array<{ lesson_id: string; c: number }>) {
    blockCounts.set(row.lesson_id, row.c);
  }
  const codeExampleCounts = new Map<string, number>();
  for (const row of db
    .prepare(`SELECT lesson_id, COUNT(*) as c FROM code_examples GROUP BY lesson_id`)
    .all() as Array<{ lesson_id: string; c: number }>) {
    codeExampleCounts.set(row.lesson_id, row.c);
  }
  const normalizedObjectiveEntities = new Set(
    (
      db.prepare(`SELECT entity_type, entity_id FROM learning_objectives`).all() as Array<{
        entity_type: string;
        entity_id: string;
      }>
    ).map((r) => `${r.entity_type}:${r.entity_id}`)
  );

  // Build quick lookup maps
  const lessonsByModule = new Map<string, Array<Record<string, unknown>>>();
  const lessonsByCourse = new Map<string, Array<Record<string, unknown>>>();
  for (const l of lessons) {
    const mid = String(l.module_id || '');
    const cid = String(l.course_id || '');
    if (!lessonsByModule.has(mid)) lessonsByModule.set(mid, []);
    lessonsByModule.get(mid)!.push(l);
    if (!lessonsByCourse.has(cid)) lessonsByCourse.set(cid, []);
    lessonsByCourse.get(cid)!.push(l);
  }

  const modulesByCourse = new Map<string, Array<Record<string, unknown>>>();
  for (const m of modules) {
    const cid = String(m.course_id || '');
    if (!modulesByCourse.has(cid)) modulesByCourse.set(cid, []);
    modulesByCourse.get(cid)!.push(m);
  }

  const techMap = new Map(technologies.map((t) => [t.id, t]));
  const courseMap = new Map(courses.map((c) => [String(c.id), c]));

  const gaps: CurriculumAuditGapItem[] = [];
  const emptyModulesList: EmptyModuleGapEntry[] = [];
  const byGapType: Record<CurriculumAuditGapType, number> = {
    missing_objective: 0,
    empty_module: 0,
    empty_course: 0,
    course_without_project: 0,
    technology_without_course: 0,
    technology_without_project: 0,
    missing_assessment: 0,
    brief_content: 0,
    missing_code_example: 0,
    unverified_technical: 0,
  };

  const pushGap = (item: Omit<CurriculumAuditGapItem, 'id'>) => {
    byGapType[item.gapType] += 1;
    gaps.push({
      id: `gap_${gaps.length + 1}_${item.gapType}_${item.entityId}`,
      ...item,
    });
  };

  // 1. Traverse all Modules -> detect empty modules
  const emptyModulesCountByCourse = new Map<string, number>();
  for (const m of modules) {
    const mid = String(m.id);
    const cid = String(m.course_id);
    const modLessons = lessonsByModule.get(mid) || [];
    if (modLessons.length === 0) {
      emptyModulesCountByCourse.set(cid, (emptyModulesCountByCourse.get(cid) || 0) + 1);
      const c = courseMap.get(cid);
      const tid = String(c?.technology_id || m.technology_id || '');
      const tech = techMap.get(tid);
      emptyModulesList.push({
        moduleId: mid,
        moduleTitle: String(m.title),
        courseId: cid,
        courseTitle: String(c?.title || cid),
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
      });
      pushGap({
        gapType: 'empty_module',
        severity: 'warning',
        entityType: 'module',
        entityId: mid,
        entityTitle: String(m.title),
        courseId: cid,
        courseTitle: String(c?.title || cid),
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Module "${m.title}" has 0 lessons assigned.`,
        recommendation: 'Author or assign at least 1 structured lesson into this module, or remove the empty container.',
        actionTarget: 'course_inspector',
      });
    }
  }

  // 2. Traverse all Lessons -> missing objectives, brief explanation, missing code example, unverified technical
  let lessonsMissingObjectives = 0;
  let lessonsBriefContent = 0;
  let lessonsMissingCodeExample = 0;
  let lessonsMissingBlocks = 0;
  let unverifiedLessons = 0;
  const lessonsMissingObjByCourse = new Map<string, number>();

  for (const l of lessons) {
    const lid = String(l.id);
    const cid = String(l.course_id);
    const c = courseMap.get(cid);
    const tid = String(c?.technology_id || '');
    const tech = techMap.get(tid);
    const cTitle = String(c?.title || cid);

    const objs = parseJsonSafe<string[]>(String(l.objectives_json || '[]'), []);
    const hasNormalizedObj = normalizedObjectiveEntities.has(`lesson:${lid}`);
    if (objs.length === 0 && !hasNormalizedObj) {
      lessonsMissingObjectives += 1;
      lessonsMissingObjByCourse.set(cid, (lessonsMissingObjByCourse.get(cid) || 0) + 1);
      pushGap({
        gapType: 'missing_objective',
        severity: 'warning',
        entityType: 'lesson',
        entityId: lid,
        entityTitle: String(l.title),
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Lesson "${l.title}" has no defined learning objectives.`,
        recommendation: 'Open the Structured Lesson Editor and add 2–4 measurable learning objectives.',
        actionTarget: 'lesson_editor',
      });
    }

    const contentLen = String(l.content_markdown || '').trim().length;
    if (contentLen < 250) {
      lessonsBriefContent += 1;
      pushGap({
        gapType: 'brief_content',
        severity: contentLen < 120 ? 'critical' : 'warning',
        entityType: 'lesson',
        entityId: lid,
        entityTitle: String(l.title),
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Lesson "${l.title}" content is too brief (${contentLen} chars < 250 minimum).`,
        recommendation: 'Expand conceptual explanation, mental models, and practical walkthrough in Lesson Editor.',
        actionTarget: 'lesson_editor',
      });
    }

    const ceCount = codeExampleCounts.get(lid) || 0;
    if (ceCount === 0 && String(l.code_example || '').trim().length < 10) {
      lessonsMissingCodeExample += 1;
      pushGap({
        gapType: 'missing_code_example',
        severity: 'info',
        entityType: 'lesson',
        entityId: lid,
        entityTitle: String(l.title),
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Lesson "${l.title}" lacks an interactive or illustrative code example.`,
        recommendation: 'Attach a runnable or domain-verified code example in the Lesson Editor.',
        actionTarget: 'lesson_editor',
      });
    }

    if ((blockCounts.get(lid) || 0) === 0) {
      lessonsMissingBlocks += 1;
    }

    if (!Number(l.technical_verified)) {
      unverifiedLessons += 1;
    }
  }

  // 3. Traverse all Courses -> empty courses, missing objectives, courses without projects, missing assessments, unverified
  const courseAudits: CourseAuditDetailEntry[] = [];
  let emptyCourses = 0;
  let coursesMissingObjectives = 0;
  let coursesWithoutProjects = 0;
  let coursesMissingAssessments = 0;
  let unverifiedCourses = 0;

  for (const c of courses) {
    const cid = String(c.id);
    const tid = String(c.technology_id || '');
    const tech = techMap.get(tid);
    const cTitle = String(c.title || cid);
    const cModules = modulesByCourse.get(cid) || [];
    const cLessons = lessonsByCourse.get(cid) || [];
    const cEmptyMods = emptyModulesCountByCourse.get(cid) || 0;
    const cProjects = projectTemplates.filter((pt) => pt.course_id === cid);
    const cAssignments = assignments.filter((a) => a.course_id === cid);
    const cAssessments = assessments.filter((a) => a.course_id === cid);
    const cExercises = exercises.filter((e) => e.course_id === cid);

    const courseObjs = parseJsonSafe<string[]>(String(c.objectives_json || '[]'), []);
    const courseOutcomes = parseJsonSafe<string[]>(String(c.learning_outcomes_json || '[]'), []);
    const missingObjectives =
      courseObjs.length === 0 && courseOutcomes.length === 0 && !normalizedObjectiveEntities.has(`course:${cid}`);
    const missingProject = cProjects.length === 0;
    const techVerified = Boolean(Number(c.technical_verified));
    const cGaps: string[] = [];

    if (cLessons.length === 0) {
      emptyCourses += 1;
      cGaps.push('Empty course (0 lessons)');
      pushGap({
        gapType: 'empty_course',
        severity: 'critical',
        entityType: 'course',
        entityId: cid,
        entityTitle: cTitle,
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Course "${cTitle}" contains 0 lessons.`,
        recommendation: 'Populate modules and publish structured lessons before exposing to learners.',
        actionTarget: 'course_inspector',
      });
    }

    if (missingObjectives) {
      coursesMissingObjectives += 1;
      cGaps.push('Missing course objectives');
      pushGap({
        gapType: 'missing_objective',
        severity: 'warning',
        entityType: 'course',
        entityId: cid,
        entityTitle: cTitle,
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Course "${cTitle}" has no course-level learning objectives.`,
        recommendation: 'Define clear course outcomes in the Curriculum CMS.',
        actionTarget: 'course_inspector',
      });
    }

    if (missingProject) {
      coursesWithoutProjects += 1;
      cGaps.push('No linked project template');
      pushGap({
        gapType: 'course_without_project',
        severity: 'warning',
        entityType: 'course',
        entityId: cid,
        entityTitle: cTitle,
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Course "${cTitle}" has no practical capstone project template attached.`,
        recommendation: 'Attach a Starter Project Template with rubric criteria to enforce practical mastery.',
        actionTarget: 'course_inspector',
      });
    }

    if (cAssessments.length === 0) {
      coursesMissingAssessments += 1;
      cGaps.push('No quiz or assessment');
      pushGap({
        gapType: 'missing_assessment',
        severity: 'warning',
        entityType: 'course',
        entityId: cid,
        entityTitle: cTitle,
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Course "${cTitle}" has no quiz or certification assessment.`,
        recommendation: 'Add a formative quiz or certification assessment to measure competency.',
        actionTarget: 'course_inspector',
      });
    }

    if (cEmptyMods > 0) {
      cGaps.push(`${cEmptyMods} empty module(s)`);
    }

    if (!techVerified) {
      unverifiedCourses += 1;
      cGaps.push('Awaiting SME verification');
      pushGap({
        gapType: 'unverified_technical',
        severity: 'info',
        entityType: 'course',
        entityId: cid,
        entityTitle: cTitle,
        courseId: cid,
        courseTitle: cTitle,
        technologyId: tid,
        technologyName: tech?.name || '',
        technologySlug: tech?.slug || '',
        detail: `Course "${cTitle}" has not been marked SME Technically Verified.`,
        recommendation: 'Review code samples and click "Mark Verified" in the Course Quality Matrix.',
        actionTarget: 'course_inspector',
      });
    }

    courseAudits.push({
      courseId: cid,
      title: cTitle,
      slug: String(c.slug || ''),
      technologyId: tid,
      technologyName: tech?.name || String(c.technology_name || ''),
      technologySlug: tech?.slug || String(c.technology_slug || ''),
      status: String(c.status || 'draft'),
      isPublished: Number(c.is_published) === 1,
      modulesCount: cModules.length,
      emptyModulesCount: cEmptyMods,
      lessonsCount: cLessons.length,
      lessonsMissingObjectives: lessonsMissingObjByCourse.get(cid) || 0,
      missingObjectives,
      projectTemplatesCount: cProjects.length,
      assignmentsCount: cAssignments.length,
      missingProject,
      assessmentsCount: cAssessments.length,
      exercisesCount: cExercises.length,
      technicalVerified: techVerified,
      gaps: cGaps,
    });
  }

  // 4. Traverse all Technologies -> coverage, project gap, empty modules / missing objectives rollups
  const technologyAudits: TechnologyAuditEntry[] = [];
  let healthyTechnologies = 0;
  let technologiesWithGaps = 0;
  let unstartedTechnologies = 0;

  for (const tech of technologies) {
    const techCourses = courseAudits.filter((c) => c.technologyId === tech.id);
    const pubCourses = techCourses.filter((c) => c.isPublished && c.status === 'published');
    const techModules = techCourses.reduce((s, c) => s + c.modulesCount, 0);
    const techEmptyModules = techCourses.reduce((s, c) => s + c.emptyModulesCount, 0);
    const techLessons = techCourses.reduce((s, c) => s + c.lessonsCount, 0);
    const techMissingLesObj = techCourses.reduce((s, c) => s + c.lessonsMissingObjectives, 0);

    const techCourseIds = new Set(techCourses.map((c) => c.courseId));
    const techProjects = projectTemplates.filter(
      (pt) => pt.technology_id === tech.id || (pt.course_id && techCourseIds.has(pt.course_id))
    ).length;
    const techExercises = exercises.filter(
      (e) => e.technology_id === tech.id || (e.course_id && techCourseIds.has(e.course_id))
    ).length;
    const techAssessments = techCourses.reduce((s, c) => s + c.assessmentsCount, 0);
    const hasBlueprint = blueprintTechIds.has(tech.id);
    const hasLearningCentre = learningCentreTechIds.has(tech.id);

    const tGaps: string[] = [];
    if (pubCourses.length === 0) {
      tGaps.push('No published course');
      pushGap({
        gapType: 'technology_without_course',
        severity: techCourses.length > 0 ? 'warning' : 'info',
        entityType: 'technology',
        entityId: tech.id,
        entityTitle: tech.name,
        technologyId: tech.id,
        technologyName: tech.name,
        technologySlug: tech.slug,
        detail:
          techCourses.length > 0
            ? `Technology "${tech.name}" only has draft/unpublished courses.`
            : `Technology "${tech.name}" has 0 courses authored yet.`,
        recommendation: 'Generate or author starter modules and lessons from its Curriculum Blueprint.',
        actionTarget: 'technology_catalog',
      });
    } else if (techProjects === 0) {
      tGaps.push('No project template');
      pushGap({
        gapType: 'technology_without_project',
        severity: 'warning',
        entityType: 'technology',
        entityId: tech.id,
        entityTitle: tech.name,
        technologyId: tech.id,
        technologyName: tech.name,
        technologySlug: tech.slug,
        detail: `Published technology "${tech.name}" has no practical project template.`,
        recommendation: 'Add a discipline-matched capstone Project Template for learners.',
        actionTarget: 'technology_catalog',
      });
    }

    if (techEmptyModules > 0) tGaps.push(`${techEmptyModules} empty module(s)`);
    if (techMissingLesObj > 0) tGaps.push(`${techMissingLesObj} lesson(s) missing objectives`);
    if (pubCourses.length > 0 && techAssessments === 0) tGaps.push('No assessment');
    if (pubCourses.length > 0 && techExercises === 0) tGaps.push('No exercises');

    let healthStatus: TechnologyAuditEntry['healthStatus'] = 'healthy';
    if (pubCourses.length === 0) {
      healthStatus = 'unstarted';
      unstartedTechnologies += 1;
    } else if (techEmptyModules > 0 || techCourses.some((c) => c.lessonsCount === 0)) {
      healthStatus = 'critical_gaps';
      technologiesWithGaps += 1;
    } else if (tGaps.length > 0) {
      healthStatus = 'needs_attention';
      technologiesWithGaps += 1;
    } else {
      healthyTechnologies += 1;
    }

    technologyAudits.push({
      technologyId: tech.id,
      name: tech.name,
      slug: tech.slug,
      categoryName: tech.category_name || 'Uncategorized',
      difficulty: tech.difficulty || 'Beginner',
      contentStatus: tech.content_status || 'coming_soon',
      totalCourses: techCourses.length,
      publishedCourses: pubCourses.length,
      totalModules: techModules,
      emptyModules: techEmptyModules,
      totalLessons: techLessons,
      lessonsMissingObjectives: techMissingLesObj,
      projectTemplatesCount: techProjects,
      exercisesCount: techExercises,
      assessmentsCount: techAssessments,
      hasBlueprint,
      hasLearningCentre,
      healthStatus,
      gaps: tGaps,
    });
  }

  const criticalGaps = gaps.filter((g) => g.severity === 'critical').length;
  const warningGaps = gaps.filter((g) => g.severity === 'warning').length;
  const infoGaps = gaps.filter((g) => g.severity === 'info').length;

  // Deterministic health score: weighted completion across published courses & core hygiene
  const activeCourses = courses.length || 1;
  const courseHygieneScore = Math.max(
    0,
    Math.round(
      100 -
        (emptyCourses / activeCourses) * 35 -
        (coursesWithoutProjects / activeCourses) * 20 -
        (coursesMissingObjectives / activeCourses) * 20 -
        (emptyModulesList.length / Math.max(1, modules.length)) * 15 -
        (lessonsMissingObjectives / Math.max(1, lessons.length)) * 10
    )
  );

  // Order gaps: critical first, then warning, then info
  const sevWeight: Record<AuditSeverity, number> = { critical: 0, warning: 1, info: 2 };
  gaps.sort((a, b) => sevWeight[a.severity] - sevWeight[b.severity] || a.entityTitle.localeCompare(b.entityTitle));

  return {
    reportId,
    reportTitle: 'Curriculum Quality Report',
    generatedAt,
    summary: {
      totalTechnologies: technologies.length,
      healthyTechnologies,
      technologiesWithGaps,
      unstartedTechnologies,
      totalCourses: courses.length,
      emptyCourses,
      coursesMissingObjectives,
      coursesWithoutProjects,
      coursesMissingAssessments,
      totalModules: modules.length,
      emptyModules: emptyModulesList.length,
      totalLessons: lessons.length,
      lessonsMissingObjectives,
      lessonsBriefContent,
      lessonsMissingCodeExample,
      lessonsMissingBlocks,
      unverifiedCourses,
      unverifiedLessons,
      totalGaps: gaps.length,
      criticalGaps,
      warningGaps,
      infoGaps,
      overallHealthScorePct: courseHygieneScore,
    },
    byGapType,
    technologyAudits,
    courseAudits,
    emptyModules: emptyModulesList,
    gaps,
  };
}

export function formatCurriculumQualityReportCsv(report: CurriculumQualityReport): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    ['Severity', 'GapType', 'EntityType', 'EntityID', 'Title', 'Course', 'Technology', 'Detail', 'Recommendation'].map(esc).join(','),
  ];
  for (const g of report.gaps) {
    lines.push(
      [
        g.severity,
        g.gapType,
        g.entityType,
        g.entityId,
        g.entityTitle,
        g.courseTitle || '',
        g.technologyName || '',
        g.detail,
        g.recommendation,
      ]
        .map(esc)
        .join(',')
    );
  }
  return lines.join('\n');
}

export function formatCurriculumQualityReportSummary(report: CurriculumQualityReport): string {
  const s = report.summary;
  const topGaps = report.gaps
    .filter((g) => g.severity !== 'info')
    .slice(0, 15)
    .map((g, i) => `  ${i + 1}. [${g.severity.toUpperCase()}] (${g.gapType}) ${g.entityTitle} — ${g.detail}`)
    .join('\n');

  return [
    `=== BRAINCODE ACADEMY · ${report.reportTitle.toUpperCase()} ===`,
    `Report ID   : ${report.reportId}`,
    `Generated   : ${report.generatedAt}`,
    `Hygiene     : ${s.overallHealthScorePct}%`,
    `-------------------------------------------------------------`,
    `Technologies: ${s.totalTechnologies} total (${s.healthyTechnologies} healthy · ${s.technologiesWithGaps} with gaps · ${s.unstartedTechnologies} awaiting courses)`,
    `Courses     : ${s.totalCourses} total (${s.emptyCourses} empty · ${s.coursesMissingObjectives} missing objectives · ${s.coursesWithoutProjects} without projects)`,
    `Modules     : ${s.totalModules} total (${s.emptyModules} empty)`,
    `Lessons     : ${s.totalLessons} total (${s.lessonsMissingObjectives} missing objectives · ${s.lessonsBriefContent} brief · ${s.lessonsMissingCodeExample} missing code examples)`,
    `Total Gaps  : ${s.totalGaps} (${s.criticalGaps} critical · ${s.warningGaps} warning · ${s.infoGaps} info)`,
    `-------------------------------------------------------------`,
    topGaps ? `Top Priority Findings:\n${topGaps}` : 'No critical or warning gaps detected.',
  ].join('\n');
}
