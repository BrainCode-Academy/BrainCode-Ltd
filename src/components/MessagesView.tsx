import React, { useEffect, useState } from 'react';
import { Ban, Check, Paperclip, Search, Send, UserPlus } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export function MessagesView({ onViewPortfolio }: { onViewPortfolio: (username: string) => void }) {
  const { user, sendWsEvent, subscribeWs } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [directory, setDirectory] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [activePeer, setActivePeer] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSidebar = async () => {
    const [convRes, dirRes, connRes] = await Promise.all([
      api.get<{ conversations: any[] }>('/messages/conversations'),
      api.get<{ users: any[] }>(`/users${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`),
      api.get<{ connections: any[] }>('/connections'),
    ]);
    setConversations(convRes.conversations);
    setDirectory(dirRes.users);
    setConnections(connRes.connections);
  };

  useEffect(() => {
    loadSidebar().catch(() => {});
  }, []);

  const openChat = async (peerId: string) => {
    setActivePeerId(peerId);
    setPeerTyping(false);
    setError(null);
    const data = await api.get<{ messages: any[]; peer: any }>(`/messages/${peerId}`);
    setMessages(data.messages);
    setActivePeer(data.peer);
    loadSidebar();
  };

  useEffect(() => {
    return subscribeWs((event, payload) => {
      if (event === 'dm:received') {
        const msg = payload as any;
        if (msg.sender_id === activePeerId || msg.recipient_id === activePeerId) {
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
        loadSidebar();
      } else if (event === 'dm:typing' && payload.senderId === activePeerId) {
        setPeerTyping(Boolean(payload.isTyping));
      }
    });
  }, [activePeerId, subscribeWs]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePeerId || !draft.trim()) return;
    setError(null);
    try {
      const res = await api.post<{ message: any }>(`/messages/${activePeerId}`, {
        content: draft.trim(),
        attachmentName: attachmentName.trim(),
      });
      setMessages((prev) => [...prev, res.message]);
      setDraft('');
      setAttachmentName('');
      sendWsEvent('dm:typing', { recipientId: activePeerId, isTyping: false });
      loadSidebar();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Message could not be delivered.');
    }
  };

  const requestConnection = async (recipientId: string) => {
    await api.post('/connections/request', { recipientId });
    loadSidebar();
  };

  const respondConnection = async (connId: string, decision: 'accepted' | 'rejected') => {
    await api.post(`/connections/${connId}/respond`, { decision });
    loadSidebar();
  };

  const blockPeer = async (peerId: string) => {
    await api.post('/connections/block', { userId: peerId });
    setActivePeerId(null);
    loadSidebar();
  };

  const pendingIncoming = connections.filter((c) => c.recipient_id === user?.id && c.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Messages &amp; Developer Network</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Real-time WebSocket 1-to-1 messaging, peer connection requests, and developer discovery.
        </p>
      </div>

      {pendingIncoming.length > 0 && (
        <div className="bc-panel p-4 space-y-2">
          <p className="text-xs font-bold text-[var(--text-primary)]">Pending Connection Requests ({pendingIncoming.length})</p>
          <div className="flex flex-wrap gap-3">
            {pendingIncoming.map((c) => (
              <div
                key={c.id}
                className="bc-subtle-box px-3 py-2 flex items-center gap-3 text-xs"
              >
                <span className="text-[var(--text-primary)]">{c.requester_name} (@{c.requester_username})</span>
                <button
                  type="button"
                  onClick={() => respondConnection(c.id, 'accepted')}
                  className="text-[var(--status-success)] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => respondConnection(c.id, 'rejected')}
                  className="text-[var(--text-muted)] cursor-pointer"
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[560px]">
        {/* Left Sidebar: Conversations & Peer Directory */}
        <aside className="lg:col-span-4 bc-panel p-4 flex flex-col gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadSidebar();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find learners or mentors..."
                className="bc-input !h-9 w-full !pl-8 !text-xs"
              />
            </div>
            <button type="submit" className="bc-btn-primary !h-9 !px-3 shrink-0">
              Find
            </button>
          </form>

          {conversations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Conversations</p>
              <div className="divide-y divide-[var(--border-subtle)]">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => openChat(c.id)}
                    className={`w-full text-left py-2.5 px-2.5 rounded-lg text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      activePeerId === c.id
                        ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                        : 'hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-[var(--text-primary)]">{c.full_name}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{c.last_message || 'Connected peer'}</p>
                    </div>
                    {c.unread_count > 0 && (
                      <span className="tabular-nums text-[11px] font-semibold text-[var(--accent-text)] shrink-0">{c.unread_count} new</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5 flex-1 overflow-y-auto">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Discover Developers</p>
            <div className="divide-y divide-[var(--border-subtle)]">
              {directory.map((u) => (
                <div
                  key={u.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onViewPortfolio(u.username)}
                      className="font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] truncate block text-left cursor-pointer"
                    >
                      {u.full_name}
                    </button>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      @{u.username} · {u.skill_level} · {u.xp} XP
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => requestConnection(u.id)}
                      title="Send connection request"
                      className="p-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--accent-text)] cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openChat(u.id)}
                      className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
                    >
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Active Conversation Panel */}
        <div className="lg:col-span-8 bc-panel flex flex-col overflow-hidden">
          {!activePeer ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-[var(--text-muted)]">
              Select a conversation or developer from the directory to start messaging in real time.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onViewPortfolio(activePeer.username)}
                    className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-text)] cursor-pointer"
                  >
                    {activePeer.full_name}
                  </button>
                  <p className="text-xs text-[var(--text-muted)]">
                    @{activePeer.username} · {peerTyping ? 'typing...' : activePeer.role}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => blockPeer(activePeer.id)}
                  className="bc-btn-danger !h-8 !px-3"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Block</span>
                </button>
              </div>

              {error && (
                <div className="m-3 rounded-lg bg-[var(--status-danger-soft)] border border-[var(--status-danger)]/30 px-3 py-2 text-xs text-[var(--status-danger)]">
                  {error}
                </div>
              )}

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[420px]">
                {messages.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">No messages yet. Say hello.</p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-2.5 text-sm ${
                            isMe
                              ? 'bg-[var(--accent-primary)] text-white'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          {m.attachment_name && (
                            <p className="mt-1 text-[11px] opacity-80 inline-flex items-center gap-1">
                              <Paperclip className="w-3 h-3" /> {m.attachment_name}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] opacity-70 tabular-nums">
                            {m.created_at.slice(11, 16)} {isMe && (m.read_at ? '· Read' : '· Sent')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-[var(--border-default)] space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="Optional attachment filename/reference"
                    className="bc-input !h-8 flex-1 min-w-0 !text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      sendWsEvent('dm:typing', {
                        recipientId: activePeer.id,
                        isTyping: Boolean(e.target.value),
                      });
                    }}
                    placeholder={`Message ${activePeer.full_name}...`}
                    className="bc-input flex-1 min-w-0"
                  />
                  <button
                    type="submit"
                    className="bc-btn-primary shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
