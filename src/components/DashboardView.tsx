import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Code2,
  Compass,
  FolderGit2,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { LearnerRecommendation } from '../types';

interface DashboardData {
  enrollments: Array<{
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    estimated_hours: number;
    total_lessons: number;
    completed_lessons: number;
    last_lesson_id: string;
  }>;
  recommendedCourses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimated_hours: number;
    technology_name: string;
  }>;
  recommendations?: LearnerRecommendation[];
  recentProjects: Array<{
    id: string;
    title: string;
    visibility: string;
    status?: string;
    instructor_feedback?: string;
    updated_at: string;
    tags: string[];
  }>;
  badges: Array<{ id: string; title: string; description: string; awarded_at: string }>;
  bookmarkedLessons?: Array<{
    id: string;
    title: string;
    slug: string;
    duration_minutes: number;
    course_id: string;
    course_title: string;
    course_slug: string;
    technology_name?: string;
  }>;
  learningPathsProgress?: Array<{
    id: string;
    title: string;
    slug: string;
    target_role: string;
    difficulty: string;
    estimated_hours: number;
    course_ids: string[];
    totalLessons: number;
    completedLessons: number;
    percentage: number;
  }>;
  dailyGoal?: {
    goalMinutes: number;
    todayMinutes: number;
    completedToday: number;
  };
  exerciseStats?: {
    solvedCount: number;
    totalAttempts: number;
  };
  certificatesCount?: number;
  pathCertificates?: Array<{
    id: string;
    path_title: string;
    certificate_code: string;
    issued_at: string;
  }>;
  assignmentSubmissions?: Array<{
    id: string;
    assignment_title: string;
    course_title: string;
    course_slug: string;
    status: string;
    score: number;
    instructor_feedback: string;
    updated_at: string;
  }>;
  upcomingAssessments: Array<{
    id: string;
    title: string;
    type: string;
    mode: string;
    xp_reward: number;
    course_title: string;
    course_slug: string;
    best_score: number | null;
    max_score: number | null;
  }>;
  leaderboard: Array<{
    id: string;
    full_name: string;
    username: string;
    xp: number;
    level: number;
    streak_days: number;
  }>;
  aiUsage: {
    requestsToday: number;
    dailyLimit: number;
    remaining: number;
    model: string;
  };
}

interface DashboardViewProps {
  onNavigate: (view: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { user, setUser, entitlement } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalMinutesInput, setGoalMinutesInput] = useState(30);
  const [savingGoal, setSavingGoal] = useState(false);

