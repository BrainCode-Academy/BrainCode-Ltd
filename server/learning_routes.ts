import { type NextFunction, type Response, type Router } from 'express';
import { awardXpAndBadges, db, recordAuditLog, sanitizeUserPublic } from './db.ts';
import { evaluateEnhancedExerciseAnswer, recordLearnerCompetency } from './curriculum_intelligence.ts';
import { parseJsonSafe, requireRole, type AuthenticatedRequest, type AuthUser } from './security.ts';

interface HelperDeps {
  requireAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => unknown;
  notifyWithRealtime: (userId: string, type: string, title: string, body: string, link?: string) => unknown;
}

export function formatProjectTemplateRow(
  pt: Record<string, unknown>,
  progressMap?: Map<string, { checkedItems: string[]; notes: string; updatedAt: string }>
) {
  const prog = progressMap?.get(String(pt.id));
  return {
    ...pt,
    requirements: parseJsonSafe<string[]>(String(pt.requirements_json || '[]'), []),
    starter_files: parseJsonSafe<Record<string, string>>(String(pt.starter_files_json || '{}'), {}),
    deliverables: parseJsonSafe<string[]>(String(pt.deliverables_json || '[]'), []),
    learning_outcomes: parseJsonSafe<string[]>(String(pt.learning_outcomes_json || '[]'), []),
    milestones: parseJsonSafe<Array<{ step: number; title: string; summary: string }>>(
      String(pt.milestones_json || '[]'),
      []
    ),
    checklist: parseJsonSafe<string[]>(String(pt.checklist_json || '[]'), []),
    rubric: parseJsonSafe<Array<{ criterion: string; points: number }>>(String(pt.rubric_json || '[]'), []),
    submission_instructions: String(pt.submission_instructions || ''),
    myProgress: prog || null,
  };
}

export function evaluateExerciseAnswer(
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
): { isCorrect: boolean; score: number; status: 'graded' | 'pending_review'; feedback: string; partialCreditApplied?: boolean } {
  return evaluateEnhancedExerciseAnswer(ex, answerText, codeSubmitted);
}

export function checkCourseCertificateEligibility(courseId: string, userId: string): {
  eligible: boolean;
  completionRule: string;
  totalLessons: number;
  completedLessons: number;
  totalAssessments: number;
  passedAssessments: number;
  minCertificateScore: number;
  bestAssessmentScore: number | null;
  requirePracticalProjects: boolean;
  practicalCompleted: boolean;
  reason: string;
} {
  const course = db
    .prepare(`SELECT id, title, completion_rule, min_certificate_score, require_practical_projects FROM courses WHERE id = ?`)
    .get(courseId) as
    | {
        id: string;
        title: string;
        completion_rule?: string;
        min_certificate_score?: number;
        require_practical_projects?: number;
      }
    | undefined;
  if (!course) {
    return {
      eligible: false,
      completionRule: 'all_lessons',
      totalLessons: 0,
      completedLessons: 0,
      totalAssessments: 0,
      passedAssessments: 0,
      minCertificateScore: 0,
      bestAssessmentScore: null,
      requirePracticalProjects: false,
      practicalCompleted: false,
      reason: 'Course not found.',
    };
  }

  const rule = course.completion_rule || 'all_lessons';
  const minCertScore = Number(course.min_certificate_score || 0);
  const requirePracticalProjects = Boolean(course.require_practical_projects);

  const totalLessons = (
    db.prepare(`SELECT COUNT(*) as c FROM lessons WHERE course_id = ? AND status = 'published'`).get(course.id) as { c: number }
  ).c;
  const completedLessons = (
    db
      .prepare(
        `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.course_id = ? AND lp.user_id = ? AND lp.completed = 1 AND l.status = 'published'`
      )
      .get(course.id, userId) as { c: number }
  ).c;

  const assessments = db
    .prepare(`SELECT id, passing_score_pct FROM assessments WHERE course_id = ?`)
    .all(course.id) as Array<{ id: string; passing_score_pct: number }>;

  let passedAssessments = 0;
  let maxScoreSum = 0;
  let scoredAssessments = 0;
  for (const asm of assessments) {
    const passThreshold = Number(asm.passing_score_pct || 70);
    const bestAttempt = db
      .prepare(
        `SELECT MAX(CASE WHEN max_score > 0 THEN ROUND((score * 100.0) / max_score) ELSE 0 END) as best_pct
         FROM assessment_attempts WHERE assessment_id = ? AND user_id = ?`
      )
      .get(asm.id, userId) as { best_pct: number | null };
    if (bestAttempt?.best_pct !== null) {
      scoredAssessments += 1;
      maxScoreSum += Number(bestAttempt.best_pct);
      if (Number(bestAttempt.best_pct) >= passThreshold) {
        passedAssessments += 1;
      }
    }
  }
  const bestAssessmentScore = scoredAssessments > 0 ? Math.round(maxScoreSum / scoredAssessments) : null;

  const approvedPracticalCount = (
    db
      .prepare(
        `SELECT
          (SELECT COUNT(*) FROM assignment_submissions sub JOIN assignments a ON a.id = sub.assignment_id
           WHERE sub.user_id = ? AND a.course_id = ? AND sub.status IN ('approved', 'graded') AND sub.score >= 60) +
          (SELECT COUNT(*) FROM projects p JOIN project_templates pt ON pt.id = p.template_id
           WHERE p.owner_id = ? AND pt.course_id = ? AND p.status IN ('approved', 'submitted')) as cnt`
      )
      .get(userId, course.id, userId, course.id) as { cnt: number }
  ).cnt;
  const practicalCompleted = approvedPracticalCount > 0;

  if (totalLessons === 0 || completedLessons < totalLessons) {
    return {
      eligible: false,
      completionRule: rule,
      totalLessons,
      completedLessons,
      totalAssessments: assessments.length,
      passedAssessments,
      minCertificateScore: minCertScore,
      bestAssessmentScore,
      requirePracticalProjects,
      practicalCompleted,
      reason: `Complete all ${totalLessons} lessons in "${course.title}" (${completedLessons}/${totalLessons} completed).`,
    };
  }

  if ((rule === 'lessons_and_assessments' || rule === 'all_requirements') && assessments.length > 0 && passedAssessments < assessments.length) {
    return {
      eligible: false,
      completionRule: rule,
      totalLessons,
      completedLessons,
      totalAssessments: assessments.length,
      passedAssessments,
      minCertificateScore: minCertScore,
      bestAssessmentScore,
      requirePracticalProjects,
      practicalCompleted,
      reason: `Pass all ${assessments.length} required course assessment(s) before claiming your certificate (${passedAssessments}/${assessments.length} passed).`,
    };
  }

  if (minCertScore > 0 && assessments.length > 0 && (bestAssessmentScore === null || bestAssessmentScore < minCertScore)) {
    return {
      eligible: false,
      completionRule: rule,
      totalLessons,
      completedLessons,
      totalAssessments: assessments.length,
      passedAssessments,
      minCertificateScore: minCertScore,
      bestAssessmentScore,
      requirePracticalProjects,
      practicalCompleted,
      reason: `Achieve at least ${minCertScore}% average assessment mastery to unlock this certificate (current: ${bestAssessmentScore ?? 0}%).`,
    };
  }

  if (requirePracticalProjects && !practicalCompleted) {
    return {
      eligible: false,
      completionRule: rule,
      totalLessons,
      completedLessons,
      totalAssessments: assessments.length,
      passedAssessments,
      minCertificateScore: minCertScore,
      bestAssessmentScore,
      requirePracticalProjects,
      practicalCompleted,
      reason: 'Complete and submit at least one graded practical assignment or project for this course to unlock your certificate.',
    };
  }

  if (rule === 'all_requirements') {
    const courseAssignments = db.prepare(`SELECT id FROM assignments WHERE course_id = ?`).all(course.id) as Array<{ id: string }>;
    for (const asn of courseAssignments) {
      const sub = db
        .prepare(`SELECT status FROM assignment_submissions WHERE assignment_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1`)
        .get(asn.id, userId) as { status: string } | undefined;
      if (!sub || sub.status === 'needs_revision') {
        return {
          eligible: false,
          completionRule: rule,
          totalLessons,
          completedLessons,
          totalAssessments: assessments.length,
          passedAssessments,
          minCertificateScore: minCertScore,
          bestAssessmentScore,
          requirePracticalProjects,
          practicalCompleted,
          reason: 'Submit all required course assignments to unlock your certificate.',
        };
      }
    }
  }

  return {
    eligible: true,
    completionRule: rule,
    totalLessons,
    completedLessons,
    totalAssessments: assessments.length,
    passedAssessments,
    minCertificateScore: minCertScore,
    bestAssessmentScore,
    requirePracticalProjects,
    practicalCompleted,
    reason: 'All course completion requirements satisfied.',
  };
}

