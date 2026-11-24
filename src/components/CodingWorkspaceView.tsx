import React, { useEffect, useState } from 'react';
import {
  Bot,
  Copy,
  FileCode2,
  FolderPlus,
  Play,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { LessonFull, Workspace } from '../types';
import { AiAssistantPanel } from './AiAssistantPanel';

interface CodingWorkspaceViewProps {
  pendingExerciseLesson?: LessonFull | null;
  onClearPendingExercise?: () => void;
  onOpenPricing: () => void;
}

export function CodingWorkspaceView({
  pendingExerciseLesson,
  onClearPendingExercise,
  onOpenPricing,
}: CodingWorkspaceViewProps) {
  const { capabilities } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [maxWorkspaces, setMaxWorkspaces] = useState(5);
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>('index.html');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ level: string; text: string }>>([]);
  const [previewSrcDoc, setPreviewSrcDoc] = useState<string>('');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [newFileName, setNewFileName] = useState('');
  const [newWsName, setNewWsName] = useState('');
  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; category: string; difficulty: string; estimated_hours: number; summary: string }>>([]);
  const [showAi, setShowAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectWorkspace = (ws: Workspace) => {
    setActiveWs(ws);
    let restored = ws.files || {};
    try {
      const rawDraft = localStorage.getItem(`bc_ws_draft_${ws.id}`);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        if (parsed && typeof parsed === 'object') restored = parsed;
      }
    } catch {
      // ignore invalid draft
    }
    setFiles(restored);
    const names = Object.keys(restored);
    setOpenTabs(names.slice(0, 4));
    setActiveFile(names[0] || '');
    setConsoleLogs([]);
    setPreviewSrcDoc('');
  };

  const loadWorkspaces = async () => {
    const res = await api.get<{ workspaces: Workspace[]; maxWorkspaces: number }>('/workspaces');
    setWorkspaces(res.workspaces);
    setMaxWorkspaces(res.maxWorkspaces);
    if (!activeWs && res.workspaces.length > 0) {
      selectWorkspace(res.workspaces[0]);
    }
  };

  useEffect(() => {
    loadWorkspaces().catch(() => {});
  }, []);

  const openTemplatesPicker = () => {
    setShowTemplatesModal(true);
    if (templates.length === 0) {
      api
        .get<{ templates: typeof templates }>('/projects/templates')
        .then((res) => setTemplates(res.templates || []))
        .catch(() => {});
    }
  };

  const startFromTemplate = async (templateId: string) => {
    setErrorMsg(null);
    try {
      const res = await api.post<{ ok: boolean; workspace: Workspace }>(`/projects/templates/${templateId}/start`, {
        createPortfolioEntry: true,
      });
      setWorkspaces((prev) => [res.workspace, ...prev]);
      selectWorkspace(res.workspace);
      setShowTemplatesModal(false);
      setStatusMsg(`Starter template "${res.workspace.name}" loaded.`);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Unable to start starter template.');
    }
  };

  // Create workspace automatically from a lesson practical exercise
  useEffect(() => {
    if (!pendingExerciseLesson) return;
    const rawLang = String(pendingExerciseLesson.language || 'javascript').toLowerCase();
    const isHtml = pendingExerciseLesson.starter_code?.includes('<html') || rawLang === 'html';
    const starterFilename = isHtml
      ? 'index.html'
      : rawLang === 'python' || rawLang === 'py'
        ? 'main.py'
        : rawLang === 'sql'
          ? 'query.sql'
          : rawLang === 'typescript' || rawLang === 'ts'
            ? 'index.ts'
            : rawLang === 'tsx'
              ? 'App.tsx'
              : rawLang === 'jsx'
                ? 'App.jsx'
                : rawLang === 'java'
                  ? 'Main.java'
                  : rawLang === 'cpp' || rawLang === 'c++'
                    ? 'main.cpp'
                    : rawLang === 'css'
                      ? 'styles.css'
                      : 'exercise.js';
    const initialFiles: Record<string, string> = isHtml
      ? { 'index.html': pendingExerciseLesson.starter_code || '<h1>Exercise</h1>' }
      : {
          [starterFilename]: pendingExerciseLesson.starter_code || `// ${pendingExerciseLesson.title} starter code`,
          'README.md': `# ${pendingExerciseLesson.title}\n\n${pendingExerciseLesson.exercise_prompt}`,
        };
    api
      .post<{ workspace: Workspace }>('/workspaces', {
        name: `Lab: ${pendingExerciseLesson.title.slice(0, 40)}`,
        language: pendingExerciseLesson.language || 'javascript',
        lessonId: pendingExerciseLesson.id,
        files: initialFiles,
      })
      .then((res) => {
        setWorkspaces((prev) => [res.workspace, ...prev]);
        selectWorkspace(res.workspace);
        onClearPendingExercise?.();
      })
      .catch((err) => {
        setErrorMsg(err instanceof ApiError ? err.message : 'Could not launch exercise workspace.');
        onClearPendingExercise?.();
      });
  }, [pendingExerciseLesson]);

  // Listen for sandboxed iframe console bridge messages
  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      if (evt.data && evt.data.__bcschools_sandbox) {
        setConsoleLogs((prev) => [...prev.slice(-80), { level: evt.data.level, text: String(evt.data.text) }]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await api.post<{ workspace: Workspace }>('/workspaces', {
        name: newWsName.trim() || 'New Sandbox Project',
        language: 'html',
      });
      setWorkspaces((prev) => [res.workspace, ...prev]);
      selectWorkspace(res.workspace);
      setNewWsName('');
      setShowNewWsModal(false);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Could not create workspace.');
    }
  };

  const handleSave = async () => {
    if (!activeWs) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await api.put(`/workspaces/${activeWs.id}`, { name: activeWs.name, files });
      try {
        localStorage.removeItem(`bc_ws_draft_${activeWs.id}`);
      } catch {
        // ignore storage error
      }
      setWorkspaces((prev) => prev.map((w) => (w.id === activeWs.id ? { ...w, files } : w)));
      setStatusMsg('Saved to cloud workspace');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToSaved = () => {
    if (!activeWs) return;
    setFiles(activeWs.files || {});
    const names = Object.keys(activeWs.files || {});
    setOpenTabs(names.slice(0, 4));
    if (!names.includes(activeFile)) setActiveFile(names[0] || '');
    try {
      localStorage.removeItem(`bc_ws_draft_${activeWs.id}`);
    } catch {
      // ignore
    }
    setStatusMsg('Reset to last saved files');
    setTimeout(() => setStatusMsg(null), 2000);
  };

  const handleDuplicate = async () => {
    if (!activeWs) return;
    try {
      const res = await api.post<{ workspace: Workspace }>(`/workspaces/${activeWs.id}/duplicate`);
      setWorkspaces((prev) => [res.workspace, ...prev]);
      selectWorkspace(res.workspace);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Duplicate failed.');
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    await api.delete(`/workspaces/${id}`);
    const remaining = workspaces.filter((w) => w.id !== id);
    setWorkspaces(remaining);
    if (activeWs?.id === id) {
      if (remaining[0]) selectWorkspace(remaining[0]);
      else {
        setActiveWs(null);
        setFiles({});
      }
    }
  };

  const addFile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newFileName.trim().replace(/^\/+/, '');
    if (!cleaned || files[cleaned] !== undefined) return;
    const next = { ...files, [cleaned]: '' };
    setFiles(next);
    setOpenTabs((tabs) => (tabs.includes(cleaned) ? tabs : [...tabs, cleaned]));
    setActiveFile(cleaned);
    setNewFileName('');
  };

  const deleteFile = (fname: string) => {
    const next = { ...files };
    delete next[fname];
    setFiles(next);
    const nextTabs = openTabs.filter((t) => t !== fname);
    setOpenTabs(nextTabs);
    if (activeFile === fname) setActiveFile(nextTabs[0] || Object.keys(next)[0] || '');
  };

  const runInBrowserSandbox = () => {
    setConsoleLogs([]);
    const html = files['index.html'] || '';
    const css = files['styles.css'] || files['style.css'] || '';
    const jsFiles = Object.entries(files)
      .filter(([name]) => name.endsWith('.js'))
      .map(([, code]) => code)
      .join('\n;\n');

    const nonBrowserExt = ['.py', '.sql', '.ts', '.tsx', '.jsx', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.php'];
    if (nonBrowserExt.some((ext) => activeFile.toLowerCase().endsWith(ext))) {
      if (!capabilities?.sandbox.remoteSandboxEnabled) {
        const src = files[activeFile] || '';
        const openBraces = (src.match(/\{/g) || []).length;
        const closeBraces = (src.match(/\}/g) || []).length;
        setConsoleLogs([
          {
            level: openBraces === closeBraces ? 'log' : 'warn',
            text:
              openBraces === closeBraces
                ? `Static check passed for ${activeFile} (${src.split('\n').length} lines).`
                : `Static check warning in ${activeFile}: unbalanced braces (${openBraces} '{' vs ${closeBraces} '}').`,
          },
          {
            level: 'warn',
            text: `Server-side execution for ${activeFile} requires CODE_SANDBOX_URL (isolated container runner). Browser execution supports HTML, CSS, and JavaScript locally.`,
          },
        ]);
        return;
      }
    }

    const consoleBridge = `<script>
      (function(){
        const send = (level, args) => parent.postMessage({
          __bcschools_sandbox: true,
          level,
          text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
        }, '*');
        console.log = (...a) => send('log', a);
        console.warn = (...a) => send('warn', a);
        console.error = (...a) => send('error', a);
        window.onerror = (msg, src, line) => send('error', [msg + ' (line ' + line + ')']);
        window.addEventListener('unhandledrejection', (ev) => send('error', ['Unhandled promise rejection: ' + String(ev.reason)]));
      })();
    </script>`;

    const assembled = html
      ? html
          .replace('</head>', `<style>${css}</style>${consoleBridge}</head>`)
          .replace('</body>', `<script>${jsFiles}</script></body>`)
      : `<!DOCTYPE html><html><head>${consoleBridge}<style>${css}</style></head><body style="background:#0b1220;color:#e2e8f0;font-family:system-ui;padding:16px;"><p style="font-size:12px;opacity:.6;">Running JavaScript in isolated sandbox iframe...</p><script>${jsFiles}</script></body></html>`;

    setPreviewSrcDoc(assembled);
  };

  const formatCurrentFile = () => {
    if (!activeFile) return;
    const raw = files[activeFile] || '';
    const formatted = raw
      .split('\n')
      .map((l) => l.replace(/\s+$/, ''))
      .join('\n');
    setFiles((prev) => ({ ...prev, [activeFile]: formatted }));
  };

  const lastError = consoleLogs.find((c) => c.level === 'error')?.text || '';

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="bc-panel p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <select
            value={activeWs?.id || ''}
            onChange={(e) => {
              const found = workspaces.find((w) => w.id === e.target.value);
              if (found) selectWorkspace(found);
            }}
            aria-label="Select workspace"
            className="bc-select !h-9 text-xs font-semibold max-w-full min-w-[150px]"
          >
            {workspaces.length === 0 && <option value="">No workspaces yet</option>}
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewWsModal(true)}
            className="bc-btn-secondary !h-9 !px-3 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <button
            type="button"
            onClick={openTemplatesPicker}
            className="bc-btn-secondary !h-9 !px-3 text-xs"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
            <span>Starter Templates</span>
          </button>

          {activeWs && (
            <>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bc-btn-secondary !h-9 !px-3 text-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                className="bc-btn-secondary !h-9 !px-3 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={() => handleDeleteWorkspace(activeWs.id)}
                aria-label="Delete workspace"
                className="bc-btn-danger !h-9 !px-2.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusMsg && <span className="text-xs font-medium text-[var(--status-success)]">{statusMsg}</span>}
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {workspaces.length}/{maxWorkspaces} slots
          </span>
          <button
            type="button"
            onClick={handleResetToSaved}
            disabled={!activeWs}
            className="bc-btn-secondary !h-9 !px-3 text-xs disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={formatCurrentFile}
            className="bc-btn-secondary !h-9 !px-3 text-xs"
          >
            Clean Format
          </button>
          <button
            type="button"
            onClick={() => setShowAi((s) => !s)}
            className="bc-btn-secondary !h-9 !px-3 text-xs !border-[var(--accent-primary)]/40 !bg-[var(--accent-soft)] !text-[var(--accent-text)]"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Debug</span>
          </button>
          <button
            type="button"
            onClick={runInBrowserSandbox}
            disabled={!activeWs}
            className="bc-btn-primary !h-9 !px-4 text-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Code</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-[var(--status-warning)]/40 bg-[var(--status-warning-soft)] px-4 py-3 text-xs text-[var(--text-primary)] flex flex-wrap items-center justify-between gap-3">
          <span>{errorMsg}</span>
          <button type="button" onClick={onOpenPricing} className="font-semibold text-[var(--accent-text)] hover:underline cursor-pointer">
            Upgrade Plan
          </button>
        </div>
      )}

      {/* Honest Sandbox Execution Notice */}
      <div className="bc-subtle-box px-4 py-2.5 text-xs text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
          <span>
            Browser Sandbox active for HTML, CSS, and JavaScript.{' '}
            {capabilities?.sandbox.remoteSandboxEnabled
              ? 'Remote container execution enabled.'
              : 'Remote execution for Python/SQL/Go/Rust requires configuring CODE_SANDBOX_URL.'}
          </span>
        </span>
      </div>

      {!activeWs ? (
        <div className="bc-panel border-dashed p-8 sm:p-12 text-center space-y-3">
          <FileCode2 className="w-9 h-9 text-[var(--text-muted)] mx-auto" />
          <h2 className="text-base font-bold text-[var(--text-primary)]">Create your first coding workspace</h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            Organize multi-file HTML, CSS, and JavaScript projects, load guided starter templates, and save snapshots to your portfolio.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewWsModal(true)}
              className="bc-btn-primary !px-5 text-xs"
            >
              Create Workspace
            </button>
            <button
              type="button"
              onClick={openTemplatesPicker}
              className="bc-btn-secondary !px-5 text-xs"
            >
              Browse Starter Templates
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[540px]">
          {/* File Explorer */}
          <aside className="lg:col-span-2 bc-panel p-3 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] px-2 mb-2">Files</p>
              <div className="space-y-1">
                {Object.keys(files).map((fname) => (
                  <div
                    key={fname}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      activeFile === fname
                        ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      onClick={() => {
                        setActiveFile(fname);
                        if (!openTabs.includes(fname)) setOpenTabs([...openTabs, fname]);
                      }}
                      className="truncate flex-1 font-mono"
                    >
                      {fname}
                    </span>
                    {Object.keys(files).length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteFile(fname)}
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--status-danger)] ml-1 cursor-pointer"
                        aria-label={`Delete ${fname}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={addFile} className="mt-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="folder/file.js"
                className="bc-input w-full !h-8 !px-2.5 text-xs font-mono"
              />
              <button
                type="submit"
                className="bc-btn-secondary w-full !h-8 text-xs"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Add File</span>
              </button>
            </form>
          </aside>

          {/* Code Editor */}
          <div className="lg:col-span-5 rounded-xl border border-[var(--border-default)] bg-[#0B1018] text-slate-100 flex flex-col overflow-hidden">
            <div className="flex items-center gap-1 px-2 pt-2 border-b border-white/10 overflow-x-auto">
              {openTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveFile(tab)}
                  className={`px-3 py-2 text-xs font-mono rounded-t-lg border-b-2 whitespace-nowrap cursor-pointer ${
                    activeFile === tab
                      ? 'border-[var(--accent-primary)] bg-white/[0.06] text-white'
                      : 'border-transparent text-white/55 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <textarea
              value={files[activeFile] || ''}
              onChange={(e) => {
                const next = { ...files, [activeFile]: e.target.value };
                setFiles(next);
                if (activeWs) {
                  try {
                    localStorage.setItem(`bc_ws_draft_${activeWs.id}`, JSON.stringify(next));
                  } catch {
                    // ignore
                  }
                }
              }}
              spellCheck={false}
              aria-label="Code editor"
              className="flex-1 w-full bg-transparent p-4 font-mono text-xs leading-6 text-slate-100 focus:outline-none resize-none min-h-[360px] lg:min-h-[460px]"
            />
          </div>

          {/* Live Preview & Console */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex-1 bc-panel overflow-hidden flex flex-col min-h-[300px]">
              <div className="px-4 py-2.5 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-[var(--text-primary)]">
                <span>Sandboxed Live Preview</span>
                <div className="flex items-center gap-1">
                  {(['desktop', 'tablet', 'mobile'] as const).map((vp) => (
                    <button
                      key={vp}
                      type="button"
                      onClick={() => setPreviewViewport(vp)}
                      className={`px-2 py-0.5 rounded text-[11px] capitalize cursor-pointer ${
                        previewViewport === vp
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      {vp}
                    </button>
                  ))}
                </div>
              </div>
              {previewSrcDoc ? (
                <div className="flex-1 bg-[var(--bg-subtle)] p-2 overflow-auto">
                  <iframe
                    title="Braincode Code Preview"
                    sandbox="allow-scripts"
                    srcDoc={previewSrcDoc}
                    className={`h-full min-h-[240px] bg-white mx-auto block rounded border border-[var(--border-default)] ${
                      previewViewport === 'mobile'
                        ? 'w-full max-w-[375px]'
                        : previewViewport === 'tablet'
                        ? 'w-[768px] max-w-full'
                        : 'w-full'
                    }`}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-xs text-[var(--text-muted)] text-center">
                  Click Run Code to execute HTML, CSS, and JavaScript inside the isolated preview frame.
                </div>
              )}
            </div>

            <div className="h-48 rounded-xl border border-[var(--border-default)] bg-[#0B1018] text-slate-200 p-3 flex flex-col">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/60 mb-2">
                <span>CONSOLE OUTPUT</span>
                <button type="button" onClick={() => setConsoleLogs([])} className="hover:text-white cursor-pointer">
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1">
                {consoleLogs.length === 0 ? (
                  <p className="text-white/40">No console output yet.</p>
                ) : (
                  consoleLogs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.level === 'error'
                          ? 'text-red-400'
                          : log.level === 'warn'
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                      }
                    >
                      &gt; {log.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAi && (
        <AiAssistantPanel
          initialCode={files[activeFile] || ''}
          initialError={lastError}
          compact
        />
      )}

      {showNewWsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateWorkspace}
            className="bc-panel w-full max-w-md p-6 space-y-4 !shadow-[var(--shadow-popover)]"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)]">New Coding Workspace</h3>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Project Name</label>
              <input
                type="text"
                required
                value={newWsName}
                onChange={(e) => setNewWsName(e.target.value)}
                placeholder="e.g., Responsive Grid Prototype"
                className="bc-input w-full"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewWsModal(false)}
                className="bc-btn-secondary !h-9 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bc-btn-primary !h-9 text-xs"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bc-panel w-full max-w-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto !shadow-[var(--shadow-popover)]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Guided Starter Project Templates</h3>
              <button
                type="button"
                onClick={() => setShowTemplatesModal(false)}
                className="bc-btn-ghost px-2.5 py-1 text-xs"
              >
                Close
              </button>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-default)]">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--accent-text)] tabular-nums">
                      {tpl.category} · {tpl.difficulty} · {tpl.estimated_hours}h
                    </p>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{tpl.title}</h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{tpl.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startFromTemplate(tpl.id)}
                    className="bc-btn-primary !h-8 !px-3.5 text-xs shrink-0 self-start sm:self-center"
                  >
                    Load Starter Files
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
