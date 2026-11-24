import type { Router } from 'express';
import { db, recordAuditLog } from './db.ts';
import { parseJsonSafe, requireRole, type AuthenticatedRequest } from './security.ts';
import {
  computeAllTechnologyCoverage,
  createContentRevisionSnapshot,
  evaluateCourseCompleteness,
  evaluateLearningPathCompleteness,
  getCompletenessPolicy,
  getTechnologyDetailedReport,
  listContentRevisions,
  restoreContentRevision,
  runCourseQualityCheck,
  runLessonQualityCheck,
  updateCompletenessPolicy,
  type CoverageStatus,
} from './curriculum_qa_engine.ts';
import {
  cancelBatchGenerationJob,
  createBatchGenerationJob,
  generateStudioDraftContent,
  getActiveStudioModel,
  getBatchJobDetail,
  getStudioQuotaStatus,
  listBatchJobs,
  pauseBatchGenerationJob,
  processBatchGenerationJob,
  retryBatchGenerationJob,
  saveAiDraftToCurriculum,
  type StudioMode,
  type StudioTargetType,
} from './ai_studio.ts';
import { getAiHealthState, probeGeminiHealthOnce } from './ai_errors.ts';
import { auditAllCurriculumCodeExamples } from './code_validator.ts';

export function registerCurriculumGovernanceRoutes(
  router: Router,
  helpers: {
    requireAuth: (req: AuthenticatedRequest, res: any, next: any) => void;
    notifyWithRealtime: (userId: string, type: string, title: string, body: string, link?: string) => void;
  }
) {
  const { requireAuth, notifyWithRealtime } = helpers;
  const cmsGuard = [requireAuth, requireRole('admin', 'instructor')];
  const adminGuard = [requireAuth, requireRole('admin')];

  // =========================================================
  // 1. MASTER COVERAGE DASHBOARD (PHASE 2)
  // =========================================================
  router.get('/admin/curriculum/coverage', ...cmsGuard, (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || 'all').trim();
    const contentStatus = String(req.query.contentStatus || 'all').trim() as CoverageStatus | 'all';
    const difficulty = String(req.query.difficulty || 'all').trim().toLowerCase();
    const pubStatus = String(req.query.publicationStatus || 'all').trim().toLowerCase();
    const missingContent = String(req.query.missingContent || 'all').trim().toLowerCase();
    const instructorFilter = String(req.query.instructor || '').trim().toLowerCase();
    const recentDays = Number(req.query.recentDays || 0);
    const sort = String(req.query.sort || 'completeness_desc').trim();
    const limit = Math.min(250, Math.max(1, Number(req.query.limit || 25)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const { rows, incompleteCourses, summary } = computeAllTechnologyCoverage();
    const cutoffIso = recentDays > 0 ? new Date(Date.now() - recentDays * 86400_000).toISOString() : '';

    let filtered = rows.filter((r) => {
      if (category && category !== 'all' && r.categoryId !== category && r.categoryName.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (contentStatus && contentStatus !== 'all' && r.calculatedStatus !== contentStatus) {
        return false;
      }
      if (difficulty && difficulty !== 'all' && r.difficulty.toLowerCase() !== difficulty) {
        return false;
      }
      if (pubStatus === 'published' && r.publishedCourses === 0) return false;
      if (pubStatus === 'unpublished' && r.publishedCourses > 0) return false;
      if (missingContent === 'no_courses' && r.totalCourses > 0) return false;
      if (missingContent === 'no_exercises' && r.exercisesCount > 0) return false;
      if (missingContent === 'no_quizzes' && r.quizzesCount > 0) return false;
      if (missingContent === 'no_projects' && r.projectsCount > 0) return false;
      if (missingContent === 'qa_issues' && r.qaIssuesCount === 0) return false;
      if (instructorFilter && !r.assignedInstructors.some((n) => n.toLowerCase().includes(instructorFilter))) {
        return false;
      }
      if (cutoffIso && (!r.lastUpdatedAt || r.lastUpdatedAt < cutoffIso)) {
        return false;
      }
      if (q) {
        const hay = `${r.name} ${r.slug} ${r.categoryName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      if (sort === 'completeness_asc') return a.completenessScore - b.completenessScore || a.name.localeCompare(b.name);
      if (sort === 'name_asc') return a.name.localeCompare(b.name);
      if (sort === 'lessons_desc') return b.publishedLessons - a.publishedLessons || a.name.localeCompare(b.name);
      if (sort === 'recent_desc') return (b.lastUpdatedAt || '').localeCompare(a.lastUpdatedAt || '');
      return b.completenessScore - a.completenessScore || b.publishedLessons - a.publishedLessons || a.name.localeCompare(b.name);
    });

    const categories = db.prepare(`SELECT id, name, slug FROM categories ORDER BY sort_order ASC, name ASC`).all();

    res.json({
      summary,
      categories,
      incompleteCourses: incompleteCourses.slice(0, 40),
      totalFiltered: filtered.length,
      technologies: filtered.slice(offset, offset + limit),
      policy: getCompletenessPolicy(),
    });
  });

  router.get('/admin/curriculum/technologies/:idOrSlug/report', ...cmsGuard, (req, res) => {
    const report = getTechnologyDetailedReport(String(req.params.idOrSlug));
    if (!report) return res.status(404).json({ error: 'Technology not found.' });
    res.json(report);
  });

  // =========================================================
  // 2. CONFIGURABLE COMPLETENESS RULES (PHASE 3)
  // =========================================================
  router.get('/admin/curriculum/completeness-rules', ...cmsGuard, (_req, res) => {
    res.json({ policy: getCompletenessPolicy() });
  });

  router.patch('/admin/curriculum/completeness-rules', ...adminGuard, (req: AuthenticatedRequest, res) => {
    const policy = updateCompletenessPolicy(req.user!.id, {
      config: req.body?.config,
      requireIndependentReview: req.body?.requireIndependentReview,
      aiDailyGenerationLimit: req.body?.aiDailyGenerationLimit,
    });
    recordAuditLog(req.user!.id, 'cms.completeness_policy_updated', 'completeness_rules', '1', {
      requireIndependentReview: policy.requireIndependentReview,
      aiDailyGenerationLimit: policy.aiDailyGenerationLimit,
      substantialThreshold: policy.config.technologySubstantialThreshold,
    });
    res.json({ ok: true, policy });
  });

  router.get('/admin/curriculum/completeness/course/:courseId', ...cmsGuard, (req, res) => {
    const evaluation = evaluateCourseCompleteness(String(req.params.courseId));
    if (!evaluation) return res.status(404).json({ error: 'Course not found.' });
    res.json({ evaluation });
  });

  router.get('/admin/curriculum/completeness/path/:pathId', ...cmsGuard, (req, res) => {
    const evaluation = evaluateLearningPathCompleteness(String(req.params.pathId));
    if (!evaluation) return res.status(404).json({ error: 'Learning path not found.' });
    res.json({ evaluation });
  });

  // =========================================================
  // 3. BLUEPRINTS MANAGEMENT (PHASE 4 & 12)
  // =========================================================
  router.get('/admin/curriculum/blueprints', ...cmsGuard, (req, res) => {
    const techId = String(req.query.technologyId || '').trim();
    const q = String(req.query.q || '').trim().toLowerCase();
    const rows = db
      .prepare(
        `SELECT b.*, t.name as technology_name, t.slug as technology_slug, c.name as category_name
         FROM curriculum_blueprints b
         JOIN technologies t ON t.id = b.technology_id
         LEFT JOIN categories c ON c.id = b.category_id
         WHERE (? = '' OR b.technology_id = ?)
         ORDER BY t.sort_order ASC, t.name ASC`
      )
      .all(techId, techId) as Array<Record<string, unknown>>;

    const mapped = rows
      .filter((r) => !q || `${r.title} ${r.technology_name} ${r.category_name}`.toLowerCase().includes(q))
      .map((r) => ({
        ...r,
        modules: parseJsonSafe<unknown[]>(String(r.module_outline_json || '[]'), []),
      }));
    res.json({ blueprints: mapped.slice(0, 250), totalCount: mapped.length });
  });

  router.post('/admin/curriculum/blueprints/:id/instantiate-draft', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const bp = db.prepare(`SELECT * FROM curriculum_blueprints WHERE id = ?`).get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!bp) return res.status(404).json({ error: 'Blueprint not found.' });
    const tech = db.prepare(`SELECT * FROM technologies WHERE id = ?`).get(String(bp.technology_id)) as
      | Record<string, unknown>
      | undefined;
    if (!tech) return res.status(404).json({ error: 'Technology not found.' });

    const modules = parseJsonSafe<Array<{ title: string; summary?: string; topics?: string[] }>>(
      String(bp.module_outline_json || '[]'),
      []
    );
    const now = new Date().toISOString();
    const courseId = `crs_bp_${String(tech.slug).replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}`;
    const courseSlug = `${String(tech.slug)}-blueprint-course-${Date.now().toString().slice(-4)}`;

    db.exec('BEGIN');
    try {
      db.prepare(
        `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, prerequisites_json, difficulty, estimated_hours, instructor_id, assigned_instructor_id, thumbnail_url, is_published, status, workflow_status, qa_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 16, ?, ?, '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', 0, 'draft', 'draft', 'pending', ?, ?)`
      ).run(
        courseId,
        String(tech.category_id),
        String(tech.id),
        `${String(tech.name)} Complete Track (Draft)`,
        courseSlug,
        String(bp.summary || tech.description),
        JSON.stringify([`Master core ${String(tech.name)} concepts across ${modules.length} structured modules.`]),
        JSON.stringify(['None required for beginner tracks']),
        String(tech.difficulty || 'Beginner'),
        req.user!.id,
        req.user!.id,
        now,
        now
      );

      modules.forEach((mod, mIdx) => {
        const modId = `mod_bp_${courseId}_${mIdx + 1}`;
        db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
          modId,
          courseId,
          mod.title,
          mod.summary || mod.title,
          mIdx + 1
        );
        (mod.topics || []).forEach((tp, tIdx) => {
          const tpSlug = `${tp.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}-${mIdx}-${tIdx}`;
          db.prepare(
            `INSERT INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(`top_bp_${courseId}_${mIdx}_${tIdx}`, courseId, modId, tp, tpSlug, tp, tIdx + 1, now);
        });
      });

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: (err as Error).message });
    }

    recordAuditLog(req.user!.id, 'cms.blueprint_instantiated_draft', 'course', courseId, { blueprintId: bp.id });
    res.status(201).json({ ok: true, courseId, slug: courseSlug, workflowStatus: 'draft' });
  });

  // =========================================================
  // 4. AI CONTENT STUDIO & BATCH ENGINE (PHASES 5 & 6)
  // =========================================================
  router.get('/admin/curriculum/ai-studio/quota', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const quota = getStudioQuotaStatus(req.user!.id);
    res.json({
      quota,
      aiConfigured: quota.aiConfigured,
      modelName: quota.modelName,
      aiStatus: quota.aiStatus || getAiHealthState(),
    });
  });

  router.post('/admin/ai/health-check', ...cmsGuard, async (req: AuthenticatedRequest, res) => {
    const modelName = getActiveStudioModel();
    const result = await probeGeminiHealthOnce(modelName);
    recordAuditLog(req.user!.id, 'ai.health_probe', 'ai_service', modelName, {
      ok: result.ok,
      status: result.health.status,
      code: result.health.lastErrorCode || 'OK',
    });
    res.json(result);
  });

  router.post('/admin/curriculum/code-examples/validate', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const report = auditAllCurriculumCodeExamples();
    recordAuditLog(req.user!.id, 'cms.code_examples_audited', 'curriculum', 'all', {
      totalChecked: report.summary.totalChecked,
      validCount: report.summary.validCount,
      warningsCount: report.summary.warningsCount,
      failedCount: report.summary.failedCount,
    });
    res.json(report);
  });

  router.post('/admin/curriculum/ai-studio/generate', ...cmsGuard, async (req: AuthenticatedRequest, res) => {
    try {
      const technologyId = String(req.body?.technologyId || '').trim();
      const targetType = String(req.body?.targetType || 'full_lesson') as StudioTargetType;
      const difficultyMode = String(req.body?.difficultyMode || 'Beginner') as StudioMode;
      if (!technologyId) {
        return res.status(400).json({ error: 'Select a target technology before generating content.' });
      }

      const result = await generateStudioDraftContent({
        user: req.user!,
        technologyId,
        learningPathId: req.body?.learningPathId ? String(req.body.learningPathId) : undefined,
        courseId: req.body?.courseId ? String(req.body.courseId) : undefined,
        moduleId: req.body?.moduleId ? String(req.body.moduleId) : undefined,
        topicName: req.body?.topicName ? String(req.body.topicName) : undefined,
        lessonTitle: req.body?.lessonTitle ? String(req.body.lessonTitle) : undefined,
        targetType,
        difficultyMode,
        targetAudience: req.body?.targetAudience ? String(req.body.targetAudience) : undefined,
        count: req.body?.count ? Number(req.body.count) : 3,
        learningObjectives: Array.isArray(req.body?.learningObjectives) ? req.body.learningObjectives.map(String) : undefined,
        regenerateSection: req.body?.regenerateSection ? String(req.body.regenerateSection) : undefined,
        existingDraftJson:
          typeof req.body?.existingDraftJson === 'object' && req.body.existingDraftJson
            ? (req.body.existingDraftJson as Record<string, unknown>)
            : undefined,
      });

      res.json(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number; code?: string };
      res.status(e.statusCode || 500).json({ error: e.message || 'AI Studio generation failed.', code: e.code });
    }
  });

  router.post('/admin/curriculum/ai-studio/save-draft', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    try {
      const technologyId = String(req.body?.technologyId || '').trim();
      const targetType = String(req.body?.targetType || 'full_lesson') as StudioTargetType;
      const draft = req.body?.draft;
      if (!technologyId || !draft || typeof draft !== 'object') {
        return res.status(400).json({ error: 'technologyId and draft payload are required.' });
      }
      const saved = saveAiDraftToCurriculum({
        actorId: req.user!.id,
        technologyId,
        courseId: req.body?.courseId ? String(req.body.courseId) : undefined,
        moduleId: req.body?.moduleId ? String(req.body.moduleId) : undefined,
        targetType,
        draft: draft as Record<string, unknown>,
      });
      res.status(201).json({ ok: true, saved });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get('/admin/curriculum/ai-jobs', ...cmsGuard, (_req, res) => {
    res.json({ jobs: listBatchJobs() });
  });

  router.get('/admin/curriculum/ai-jobs/:jobId', ...cmsGuard, (req, res) => {
    const detail = getBatchJobDetail(String(req.params.jobId));
    if (!detail) return res.status(404).json({ error: 'Batch generation job not found.' });
    res.json(detail);
  });

  router.post('/admin/curriculum/ai-jobs', ...cmsGuard, async (req: AuthenticatedRequest, res) => {
    try {
      const technologyIds = Array.isArray(req.body?.technologyIds) ? req.body.technologyIds.map(String) : [];
      if (technologyIds.length === 0) {
        return res.status(400).json({ error: 'Select at least one technology for batch generation.' });
      }
      const created = createBatchGenerationJob({
        userId: req.user!.id,
        technologyIds,
        difficultyMode: (req.body?.difficultyMode || 'Beginner') as StudioMode,
        targetAudience: req.body?.targetAudience ? String(req.body.targetAudience) : '',
        maxLessonsPerTech: Number(req.body?.maxLessonsPerTech || 4),
      });

      const runNow = req.body?.startImmediately !== false;
      if (runNow && created?.job) {
        const progressed = await processBatchGenerationJob(
          String(created.job.id),
          req.user!,
          Math.min(5, Number(req.body?.batchSliceSize || 3))
        );
        return res.status(201).json(progressed);
      }
      return res.status(201).json(created);
    } catch (err) {
      const e = err as Error & { statusCode?: number; code?: string; existingJobId?: string };
      res.status(e.statusCode || 400).json({ error: e.message, code: e.code, existingJobId: e.existingJobId });
    }
  });

  router.post('/admin/curriculum/ai-jobs/:jobId/resume', ...cmsGuard, async (req: AuthenticatedRequest, res) => {
    try {
      const detail = await processBatchGenerationJob(
        String(req.params.jobId),
        req.user!,
        Math.min(10, Number(req.body?.batchSliceSize || 4))
      );
      res.json(detail);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/admin/curriculum/ai-jobs/:jobId/pause', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    try {
      const detail = pauseBatchGenerationJob(String(req.params.jobId), req.user!.id);
      res.json(detail);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/admin/curriculum/ai-jobs/:jobId/cancel', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    try {
      const detail = cancelBatchGenerationJob(String(req.params.jobId), req.user!.id);
      res.json(detail);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.post('/admin/curriculum/ai-jobs/:jobId/retry', ...cmsGuard, async (req: AuthenticatedRequest, res) => {
    try {
      const detail = await retryBatchGenerationJob(
        String(req.params.jobId),
        req.user!,
        Math.min(10, Number(req.body?.batchSliceSize || 4))
      );
      res.json(detail);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // =========================================================
  // 5. AUTOMATED CONTENT QA ENGINE (PHASE 7)
  // =========================================================
  router.post('/admin/curriculum/qa/run', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const entityType = String(req.body?.entityType || 'lesson');
    const entityId = String(req.body?.entityId || '').trim();
    if (!entityId) return res.status(400).json({ error: 'entityId is required.' });

    const result =
      entityType === 'course'
        ? runCourseQualityCheck(entityId, req.user!.id)
        : runLessonQualityCheck(entityId, req.user!.id);

    if (!result) return res.status(404).json({ error: `${entityType} not found.` });
    recordAuditLog(req.user!.id, 'cms.qa_check_executed', entityType, entityId, {
      status: result.validationStatus,
      score: result.score,
    });
    res.json({ report: result });
  });

  router.get('/admin/curriculum/qa/:entityType/:entityId', ...cmsGuard, (req, res) => {
    const rows = db
      .prepare(
        `SELECT * FROM content_quality_checks WHERE entity_type = ? AND entity_id = ? ORDER BY checked_at DESC LIMIT 10`
      )
      .all(req.params.entityType, req.params.entityId) as Array<Record<string, unknown>>;

    res.json({
      reports: rows.map((r) => ({
        ...r,
        missingSections: parseJsonSafe<string[]>(String(r.missing_sections_json || '[]'), []),
        educationalWarnings: parseJsonSafe<string[]>(String(r.educational_warnings_json || '[]'), []),
        technicalWarnings: parseJsonSafe<string[]>(String(r.technical_warnings_json || '[]'), []),
        checksDetail: parseJsonSafe<unknown[]>(String(r.checks_detail_json || '[]'), []),
      })),
    });
  });

  // =========================================================
  // 6. INSTRUCTOR REVIEW WORKSPACE & WORKFLOW (PHASE 8)
  // =========================================================
  router.get('/admin/curriculum/review-queue', ...cmsGuard, (req, res) => {
    const statusFilter = String(req.query.status || 'all').trim();
    const entityTypeFilter = String(req.query.entityType || 'all').trim();
    const aiOnly = req.query.aiOnly === '1' || req.query.aiOnly === 'true';

    const courseItems = (
      db
        .prepare(
          `SELECT c.id, 'course' as entity_type, c.title, c.slug, c.workflow_status, c.status, c.qa_status,
                  c.is_ai_generated, c.completeness_score, c.review_notes, c.instructor_id as author_id,
                  c.assigned_instructor_id as assigned_reviewer_id, c.updated_at, c.created_at,
                  t.name as technology_name, u.full_name as author_name
           FROM courses c
           LEFT JOIN technologies t ON t.id = c.technology_id
           LEFT JOIN users u ON u.id = c.instructor_id`
        )
        .all() as Array<Record<string, unknown>>
    );

    const lessonItems = (
      db
        .prepare(
          `SELECT l.id, 'lesson' as entity_type, l.title, l.slug, l.workflow_status, l.status, l.qa_status,
                  l.is_ai_generated, l.review_notes, COALESCE(NULLIF(l.author_id,''), c.instructor_id) as author_id,
                  l.assigned_reviewer_id, l.updated_at, l.version,
                  c.title as course_title, t.name as technology_name,
                  u.full_name as author_name
           FROM lessons l
           JOIN courses c ON c.id = l.course_id
           LEFT JOIN technologies t ON t.id = c.technology_id
           LEFT JOIN users u ON u.id = COALESCE(NULLIF(l.author_id,''), c.instructor_id)`
        )
        .all() as Array<Record<string, unknown>>
    );

    const combined = [...courseItems, ...lessonItems].filter((item) => {
      if (entityTypeFilter !== 'all' && item.entity_type !== entityTypeFilter) return false;
      const wf = String(item.workflow_status || item.status || 'draft');
      if (statusFilter !== 'all' && wf !== statusFilter) return false;
      if (aiOnly && Number(item.is_ai_generated || 0) !== 1) return false;
      return true;
    });

    // Prioritize review/draft/failed QA items at the top
    const priorityRank = (s: string) => (s === 'review' ? 0 : s === 'draft' ? 1 : s === 'approved' ? 2 : 3);
    combined.sort((a, b) => {
      const pa = priorityRank(String(a.workflow_status || a.status));
      const pb = priorityRank(String(b.workflow_status || b.status));
      if (pa !== pb) return pa - pb;
      return String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
    });

    const reviewers = db
      .prepare(`SELECT id, full_name, email, role FROM users WHERE role IN ('admin', 'instructor') ORDER BY full_name ASC`)
      .all();

    res.json({
      items: combined.slice(0, 120),
      totalCount: combined.length,
      reviewers,
      policy: getCompletenessPolicy(),
    });
  });

  router.get('/admin/curriculum/review-history/:entityType/:entityId', ...cmsGuard, (req, res) => {
    const history = db
      .prepare(
        `SELECT h.*, a.full_name as actor_name, r.full_name as assigned_name
         FROM content_review_history h
         LEFT JOIN users a ON a.id = h.actor_id
         LEFT JOIN users r ON r.id = h.assigned_to_id
         WHERE h.entity_type = ? AND h.entity_id = ?
         ORDER BY h.created_at DESC`
      )
      .all(req.params.entityType, req.params.entityId);
    res.json({ history });
  });

  router.post('/admin/curriculum/review/:entityType/:entityId', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const entityType = String(req.params.entityType) as 'course' | 'lesson';
    const entityId = String(req.params.entityId);
    if (entityType !== 'course' && entityType !== 'lesson') {
      return res.status(400).json({ error: 'Review workflow supports course and lesson entities.' });
    }

    const action = String(req.body?.action || '').trim();
    const comment = String(req.body?.comment || '').trim();
    const assignedToId = String(req.body?.assignedReviewerId || '').trim();
    const validActions = ['submit', 'ai_review', 'assign_reviewer', 'request_revision', 'reject', 'approve', 'publish'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: `Invalid review action. Expected one of: ${validActions.join(', ')}` });
    }

    const table = entityType === 'course' ? 'courses' : 'lessons';
    const record = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(entityId) as Record<string, unknown> | undefined;
    if (!record) return res.status(404).json({ error: `${entityType} not found.` });

    const currentStatus = String(record.workflow_status || record.status || 'draft');
    const authorId = String(record.author_id || record.instructor_id || '');
    const policy = getCompletenessPolicy();

    // Independent review check when enabled by policy
    if (policy.requireIndependentReview && (action === 'approve' || action === 'publish')) {
      if (authorId && authorId === req.user!.id) {
        return res.status(403).json({
          code: 'INDEPENDENT_REVIEW_REQUIRED',
          error: 'Independent review policy is enabled: an author cannot self-approve or self-publish their own content.',
        });
      }
    }

    if (action === 'assign_reviewer') {
      if (!assignedToId) return res.status(400).json({ error: 'assignedReviewerId is required.' });
      const col = entityType === 'course' ? 'assigned_instructor_id' : 'assigned_reviewer_id';
      db.prepare(`UPDATE ${table} SET ${col} = ?, updated_at = ? WHERE id = ?`).run(
        assignedToId,
        new Date().toISOString(),
        entityId
      );
      db.prepare(
        `INSERT INTO content_review_history (id, entity_type, entity_id, from_status, to_status, action, actor_id, assigned_to_id, comment, created_at)
         VALUES (?, ?, ?, ?, ?, 'assign_reviewer', ?, ?, ?, ?)`
      ).run(
        `rvh_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        entityType,
        entityId,
        currentStatus,
        currentStatus,
        req.user!.id,
        assignedToId,
        comment || 'Reviewer assigned',
        new Date().toISOString()
      );
      notifyWithRealtime(assignedToId, 'assignment', 'Curriculum Review Assigned', `Review requested for "${String(record.title)}".`, '/admin');
      return res.json({ ok: true, workflowStatus: currentStatus });
    }

    if (action === 'ai_review') {
      const qa = entityType === 'course' ? runCourseQualityCheck(entityId, req.user!.id) : runLessonQualityCheck(entityId, req.user!.id);
      const nextWf = currentStatus === 'draft' ? 'review' : currentStatus;
      db.prepare(`UPDATE ${table} SET workflow_status = ?, updated_at = ? WHERE id = ?`).run(
        nextWf,
        new Date().toISOString(),
        entityId
      );
      db.prepare(
        `INSERT INTO content_review_history (id, entity_type, entity_id, from_status, to_status, action, actor_id, comment, created_at)
         VALUES (?, ?, ?, ?, ?, 'ai_review', ?, ?, ?)`
      ).run(
        `rvh_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        entityType,
        entityId,
        currentStatus,
        nextWf,
        req.user!.id,
        `Automated QA check: ${qa?.validationStatus.toUpperCase()} (${qa?.score}%)`,
        new Date().toISOString()
      );
      return res.json({ ok: true, workflowStatus: nextWf, qa });
    }

    // Quality gate before publication!
    if (action === 'publish') {
      const qa = entityType === 'course' ? runCourseQualityCheck(entityId, req.user!.id) : runLessonQualityCheck(entityId, req.user!.id);
      if (qa && qa.validationStatus === 'fail') {
        return res.status(400).json({
          code: 'QA_GATE_FAILED',
          error: 'Content failed automated quality checks and cannot be published until critical issues are fixed.',
          qa,
        });
      }
    }

    const nextWorkflow =
      action === 'submit'
        ? 'review'
        : action === 'request_revision' || action === 'reject'
          ? 'draft'
          : action === 'approve'
            ? 'approved'
            : 'published';

    const nextStatus = nextWorkflow === 'published' ? 'published' : 'draft';
    const now = new Date().toISOString();

    // Create revision snapshot before state-changing approval or publication
    if (nextWorkflow === 'approved' || nextWorkflow === 'published') {
      createContentRevisionSnapshot(
        entityType,
        entityId,
        req.user!.id,
        `Snapshot on ${action}${comment ? `: ${comment}` : ''}`
      );
    }

    if (entityType === 'course') {
      db.prepare(
        `UPDATE courses
         SET workflow_status = ?, status = ?, is_published = ?, review_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(nextWorkflow, nextStatus, nextStatus === 'published' ? 1 : 0, comment, req.user!.id, now, now, entityId);
      evaluateCourseCompleteness(entityId);
    } else {
      db.prepare(
        `UPDATE lessons
         SET workflow_status = ?, status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`
      ).run(nextWorkflow, nextStatus, comment, req.user!.id, now, now, entityId);
    }

    db.prepare(
      `INSERT INTO content_review_history (id, entity_type, entity_id, from_status, to_status, action, actor_id, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `rvh_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      entityType,
      entityId,
      currentStatus,
      nextWorkflow,
      action,
      req.user!.id,
      comment,
      now
    );

    recordAuditLog(req.user!.id, `cms.review_${action}`, entityType, entityId, {
      fromStatus: currentStatus,
      toStatus: nextWorkflow,
      comment,
    });

    res.json({ ok: true, workflowStatus: nextWorkflow, status: nextStatus });
  });

  // =========================================================
  // 7. CONTENT VERSIONING & ROLLBACK (PHASE 9)
  // =========================================================
  router.post('/admin/curriculum/revisions/:revisionId/restore', ...adminGuard, (req: AuthenticatedRequest, res) => {
    try {
      const result = restoreContentRevision(String(req.params.revisionId), req.user!.id);
      recordAuditLog(req.user!.id, 'cms.revision_restored', result.entityType, result.entityId, result);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.get('/admin/curriculum/revisions/:entityType/:entityId', ...cmsGuard, (req, res) => {
    const revisions = listContentRevisions(String(req.params.entityType), String(req.params.entityId));
    res.json({ revisions });
  });

  router.post('/admin/curriculum/revisions/:entityType/:entityId', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const entityType = String(req.params.entityType) as 'course' | 'lesson' | 'assessment' | 'exercise';
    const snap = createContentRevisionSnapshot(
      entityType,
      String(req.params.entityId),
      req.user!.id,
      String(req.body?.changeSummary || 'Manual instructor snapshot')
    );
    if (!snap) return res.status(404).json({ error: 'Target entity not found.' });
    res.status(201).json({ ok: true, revision: snap });
  });

  // =========================================================
  // 8. REPORTING & EXPORTS (PHASE 13)
  // =========================================================
  router.get('/admin/curriculum/reports/summary', ...cmsGuard, (_req, res) => {
    const { rows, summary } = computeAllTechnologyCoverage();

    const instructorRows = db
      .prepare(
        `SELECT u.id, u.full_name, u.email, u.role,
                (SELECT COUNT(*) FROM courses c WHERE c.instructor_id = u.id OR c.assigned_instructor_id = u.id) as courses_owned,
                (SELECT COUNT(*) FROM lessons l WHERE l.author_id = u.id) as lessons_authored,
                (SELECT COUNT(*) FROM lessons l WHERE l.author_id = u.id AND l.is_ai_generated = 1) as ai_assisted_lessons,
                (SELECT COUNT(*) FROM lessons l WHERE l.reviewed_by = u.id) as lessons_reviewed,
                (SELECT COUNT(*) FROM content_review_history h WHERE h.actor_id = u.id) as review_actions
         FROM users u
         WHERE u.role IN ('admin', 'instructor')
         ORDER BY courses_owned DESC, lessons_authored DESC`
      )
      .all();

    const qaSummary = db
      .prepare(
        `SELECT validation_status, COUNT(*) as count
         FROM content_quality_checks
         GROUP BY validation_status`
      )
      .all();

    res.json({
      generatedAt: new Date().toISOString(),
      platformSummary: summary,
      topCompleteTechnologies: [...rows].sort((a, b) => b.completenessScore - a.completenessScore).slice(0, 15),
      needingAttention: rows.filter((r) => r.calculatedStatus === 'needs_improvement' || r.calculatedStatus === 'content_review').slice(0, 20),
      instructors: instructorRows,
      qaSummary,
    });
  });

  router.get('/admin/curriculum/reports/export', ...cmsGuard, (req, res) => {
    const format = String(req.query.format || 'csv').toLowerCase();
    const { rows, summary } = computeAllTechnologyCoverage();
    if (format === 'json') {
      return res.json({ generatedAt: new Date().toISOString(), summary, technologies: rows });
    }

    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'technology_id',
      'name',
      'category',
      'difficulty',
      'calculated_status',
      'completeness_score',
      'published_courses',
      'draft_courses',
      'published_lessons',
      'draft_lessons',
      'code_examples',
      'exercises',
      'quizzes',
      'projects',
      'qa_issues',
      'last_updated_at',
    ].join(',');
    const lines = rows.map((r) =>
      [
        esc(r.technologyId),
        esc(r.name),
        esc(r.categoryName),
        esc(r.difficulty),
        esc(r.calculatedStatus),
        r.completenessScore,
        r.publishedCourses,
        r.draftCourses,
        r.publishedLessons,
        r.draftLessons,
        r.codeExamplesCount,
        r.exercisesCount,
        r.quizzesCount,
        r.projectsCount,
        r.qaIssuesCount,
        esc(r.lastUpdatedAt),
      ].join(',')
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="braincode-technology-coverage-report.csv"');
    return res.send([header, ...lines].join('\n'));
  });

  // =========================================================
  // 9. UPGRADED STRUCTURED PACKAGE IMPORT & DRY RUN (PHASE 10)
  // =========================================================
  function inspectStructuredPackage(payload: Record<string, unknown>, allowOverwritePublished: boolean, isAdmin: boolean) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const conflicts: string[] = [];

    const courses = Array.isArray(payload.courses) ? (payload.courses as Array<Record<string, unknown>>) : [];
    const learningPaths = Array.isArray(payload.learningPaths) ? (payload.learningPaths as Array<Record<string, unknown>>) : [];

    let modulesCount = 0;
    let topicsCount = 0;
    let lessonsCount = 0;
    let examplesCount = 0;
    let exercisesCount = 0;
    let quizzesCount = 0;

    const seenCourseSlugs = new Set<string>();

    for (const crs of courses) {
      const title = String(crs.title || '').trim();
      const slug = String(crs.slug || '').trim();
      const catId = String(crs.category_id || crs.categoryId || '');
      const techId = String(crs.technology_id || crs.technologyId || '');

      if (!title || !slug) errors.push(`Course entry is missing required title or slug.`);
      if (slug && seenCourseSlugs.has(slug)) errors.push(`Duplicate course slug inside package: "${slug}".`);
      seenCourseSlugs.add(slug);

      if (!catId || !db.prepare(`SELECT 1 FROM categories WHERE id = ?`).get(catId)) {
        errors.push(`Course "${title || slug}" references non-existent category_id "${catId}".`);
      }
      if (!techId || !db.prepare(`SELECT 1 FROM technologies WHERE id = ?`).get(techId)) {
        errors.push(`Course "${title || slug}" references non-existent technology_id "${techId}".`);
      }

      const existing = slug
        ? (db.prepare(`SELECT id, status, is_published FROM courses WHERE slug = ?`).get(slug) as
            | { id: string; status: string; is_published: number }
            | undefined)
        : undefined;
      if (existing && (existing.status === 'published' || existing.is_published === 1)) {
        if (!allowOverwritePublished || !isAdmin) {
          conflicts.push(`Published course "${slug}" exists. Published records cannot be overwritten without explicit admin authorization.`);
        } else {
          warnings.push(`Published course "${slug}" will be snapshotted and updated.`);
        }
      }

      const mods = Array.isArray(crs.modules) ? (crs.modules as Array<Record<string, unknown>>) : [];
      modulesCount += mods.length;
      for (const m of mods) {
        if (!String(m.title || '').trim()) errors.push(`Course "${title}" has a module missing title.`);
        const tps = Array.isArray(m.topics) ? m.topics : [];
        topicsCount += tps.length;
        const less = Array.isArray(m.lessons) ? (m.lessons as Array<Record<string, unknown>>) : [];
        lessonsCount += less.length;
        for (const l of less) {
          if (!String(l.title || '').trim()) errors.push(`Module "${String(m.title)}" has a lesson missing title.`);
          examplesCount += Array.isArray(l.codeExamples) ? l.codeExamples.length : 0;
          exercisesCount += Array.isArray(l.exercises) ? l.exercises.length : 0;
        }
      }
      quizzesCount += Array.isArray(crs.assessments) ? crs.assessments.length : 0;
    }

    for (const lp of learningPaths) {
      if (!String(lp.title || '').trim() || !String(lp.slug || '').trim()) {
        errors.push('Learning path entry requires title and slug.');
      }
    }

    return {
      valid: errors.length === 0 && conflicts.length === 0,
      errors,
      conflicts,
      warnings,
      summary: {
        learningPaths: learningPaths.length,
        courses: courses.length,
        modules: modulesCount,
        topics: topicsCount,
        lessons: lessonsCount,
        codeExamples: examplesCount,
        exercises: exercisesCount,
        assessments: quizzesCount,
      },
    };
  }

  router.post('/admin/curriculum/package/preview', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const data = req.body?.data;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Provide a structured JSON `data` package to preview.' });
    }
    const allowOverwrite = Boolean(req.body?.allowOverwritePublished);
    const inspection = inspectStructuredPackage(data as Record<string, unknown>, allowOverwrite, req.user!.role === 'admin');
    res.json(inspection);
  });

  router.post('/admin/curriculum/package/import', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const data = req.body?.data;
    const confirmed = Boolean(req.body?.confirm);
    const allowOverwritePublished = Boolean(req.body?.allowOverwritePublished);
    const publishImmediately = Boolean(req.body?.publishImmediately) && req.user!.role === 'admin';

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Provide structured JSON `data`.' });
    }
    if (!confirmed) {
      return res.status(400).json({ error: 'Explicit import confirmation (`confirm: true`) is required after dry-run inspection.' });
    }

    const inspection = inspectStructuredPackage(data as Record<string, unknown>, allowOverwritePublished, req.user!.role === 'admin');
    if (!inspection.valid) {
      return res.status(400).json({
        error: inspection.conflicts[0] || inspection.errors[0] || 'Package validation failed.',
        inspection,
      });
    }

    const payload = data as {
      courses?: Array<Record<string, unknown>>;
      learningPaths?: Array<Record<string, unknown>>;
    };
    const now = new Date().toISOString();
    const targetStatus = publishImmediately ? 'published' : 'draft';

    try {
      db.exec('BEGIN');
      for (const crs of payload.courses || []) {
        const slug = String(crs.slug).trim();
        const existing = db.prepare(`SELECT id, status, is_published FROM courses WHERE slug = ?`).get(slug) as
          | { id: string; status: string; is_published: number }
          | undefined;
        if (existing && (existing.status === 'published' || existing.is_published === 1)) {
          createContentRevisionSnapshot('course', existing.id, req.user!.id, 'Pre-bulk-import snapshot');
        }
        const courseId = existing?.id || String(crs.id || `crs_pkg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`);
        db.prepare(
          `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, prerequisites_json, difficulty, estimated_hours, instructor_id, assigned_instructor_id, thumbnail_url, is_published, status, workflow_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', ?, ?, ?, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET title = excluded.title, description = excluded.description, objectives_json = excluded.objectives_json, updated_at = excluded.updated_at`
        ).run(
          courseId,
          String(crs.category_id || crs.categoryId),
          String(crs.technology_id || crs.technologyId),
          String(crs.title).trim(),
          slug,
          String(crs.description || String(crs.title)),
          JSON.stringify(Array.isArray(crs.objectives) ? crs.objectives : []),
          JSON.stringify(Array.isArray(crs.prerequisites) ? crs.prerequisites : []),
          String(crs.difficulty || 'Beginner'),
          Math.max(1, Number(crs.estimated_hours || 8)),
          req.user!.id,
          req.user!.id,
          targetStatus === 'published' ? 1 : 0,
          targetStatus,
          targetStatus,
          now,
          now
        );

        const mods = Array.isArray(crs.modules) ? (crs.modules as Array<Record<string, unknown>>) : [];
        mods.forEach((m, mIdx) => {
          const modId = String(m.id || `mod_pkg_${courseId}_${mIdx}`);
          db.prepare(
            `INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET title = excluded.title, topic = excluded.topic`
          ).run(modId, courseId, String(m.title).trim(), String(m.topic || m.title), Number(m.sort_order ?? mIdx + 1));

          const tps = Array.isArray(m.topics) ? m.topics : [];
          tps.forEach((tp, tIdx) => {
            const tpTitle = typeof tp === 'string' ? tp : String((tp as Record<string, unknown>).title || '');
            if (!tpTitle) return;
            db.prepare(
              `INSERT OR IGNORE INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              `top_pkg_${modId}_${tIdx}`,
              courseId,
              modId,
              tpTitle,
              `${tpTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tIdx}`,
              tpTitle,
              tIdx + 1,
              now
            );
          });

          const less = Array.isArray(m.lessons) ? (m.lessons as Array<Record<string, unknown>>) : [];
          less.forEach((l, lIdx) => {
            const lesId = String(l.id || `les_pkg_${modId}_${lIdx}`);
            const lesTitle = String(l.title).trim();
            db.prepare(
              `INSERT INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, code_example, language, access_tier, duration_minutes, status, workflow_status, author_id, version, sort_order, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
               ON CONFLICT(id) DO UPDATE SET title = excluded.title, content_markdown = excluded.content_markdown, version = lessons.version + 1, updated_at = excluded.updated_at`
            ).run(
              lesId,
              modId,
              courseId,
              lesTitle,
              String(l.slug || `${lesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${lIdx}`),
              String(l.topic_name || lesTitle),
              String(l.summary || lesTitle),
              String(l.content_markdown || ''),
              String(l.code_example || ''),
              String(l.language || 'javascript'),
              l.access_tier === 'premium' ? 'premium' : 'free',
              Math.max(3, Number(l.duration_minutes || 15)),
              targetStatus,
              targetStatus,
              req.user!.id,
              Number(l.sort_order ?? lIdx + 1),
              now
            );

            const codeExs = Array.isArray(l.codeExamples) ? (l.codeExamples as Array<Record<string, unknown>>) : [];
            codeExs.forEach((ce, cIdx) => {
              db.prepare(
                `INSERT OR IGNORE INTO code_examples (id, lesson_id, title, description, language, code, expected_output, is_runnable, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
              ).run(
                `ce_pkg_${lesId}_${cIdx}`,
                lesId,
                String(ce.title || `Example ${cIdx + 1}`),
                String(ce.description || ''),
                String(ce.language || l.language || 'javascript'),
                String(ce.code || ''),
                String(ce.expected_output || ''),
                cIdx + 1
              );
            });

            const exs = Array.isArray(l.exercises) ? (l.exercises as Array<Record<string, unknown>>) : [];
            exs.forEach((ex, eIdx) => {
              db.prepare(
                `INSERT OR IGNORE INTO exercises (id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty, prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation, hint_text, xp_reward, sort_order, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{"mode":"exact_case_insensitive"}', ?, ?, 25, ?, ?)`
              ).run(
                `ex_pkg_${lesId}_${eIdx}`,
                courseId,
                modId,
                lesId,
                String(crs.technology_id || crs.technologyId),
                String(ex.title || `Exercise ${eIdx + 1}`),
                String(ex.exercise_type || 'multiple_choice'),
                String(ex.difficulty || 'Beginner'),
                String(ex.prompt || ''),
                String(ex.starter_code || ''),
                JSON.stringify(Array.isArray(ex.options) ? ex.options : []),
                String(ex.correct_answer || ''),
                String(ex.explanation || ''),
                String(ex.hint_text || ''),
                eIdx + 1,
                now
              );
            });
          });
        });

        const asms = Array.isArray(crs.assessments) ? (crs.assessments as Array<Record<string, unknown>>) : [];
        asms.forEach((a, aIdx) => {
          db.prepare(
            `INSERT OR IGNORE INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, created_at)
             VALUES (?, ?, '', ?, ?, 'untimed', 0, 80, ?, 70, ?)`
          ).run(
            String(a.id || `asm_pkg_${courseId}_${aIdx}`),
            courseId,
            String(a.title || `Course Quiz ${aIdx + 1}`),
            String(a.type || 'quiz'),
            JSON.stringify(Array.isArray(a.questions) ? a.questions : []),
            now
          );
        });
      }

      for (const lp of payload.learningPaths || []) {
        const lpSlug = String(lp.slug).trim();
        db.prepare(
          `INSERT INTO learning_paths (id, title, slug, description, difficulty, estimated_hours, target_role, course_ids_json, prerequisites_json, objectives_json, milestones_json, is_published, workflow_status, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(slug) DO UPDATE SET title = excluded.title, description = excluded.description, course_ids_json = excluded.course_ids_json, updated_at = excluded.updated_at`
        ).run(
          String(lp.id || `path_pkg_${Date.now()}`),
          String(lp.title).trim(),
          lpSlug,
          String(lp.description || ''),
          String(lp.difficulty || 'Beginner'),
          Math.max(1, Number(lp.estimated_hours || 20)),
          String(lp.target_role || ''),
          JSON.stringify(Array.isArray(lp.course_ids) ? lp.course_ids : []),
          JSON.stringify(Array.isArray(lp.prerequisites) ? lp.prerequisites : []),
          JSON.stringify(Array.isArray(lp.objectives) ? lp.objectives : []),
          JSON.stringify(Array.isArray(lp.milestones) ? lp.milestones : []),
          targetStatus === 'published' ? 1 : 0,
          targetStatus,
          now
        );
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: `Atomic import rolled back: ${(err as Error).message}` });
    }

    recordAuditLog(req.user!.id, 'cms.package_imported', 'curriculum', 'package', {
      ...inspection.summary,
      status: targetStatus,
    });
    return res.status(201).json({ ok: true, status: targetStatus, summary: inspection.summary });
  });
}
