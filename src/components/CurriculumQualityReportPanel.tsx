import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  FolderKanban,
  RefreshCw,
  Search,
} from 'lucide-react';
import { api, ApiError, getStoredToken } from '../lib/api';
import type {
  CurriculumAuditGapType,
  CurriculumQualityReport,
} from '../types';

interface CurriculumQualityReportPanelProps {
  onNotify: (t: 'ok' | 'err', msg: string) => void;
  onInspectCourseId: (courseId: string) => void;
  onOpenLessonEditor: (lessonId: string) => void;
}

const GAP_TYPE_LABELS: Record<CurriculumAuditGapType, string> = {
  missing_objective: 'Missing Objectives',
  empty_module: 'Empty Modules',
  empty_course: 'Empty Courses',
  course_without_project: 'Courses Without Projects',
  technology_without_course: 'Technologies Without Courses',
  technology_without_project: 'Technologies Without Projects',
  missing_assessment: 'Missing Assessments',
  brief_content: 'Brief Lesson Content',
  missing_code_example: 'Missing Code Examples',
  unverified_technical: 'Awaiting Technical Verification',
};

export function CurriculumQualityReportPanel({
  onNotify,
  onInspectCourseId,
  onOpenLessonEditor,
}: CurriculumQualityReportPanelProps) {
  const [report, setReport] = useState<CurriculumQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);

  const [activeTab, setActiveTab] = useState<'gaps' | 'technologies' | 'structural'>('gaps');
  const [search, setSearch] = useState('');
  const [gapTypeFilter, setGapTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [techHealthFilter, setTechHealthFilter] = useState<string>('all');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ ok: boolean; report: CurriculumQualityReport }>('/admin/curriculum/quality-report');
      setReport(res.report);
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Unable to load Curriculum Quality Report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
  }, []);

  const handleRunAutomatedAudit = async () => {
    setRunningAudit(true);
    try {
      const res = await api.post<{ ok: boolean; report: CurriculumQualityReport }>('/admin/curriculum/quality-report/run', {});
      setReport(res.report);
      onNotify(
        'ok',
        `Curriculum Quality Report generated: ${res.report.summary.totalGaps} gaps across ${res.report.summary.totalTechnologies} technologies.`
      );
    } catch (err) {
      onNotify('err', err instanceof ApiError ? err.message : 'Automated curriculum audit failed.');
    } finally {
      setRunningAudit(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const headers: Record<string, string> = {};
      const token = getStoredToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/curriculum/quality-report/export?format=${format}`, {
        headers,
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `curriculum-quality-report.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onNotify('ok', `Exported Curriculum Quality Report (${format.toUpperCase()}).`);
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Export failed.');
    }
  };

  const qLower = search.trim().toLowerCase();

  const filteredGaps = useMemo(() => {
    if (!report) return [];
    return report.gaps.filter((g) => {
      if (gapTypeFilter !== 'all' && g.gapType !== gapTypeFilter) return false;
      if (severityFilter !== 'all' && g.severity !== severityFilter) return false;
      if (qLower) {
        const hay = `${g.entityTitle} ${g.courseTitle || ''} ${g.technologyName || ''} ${g.detail}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [report, gapTypeFilter, severityFilter, qLower]);

  const filteredTechs = useMemo(() => {
    if (!report) return [];
    return report.technologyAudits.filter((t) => {
      if (techHealthFilter !== 'all' && t.healthStatus !== techHealthFilter) return false;
      if (qLower) {
        const hay = `${t.name} ${t.categoryName} ${t.slug} ${t.gaps.join(' ')}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [report, techHealthFilter, qLower]);

  const coursesWithoutProjects = useMemo(() => {
    if (!report) return [];
    return report.courseAudits.filter((c) => {
      if (!c.missingProject) return false;
      if (qLower) {
        return `${c.title} ${c.technologyName}`.toLowerCase().includes(qLower);
      }
      return true;
    });
  }, [report, qLower]);

  const emptyModules = useMemo(() => {
    if (!report) return [];
    return report.emptyModules.filter((m) => {
      if (!qLower) return true;
      return `${m.moduleTitle} ${m.courseTitle} ${m.technologyName}`.toLowerCase().includes(qLower);
    });
  }, [report, qLower]);

  return (
    <section
      data-testid="curriculum-quality-report-panel"
      className="bc-panel overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <ClipboardList className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <span>Curriculum Quality Report</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 tabular-nums">
            {report
              ? `Generated ${new Date(report.generatedAt).toLocaleString()} · Traversed ${report.summary.totalTechnologies} technologies, ${report.summary.totalCourses} courses, ${report.summary.totalModules} modules, ${report.summary.totalLessons} lessons`
              : 'Traversing technologies, courses, modules & lessons...'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={!report}
            className="bc-btn-secondary !h-9 !px-3 text-xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={!report}
            className="bc-btn-secondary !h-9 !px-3 text-xs whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            onClick={handleRunAutomatedAudit}
            disabled={runningAudit}
            className="bc-btn-primary !h-9 !px-4 text-xs whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningAudit ? 'animate-spin' : ''}`} />
            <span>{runningAudit ? 'Auditing Curriculum...' : 'Run Automated Audit'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Row */}
      {loading && !report ? (
        <div className="p-6 text-xs text-[var(--text-muted)]">Running automated audit across database...</div>
      ) : report ? (
        <div className="p-4 sm:p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)]">
            {[
              {
                label: 'Hygiene Score',
                value: `${report.summary.overallHealthScorePct}%`,
                note: `${report.summary.healthyTechnologies} healthy techs`,
              },
              {
                label: 'Missing Objectives',
                value: report.summary.coursesMissingObjectives + report.summary.lessonsMissingObjectives,
                note: `${report.summary.coursesMissingObjectives} courses · ${report.summary.lessonsMissingObjectives} lessons`,
              },
              {
                label: 'Empty Modules',
                value: report.summary.emptyModules,
                note: `of ${report.summary.totalModules} modules`,
              },
              {
                label: 'Courses No Projects',
                value: report.summary.coursesWithoutProjects,
                note: `of ${report.summary.totalCourses} courses`,
              },
              {
                label: 'Unstarted Techs',
                value: report.summary.unstartedTechnologies,
                note: `of ${report.summary.totalTechnologies} listed`,
              },
              {
                label: 'Total Gaps Detected',
                value: report.summary.totalGaps,
                note: `${report.summary.criticalGaps} critical · ${report.summary.warningGaps} warning`,
              },
            ].map((stat) => (
              <div key={stat.label} className="p-3.5 min-w-0">
                <p className="text-[11px] font-medium text-[var(--text-muted)]">{stat.label}</p>
                <p className="font-heading text-xl font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] tabular-nums mt-0.5 truncate">{stat.note}</p>
              </div>
            ))}
          </div>

          {/* Sub-Navigation + Search Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] w-full sm:w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('gaps')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'gaps'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Gap Explorer ({filteredGaps.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('technologies')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'technologies'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                All Technologies ({filteredTechs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('structural')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'structural'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Empty Modules &amp; Missing Projects ({emptyModules.length + coursesWithoutProjects.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
              <div className="relative min-w-0 flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search gap, course, technology..."
                  aria-label="Search Curriculum Quality Report"
                  className="bc-input !h-8 !pl-8 !pr-3 text-xs w-full sm:w-56"
                />
              </div>

              {activeTab === 'gaps' && (
                <>
                  <select
                    value={gapTypeFilter}
                    onChange={(e) => setGapTypeFilter(e.target.value)}
                    aria-label="Filter by gap category"
                    className="bc-select !h-8 !px-2.5 text-xs"
                  >
                    <option value="all">All Gap Types</option>
                    {Object.entries(GAP_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label} ({report.byGapType[key as CurriculumAuditGapType] || 0})
                      </option>
                    ))}
                  </select>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    aria-label="Filter by severity"
                    className="bc-select !h-8 !px-2.5 text-xs"
                  >
                    <option value="all">All Severities</option>
                    <option value="critical">Critical ({report.summary.criticalGaps})</option>
                    <option value="warning">Warning ({report.summary.warningGaps})</option>
                    <option value="info">Info ({report.summary.infoGaps})</option>
                  </select>
                </>
              )}

              {activeTab === 'technologies' && (
                <select
                  value={techHealthFilter}
                  onChange={(e) => setTechHealthFilter(e.target.value)}
                  aria-label="Filter technology health"
                  className="bc-select !h-8 !px-2.5 text-xs"
                >
                  <option value="all">All Health States</option>
                  <option value="healthy">Healthy ({report.summary.healthyTechnologies})</option>
                  <option value="needs_attention">Needs Attention</option>
                  <option value="critical_gaps">Critical Gaps</option>
                  <option value="unstarted">Unstarted ({report.summary.unstartedTechnologies})</option>
                </select>
              )}
            </div>
          </div>

          {/* Active Tab Table */}
          {activeTab === 'gaps' && (
            <div className="bc-table-wrap overflow-hidden">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="bc-table">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Severity</th>
                      <th>Category</th>
                      <th>Entity &amp; Context</th>
                      <th>Detected Gap &amp; Recommendation</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGaps.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">
                          No curriculum gaps match your current filter.
                        </td>
                      </tr>
                    ) : (
                      filteredGaps.slice(0, 100).map((gap) => (
                        <tr key={gap.id} className="hover:bg-[var(--bg-subtle)]/70">
                          <td className="whitespace-nowrap font-semibold">
                            <span
                              className={
                                gap.severity === 'critical'
                                  ? 'text-[var(--status-danger)]'
                                  : gap.severity === 'warning'
                                  ? 'text-[var(--status-warning)]'
                                  : 'text-[var(--text-muted)]'
                              }
                            >
                              {gap.severity === 'critical' ? 'Critical' : gap.severity === 'warning' ? 'Warning' : 'Info'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap font-medium text-[var(--text-primary)]">
                            {GAP_TYPE_LABELS[gap.gapType] || gap.gapType}
                          </td>
                          <td>
                            <p className="font-semibold text-[var(--text-primary)]">{gap.entityTitle}</p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {gap.entityType}
                              {gap.courseTitle ? ` · ${gap.courseTitle}` : ''}
                              {gap.technologyName ? ` · ${gap.technologyName}` : ''}
                            </p>
                          </td>
                          <td>
                            <p className="text-[var(--text-primary)]">{gap.detail}</p>
                            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{gap.recommendation}</p>
                          </td>
                          <td className="text-right whitespace-nowrap">
                            {gap.actionTarget === 'lesson_editor' ? (
                              <button
                                type="button"
                                onClick={() => onOpenLessonEditor(gap.entityId)}
                                className="bc-btn-secondary !h-7 !px-2.5 text-xs"
                              >
                                <FileText className="w-3 h-3 text-[var(--accent-primary)]" />
                                <span>Edit Lesson</span>
                              </button>
                            ) : gap.courseId ? (
                              <button
                                type="button"
                                onClick={() => onInspectCourseId(gap.courseId!)}
                                className="bc-btn-secondary !h-7 !px-2.5 text-xs"
                              >
                                Inspect Course
                              </button>
                            ) : (
                              <span className="text-[11px] text-[var(--text-muted)]">Catalog</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredGaps.length > 100 && (
                <div className="px-3 py-2 border-t border-[var(--border-default)] text-[11px] text-[var(--text-muted)]">
                  Showing first 100 of {filteredGaps.length} matching findings. Export CSV or JSON for the complete list.
                </div>
              )}
            </div>
          )}

          {activeTab === 'technologies' && (
            <div className="bc-table-wrap overflow-hidden">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="bc-table">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Technology</th>
                      <th className="text-right">Courses</th>
                      <th className="text-right">Modules (Empty)</th>
                      <th className="text-right">Lessons (No Obj)</th>
                      <th className="text-right">Projects</th>
                      <th>Health</th>
                      <th>Gaps Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTechs.slice(0, 120).map((t) => (
                      <tr key={t.technologyId} className="hover:bg-[var(--bg-subtle)]/70">
                        <td>
                          <p className="font-semibold text-[var(--text-primary)]">{t.name}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {t.categoryName} · {t.difficulty}
                          </p>
                        </td>
                        <td className="text-right font-mono tabular-nums">
                          {t.publishedCourses}/{t.totalCourses}
                        </td>
                        <td className="text-right font-mono tabular-nums">
                          {t.totalModules} ({t.emptyModules})
                        </td>
                        <td className="text-right font-mono tabular-nums">
                          {t.totalLessons} ({t.lessonsMissingObjectives})
                        </td>
                        <td className="text-right font-mono tabular-nums">{t.projectTemplatesCount}</td>
                        <td className="whitespace-nowrap font-semibold">
                          {t.healthStatus === 'healthy' ? (
                            <span className="text-[var(--status-success)] inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Healthy</span>
                            </span>
                          ) : t.healthStatus === 'critical_gaps' ? (
                            <span className="text-[var(--status-danger)]">Critical Gaps</span>
                          ) : t.healthStatus === 'needs_attention' ? (
                            <span className="text-[var(--status-warning)]">Needs Attention</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">Unstarted</span>
                          )}
                        </td>
                        <td className="text-[var(--text-secondary)]">
                          {t.gaps.length > 0 ? t.gaps.join(' · ') : 'Complete coverage'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredTechs.length > 120 && (
                <div className="px-3 py-2 border-t border-[var(--border-default)] text-[11px] text-[var(--text-muted)]">
                  Showing first 120 of {filteredTechs.length} technologies. Use search or health filter above to narrow down.
                </div>
              )}
            </div>
          )}

          {activeTab === 'structural' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Courses Without Projects */}
              <div className="rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
                <div className="px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                    <FolderKanban className="w-3.5 h-3.5 text-[var(--status-warning)]" />
                    <span>Courses Without Projects ({coursesWithoutProjects.length})</span>
                  </span>
                </div>
                <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                  {coursesWithoutProjects.length === 0 ? (
                    <p className="p-4 text-xs text-[var(--status-success)]">
                      Every course has a linked practical project template.
                    </p>
                  ) : (
                    coursesWithoutProjects.map((c) => (
                      <div key={c.courseId} className="px-4 py-3 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{c.title}</p>
                          <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                            {c.technologyName} · {c.lessonsCount} lessons · {c.assignmentsCount} assignments · 0 project templates
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onInspectCourseId(c.courseId)}
                          className="bc-btn-secondary !h-7 !px-2.5 text-xs shrink-0"
                        >
                          Inspect
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Empty Modules */}
              <div className="rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--bg-surface)]">
                <div className="px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                    <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-danger)]" />
                    <span>Empty Modules With 0 Lessons ({emptyModules.length})</span>
                  </span>
                </div>
                <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
                  {emptyModules.length === 0 ? (
                    <p className="p-4 text-xs text-[var(--status-success)]">
                      Zero empty modules detected across all courses.
                    </p>
                  ) : (
                    emptyModules.map((m) => (
                      <div key={m.moduleId} className="px-4 py-3 flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{m.moduleTitle}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            {m.courseTitle} · {m.technologyName}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onInspectCourseId(m.courseId)}
                          className="bc-btn-secondary !h-7 !px-2.5 text-xs shrink-0"
                        >
                          Inspect Course
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