  const loadDashboard = () => {
    setLoading(true);
    api
      .get<DashboardData>('/dashboard')
      .then((res) => {
        setData(res);
        setGoalMinutesInput(res.dailyGoal?.goalMinutes || user?.daily_goal_minutes || 30);
      })
      .catch((e) => setError(e.message || 'Could not load dashboard.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const saveDailyGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGoal(true);
    try {
      const res = await api.put<{ user: any }>('/profile', { dailyGoalMinutes: goalMinutesInput });
      if (res.user) setUser(res.user);
      setEditingGoal(false);
      loadDashboard();
    } catch {
      // handled gracefully
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] p-6 text-sm text-[var(--status-danger)]">
        {error || 'Unable to load dashboard.'}
      </div>
    );
  }

  const quickAccess = [
    { id: 'courses', label: 'My Learning', desc: 'Courses & paths', icon: BookOpen },
    { id: 'workspace', label: 'Coding Workspace', desc: 'Browser IDE', icon: Code2 },
    { id: 'ai', label: 'AI Assistant', desc: 'Tutor & debugging', icon: Bot },
    { id: 'communities', label: 'Communities', desc: 'Peer guilds', icon: Users },
    { id: 'messages', label: 'Messages', desc: 'Direct chat', icon: MessageSquare },
    { id: 'projects', label: 'Projects & Portfolio', desc: 'Showcase builds', icon: FolderGit2 },
    { id: 'resources', label: 'Technical Resources', desc: 'Docs & guides', icon: Compass },
    { id: 'pricing', label: 'Subscription & Billing', desc: entitlement?.planName || 'Plan', icon: ShieldCheck },
  ];

  const goalTarget = data.dailyGoal?.goalMinutes || 30;
  const todayMins = data.dailyGoal?.todayMinutes || 0;
  const goalPct = Math.min(100, Math.round((todayMins / Math.max(1, goalTarget)) * 100));

  return (
    <div className="space-y-8">
      {/* Welcome & Real Account Summary */}
      <section className="bc-panel p-5 sm:p-8 space-y-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--accent-text)]">
              {entitlement?.planName} · {user?.skill_level || 'beginner'} track
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-[var(--text-primary)]">
              Welcome back, {user?.full_name}
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              {user?.goals?.length
                ? `Current focus: ${user.goals[0]}`
                : 'Select a course or open the Coding Workspace to record your first engineering milestone.'}
            </p>
            {!user?.email_verified && (
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className="mt-3 text-xs font-semibold text-[var(--status-warning)] hover:underline cursor-pointer"
              >
                Email verification pending — complete in Settings
              </button>
            )}
          </div>

          {/* Unified Hairline-Divided Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-default)] rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] shrink-0">
            <div className="px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">Total XP</p>
              <p className="text-xl font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">{user?.xp ?? 0}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">Streak</p>
              <p className="text-xl font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">{user?.streak_days ?? 0}d</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">Exercises Solved</p>
              <p className="text-xl font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">{data.exerciseStats?.solvedCount ?? 0}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">Certificates</p>
              <p className="text-xl font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">
                {(data.certificatesCount ?? 0) + (data.pathCertificates?.length ?? 0)}
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1 px-4 py-3">
              <p className="text-xs text-[var(--text-muted)]">AI Quota Left</p>
              <p className="text-xl font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">
                {data.aiUsage.remaining}/{data.aiUsage.dailyLimit}
              </p>
            </div>
          </div>
        </div>

        {/* Daily Study Goal Bar */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[var(--text-primary)]">
                Daily Learning Goal · {todayMins}/{goalTarget} mins today ({data.dailyGoal?.completedToday || 0} lessons completed today)
              </span>
              <span className="font-mono tabular-nums text-[var(--accent-text)]">{goalPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-muted)] overflow-hidden">
              <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all" style={{ width: `${goalPct}%` }} />
            </div>
          </div>

          {!editingGoal ? (
            <button
              type="button"
              onClick={() => setEditingGoal(true)}
              className="bc-btn-secondary !h-8 !px-3.5 shrink-0"
            >
              Adjust Daily Target
            </button>
          ) : (
            <form onSubmit={saveDailyGoal} className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                type="number"
                min={10}
                max={240}
                value={goalMinutesInput}
                onChange={(e) => setGoalMinutesInput(Number(e.target.value))}
                aria-label="Daily goal target in minutes"
                className="bc-input !w-20 !h-8 !text-xs tabular-nums"
              />
              <button
                type="submit"
                disabled={savingGoal}
                className="bc-btn-primary !h-8 !px-3"
              >
                {savingGoal ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingGoal(false)}
                className="bc-btn-secondary !h-8 !px-2.5"
              >
                Cancel
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Quick Access Grid */}
      <section>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickAccess.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigate(card.id)}
              className="bc-panel text-left p-4 hover:border-[var(--accent-primary)]/50 transition-colors cursor-pointer"
            >
              <card.icon className="w-4 h-4 text-[var(--accent-primary)] mb-2.5" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">{card.label}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{card.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Continue Learning & Recommended Courses */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Continue Learning</h2>
            <button
              type="button"
              onClick={() => onNavigate('courses')}
              className="text-xs font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
            >
              Explore All Courses
            </button>
          </div>

          {data.enrollments.length === 0 ? (
            <div className="bc-panel border-dashed p-8 text-center">
              <GraduationCap className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">No courses enrolled yet</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                Inspect any course outline for free and enroll to track your lessons, exercises, and XP progress here.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('courses')}
                className="bc-btn-primary mt-4 !h-9"
              >
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="bc-panel divide-y divide-[var(--border-subtle)]">
              {data.enrollments.map((c) => {
                const pct = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0;
                return (
                  <div
                    key={c.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span>{c.difficulty}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {c.completed_lessons}/{c.total_lessons} lessons ({pct}%)
                        </span>
                      </div>
                      <h3 className="text-base font-semibold mt-1 text-[var(--text-primary)]">{c.title}</h3>
                      <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                        <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(`course:${c.slug}`)}
                      className="bc-btn-primary !h-9 shrink-0"
                    >
                      <span>Resume</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Career Learning Paths Progress */}
          {data.learningPathsProgress && data.learningPathsProgress.length > 0 && (
            <div className="pt-1 space-y-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Career Learning Paths Progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.learningPathsProgress.map((lp) => (
                  <div
                    key={lp.id}
                    className="bc-panel p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>{lp.target_role || lp.difficulty}</span>
                      <span className="font-mono tabular-nums text-[var(--accent-text)]">{lp.percentage}%</span>
                    </div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{lp.title}</h3>
                    <div className="h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                      <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${lp.percentage}%` }} />
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {lp.completedLessons}/{lp.totalLessons} lessons across {lp.course_ids.length} courses
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bookmarked Lessons Resume Strip */}
          {data.bookmarkedLessons && data.bookmarkedLessons.length > 0 && (
            <div className="pt-1 space-y-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Bookmarked Lessons</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {data.bookmarkedLessons.slice(0, 4).map((bm) => (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => onNavigate(`course:${bm.course_slug}`)}
                    className="bc-panel p-3.5 hover:border-[var(--accent-primary)]/50 text-left cursor-pointer"
                  >
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {bm.technology_name || bm.course_title} · {bm.duration_minutes}m
                    </p>
                    <p className="text-xs font-semibold truncate mt-0.5 text-[var(--text-primary)]">{bm.title}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Phase 24 Rule-Based Recommended Next Steps */}
          {data.recommendations && data.recommendations.length > 0 && (
            <div data-testid="recommended-next-steps" className="bc-panel p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
                  <Compass className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Recommended Next Steps</span>
                </h2>
                <span className="text-xs text-[var(--text-muted)]">Based on your progress &amp; mastery</span>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.recommendations.slice(0, 4).map((rec) => (
                  <div
                    key={rec.id}
                    className="py-3 first:pt-1 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                        {(rec.category || rec.type || 'recommended').replace(/_/g, ' ')}
                      </p>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{rec.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)]">{rec.reason}</p>
                    </div>
                    {rec.courseSlug && (
                      <button
                        type="button"
                        onClick={() => onNavigate(`course:${rec.courseSlug}`)}
                        className="bc-btn-secondary !h-8 !px-3.5 text-[var(--accent-text)] shrink-0 whitespace-nowrap"
                      >
                        <span>{rec.actionLabel || 'Continue'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next */}
          {data.recommendedCourses.length > 0 && (
            <div className="pt-1 space-y-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Recommended for Your Track</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.recommendedCourses.slice(0, 4).map((rc) => (
                  <div
                    key={rc.id}
                    className="bc-panel p-4 flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {rc.technology_name} · {rc.estimated_hours}h
                      </p>
                      <h3 className="text-sm font-semibold mt-1 text-[var(--text-primary)]">{rc.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate(`course:${rc.slug}`)}
                      className="mt-3 text-xs font-semibold text-[var(--accent-text)] hover:underline self-start cursor-pointer"
                    >
                      Inspect Outline →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Assessments, Assignments, Projects, Certificates, Badges & Leaderboard */}
        <div className="lg:col-span-5 space-y-6">
          {data.pathCertificates && data.pathCertificates.length > 0 && (
            <div className="bc-panel p-5 space-y-2.5">
              <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--status-success)]">
                <Award className="w-4 h-4" />
                <span>Career Path Certificates ({data.pathCertificates.length})</span>
              </h2>
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.pathCertificates.map((pc) => (
                  <div key={pc.id} className="py-2.5 first:pt-1 last:pb-0 text-xs">
                    <p className="font-semibold text-[var(--text-primary)]">{pc.path_title}</p>
                    <p className="font-mono text-[11px] text-[var(--status-success)] mt-0.5">
                      {pc.certificate_code}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.assignmentSubmissions && data.assignmentSubmissions.length > 0 && (
            <div className="bc-panel p-5 space-y-2.5">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Recent Assignment Submissions</h2>
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.assignmentSubmissions.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onNavigate(`course:${sub.course_slug}`)}
                    className="w-full text-left py-2.5 first:pt-1 last:pb-0 hover:text-[var(--accent-text)] cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold truncate text-[var(--text-primary)]">{sub.assignment_title}</span>
                      <span className="capitalize text-[var(--accent-text)] shrink-0">
                        {sub.status.replace('_', ' ')}
                        {sub.score > 0 ? ` (${sub.score}%)` : ''}
                      </span>
                    </div>
                    {sub.instructor_feedback && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                        Feedback: {sub.instructor_feedback}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bc-panel p-5">
            <h2 className="text-sm font-bold mb-2 text-[var(--text-primary)]">Assessments &amp; Challenges</h2>
            <div className="divide-y divide-[var(--border-subtle)]">
              {data.upcomingAssessments.map((a) => (
                <div
                  key={a.id}
                  className="py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)] truncate">{a.course_title}</p>
                    <p className="text-sm font-medium truncate text-[var(--text-primary)]">{a.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(`course:${a.course_slug}`)}
                    className="bc-btn-secondary !h-8 !px-3 shrink-0"
                  >
                    {a.best_score !== null ? `${a.best_score}/${a.max_score}` : `+${a.xp_reward} XP`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bc-panel p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Recent Projects</h2>
              <button
                type="button"
                onClick={() => onNavigate('projects')}
                className="text-xs text-[var(--accent-text)] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
            {data.recentProjects.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                No saved projects yet. Build something in the Coding Workspace or publish a portfolio build.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {data.recentProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-2 first:pt-0 last:pb-0">
                    <span className="font-medium truncate text-[var(--text-primary)]">{p.title}</span>
                    <span className="text-xs text-[var(--text-muted)] capitalize shrink-0">{p.visibility}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bc-panel p-5">
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
              <Award className="w-4 h-4 text-[var(--status-warning)]" />
              <span>Earned Badges &amp; Leaderboard</span>
            </h2>
            {data.badges.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Complete your first lesson or quiz (50 XP) to unlock your first achievement badge.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] mb-4">
                {data.badges.map((b) => (
                  <div key={b.id} className="text-xs py-2 first:pt-0">
                    <span className="font-semibold text-[var(--text-primary)]">{b.title}</span> —{' '}
                    <span className="text-[var(--text-secondary)]">{b.description}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-[var(--border-subtle)] pt-3 space-y-2">
              {data.leaderboard.slice(0, 5).map((row, idx) => (
                <div key={row.id} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-secondary)]">
                    <span className="font-mono text-[var(--text-muted)] mr-2">{idx + 1}.</span>
                    {row.full_name}
                  </span>
                  <span className="font-mono tabular-nums text-[var(--accent-text)]">{row.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
