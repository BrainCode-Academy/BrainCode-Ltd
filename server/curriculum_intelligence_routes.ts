import type { Router } from 'express';
import { awardXpAndBadges, db, recordAuditLog } from './db.ts';
import { createContentRevisionSnapshot, runLessonQualityCheck } from './curriculum_qa_engine.ts';
import {
  computeRubricScore,
  evaluateCourseIntelligence,
  evaluateLessonIntelligence,
  generateMasterCurriculumAudit,
  getCourseCompetencySummary,
  getLearnerRecommendations,
  recordLearnerCompetency,
  sanitizeRichText,
  sanitizeStructuredMetadata,
  validateMediaUrl,
} from './curriculum_intelligence.ts';
import { generateStudioDraftContent, isStudioAiConfigured } from './ai_studio.ts';
import {
  formatCurriculumQualityReportCsv,
  formatCurriculumQualityReportSummary,
  generateStructuredCurriculumQualityReport,
} from './curriculum_audit.ts';
import { parseJsonSafe, requireRole, type AuthenticatedRequest } from './security.ts';

export function registerCurriculumIntelligenceRoutes(
  router: Router,
  helpers: {
    requireAuth: (req: AuthenticatedRequest, res: any, next: any) => void;
    notifyWithRealtime: (userId: string, type: string, title: string, body: string, link?: string) => void;
  }
) {
  const { requireAuth, notifyWithRealtime } = helpers;
  const cmsGuard = [requireAuth, requireRole('admin', 'instructor')];

  // =========================================================
  // LEARNER RECOMMENDATIONS & COURSE COMPETENCY SUMMARY
  // =========================================================
  router.get('/curriculum/recommendations', requireAuth, (req: AuthenticatedRequest, res) => {
    const courseId = String(req.query.courseId || '').trim() || undefined;
    const canAccessPremium = Boolean(
      req.entitlement?.limits.canAccessPremiumCourses ||
        req.user?.role === 'admin' ||
        req.user?.role === 'instructor'
    );
    const recommendations = getLearnerRecommendations({
      userId: req.user!.id,
      canAccessPremium,
      courseId,
    });
    res.json({
      engine: 'rule_based_explainable_v1',
      aiRequired: false,
      recommendations,
    });
  });

  router.get('/courses/:id/competencies', (req: AuthenticatedRequest, res) => {
    const summary = getCourseCompetencySummary(String(req.params.id), req.user?.id);
    if (!summary) return res.status(404).json({ error: 'Course not found.' });
    res.json(summary);
  });

  // =========================================================
  // MASTER AUDIT & QUALITY INTELLIGENCE ENGINE
  // =========================================================
  router.get('/admin/curriculum/intelligence/audit', ...cmsGuard, (_req, res) => {
    const report = generateMasterCurriculumAudit();
    res.json(report);
  });

  // =========================================================
  // AUTOMATED CURRICULUM QUALITY REPORT (FULL GAP AUDIT)
  // =========================================================
  router.get('/admin/curriculum/quality-report', ...cmsGuard, (req, res) => {
    const report = generateStructuredCurriculumQualityReport();
    const gapType = String(req.query.gapType || 'all').trim();
    const severity = String(req.query.severity || 'all').trim();
    const entityType = String(req.query.entityType || 'all').trim();
    const q = String(req.query.q || '').trim().toLowerCase();

    const filteredGaps = report.gaps.filter((g) => {
      if (gapType !== 'all' && g.gapType !== gapType) return false;
      if (severity !== 'all' && g.severity !== severity) return false;
      if (entityType !== 'all' && g.entityType !== entityType) return false;
      if (q) {
        const hay = `${g.entityTitle} ${g.courseTitle || ''} ${g.technologyName || ''} ${g.detail}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    res.json({
      ok: true,
      report: {
        ...report,
        gaps: filteredGaps,
      },
      totalUnfilteredGaps: report.gaps.length,
    });
  });

  router.post('/admin/curriculum/quality-report/run', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const report = generateStructuredCurriculumQualityReport();
    recordAuditLog(req.user!.id, 'cms.curriculum_quality_report_generated', 'curriculum', report.reportId, {
      totalTechnologies: report.summary.totalTechnologies,
      totalCourses: report.summary.totalCourses,
      totalModules: report.summary.totalModules,
      totalLessons: report.summary.totalLessons,
      totalGaps: report.summary.totalGaps,
      emptyModules: report.summary.emptyModules,
      coursesWithoutProjects: report.summary.coursesWithoutProjects,
    });
    res.json({
      ok: true,
      report,
    });
  });

  router.get('/admin/curriculum/quality-report/export', ...cmsGuard, (req, res) => {
    const format = String(req.query.format || 'json').trim().toLowerCase();
    const report = generateStructuredCurriculumQualityReport();
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="curriculum-quality-report.csv"');
      return res.send(formatCurriculumQualityReportCsv(report));
    }
    if (format === 'txt' || format === 'summary') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="curriculum-quality-report.txt"');
      return res.send(formatCurriculumQualityReportSummary(report));
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="curriculum-quality-report.json"');
    return res.send(JSON.stringify(report, null, 2));
  });

  router.get('/admin/curriculum/intelligence/courses', ...cmsGuard, (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const reviewStatusFilter = String(req.query.reviewStatus || 'all').trim();
    const verifiedFilter = String(req.query.technicalVerified || 'all').trim();
    const maxPct = Number(req.query.maxScore || 100);

    const audit = generateMasterCurriculumAudit();
    let courses = audit.courseSummaries.filter((c) => {
      if (reviewStatusFilter !== 'all' && c.reviewStatus !== reviewStatusFilter) return false;
      if (verifiedFilter === 'verified' && !c.technicalVerified) return false;
      if (verifiedFilter === 'unverified' && c.technicalVerified) return false;
      if (Number.isFinite(maxPct) && c.percentage > maxPct) return false;
      if (q) {
        const hay = `${c.title} ${c.technologyName} ${c.categoryName} ${c.slug}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    courses = courses.sort((a, b) => a.percentage - b.percentage || a.title.localeCompare(b.title));

    res.json({
      totalCourses: audit.courseSummaries.length,
      filteredCount: courses.length,
      averageScore: audit.coverage.averageCourseQualityScore,
      courses,
    });
  });

  router.post('/admin/curriculum/intelligence/evaluate', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const entityType = String(req.body?.entityType || 'course').trim();
    const entityId = String(req.body?.entityId || '').trim();

    if (entityType === 'all') {
      const courseIds = db.prepare(`SELECT id FROM courses`).all() as Array<{ id: string }>;
      const results = courseIds
        .map((c) => evaluateCourseIntelligence(c.id, req.user!.id, true))
        .filter(Boolean);
      recordAuditLog(req.user!.id, 'intelligence.bulk_evaluated', 'curriculum', 'all', { count: results.length });
      return res.json({ ok: true, evaluatedCount: results.length, evaluations: results });
    }

    if (!entityId) return res.status(400).json({ error: 'entityId is required.' });

    if (entityType === 'lesson') {
      const evaluation = evaluateLessonIntelligence(entityId, req.user!.id, true);
      if (!evaluation) return res.status(404).json({ error: 'Lesson not found.' });
      recordAuditLog(req.user!.id, 'intelligence.lesson_evaluated', 'lesson', entityId, {
        percentage: evaluation.percentage,
        reviewStatus: evaluation.reviewStatus,
      });
      return res.json({ ok: true, evaluation });
    }

    const evaluation = evaluateCourseIntelligence(entityId, req.user!.id, true);
    if (!evaluation) return res.status(404).json({ error: 'Course not found.' });

    // Also evaluate child lessons so dashboard links stay accurate
    const childLessons = db.prepare(`SELECT id FROM lessons WHERE course_id = ?`).all(entityId) as Array<{ id: string }>;
    const lessonEvaluations = childLessons
      .map((l) => evaluateLessonIntelligence(l.id, req.user!.id, true))
      .filter(Boolean);

    recordAuditLog(req.user!.id, 'intelligence.course_evaluated', 'course', entityId, {
      percentage: evaluation.percentage,
      reviewStatus: evaluation.reviewStatus,
    });
    return res.json({ ok: true, evaluation, lessonEvaluations });
  });

  router.post('/admin/curriculum/intelligence/technical-verify', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const entityType = String(req.body?.entityType || 'course').trim();
    const entityId = String(req.body?.entityId || '').trim();
    const verified = req.body?.verified !== false;
    const notes = String(req.body?.notes || '').trim().slice(0, 500);
    if (!entityId) return res.status(400).json({ error: 'entityId is required.' });

    const now = new Date().toISOString();
    if (entityType === 'lesson') {
      const exists = db.prepare(`SELECT id, course_id FROM lessons WHERE id = ?`).get(entityId) as
        | { id: string; course_id: string }
        | undefined;
      if (!exists) return res.status(404).json({ error: 'Lesson not found.' });
      db.prepare(
        `UPDATE lessons SET technical_verified = ?, technical_verified_by = ?, technical_verified_at = ? WHERE id = ?`
      ).run(verified ? 1 : 0, verified ? req.user!.full_name : '', verified ? now : '', entityId);
      const evaluation = evaluateLessonIntelligence(entityId, req.user!.id, true);
      recordAuditLog(req.user!.id, 'intelligence.technical_verified', 'lesson', entityId, { verified, notes });
      return res.json({ ok: true, evaluation });
    }

    const exists = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(entityId);
    if (!exists) return res.status(404).json({ error: 'Course not found.' });
    db.prepare(
      `UPDATE courses SET technical_verified = ?, technical_verified_by = ?, technical_verified_at = ?, updated_at = ? WHERE id = ?`
    ).run(verified ? 1 : 0, verified ? req.user!.full_name : '', verified ? now : '', now, entityId);
    const evaluation = evaluateCourseIntelligence(entityId, req.user!.id, true);
    recordAuditLog(req.user!.id, 'intelligence.technical_verified', 'course', entityId, { verified, notes });
    return res.json({ ok: true, evaluation });
  });

  // =========================================================
  // STRUCTURED LESSON CONTENT EDITOR & SANITIZATION
  // =========================================================
  router.get('/admin/curriculum/intelligence/lessons/:id', ...cmsGuard, (req, res) => {
    const lessonId = String(req.params.id);
    const lesson = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(lessonId) as Record<string, unknown> | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const blocks = (
      db.prepare(`SELECT * FROM lesson_content_blocks WHERE lesson_id = ? ORDER BY sort_order ASC`).all(lessonId) as Array<
        Record<string, unknown>
      >
    ).map((b) => ({ ...b, metadata: parseJsonSafe<Record<string, unknown>>(String(b.metadata_json || '{}'), {}) }));
    const codeExamples = db.prepare(`SELECT * FROM code_examples WHERE lesson_id = ? ORDER BY sort_order ASC`).all(lessonId);
    const exercises = (
      db.prepare(`SELECT * FROM exercises WHERE lesson_id = ? ORDER BY sort_order ASC`).all(lessonId) as Array<
        Record<string, unknown>
      >
    ).map((ex) => ({
      ...ex,
      options: parseJsonSafe<string[]>(String(ex.options_json || '[]'), []),
      validationRule: parseJsonSafe<Record<string, unknown>>(String(ex.validation_rule_json || '{}'), {}),
    }));
    const evaluation = evaluateLessonIntelligence(lessonId, 'preview', false);

    res.json({
      lesson: {
        ...lesson,
        objectives: parseJsonSafe<string[]>(String(lesson.objectives_json || '[]'), []),
        prerequisites: parseJsonSafe<string[]>(String(lesson.prerequisites_json || '[]'), []),
        commonMistakes: parseJsonSafe<string[]>(String(lesson.common_mistakes_json || '[]'), []),
        bestPractices: parseJsonSafe<string[]>(String(lesson.best_practices_json || '[]'), []),
        furtherPractice: parseJsonSafe<string[]>(String(lesson.further_practice_json || '[]'), []),
      },
      blocks,
      codeExamples,
      exercises,
      evaluation,
    });
  });

  router.put('/admin/curriculum/intelligence/lessons/:id', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const lessonId = String(req.params.id);
    const existing = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(lessonId) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: 'Lesson not found.' });

    createContentRevisionSnapshot('lesson', lessonId, req.user!.id, 'Pre-Phase-24 structured editor update');

    const title = sanitizeRichText(String(req.body?.title ?? existing.title).trim());
    const summary = sanitizeRichText(String(req.body?.summary ?? existing.summary).trim());
    const contentMarkdown = sanitizeRichText(String(req.body?.contentMarkdown ?? existing.content_markdown).trim());
    const difficulty = String(req.body?.difficulty ?? existing.difficulty ?? 'Beginner').trim();
    const durationMinutes = Math.max(3, Math.min(240, Number(req.body?.durationMinutes ?? existing.duration_minutes ?? 15)));
    const visualExplanationMarkdown = sanitizeRichText(
      String(req.body?.visualExplanationMarkdown ?? existing.visual_explanation_markdown ?? '').trim()
    );
    const nextStepGuidance = sanitizeRichText(
      String(req.body?.nextStepGuidance ?? existing.next_step_guidance ?? '').trim()
    );

    const objectives = Array.isArray(req.body?.objectives)
      ? req.body.objectives.map((s: unknown) => sanitizeRichText(String(s).trim())).filter(Boolean)
      : parseJsonSafe<string[]>(String(existing.objectives_json || '[]'), []);
    const prerequisites = Array.isArray(req.body?.prerequisites)
      ? req.body.prerequisites.map((s: unknown) => sanitizeRichText(String(s).trim())).filter(Boolean)
      : parseJsonSafe<string[]>(String(existing.prerequisites_json || '[]'), []);
    const commonMistakes = Array.isArray(req.body?.commonMistakes)
      ? req.body.commonMistakes.map((s: unknown) => sanitizeRichText(String(s).trim())).filter(Boolean)
      : parseJsonSafe<string[]>(String(existing.common_mistakes_json || '[]'), []);
    const bestPractices = Array.isArray(req.body?.bestPractices)
      ? req.body.bestPractices.map((s: unknown) => sanitizeRichText(String(s).trim())).filter(Boolean)
      : parseJsonSafe<string[]>(String(existing.best_practices_json || '[]'), []);
    const furtherPractice = Array.isArray(req.body?.furtherPractice)
      ? req.body.furtherPractice.map((s: unknown) => sanitizeRichText(String(s).trim())).filter(Boolean)
      : parseJsonSafe<string[]>(String(existing.further_practice_json || '[]'), []);

    // Validate optional media URLs inside blocks before saving
    const rawBlocks = Array.isArray(req.body?.blocks) ? (req.body.blocks as Array<Record<string, unknown>>) : null;
    if (rawBlocks) {
      for (const blk of rawBlocks) {
        const meta = (blk.metadata && typeof blk.metadata === 'object' ? blk.metadata : {}) as Record<string, unknown>;
        for (const urlField of ['url', 'imageUrl', 'videoUrl', 'src']) {
          if (meta[urlField]) {
            const check = validateMediaUrl(String(meta[urlField]));
            if (!check.valid) {
              return res.status(400).json({ error: `Invalid media URL in block "${String(blk.title || '')}": ${check.reason}` });
            }
          }
        }
      }
    }

    const now = new Date().toISOString();
    db.exec('BEGIN');
    try {
      db.prepare(
        `UPDATE lessons
         SET title = ?, summary = ?, content_markdown = ?, difficulty = ?, duration_minutes = ?,
             estimated_minutes = ?, visual_explanation_markdown = ?, next_step_guidance = ?,
             objectives_json = ?, prerequisites_json = ?, common_mistakes_json = ?, best_practices_json = ?,
             further_practice_json = ?, version = COALESCE(version, 1) + 1, updated_at = ?
         WHERE id = ?`
      ).run(
        title,
        summary,
        contentMarkdown,
        difficulty,
        durationMinutes,
        durationMinutes,
        visualExplanationMarkdown,
        nextStepGuidance,
        JSON.stringify(objectives),
        JSON.stringify(prerequisites),
        JSON.stringify(commonMistakes),
        JSON.stringify(bestPractices),
        JSON.stringify(furtherPractice),
        now,
        lessonId
      );

      if (rawBlocks) {
        db.prepare(`DELETE FROM lesson_content_blocks WHERE lesson_id = ?`).run(lessonId);
        const insBlk = db.prepare(
          `INSERT INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        rawBlocks.forEach((blk, idx) => {
          const blkId = String(blk.id || `blk_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 4)}`);
          const bType = String(blk.block_type || blk.blockType || 'paragraph').trim();
          const bTitle = sanitizeRichText(String(blk.title || '').trim());
          const bContent = sanitizeRichText(String(blk.content_markdown ?? blk.contentMarkdown ?? '').trim());
          const cleanMeta = sanitizeStructuredMetadata(
            (blk.metadata && typeof blk.metadata === 'object' ? blk.metadata : {}) as Record<string, unknown>
          );
          insBlk.run(blkId, lessonId, bType, bTitle, bContent, JSON.stringify(cleanMeta), idx + 1);
        });
      }

      // Sync normalized learning_objectives rows for lesson
      db.prepare(`DELETE FROM learning_objectives WHERE entity_type = 'lesson' AND entity_id = ?`).run(lessonId);
      const insObj = db.prepare(
        `INSERT INTO learning_objectives (id, entity_type, entity_id, objective_code, title, mastery_level, sort_order, created_at)
         VALUES (?, 'lesson', ?, ?, ?, ?, ?, ?)`
      );
      objectives.forEach((objTitle: string, idx: number) => {
        insObj.run(`lo_${lessonId}_${idx + 1}`, lessonId, `LO-${idx + 1}`, objTitle, difficulty.toLowerCase(), idx + 1, now);
      });

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: (err as Error).message });
    }

    runLessonQualityCheck(lessonId, req.user!.id);
    const evaluation = evaluateLessonIntelligence(lessonId, req.user!.id, true);
    recordAuditLog(req.user!.id, 'cms.structured_lesson_updated', 'lesson', lessonId, {
      title,
      score: evaluation?.percentage,
    });

    res.json({ ok: true, evaluation });
  });

  // =========================================================
  // NORMALIZED LEARNING OBJECTIVES & PROGRESSION CONFIG
  // =========================================================
  router.get('/admin/curriculum/objectives', ...cmsGuard, (req, res) => {
    const entityType = String(req.query.entityType || '').trim();
    const entityId = String(req.query.entityId || '').trim();
    const rows = db
      .prepare(
        `SELECT * FROM learning_objectives
         WHERE (? = '' OR entity_type = ?) AND (? = '' OR entity_id = ?)
         ORDER BY entity_type ASC, sort_order ASC`
      )
      .all(entityType, entityType, entityId, entityId);
    res.json({ objectives: rows });
  });

  router.post('/admin/curriculum/objectives', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const entityType = ['course', 'module', 'lesson'].includes(String(req.body?.entityType))
      ? String(req.body.entityType)
      : 'course';
    const entityId = String(req.body?.entityId || '').trim();
    const title = sanitizeRichText(String(req.body?.title || '').trim());
    const objectiveCode = String(req.body?.objectiveCode || '').trim() || `OBJ-${Date.now().toString().slice(-3)}`;
    const masteryLevel = String(req.body?.masteryLevel || 'intermediate').trim();

    if (!entityId || title.length < 3) {
      return res.status(400).json({ error: 'entityId and objective title (min 3 chars) are required.' });
    }

    const maxSort = (
      db
        .prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM learning_objectives WHERE entity_type = ? AND entity_id = ?`)
        .get(entityType, entityId) as { m: number }
    ).m;
    const id = `lo_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO learning_objectives (id, entity_type, entity_id, objective_code, title, mastery_level, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, entityType, entityId, objectiveCode, title, masteryLevel, maxSort + 1, now);

    // Also keep entity objectives_json synced if course or lesson
    if (entityType === 'course' || entityType === 'lesson') {
      const table = entityType === 'course' ? 'courses' : 'lessons';
      const allObjs = db
        .prepare(`SELECT title FROM learning_objectives WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC`)
        .all(entityType, entityId) as Array<{ title: string }>;
      db.prepare(`UPDATE ${table} SET objectives_json = ? WHERE id = ?`).run(
        JSON.stringify(allObjs.map((o) => o.title)),
        entityId
      );
    }

    recordAuditLog(req.user!.id, 'cms.objective_created', entityType, entityId, { objectiveCode, title });
    res.status(201).json({ ok: true, id, objectiveCode, title });
  });

  router.delete('/admin/curriculum/objectives/:id', ...cmsGuard, (req, res) => {
    const existing = db.prepare(`SELECT * FROM learning_objectives WHERE id = ?`).get(req.params.id) as
      | { id: string; entity_type: string; entity_id: string }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Learning objective not found.' });
    db.prepare(`DELETE FROM learning_objectives WHERE id = ?`).run(existing.id);
    if (existing.entity_type === 'course' || existing.entity_type === 'lesson') {
      const table = existing.entity_type === 'course' ? 'courses' : 'lessons';
      const rem = db
        .prepare(`SELECT title FROM learning_objectives WHERE entity_type = ? AND entity_id = ? ORDER BY sort_order ASC`)
        .all(existing.entity_type, existing.entity_id) as Array<{ title: string }>;
      db.prepare(`UPDATE ${table} SET objectives_json = ? WHERE id = ?`).run(
        JSON.stringify(rem.map((o) => o.title)),
        existing.entity_id
      );
    }
    res.json({ ok: true });
  });

  router.patch('/admin/courses/:id/progression', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const course = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const difficulty = String(req.body?.difficulty ?? course.difficulty ?? 'Beginner').trim();
    const skillLevel = String(req.body?.skillLevel ?? course.skill_level ?? difficulty.toLowerCase()).trim();
    const progressionModel = String(req.body?.progressionModel ?? course.progression_model ?? 'sequential').trim();
    const estimatedHours = Math.max(1, Number(req.body?.estimatedHours ?? course.estimated_hours ?? 10));
    const minCertificateScore = Math.min(100, Math.max(0, Number(req.body?.minCertificateScore ?? course.min_certificate_score ?? 0)));
    const requirePracticalProjects =
      req.body?.requirePracticalProjects !== undefined
        ? req.body.requirePracticalProjects
          ? 1
          : 0
        : Number(course.require_practical_projects || 0);
    const prerequisites = Array.isArray(req.body?.prerequisites)
      ? req.body.prerequisites.map(String)
      : parseJsonSafe<string[]>(String(course.prerequisites_json || '[]'), []);
    const learningOutcomes = Array.isArray(req.body?.learningOutcomes)
      ? req.body.learningOutcomes.map(String)
      : parseJsonSafe<string[]>(String(course.learning_outcomes_json || '[]'), []);

    db.prepare(
      `UPDATE courses
       SET difficulty = ?, skill_level = ?, progression_model = ?, estimated_hours = ?,
           min_certificate_score = ?, require_practical_projects = ?, prerequisites_json = ?, learning_outcomes_json = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(
      difficulty,
      skillLevel,
      progressionModel,
      estimatedHours,
      minCertificateScore,
      requirePracticalProjects,
      JSON.stringify(prerequisites),
      JSON.stringify(learningOutcomes),
      new Date().toISOString(),
      String(course.id)
    );

    const evaluation = evaluateCourseIntelligence(String(course.id), req.user!.id, true);
    recordAuditLog(req.user!.id, 'cms.course_progression_updated', 'course', String(course.id), {
      skillLevel,
      progressionModel,
      minCertificateScore,
      requirePracticalProjects,
    });
    res.json({ ok: true, evaluation });
  });

  // =========================================================
  // INSTRUCTOR WEIGHTED RUBRIC GRADING (ASSIGNMENTS & PROJECTS)
  // =========================================================
  router.patch('/admin/assignments/submissions/:id/rubric', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const sub = db
      .prepare(
        `SELECT asub.*, a.course_id, a.title as assignment_title, a.rubric_json
         FROM assignment_submissions asub
         JOIN assignments a ON a.id = asub.assignment_id
         WHERE asub.id = ?`
      )
      .get(req.params.id) as
      | (Record<string, unknown> & { id: string; user_id: string; assignment_id: string; course_id: string; assignment_title: string; rubric_json: string })
      | undefined;
    if (!sub) return res.status(404).json({ error: 'Assignment submission not found.' });

    const rubricCriteria = parseJsonSafe<Array<{ criterion: string; points: number }>>(sub.rubric_json || '[]', []);
    const criterionScores = Array.isArray(req.body?.criterionScores)
      ? (req.body.criterionScores as Array<{ criterion: string; awarded: number; comment?: string }>)
      : [];

    const computed =
      rubricCriteria.length > 0 && criterionScores.length > 0
        ? computeRubricScore(rubricCriteria, criterionScores)
        : null;

    const score = computed ? computed.percentage : Math.min(100, Math.max(0, Number(req.body?.score || 0)));
    const status = ['submitted', 'graded', 'needs_revision', 'approved'].includes(String(req.body?.status))
      ? String(req.body.status)
      : score >= 70
        ? 'approved'
        : 'graded';
    const feedback = String(req.body?.instructorFeedback || '').trim();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE assignment_submissions
       SET status = ?, score = ?, rubric_scores_json = ?, instructor_feedback = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      status,
      score,
      JSON.stringify(computed ? computed.breakdown : criterionScores),
      feedback,
      req.user!.id,
      now,
      now,
      sub.id
    );

    if (sub.course_id) {
      recordLearnerCompetency({
        userId: sub.user_id,
        courseId: sub.course_id,
        objectiveKey: `assignment_${sub.assignment_id}`,
        objectiveTitle: `Practical Assignment: ${sub.assignment_title}`,
        scoreDeltaPct: score,
        evidenceType: 'assignment',
        evidenceId: sub.id,
      });
    }

    if (status === 'approved' || score >= 70) {
      awardXpAndBadges(sub.user_id, 60);
    }
    notifyWithRealtime(
      sub.user_id,
      'assignment',
      status === 'needs_revision' ? 'Assignment Rubric Review: Revision Needed' : 'Assignment Rubric Graded',
      `"${sub.assignment_title}" scored ${score}%. ${feedback || ''}`.trim(),
      '/courses'
    );
    recordAuditLog(req.user!.id, 'instructor.assignment_rubric_graded', 'assignment_submission', sub.id, {
      status,
      score,
    });

    res.json({ ok: true, score, status, rubricResult: computed });
  });

  router.patch('/admin/projects/:id/rubric', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const prj = db
      .prepare(
        `SELECT p.*, pt.course_id, pt.rubric_json
         FROM projects p
         LEFT JOIN project_templates pt ON pt.id = p.template_id
         WHERE p.id = ?`
      )
      .get(req.params.id) as
      | (Record<string, unknown> & { id: string; owner_id: string; title: string; course_id?: string; rubric_json?: string })
      | undefined;
    if (!prj) return res.status(404).json({ error: 'Project not found.' });

    const rubricCriteria = parseJsonSafe<Array<{ criterion: string; points: number }>>(String(prj.rubric_json || '[]'), []);
    const criterionScores = Array.isArray(req.body?.criterionScores)
      ? (req.body.criterionScores as Array<{ criterion: string; awarded: number; comment?: string }>)
      : [];

    const computed =
      rubricCriteria.length > 0 && criterionScores.length > 0
        ? computeRubricScore(rubricCriteria, criterionScores)
        : null;

    const score = computed ? computed.percentage : Math.min(100, Math.max(0, Number(req.body?.score || 85)));
    const status = ['in_progress', 'submitted', 'needs_revision', 'approved'].includes(String(req.body?.status))
      ? String(req.body.status)
      : 'approved';
    const feedback = String(req.body?.instructorFeedback || '').trim();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE projects
       SET status = ?, rubric_scores_json = ?, instructor_feedback = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`
    ).run(
      status,
      JSON.stringify(computed ? computed.breakdown : criterionScores),
      feedback,
      req.user!.id,
      now,
      prj.id
    );

    if (prj.course_id) {
      recordLearnerCompetency({
        userId: prj.owner_id,
        courseId: prj.course_id,
        objectiveKey: `project_${prj.id}`,
        objectiveTitle: `Capstone Project: ${prj.title}`,
        scoreDeltaPct: status === 'approved' ? Math.max(80, score) : score,
        evidenceType: 'project',
        evidenceId: prj.id,
      });
    }

    if (status === 'approved') {
      awardXpAndBadges(prj.owner_id, 100);
    }
    notifyWithRealtime(
      prj.owner_id,
      'assignment',
      'Project Rubric Review Completed',
      `${prj.title}: ${status} (${score}%)${feedback ? ` — ${feedback}` : ''}`,
      '/projects'
    );
    recordAuditLog(req.user!.id, 'instructor.project_rubric_graded', 'project', prj.id, { status, score });

    res.json({ ok: true, score, status, rubricResult: computed });
  });

  // =========================================================
  // AI IMPROVEMENT SUGGESTIONS (OPTIONAL AI, STRICT DRAFT SAFE)
  // =========================================================
  router.post('/admin/curriculum/ai-studio/intelligence-suggest', ...cmsGuard, async (req: AuthenticatedRequest, res) => {
    const courseId = String(req.body?.courseId || '').trim();
    const lessonId = String(req.body?.lessonId || '').trim();
    const mode = String(req.body?.mode || 'plan').trim();

    const evalResult = lessonId
      ? evaluateLessonIntelligence(lessonId, req.user!.id, false)
      : courseId
        ? evaluateCourseIntelligence(courseId, req.user!.id, false)
        : null;

    if (!evalResult) return res.status(404).json({ error: 'Provide a valid courseId or lessonId.' });

    const ruleSuggestions = [
      ...evalResult.missingRequirements.map((m) => ({ area: 'Missing Requirement', action: m })),
      ...evalResult.warnings.map((w) => ({ area: 'Quality Warning', action: w })),
      ...evalResult.recommendations.map((r) => ({ area: 'Pedagogical Improvement', action: r })),
    ];

    if (mode !== 'ai_draft' || !isStudioAiConfigured()) {
      return res.json({
        aiUsed: false,
        aiConfigured: isStudioAiConfigured(),
        workflowNotice: 'Rule-based intelligence plan generated without external AI calls. Core platform remains 100% operational.',
        evaluation: evalResult,
        suggestions: ruleSuggestions,
      });
    }

    try {
      const targetCourse = courseId
        ? (db.prepare(`SELECT technology_id, title, difficulty FROM courses WHERE id = ?`).get(courseId) as
            | { technology_id: string; title: string; difficulty: string }
            | undefined)
        : (db
            .prepare(`SELECT c.technology_id, c.title, c.difficulty FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`)
            .get(lessonId) as { technology_id: string; title: string; difficulty: string } | undefined);

      if (!targetCourse) return res.status(404).json({ error: 'Parent technology/course not found.' });

      const aiRes = await generateStudioDraftContent({
        user: req.user!,
        technologyId: targetCourse.technology_id,
        courseId: courseId || undefined,
        lessonTitle: evalResult.title,
        targetType: lessonId ? 'revision_notes' : 'exercises',
        difficultyMode: (targetCourse.difficulty as 'Beginner' | 'Intermediate' | 'Advanced') || 'Beginner',
        learningObjectives: evalResult.missingRequirements.slice(0, 4),
      });

      return res.json({
        aiUsed: true,
        aiConfigured: true,
        workflowNotice: 'AI draft suggestions created strictly as unapproved draft artifacts. Instructor review required before publishing.',
        evaluation: evalResult,
        suggestions: ruleSuggestions,
        aiDraft: aiRes.draft,
      });
    } catch (err) {
      return res.json({
        aiUsed: false,
        aiConfigured: isStudioAiConfigured(),
        fallbackReason: (err as Error).message,
        workflowNotice: 'AI service unavailable; falling back cleanly to deterministic curriculum intelligence recommendations.',
        evaluation: evalResult,
        suggestions: ruleSuggestions,
      });
    }
  });
}
