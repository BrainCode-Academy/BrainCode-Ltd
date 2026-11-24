import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  FolderGit2,
  Lock,
  MicOff,
  MonitorOff,
  Send,
  UserPlus,
  Users,
  VideoOff,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Workspace } from '../types';

export function CollabWorkspaceView({ onOpenPricing }: { onOpenPricing: () => void }) {
  const { user, entitlement, sendWsEvent, subscribeWs } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState('');
  const [activeUsers, setActiveUsers] = useState<Array<{ userId: string; username: string; fullName: string }>>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [selectedWsId, setSelectedWsId] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const loadList = async () => {
    const [sRes, wRes] = await Promise.all([
      api.get<{ sessions: any[] }>('/collab/sessions'),
      api.get<{ workspaces: Workspace[] }>('/workspaces'),
    ]);
    setSessions(sRes.sessions);
    setWorkspaces(wRes.workspaces);
    if (wRes.workspaces[0] && !selectedWsId) setSelectedWsId(wRes.workspaces[0].id);
  };

  useEffect(() => {
    loadList().catch(() => {});
  }, []);

  useEffect(() => {
    return subscribeWs((event, payload) => {
      if (event === 'collab:init' && payload.sessionId === activeSessionId) {
        const incomingFiles = (payload.files as Record<string, string>) || {};
        setFiles(incomingFiles);
        const first = Object.keys(incomingFiles)[0] || '';
        setActiveFile((prev) => (prev && incomingFiles[prev] !== undefined ? prev : first));
        setChatMessages((payload.messages as any[]) || []);
      } else if (event === 'collab:presence' && payload.sessionId === activeSessionId) {
        setActiveUsers((payload.activeUsers as any[]) || []);
      } else if (event === 'collab:file_update' && payload.sessionId === activeSessionId) {
        const fname = String(payload.fileName || '');
        const content = String(payload.content ?? '');
        setFiles((prev) => ({ ...prev, [fname]: content }));
      } else if (event === 'collab:chat' && payload.sessionId === activeSessionId) {
        setChatMessages((prev) =>
          prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]
        );
      } else if (event === 'collab:error') {
        setError(String(payload.message || 'Collaboration error.'));
      }
    });
  }, [activeSessionId, subscribeWs]);

  const openSession = async (id: string) => {
    setError(null);
    setInfoMsg(null);
    try {
      const data = await api.get<any>(`/collab/sessions/${id}`);
      setActiveSessionId(id);
      setSessionDetail(data);
      setFiles(data.session.files || {});
      setActiveFile(Object.keys(data.session.files || {})[0] || '');
      sendWsEvent('collab:join', { sessionId: id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to open collaboration session.');
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post<{ id: string; inviteCode: string }>('/collab/sessions', {
        title: newTitle.trim() || 'Shared Engineering Room',
        workspaceId: selectedWsId,
      });
      setNewTitle('');
      await loadList();
      await openSession(res.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create session.');
    }
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post<{ sessionId: string }>('/collab/sessions/join', {
        inviteCode: inviteCodeInput.trim(),
      });
      setInviteCodeInput('');
      await loadList();
      await openSession(res.sessionId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invite code not valid.');
    }
  };

  const handleEditorChange = (val: string) => {
    if (!activeFile || !activeSessionId) return;
    if (sessionDetail?.myRole === 'viewer') return;
    setFiles((prev) => ({ ...prev, [activeFile]: val }));
    sendWsEvent('collab:file_update', {
      sessionId: activeSessionId,
      fileName: activeFile,
      content: val,
    });
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSessionId) return;
    sendWsEvent('collab:chat', { sessionId: activeSessionId, content: chatInput.trim() });
    setChatInput('');
  };

  const updateParticipantRole = async (targetUserId: string, role?: string, remove = false) => {
    if (!activeSessionId) return;
    await api.patch(`/collab/sessions/${activeSessionId}/participants/${targetUserId}`, { role, remove });
    openSession(activeSessionId);
  };

  const saveAsProject = async () => {
    if (!activeSessionId) return;
    const res = await api.post<{ projectId: string; contributors: string[] }>(
      `/collab/sessions/${activeSessionId}/save-project`,
      { title: sessionDetail.session.title }
    );
    setInfoMsg(`Saved to Projects with contributors: ${res.contributors.join(', ')}`);
  };

  const closeSession = async () => {
    if (!activeSessionId) return;
    await api.post(`/collab/sessions/${activeSessionId}/close`);
    setActiveSessionId(null);
    setSessionDetail(null);
    loadList();
  };

  const canHost = entitlement?.limits.canUseCollabWorkspace;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Collaborative Coding Workspace</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Real-time WebSocket synchronized multi-user file editing, role controls, and session chat.
          </p>
        </div>

        <form onSubmit={handleJoinByCode} className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <input
            type="text"
            value={inviteCodeInput}
            onChange={(e) => setInviteCodeInput(e.target.value)}
            placeholder="Invite code (BC-XXXX-XXXX)"
            className="bc-input min-w-0 flex-1 sm:w-52 text-xs font-mono"
          />
          <button
            type="submit"
            className="bc-btn-primary text-xs shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Join Room</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--status-warning)]/40 bg-[var(--status-warning-soft)] px-4 py-3 text-xs text-[var(--text-primary)] flex flex-wrap items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={onOpenPricing} className="font-semibold text-[var(--accent-text)] hover:underline cursor-pointer">
            View Pro Plans
          </button>
        </div>
      )}

      {infoMsg && (
        <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] px-4 py-3 text-xs text-[var(--status-success)]">
          {infoMsg}
        </div>
      )}

      {/* Host Session Panel (Entitlement Gated) */}
      {!activeSessionId && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bc-panel p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Host a Shared Session</h2>
              {!canHost && <Lock className="w-4 h-4 text-[var(--status-warning)]" />}
            </div>

            {!canHost ? (
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Hosting live collaborative coding rooms requires an active Pro Learner or Team &amp; Studio subscription. You can still join invited rooms via an invite code.
                </p>
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="bc-btn-primary text-xs"
                >
                  Upgrade to Host Sessions
                </button>
              </div>
            ) : workspaces.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Create at least one personal Coding Workspace first to host a live room.</p>
            ) : (
              <form onSubmit={handleCreateSession} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Session Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., API Refactoring Pair Session"
                    className="bc-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Workspace Snapshot</label>
                  <select
                    value={selectedWsId}
                    onChange={(e) => setSelectedWsId(e.target.value)}
                    className="bc-select w-full text-xs"
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="bc-btn-primary w-full text-xs"
                >
                  Start Collaborative Room (Up to {entitlement?.limits.maxCollabParticipants} Peers)
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-7 bc-panel p-5 sm:p-6 space-y-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Your Collaboration Rooms</h2>
            {sessions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No active or past collaboration sessions yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="py-3.5 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{s.title}</p>
                      <p className="text-xs text-[var(--text-muted)] font-mono">
                        {s.invite_code} · {s.participant_count}/{s.max_participants} peers · {s.status}
                      </p>
                    </div>
                    {s.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => openSession(s.id)}
                        className="bc-btn-primary !h-8 !px-3.5 text-xs shrink-0"
                      >
                        Enter Room
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Collaboration Room */}
      {activeSessionId && sessionDetail && (
        <div className="space-y-4">
          <div className="bc-panel p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">{sessionDetail.session.title}</h2>
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-[var(--text-secondary)] mt-0.5">
                <span>Role: {sessionDetail.myRole}</span>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(sessionDetail.session.invite_code);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  }}
                  className="inline-flex items-center gap-1 font-mono text-[var(--accent-text)] cursor-pointer"
                >
                  <span>{sessionDetail.session.invite_code}</span>
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Honest media capability indicators — no fake active voice/video calls */}
              <span
                title="WebRTC SFU / TURN voice server not configured in this environment"
                className="px-2.5 py-1 rounded-md border border-[var(--border-default)] text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1"
              >
                <MicOff className="w-3 h-3" /> Voice (Unconfigured)
              </span>
              <span
                title="WebRTC video SFU not configured in this environment"
                className="px-2.5 py-1 rounded-md border border-[var(--border-default)] text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1"
              >
                <VideoOff className="w-3 h-3" /> Video (Unconfigured)
              </span>
              <span
                title="Screen share SFU not configured"
                className="px-2.5 py-1 rounded-md border border-[var(--border-default)] text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1"
              >
                <MonitorOff className="w-3 h-3" /> Screen (Unconfigured)
              </span>

              {sessionDetail.myRole === 'owner' && (
                <>
                  <button
                    type="button"
                    onClick={saveAsProject}
                    className="bc-btn-primary !h-8 !px-3 !bg-[var(--status-success)] text-xs"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>Save as Project</span>
                  </button>
                  <button
                    type="button"
                    onClick={closeSession}
                    className="bc-btn-danger !h-8 !px-3 text-xs"
                  >
                    Close Session
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveSessionId(null);
                  setSessionDetail(null);
                }}
                className="bc-btn-secondary !h-8 !px-3 text-xs"
              >
                Leave View
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[520px]">
            {/* Shared Files + Editor */}
            <div className="lg:col-span-8 rounded-xl border border-[var(--border-default)] bg-[#0B1018] text-white flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 overflow-x-auto">
                {Object.keys(files).map((fname) => (
                  <button
                    key={fname}
                    type="button"
                    onClick={() => setActiveFile(fname)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap cursor-pointer ${
                      activeFile === fname ? 'bg-[var(--accent-primary)] text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {fname}
                  </button>
                ))}
              </div>
              <textarea
                value={files[activeFile] || ''}
                onChange={(e) => handleEditorChange(e.target.value)}
                readOnly={sessionDetail.myRole === 'viewer'}
                spellCheck={false}
                className="flex-1 w-full bg-transparent p-4 font-mono text-xs leading-6 focus:outline-none resize-none min-h-[360px] lg:min-h-[450px]"
              />
            </div>

            {/* Presence, Participant Management & Session Chat */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="bc-panel p-4 space-y-3">
                <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Participants ({activeUsers.length} connected)</span>
                </h3>
                <div className="divide-y divide-[var(--border-subtle)] max-h-40 overflow-y-auto">
                  {sessionDetail.participants.map((p: any) => {
                    const online = activeUsers.some((au) => au.userId === p.user_id);
                    return (
                      <div key={p.user_id} className="flex items-center justify-between text-xs gap-2 py-2">
                        <span className="truncate text-[var(--text-primary)]">
                          {p.full_name} <span className="text-[var(--text-muted)]">({online ? 'connected' : 'offline'})</span>
                        </span>
                        {sessionDetail.myRole === 'owner' && p.user_id !== user?.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={p.role}
                              onChange={(e) => updateParticipantRole(p.user_id, e.target.value)}
                              className="bc-select !h-7 !px-1.5 text-[11px]"
                            >
                              <option value="editor">editor</option>
                              <option value="viewer">viewer</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => updateParticipantRole(p.user_id, undefined, true)}
                              className="text-[var(--status-danger)] text-[11px] px-1 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono text-[11px] text-[var(--text-muted)]">{p.role}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 bc-panel p-4 flex flex-col">
                <h3 className="text-xs font-bold text-[var(--text-primary)] mb-2">Session Chat</h3>
                <div className="flex-1 overflow-y-auto space-y-2 max-h-60 mb-3">
                  {chatMessages.map((m) => (
                    <div key={m.id} className="bc-subtle-box text-xs p-2.5 text-[var(--text-primary)]">
                      <span className="font-semibold">{m.full_name}: </span>
                      <span className="text-[var(--text-secondary)]">{m.content}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message room..."
                    className="bc-input min-w-0 flex-1 !h-9 text-xs"
                  />
                  <button
                    type="submit"
                    className="bc-btn-primary !h-9 !px-3 shrink-0"
                    aria-label="Send room message"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
