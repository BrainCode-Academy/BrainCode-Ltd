import React, { useEffect, useState } from 'react';
import { Award, ExternalLink, Eye, Globe, Lock, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ProjectItem, ProjectTemplate } from '../types';

export function ProjectsPortfolioView({ inspectUsername }: { inspectUsername?: string | null }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'mine' | 'showcase' | 'templates' | 'portfolio'>(
    inspectUsername ? 'portfolio' : 'mine'
  );
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [portfolioUsername, setPortfolioUsername] = useState(inspectUsername || user?.username || '');
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('TypeScript, React');
  const [repoUrl, setRepoUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (inspectUsername) {
      setPortfolioUsername(inspectUsername);
      setTab('portfolio');
    }
  }, [inspectUsername]);

  const loadProjects = async (scope: 'mine' | 'showcase') => {
    const res = await api.get<{ projects: ProjectItem[] }>(`/projects?scope=${scope}`);
    setProjects(res.projects);
  };

  const loadTemplates = async () => {
    const res = await api.get<{ templates: ProjectTemplate[] }>('/projects/templates');
    setTemplates(res.templates || []);
  };

  const loadPortfolio = async (uname: string) => {
    if (!uname) return;
    setError(null);
    try {
      const data = await api.get<any>(`/users/${uname}`);
      setPortfolioData(data);
    } catch (err) {
      setPortfolioData(null);
      setError(err instanceof ApiError ? err.message : 'Portfolio could not be loaded.');
    }
  };

  useEffect(() => {
    if (tab === 'mine' || tab === 'showcase') loadProjects(tab).catch(() => {});
    else if (tab === 'templates') loadTemplates().catch(() => {});
    else if (tab === 'portfolio') loadPortfolio(portfolioUsername || user?.username || '');
  }, [tab, portfolioUsername]);

  const handleStartTemplate = async (tplId: string) => {
    setError(null);
    setStatusMsg(null);
    try {
      const res = await api.post<{ workspace: { name: string } }>(`/projects/templates/${tplId}/start`, {
        createPortfolioEntry: true,
      });
      setStatusMsg(`Starter workspace & draft project "${res.workspace.name}" created. Open Coding Workspace to build!`);
      setTab('mine');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start starter project.');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/projects', {
        title,
        description,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        repoUrl,
        liveUrl,
        visibility,
      });
      setTitle('');
      setDescription('');
      setRepoUrl('');
      setLiveUrl('');
      setShowForm(false);
      loadProjects('mine');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save project.');
    }
  };

  const toggleVisibility = async (p: ProjectItem) => {
    await api.put(`/projects/${p.id}`, {
      ...p,
      repoUrl: p.repo_url,
      liveUrl: p.live_url,
      imageUrl: p.image_url,
      visibility: p.visibility === 'public' ? 'private' : 'public',
    });
    loadProjects('mine');
  };

  const deleteProject = async (id: string) => {
    await api.delete(`/projects/${id}`);
    loadProjects('mine');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Projects &amp; Developer Portfolio</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Private projects stay strictly private until you explicitly choose to publish them to your portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            {[
              { id: 'mine', label: 'My Projects' },
              { id: 'templates', label: 'Starter Templates' },
              { id: 'showcase', label: 'Public Showcase' },
              { id: 'portfolio', label: 'Portfolio View' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (t.id === 'portfolio' && !portfolioUsername) setPortfolioUsername(user?.username || '');
                  setTab(t.id as any);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer whitespace-nowrap ${
                  tab === t.id
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bc-btn-primary !h-9 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] px-4 py-3 text-xs text-[var(--status-success)]">
          {statusMsg}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-4 py-3 text-xs text-[var(--status-danger)]">
          {error}
        </div>
      )}

      {tab === 'templates' ? (
        templates.length === 0 ? (
          <div className="bc-panel border-dashed p-10 text-center text-xs text-[var(--text-muted)]">
            Loading guided starter project templates...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {templates.map((tpl) => (
              <article
                key={tpl.id}
                className="bc-panel p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[var(--accent-text)] tabular-nums">
                    {tpl.category} · {tpl.difficulty} · {tpl.estimated_hours}h
                  </p>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">{tpl.title}</h2>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{tpl.summary}</p>
                  {tpl.requirements.length > 0 && (
                    <ul className="pt-1 space-y-1 text-[11px] text-[var(--text-muted)] list-disc pl-4">
                      {tpl.requirements.slice(0, 3).map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleStartTemplate(tpl.id)}
                  className="bc-btn-primary !h-9"
                >
                  Start Guided Project
                </button>
              </article>
            ))}
          </div>
        )
      ) : tab !== 'portfolio' ? (
        projects.length === 0 ? (
          <div className="bc-panel border-dashed p-10 text-center space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">No {tab === 'mine' ? 'saved' : 'public'} projects yet</p>
            <p className="text-xs text-[var(--text-muted)]">
              Create a project entry or start from a Guided Starter Template.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <article
                key={p.id}
                className="bc-panel p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1 capitalize">
                      {p.visibility === 'public' ? <Globe className="w-3 h-3 text-[var(--status-success)]" /> : <Lock className="w-3 h-3" />}
                      {p.visibility}
                      {p.status ? ` · ${p.status.replace('_', ' ')}` : ''}
                    </span>
                    <span className="truncate">{p.tags.join(' · ')}</span>
                  </div>
                  <h2 className="text-base font-bold mt-2 text-[var(--text-primary)]">{p.title}</h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{p.description}</p>
                  {p.instructor_feedback && (
                    <div className="mt-2.5 bc-subtle-box p-2.5 text-[11px] text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">Instructor Feedback: </span>
                      {p.instructor_feedback}
                    </div>
                  )}
                  {p.contributors.length > 0 && (
                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      Contributors: {p.contributors.join(', ')}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-[var(--accent-text)] hover:underline inline-flex items-center gap-1">
                        Repo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {p.live_url && (
                      <a href={p.live_url} target="_blank" rel="noreferrer" className="text-[var(--accent-text)] hover:underline inline-flex items-center gap-1">
                        Live <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {p.owner_id === user?.id && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleVisibility(p)}
                        className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-text)] cursor-pointer"
                      >
                        {p.visibility === 'public' ? 'Make Private' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProject(p.id)}
                        aria-label="Delete project"
                        className="text-[var(--status-danger)] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      ) : (
        portfolioData && (
          <div className="space-y-6">
            <div className="bc-panel p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[var(--accent-text)] font-medium">
                  @{portfolioData.profile.username} · {portfolioData.profile.skill_level} · Level {portfolioData.profile.level}
                </p>
                <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{portfolioData.profile.full_name}</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
                  {portfolioData.profile.bio || 'Building full-stack systems and mastering modern software architecture.'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Skills: {portfolioData.profile.preferred_techs?.join(' · ') || 'General Software Engineering'}
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <p className="text-xs text-[var(--text-muted)]">Demonstrated XP</p>
                <p className="text-2xl font-bold tabular-nums text-[var(--accent-text)]">
                  {portfolioData.profile.xp} XP
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-base font-bold text-[var(--text-primary)]">Showcased Projects ({portfolioData.projects.length})</h3>
                {portfolioData.projects.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No published portfolio projects yet.</p>
                ) : (
                  <div className="bc-panel divide-y divide-[var(--border-subtle)]">
                    {portfolioData.projects.map((p: ProjectItem) => (
                      <div key={p.id} className="p-5">
                        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                          <span>{p.tags.join(' · ')}</span>
                          <span className="capitalize">{p.visibility}</span>
                        </div>
                        <h4 className="text-base font-bold mt-1 text-[var(--text-primary)]">{p.title}</h4>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">{p.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="bc-panel p-5 space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <Award className="w-4 h-4 text-[var(--status-warning)]" />
                    <span>Badges &amp; Milestones</span>
                  </h3>
                  {portfolioData.badges.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No badges earned yet.</p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {portfolioData.badges.map((b: any) => (
                        <div key={b.title} className="text-xs py-2 first:pt-0 last:pb-0 text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">{b.title}</span> — {b.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bc-panel p-5 space-y-2">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <Eye className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span>Enrolled &amp; Completed Courses</span>
                  </h3>
                  {portfolioData.completedCourses.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No courses recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {portfolioData.completedCourses.map((c: any) => (
                        <div key={c.id} className="text-xs flex justify-between py-2 first:pt-0 last:pb-0">
                          <span className="text-[var(--text-primary)]">{c.title}</span>
                          <span className="font-mono tabular-nums text-[var(--text-muted)]">
                            {c.completed_lessons}/{c.total_lessons}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateProject}
            className="w-full max-w-lg bc-panel p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Add Portfolio Project</h3>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Project Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bc-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Description</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bc-textarea w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="bc-input w-full !text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="bc-select w-full !text-xs"
                >
                  <option value="private">Private (Only Me)</option>
                  <option value="public">Public Portfolio</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Repository URL</label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="bc-input w-full !text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Live Demo URL</label>
                <input
                  type="url"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://..."
                  className="bc-input w-full !text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bc-btn-secondary !h-9"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bc-btn-primary !h-9"
              >
                Save Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
