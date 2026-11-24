import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Flag,
  Heart,
  Lock,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { CommunityItem } from '../types';

export function CommunitiesView({ onOpenPricing }: { onOpenPricing: () => void }) {
  const { user, entitlement } = useAuth();
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    community: CommunityItem;
    posts: any[];
    members: any[];
  } | null>(null);

  // Create Community modal (backend checks premium entitlement!)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Full-Stack Engineering');
  const [newPrivacy, setNewPrivacy] = useState<'public' | 'private' | 'approval'>('public');
  const [newRules, setNewRules] = useState('Be constructive and share reproducible snippets.');

  // Post & Comment state
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postResource, setPostResource] = useState('');
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadList = async () => {
    const res = await api.get<{ communities: CommunityItem[] }>(
      `/communities${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`
    );
    setCommunities(res.communities);
  };

  useEffect(() => {
    loadList().catch(() => {});
  }, []);

  const openCommunity = async (id: string) => {
    setError(null);
    try {
      const data = await api.get<any>(`/communities/${id}`);
      setActiveId(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to view community.');
    }
  };

  const handleJoin = async (id: string) => {
    await api.post(`/communities/${id}/join`);
    await loadList();
    if (activeId === id) openCommunity(id);
  };

  const handleLeave = async (id: string) => {
    setError(null);
    try {
      await api.post(`/communities/${id}/leave`);
      await loadList();
      if (activeId === id) setActiveId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to leave community.');
    }
  };

  const handleClickCreateCommunity = () => {
    setError(null);
    if (!entitlement?.limits.canCreateCommunity) {
      setShowUpgradePrompt(true);
      return;
    }
    setShowCreateModal(true);
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/communities', {
        name: newName,
        description: newDesc,
        category: newCategory,
        privacy: newPrivacy,
        rules: newRules.split('\n').map((s) => s.trim()).filter(Boolean),
      });
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      await loadList();
      openCommunity(res.id);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'PREMIUM_REQUIRED') {
        setShowCreateModal(false);
        setShowUpgradePrompt(true);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not create community.');
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId) return;
    setError(null);
    try {
      await api.post(`/communities/${activeId}/posts`, {
        title: postTitle,
        content: postContent,
        resourceUrl: postResource,
      });
      setPostTitle('');
      setPostContent('');
      setPostResource('');
      openCommunity(activeId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish post.');
    }
  };

  const handleReact = async (postId: string) => {
    await api.post(`/posts/${postId}/react`);
    if (activeId) openCommunity(activeId);
  };

  const handleComment = async (postId: string) => {
    const content = (commentText[postId] || '').trim();
    if (!content) return;
    await api.post(`/posts/${postId}/comments`, { content });
    setCommentText((prev) => ({ ...prev, [postId]: '' }));
    if (activeId) openCommunity(activeId);
  };

  const handleDeletePost = async (postId: string) => {
    await api.delete(`/posts/${postId}`);
    if (activeId) openCommunity(activeId);
  };

  const handleReportPost = async (postId: string) => {
    await api.post('/reports', {
      targetType: 'post',
      targetId: postId,
      reason: 'Reported by community member for moderator review.',
    });
    setError('Report submitted to platform moderators.');
  };

  const handleMemberAction = async (targetUserId: string, action: string) => {
    if (!activeId) return;
    await api.post(`/communities/${activeId}/members/${targetUserId}`, { action });
    openCommunity(activeId);
  };

  if (activeId && detail) {
    const { community, posts, members } = detail;
    const isOwnerOrMod = ['owner', 'moderator'].includes(community.myMembership?.role || '');
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setActiveId(null);
            setDetail(null);
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Communities</span>
        </button>

        {error && (
          <div className="rounded-lg border border-[var(--status-warning)]/35 bg-[var(--status-warning-soft)] px-4 py-3 text-xs text-[var(--status-warning)]">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="bc-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-[var(--accent-text)] font-medium">
                    {community.category} · {community.privacy} community
                  </p>
                  <h1 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{community.name}</h1>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5">{community.description}</p>
                </div>
                {community.myMembership?.status === 'active' && community.owner_id !== user?.id ? (
                  <button
                    type="button"
                    onClick={() => handleLeave(community.id)}
                    className="bc-btn-secondary !h-9"
                  >
                    Leave Community
                  </button>
                ) : !community.myMembership ? (
                  <button
                    type="button"
                    onClick={() => handleJoin(community.id)}
                    className="bc-btn-primary !h-9"
                  >
                    {community.privacy === 'public' ? 'Join Free' : 'Request Membership'}
                  </button>
                ) : null}
              </div>
            </div>

            {community.myMembership?.status === 'active' && (
              <form
                onSubmit={handleCreatePost}
                className="bc-panel p-5 space-y-3"
              >
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Start a Discussion</h2>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="Discussion title"
                  className="bc-input w-full"
                />
                <textarea
                  rows={3}
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share code questions, architecture notes, or learning reflections..."
                  className="bc-textarea w-full"
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="url"
                    value={postResource}
                    onChange={(e) => setPostResource(e.target.value)}
                    placeholder="Optional learning resource URL"
                    className="bc-input !h-9 flex-1 min-w-0 !text-xs"
                  />
                  <button
                    type="submit"
                    className="bc-btn-primary !h-9 shrink-0"
                  >
                    Publish Post
                  </button>
                </div>
              </form>
            )}

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bc-panel p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {post.author_name} (@{post.author_username}) · {post.created_at.slice(0, 10)}
                      </p>
                      <h3 className="text-base font-bold mt-1 text-[var(--text-primary)]">{post.title}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReportPost(post.id)}
                        aria-label="Report post"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--status-warning)] cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                      {(post.author_id === user?.id || isOwnerOrMod) && (
                        <button
                          type="button"
                          onClick={() => handleDeletePost(post.id)}
                          aria-label="Remove post"
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--status-danger)] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{post.content}</p>
                  {post.resource_url && (
                    <a
                      href={post.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[var(--accent-text)] hover:underline block break-all"
                    >
                      {post.resource_url}
                    </a>
                  )}
                  <div className="pt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <button
                      type="button"
                      onClick={() => handleReact(post.id)}
                      className="inline-flex items-center gap-1.5 hover:text-[var(--accent-text)] cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{post.likes.length} Likes</span>
                    </button>
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{post.comments.length} Comments</span>
                    </span>
                  </div>

                  {/* Comments */}
                  <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                    {post.comments.map((c: any) => (
                      <div key={c.id} className="text-xs bg-[var(--bg-subtle)] rounded-lg p-2.5 text-[var(--text-secondary)]">
                        <span className="font-semibold text-[var(--text-primary)]">{c.author_name}: </span>
                        <span>{c.content}</span>
                      </div>
                    ))}
                    {community.myMembership?.status === 'active' && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          placeholder="Write a reply..."
                          className="bc-input !h-8 flex-1 min-w-0 !text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleComment(post.id)}
                          className="bc-btn-secondary !h-8 !px-3 shrink-0"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>

          {/* Rules & Moderation Sidebar */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bc-panel p-5 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Community Rules</span>
              </h3>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {community.rules.map((r, i) => (
                  <li key={i}>
                    {i + 1}. {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bc-panel p-5 space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Members ({members.length})</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate text-[var(--text-primary)]">
                      {m.full_name} <span className="text-[var(--text-muted)]">({m.role} · {m.status})</span>
                    </span>
                    {isOwnerOrMod && m.user_id !== community.owner_id && (
                      <div className="flex items-center gap-1 shrink-0">
                        {m.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleMemberAction(m.user_id, 'approve')}
                            className="text-[var(--status-success)] font-semibold cursor-pointer"
                          >
                            Approve
                          </button>
                        )}
                        {community.myMembership?.role === 'owner' && m.role === 'member' && m.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleMemberAction(m.user_id, 'promote_moderator')}
                            className="text-[var(--accent-text)] font-semibold cursor-pointer"
                          >
                            Make Mod
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Developer Communities</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Joining eligible communities is free. Creating and owning a new community requires an active Pro or Studio subscription.
          </p>
        </div>

        <button
          type="button"
          onClick={handleClickCreateCommunity}
          className="bc-btn-primary"
        >
          {!entitlement?.limits.canCreateCommunity ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>Create Community</span>
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          loadList();
        }}
        className="flex gap-2 w-full max-w-md"
      >
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="bc-input w-full !pl-9 !text-xs"
          />
        </div>
        <button type="submit" className="bc-btn-secondary shrink-0">
          Filter
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-4 py-3 text-xs text-[var(--status-danger)]">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {communities.map((comm) => (
          <div
            key={comm.id}
            className="bc-panel p-6 flex flex-col justify-between"
          >
            <div>
              <div className="text-xs text-[var(--text-muted)]">
                {comm.category} · {comm.privacy} · {comm.member_count || 0} members
              </div>
              <h2 className="text-lg font-bold mt-1.5 text-[var(--text-primary)]">{comm.name}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">{comm.description}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openCommunity(comm.id)}
                className="text-xs font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
              >
                Open Guild
              </button>
              {comm.myMembership ? (
                <span className="text-xs font-medium text-[var(--status-success)] capitalize">
                  {comm.myMembership.status === 'pending' ? 'Approval Pending' : `Member (${comm.myMembership.role})`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleJoin(comm.id)}
                  className="bc-btn-secondary !h-8 !px-3"
                >
                  {comm.privacy === 'public' ? 'Join Free' : 'Request Access'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade Required Modal when free user selects Create Community */}
      {showUpgradePrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-md bc-panel p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--status-warning-soft)] text-[var(--status-warning)] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Premium Plan Required to Create a Community</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Joining and participating in existing communities is always free. Creating and moderating a new community requires an active Pro Learner or Team &amp; Studio subscription.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUpgradePrompt(false)}
                className="bc-btn-secondary !h-9"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradePrompt(false);
                  onOpenPricing();
                }}
                className="bc-btn-primary !h-9"
              >
                View Subscription Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Creation Form Modal (Active Premium Users Only) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateCommunity}
            className="w-full max-w-lg bc-panel p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Create New Developer Community</h3>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Community Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Distributed Systems Study Group"
                className="bc-input w-full"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Category</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="bc-input w-full !text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Privacy</label>
                <select
                  value={newPrivacy}
                  onChange={(e) => setNewPrivacy(e.target.value as any)}
                  className="bc-select w-full !text-xs"
                >
                  <option value="public">Public</option>
                  <option value="approval">Approval-Based</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Description</label>
              <textarea
                rows={2}
                required
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="bc-textarea w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Community Rules (one per line)</label>
              <textarea
                rows={2}
                value={newRules}
                onChange={(e) => setNewRules(e.target.value)}
                className="bc-textarea w-full !text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="bc-btn-secondary !h-9"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bc-btn-primary !h-9"
              >
                Create Community
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