export function registerExtendedLearningRoutes(router: Router, { requireAuth, notifyWithRealtime }: HelperDeps) {
  // =========================================================
  // CAREER LEARNING PATHS & PATH CERTIFICATES
  // =========================================================
  router.get('/learning-paths', (req: AuthenticatedRequest, res) => {
    const rows = db.prepare(`SELECT * FROM learning_paths WHERE is_published = 1 ORDER BY estimated_hours ASC`).all() as Array<
      Record<string, unknown>
    >;
    const completedByCourse = new Map<string, number>();
    if (req.user) {
      const doneRows = db
        .prepare(
          `SELECT lp.course_id, COUNT(*) as cnt
           FROM lesson_progress lp
           JOIN lessons l ON l.id = lp.lesson_id
           WHERE lp.user_id = ? AND lp.completed = 1 AND l.status = 'published'
           GROUP BY lp.course_id`
        )
        .all(req.user.id) as Array<{ course_id: string; cnt: number }>;
      for (const r of doneRows) {
        completedByCourse.set(String(r.course_id), Number(r.cnt || 0));
      }
    }

    const paths = rows.map((p) => {
      const courseIds = parseJsonSafe<string[]>(String(p.course_ids_json || '[]'), []);
      const courses = courseIds.length
        ? (db
            .prepare(
              `SELECT c.id, c.title, c.slug, c.difficulty, c.estimated_hours,
                      (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons
               FROM courses c WHERE c.id IN (${courseIds.map(() => '?').join(',')})`
            )
            .all(...courseIds) as Array<Record<string, unknown>>)
        : [];
      let completedLessons = 0;
      let totalLessons = 0;
      for (const c of courses) {
        totalLessons += Number(c.total_lessons || 0);
        if (req.user) {
          completedLessons += completedByCourse.get(String(c.id)) || 0;
        }
      }

      return {
        ...p,
        course_ids: courseIds,
        prerequisites: parseJsonSafe<string[]>(String(p.prerequisites_json || '[]'), []),
        objectives: parseJsonSafe<string[]>(String(p.objectives_json || '[]'), []),
        milestones: parseJsonSafe<Array<{ step: number; title: string; summary: string }>>(String(p.milestones_json || '[]'), []),
        project_template_ids: parseJsonSafe<string[]>(String(p.project_template_ids_json || '[]'), []),
        courses,
        progress: req.user
          ? {
              completedLessons,
              totalLessons,
              percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            }
          : null,
      };
    });

    res.json({ learningPaths: paths });
  });

  router.get('/learning-paths/:slug', (req: AuthenticatedRequest, res) => {
    const p = db.prepare(`SELECT * FROM learning_paths WHERE slug = ?`).get(req.params.slug) as
      | (Record<string, unknown> & { id: string; course_ids_json: string; project_template_ids_json?: string })
      | undefined;
    if (!p) return res.status(404).json({ error: 'Learning path not found.' });

    const courseIds = parseJsonSafe<string[]>(p.course_ids_json || '[]', []);
    const courses = courseIds.length
      ? (db
          .prepare(
            `SELECT c.id, c.title, c.slug, c.description, c.difficulty, c.estimated_hours, t.name as technology_name, t.slug as technology_slug,
                    (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons
             FROM courses c LEFT JOIN technologies t ON t.id = c.technology_id
             WHERE c.id IN (${courseIds.map(() => '?').join(',')})`
          )
          .all(...courseIds) as Array<Record<string, unknown>>)
      : [];

    const projectTemplateIds = parseJsonSafe<string[]>(String(p.project_template_ids_json || '[]'), []);
    const projectTemplates = db
      .prepare(`SELECT * FROM project_templates WHERE learning_path_id = ?`)
      .all(p.id) as Array<Record<string, unknown>>;

    let certificate = null;
    if (req.user) {
      certificate = db
        .prepare(`SELECT * FROM path_certificates WHERE user_id = ? AND learning_path_id = ?`)
        .get(req.user.id, p.id);
    }

    const progMap = new Map<string, { checkedItems: string[]; notes: string; updatedAt: string }>();
    if (req.user) {
      const pRows = db
        .prepare(`SELECT template_id, checked_items_json, notes, updated_at FROM project_template_progress WHERE user_id = ?`)
        .all(req.user.id) as Array<{ template_id: string; checked_items_json: string; notes: string; updated_at: string }>;
      for (const r of pRows) {
        progMap.set(r.template_id, {
          checkedItems: parseJsonSafe<string[]>(r.checked_items_json, []),
          notes: r.notes || '',
          updatedAt: r.updated_at,
        });
      }
    }

    res.json({
      learningPath: {
        ...p,
        course_ids: courseIds,
        prerequisites: parseJsonSafe<string[]>(String(p.prerequisites_json || '[]'), []),
        objectives: parseJsonSafe<string[]>(String(p.objectives_json || '[]'), []),
        milestones: parseJsonSafe<Array<{ step: number; title: string; summary: string }>>(String(p.milestones_json || '[]'), []),
        project_template_ids: projectTemplateIds,
      },
      courses,
      projectTemplates: projectTemplates.map((pt) => formatProjectTemplateRow(pt, progMap)),
      certificate,
    });
  });

  router.post('/learning-paths/:id/certificate', requireAuth, (req: AuthenticatedRequest, res) => {
    const p = db.prepare(`SELECT id, title, course_ids_json FROM learning_paths WHERE id = ?`).get(req.params.id) as
      | { id: string; title: string; course_ids_json: string }
      | undefined;
    if (!p) return res.status(404).json({ error: 'Learning path not found.' });

    const existing = db
      .prepare(`SELECT * FROM path_certificates WHERE user_id = ? AND learning_path_id = ?`)
      .get(req.user!.id, p.id) as (Record<string, unknown> & { status?: string }) | undefined;
    if (existing) {
      if (String(existing.status || 'active') === 'revoked') {
        return res.status(403).json({
          code: 'CERTIFICATE_REVOKED',
          error: 'This learning path certificate was revoked by an administrator.',
          certificate: existing,
        });
      }
      return res.json({ ok: true, alreadyIssued: true, certificate: existing });
    }

    const courseIds = parseJsonSafe<string[]>(p.course_ids_json || '[]', []);
    if (courseIds.length === 0) {
      return res.status(400).json({ error: 'This learning path has no published courses configured yet.' });
    }
    for (const cid of courseIds) {
      const check = checkCourseCertificateEligibility(cid, req.user!.id);
      if (!check.eligible) {
        return res.status(400).json({
          error: `Complete every course requirement in "${p.title}" before claiming the path certificate. Pending: ${check.reason}`,
        });
      }
    }

    const id = `pcert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const code = `CERT-PATH-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const issuedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO path_certificates (id, user_id, learning_path_id, path_title, learner_name, certificate_code, issued_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.user!.id, p.id, p.title, req.user!.full_name, code, issuedAt);

    awardXpAndBadges(req.user!.id, 150);
    recordAuditLog(req.user!.id, 'certificate.path_issued', 'path_certificate', id, { learningPathId: p.id, code });
    notifyWithRealtime(
      req.user!.id,
      'achievement',
      'Career Path Certificate Issued',
      `Your verified Braincode career path certificate for ${p.title} (${code}) is ready!`,
      '/dashboard'
    );

    const created = db.prepare(`SELECT * FROM path_certificates WHERE id = ?`).get(id);
    res.status(201).json({ ok: true, alreadyIssued: false, certificate: created });
  });

  // =========================================================
  // LESSON NOTES (DB-PERSISTED) & COURSE REVIEWS
  // =========================================================
  router.put('/lessons/:id/note', requireAuth, (req: AuthenticatedRequest, res) => {
    const lesson = db
      .prepare(
        `SELECT l.id, l.course_id, l.access_tier, l.status as lesson_status, c.is_published, c.status as course_status
         FROM lessons l JOIN courses c ON c.id = l.course_id
         WHERE l.id = ?`
      )
      .get(req.params.id) as
      | {
          id: string;
          course_id: string;
          access_tier: string;
          lesson_status?: string;
          is_published?: number;
          course_status?: string;
        }
      | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const isPrivilegedRole = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (
      !isPrivilegedRole &&
      (String(lesson.lesson_status || 'published') !== 'published' ||
        Number(lesson.is_published) !== 1 ||
        String(lesson.course_status || 'published') !== 'published')
    ) {
      return res.status(403).json({
        code: 'LESSON_NOT_PUBLISHED',
        error: 'Notes cannot be saved on draft or review lessons before publication.',
      });
    }
    if (lesson.access_tier === 'premium' && !req.entitlement?.limits.canAccessPremiumCourses) {
      return res.status(403).json({ code: 'PREMIUM_REQUIRED', error: 'Premium subscription required to save notes on premium lessons.' });
    }
    const noteText = String(req.body?.noteText ?? '').slice(0, 8000);
    const now = new Date().toISOString();
    const id = `note_${req.user!.id}_${lesson.id}`;
    db.prepare(
      `INSERT INTO learning_notes (id, user_id, lesson_id, course_id, note_text, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET note_text = excluded.note_text, updated_at = excluded.updated_at`
    ).run(id, req.user!.id, lesson.id, lesson.course_id, noteText, now);
    res.json({ ok: true, noteText, updatedAt: now });
  });

  router.post('/courses/:id/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
    const course = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    const rating = Math.round(Number(req.body?.rating || 0));
    const reviewText = String(req.body?.reviewText || '').trim().slice(0, 1200);
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    const now = new Date().toISOString();
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(
      `INSERT INTO course_reviews (id, course_id, user_id, rating, review_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, course_id) DO UPDATE SET rating = excluded.rating, review_text = excluded.review_text, updated_at = excluded.updated_at`
    ).run(id, req.params.id, req.user!.id, rating, reviewText, now, now);
    res.status(201).json({ ok: true });
  });

  // =========================================================
  // INTERACTIVE EXERCISES ENGINE (10 TYPES)
  // =========================================================
  router.get('/exercises', (req: AuthenticatedRequest, res) => {
    const courseId = String(req.query.courseId || '').trim();
    const lessonId = String(req.query.lessonId || '').trim();
    const technologyId = String(req.query.technologyId || '').trim();
    const typeFilter = String(req.query.type || '').trim();

    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'instructor';
    const canPremium = Boolean(req.entitlement?.limits.canAccessPremiumCourses) || isPrivileged;

    const rows = db
      .prepare(
        `SELECT e.*, l.access_tier as lesson_access_tier
         FROM exercises e
         JOIN courses c ON c.id = e.course_id
         LEFT JOIN lessons l ON l.id = e.lesson_id
         WHERE (? = 1 OR (c.is_published = 1 AND c.status = 'published' AND (l.id IS NULL OR l.status = 'published')))
           AND (? = '' OR e.course_id = ?)
           AND (? = '' OR e.lesson_id = ?)
           AND (? = '' OR e.technology_id = ?)
           AND (? = '' OR e.exercise_type = ?)
         ORDER BY e.sort_order ASC, e.created_at ASC LIMIT 80`
      )
      .all(
        isPrivileged ? 1 : 0,
        courseId,
        courseId,
        lessonId,
        lessonId,
        technologyId,
        technologyId,
        typeFilter,
        typeFilter
      ) as Array<Record<string, unknown>>;

    const subMap = new Map<string, Array<Record<string, unknown>>>();
    if (req.user) {
      const subs = db
        .prepare(`SELECT * FROM exercise_submissions WHERE user_id = ? ORDER BY attempt_number DESC`)
        .all(req.user.id) as Array<Record<string, unknown>>;
      for (const s of subs) {
        const eid = String(s.exercise_id);
        if (!subMap.has(eid)) subMap.set(eid, []);
        subMap.get(eid)!.push(s);
      }
    }

    const exercises = rows.map((ex) => {
      const locked = ex.lesson_access_tier === 'premium' && !canPremium;
      const mySubs = subMap.get(String(ex.id)) || [];
      const solved = mySubs.some((s) => Number(s.is_correct) === 1);
      return {
        id: ex.id,
        course_id: ex.course_id,
        module_id: ex.module_id,
        lesson_id: ex.lesson_id,
        technology_id: ex.technology_id,
        title: ex.title,
        exercise_type: ex.exercise_type,
        difficulty: ex.difficulty,
        prompt: locked ? 'Unlock Pro Learner to access this premium exercise.' : ex.prompt,
        starter_code: locked ? '' : ex.starter_code,
        options: locked ? [] : parseJsonSafe<string[]>(String(ex.options_json || '[]'), []),
        hint_text: locked ? '' : ex.hint_text,
        explanation: solved || isPrivileged ? ex.explanation : undefined,
        correct_answer: solved || isPrivileged ? ex.correct_answer : undefined,
        xp_reward: ex.xp_reward,
        marks: Number(ex.marks || 10),
        max_attempts: Number(ex.max_attempts || 0),
        allow_partial_credit: Boolean(ex.allow_partial_credit ?? 1),
        learning_objective: String(ex.learning_objective || ''),
        validation_method: String(ex.validation_method || 'rule'),
        sort_order: ex.sort_order,
        locked,
        solved,
        submissions: mySubs,
      };
    });

    res.json({ exercises });
  });

  router.post('/exercises/:id/submit', requireAuth, (req: AuthenticatedRequest, res) => {
    const ex = db
      .prepare(
        `SELECT e.*, c.is_published as course_published, c.status as course_status,
                l.access_tier as lesson_access_tier, l.status as lesson_status
         FROM exercises e
         JOIN courses c ON c.id = e.course_id
         LEFT JOIN lessons l ON l.id = e.lesson_id
         WHERE e.id = ?`
      )
      .get(req.params.id) as
      | {
          id: string;
          course_id: string;
          title: string;
          exercise_type: string;
          correct_answer: string;
          validation_rule_json: string;
          explanation: string;
          xp_reward: number;
          marks?: number;
          max_attempts?: number;
          allow_partial_credit?: number;
          learning_objective?: string;
          course_published: number;
          course_status: string;
          lesson_access_tier: string | null;
          lesson_status: string | null;
        }
      | undefined;

    if (!ex) return res.status(404).json({ error: 'Exercise not found.' });
    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (
      !isPrivileged &&
      (Number(ex.course_published) !== 1 ||
        String(ex.course_status || 'published') !== 'published' ||
        (ex.lesson_status && String(ex.lesson_status) !== 'published'))
    ) {
      return res.status(403).json({
        code: 'COURSE_NOT_PUBLISHED',
        error: 'Exercises belonging to draft or review courses/lessons cannot be submitted yet.',
      });
    }
    if (ex.lesson_access_tier === 'premium' && !req.entitlement?.limits.canAccessPremiumCourses && !isPrivileged) {
      return res.status(403).json({ code: 'PREMIUM_REQUIRED', error: 'Active premium subscription required for this exercise.' });
    }

    const priorCount = (
      db
        .prepare(`SELECT COUNT(*) as c FROM exercise_submissions WHERE exercise_id = ? AND user_id = ?`)
        .get(ex.id, req.user!.id) as { c: number }
    ).c;
    const maxAttempts = Number(ex.max_attempts || 0);
    if (maxAttempts > 0 && priorCount >= maxAttempts && !isPrivileged) {
      return res.status(403).json({ error: `Maximum attempt limit (${maxAttempts}) reached for this exercise.` });
    }

    const answerText = String(req.body?.answerText ?? req.body?.answer ?? '').trim();
    const codeSubmitted = String(req.body?.codeSubmitted ?? '').trim();
    const evalResult = evaluateExerciseAnswer(ex, answerText, codeSubmitted);

    const alreadySolved = Boolean(
      db
        .prepare(`SELECT 1 FROM exercise_submissions WHERE exercise_id = ? AND user_id = ? AND is_correct = 1`)
        .get(ex.id, req.user!.id)
    );

    const subId = `exsub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO exercise_submissions (id, exercise_id, user_id, answer_text, code_submitted, is_correct, score, feedback_text, instructor_feedback, status, attempt_number, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)`
    ).run(
      subId,
      ex.id,
      req.user!.id,
      answerText,
      codeSubmitted,
      evalResult.isCorrect ? 1 : 0,
      evalResult.score,
      evalResult.feedback,
      evalResult.status,
      priorCount + 1,
      now
    );

    recordLearnerCompetency({
      userId: req.user!.id,
      courseId: ex.course_id,
      objectiveKey: ex.learning_objective || `exercise_${ex.id}`,
      objectiveTitle: ex.learning_objective || ex.title || 'Practice Mastery',
      scoreDeltaPct: evalResult.score,
      evidenceType: 'exercise',
      evidenceId: ex.id,
    });

    let xpAwarded = 0;
    if (evalResult.isCorrect && !alreadySolved) {
      xpAwarded = Number(ex.xp_reward || 25);
      awardXpAndBadges(req.user!.id, xpAwarded);
    }

    const submission = db.prepare(`SELECT * FROM exercise_submissions WHERE id = ?`).get(subId);
    const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as unknown as AuthUser;

    return res.json({
      ok: true,
      submission,
      feedback: evalResult.feedback,
      isCorrect: evalResult.isCorrect,
      score: evalResult.score,
      partialCreditApplied: Boolean(evalResult.partialCreditApplied),
      attemptNumber: priorCount + 1,
      maxAttempts,
      explanation: evalResult.isCorrect ? ex.explanation : undefined,
      canRevealSolution: true,
      xpAwarded,
      user: sanitizeUserPublic(updatedUser),
    });
  });

  router.get('/exercises/:id/solution', requireAuth, (req: AuthenticatedRequest, res) => {
    const ex = db
      .prepare(
        `SELECT e.id, e.correct_answer, e.explanation, l.access_tier as lesson_access_tier
         FROM exercises e LEFT JOIN lessons l ON l.id = e.lesson_id
         WHERE e.id = ?`
      )
      .get(req.params.id) as
      | { id: string; correct_answer: string; explanation: string; lesson_access_tier: string | null }
      | undefined;

    if (!ex) return res.status(404).json({ error: 'Exercise not found.' });
    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (ex.lesson_access_tier === 'premium' && !req.entitlement?.limits.canAccessPremiumCourses && !isPrivileged) {
      return res.status(403).json({ code: 'PREMIUM_REQUIRED', error: 'Premium subscription required.' });
    }
    const attempts = (
      db
        .prepare(`SELECT COUNT(*) as c FROM exercise_submissions WHERE exercise_id = ? AND user_id = ?`)
        .get(ex.id, req.user!.id) as { c: number }
    ).c;

    if (attempts === 0 && !isPrivileged) {
      return res.status(403).json({ error: 'Attempt the exercise at least once before revealing the solution.' });
    }
    return res.json({
      correctAnswer: ex.correct_answer,
      explanation: ex.explanation,
    });
  });

  // =========================================================
  // PROJECT TEMPLATES & COURSE ASSIGNMENTS
  // =========================================================
  router.get('/projects/templates', (req: AuthenticatedRequest, res) => {
    const technologyId = String(req.query.technologyId || '').trim();
    const learningPathId = String(req.query.learningPathId || '').trim();
    const category = String(req.query.category || '').trim();

    const rows = db
      .prepare(
        `SELECT pt.*, t.name as technology_name, c.title as course_title
         FROM project_templates pt
         LEFT JOIN technologies t ON t.id = pt.technology_id
         LEFT JOIN courses c ON c.id = pt.course_id
         WHERE (? = '' OR pt.technology_id = ?)
           AND (? = '' OR pt.learning_path_id = ?)
           AND (? = '' OR LOWER(pt.category) = LOWER(?))
         ORDER BY pt.created_at ASC`
      )
      .all(technologyId, technologyId, learningPathId, learningPathId, category, category) as Array<Record<string, unknown>>;

    const progMap = new Map<string, { checkedItems: string[]; notes: string; updatedAt: string }>();
    if (req.user) {
      const pRows = db
        .prepare(`SELECT template_id, checked_items_json, notes, updated_at FROM project_template_progress WHERE user_id = ?`)
        .all(req.user.id) as Array<{ template_id: string; checked_items_json: string; notes: string; updated_at: string }>;
      for (const r of pRows) {
        progMap.set(r.template_id, {
          checkedItems: parseJsonSafe<string[]>(r.checked_items_json, []),
          notes: r.notes || '',
          updatedAt: r.updated_at,
        });
      }
    }

    res.json({
      templates: rows.map((pt) => formatProjectTemplateRow(pt, progMap)),
    });
  });

  router.put('/projects/templates/:id/progress', requireAuth, (req: AuthenticatedRequest, res) => {
    const tpl = db.prepare(`SELECT id FROM project_templates WHERE id = ?`).get(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Project template not found.' });
    const checkedItems = Array.isArray(req.body?.checkedItems)
      ? req.body.checkedItems.map(String).slice(0, 40)
      : [];
    const notes = String(req.body?.notes || '').slice(0, 4000);
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO project_template_progress (user_id, template_id, checked_items_json, notes, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, template_id) DO UPDATE SET
         checked_items_json = excluded.checked_items_json,
         notes = excluded.notes,
         updated_at = excluded.updated_at`
    ).run(req.user!.id, req.params.id, JSON.stringify(checkedItems), notes, now);
    res.json({ ok: true, progress: { checkedItems, notes, updatedAt: now } });
  });

  router.post('/projects/templates/:id/start', requireAuth, (req: AuthenticatedRequest, res) => {
    const tpl = db.prepare(`SELECT * FROM project_templates WHERE id = ?`).get(req.params.id) as
      | {
          id: string;
          title: string;
          summary: string;
          starter_files_json: string;
          category: string;
          course_id: string;
        }
      | undefined;
    if (!tpl) return res.status(404).json({ error: 'Project template not found.' });

    const wsCount = (
      db.prepare(`SELECT COUNT(*) as c FROM workspaces WHERE owner_id = ?`).get(req.user!.id) as { c: number }
    ).c;
    const maxAllowed = req.entitlement?.limits.maxWorkspaces || 5;
    if (wsCount >= maxAllowed) {
      return res.status(403).json({
        code: 'PREMIUM_REQUIRED',
        error: `Workspace limit (${maxAllowed}) reached on your current plan.`,
      });
    }

    const files = parseJsonSafe<Record<string, string>>(tpl.starter_files_json || '{}', {
      'README.md': `# ${tpl.title}\n\n${tpl.summary}`,
    });
    const firstFile = Object.keys(files)[0] || '';
    const lang = firstFile.endsWith('.py')
      ? 'python'
      : firstFile.endsWith('.sql')
        ? 'sql'
        : firstFile.endsWith('.js')
          ? 'javascript'
          : 'html';

    const wsId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO workspaces (id, owner_id, name, description, language, files_json, lesson_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, '', ?, ?)`
    ).run(wsId, req.user!.id, tpl.title, tpl.summary, lang, JSON.stringify(files), now, now);

    let projectId = '';
    if (req.body?.createPortfolioEntry !== false) {
      projectId = `prj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare(
        `INSERT INTO projects (id, owner_id, workspace_id, title, description, tags_json, visibility, contributors_json, template_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'private', ?, ?, 'in_progress', ?, ?)`
      ).run(
        projectId,
        req.user!.id,
        wsId,
        tpl.title,
        tpl.summary,
        JSON.stringify([tpl.category]),
        JSON.stringify([req.user!.username]),
        tpl.id,
        now,
        now
      );
    }

    res.status(201).json({
      ok: true,
      workspace: { id: wsId, owner_id: req.user!.id, name: tpl.title, language: lang, files, updated_at: now },
      projectId,
    });
  });

  router.post('/assignments/:id/submit', requireAuth, (req: AuthenticatedRequest, res) => {
    const asn = db.prepare(`SELECT * FROM assignments WHERE id = ?`).get(req.params.id) as
      | { id: string; title: string; course_id: string }
      | undefined;
    if (!asn) return res.status(404).json({ error: 'Assignment not found.' });

    const submissionText = String(req.body?.submissionText || '').trim();
    const repoUrl = String(req.body?.repoUrl || '').trim();
    const liveUrl = String(req.body?.liveUrl || '').trim();
    const workspaceId = String(req.body?.workspaceId || '').trim();
    const files = req.body?.files && typeof req.body.files === 'object' ? req.body.files : {};

    const isSafeHttp = (raw: string) => {
      if (!raw) return true;
      try {
        const u = new URL(raw);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };
    if (!isSafeHttp(repoUrl) || !isSafeHttp(liveUrl)) {
      return res.status(400).json({ error: 'Repository and live URLs must start with http:// or https://.' });
    }

    if (!submissionText && !repoUrl && !liveUrl && !workspaceId) {
      return res.status(400).json({ error: 'Provide submission notes, a repository/live URL, or attach a workspace.' });
    }

    const id = `asub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO assignment_submissions (id, assignment_id, user_id, submission_text, repo_url, live_url, files_json, workspace_id, status, score, instructor_feedback, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 0, '', ?, ?)`
    ).run(id, asn.id, req.user!.id, submissionText, repoUrl, liveUrl, JSON.stringify(files), workspaceId, now, now);

    const instructors = db
      .prepare(`SELECT id FROM users WHERE role IN ('instructor', 'admin') AND status = 'active' LIMIT 5`)
      .all() as Array<{ id: string }>;
    for (const inst of instructors) {
      notifyWithRealtime(
        inst.id,
        'assignment',
        'New Assignment Submission',
        `${req.user!.full_name} submitted "${asn.title}".`,
        '/admin'
      );
    }

    const created = db.prepare(`SELECT * FROM assignment_submissions WHERE id = ?`).get(id);
    res.status(201).json({ ok: true, submission: created });
  });

  // =========================================================
  // INSTRUCTOR & ADMIN CURRICULUM ENGINE & GRADING CMS
  // =========================================================
  router.patch('/admin/learning-paths/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT * FROM learning_paths WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: 'Learning path not found.' });

    const title = String(req.body?.title ?? existing.title).trim();
    const description = String(req.body?.description ?? existing.description).trim();
    const overview = String(req.body?.overview ?? existing.overview ?? '').trim();
    const audience = String(req.body?.audience ?? existing.audience ?? '').trim();
    const difficulty = String(req.body?.difficulty ?? existing.difficulty).trim();
    const estimatedHours = req.body?.estimatedHours !== undefined ? Math.max(1, Number(req.body.estimatedHours)) : Number(existing.estimated_hours);
    const targetRole = String(req.body?.targetRole ?? existing.target_role ?? '').trim();
    const courseIds = Array.isArray(req.body?.courseIds)
      ? req.body.courseIds.map(String)
      : parseJsonSafe<string[]>(String(existing.course_ids_json || '[]'), []);
    const isPublished = req.body?.isPublished !== undefined ? (req.body.isPublished ? 1 : 0) : Number(existing.is_published ?? 1);

    db.prepare(
      `UPDATE learning_paths SET title = ?, description = ?, overview = ?, audience = ?, difficulty = ?, estimated_hours = ?, target_role = ?, course_ids_json = ?, is_published = ? WHERE id = ?`
    ).run(title, description, overview, audience, difficulty, estimatedHours, targetRole, JSON.stringify(courseIds), isPublished, req.params.id);

    recordAuditLog(req.user!.id, 'cms.learning_path_updated', 'learning_path', String(req.params.id), { title });
    res.json({ ok: true });
  });

  router.post('/admin/topics', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = String(req.body?.courseId || '').trim();
    const moduleId = String(req.body?.moduleId || '').trim();
    const title = String(req.body?.title || '').trim();
    const summary = String(req.body?.summary || '').trim();
    if (!courseId || !moduleId || title.length < 2) {
      return res.status(400).json({ error: 'Course, module, and topic title are required.' });
    }
    const maxSort = (
      db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM course_topics WHERE module_id = ?`).get(moduleId) as { m: number }
    ).m;
    const id = `top_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-3)}`;
    db.prepare(
      `INSERT INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, courseId, moduleId, title, slug, summary, maxSort + 1, new Date().toISOString());
    recordAuditLog(req.user!.id, 'cms.topic_created', 'course_topic', id, { courseId, moduleId, title });
    res.status(201).json({ ok: true, id, slug });
  });

  router.patch('/admin/topics/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT * FROM course_topics WHERE id = ?`).get(req.params.id) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: 'Topic not found.' });
    const title = String(req.body?.title ?? existing.title).trim();
    const summary = String(req.body?.summary ?? existing.summary ?? '').trim();
    const sortOrder = req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) : Number(existing.sort_order || 0);
    db.prepare(`UPDATE course_topics SET title = ?, summary = ?, sort_order = ? WHERE id = ?`).run(
      title,
      summary,
      Number.isFinite(sortOrder) ? sortOrder : 0,
      req.params.id
    );
    res.json({ ok: true });
  });

  router.delete('/admin/topics/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const result = db.prepare(`DELETE FROM course_topics WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Topic not found.' });
    res.json({ ok: true });
  });

  router.get('/admin/lessons/:id/details', requireAuth, requireRole('admin', 'instructor'), (req, res) => {
    const lesson = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const blocks = db
      .prepare(`SELECT * FROM lesson_content_blocks WHERE lesson_id = ? ORDER BY sort_order ASC`)
      .all(req.params.id)
      .map((b: Record<string, unknown>) => ({ ...b, metadata: parseJsonSafe(String(b.metadata_json || '{}'), {}) }));
    const codeExamples = db
      .prepare(`SELECT * FROM code_examples WHERE lesson_id = ? ORDER BY sort_order ASC`)
      .all(req.params.id);
    const exercises = db
      .prepare(`SELECT * FROM exercises WHERE lesson_id = ? ORDER BY sort_order ASC`)
      .all(req.params.id)
      .map((ex: Record<string, unknown>) => ({
        ...ex,
        options: parseJsonSafe<string[]>(String(ex.options_json || '[]'), []),
      }));
    res.json({ lesson, blocks, codeExamples, exercises });
  });

  router.post('/admin/lessons/:id/blocks', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const lesson = db.prepare(`SELECT id FROM lessons WHERE id = ?`).get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const blockType = String(req.body?.blockType || 'paragraph').trim();
    const title = String(req.body?.title || '').trim();
    const contentMarkdown = String(req.body?.contentMarkdown || '').trim();
    if (!contentMarkdown && !title) {
      return res.status(400).json({ error: 'Block title or content is required.' });
    }
    const maxSort = (
      db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM lesson_content_blocks WHERE lesson_id = ?`).get(req.params.id) as { m: number }
    ).m;
    const id = `blk_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    db.prepare(
      `INSERT INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.params.id, blockType, title, contentMarkdown, JSON.stringify(req.body?.metadata || {}), maxSort + 1);
    recordAuditLog(req.user!.id, 'cms.block_created', 'lesson_content_block', id, { lessonId: req.params.id, blockType });
    res.status(201).json({ ok: true, id });
  });

  router.delete('/admin/blocks/:id', requireAuth, requireRole('admin', 'instructor'), (req, res) => {
    const result = db.prepare(`DELETE FROM lesson_content_blocks WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Content block not found.' });
    res.json({ ok: true });
  });

  router.post('/admin/lessons/:id/examples', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const lesson = db.prepare(`SELECT id FROM lessons WHERE id = ?`).get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const title = String(req.body?.title || '').trim();
    const code = String(req.body?.code || '').trim();
    if (!title || !code) return res.status(400).json({ error: 'Example title and code are required.' });
    const maxSort = (
      db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM code_examples WHERE lesson_id = ?`).get(req.params.id) as { m: number }
    ).m;
    const id = `exm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    db.prepare(
      `INSERT INTO code_examples (id, lesson_id, title, description, language, code, expected_output, is_runnable, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      req.params.id,
      title,
      String(req.body?.description || ''),
      String(req.body?.language || 'javascript'),
      code,
      String(req.body?.expectedOutput || ''),
      req.body?.isRunnable === false ? 0 : 1,
      maxSort + 1
    );
    recordAuditLog(req.user!.id, 'cms.example_created', 'code_example', id, { lessonId: req.params.id, title });
    res.status(201).json({ ok: true, id });
  });

  router.delete('/admin/examples/:id', requireAuth, requireRole('admin', 'instructor'), (req, res) => {
    const result = db.prepare(`DELETE FROM code_examples WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Code example not found.' });
    res.json({ ok: true });
  });

  router.post('/admin/exercises', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = String(req.body?.courseId || '').trim();
    const moduleId = String(req.body?.moduleId || '').trim();
    const lessonId = String(req.body?.lessonId || '').trim();
    const technologyId = String(req.body?.technologyId || '').trim();
    const title = String(req.body?.title || '').trim();
    const exerciseType = String(req.body?.exerciseType || 'multiple_choice').trim();
    const difficulty = String(req.body?.difficulty || 'Beginner').trim();
    const prompt = String(req.body?.prompt || '').trim();
    const starterCode = String(req.body?.starterCode || '');
    const options = Array.isArray(req.body?.options)
      ? req.body.options.map(String)
      : String(req.body?.options || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
    const correctAnswer = String(req.body?.correctAnswer || '').trim();
    const explanation = String(req.body?.explanation || '').trim();
    const hintText = String(req.body?.hintText || '').trim();
    const xpReward = Math.max(5, Number(req.body?.xpReward || 25));

    if (!courseId || !title || !prompt) {
      return res.status(400).json({ error: 'Course, exercise title, and prompt are required.' });
    }
    const id = `ex_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const maxSort = (
      db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM exercises WHERE course_id = ?`).get(courseId) as { m: number }
    ).m;
    const rule =
      exerciseType === 'write_code' || exerciseType === 'practical_task'
        ? { mode: 'contains_tokens', tokens: req.body?.tokens || (correctAnswer ? [correctAnswer] : []) }
        : exerciseType === 'short_answer'
          ? { mode: 'keyword_rubric', minLength: 15, keywords: req.body?.keywords || [] }
          : { mode: 'exact_case_insensitive' };

    db.prepare(
      `INSERT INTO exercises (id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty, prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation, hint_text, xp_reward, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      courseId,
      moduleId,
      lessonId,
      technologyId,
      title,
      exerciseType,
      difficulty,
      prompt,
      starterCode,
      JSON.stringify(options),
      correctAnswer,
      JSON.stringify(rule),
      explanation,
      hintText,
      xpReward,
      maxSort + 1,
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'cms.exercise_created', 'exercise', id, { courseId, exerciseType, title });
    res.status(201).json({ ok: true, id });
  });

  router.delete('/admin/exercises/:id', requireAuth, requireRole('admin', 'instructor'), (req, res) => {
    const result = db.prepare(`DELETE FROM exercises WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Exercise not found.' });
    res.json({ ok: true });
  });

  router.post('/admin/assessments', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = String(req.body?.courseId || '').trim();
    const lessonId = String(req.body?.lessonId || '').trim();
    const title = String(req.body?.title || '').trim();
    const type = String(req.body?.type || 'quiz').trim();
    const mode = req.body?.mode === 'timed' ? 'timed' : 'untimed';
    const timeLimitSec = Math.max(0, Number(req.body?.timeLimitSec || 0));
    const passingScorePct = Math.min(100, Math.max(10, Number(req.body?.passingScorePct || 70)));
    const xpReward = Math.max(10, Number(req.body?.xpReward || 80));
    const questions = Array.isArray(req.body?.questions) ? req.body.questions : [];

    if (!courseId || !title || questions.length === 0) {
      return res.status(400).json({ error: 'Course, title, and at least one question are required.' });
    }
    const id = `asm_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    db.prepare(
      `INSERT INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, randomize_questions, max_attempts, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      courseId,
      lessonId,
      title,
      type,
      mode,
      timeLimitSec,
      xpReward,
      JSON.stringify(questions),
      passingScorePct,
      req.body?.randomizeQuestions ? 1 : 0,
      Math.max(0, Number(req.body?.maxAttempts || 0)),
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'cms.assessment_created', 'assessment', id, { courseId, title });
    res.status(201).json({ ok: true, id });
  });

  router.post('/admin/assignments', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = String(req.body?.courseId || '').trim();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const instructionsMarkdown = String(req.body?.instructionsMarkdown || '').trim();
    if (!courseId || !title || !instructionsMarkdown) {
      return res.status(400).json({ error: 'Course, title, and instructions are required.' });
    }
    const requirements = Array.isArray(req.body?.requirements)
      ? req.body.requirements
      : String(req.body?.requirements || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
    const id = `asn_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    db.prepare(
      `INSERT INTO assignments (id, course_id, module_id, technology_id, title, description, instructions_markdown, requirements_json, starter_files_json, rubric_json, difficulty, xp_reward, due_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      courseId,
      String(req.body?.moduleId || ''),
      String(req.body?.technologyId || ''),
      title,
      description || title,
      instructionsMarkdown,
      JSON.stringify(requirements),
      JSON.stringify(req.body?.starterFiles || {}),
      JSON.stringify(req.body?.rubric || []),
      String(req.body?.difficulty || 'Intermediate'),
      Math.max(20, Number(req.body?.xpReward || 120)),
      Math.max(1, Number(req.body?.dueDays || 7)),
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'cms.assignment_created', 'assignment', id, { courseId, title });
    res.status(201).json({ ok: true, id });
  });

  router.post('/admin/project-templates', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    const summary = String(req.body?.summary || '').trim();
    if (!title || !summary) return res.status(400).json({ error: 'Template title and summary are required.' });
    const id = `ptpl_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-3)}`;
    const requirements = Array.isArray(req.body?.requirements)
      ? req.body.requirements
      : String(req.body?.requirements || '')
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
    db.prepare(
      `INSERT INTO project_templates (id, technology_id, learning_path_id, course_id, title, slug, category, difficulty, estimated_hours, summary, requirements_json, starter_files_json, deliverables_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      String(req.body?.technologyId || ''),
      String(req.body?.learningPathId || ''),
      String(req.body?.courseId || ''),
      title,
      slug,
      String(req.body?.category || 'Web Project'),
      String(req.body?.difficulty || 'Intermediate'),
      Math.max(1, Number(req.body?.estimatedHours || 6)),
      summary,
      JSON.stringify(requirements),
      JSON.stringify(req.body?.starterFiles || { 'README.md': `# ${title}\n\n${summary}` }),
      JSON.stringify(Array.isArray(req.body?.deliverables) ? req.body.deliverables : ['Working project workspace']),
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'cms.project_template_created', 'project_template', id, { title });
    res.status(201).json({ ok: true, id, slug });
  });

  router.patch('/admin/assignments/submissions/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const sub = db.prepare(`SELECT * FROM assignment_submissions WHERE id = ?`).get(req.params.id) as
      | { id: string; user_id: string; assignment_id: string }
      | undefined;
    if (!sub) return res.status(404).json({ error: 'Assignment submission not found.' });
    const status = ['submitted', 'graded', 'needs_revision', 'approved'].includes(String(req.body?.status))
      ? String(req.body.status)
      : 'graded';
    const score = Math.min(100, Math.max(0, Number(req.body?.score || 0)));
    const feedback = String(req.body?.instructorFeedback || '').trim();
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE assignment_submissions SET status = ?, score = ?, instructor_feedback = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`
    ).run(status, score, feedback, req.user!.id, now, now, sub.id);

    if (status === 'approved' || score >= 70) {
      awardXpAndBadges(sub.user_id, 60);
    }
    notifyWithRealtime(
      sub.user_id,
      'assignment',
      status === 'needs_revision' ? 'Assignment Revision Requested' : 'Assignment Graded',
      feedback || `Status updated to ${status} (Score: ${score}%).`,
      '/courses'
    );
    recordAuditLog(req.user!.id, 'instructor.assignment_graded', 'assignment_submission', sub.id, { status, score });
    res.json({ ok: true });
  });

  router.patch('/admin/exercises/submissions/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const sub = db.prepare(`SELECT * FROM exercise_submissions WHERE id = ?`).get(req.params.id) as
      | { id: string; user_id: string }
      | undefined;
    if (!sub) return res.status(404).json({ error: 'Exercise submission not found.' });
    const score = Math.min(100, Math.max(0, Number(req.body?.score || 0)));
    const isCorrect = req.body?.isCorrect !== undefined ? (req.body.isCorrect ? 1 : 0) : score >= 70 ? 1 : 0;
    const instructorFeedback = String(req.body?.instructorFeedback || '').trim();
    db.prepare(
      `UPDATE exercise_submissions SET is_correct = ?, score = ?, instructor_feedback = ?, status = 'graded' WHERE id = ?`
    ).run(isCorrect, score, instructorFeedback, sub.id);
    if (isCorrect) {
      awardXpAndBadges(sub.user_id, 25);
    }
    notifyWithRealtime(
      sub.user_id,
      'assignment',
      'Exercise Submission Reviewed',
      instructorFeedback || `Score updated to ${score}%.`,
      '/courses'
    );
    res.json({ ok: true });
  });

  router.patch('/admin/projects/:id/review', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const prj = db.prepare(`SELECT id, owner_id, title FROM projects WHERE id = ?`).get(req.params.id) as
      | { id: string; owner_id: string; title: string }
      | undefined;
    if (!prj) return res.status(404).json({ error: 'Project not found.' });
    const status = ['in_progress', 'submitted', 'needs_revision', 'approved'].includes(String(req.body?.status))
      ? String(req.body.status)
      : 'approved';
    const feedback = String(req.body?.instructorFeedback || '').trim();
    const now = new Date().toISOString();
    db.prepare(`UPDATE projects SET status = ?, instructor_feedback = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?`).run(
      status,
      feedback,
      req.user!.id,
      now,
      prj.id
    );
    notifyWithRealtime(
      prj.owner_id,
      'assignment',
      'Project Review Feedback',
      `${prj.title}: ${status}${feedback ? ` — ${feedback}` : ''}`,
      '/projects'
    );
    res.json({ ok: true });
  });

  // Dry-Run Preview for Bulk Curriculum Import (validates structure & counts without DB writes)
  router.post('/admin/curriculum/import/preview', requireAuth, requireRole('admin', 'instructor'), (req, res) => {
    const rawJson = req.body?.data;
    const csvText = typeof req.body?.csv === 'string' ? req.body.csv.trim() : '';
    if (!rawJson && !csvText) {
      return res.status(400).json({ error: 'Provide either JSON `data` or `csv` text to preview.' });
    }

    const warnings: string[] = [];
    if (csvText) {
      const rows = csvText.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
      if (rows.length < 2) {
        return res.status(400).json({ error: 'CSV must include a header row and at least one lesson row.' });
      }
      const headers = rows[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      if (!headers.includes('course_title') || !headers.includes('lesson_title')) {
        return res.status(400).json({ error: 'CSV header must include `course_title` and `lesson_title`.' });
      }
      const courseSlugs = new Set<string>();
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
        const getCol = (name: string) => {
          const idx = headers.indexOf(name);
          return idx >= 0 ? cols[idx] || '' : '';
        };
        const ct = getCol('course_title');
        const lt = getCol('lesson_title');
        if (!ct || !lt) warnings.push(`Row ${i + 1} has empty course_title or lesson_title.`);
        const slug = (getCol('course_slug') || ct.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
        if (slug) courseSlugs.add(slug);
      }
      return res.json({
        valid: warnings.length === 0,
        format: 'csv',
        summary: {
          categories: 0,
          technologies: 0,
          courses: courseSlugs.size,
          lessons: rows.length - 1,
        },
        warnings,
      });
    }

    if (typeof rawJson !== 'object' || rawJson === null) {
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }
    const payload = rawJson as {
      categories?: Array<Record<string, unknown>>;
      technologies?: Array<Record<string, unknown>>;
      courses?: Array<Record<string, unknown>>;
    };
    const categories = Array.isArray(payload.categories) ? payload.categories.length : 0;
    const technologies = Array.isArray(payload.technologies) ? payload.technologies.length : 0;
    let lessons = 0;
    const coursesArr = Array.isArray(payload.courses) ? payload.courses : [];
    for (const c of coursesArr) {
      if (!c.title || !c.slug) warnings.push('A course entry is missing `title` or `slug`.');
      const mods = Array.isArray(c.modules) ? (c.modules as Array<Record<string, unknown>>) : [];
      for (const m of mods) {
        if (!m.title) warnings.push(`Course "${String(c.title || '')}" contains a module without a title.`);
        const les = Array.isArray(m.lessons) ? (m.lessons as Array<Record<string, unknown>>) : [];
        lessons += les.length;
      }
    }
    return res.json({
      valid: warnings.length === 0,
      format: 'json',
      summary: {
        categories,
        technologies,
        courses: coursesArr.length,
        lessons,
      },
      warnings,
    });
  });
}
