import type { Router } from 'express';
import { db, recordAuditLog } from './db.ts';
import { sanitizeRichText } from './curriculum_intelligence.ts';
import { parseJsonSafe, requireRole, type AuthenticatedRequest } from './security.ts';
import { getTechnologyLearningCentre } from './technology_learning_centre.ts';
import { resolveTechnologyCapability } from '../shared/technologyCapabilities.ts';

function sanitizeLearningCentrePayload(value: unknown, keyName = ''): unknown {
  if (typeof value === 'string') {
    if (keyName === 'code' || keyName === 'starterCode' || keyName === 'syntax') {
      return value;
    }
    return sanitizeRichText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLearningCentrePayload(item, keyName));
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeLearningCentrePayload(v, k);
    }
    return out;
  }
  return value;
}

export function registerTechnologyCentreRoutes(
  router: Router,
  helpers: {
    requireAuth: (req: AuthenticatedRequest, res: any, next: any) => void;
  }
) {
  const { requireAuth } = helpers;
  const cmsGuard = [requireAuth, requireRole('admin', 'instructor')];

  router.get('/technologies/:slug/learning-centre', (req: AuthenticatedRequest, res) => {
    const slug = String(req.params.slug || '').trim();
    const tech = db
      .prepare(
        `SELECT t.*, cat.name as category_name, cat.slug as category_slug
         FROM technologies t
         JOIN categories cat ON cat.id = t.category_id
         WHERE t.slug = ? AND t.is_published = 1`
      )
      .get(slug) as
      | (Record<string, unknown> & {
          id: string;
          slug: string;
          name: string;
          description?: string;
          difficulty?: string;
          category_id: string;
          category_slug: string;
          category_name: string;
        })
      | undefined;

    if (!tech) {
      return res.status(404).json({ error: 'Technology not found.' });
    }

    const capabilityProfile = resolveTechnologyCapability({
      id: tech.id,
      slug: tech.slug,
      name: tech.name,
      categoryId: String(tech.category_id || ''),
      categorySlug: String(tech.category_slug || ''),
      categoryName: String(tech.category_name || ''),
    });

    const learningCentre = getTechnologyLearningCentre({
      slug: tech.slug,
      userId: req.user?.id,
      tech,
      capability: capabilityProfile,
    });

    res.json({
      ok: true,
      technology: {
        id: tech.id,
        slug: tech.slug,
        name: tech.name,
        category_id: tech.category_id,
        category_slug: tech.category_slug,
        category_name: tech.category_name,
        difficulty: tech.difficulty,
        description: tech.description,
      },
      capabilityProfile,
      learningCentre,
    });
  });

  router.put('/admin/technologies/:slug/learning-centre', ...cmsGuard, (req: AuthenticatedRequest, res) => {
    const slug = String(req.params.slug || '').trim();
    const tech = db
      .prepare(`SELECT id, slug, name FROM technologies WHERE slug = ? LIMIT 1`)
      .get(slug) as { id: string; slug: string; name: string } | undefined;

    if (!tech) {
      return res.status(404).json({ error: 'Technology not found.' });
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const existing = getTechnologyLearningCentre({ slug: tech.slug });
    if (!existing) {
      return res.status(404).json({ error: 'Unable to resolve base learning centre.' });
    }

    const cleanField = <T>(incoming: unknown, fallback: T): T => {
      if (incoming === undefined) return fallback;
      return sanitizeLearningCentrePayload(incoming) as T;
    };

    const nextInteractiveTools = Array.isArray(body.interactiveTools)
      ? body.interactiveTools.filter((t): t is string => typeof t === 'string')
      : existing.interactiveTools;

    const nextSections = cleanField(body.sections, existing.sections);
    const nextTopicGroups = cleanField(body.topicGroups, existing.topicGroups);
    const nextGuidedExamples = cleanField(body.guidedExamples, existing.guidedExamples);
    const nextChallenges = cleanField(body.challenges, existing.challenges);
    const nextWebsiteProject = cleanField(body.websiteProject, existing.websiteProject || { title: `${tech.name} Capstone`, summary: '', phases: [] });
    const nextSyllabus = cleanField(body.syllabusSummary, existing.syllabusSummary);
    const nextStudyPlan = cleanField(body.studyPlan, existing.studyPlan);
    const nextInterviewPrep = cleanField(body.interviewPrep, existing.interviewPrep);
    const nextSummaryPoints = cleanField(body.summaryPoints, existing.summaryPoints);
    const nextBestPractices = cleanField(body.bestPractices, existing.bestPractices);
    const nextCertification = cleanField(body.certification, existing.certification);
    const nextReferences = cleanField(body.references, existing.references);

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO technology_learning_centres (
         technology_id, slug, interactive_tools_json, sections_config_json, topic_groups_json,
         guided_examples_json, challenges_json, website_project_json, syllabus_json,
         study_plan_json, interview_prep_json, summary_json, best_practices_json,
         certification_config_json, references_json, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(technology_id) DO UPDATE SET
         interactive_tools_json = excluded.interactive_tools_json,
         sections_config_json = excluded.sections_config_json,
         topic_groups_json = excluded.topic_groups_json,
         guided_examples_json = excluded.guided_examples_json,
         challenges_json = excluded.challenges_json,
         website_project_json = excluded.website_project_json,
         syllabus_json = excluded.syllabus_json,
         study_plan_json = excluded.study_plan_json,
         interview_prep_json = excluded.interview_prep_json,
         summary_json = excluded.summary_json,
         best_practices_json = excluded.best_practices_json,
         certification_config_json = excluded.certification_config_json,
         references_json = excluded.references_json,
         updated_at = excluded.updated_at`
    ).run(
      tech.id,
      tech.slug,
      JSON.stringify(nextInteractiveTools),
      JSON.stringify(nextSections),
      JSON.stringify(nextTopicGroups),
      JSON.stringify(nextGuidedExamples),
      JSON.stringify(nextChallenges),
      JSON.stringify(nextWebsiteProject),
      JSON.stringify(nextSyllabus),
      JSON.stringify(nextStudyPlan),
      JSON.stringify(nextInterviewPrep),
      JSON.stringify(nextSummaryPoints),
      JSON.stringify(nextBestPractices),
      JSON.stringify(nextCertification),
      JSON.stringify(nextReferences),
      now
    );

    recordAuditLog(req.user!.id, 'cms.learning_centre_updated', 'technology', tech.id, {
      slug: tech.slug,
      sectionCount: Array.isArray(nextSections) ? nextSections.length : 0,
    });

    const updated = getTechnologyLearningCentre({ slug: tech.slug, userId: req.user?.id });
    res.json({
      ok: true,
      updatedAt: now,
      learningCentre: updated,
    });
  });
}
