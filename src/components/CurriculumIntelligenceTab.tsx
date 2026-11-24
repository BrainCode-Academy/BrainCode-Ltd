import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { CurriculumQualityReportPanel } from './CurriculumQualityReportPanel';
import type {
  CourseAuditSummaryRow,
  MasterCurriculumAudit,
  QualityEvaluationResult,
} from '../types';

export function CurriculumIntelligenceTab({
  onNotify,
  onMutated,
}: {
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onMutated?: () => Promise<void> | void;
}) {
  const [audit, setAudit] = useState<MasterCurriculumAudit | null>(null);
  const [courses, setCourses] = useState<CourseAuditSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkEvaluating, setBulkEvaluating] = useState(false);

  // Filters
  const [q, setQ] = useState('');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [verifiedFilter, setVerifiedFilter] = useState('all');

  // Expanded course inspection + progression settings
  const [selectedCourseEval, setSelectedCourseEval] = useState<QualityEvaluationResult | null>(null);
  const [selectedCourseMeta, setSelectedCourseMeta] = useState<CourseAuditSummaryRow | null>(null);
  const [progForm, setProgForm] = useState({
    difficulty: 'Beginner',
    skillLevel: 'beginner',
    progressionModel: 'sequential',
    minCertificateScore: '70',
    requirePracticalProjects: false,
  });
  const [suggestionResult, setSuggestionResult] = useState<{
    aiUsed: boolean;
    workflowNotice: string;
    suggestions: Array<{ area: string; action: string }>;
  } | null>(null);

  // Structured Lesson Editor Modal
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonEval, setLessonEval] = useState<QualityEvaluationResult | null>(null);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    summary: '',
    difficulty: 'Beginner',
    durationMinutes: '15',
    contentMarkdown: '',
    visualExplanationMarkdown: '',
    objectivesText: '',
    prerequisitesText: '',
    commonMistakesText: '',
    bestPracticesText: '',
    nextStepGuidance: '',
  });
  const [savingLesson, setSavingLesson] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q,
        reviewStatus: reviewFilter,
        technicalVerified: verifiedFilter,
      });
      const [auditRes, coursesRes] = await Promise.all([
        api.get<MasterCurriculumAudit>('/admin/curriculum/intelligence/audit'),
        api.get<{ courses: CourseAuditSummaryRow[] }>(`/admin/curriculum/intelligence/courses?${qs.toString()}`),
      ]);
      setAudit(auditRes);
      setCourses(coursesRes.courses || []);
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Failed to load curriculum intelligence audit.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [q, reviewFilter, verifiedFilter]);

  const runBulkEvaluate = async () => {
    setBulkEvaluating(true);
    try {
      const res = await api.post<{ ok: boolean; evaluatedCount: number }>(
        '/admin/curriculum/intelligence/evaluate',
        { entityType: 'all' }
      );
      onNotify('ok', `Re-evaluated ${res.evaluatedCount} courses against the 100-point rubric.`);
      await loadData();
      await onMutated?.();
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Bulk evaluation failed.');
    } finally {
      setBulkEvaluating(false);
    }
  };

  const evaluateCourse = async (course: CourseAuditSummaryRow) => {
    try {
      const res = await api.post<{ ok: boolean; evaluation: QualityEvaluationResult }>(
        '/admin/curriculum/intelligence/evaluate',
        { entityType: 'course', entityId: course.courseId }
      );
      setSelectedCourseEval(res.evaluation);
      setSelectedCourseMeta(course);
      setSuggestionResult(null);
      setProgForm({
        difficulty: course.difficulty || 'Beginner',
        skillLevel: (course.difficulty || 'beginner').toLowerCase(),
        progressionModel: 'sequential',
        minCertificateScore: '70',
        requirePracticalProjects: false,
      });
      onNotify('ok', `Evaluated "${course.title}" (${res.evaluation.percentage}%).`);
      await loadData();
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Course evaluation failed.');
    }
  };

  const toggleCourseTechnicalVerify = async (courseId: string, verified: boolean) => {
    try {
      const res = await api.post<{ ok: boolean; evaluation: QualityEvaluationResult }>(
        '/admin/curriculum/intelligence/technical-verify',
        { entityType: 'course', entityId: courseId, verified }
      );
      if (selectedCourseEval && selectedCourseEval.entityId === courseId) {
        setSelectedCourseEval(res.evaluation);
      }
      onNotify(
        'ok',
        verified ? 'Course marked technically verified by reviewer.' : 'Course technical verification cleared.'
      );
      await loadData();
      await onMutated?.();
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Unable to update technical verification.');
    }
  };

  const saveProgressionConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseMeta) return;
    try {
      const res = await api.patch<{ ok: boolean; evaluation: QualityEvaluationResult }>(
        `/admin/courses/${selectedCourseMeta.courseId}/progression`,
        {
          difficulty: progForm.difficulty,
          skillLevel: progForm.skillLevel,
          progressionModel: progForm.progressionModel,
          minCertificateScore: Number(progForm.minCertificateScore || 70),
          requirePracticalProjects: progForm.requirePracticalProjects,
        }
      );
      setSelectedCourseEval(res.evaluation);
      onNotify('ok', 'Course progression & certificate thresholds saved.');
      await loadData();
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Unable to save progression configuration.');
    }
  };

  const loadIntelligenceSuggestions = async (courseId: string, mode: 'plan' | 'ai_draft') => {
    try {
      const res = await api.post<{
        aiUsed: boolean;
        workflowNotice: string;
        suggestions: Array<{ area: string; action: string }>;
      }>('/admin/curriculum/ai-studio/intelligence-suggest', { courseId, mode });
      setSuggestionResult(res);
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Unable to load improvement suggestions.');
    }
  };

  const openLessonEditor = async (lessonId: string) => {
    try {
      const res = await api.get<{
        lesson: Record<string, unknown> & {
          id: string;
          title: string;
          summary: string;
          difficulty?: string;
          duration_minutes?: number;
          content_markdown?: string;
          visual_explanation_markdown?: string;
          next_step_guidance?: string;
          objectives?: string[];
          prerequisites?: string[];
          commonMistakes?: string[];
          bestPractices?: string[];
        };
        evaluation: QualityEvaluationResult;
      }>(`/admin/curriculum/intelligence/lessons/${lessonId}`);
      setEditingLessonId(lessonId);
      setLessonEval(res.evaluation);
      setLessonForm({
        title: res.lesson.title || '',
        summary: res.lesson.summary || '',
        difficulty: res.lesson.difficulty || 'Beginner',
        durationMinutes: String(res.lesson.duration_minutes || 15),
        contentMarkdown: res.lesson.content_markdown || '',
        visualExplanationMarkdown: res.lesson.visual_explanation_markdown || '',
        objectivesText: (res.lesson.objectives || []).join('\n'),
        prerequisitesText: (res.lesson.prerequisites || []).join('\n'),
        commonMistakesText: (res.lesson.commonMistakes || []).join('\n'),
        bestPracticesText: (res.lesson.bestPractices || []).join('\n'),
        nextStepGuidance: res.lesson.next_step_guidance || '',
      });
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Unable to load structured lesson editor.');
    }
  };

  const saveStructuredLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLessonId) return;
    setSavingLesson(true);
    try {
      const splitLines = (raw: string) =>
        raw
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
      const res = await api.put<{ ok: boolean; evaluation: QualityEvaluationResult }>(
        `/admin/curriculum/intelligence/lessons/${editingLessonId}`,
        {
          title: lessonForm.title,
          summary: lessonForm.summary,
          difficulty: lessonForm.difficulty,
          durationMinutes: Number(lessonForm.durationMinutes || 15),
          contentMarkdown: lessonForm.contentMarkdown,
          visualExplanationMarkdown: lessonForm.visualExplanationMarkdown,
          objectives: splitLines(lessonForm.objectivesText),
          prerequisites: splitLines(lessonForm.prerequisitesText),
          commonMistakes: splitLines(lessonForm.commonMistakesText),
          bestPractices: splitLines(lessonForm.bestPracticesText),
          nextStepGuidance: lessonForm.nextStepGuidance,
        }
      );
      setLessonEval(res.evaluation);
      onNotify('ok', `Structured lesson saved (Intelligence Score: ${res.evaluation?.percentage ?? 0}%).`);
      await loadData();
      await onMutated?.();
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Failed to save structured lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  const toggleLessonTechnicalVerify = async (lessonId: string, verified: boolean) => {
    try {
      const res = await api.post<{ ok: boolean; evaluation: QualityEvaluationResult }>(
        '/admin/curriculum/intelligence/technical-verify',
        { entityType: 'lesson', entityId: lessonId, verified }
      );
      setLessonEval(res.evaluation);
      onNotify('ok', verified ? 'Lesson marked technically verified.' : 'Lesson technical verification cleared.');
      await loadData();
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Unable to update lesson verification.');
    }
  };

  return (
    <div data-testid="curriculum-intelligence-tab" className="space-y-6">
      {/* Header & Bulk Action */}
      <div className="bc-panel p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <span>Master Curriculum Audit &amp; 100-Point Intelligence Engine</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Real-time SQLite curriculum inventory, 12-dimension quality scoring, human technical verification, and objective gating.
          </p>
        </div>
        <button
          type="button"
          disabled={bulkEvaluating}
          onClick={runBulkEvaluate}
          className="bc-btn-primary !h-9 !px-4 text-xs whitespace-nowrap"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${bulkEvaluating ? 'animate-spin' : ''}`} />
          <span>{bulkEvaluating ? 'Evaluating...' : 'Re-Evaluate All Courses'}</span>
        </button>
      </div>

      {/* Audit Totals & Findings Summary */}
      {audit && (
        <div className="bc-panel overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
            {[
              { label: 'Categories', val: audit.totals.categories },
              { label: 'Technologies', val: audit.totals.technologies },
              { label: 'Courses (Pub/Total)', val: `${audit.totals.publishedCourses}/${audit.totals.courses}` },
              { label: 'Lessons (Pub/Total)', val: `${audit.totals.publishedLessons}/${audit.totals.lessons}` },
              { label: 'Exercises / Quizzes', val: `${audit.totals.exercises} / ${audit.totals.assessments}` },
              { label: 'Avg Quality Score', val: `${audit.coverage.averageCourseQualityScore}%` },
            ].map((m) => (
              <div key={m.label} className="p-3.5">
                <p className="text-[11px] text-[var(--text-muted)]">{m.label}</p>
                <p className="font-heading text-lg font-bold text-[var(--text-primary)] tabular-nums mt-0.5">{m.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] border-t border-[var(--border-default)] bg-[var(--bg-subtle)]">
            {[
              { label: 'Courses No Objectives', val: audit.findings.coursesMissingObjectives },
              { label: 'Lessons No Objectives', val: audit.findings.lessonsMissingObjectives },
              { label: 'Brief Lessons (<250c)', val: audit.findings.lessonsBriefContent },
              { label: 'Lessons No Blocks', val: audit.findings.lessonsMissingBlocks },
              { label: 'Unverified Courses', val: audit.findings.coursesUnverifiedTechnical },
              { label: 'Unverified Lessons', val: audit.findings.lessonsUnverifiedTechnical },
            ].map((f) => (
              <div key={f.label} className="p-3">
                <p className="text-[11px] text-[var(--text-muted)]">{f.label}</p>
                <p className="text-sm font-bold tabular-nums mt-0.5 text-[var(--status-warning)]">{f.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Automated Curriculum Quality Report */}
      <CurriculumQualityReportPanel
        onNotify={onNotify}
        onOpenLessonEditor={openLessonEditor}
        onInspectCourseId={(cid) => {
          const match = courses.find((c) => c.courseId === cid);
          if (match) {
            void evaluateCourse(match);
          } else {
            onNotify('err', 'Reset course filters above to inspect this course.');
          }
        }}
      />

      {/* Filter Bar */}
      <div className="bc-panel p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter courses or technologies..."
            className="bc-input w-full !h-9 !pl-8 !pr-3 text-xs"
          />
        </div>
        <select
          value={reviewFilter}
          onChange={(e) => setReviewFilter(e.target.value)}
          aria-label="Filter by review status"
          className="bc-select !h-9 px-3 text-xs"
        >
          <option value="all">All Review Statuses</option>
          <option value="Published">Published</option>
          <option value="Approved">Approved</option>
          <option value="Needs Technical Review">Needs Technical Review</option>
          <option value="Needs Editorial Review">Needs Editorial Review</option>
          <option value="Needs Improvement">Needs Improvement</option>
          <option value="Incomplete">Incomplete</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          aria-label="Filter by technical verification"
          className="bc-select !h-9 px-3 text-xs"
        >
          <option value="all">All Technical Verification</option>
          <option value="verified">Technically Verified</option>
          <option value="unverified">Awaiting Verification</option>
        </select>
      </div>

      {/* Main Split: Course Quality Matrix + Selected Course Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div
          className={`${
            selectedCourseEval ? 'lg:col-span-7' : 'lg:col-span-12'
          } bc-table-wrap overflow-hidden`}
        >
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--text-primary)]">Course Quality Matrix ({courses.length})</span>
            <span className="text-[var(--text-muted)]">100-pt rubric · Verification tracked independently</span>
          </div>
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Course &amp; Technology</th>
                  <th>Review Status</th>
                  <th>SME Verified</th>
                  <th className="text-right">Quality</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                      Computing course quality matrix...
                    </td>
                  </tr>
                ) : courses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                      No courses match current filters.
                    </td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.courseId} className="hover:bg-[var(--bg-subtle)]/70">
                      <td>
                        <p className="font-semibold text-[var(--text-primary)]">{c.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {c.technologyName} · {c.difficulty} · Missing {c.missingCount} item(s)
                        </p>
                      </td>
                      <td className="font-medium text-[var(--text-secondary)] whitespace-nowrap">
                        {c.reviewStatus}
                      </td>
                      <td className="whitespace-nowrap">
                        {c.technicalVerified ? (
                          <span className="inline-flex items-center gap-1 text-[var(--status-success)] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <span className="text-[var(--status-warning)] font-medium">Unverified</span>
                        )}
                      </td>
                      <td className="text-right font-mono font-bold tabular-nums text-[var(--text-primary)]">
                        {c.percentage}%
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => evaluateCourse(c)}
                            className="bc-btn-secondary !h-7 !px-2.5 text-xs"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCourseTechnicalVerify(c.courseId, !c.technicalVerified)}
                            className="bc-btn-secondary !h-7 !px-2.5 text-xs !bg-[var(--accent-soft)] !text-[var(--accent-text)] !border-transparent"
                          >
                            {c.technicalVerified ? 'Clear Verify' : 'Mark Verified'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Course 12-Dimension Inspection & Progression Policy */}
        {selectedCourseEval && selectedCourseMeta && (
          <div className="lg:col-span-5 bc-panel p-5 space-y-4 h-fit">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedCourseEval.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                  Score: {selectedCourseEval.score}/{selectedCourseEval.maxScore} ({selectedCourseEval.percentage}%) ·{' '}
                  {selectedCourseEval.reviewStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCourseEval(null);
                  setSelectedCourseMeta(null);
                }}
                className="bc-btn-ghost px-2 py-1 text-xs shrink-0"
              >
                Close
              </button>
            </div>

            <div className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-default)]">
              {selectedCourseEval.dimensions.map((d) => (
                <div
                  key={d.key}
                  className="p-2.5 text-xs flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)]">{d.label}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{d.detail}</p>
                  </div>
                  <span
                    className={`font-mono font-bold tabular-nums shrink-0 ${
                      d.status === 'pass' || d.status === 'exempt'
                        ? 'text-[var(--status-success)]'
                        : d.status === 'partial'
                          ? 'text-[var(--status-warning)]'
                          : 'text-[var(--status-danger)]'
                    }`}
                  >
                    {d.score}/{d.maxScore}
                  </span>
                </div>
              ))}
            </div>

            {/* Progression & Certificate Gate Config */}
            <form onSubmit={saveProgressionConfig} className="pt-3 border-t border-[var(--border-default)] space-y-2.5 text-xs">
              <p className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                <Award className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Progression &amp; Certificate Policy</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={progForm.difficulty}
                  onChange={(e) => setProgForm((p) => ({ ...p, difficulty: e.target.value }))}
                  className="bc-select !h-8 !px-2 text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <select
                  value={progForm.progressionModel}
                  onChange={(e) => setProgForm((p) => ({ ...p, progressionModel: e.target.value }))}
                  className="bc-select !h-8 !px-2 text-xs"
                >
                  <option value="sequential">Sequential</option>
                  <option value="flexible">Flexible</option>
                  <option value="mastery_gated">Mastery Gated</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span>Min Score %:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={progForm.minCertificateScore}
                    onChange={(e) => setProgForm((p) => ({ ...p, minCertificateScore: e.target.value }))}
                    className="bc-input w-16 !h-8 !px-2 text-xs tabular-nums"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={progForm.requirePracticalProjects}
                    onChange={(e) => setProgForm((p) => ({ ...p, requirePracticalProjects: e.target.checked }))}
                  />
                  <span>Require Practical Approval</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="bc-btn-primary !h-8 !px-3 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Policy</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadIntelligenceSuggestions(selectedCourseEval.entityId, 'plan')}
                  className="bc-btn-secondary !h-8 !px-3 text-xs"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Rule Action Plan</span>
                </button>
                <button
                  type="button"
                  onClick={() => loadIntelligenceSuggestions(selectedCourseEval.entityId, 'ai_draft')}
                  className="bc-btn-secondary !h-8 !px-3 text-xs !bg-[var(--accent-soft)] !text-[var(--accent-text)] !border-transparent"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Draft Suggest</span>
                </button>
              </div>
            </form>

            {suggestionResult && (
              <div className="bc-subtle-box p-3 text-xs space-y-1.5">
                <p className="font-semibold text-[var(--accent-text)]">{suggestionResult.workflowNotice}</p>
                {suggestionResult.suggestions.slice(0, 5).map((s, idx) => (
                  <p key={idx} className="text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--text-primary)]">{s.area}:</span> {s.action}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actionable Audit Links -> Direct Jump to Lesson Structured Editor */}
      {audit && audit.actionableLinks.length > 0 && (
        <div className="bc-panel p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <AlertTriangle className="w-4 h-4 text-[var(--status-warning)]" />
              <span>Priority Curriculum Findings ({audit.actionableLinks.length})</span>
            </h3>
            <span className="text-xs text-[var(--text-muted)]">Click any lesson finding to open the Structured Lesson Editor</span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
            {audit.actionableLinks.slice(0, 30).map((item, idx) => (
              <div key={`${item.entityId}-${idx}`} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--text-primary)] truncate">
                    {item.title}
                    {item.courseTitle ? ` · ${item.courseTitle}` : ''}
                  </p>
                  <p className="text-[var(--text-muted)]">
                    {item.entityType} · {item.severity} · {item.issue}
                  </p>
                </div>
                {item.entityType === 'lesson' && (
                  <button
                    type="button"
                    onClick={() => openLessonEditor(item.entityId)}
                    className="bc-btn-secondary !h-8 !px-3 text-xs shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Edit Lesson</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Structured Lesson Intelligence Editor Modal */}
      {editingLessonId && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto flex items-start justify-center">
          <div className="bc-panel max-w-3xl w-full my-6 p-5 sm:p-6 space-y-4 !shadow-[var(--shadow-popover)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Structured Lesson Intelligence Editor</h3>
                {lessonEval && (
                  <p className="text-xs text-[var(--text-secondary)] tabular-nums">
                    Score: {lessonEval.score}/{lessonEval.maxScore} ({lessonEval.percentage}%) · {lessonEval.reviewStatus} ·{' '}
                    {lessonEval.technicalVerified ? 'Technically Verified' : 'Unverified'}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {lessonEval && (
                  <button
                    type="button"
                    onClick={() => toggleLessonTechnicalVerify(editingLessonId, !lessonEval.technicalVerified)}
                    className="bc-btn-secondary !h-8 !px-3 text-xs !bg-[var(--accent-soft)] !text-[var(--accent-text)] !border-transparent"
                  >
                    {lessonEval.technicalVerified ? 'Clear Verification' : 'Verify Technical Accuracy'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Close lesson editor"
                  onClick={() => setEditingLessonId(null)}
                  className="bc-btn-ghost p-1.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <form onSubmit={saveStructuredLesson} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="sm:col-span-2 space-y-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Lesson Title</span>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                    className="bc-input w-full !h-9 text-xs"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="font-semibold text-[var(--text-secondary)]">Level</span>
                    <select
                      value={lessonForm.difficulty}
                      onChange={(e) => setLessonForm((p) => ({ ...p, difficulty: e.target.value }))}
                      className="bc-select w-full !h-9 !px-2 text-xs"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="font-semibold text-[var(--text-secondary)]">Mins</span>
                    <input
                      type="number"
                      min={3}
                      max={240}
                      value={lessonForm.durationMinutes}
                      onChange={(e) => setLessonForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                      className="bc-input w-full !h-9 !px-2 text-xs tabular-nums"
                    />
                  </label>
                </div>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-[var(--text-secondary)]">Lesson Summary</span>
                <input
                  type="text"
                  value={lessonForm.summary}
                  onChange={(e) => setLessonForm((p) => ({ ...p, summary: e.target.value }))}
                  className="bc-input w-full !h-9 text-xs"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Learning Objectives (1 per line)</span>
                  <textarea
                    rows={3}
                    value={lessonForm.objectivesText}
                    onChange={(e) => setLessonForm((p) => ({ ...p, objectivesText: e.target.value }))}
                    className="bc-textarea w-full text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Prerequisites (1 per line)</span>
                  <textarea
                    rows={3}
                    value={lessonForm.prerequisitesText}
                    onChange={(e) => setLessonForm((p) => ({ ...p, prerequisitesText: e.target.value }))}
                    className="bc-textarea w-full text-xs"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-[var(--text-secondary)]">Main Lesson Explanation (Markdown, sanitized on save)</span>
                <textarea
                  rows={5}
                  value={lessonForm.contentMarkdown}
                  onChange={(e) => setLessonForm((p) => ({ ...p, contentMarkdown: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[#0B1018] text-slate-100 font-mono p-3"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-[var(--text-secondary)]">Visual Concept Breakdown (ASCII / Architecture / Flow)</span>
                <textarea
                  rows={2}
                  value={lessonForm.visualExplanationMarkdown}
                  onChange={(e) => setLessonForm((p) => ({ ...p, visualExplanationMarkdown: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[#0B1018] text-cyan-200 font-mono p-2.5"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Common Mistakes (1 per line)</span>
                  <textarea
                    rows={3}
                    value={lessonForm.commonMistakesText}
                    onChange={(e) => setLessonForm((p) => ({ ...p, commonMistakesText: e.target.value }))}
                    className="bc-textarea w-full text-xs"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-[var(--text-secondary)]">Production Best Practices (1 per line)</span>
                  <textarea
                    rows={3}
                    value={lessonForm.bestPracticesText}
                    onChange={(e) => setLessonForm((p) => ({ ...p, bestPracticesText: e.target.value }))}
                    className="bc-textarea w-full text-xs"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-[var(--text-secondary)]">Next Step Guidance</span>
                <input
                  type="text"
                  value={lessonForm.nextStepGuidance}
                  onChange={(e) => setLessonForm((p) => ({ ...p, nextStepGuidance: e.target.value }))}
                  className="bc-input w-full !h-9 text-xs"
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLessonId(null)}
                  className="bc-btn-secondary !h-9 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLesson}
                  className="bc-btn-primary !h-9 !px-5 text-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingLesson ? 'Saving & Evaluating...' : 'Save Structured Lesson'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
