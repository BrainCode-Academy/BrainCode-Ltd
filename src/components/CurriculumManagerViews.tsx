import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileCode2,
  GitBranch,
  History,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import { api, ApiError, getStoredToken } from '../lib/api';
import { resolveTechnologyCapability } from '../../shared/technologyCapabilities';
import { useAuth } from '../context/AuthContext';
import type {
  CoverageStatus,
  CoverageSummary,
  IncompleteCourseSummary,
  QualityCheckReport,
  TechnologyCoverageRow,
} from '../types';
import { CurriculumIntelligenceTab } from './CurriculumIntelligenceTab';

export type CurriculumSubTab = 'coverage' | 'intelligence' | 'ai-studio' | 'batch' | 'review' | 'reports' | 'authoring';

const STATUS_BADGE: Record<CoverageStatus, { label: string; cls: string }> = {
  substantially_complete: { label: 'Substantially Complete', cls: 'bg-[var(--status-success-soft)] text-[var(--status-success)]' },
  published: { label: 'Published (Partial)', cls: 'bg-[var(--accent-soft)] text-[var(--accent-text)]' },
  content_review: { label: 'In Review', cls: 'bg-[var(--bg-muted)] text-[var(--text-primary)]' },
  in_development: { label: 'In Development', cls: 'bg-[var(--status-warning-soft)] text-[var(--status-warning)]' },
  planned: { label: 'Planned (Blueprint)', cls: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]' },
  needs_improvement: { label: 'Needs Improvement', cls: 'bg-[var(--status-danger-soft)] text-[var(--status-danger)]' },
  not_started: { label: 'Not Started', cls: 'bg-[var(--bg-subtle)] text-[var(--text-muted)]' },
};

