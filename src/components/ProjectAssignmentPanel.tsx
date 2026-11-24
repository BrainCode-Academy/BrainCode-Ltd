import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileCode2, FolderGit2, Layers, ListChecks, Rocket, Send } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { AssignmentItem, ProjectTemplate, Workspace } from '../types';

interface ProjectAssignmentPanelProps {
  assignments?: AssignmentItem[];
  projectTemplates?: ProjectTemplate[];
  onAssignmentSubmitted?: () => void;
  onStartTemplateWorkspace?: (workspace: Workspace) => void;
}

export function ProjectAssignmentPanel({
  assignments = [],
  projectTemplates = [],
  onAssignmentSubmitted,
  onStartTemplateWorkspace,
}: ProjectAssignmentPanelProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [repoById, setRepoById] = useState<Record<string, string>>({});
  const [liveById, setLiveById] = useState<Record<string, string>>({});
  const [wsById, setWsById] = useState<Record<string, string>>({});
  const [checkedByTpl, setCheckedByTpl] = useState<Record<string, string[]>>({});
  const [previewFileByTpl, setPreviewFileByTpl] = useState<Record<string, string>>({});
  const [expandedTplId, setExpandedTplId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [startingTplId, setStartingTplId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api
      .get<{ workspaces: Workspace[] }>('/workspaces')
      .then((res) => setWorkspaces(res.workspaces || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const initial: Record<string, string[]> = {};
    for (const tpl of projectTemplates) {
      if (tpl.myProgress?.checkedItems) {
        initial[tpl.id] = tpl.myProgress.checkedItems;
      }
    }
    setCheckedByTpl((prev) => ({ ...initial, ...prev }));
  }, [projectTemplates]);

  const toggleChecklistItem = async (tpl: ProjectTemplate, item: string) => {
    const current = checkedByTpl[tpl.id] ?? tpl.myProgress?.checkedItems ?? [];
    const next = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
    setCheckedByTpl((prev) => ({ ...prev, [tpl.id]: next }));
    try {
      await api.put(`/projects/templates/${tpl.id}/progress`, { checkedItems: next });
    } catch {
      // ignore offline/unauth error silently while keeping local state
    }
  };

  const submitAssignment = async (e: React.FormEvent, asn: AssignmentItem) => {
    e.preventDefault();
    setSubmittingId(asn.id);
    setStatusMsg(null);
    try {
      await api.post(`/assignments/${asn.id}/submit`, {
        submissionText: notesById[asn.id] || '',
        repoUrl: repoById[asn.id] || '',
        liveUrl: liveById[asn.id] || '',
        workspaceId: wsById[asn.id] || '',
      });
      setStatusMsg({
        ok: true,
        text: `Assignment "${asn.title}" submitted for instructor review.`,
      });
      onAssignmentSubmitted?.();
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Unable to submit assignment.',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleStartTemplate = async (tpl: ProjectTemplate) => {
    setStartingTplId(tpl.id);
    setStatusMsg(null);
    try {
      const res = await api.post<{ ok: boolean; workspace: Workspace }>(`/projects/templates/${tpl.id}/start`, {
        createPortfolioEntry: true,
      });
      setStatusMsg({
        ok: true,
        text: `Starter workspace "${res.workspace.name}" and draft portfolio entry created.`,
      });
      onStartTemplateWorkspace?.(res.workspace);
    } catch (err) {
      setStatusMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Could not start starter project.',
      });
    } finally {
      setStartingTplId(null);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div
          className={`rounded-r-lg border-l-2 px-4 py-3 text-xs ${
            statusMsg.ok
              ? 'border-[var(--status-success)] bg-[var(--status-success-soft)] text-[var(--status-success)]'
              : 'border-[var(--status-danger)] bg-[var(--status-danger-soft)] text-[var(--status-danger)]'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {assignments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Course Assignments ({assignments.length})
            </h3>
          </div>

          {assignments.map((asn) => (
            <div
              key={asn.id}
              className="bc-panel p-4 sm:p-6 space-y-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-muted)] tabular-nums">
                    {asn.difficulty} · +{asn.xp_reward} XP · Suggested {asn.due_days}d sprint
                  </p>
                  <h4 className="text-base font-bold text-[var(--text-primary)] mt-1">{asn.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{asn.description}</p>
                </div>
                {asn.mySubmission && (
                  <span
                    className={`text-xs font-semibold capitalize shrink-0 ${
                      asn.mySubmission.status === 'approved' || asn.mySubmission.status === 'graded'
                        ? 'text-[var(--status-success)]'
                        : asn.mySubmission.status === 'needs_revision'
                          ? 'text-[var(--status-warning)]'
                          : 'text-[var(--accent-text)]'
                    }`}
                  >
                    Status: {asn.mySubmission.status.replace('_', ' ')}
                    {asn.mySubmission.score > 0 ? ` (${asn.mySubmission.score}%)` : ''}
                  </span>
                )}
              </div>

              <div className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed border-l-2 border-[var(--border-strong)] bg-[var(--bg-subtle)] pl-4 pr-3 py-3 rounded-r-lg">
                {asn.instructions_markdown}
              </div>

              {asn.requirements.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Requirements Checklist</p>
                  <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                    {asn.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {asn.rubric.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Grading Rubric</p>
                  <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)]/50">
                    {asn.rubric.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 text-xs flex items-center justify-between gap-3"
                      >
                        <span className="text-[var(--text-secondary)]">{item.criterion}</span>
                        <span className="font-mono tabular-nums text-[var(--accent-text)] font-semibold shrink-0">
                          {item.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {asn.mySubmission?.instructor_feedback && (
                <div className="p-3.5 rounded-r-lg border-l-2 border-[var(--accent-primary)] bg-[var(--accent-soft)] text-xs space-y-2">
                  <p className="font-semibold text-[var(--text-primary)]">Instructor Review Feedback</p>
                  <p className="text-[var(--text-secondary)]">{asn.mySubmission.instructor_feedback}</p>
                  {(() => {
                    let parsedRubric = asn.mySubmission.rubric_scores || [];
                    if ((!parsedRubric || parsedRubric.length === 0) && asn.mySubmission.rubric_scores_json) {
                      try {
                        const raw = JSON.parse(asn.mySubmission.rubric_scores_json);
                        if (Array.isArray(raw)) parsedRubric = raw;
                      } catch {
                        parsedRubric = [];
                      }
                    }
                    if (!parsedRubric || parsedRubric.length === 0) return null;
                    return (
                      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
                        <p className="font-semibold text-[11px] uppercase tracking-wider text-[var(--accent-text)]">
                          Criterion Breakdown
                        </p>
                        {parsedRubric.map((rb, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-[var(--text-secondary)]">
                              {rb.criterion}
                              {rb.note ? ` — ${rb.note}` : ''}
                            </span>
                            <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                              {rb.earned}/{rb.max} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <form onSubmit={(e) => submitAssignment(e, asn)} className="pt-4 border-t border-[var(--border-default)] space-y-3">
                <p className="text-xs font-bold text-[var(--text-primary)]">Submit Your Work</p>
                <textarea
                  rows={3}
                  value={notesById[asn.id] ?? asn.mySubmission?.submission_text ?? ''}
                  onChange={(e) => setNotesById((p) => ({ ...p, [asn.id]: e.target.value }))}
                  placeholder="Describe your implementation, architecture choices, and verification steps..."
                  className="bc-textarea w-full text-xs"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="url"
                    value={repoById[asn.id] ?? asn.mySubmission?.repo_url ?? ''}
                    onChange={(e) => setRepoById((p) => ({ ...p, [asn.id]: e.target.value }))}
                    placeholder="Repository URL (optional)"
                    className="bc-input w-full min-w-0 text-xs"
                  />
                  <input
                    type="url"
                    value={liveById[asn.id] ?? asn.mySubmission?.live_url ?? ''}
                    onChange={(e) => setLiveById((p) => ({ ...p, [asn.id]: e.target.value }))}
                    placeholder="Live Demo URL (optional)"
                    className="bc-input w-full min-w-0 text-xs"
                  />
                  <select
                    value={wsById[asn.id] ?? asn.mySubmission?.workspace_id ?? ''}
                    onChange={(e) => setWsById((p) => ({ ...p, [asn.id]: e.target.value }))}
                    className="bc-select w-full min-w-0 text-xs"
                  >
                    <option value="">Attach Coding Workspace (optional)</option>
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={submittingId === asn.id}
                  className="bc-btn-primary text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingId === asn.id ? 'Submitting...' : asn.mySubmission ? 'Update Submission' : 'Submit Assignment'}</span>
                </button>
              </form>
            </div>
          ))}
        </section>
      )}

      {projectTemplates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[var(--accent-primary)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Guided Starter Project Templates ({projectTemplates.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {projectTemplates.map((tpl) => {
              const starterKeys = Object.keys(tpl.starter_files || {});
              const selectedFile = previewFileByTpl[tpl.id] || starterKeys[0] || '';
              const checked = checkedByTpl[tpl.id] ?? tpl.myProgress?.checkedItems ?? [];
              const checklist = tpl.checklist || [];
              const isExpanded = expandedTplId === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className="bc-panel p-4 sm:p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs text-[var(--accent-text)] font-semibold tabular-nums">
                        {tpl.category} · {tpl.difficulty} · {tpl.estimated_hours}h
                      </p>
                      <h4 className="text-base font-bold text-[var(--text-primary)]">{tpl.title}</h4>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tpl.summary}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedTplId(isExpanded ? null : tpl.id)}
                        className="bc-btn-secondary !h-9 !px-3 text-xs whitespace-nowrap"
                      >
                        {isExpanded ? 'Collapse Brief' : 'Project Brief & Checklist'}
                      </button>
                      <button
                        type="button"
                        disabled={startingTplId === tpl.id}
                        onClick={() => handleStartTemplate(tpl)}
                        className="bc-btn-primary !h-9 !px-4 text-xs whitespace-nowrap"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        <span>{startingTplId === tpl.id ? 'Creating...' : 'Start Starter Project'}</span>
                      </button>
                    </div>
                  </div>

                  {tpl.requirements.length > 0 && (
                    <ul className="space-y-1 text-xs text-[var(--text-secondary)]">
                      {tpl.requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {isExpanded && (
                    <div className="pt-4 border-t border-[var(--border-default)] space-y-5 text-xs">
                      {tpl.learning_outcomes && tpl.learning_outcomes.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="font-bold text-[var(--text-primary)]">Learning Outcomes</p>
                          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
                            {tpl.learning_outcomes.map((o, idx) => (
                              <li key={idx}>{o}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {tpl.milestones && tpl.milestones.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-bold text-[var(--text-primary)]">Implementation Milestones</p>
                          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)]/50">
                            {tpl.milestones.map((m) => (
                              <div key={m.step} className="px-3.5 py-2.5">
                                <p className="font-semibold text-[var(--text-primary)]">Step {m.step}: {m.title}</p>
                                <p className="text-[var(--text-secondary)] mt-0.5">{m.summary}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {checklist.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                              <ListChecks className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              <span>Completion Checklist</span>
                            </p>
                            <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                              {checked.length}/{checklist.length} done
                            </span>
                          </div>
                          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg">
                            {checklist.map((item) => {
                              const isChecked = checked.includes(item);
                              return (
                                <label
                                  key={item}
                                  className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--bg-subtle)] cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleChecklistItem(tpl, item)}
                                  />
                                  <span className={isChecked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}>
                                    {item}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {tpl.rubric && tpl.rubric.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-bold text-[var(--text-primary)]">Evaluation Rubric</p>
                          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-subtle)]/50">
                            {tpl.rubric.map((rb, idx) => (
                              <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                                <span className="text-[var(--text-secondary)]">{rb.criterion}</span>
                                <span className="font-mono font-semibold text-[var(--accent-text)] tabular-nums shrink-0">
                                  {rb.points} pts
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {starterKeys.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                            <FileCode2 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                            <span>Starter Files Preview</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {starterKeys.map((fn) => (
                              <button
                                key={fn}
                                type="button"
                                onClick={() => setPreviewFileByTpl((p) => ({ ...p, [tpl.id]: fn }))}
                                className={`px-2.5 py-1 rounded-md font-mono text-[11px] border cursor-pointer ${
                                  selectedFile === fn
                                    ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-text)]'
                                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                }`}
                              >
                                {fn}
                              </button>
                            ))}
                          </div>
                          {selectedFile && (
                            <pre className="p-3.5 rounded-lg border border-slate-800 bg-[#0B111C] text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48">
                              {tpl.starter_files[selectedFile]}
                            </pre>
                          )}
                        </div>
                      )}

                      {tpl.submission_instructions && (
                        <div className="p-3 rounded-r-lg bg-[var(--accent-soft)] border-l-2 border-[var(--accent-primary)] text-[var(--text-secondary)]">
                          <span className="font-bold text-[var(--text-primary)]">Submission Guide: </span>
                          {tpl.submission_instructions}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

