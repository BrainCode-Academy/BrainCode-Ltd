import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { UserProfile } from '../types';

const INTEREST_OPTIONS = [
  'Web Engineering',
  'Backend Systems',
  'Algorithms & CS',
  'Applied AI',
  'UI Architecture',
  'Databases & SQL',
];

const TECH_OPTIONS = ['TypeScript', 'React', 'JavaScript', 'HTML/CSS', 'Node.js', 'SQL', 'Gemini AI', 'Python'];

const GOAL_OPTIONS = [
  'Prepare for software engineering roles',
  'Build full-stack portfolio projects',
  'Master algorithms and problem solving',
  'Learn practical AI integration',
  'Collaborate with peer developers',
];

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  const { user, setUser, brand } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [skillLevel, setSkillLevel] = useState(user?.skill_level || 'beginner');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [preferredTechs, setPreferredTechs] = useState<string[]>(user?.preferred_techs || []);
  const [goals, setGoals] = useState<string[]>(user?.goals || []);
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleItem = (list: string[], setter: (v: string[]) => void, value: string) => {
    if (list.includes(value)) setter(list.filter((x) => x !== value));
    else setter([...list, value]);
  };

  const handleSubmit = async (skipNonEssential = false) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.put<{ user: UserProfile }>('/profile/onboarding', {
        fullName: fullName.trim() || user?.full_name,
        username: username.trim() || user?.username,
        skillLevel,
        interests: skipNonEssential ? [] : interests,
        preferredTechs: skipNonEssential ? [] : preferredTechs,
        goals: skipNonEssential ? [] : goals,
        bio: skipNonEssential ? '' : bio,
      });
      setUser(res.user);
      onComplete();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save onboarding profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-8 shadow-[var(--shadow-md)]">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-[var(--border-default)]">
          <div>
            <p className="text-xs font-semibold text-[#0A84FF] dark:text-[#38BDF8]">{brand.product_name} Setup</p>
            <h1 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">Personalize your learning workspace</h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Tell us what you want to learn so your dashboard and course recommendations fit your goals.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={loading}
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] whitespace-nowrap self-start cursor-pointer"
          >
            Skip optional steps
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-lg bg-[var(--status-danger-soft)] border border-red-500/25 px-4 py-2.5 text-xs text-[var(--status-danger)]">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-fullname" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Full Name
              </label>
              <input
                id="onb-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bc-input w-full"
              />
            </div>
            <div>
              <label htmlFor="onb-username" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Username
              </label>
              <input
                id="onb-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bc-input w-full font-mono"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Current Skill Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {['beginner', 'intermediate', 'advanced'].map((lvl) => {
                const active = skillLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setSkillLevel(lvl)}
                    className={`h-10 rounded-lg border text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0A84FF] bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8]'
                        : 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Areas of Interest
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((item) => {
                const active = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleItem(interests, setInterests, item)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0A84FF] bg-[#0A84FF] text-white'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{item}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Preferred Technologies
            </label>
            <div className="flex flex-wrap gap-2">
              {TECH_OPTIONS.map((tech) => {
                const active = preferredTechs.includes(tech);
                return (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => toggleItem(preferredTechs, setPreferredTechs, tech)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0A84FF] bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8]'
                        : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                    <span>{tech}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-2">
              Learning Goals
            </label>
            <div className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-default)] overflow-hidden">
              {GOAL_OPTIONS.map((g) => {
                const active = goals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleItem(goals, setGoals, g)}
                    className={`w-full text-left px-3.5 py-2.5 text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--text-primary)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span>{g}</span>
                    {active && <Check className="w-4 h-4 text-[#0A84FF] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <label htmlFor="onb-bio" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Short Developer Bio (Optional)
            </label>
            <textarea
              id="onb-bio"
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What are you excited to build?"
              className="bc-textarea w-full"
            />
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="bc-btn-primary h-10 px-5 text-sm w-full sm:w-auto"
            >
              <span>{loading ? 'Saving Profile...' : 'Save & Enter Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