export function CurriculumGovernanceHub({
  initialSubTab = 'coverage',
  onSubTabChange,
  onCurriculumMutated,
  authoringChildren,
  allTechnologies,
  allCourses,
}: {
  initialSubTab?: CurriculumSubTab;
  onSubTabChange?: (tab: CurriculumSubTab) => void;
  onCurriculumMutated?: () => Promise<void> | void;
  authoringChildren: React.ReactNode;
  allTechnologies: Array<{ id: string; name: string; slug: string; category_id: string }>;
  allCourses: Array<{ id: string; title: string; technology_id: string; status: string }>;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [subTab, setSubTab] = useState<CurriculumSubTab>(initialSubTab);
  const [studioPresetTechId, setStudioPresetTechId] = useState<string>('');
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const switchTab = (next: CurriculumSubTab) => {
    setSubTab(next);
    onSubTabChange?.(next);
  };

  const navItems: Array<{ id: CurriculumSubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'coverage', label: 'Coverage Dashboard', icon: BarChart3 },
    { id: 'intelligence', label: 'Intelligence & Audit', icon: ShieldCheck },
    { id: 'ai-studio', label: 'AI Content Studio', icon: Sparkles },
    { id: 'batch', label: 'Batch Queue', icon: Layers },
    { id: 'review', label: 'QA & Review Queue', icon: ClipboardCheck },
    { id: 'reports', label: 'Reports & Policy', icon: ShieldCheck },
    { id: 'authoring', label: 'Authoring, Package & Grading', icon: FileCode2 },
  ];

  return (
    <div className="space-y-5">
      <div className="bc-panel flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap gap-1.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                subTab === item.id
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <span className="text-[11px] font-medium text-[var(--text-muted)] px-2">
          Master Curriculum &amp; Quality System
        </span>
      </div>

      {banner && (
        <div
          className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            banner.type === 'ok'
              ? 'border-[var(--status-success)]/30 bg-[var(--status-success-soft)] text-[var(--status-success)]'
              : 'border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] text-[var(--status-danger)]'
          }`}
        >
          <span>{banner.text}</span>
          <button type="button" onClick={() => setBanner(null)} className="font-semibold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {subTab === 'coverage' && (
        <CoverageDashboardSection
          onNotify={(type, text) => setBanner({ type, text })}
          onOpenAiStudio={(techId) => {
            setStudioPresetTechId(techId);
            switchTab('ai-studio');
          }}
          onMutated={onCurriculumMutated}
        />
      )}

      {subTab === 'intelligence' && (
        <CurriculumIntelligenceTab
          onNotify={(type, text) => setBanner({ type, text })}
          onMutated={onCurriculumMutated}
        />
      )}

      {subTab === 'ai-studio' && (
        <AiContentStudioSection
          technologies={allTechnologies}
          courses={allCourses}
          presetTechId={studioPresetTechId}
          onNotify={(type, text) => setBanner({ type, text })}
          onSaved={onCurriculumMutated}
        />
      )}

      {subTab === 'batch' && (
        <BatchJobsSection
          technologies={allTechnologies}
          onNotify={(type, text) => setBanner({ type, text })}
          onMutated={onCurriculumMutated}
        />
      )}

      {subTab === 'review' && (
        <QaAndReviewWorkspaceSection
          isAdmin={isAdmin}
          onNotify={(type, text) => setBanner({ type, text })}
          onMutated={onCurriculumMutated}
        />
      )}

      {subTab === 'reports' && (
        <ReportsAndPolicySection
          isAdmin={isAdmin}
          onNotify={(type, text) => setBanner({ type, text })}
        />
      )}

      {subTab === 'authoring' && (
        <div className="space-y-6">
          <StructuredPackageImportCard
            isAdmin={isAdmin}
            onNotify={(type, text) => setBanner({ type, text })}
            onImported={onCurriculumMutated}
          />
          {authoringChildren}
        </div>
      )}
    </div>
  );
}

// =========================================================
// 1. COVERAGE DASHBOARD (PHASE 2)
// =========================================================
function CoverageDashboardSection({
  onNotify,
  onOpenAiStudio,
  onMutated,
}: {
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onOpenAiStudio: (techId: string) => void;
  onMutated?: () => Promise<void> | void;
}) {
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [rows, setRows] = useState<TechnologyCoverageRow[]>([]);
  const [incompleteCourses, setIncompleteCourses] = useState<IncompleteCourseSummary[]>([]);
  const [showIncompleteCourses, setShowIncompleteCourses] = useState(false);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [contentStatus, setContentStatus] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [missingContent, setMissingContent] = useState('all');
  const [sort, setSort] = useState('completeness_desc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        q,
        category,
        contentStatus,
        difficulty,
        missingContent,
        sort,
        limit: String(pageSize),
        offset: String(page * pageSize),
      });
      const res = await api.get<any>(`/admin/curriculum/coverage?${qs.toString()}`);
      setSummary(res.summary);
      setCategories(res.categories || []);
      setRows(res.technologies || []);
      setIncompleteCourses(res.incompleteCourses || []);
      setTotalFiltered(res.totalFiltered || 0);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Failed to load curriculum coverage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [q, category, contentStatus, difficulty, missingContent, sort, page]);

  const inspectTechnology = async (techId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<any>(`/admin/curriculum/technologies/${techId}/report`);
      setSelectedDetail(res);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Unable to load technology report.');
    } finally {
      setDetailLoading(false);
    }
  };

  const instantiateDraftFromBlueprint = async (blueprintId: string) => {
    try {
      const res = await api.post<any>(`/admin/curriculum/blueprints/${blueprintId}/instantiate-draft`, {});
      onNotify('ok', `Created draft course container "${res.slug}" from blueprint.`);
      await load();
      await onMutated?.();
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Could not instantiate blueprint draft.');
    }
  };

  return (
    <div className="space-y-5">
      {summary && (
        <div className="space-y-3">
          <div className="bc-panel overflow-hidden divide-y divide-[var(--border-subtle)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
              {[
                { label: 'Total Technologies', val: summary.totalTechnologies },
                { label: 'Awaiting Content', val: summary.technologiesAwaitingContent ?? summary.byStatus.planned + summary.byStatus.not_started },
                { label: 'Currently Generating', val: summary.technologiesCurrentlyGenerating ?? 0 },
                { label: 'Substantial Complete', val: summary.byStatus.substantially_complete },
                { label: 'Production Progress', val: `${summary.productionProgressPct ?? 0}%` },
                { label: 'Avg Completeness', val: `${summary.averageCompleteness}%` },
              ].map((k) => (
                <div key={k.label} className="px-4 py-3">
                  <p className="text-[11px] text-[var(--text-muted)]">{k.label}</p>
                  <p className="text-lg font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">{k.val}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] bg-[var(--bg-subtle)]">
              {[
                { label: 'Published Lessons', val: summary.publishedLessons },
                { label: 'Lessons in Review', val: summary.lessonsAwaitingReview ?? summary.reviewLessons },
                { label: 'Incomplete Courses', val: summary.incompleteCoursesCount ?? incompleteCourses.length },
                { label: 'QA Failures', val: summary.qaFailuresCount ?? 0 },
                { label: 'Techs w/ Exercises', val: `${summary.exerciseCoverageCount ?? 0}/${summary.totalTechnologies}` },
                { label: 'Techs w/ Quiz / Proj', val: `${summary.assessmentCoverageCount ?? 0} / ${summary.projectCoverageCount ?? 0}` },
              ].map((k) => (
                <div key={k.label} className="px-4 py-2.5">
                  <p className="text-[11px] text-[var(--text-muted)]">{k.label}</p>
                  <p className="text-sm font-semibold tabular-nums mt-0.5 text-[var(--text-primary)]">{k.val}</p>
                </div>
              ))}
            </div>
          </div>

          {incompleteCourses.length > 0 && (
            <div className="bc-panel px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  Incomplete or Draft Courses Requiring Completion / Review ({incompleteCourses.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowIncompleteCourses((prev) => !prev)}
                  className="text-[var(--accent-text)] font-semibold cursor-pointer"
                >
                  {showIncompleteCourses ? 'Hide Course List' : 'Inspect Course Gaps'}
                </button>
              </div>
              {showIncompleteCourses && (
                <div className="mt-3 max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {incompleteCourses.map((c) => (
                    <div key={c.courseId} className="py-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">{c.title}</span>{' '}
                        <span className="text-[var(--text-muted)]">({c.technologyName})</span>
                        <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                          Workflow: {c.workflowStatus} · Published Lessons: {c.publishedLessons} · Pending Draft/Review: {c.draftOrReviewLessons} · Ex: {c.exercisesCount} · Quiz: {c.quizzesCount} · Proj: {c.projectsCount}
                        </p>
                      </div>
                      <span className="font-bold tabular-nums text-[var(--text-primary)]">{c.completenessScore}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bc-panel p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setPage(0);
            setQ(e.target.value);
          }}
          placeholder="Search technology..."
          className="bc-input !h-9 !text-xs w-full"
        />
        <select
          value={category}
          onChange={(e) => {
            setPage(0);
            setCategory(e.target.value);
          }}
          className="bc-select !h-9 !text-xs w-full"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={contentStatus}
          onChange={(e) => {
            setPage(0);
            setContentStatus(e.target.value);
          }}
          className="bc-select !h-9 !text-xs w-full"
        >
          <option value="all">All Coverage Statuses</option>
          <option value="substantially_complete">Substantially Complete</option>
          <option value="published">Published (Partial)</option>
          <option value="content_review">In Review</option>
          <option value="in_development">In Development</option>
          <option value="planned">Planned (Blueprint Only)</option>
          <option value="needs_improvement">Needs Improvement</option>
          <option value="not_started">Not Started</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => {
            setPage(0);
            setDifficulty(e.target.value);
          }}
          className="bc-select !h-9 !text-xs w-full"
        >
          <option value="all">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <select
          value={missingContent}
          onChange={(e) => {
            setPage(0);
            setMissingContent(e.target.value);
          }}
          className="bc-select !h-9 !text-xs w-full"
        >
          <option value="all">All Gap Checks</option>
          <option value="no_courses">Missing Courses</option>
          <option value="no_exercises">Missing Exercises</option>
          <option value="no_quizzes">Missing Quizzes</option>
          <option value="no_projects">Missing Projects</option>
          <option value="qa_issues">Has QA Failures</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bc-select !h-9 !text-xs w-full"
        >
          <option value="completeness_desc">Highest Completeness</option>
          <option value="completeness_asc">Lowest Completeness</option>
          <option value="lessons_desc">Most Published Lessons</option>
          <option value="name_asc">Alphabetical (A–Z)</option>
          <option value="recent_desc">Recently Updated</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className={`${selectedDetail ? 'lg:col-span-7' : 'lg:col-span-12'} bc-panel overflow-hidden`}>
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              Showing {rows.length} of {totalFiltered} technologies (Page {page + 1})
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="bc-btn-secondary !h-7 !px-2.5 !text-xs disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={(page + 1) * pageSize >= totalFiltered}
                onClick={() => setPage((p) => p + 1)}
                className="bc-btn-secondary !h-7 !px-2.5 !text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Technology</th>
                  <th>Status</th>
                  <th className="text-right">Score</th>
                  <th className="text-right">Courses (P/D)</th>
                  <th className="text-right">Lessons (P/D)</th>
                  <th className="text-right">Ex / Quiz / Prj</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                      Computing real-time SQL coverage metrics...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-muted)]">
                      No technologies match current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const badge = STATUS_BADGE[r.calculatedStatus];
                    return (
                      <tr key={r.technologyId} className="hover:bg-[var(--bg-subtle)]/60">
                        <td>
                          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
                            <span>{r.name}</span>
                            {r.currentlyGenerating && (
                              <span className="px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-text)] text-[10px]">
                                Generating
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {r.categoryName} · {r.blueprintTopicsCount} topics ·{' '}
                            {resolveTechnologyCapability({ id: r.technologyId, slug: r.slug, name: r.name, categoryId: r.categoryId, categoryName: r.categoryName }).environmentLabel}
                            {r.lastUpdatedAt ? ` · Updated ${r.lastUpdatedAt.slice(0, 10)}` : ''}
                          </div>
                        </td>
                        <td>
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {r.editorialStage && (
                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5 capitalize">
                              Stage: {r.editorialStage.replace(/_/g, ' ')}
                            </div>
                          )}
                        </td>
                        <td className="text-right font-bold tabular-nums text-[var(--text-primary)]">{r.completenessScore}%</td>
                        <td className="text-right tabular-nums text-[var(--text-secondary)]">
                          {r.publishedCourses}/{r.draftCourses}
                        </td>
                        <td className="text-right tabular-nums text-[var(--text-secondary)]">
                          {r.publishedLessons}/{r.draftLessons + r.reviewLessons}
                        </td>
                        <td className="text-right tabular-nums text-[var(--text-secondary)]">
                          {r.exercisesCount} / {r.quizzesCount} / {r.projectsCount}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => inspectTechnology(r.technologyId)}
                              className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenAiStudio(r.technologyId)}
                              className="bc-btn-ghost !h-7 !px-2.5 !text-[11px] text-[var(--accent-text)] font-semibold"
                            >
                              AI Draft
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Technology Inspection Drawer */}
        {selectedDetail && (
          <div className="lg:col-span-5 bc-panel p-5 space-y-4 h-fit">
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{selectedDetail.technology?.name} Coverage Report</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedDetail.technology?.category_name} · Status: {selectedDetail.coverage?.calculatedStatus} ({selectedDetail.coverage?.completenessScore}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="bc-btn-ghost px-2 py-1 text-xs"
              >
                Close
              </button>
            </div>

            {detailLoading ? (
              <p className="text-xs text-[var(--text-muted)]">Loading blueprint and completeness rules...</p>
            ) : (
              <>
                {selectedDetail.courses?.length === 0 ? (
                  <div className="p-3.5 rounded-lg border border-[var(--status-warning)]/30 bg-[var(--status-warning-soft)] text-xs space-y-2">
                    <p className="font-semibold text-[var(--status-warning)]">
                      No authored courses exist yet for {selectedDetail.technology?.name}.
                    </p>
                    {selectedDetail.blueprint && (
                      <button
                        type="button"
                        onClick={() => instantiateDraftFromBlueprint(selectedDetail.blueprint.id)}
                        className="bc-btn-primary !h-8 !px-3 !text-xs"
                      >
                        Instantiate Draft Course from Blueprint
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                      Course Completeness Evaluations ({selectedDetail.courses.length})
                    </h4>
                    <div className="divide-y divide-[var(--border-subtle)] border-t border-b border-[var(--border-subtle)]">
                      {selectedDetail.courses.map((ce: any) => (
                        <div key={ce.entityId} className="py-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--text-primary)]">{ce.title}</span>
                            <span className="font-bold tabular-nums text-[var(--text-primary)]">{ce.percentage}%</span>
                          </div>
                          {ce.missingRequirements?.length > 0 && (
                            <p className="text-[var(--status-warning)]">
                              Missing: {ce.missingRequirements.join(', ')}
                            </p>
                          )}
                          {ce.recommendedActions?.length > 0 && (
                            <p className="text-[var(--text-muted)]">
                              Next: {ce.recommendedActions[0]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDetail.blueprint && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-[var(--text-muted)]">
                      Curriculum Blueprint ({selectedDetail.blueprint.modules?.length || 0} Modules)
                    </h4>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)] pr-1">
                      {(selectedDetail.blueprint.modules || []).map((mod: any, idx: number) => (
                        <div key={idx} className="py-2.5 text-xs">
                          <p className="font-semibold text-[var(--text-primary)]">{mod.title}</p>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-[var(--text-secondary)] list-disc list-inside">
                            {(mod.topics || []).map((t: string, ti: number) => (
                              <li key={ti}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// 2. AI-ASSISTED CONTENT PRODUCTION STUDIO (PHASE 5)
// =========================================================
function AiContentStudioSection({
  technologies,
  courses,
  presetTechId,
  onNotify,
  onSaved,
}: {
  technologies: Array<{ id: string; name: string; slug: string; category_id: string }>;
  courses: Array<{ id: string; title: string; technology_id: string; status: string }>;
  presetTechId?: string;
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onSaved?: () => Promise<void> | void;
}) {
  const [techId, setTechId] = useState(presetTechId || technologies[0]?.id || 'tech_python');
  const [courseId, setCourseId] = useState('');
  const [targetType, setTargetType] = useState<string>('full_lesson');
  const [difficultyMode, setDifficultyMode] = useState<string>('Beginner');
  const [targetAudience, setTargetAudience] = useState('Self-paced web and software developers');
  const [lessonTitle, setLessonTitle] = useState('');
  const [objectivesText, setObjectivesText] = useState('');
  const [count, setCount] = useState(3);

  const [quota, setQuota] = useState<{ usedToday: number; dailyLimit: number; remaining: number } | null>(null);
  const [aiConfigured, setAiConfigured] = useState<boolean>(true);
  const [aiHealth, setAiHealth] = useState<{
    status: string;
    lastErrorCode: string | null;
    lastErrorMessage: string | null;
    lastCheckedAt?: string | null;
    modelName?: string;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftJsonText, setDraftJsonText] = useState('');
  const [lastModel, setLastModel] = useState('');

  useEffect(() => {
    if (presetTechId) setTechId(presetTechId);
  }, [presetTechId]);

  const refreshQuota = async () => {
    try {
      const res = await api.get<any>('/admin/curriculum/ai-studio/quota');
      setQuota(res.quota);
      setAiConfigured(Boolean(res.aiConfigured));
      if (res.aiStatus) setAiHealth(res.aiStatus);
    } catch {
      // Ignore
    }
  };

  const probeAiHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await api.post<any>('/admin/ai/health-check', {});
      if (res.health) setAiHealth(res.health);
      setAiConfigured(Boolean(res.configured));
      onNotify(
        res.ok ? 'ok' : 'err',
        res.ok
          ? `AI model ${res.health?.modelName || ''} responded cleanly.`
          : res.health?.lastErrorMessage || 'AI service unavailable.'
      );
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Unable to probe AI health.');
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    refreshQuota();
  }, []);

  const filteredCourses = courses.filter((c) => c.technology_id === techId);

  const runGenerate = async (regenerateSection?: string) => {
    setGenerating(true);
    try {
      let existingDraftJson: Record<string, unknown> | undefined;
      if (regenerateSection && draftJsonText.trim()) {
        existingDraftJson = JSON.parse(draftJsonText);
      }
      const res = await api.post<any>('/admin/curriculum/ai-studio/generate', {
        technologyId: techId,
        courseId: courseId || undefined,
        targetType,
        difficultyMode,
        targetAudience,
        lessonTitle: lessonTitle.trim() || undefined,
        count,
        learningObjectives: objectivesText.split('\n').map((s) => s.trim()).filter(Boolean),
        regenerateSection,
        existingDraftJson,
      });
      setDraftJsonText(JSON.stringify(res.draft, null, 2));
      setLastModel(res.model || '');
      if (res.quota) setQuota(res.quota);
      onNotify('ok', res.workflowNotice || 'AI draft generated. Review/edit before saving as Draft.');
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'AI generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(draftJsonText);
      const res = await api.post<any>('/admin/curriculum/ai-studio/save-draft', {
        technologyId: techId,
        courseId: courseId || undefined,
        targetType,
        draft: parsed,
      });
      onNotify(
        'ok',
        `Saved "${res.saved.title}" strictly as DRAFT (QA Status: ${res.saved.qaStatus}). Submit for Instructor Review before publishing.`
      );
      await onSaved?.();
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : (e as Error).message || 'Could not save draft.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-5 bc-panel p-5 space-y-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">AI Curriculum Studio</h2>
            <p className="text-[var(--text-muted)] mt-0.5">
              Generate structured educational drafts via server-side Gemini. Never auto-published.
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {quota && (
              <span className="px-2.5 py-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
                Quota: {quota.remaining}/{quota.dailyLimit}
              </span>
            )}
            <button
              type="button"
              disabled={checkingHealth}
              onClick={probeAiHealth}
              className="bc-btn-secondary !h-7 !px-2.5 !text-[11px] disabled:opacity-50"
            >
              {checkingHealth ? 'Checking...' : 'Test AI Health'}
            </button>
          </div>
        </div>

        {(!aiConfigured || aiHealth?.status === 'degraded' || aiHealth?.status === 'unconfigured') && (
          <div className="p-3 rounded-lg border border-[var(--status-warning)]/30 bg-[var(--status-warning-soft)] text-[var(--status-warning)] space-y-1">
            <p className="font-semibold inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                {!aiConfigured
                  ? 'AI Service Not Configured (AI_NOT_CONFIGURED)'
                  : `AI Service Degraded (${aiHealth?.lastErrorCode || 'UNAVAILABLE'})`}
              </span>
            </p>
            <p className="text-[11px]">
              {aiHealth?.lastErrorMessage ||
                'GEMINI_API_KEY is not configured in the server environment. Non-retryable configuration/billing errors fail cleanly without wasteful retries.'}
            </p>
          </div>
        )}
        {aiConfigured && aiHealth?.status === 'healthy' && (
          <div className="p-2.5 rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] text-[var(--status-success)] text-[11px] font-medium inline-flex items-center gap-1.5 w-full">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>AI model ready ({aiHealth.modelName || lastModel || 'Gemini'})</span>
          </div>
        )}

        <div className="space-y-2.5">
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Technology</span>
            <select
              value={techId}
              onChange={(e) => {
                setTechId(e.target.value);
                setCourseId('');
              }}
              className="bc-select !h-9 !text-xs w-full"
            >
              {technologies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Target Course (optional — creates Draft track if empty)</span>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="bc-select !h-9 !text-xs w-full"
            >
              <option value="">Auto-select or create Draft course</option>
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="font-semibold text-[var(--text-secondary)]">Content Type</span>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="bc-select !h-9 !text-xs w-full"
              >
                <option value="full_lesson">Full 12-Part Lesson</option>
                <option value="course_outline">Course &amp; Module Outline</option>
                <option value="module_outline">Module &amp; Topic Outline</option>
                <option value="code_examples">Code Examples</option>
                <option value="exercises">Interactive Exercises</option>
                <option value="quiz">Quiz Questions</option>
                <option value="assignment">Practical Assignment</option>
                <option value="project_template">Project Template</option>
                <option value="reference_summary">Reference Summary</option>
                <option value="revision_notes">Revision Study Notes</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="font-semibold text-[var(--text-secondary)]">Pedagogy Mode</span>
              <select
                value={difficultyMode}
                onChange={(e) => setDifficultyMode(e.target.value)}
                className="bc-select !h-9 !text-xs w-full"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional">Professional</option>
                <option value="Exam preparation">Exam preparation</option>
                <option value="Project-based learning">Project-based learning</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="sm:col-span-2 block space-y-1">
              <span className="font-semibold text-[var(--text-secondary)]">Topic / Lesson Focus</span>
              <input
                type="text"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
                placeholder="e.g., Smart Pointers & RAII"
                className="bc-input !h-9 !text-xs w-full"
              />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-[var(--text-secondary)]">Item Count</span>
              <input
                type="number"
                min={1}
                max={10}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="bc-input !h-9 !text-xs w-full tabular-nums"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Target Audience</span>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="bc-input !h-9 !text-xs w-full"
            />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Learning Objectives (optional, one per line)</span>
            <textarea
              rows={2}
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              placeholder="Understand RAII lifetime guarantees&#10;Replace raw new/delete with unique_ptr"
              className="bc-textarea !text-xs w-full"
            />
          </label>

          <button
            type="button"
            disabled={generating}
            onClick={() => runGenerate()}
            className="bc-btn-primary w-full"
          >
            <Bot className="w-4 h-4" />
            <span>{generating ? 'Generating Structured Draft...' : 'Generate Curriculum Draft'}</span>
          </button>
        </div>
      </div>

      {/* Editable Preview & Section Regeneration */}
      <div className="lg:col-span-7 bc-panel p-5 space-y-3.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Editable Draft Preview {lastModel ? `(${lastModel})` : ''}</h3>
            <p className="text-[var(--text-muted)]">
              Edit JSON fields directly or regenerate specific sections before persisting to SQLite as a Draft.
            </p>
          </div>
          {draftJsonText && (
            <div className="flex flex-wrap gap-1.5">
              {['code_examples', 'common_mistakes', 'quick_check_questions'].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  disabled={generating}
                  onClick={() => runGenerate(sec)}
                  className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
                >
                  Regen {sec.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        <textarea
          rows={18}
          value={draftJsonText}
          onChange={(e) => setDraftJsonText(e.target.value)}
          placeholder='Generated structured curriculum JSON appears here for inspection and editing before saving as Draft...'
          className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-3 font-mono text-[11px] focus:outline-none focus:border-[var(--accent-primary)]"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--text-muted)]">
            Saved records receive `is_ai_generated = 1`, `workflow_status = "draft"`, and automatic QA validation.
          </span>
          <button
            type="button"
            disabled={saving || !draftJsonText.trim()}
            onClick={saveDraft}
            className="bc-btn-primary !bg-emerald-600 hover:!bg-emerald-700 !h-9 disabled:opacity-40"
          >
            {saving ? 'Saving Draft...' : 'Save Strictly as Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// 3. BATCH GENERATION ENGINE (PHASE 6)
// =========================================================
function BatchJobsSection({
  technologies,
  onNotify,
  onMutated,
}: {
  technologies: Array<{ id: string; name: string }>;
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onMutated?: () => Promise<void> | void;
}) {
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);
  const [techFilter, setTechFilter] = useState('');
  const [difficultyMode, setDifficultyMode] = useState('Beginner');
  const [maxLessonsPerTech, setMaxLessonsPerTech] = useState(3);
  const [jobs, setJobs] = useState<any[]>([]);
  const [activeDetail, setActiveDetail] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ aiConfigured: boolean; modelName: string; remaining?: number } | null>(null);

  const loadJobs = async () => {
    try {
      const [jobsRes, quotaRes] = await Promise.all([
        api.get<{ jobs: any[] }>('/admin/curriculum/ai-jobs'),
        api.get<any>('/admin/curriculum/ai-studio/quota'),
      ]);
      setJobs(jobsRes.jobs || []);
      setAiStatus({
        aiConfigured: Boolean(quotaRes.aiConfigured),
        modelName: quotaRes.modelName || quotaRes.quota?.modelName || 'gemini-4-hydrogen',
        remaining: quotaRes.quota?.remaining,
      });
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const selectBatchPreset = (names: string[]) => {
    const wanted = new Set(names.map((n) => n.toLowerCase()));
    const matched = technologies.filter((t) => wanted.has(t.name.toLowerCase())).map((t) => t.id);
    setSelectedTechIds(matched.slice(0, 10));
  };

  const inspectJob = async (jobId: string) => {
    try {
      const res = await api.get<any>(`/admin/curriculum/ai-jobs/${jobId}`);
      setActiveDetail(res);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Unable to load job details.');
    }
  };

  const [duplicateConflictHint, setDuplicateConflictHint] = useState<string | null>(null);

  const launchJob = async (startImmediately: boolean) => {
    if (selectedTechIds.length === 0) {
      onNotify('err', 'Select at least one technology for batch generation.');
      return;
    }
    setRunning(true);
    setDuplicateConflictHint(null);
    try {
      const res = await api.post<any>('/admin/curriculum/ai-jobs', {
        technologyIds: selectedTechIds,
        difficultyMode,
        maxLessonsPerTech,
        startImmediately,
        batchSliceSize: 3,
      });
      setActiveDetail(res);
      await loadJobs();
      await onMutated?.();
      onNotify('ok', `Batch job ${res.job.id} created (Status: ${res.job.status}).`);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Batch job creation failed.';
      if (e instanceof ApiError && e.status === 409) {
        setDuplicateConflictHint(msg);
      }
      onNotify('err', msg);
    } finally {
      setRunning(false);
    }
  };

  const jobAction = async (jobId: string, action: 'resume' | 'pause' | 'retry' | 'cancel') => {
    setRunning(true);
    try {
      const res = await api.post<any>(`/admin/curriculum/ai-jobs/${jobId}/${action}`, { batchSliceSize: 3 });
      setActiveDetail(res);
      await loadJobs();
      await onMutated?.();
      onNotify('ok', `Batch job ${jobId} ${action}d (Status: ${res.job.status}).`);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : `Job ${action} failed.`);
    } finally {
      setRunning(false);
    }
  };

  const visibleTechs = technologies
    .filter((t) => !techFilter.trim() || t.name.toLowerCase().includes(techFilter.toLowerCase()))
    .slice(0, 40);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
      <div className="lg:col-span-5 bc-panel p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Batch Blueprint Production Queue</h2>
          {aiStatus && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                aiStatus.aiConfigured
                  ? 'bg-[var(--status-success-soft)] text-[var(--status-success)]'
                  : 'bg-[var(--status-warning-soft)] text-[var(--status-warning)]'
              }`}
            >
              {aiStatus.aiConfigured ? `Model Ready: ${aiStatus.modelName}` : `API Key Missing (${aiStatus.modelName})`}
            </span>
          )}
        </div>
        <p className="text-[var(--text-muted)]">
          Queue draft lessons from persisted technology blueprints with automatic duplicate-job protection, duplicate-item skipping, safe failure pausing, and Pause/Resume/Cancel controls.
        </p>
        {duplicateConflictHint && (
          <div className="p-2.5 rounded-lg border border-[var(--status-warning)]/30 bg-[var(--status-warning-soft)] text-[var(--status-warning)] text-[11px]">
            {duplicateConflictHint}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => selectBatchPreset(['HTML', 'CSS', 'JavaScript'])}
            className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
          >
            Batch 1: Web Core
          </button>
          <button
            type="button"
            onClick={() => selectBatchPreset(['Python', 'React', 'TypeScript'])}
            className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
          >
            Batch 2: App Stack
          </button>
          <button
            type="button"
            onClick={() => selectBatchPreset(['Node.js', 'SQL', 'Java', 'C++'])}
            className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
          >
            Batch 3: Systems &amp; Data
          </button>
          {selectedTechIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTechIds([])}
              className="bc-btn-ghost !h-7 !px-2 !text-[11px]"
            >
              Clear ({selectedTechIds.length})
            </button>
          )}
        </div>

        <input
          type="text"
          value={techFilter}
          onChange={(e) => setTechFilter(e.target.value)}
          placeholder="Filter technologies..."
          className="bc-input !h-9 !text-xs w-full"
        />
        <div className="max-h-44 overflow-y-auto border border-[var(--border-default)] rounded-lg bg-[var(--bg-subtle)] p-2 space-y-1">
          {visibleTechs.map((t) => {
            const checked = selectedTechIds.includes(t.id);
            return (
              <label key={t.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-surface)] cursor-pointer text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSelectedTechIds((prev) =>
                      checked ? prev.filter((x) => x !== t.id) : prev.length < 10 ? [...prev, t.id] : prev
                    )
                  }
                />
                <span>{t.name}</span>
              </label>
            );
          })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <select
            value={difficultyMode}
            onChange={(e) => setDifficultyMode(e.target.value)}
            className="bc-select !h-9 !text-xs w-full"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <input
            type="number"
            min={1}
            max={12}
            value={maxLessonsPerTech}
            onChange={(e) => setMaxLessonsPerTech(Number(e.target.value))}
            className="bc-input !h-9 !text-xs w-full tabular-nums"
            title="Max blueprint lessons per technology"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={running}
            onClick={() => launchJob(false)}
            className="bc-btn-secondary flex-1 !h-9 !text-xs"
          >
            Queue Job Only
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => launchJob(true)}
            className="bc-btn-primary flex-1 !h-9 !text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{running ? 'Running...' : 'Queue & Process Batch'}</span>
          </button>
        </div>
      </div>

      <div className="lg:col-span-7 bc-panel p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Persistent Job History ({jobs.length})</h3>
          <button type="button" onClick={loadJobs} className="bc-btn-ghost text-[var(--accent-text)] font-semibold px-2 py-1 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <div className="max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)]">
          {jobs.length === 0 ? (
            <p className="text-[var(--text-muted)] py-4">No batch jobs created yet.</p>
          ) : (
            jobs.map((j) => (
              <div key={j.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono font-bold text-[var(--text-primary)]">{j.id}</span> ·{' '}
                  <span className="uppercase font-semibold text-[var(--text-secondary)]">{j.status}</span>
                  <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                    Total: {j.total_items} · Completed: {j.completed_items} · Skipped Dup: {j.skipped_items} · Failed: {j.failed_items} · Tokens: {j.tokens_used_est}
                  </p>
                  {j.error_message && (
                    <p className="text-[11px] text-[var(--status-warning)] mt-0.5">{j.error_message}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => inspectJob(j.id)}
                    className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
                  >
                    Items
                  </button>
                  {(j.status === 'queued' || j.status === 'running') && (
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => jobAction(j.id, 'pause')}
                      className="bc-btn-secondary !h-7 !px-2.5 !text-[11px] text-[var(--status-warning)]"
                    >
                      <Pause className="w-3 h-3" /> Pause
                    </button>
                  )}
                  {(j.status === 'queued' || j.status === 'paused' || j.status === 'partial_failed') && (
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => jobAction(j.id, 'resume')}
                      className="bc-btn-primary !h-7 !px-2.5 !text-[11px]"
                    >
                      Resume
                    </button>
                  )}
                  {(j.failed_items > 0 || j.status === 'failed' || j.status === 'partial_failed' || j.status === 'cancelled') && (
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => jobAction(j.id, 'retry')}
                      className="bc-btn-primary !bg-emerald-600 hover:!bg-emerald-700 !h-7 !px-2.5 !text-[11px]"
                    >
                      <RotateCcw className="w-3 h-3" /> Retry
                    </button>
                  )}
                  {j.status !== 'completed' && j.status !== 'cancelled' && (
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => jobAction(j.id, 'cancel')}
                      className="bc-btn-danger !h-7 !px-2.5 !text-[11px]"
                    >
                      <XCircle className="w-3 h-3" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {activeDetail && (
          <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
            <p className="font-bold text-[var(--text-primary)]">Job Items: {activeDetail.job.id} ({activeDetail.job.status})</p>
            <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3">
              {(activeDetail.items || []).map((it: any) => (
                <div key={it.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)]">{it.technology_name}:</span> {it.lesson_title}
                    {it.error_message && <p className="text-[11px] text-[var(--status-danger)]">{it.error_message}</p>}
                  </div>
                  <span className="font-mono text-[11px] uppercase text-[var(--text-muted)] shrink-0">{it.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================
// 4. QA & INSTRUCTOR REVIEW WORKSPACE (PHASES 7, 8 & 9)
// =========================================================
function QaAndReviewWorkspaceSection({
  isAdmin,
  onNotify,
  onMutated,
}: {
  isAdmin: boolean;
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onMutated?: () => Promise<void> | void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [reviewers, setReviewers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [aiOnly, setAiOnly] = useState(false);

  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qaReport, setQaReport] = useState<QualityCheckReport | null>(null);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [assignId, setAssignId] = useState('');

  const loadQueue = async () => {
    try {
      const qs = new URLSearchParams({
        status: statusFilter,
        entityType: entityTypeFilter,
        aiOnly: aiOnly ? '1' : '0',
      });
      const res = await api.get<any>(`/admin/curriculum/review-queue?${qs.toString()}`);
      setItems(res.items || []);
      setReviewers(res.reviewers || []);
      if (res.reviewers?.length && !assignId) setAssignId(res.reviewers[0].id);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Unable to load review queue.');
    }
  };

  useEffect(() => {
    loadQueue();
  }, [statusFilter, entityTypeFilter, aiOnly]);

  const inspectItem = async (item: any) => {
    setSelectedItem(item);
    setReviewComment(item.review_notes || '');
    try {
      const [qaRes, revRes, histRes] = await Promise.all([
        api.get<any>(`/admin/curriculum/qa/${item.entity_type}/${item.id}`),
        api.get<any>(`/admin/curriculum/revisions/${item.entity_type}/${item.id}`),
        api.get<any>(`/admin/curriculum/review-history/${item.entity_type}/${item.id}`),
      ]);
      const latest = qaRes.reports?.[0];
      setQaReport(
        latest
          ? {
              id: latest.id,
              entityType: latest.entity_type,
              entityId: latest.entity_id,
              validationStatus: latest.validation_status,
              score: latest.score,
              missingSections: latest.missingSections || [],
              educationalWarnings: latest.educationalWarnings || [],
              technicalWarnings: latest.technicalWarnings || [],
              checksDetail: latest.checksDetail || [],
              checkedAt: latest.checked_at,
              staticInspectionNote: 'Static syntax & structure inspection.',
            }
          : null
      );
      setRevisions(revRes.revisions || []);
      setHistory(histRes.history || []);
    } catch {
      // Ignore
    }
  };

  const runQa = async (item: any) => {
    try {
      const res = await api.post<{ report: QualityCheckReport }>('/admin/curriculum/qa/run', {
        entityType: item.entity_type,
        entityId: item.id,
      });
      setQaReport(res.report);
      await loadQueue();
      onNotify('ok', `QA Check finished: ${res.report.validationStatus.toUpperCase()} (${res.report.score}%).`);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'QA execution failed.');
    }
  };

  const triggerReviewAction = async (action: string) => {
    if (!selectedItem) return;
    try {
      const res = await api.post<any>(`/admin/curriculum/review/${selectedItem.entity_type}/${selectedItem.id}`, {
        action,
        comment: reviewComment,
        assignedReviewerId: action === 'assign_reviewer' ? assignId : undefined,
      });
      onNotify('ok', `Workflow action "${action}" applied -> Status: ${res.workflowStatus}.`);
      await loadQueue();
      await inspectItem({ ...selectedItem, workflow_status: res.workflowStatus });
      await onMutated?.();
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Review transition blocked.');
    }
  };

  const restoreRevision = async (revisionId: string) => {
    try {
      const res = await api.post<any>(`/admin/curriculum/revisions/${revisionId}/restore`, {});
      onNotify('ok', `Restored version v${res.restoredVersion} cleanly (learner progress & certificates preserved).`);
      await inspectItem(selectedItem);
      await onMutated?.();
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Restore failed.');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="bc-panel p-4 flex flex-wrap items-center gap-3">
        <select
          value={entityTypeFilter}
          onChange={(e) => setEntityTypeFilter(e.target.value)}
          className="bc-select !h-9 !text-xs w-full sm:w-auto"
        >
          <option value="all">All Entities (Courses &amp; Lessons)</option>
          <option value="course">Courses Only</option>
          <option value="lesson">Lessons Only</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bc-select !h-9 !text-xs w-full sm:w-auto"
        >
          <option value="all">All Workflow States</option>
          <option value="draft">Draft</option>
          <option value="review">In Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
        <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--text-secondary)]">
          <input type="checkbox" checked={aiOnly} onChange={(e) => setAiOnly(e.target.checked)} />
          <span>AI-Generated Drafts Only</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bc-panel overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-default)] font-bold text-[var(--text-primary)]">
            Review &amp; Quality Queue ({items.length})
          </div>
          <div className="max-h-[540px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {items.map((item) => (
              <div
                key={`${item.entity_type}-${item.id}`}
                onClick={() => inspectItem(item)}
                className={`p-3.5 cursor-pointer hover:bg-[var(--bg-subtle)]/70 flex items-center justify-between gap-3 ${
                  selectedItem?.id === item.id ? 'bg-[var(--accent-soft)]' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-secondary)]">
                      {item.entity_type}
                    </span>
                    <span className="font-semibold truncate text-[var(--text-primary)]">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                    {item.technology_name} · Workflow: {item.workflow_status || item.status} · QA: {item.qa_status || 'pending'}
                    {item.is_ai_generated ? ' · AI-Draft' : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    inspectItem(item);
                  }}
                  className="bc-btn-secondary !h-7 !px-2.5 !text-[11px] shrink-0"
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bc-panel p-5 space-y-4">
          {!selectedItem ? (
            <div className="py-16 text-center text-[var(--text-muted)]">
              Select a course or lesson from the queue to inspect QA checks, workflow actions, and revision snapshots.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{selectedItem.title}</h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {selectedItem.technology_name} · State: <strong>{selectedItem.workflow_status || selectedItem.status}</strong> · Author: {selectedItem.author_name || 'Instructor'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => runQa(selectedItem)}
                  className="bc-btn-secondary !h-8 !px-3 !text-xs shrink-0"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Run Automated QA</span>
                </button>
              </div>

              {qaReport && (
                <div
                  className={`p-3.5 rounded-lg border space-y-1.5 ${
                    qaReport.validationStatus === 'pass'
                      ? 'border-[var(--status-success)]/30 bg-[var(--status-success-soft)]'
                      : qaReport.validationStatus === 'warning'
                        ? 'border-[var(--status-warning)]/30 bg-[var(--status-warning-soft)]'
                        : 'border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)]'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[var(--text-primary)]">
                    <span className="inline-flex items-center gap-1.5">
                      {qaReport.validationStatus === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--status-success)]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[var(--status-warning)]" />
                      )}
                      QA Validation: {qaReport.validationStatus.toUpperCase()} ({qaReport.score}%)
                    </span>
                  </div>
                  {qaReport.missingSections.length > 0 && (
                    <p>Missing: {qaReport.missingSections.join(', ')}</p>
                  )}
                  {qaReport.technicalWarnings.length > 0 && (
                    <p className="text-[var(--status-danger)]">Technical: {qaReport.technicalWarnings.join(' | ')}</p>
                  )}
                  {qaReport.educationalWarnings.length > 0 && (
                    <p>Educational: {qaReport.educationalWarnings.join(' | ')}</p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)]">{qaReport.staticInspectionNote}</p>
                </div>
              )}

              {/* Reviewer Assignment & Notes */}
              <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    className="bc-select !h-9 !text-xs flex-1 min-w-0"
                  >
                    {reviewers.map((rv) => (
                      <option key={rv.id} value={rv.id}>
                        {rv.full_name} ({rv.role})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => triggerReviewAction('assign_reviewer')}
                    className="bc-btn-secondary !h-9 !px-3 !text-xs shrink-0"
                  >
                    Assign Reviewer
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Instructor review notes, feedback, or change justification..."
                  className="bc-textarea !text-xs w-full"
                />

                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => triggerReviewAction('submit')} className="bc-btn-secondary !h-8 !px-3 !text-xs">
                    Submit to Review
                  </button>
                  <button type="button" onClick={() => triggerReviewAction('request_revision')} className="bc-btn-secondary !h-8 !px-3 !text-xs text-[var(--status-warning)]">
                    Request Revision
                  </button>
                  <button type="button" onClick={() => triggerReviewAction('approve')} className="bc-btn-primary !h-8 !px-3 !text-xs">
                    Approve
                  </button>
                  <button type="button" onClick={() => triggerReviewAction('publish')} className="bc-btn-primary !bg-emerald-600 hover:!bg-emerald-700 !h-8 !px-3 !text-xs">
                    Publish (QA Gated)
                  </button>
                </div>
              </div>

              {/* Version History & Rollback */}
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <h4 className="font-bold inline-flex items-center gap-1.5 text-[var(--text-primary)]">
                  <History className="w-3.5 h-3.5" /> Version History ({revisions.length})
                </h4>
                {revisions.length === 0 ? (
                  <p className="text-[var(--text-muted)]">No revision snapshots recorded yet for this item.</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[var(--text-primary)]">v{rev.version_number}</span> · {rev.change_summary || 'Snapshot'}
                          <p className="text-[10px] text-[var(--text-muted)]">{rev.editor_name || rev.editor_id} · {rev.created_at?.slice(0, 16)}</p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => restoreRevision(rev.id)}
                            className="bc-btn-secondary !h-7 !px-2 !text-[11px] shrink-0"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {history.length > 0 && (
                  <div className="pt-2 space-y-1">
                    <h5 className="font-semibold text-[11px] text-[var(--text-muted)]">Review Audit Trail</h5>
                    {history.slice(0, 4).map((h) => (
                      <p key={h.id} className="text-[11px] text-[var(--text-secondary)]">
                        [{h.action}] {h.from_status} → {h.to_status} by {h.actor_name || h.actor_id} {h.comment ? `— "${h.comment}"` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================
// 5. REPORTS & COMPLETENESS POLICY (PHASES 3 & 13)
// =========================================================
function ReportsAndPolicySection({
  isAdmin,
  onNotify,
}: {
  isAdmin: boolean;
  onNotify: (t: 'ok' | 'err', msg: string) => void;
}) {
  const [report, setReport] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [substantialThreshold, setSubstantialThreshold] = useState(75);
  const [minPubLessons, setMinPubLessons] = useState(5);
  const [requireIndependent, setRequireIndependent] = useState(false);
  const [aiLimit, setAiLimit] = useState(80);
  const [codeAudit, setCodeAudit] = useState<any>(null);
  const [auditingCode, setAuditingCode] = useState(false);

  const runCodeAudit = async () => {
    setAuditingCode(true);
    try {
      const res = await api.post<any>('/admin/curriculum/code-examples/validate', {});
      setCodeAudit(res);
      const s = res.summary || {};
      onNotify(
        (s.failedCount ?? 0) === 0 ? 'ok' : 'err',
        `Code example audit finished: ${s.validCount ?? 0} valid, ${s.warningsCount ?? 0} warnings, ${s.failedCount ?? 0} failed.`
      );
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Code validation audit failed.');
    } finally {
      setAuditingCode(false);
    }
  };

  const load = async () => {
    try {
      const [repRes, polRes] = await Promise.all([
        api.get<any>('/admin/curriculum/reports/summary'),
        api.get<any>('/admin/curriculum/completeness-rules'),
      ]);
      setReport(repRes);
      setPolicy(polRes.policy);
      setSubstantialThreshold(polRes.policy?.config?.technologySubstantialThreshold ?? 75);
      setMinPubLessons(polRes.policy?.config?.courseThresholds?.minPublishedLessons ?? 5);
      setRequireIndependent(Boolean(polRes.policy?.requireIndependentReview));
      setAiLimit(polRes.policy?.aiDailyGenerationLimit ?? 80);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : 'Unable to load reports.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.patch<any>('/admin/curriculum/completeness-rules', {
        requireIndependentReview: requireIndependent,
        aiDailyGenerationLimit: aiLimit,
        config: {
          technologySubstantialThreshold: substantialThreshold,
          courseThresholds: {
            ...(policy?.config?.courseThresholds || {}),
            minPublishedLessons: minPubLessons,
          },
        },
      });
      setPolicy(res.policy);
      onNotify('ok', 'Completeness scoring thresholds & governance policy updated.');
    } catch (e2) {
      onNotify('err', e2 instanceof ApiError ? e2.message : 'Policy update failed.');
    }
  };

  const downloadReport = async (fmt: 'csv' | 'json') => {
    try {
      const token = getStoredToken();
      const res = await fetch(`/api/admin/curriculum/reports/export?format=${fmt}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `braincode-coverage-report.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('ok', `Exported Technology Coverage Report (${fmt.toUpperCase()}).`);
    } catch (e) {
      onNotify('err', (e as Error).message);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="bc-panel p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">Platform Curriculum &amp; Quality Reports</h2>
          <p className="text-[var(--text-muted)]">
            Real database coverage totals, instructor productivity metrics, and downloadable audit reports.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={auditingCode}
            onClick={runCodeAudit}
            className="bc-btn-primary !h-9 !px-3.5 !text-xs"
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>{auditingCode ? 'Auditing Code Snippets...' : 'Run Code Example Audit'}</span>
          </button>
          <button type="button" onClick={() => downloadReport('csv')} className="bc-btn-secondary !h-9 !px-3.5 !text-xs">
            <Download className="w-3.5 h-3.5" /> Export Coverage CSV
          </button>
          <button type="button" onClick={() => downloadReport('json')} className="bc-btn-secondary !h-9 !px-3.5 !text-xs">
            <Download className="w-3.5 h-3.5" /> Export Coverage JSON
          </button>
        </div>
      </div>

      {codeAudit && (
        <div className="bc-panel p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold inline-flex items-center gap-2 text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Curriculum Code Example Audit Results ({codeAudit.summary?.totalChecked ?? 0} snippets)</span>
            </h3>
            <div className="flex flex-wrap gap-3 text-[11px] tabular-nums font-semibold">
              <span className="text-[var(--status-success)]">
                Valid: {codeAudit.summary?.validCount ?? 0}
              </span>
              <span className="text-[var(--status-warning)]">
                Warnings: {codeAudit.summary?.warningsCount ?? 0}
              </span>
              <span className="text-[var(--status-danger)]">
                Failed: {codeAudit.summary?.failedCount ?? 0}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            Methods: node:vm executed ({codeAudit.summary?.vmExecutedCount ?? 0}), node:vm syntax-checked ({codeAudit.summary?.vmSyntaxCount ?? 0}), static syntax/delimiter inspection ({codeAudit.summary?.staticInspectionCount ?? 0}).{' '}
            {codeAudit.remoteSandboxConfigured
              ? 'Remote sandbox configured via CODE_SANDBOX_URL.'
              : 'Remote execution sandbox (CODE_SANDBOX_URL) not configured — non-JS snippets validated statically.'}
          </p>
          {(Array.isArray(codeAudit.failed) && codeAudit.failed.length > 0) && (
            <div className="max-h-40 overflow-y-auto divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-3">
              {codeAudit.failed.slice(0, 12).map((iss: any, idx: number) => (
                <div key={idx} className="py-2 text-[11px]">
                  <span className="font-mono font-bold uppercase text-[var(--status-danger)]">ERROR</span> · {iss.source} ({iss.id}, {iss.language}): {(iss.errors || []).join('; ')}
                </div>
              ))}
            </div>
          )}
          {(Array.isArray(codeAudit.warnings) && codeAudit.warnings.length > 0) && (
            <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3">
              {codeAudit.warnings.slice(0, 8).map((iss: any, idx: number) => (
                <div key={idx} className="py-2 text-[11px]">
                  <span className="font-mono font-bold uppercase text-[var(--status-warning)]">WARNING</span> · {iss.source} ({iss.id}, {iss.language}): {(iss.warnings || []).join('; ')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bc-panel overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-default)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Instructor Productivity &amp; Review Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="bc-table">
              <thead>
                <tr>
                  <th>Contributor</th>
                  <th>Role</th>
                  <th className="text-right">Courses</th>
                  <th className="text-right">Lessons</th>
                  <th className="text-right">AI Drafts</th>
                  <th className="text-right">Reviews</th>
                </tr>
              </thead>
              <tbody>
                {(report?.instructors || []).map((ins: any) => (
                  <tr key={ins.id}>
                    <td className="font-semibold text-[var(--text-primary)]">{ins.full_name}</td>
                    <td className="capitalize text-[var(--text-secondary)]">{ins.role}</td>
                    <td className="text-right tabular-nums text-[var(--text-secondary)]">{ins.courses_owned}</td>
                    <td className="text-right tabular-nums text-[var(--text-secondary)]">{ins.lessons_authored}</td>
                    <td className="text-right tabular-nums text-[var(--text-secondary)]">{ins.ai_assisted_lessons}</td>
                    <td className="text-right tabular-nums text-[var(--text-primary)] font-semibold">{ins.lessons_reviewed + ins.review_actions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={savePolicy} className="lg:col-span-5 bc-panel p-5 space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Completeness Rules &amp; Review Policy</h3>
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Substantial Completion Threshold (%)</span>
            <input
              type="number"
              min={40}
              max={100}
              disabled={!isAdmin}
              value={substantialThreshold}
              onChange={(e) => setSubstantialThreshold(Number(e.target.value))}
              className="bc-input !h-9 !text-xs w-full tabular-nums"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Minimum Published Lessons per Course</span>
            <input
              type="number"
              min={2}
              max={30}
              disabled={!isAdmin}
              value={minPubLessons}
              onChange={(e) => setMinPubLessons(Number(e.target.value))}
              className="bc-input !h-9 !text-xs w-full tabular-nums"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-[var(--text-secondary)]">Daily AI Studio Generation Quota</span>
            <input
              type="number"
              min={5}
              max={1000}
              disabled={!isAdmin}
              value={aiLimit}
              onChange={(e) => setAiLimit(Number(e.target.value))}
              className="bc-input !h-9 !text-xs w-full tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 cursor-pointer pt-1 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              disabled={!isAdmin}
              checked={requireIndependent}
              onChange={(e) => setRequireIndependent(e.target.checked)}
            />
            <span>Require independent reviewer (block author self-approval)</span>
          </label>
          {isAdmin ? (
            <button type="submit" className="bc-btn-primary w-full !h-9 !text-xs">
              Save Scoring &amp; Review Policy
            </button>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)]">Only Administrators can modify platform scoring rules.</p>
          )}
        </form>
      </div>
    </div>
  );
}

// =========================================================
// 6. UPGRADED STRUCTURED PACKAGE IMPORT (PHASE 10)
// =========================================================
function StructuredPackageImportCard({
  isAdmin,
  onNotify,
  onImported,
}: {
  isAdmin: boolean;
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onImported?: () => Promise<void> | void;
}) {
  const [payloadText, setPayloadText] = useState('');
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const runPreview = async () => {
    try {
      const data = JSON.parse(payloadText);
      const res = await api.post<any>('/admin/curriculum/package/preview', {
        data,
        allowOverwritePublished: allowOverwrite,
      });
      setPreview(res);
      onNotify(res.valid ? 'ok' : 'err', res.valid ? 'Package dry-run validated with 0 blockers.' : 'Package dry-run flagged errors or conflicts.');
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : (e as Error).message || 'Invalid JSON.');
    }
  };

  const executeImport = async () => {
    try {
      const data = JSON.parse(payloadText);
      const res = await api.post<any>('/admin/curriculum/package/import', {
        data,
        confirm: confirmChecked,
        allowOverwritePublished: allowOverwrite,
        publishImmediately: publishNow,
      });
      setPayloadText('');
      setPreview(null);
      setConfirmChecked(false);
      await onImported?.();
      onNotify('ok', `Atomic package imported (${res.summary.courses} courses, ${res.summary.lessons} lessons as ${res.status}).`);
    } catch (e) {
      onNotify('err', e instanceof ApiError ? e.message : (e as Error).message || 'Import rolled back.');
    }
  };

  return (
    <div className="bc-panel p-5 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold inline-flex items-center gap-2 text-[var(--text-primary)]">
            <GitBranch className="w-4 h-4 text-[var(--accent-primary)]" />
            <span>Atomic Curriculum Package Import (Courses, Topics, Examples, Exercises, Quizzes &amp; Paths)</span>
          </h2>
          <p className="text-[var(--text-muted)]">
            Validates foreign keys, detects duplicates, protects published courses, previews impact, and commits atomically inside an SQLite transaction.
          </p>
        </div>
      </div>

      <textarea
        rows={4}
        value={payloadText}
        onChange={(e) => {
          setPayloadText(e.target.value);
          setPreview(null);
        }}
        placeholder='{"courses":[{"title":"Rust Ownership","slug":"rust-ownership-draft","category_id":"cat_langs","technology_id":"tech_rust","modules":[{"title":"Module 1","topics":["Borrow Checker"],"lessons":[{"title":"Ownership Basics","content_markdown":"### Ownership rules...","language":"rust","codeExamples":[{"title":"Move semantics","code":"let s = String::from(\"hi\");","expected_output":"hi"}]}]}]}]}'
        className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-3 font-mono text-[11px] focus:outline-none focus:border-[var(--accent-primary)]"
      />

      <div className="flex flex-wrap items-center gap-4 text-[var(--text-secondary)]">
        {isAdmin && (
          <>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={allowOverwrite} onChange={(e) => setAllowOverwrite(e.target.checked)} />
              <span>Authorize snapshot &amp; update of existing published courses</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              <span>Publish immediately (otherwise saves as Draft)</span>
            </label>
          </>
        )}
        <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-[var(--text-primary)]">
          <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} />
          <span>Confirm atomic database write</span>
        </label>
      </div>

      {preview && (
        <div
          className={`p-3 rounded-lg border space-y-1 ${
            preview.valid
              ? 'border-[var(--status-success)]/30 bg-[var(--status-success-soft)]'
              : 'border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)]'
          }`}
        >
          <p className="font-bold text-[var(--text-primary)]">
            Dry-Run Summary: {preview.summary.courses} courses · {preview.summary.modules} modules · {preview.summary.topics} topics · {preview.summary.lessons} lessons · {preview.summary.exercises} exercises
          </p>
          {(preview.errors || []).map((err: string, i: number) => (
            <p key={i} className="text-[var(--status-danger)]">Error: {err}</p>
          ))}
          {(preview.conflicts || []).map((c: string, i: number) => (
            <p key={i} className="text-[var(--status-danger)]">Conflict: {c}</p>
          ))}
          {(preview.warnings || []).map((w: string, i: number) => (
            <p key={i} className="text-[var(--status-warning)]">Warning: {w}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={runPreview} className="bc-btn-secondary !h-9 !px-4 !text-xs">
          <Eye className="w-3.5 h-3.5" /> Dry-Run Validate Package
        </button>
        <button type="button" disabled={!confirmChecked || !payloadText.trim()} onClick={executeImport} className="bc-btn-primary !h-9 !px-4 !text-xs disabled:opacity-40">
          <Upload className="w-3.5 h-3.5" /> Execute Atomic Import
        </button>
      </div>
    </div>
  );
}
