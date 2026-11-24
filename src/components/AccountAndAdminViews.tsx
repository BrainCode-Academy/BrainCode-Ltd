import React, { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  Inbox,
  Moon,
  Plus,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { api, ApiError, getStoredToken } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ContactInquiry, NotificationItem, UserProfile } from '../types';
import { CurriculumGovernanceHub, type CurriculumSubTab } from './CurriculumManagerViews';

export function NotificationsView() {
  const { refreshSession } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [prefs, setPrefs] = useState<Record<string, number>>({});

  const load = async () => {
    const res = await api.get<{ notifications: NotificationItem[]; prefs: Record<string, number> }>('/notifications');
    setItems(res.notifications);
    setPrefs(res.prefs);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const markRead = async (id: string) => {
    await api.post('/notifications/read', { id });
    await load();
    refreshSession();
  };

  const togglePref = async (key: string) => {
    const next = { ...prefs, [key]: prefs[key] ? 0 : 1 };
    setPrefs(next);
    await api.put('/notifications/prefs', next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Notifications &amp; Preferences</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Messages, connection requests, community activity, assignments, and billing updates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => markRead('all')}
          className="bc-btn-secondary !h-9 !px-4 !text-xs"
        >
          Mark All Read
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bc-panel overflow-hidden">
          {items.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--text-muted)]">
              <Bell className="w-6 h-6 mx-auto mb-2 opacity-60" />
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 ${
                    n.read_at ? 'opacity-75' : 'bg-[var(--accent-soft)]'
                  }`}
                >
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--accent-text)] uppercase">{n.type}</p>
                    <h2 className="text-sm font-bold mt-0.5 text-[var(--text-primary)]">{n.title}</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{n.body}</p>
                  </div>
                  {!n.read_at && (
                    <button
                      type="button"
                      onClick={() => markRead(n.id)}
                      className="text-xs font-semibold text-[var(--accent-text)] shrink-0 cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bc-panel p-5 space-y-3 h-fit">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Alert Preferences</h2>
          <div className="divide-y divide-[var(--border-subtle)]">
            {[
              { key: 'email_messages', label: 'Direct message alerts' },
              { key: 'email_courses', label: 'Course & assignment reminders' },
              { key: 'email_billing', label: 'Payment & renewal notices' },
              { key: 'in_app_community', label: 'Community replies & approvals' },
              { key: 'in_app_assignments', label: 'Instructor grading feedback' },
            ].map((p) => (
              <label key={p.key} className="flex items-center justify-between text-xs py-2.5 cursor-pointer text-[var(--text-secondary)]">
                <span>{p.label}</span>
                <input type="checkbox" checked={Boolean(prefs[p.key])} onChange={() => togglePref(p.key)} />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsView() {
  const { user, setUser, refreshSession, theme, setThemePreference } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [skillLevel, setSkillLevel] = useState(user?.skill_level || 'beginner');
  const [techs, setTechs] = useState((user?.preferred_techs || []).join(', '));
  const [publicProfile, setPublicProfile] = useState(Boolean(user?.public_profile));
  const [allowMessages, setAllowMessages] = useState(Boolean(user?.allow_messages));
  const [savingTheme, setSavingTheme] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setBio(user.bio || '');
    setSkillLevel(user.skill_level || 'beginner');
    setTechs((user.preferred_techs || []).join(', '));
    setPublicProfile(Boolean(user.public_profile));
    setAllowMessages(Boolean(user.allow_messages));
  }, [user?.id]);

  const handleThemeSelect = async (nextTheme: 'light' | 'dark') => {
    if (nextTheme === theme || savingTheme) return;
    setMsg(null);
    setErr(null);
    setSavingTheme(true);
    try {
      await setThemePreference(nextTheme);
      setMsg(`${nextTheme === 'light' ? 'Light' : 'Dark'} theme enabled and saved to your profile.`);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Unable to save theme preference.');
    } finally {
      setSavingTheme(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      const res = await api.put<{ user: UserProfile }>('/profile', {
        fullName,
        bio,
        skillLevel,
        preferredTechs: techs.split(',').map((s) => s.trim()).filter(Boolean),
        publicProfile,
        allowMessages,
        themePreference: theme,
      });
      setUser(res.user);
      setMsg('Profile & privacy settings saved.');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Save failed.');
    }
  };

  const verifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await api.post('/auth/verify-email', { token: verifyToken });
      await refreshSession();
      setMsg('Email verified successfully.');
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Invalid verification token.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Profile &amp; Security Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your developer identity, interface theme, portfolio visibility, and messaging privacy.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] px-4 py-3 text-xs text-[var(--status-success)]">
          {msg}
        </div>
      )}
      {err && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-4 py-3 text-xs text-[var(--status-danger)]">{err}</div>
      )}

      {!user?.email_verified && (
        <form
          onSubmit={verifyEmail}
          className="rounded-xl border border-[var(--status-warning)]/40 bg-[var(--status-warning-soft)] p-5 space-y-3"
        >
          <p className="text-xs font-bold text-[var(--status-warning)]">Email Verification Pending ({user?.email})</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="Paste verification token"
              className="bc-input !h-9 flex-1 text-xs font-mono"
            />
            <button type="submit" className="bc-btn-primary !h-9 !px-4 !text-xs shrink-0">
              Verify
            </button>
          </div>
        </form>
      )}

      <div className="bc-panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Appearance</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Switch between Light and Dark mode. Saved automatically to your account profile.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {savingTheme ? 'Saving...' : theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle light and dark theme"
              disabled={savingTheme}
              onClick={() => handleThemeSelect(theme === 'dark' ? 'light' : 'dark')}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:opacity-60 ${
                theme === 'dark'
                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-muted)] border-[var(--border-strong)]'
              }`}
            >
              <span
                className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white text-slate-800 shadow-sm transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? <Moon className="w-3 h-3 text-[var(--accent-primary)]" /> : <Sun className="w-3 h-3 text-amber-500" />}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Interface theme">
          <button
            type="button"
            role="radio"
            aria-checked={theme === 'light'}
            disabled={savingTheme}
            onClick={() => handleThemeSelect('light')}
            className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-60 ${
              theme === 'light'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                theme === 'light'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <Sun className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold whitespace-nowrap">Light Mode</p>
              <p className="text-[11px] text-[var(--text-muted)]">High-contrast daylight surfaces</p>
            </div>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={theme === 'dark'}
            disabled={savingTheme}
            onClick={() => handleThemeSelect('dark')}
            className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-colors cursor-pointer disabled:opacity-60 ${
              theme === 'dark'
                ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                theme === 'dark'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <Moon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold whitespace-nowrap">Dark Mode</p>
              <p className="text-[11px] text-[var(--text-muted)]">Low-glare studio workspace</p>
            </div>
          </button>
        </div>
      </div>

      <form onSubmit={saveProfile} className="bc-panel p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bc-input w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Skill Level</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="bc-select w-full text-sm"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Skills / Preferred Technologies</label>
          <input
            type="text"
            value={techs}
            onChange={(e) => setTechs(e.target.value)}
            className="bc-input w-full text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Developer Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="bc-textarea w-full text-sm"
          />
        </div>

        <div className="space-y-2 pt-2 text-[var(--text-secondary)]">
          <label className="flex items-center gap-2.5 text-xs cursor-pointer">
            <input type="checkbox" checked={publicProfile} onChange={(e) => setPublicProfile(e.target.checked)} />
            <span>Make my developer portfolio publicly discoverable</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs cursor-pointer">
            <input type="checkbox" checked={allowMessages} onChange={(e) => setAllowMessages(e.target.checked)} />
            <span>Allow verified community members to send me direct messages</span>
          </label>
        </div>

        <button type="submit" className="bc-btn-primary">
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </form>
    </div>
  );
}

type AdminTab = 'overview' | 'curriculum' | 'finance' | 'entitlements' | 'enquiries' | 'moderation';

export function AdminPortalView({
  initialTab,
  initialCurriculumSubTab,
  onCurriculumSubTabChange,
}: {
  initialTab?: AdminTab;
  initialCurriculumSubTab?: CurriculumSubTab;
  onCurriculumSubTabChange?: (sub: CurriculumSubTab) => void;
} = {}) {
  const { user, refreshPublicConfig } = useAuth();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'overview');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  // Brand, Contact & Social Config
  const [brandName, setBrandName] = useState('');
  const [tagline, setTagline] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [officialContactEmail, setOfficialContactEmail] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [officeHours, setOfficeHours] = useState('');
  const [contactIntro, setContactIntro] = useState('');
  const [aboutHeadline, setAboutHeadline] = useState('');
  const [aboutDescription, setAboutDescription] = useState('');
  const [footerAboutText, setFooterAboutText] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialX, setSocialX] = useState('');
  const [socialWhatsappCommunity, setSocialWhatsappCommunity] = useState('');
  const [socialCustom, setSocialCustom] = useState<Array<{ label: string; url: string }>>([]);

  // Contact Enquiries filter & row drafts
  const [enquiryFilter, setEnquiryFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
  const [enquiryStatusDrafts, setEnquiryStatusDrafts] = useState<Record<string, 'pending' | 'reviewed' | 'resolved'>>({});
  const [enquiryNotesDrafts, setEnquiryNotesDrafts] = useState<Record<string, string>>({});

  // AI Config
  const [aiFreeLimit, setAiFreeLimit] = useState(15);
  const [aiPremiumLimit, setAiPremiumLimit] = useState(250);
  const [aiGuardrail, setAiGuardrail] = useState('');

  // Curriculum & Resources
  const [catName, setCatName] = useState('');
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [techName, setTechName] = useState('');
  const [techSymbol, setTechSymbol] = useState('');
  const [techCatId, setTechCatId] = useState('cat_web_dev');
  const [techBrandColor, setTechBrandColor] = useState('#0A84FF');
  const [techDifficulty, setTechDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [techContentStatus, setTechContentStatus] = useState<'available' | 'in_development' | 'coming_soon'>('coming_soon');
  const [techAliases, setTechAliases] = useState('');
  const [techFeaturedOrder, setTechFeaturedOrder] = useState(0);
  const [techIsPopular, setTechIsPopular] = useState(false);
  const [techDescription, setTechDescription] = useState('');
  const [adminTechSearch, setAdminTechSearch] = useState('');
  const [adminTechLimit, setAdminTechLimit] = useState(30);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseCatId, setCourseCatId] = useState('cat_web_dev');
  const [courseTechId, setCourseTechId] = useState('tech_ts');
  const [courseDifficulty, setCourseDifficulty] = useState('Intermediate');
  const [pathTitle, setPathTitle] = useState('');
  const [pathDesc, setPathDesc] = useState('');
  const [pathHours, setPathHours] = useState(20);
  const [resTitle, setResTitle] = useState('');
  const [resSummary, setResSummary] = useState('');
  const [resMarkdown, setResMarkdown] = useState('');

  // Module & Lesson CMS
  const [modCourseId, setModCourseId] = useState('');
  const [modTitle, setModTitle] = useState('');
  const [lessonCourseId, setLessonCourseId] = useState('');
  const [lessonModuleId, setLessonModuleId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonLanguage, setLessonLanguage] = useState('python');
  const [lessonTier, setLessonTier] = useState<'free' | 'premium'>('free');
  const [lessonStatus, setLessonStatus] = useState<'draft' | 'review' | 'approved' | 'published' | 'archived'>('published');
  const [lessonMarkdown, setLessonMarkdown] = useState('');
  const [lessonCode, setLessonCode] = useState('');
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [previewLessonModal, setPreviewLessonModal] = useState(false);
  const [lessonDetails, setLessonDetails] = useState<{ blocks: any[]; codeExamples: any[]; exercises: any[] } | null>(null);
  const [blockType, setBlockType] = useState('callout');
  const [blockTitle, setBlockTitle] = useState('');
  const [blockContent, setBlockContent] = useState('');
  const [exampleTitle, setExampleTitle] = useState('');
  const [exampleLang, setExampleLang] = useState('javascript');
  const [exampleCode, setExampleCode] = useState('');
  const [exampleExpected, setExampleExpected] = useState('');

  // Topics, Exercises, Assessments, Assignments, Templates CMS
  const [topicCourseId, setTopicCourseId] = useState('');
  const [topicModuleId, setTopicModuleId] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [topicSummary, setTopicSummary] = useState('');

  const [exCourseId, setExCourseId] = useState('');
  const [exLessonId, setExLessonId] = useState('');
  const [exTitle, setExTitle] = useState('');
  const [exType, setExType] = useState('multiple_choice');
  const [exDifficulty, setExDifficulty] = useState('Beginner');
  const [exPrompt, setExPrompt] = useState('');
  const [exStarterCode, setExStarterCode] = useState('');
  const [exOptionsText, setExOptionsText] = useState('');
  const [exCorrectAnswer, setExCorrectAnswer] = useState('');
  const [exHint, setExHint] = useState('');
  const [exExplanation, setExExplanation] = useState('');
  const [exXp, setExXp] = useState(25);

  const [asmCourseId, setAsmCourseId] = useState('');
  const [asmTitle, setAsmTitle] = useState('');
  const [asmPassingPct, setAsmPassingPct] = useState(70);
  const [asmXp, setAsmXp] = useState(80);
  const [asmQuestionPrompt, setAsmQuestionPrompt] = useState('');
  const [asmQuestionOptions, setAsmQuestionOptions] = useState('Option A\nOption B\nOption C');
  const [asmQuestionCorrect, setAsmQuestionCorrect] = useState('Option A');

  const [asnOrTplMode, setAsnOrTplMode] = useState<'assignment' | 'template'>('assignment');
  const [asnCourseId, setAsnCourseId] = useState('');
  const [asnTitle, setAsnTitle] = useState('');
  const [asnInstructions, setAsnInstructions] = useState('');
  const [asnReqs, setAsnReqs] = useState('');
  const [tplTechId, setTplTechId] = useState('tech_html');
  const [tplTitle, setTplTitle] = useState('');
  const [tplSummary, setTplSummary] = useState('');
  const [tplStarterCode, setTplStarterCode] = useState('');

  // Bulk Import / Export
  const [importPayload, setImportPayload] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importPublishNow, setImportPublishNow] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    valid: boolean;
    format: string;
    summary: Record<string, number>;
    warnings: string[];
  } | null>(null);

  // Grading drafts
  const [gradeScores, setGradeScores] = useState<Record<string, string>>({});
  const [gradeNotes, setGradeNotes] = useState<Record<string, string>>({});
  const [asnGradeStatus, setAsnGradeStatus] = useState<Record<string, string>>({});
  const [asnGradeScore, setAsnGradeScore] = useState<Record<string, string>>({});
  const [asnGradeFeedback, setAsnGradeFeedback] = useState<Record<string, string>>({});
  const [asnRubricDrafts, setAsnRubricDrafts] = useState<Record<string, Record<string, string>>>({});
  const [exGradeScore, setExGradeScore] = useState<Record<string, string>>({});
  const [exGradeFeedback, setExGradeFeedback] = useState<Record<string, string>>({});
  const [prjStatus, setPrjStatus] = useState<Record<string, string>>({});
  const [prjFeedback, setPrjFeedback] = useState<Record<string, string>>({});
  const [prjRubricDrafts, setPrjRubricDrafts] = useState<Record<string, Record<string, string>>>({});

  // Plan price drafts
  const [planMonthly, setPlanMonthly] = useState<Record<string, string>>({});
  const [planYearly, setPlanYearly] = useState<Record<string, string>>({});

  // Entitlement grant form
  const [grantUserId, setGrantUserId] = useState('');
  const [grantFeature, setGrantFeature] = useState('all_premium');
  const [grantSource, setGrantSource] = useState('scholarship');
  const [grantDays, setGrantDays] = useState(30);
  const [grantNotes, setGrantNotes] = useState('');

  // Student Progress & Certificates Registry
  const [studentsProgress, setStudentsProgress] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [adminCerts, setAdminCerts] = useState<any[]>([]);
  const [certFilter, setCertFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [certSearch, setCertSearch] = useState('');
  const [revokeReasons, setRevokeReasons] = useState<Record<string, string>>({});

  const loadLessonDetails = async (lessonId: string) => {
    try {
      const res = await api.get<{ blocks: any[]; codeExamples: any[]; exercises: any[] }>(
        `/admin/lessons/${lessonId}/details`
      );
      setLessonDetails(res);
    } catch {
      setLessonDetails(null);
    }
  };

  const load = async () => {
    try {
      const res = await api.get<any>('/admin/overview');
      setData(res);
      if (Array.isArray(res.courses) && res.courses.length > 0) {
        const firstCid = res.courses[0].id;
        if (!modCourseId) setModCourseId(firstCid);
        if (!lessonCourseId) setLessonCourseId(firstCid);
        if (!topicCourseId) setTopicCourseId(firstCid);
        if (!exCourseId) setExCourseId(firstCid);
        if (!asmCourseId) setAsmCourseId(firstCid);
        if (!asnCourseId) setAsnCourseId(firstCid);
      }
      if (Array.isArray(res.modules) && res.modules.length > 0) {
        if (!lessonModuleId) setLessonModuleId(res.modules[0].id);
        if (!topicModuleId) setTopicModuleId(res.modules[0].id);
      }
      if (Array.isArray(res.lessons) && res.lessons.length > 0 && !exLessonId) {
        setExLessonId(res.lessons[0].id);
      }
      if (res.brand) {
        setBrandName(res.brand.product_name || '');
        setTagline(res.brand.tagline || '');
        setCompanyName(res.brand.company_name || '');
        setLogoUrl(res.brand.logo_url || '');
        setFaviconUrl(res.brand.favicon_url || '');
        setOfficialContactEmail(res.brand.official_contact_email || '');
        setSupportEmail(res.brand.support_email || '');
        setBusinessPhone(res.brand.business_phone || '');
        setWhatsappUrl(res.brand.whatsapp_url || '');
        setBusinessAddress(res.brand.business_address || '');
        setOfficeHours(res.brand.office_hours || '');
        setContactIntro(res.brand.contact_intro || '');
        setAboutHeadline(res.brand.about_headline || '');
        setAboutDescription(res.brand.about_description || '');
        setFooterAboutText(res.brand.footer_about_text || '');
        const sl = res.brand.social_links || {};
        setSocialFacebook(sl.facebook || '');
        setSocialInstagram(sl.instagram || '');
        setSocialYoutube(sl.youtube || '');
        setSocialTiktok(sl.tiktok || '');
        setSocialLinkedin(sl.linkedin || '');
        setSocialX(sl.x || '');
        setSocialWhatsappCommunity(sl.whatsapp_community || '');
        setSocialCustom(Array.isArray(sl.custom) ? sl.custom : []);
      }
      if (Array.isArray(res.contactInquiries)) {
        const stDrafts: Record<string, 'pending' | 'reviewed' | 'resolved'> = {};
        const nDrafts: Record<string, string> = {};
        for (const inq of res.contactInquiries as ContactInquiry[]) {
          stDrafts[inq.id] = inq.status || 'pending';
          nDrafts[inq.id] = inq.admin_notes || '';
        }
        setEnquiryStatusDrafts(stDrafts);
        setEnquiryNotesDrafts(nDrafts);
      }
      if (res.aiConfig) {
        setAiFreeLimit(res.aiConfig.daily_free_limit || 15);
        setAiPremiumLimit(res.aiConfig.daily_premium_limit || 250);
        setAiGuardrail(res.aiConfig.system_guardrail || '');
      }
      if (Array.isArray(res.plans)) {
        const mDraft: Record<string, string> = {};
        const yDraft: Record<string, string> = {};
        for (const p of res.plans) {
          mDraft[p.id] = String(p.monthly_price_cents);
          yDraft[p.id] = String(p.yearly_price_cents);
        }
        setPlanMonthly(mDraft);
        setPlanYearly(yDraft);
      }
      if (Array.isArray(res.users) && res.users.length > 0 && !grantUserId) {
        setGrantUserId(res.users[0].id);
      }
      if (user?.role === 'admin' || user?.role === 'instructor') {
        try {
          const [progRes, certRes] = await Promise.all([
            api.get<{ students: any[] }>('/admin/students/progress?limit=100'),
            api.get<{ certificates: any[] }>('/admin/certificates'),
          ]);
          setStudentsProgress(progRes.students || []);
          setAdminCerts(certRes.certificates || []);
        } catch {
          // Non-fatal if restricted
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Admin access restricted.');
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-500 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }
  if (!data) return <div className="h-40 rounded-2xl bg-slate-200/50 dark:bg-white/[0.04] animate-pulse" />;

  const isAdmin = user?.role === 'admin';
  const canCms = user?.role === 'admin' || user?.role === 'instructor';
  const canSupport = user?.role === 'admin' || user?.role === 'moderator';

  const runAction = async (fn: () => Promise<void>, successText: string) => {
    setStatusMsg(null);
    setActionError(null);
    try {
      await fn();
      setStatusMsg(successText);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Operation failed.');
    }
  };

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }>; visible: boolean }> = [
    { id: 'overview', label: 'Overview & Config', icon: SlidersHorizontal, visible: true },
    { id: 'curriculum', label: 'Curriculum & Grading', icon: BookOpen, visible: canCms },
    { id: 'finance', label: 'Finance & Plans', icon: CreditCard, visible: isAdmin },
    { id: 'entitlements', label: 'Entitlements & Audit', icon: Award, visible: isAdmin },
    {
      id: 'enquiries',
      label: `Contact Enquiries${data.metrics?.pendingInquiries ? ` (${data.metrics.pendingInquiries})` : ''}`,
      icon: Inbox,
      visible: canSupport,
    },
    { id: 'moderation', label: 'Users & Moderation', icon: Users, visible: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Instructor, Finance &amp; Admin Portal</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Role: <span className="font-semibold capitalize text-[var(--text-primary)]">{user?.role}</span> · Platform analytics, branding, enquiries, curriculum CMS, plan pricing, entitlements, moderation, and audit logs.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] px-4 py-3 text-xs text-[var(--status-success)]">
          {statusMsg}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-4 py-3 text-xs text-[var(--status-danger)]">
          {actionError}
        </div>
      )}

      {/* Unified KPI Metrics Strip + Directory Coverage Summary */}
      <div className="bc-panel overflow-hidden divide-y divide-[var(--border-subtle)]">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          {[
            { label: 'Users', val: data.metrics.users },
            { label: 'Courses', val: data.metrics.courses },
            { label: 'Technologies', val: data.metrics.totalTechnologies ?? (data.technologies || []).length },
            { label: 'With Courses', val: data.metrics.technologiesAvailable ?? 0 },
            { label: 'Enrollments', val: data.metrics.enrollments },
            { label: 'Active Subs', val: data.metrics.activeSubscriptions },
            { label: 'Revenue', val: `$${((data.metrics.revenueCents || 0) / 100).toFixed(2)}` },
          ].map((m) => (
            <div key={m.label} className="px-4 py-3">
              <p className="text-[11px] text-[var(--text-muted)]">{m.label}</p>
              <p className="text-lg font-bold tabular-nums mt-0.5 text-[var(--text-primary)]">{m.val}</p>
            </div>
          ))}
        </div>

        <div className="bg-[var(--bg-subtle)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4 tabular-nums text-[var(--text-secondary)]">
            <span>
              Published Techs: <strong className="text-[var(--text-primary)]">{data.metrics.publishedTechnologies ?? 0}</strong>
            </span>
            <span>
              Draft / Unpublished: <strong className="text-[var(--text-primary)]">{data.metrics.draftTechnologies ?? 0}</strong>
            </span>
            <span>
              Without Linked Courses: <strong className="text-[var(--text-primary)]">{data.metrics.technologiesWithoutContent ?? 0}</strong>
            </span>
            <span>
              Pending Enquiries: <strong className="text-[var(--text-primary)]">{data.metrics.pendingInquiries ?? 0}</strong>
            </span>
            <span>
              Open Reports: <strong className="text-[var(--text-primary)]">{data.metrics.openReports}</strong>
            </span>
            <span>
              AI Calls Today: <strong className="text-[var(--text-primary)]">{data.metrics.aiRequestsToday}</strong>
            </span>
          </div>
          {Array.isArray(data.metrics.duplicateTechNames) && data.metrics.duplicateTechNames.length > 0 ? (
            <span className="text-[var(--status-danger)] font-semibold">
              Duplicate names detected: {data.metrics.duplicateTechNames.join(', ')}
            </span>
          ) : (
            <span className="text-[var(--status-success)] font-semibold">
              Catalog uniqueness verified (0 duplicates)
            </span>
          )}
        </div>
      </div>

      {/* Portal Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border-default)] pb-3">
        {tabs
          .filter((t) => t.visible)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                activeTab === t.id
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
      </div>

      {/* TAB: OVERVIEW & CONFIG */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {isAdmin ? (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await api.patch('/admin/brand', {
                      ...data.brand,
                      product_name: brandName,
                      tagline,
                      company_name: companyName,
                      logo_url: logoUrl,
                      favicon_url: faviconUrl,
                      official_contact_email: officialContactEmail,
                      support_email: supportEmail,
                      business_phone: businessPhone,
                      whatsapp_url: whatsappUrl,
                      business_address: businessAddress,
                      office_hours: officeHours,
                      contact_intro: contactIntro,
                      about_headline: aboutHeadline,
                      about_description: aboutDescription,
                      footer_about_text: footerAboutText,
                      social_links: {
                        facebook: socialFacebook,
                        instagram: socialInstagram,
                        youtube: socialYoutube,
                        tiktok: socialTiktok,
                        linkedin: socialLinkedin,
                        x: socialX,
                        whatsapp_community: socialWhatsappCommunity,
                        custom: socialCustom,
                      },
                    });
                    await refreshPublicConfig();
                  }, 'Platform branding, official contact details, and social media channels updated.');
                }}
                className="lg:col-span-7 bc-panel p-6 space-y-5"
              >
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">Brand Identity, Official Contact &amp; Social Channels</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Configure public product branding ({brandName || 'Braincode'}), legal entity ({companyName || 'BrainCode Technology Limited'}), official contact details, and social media links dynamically. Blank contact or social fields are automatically hidden on public pages.
                  </p>
                </div>

                {/* Identity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Public Product Name</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Tagline</label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Learn. Build. Innovate. Grow."
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Registered Legal Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Logo URL (optional)</label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://... or /assets/logo.png"
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Favicon URL (optional)</label>
                    <input
                      type="text"
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="https://... or /favicon.svg"
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                </div>

                {/* Official Contact Info */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)]">
                    Official Contact Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Official Contact Email</label>
                      <input
                        type="email"
                        value={officialContactEmail}
                        onChange={(e) => setOfficialContactEmail(e.target.value)}
                        placeholder="contact@braincode.dev"
                        className="bc-input !h-9 !text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Support Email</label>
                      <input
                        type="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="bc-input !h-9 !text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Business Phone (optional)</label>
                      <input
                        type="text"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        placeholder="+234 ... (leave blank to hide)"
                        className="bc-input !h-9 !text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Official WhatsApp URL (optional)</label>
                      <input
                        type="url"
                        value={whatsappUrl}
                        onChange={(e) => setWhatsappUrl(e.target.value)}
                        placeholder="https://wa.me/..."
                        className="bc-input !h-9 !text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Office Address (optional)</label>
                      <input
                        type="text"
                        value={businessAddress}
                        onChange={(e) => setBusinessAddress(e.target.value)}
                        placeholder="Leave blank if online-only"
                        className="bc-input !h-9 !text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Office Hours (optional)</label>
                      <input
                        type="text"
                        value={officeHours}
                        onChange={(e) => setOfficeHours(e.target.value)}
                        placeholder="Mon–Fri, 9:00 AM – 5:00 PM WAT"
                        className="bc-input !h-9 !text-xs w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Contact Section Intro Copy</label>
                    <input
                      type="text"
                      value={contactIntro}
                      onChange={(e) => setContactIntro(e.target.value)}
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                </div>

                {/* About & Footer Copy */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--text-muted)]">
                    About &amp; Footer Copy
                  </h3>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">About Section Headline</label>
                    <input
                      type="text"
                      value={aboutHeadline}
                      onChange={(e) => setAboutHeadline(e.target.value)}
                      placeholder="Empowering People Through Technology."
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">About Section Description</label>
                    <textarea
                      rows={2}
                      value={aboutDescription}
                      onChange={(e) => setAboutDescription(e.target.value)}
                      className="bc-textarea !text-xs w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Footer Legal Attribution Note</label>
                    <input
                      type="text"
                      value={footerAboutText}
                      onChange={(e) => setFooterAboutText(e.target.value)}
                      className="bc-input !h-9 !text-xs w-full"
                    />
                  </div>
                </div>

                {/* Social Media Links */}
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold text-[var(--text-muted)]">
                      Official Social Media Links (Follow {brandName || 'Braincode'})
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSocialCustom((prev) => [...prev.slice(0, 5), { label: '', url: '' }])}
                      className="text-[11px] font-semibold text-[var(--accent-text)] inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Custom Link</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'Facebook URL', val: socialFacebook, set: setSocialFacebook, ph: 'https://facebook.com/...' },
                      { label: 'Instagram URL', val: socialInstagram, set: setSocialInstagram, ph: 'https://instagram.com/...' },
                      { label: 'YouTube URL', val: socialYoutube, set: setSocialYoutube, ph: 'https://youtube.com/@...' },
                      { label: 'TikTok URL', val: socialTiktok, set: setSocialTiktok, ph: 'https://tiktok.com/@...' },
                      { label: 'LinkedIn URL', val: socialLinkedin, set: setSocialLinkedin, ph: 'https://linkedin.com/company/...' },
                      { label: 'X (Twitter) URL', val: socialX, set: setSocialX, ph: 'https://x.com/...' },
                      { label: 'WhatsApp Community URL', val: socialWhatsappCommunity, set: setSocialWhatsappCommunity, ph: 'https://chat.whatsapp.com/...' },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">{field.label}</label>
                        <input
                          type="url"
                          value={field.val}
                          onChange={(e) => field.set(e.target.value)}
                          placeholder={field.ph}
                          className="bc-input !h-9 !text-xs w-full"
                        />
                      </div>
                    ))}
                  </div>

                  {socialCustom.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) =>
                          setSocialCustom((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row))
                          )
                        }
                        placeholder="Platform label (e.g. GitHub)"
                        className="sm:col-span-4 bc-input !h-9 !text-xs w-full"
                      />
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) =>
                          setSocialCustom((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, url: e.target.value } : row))
                          )
                        }
                        placeholder="https://..."
                        className="sm:col-span-7 bc-input !h-9 !text-xs w-full"
                      />
                      <button
                        type="button"
                        aria-label="Remove custom social link"
                        onClick={() => setSocialCustom((prev) => prev.filter((_, i) => i !== idx))}
                        className="sm:col-span-1 h-9 rounded-lg text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] inline-flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="submit" className="bc-btn-primary !h-9 !px-5 !text-xs">
                  Save Brand, Contact &amp; Social Settings
                </button>
              </form>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await api.patch('/admin/ai-config', {
                      daily_free_limit: aiFreeLimit,
                      daily_premium_limit: aiPremiumLimit,
                      system_guardrail: aiGuardrail,
                    });
                  }, 'AI usage quotas and guardrails updated.');
                }}
                className="lg:col-span-5 bc-panel p-6 space-y-3"
              >
                <h2 className="text-base font-bold text-[var(--text-primary)]">AI Assistant Quotas &amp; Guardrails</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Free Daily Limit</label>
                    <input
                      type="number"
                      min={1}
                      value={aiFreeLimit}
                      onChange={(e) => setAiFreeLimit(Number(e.target.value))}
                      className="bc-input w-full text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">Premium Daily Limit</label>
                    <input
                      type="number"
                      min={1}
                      value={aiPremiumLimit}
                      onChange={(e) => setAiPremiumLimit(Number(e.target.value))}
                      className="bc-input w-full text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--text-secondary)]">System Guardrail Prompt</label>
                  <textarea
                    rows={4}
                    value={aiGuardrail}
                    onChange={(e) => setAiGuardrail(e.target.value)}
                    className="bc-textarea w-full text-sm"
                  />
                </div>
                <button type="submit" className="bc-btn-primary !h-9 !px-4 !text-xs">
                  Update AI Configuration
                </button>
              </form>
            </>
          ) : (
            <div className="lg:col-span-12 bc-panel p-6">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Role Workspace Ready</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Use the tabs above to review curriculum submissions, manage technical resources, respond to contact enquiries, or handle moderation reports assigned to your role.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB: CURRICULUM & INSTRUCTOR GRADING */}
      {activeTab === 'curriculum' && canCms && (
        <div className="space-y-6">
        <CurriculumGovernanceHub
          initialSubTab={initialCurriculumSubTab || 'coverage'}
          onSubTabChange={onCurriculumSubTabChange}
          onCurriculumMutated={load}
          allTechnologies={data.technologies || []}
          allCourses={data.courses || []}
          authoringChildren={
            <div className="space-y-6">
          {/* Row 1: Create Course + Publish Resource */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.post('/admin/courses', {
                    title: courseTitle,
                    description: courseDesc,
                    categoryId: courseCatId,
                    technologyId: courseTechId,
                    difficulty: courseDifficulty,
                  });
                  setCourseTitle('');
                  setCourseDesc('');
                }, 'New course published to catalog.');
              }}
              className="bc-panel p-6 space-y-3"
            >
              <h2 className="text-base font-bold text-[var(--text-primary)]">Publish New Course</h2>
              <input
                type="text"
                required
                value={courseTitle}
                onChange={(e) => setCourseTitle(e.target.value)}
                placeholder="Course title"
                className="bc-input w-full text-sm"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={courseCatId}
                  onChange={(e) => setCourseCatId(e.target.value)}
                  className="bc-select !h-9 !text-xs"
                >
                  {(data.categories || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={courseTechId}
                  onChange={(e) => setCourseTechId(e.target.value)}
                  className="bc-select !h-9 !text-xs"
                >
                  {(data.technologies || []).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={courseDifficulty}
                  onChange={(e) => setCourseDifficulty(e.target.value)}
                  className="bc-select !h-9 !text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <textarea
                rows={2}
                required
                value={courseDesc}
                onChange={(e) => setCourseDesc(e.target.value)}
                placeholder="Course description"
                className="bc-textarea w-full text-sm"
              />
              <button
                type="submit"
                className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Create Course
              </button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.post('/admin/resources', {
                    title: resTitle,
                    summary: resSummary,
                    contentMarkdown: resMarkdown,
                  });
                  setResTitle('');
                  setResSummary('');
                  setResMarkdown('');
                }, 'Technical resource published.');
              }}
              className="bc-panel p-6 space-y-3"
            >
              <h2 className="text-base font-bold text-[var(--text-primary)]">Publish Documentation / Tutorial</h2>
              <input
                type="text"
                required
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                placeholder="Resource title"
                className="bc-input w-full text-sm"
              />
              <input
                type="text"
                value={resSummary}
                onChange={(e) => setResSummary(e.target.value)}
                placeholder="Short summary"
                className="bc-input w-full text-sm"
              />
              <textarea
                rows={2}
                required
                value={resMarkdown}
                onChange={(e) => setResMarkdown(e.target.value)}
                placeholder="Markdown guide content"
                className="bc-textarea w-full text-sm"
              />
              <button
                type="submit"
                className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Publish Resource
              </button>
            </form>
          </div>

          {/* Row 2: Categories, Technologies & Learning Paths */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.post('/admin/categories', { name: catName });
                  setCatName('');
                }, 'Category added to learning taxonomy.');
              }}
              className="bc-panel p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                Add Category ({(data.categories || []).length})
              </h3>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g. Embedded Systems"
                className="bc-input !h-9 w-full !text-xs"
              />
              <button
                type="submit"
                className="bc-btn-secondary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Add Category
              </button>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  const payload = {
                    name: techName,
                    categoryId: techCatId,
                    iconSymbol: techSymbol || undefined,
                    brandColor: techBrandColor,
                    difficulty: techDifficulty,
                    contentStatus: techContentStatus,
                    aliases: techAliases
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                    featuredOrder: Number(techFeaturedOrder || 0),
                    isPopular: techIsPopular,
                    description: techDescription,
                  };
                  if (editingTechId) {
                    await api.patch(`/admin/technologies/${editingTechId}`, payload);
                  } else {
                    await api.post('/admin/technologies', payload);
                  }
                  setEditingTechId(null);
                  setTechName('');
                  setTechSymbol('');
                  setTechAliases('');
                  setTechDescription('');
                  setTechIsPopular(false);
                  setTechFeaturedOrder(0);
                }, editingTechId ? 'Technology metadata updated.' : 'Technology added to directory & catalog.');
              }}
              className="bc-panel p-5 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  {editingTechId ? `Edit Technology` : `Add Technology (${(data.technologies || []).length})`}
                </h3>
                {editingTechId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTechId(null);
                      setTechName('');
                      setTechSymbol('');
                      setTechAliases('');
                      setTechDescription('');
                    }}
                    className="text-[11px] font-medium text-[var(--accent-text)] hover:underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="e.g. Rust"
                  className="bc-input !h-9 flex-1 !text-xs"
                />
                <input
                  type="text"
                  maxLength={6}
                  value={techSymbol}
                  onChange={(e) => setTechSymbol(e.target.value)}
                  placeholder="RS"
                  className="bc-input !h-9 w-16 !px-2 !text-xs font-mono"
                />
                <input
                  type="color"
                  aria-label="Technology brand color"
                  value={techBrandColor}
                  onChange={(e) => setTechBrandColor(e.target.value)}
                  className="w-9 h-9 rounded-lg border border-[var(--border-default)] bg-transparent p-0.5 cursor-pointer shrink-0"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={techCatId}
                  onChange={(e) => setTechCatId(e.target.value)}
                  className="bc-select !h-9 !text-xs"
                >
                  {(data.categories || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={techDifficulty}
                  onChange={(e) => setTechDifficulty(e.target.value as typeof techDifficulty)}
                  className="bc-select !h-9 !text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={techContentStatus}
                  onChange={(e) => setTechContentStatus(e.target.value as typeof techContentStatus)}
                  className="bc-select !h-9 !text-xs"
                >
                  <option value="available">Available</option>
                  <option value="in_development">In Development</option>
                  <option value="coming_soon">Coming Soon</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={techFeaturedOrder}
                  onChange={(e) => setTechFeaturedOrder(Number(e.target.value))}
                  placeholder="Featured order"
                  className="bc-input !h-9 !text-xs tabular-nums"
                />
              </div>
              <input
                type="text"
                value={techAliases}
                onChange={(e) => setTechAliases(e.target.value)}
                placeholder="Search aliases (comma-separated, e.g. js, ecmascript)"
                className="bc-input !h-9 w-full !text-xs"
              />
              <input
                type="text"
                value={techDescription}
                onChange={(e) => setTechDescription(e.target.value)}
                placeholder="Short directory description..."
                className="bc-input !h-9 w-full !text-xs"
              />
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <label className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={techIsPopular}
                    onChange={(e) => setTechIsPopular(e.target.checked)}
                  />
                  <span>Featured / Popular</span>
                </label>
                <button
                  type="submit"
                  className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
                >
                  {editingTechId ? 'Save Changes' : 'Add Tech'}
                </button>
              </div>
            </form>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.post('/admin/learning-paths', {
                    title: pathTitle,
                    description: pathDesc,
                    estimatedHours: pathHours,
                    courseIds: (data.courses || []).slice(0, 2).map((c: any) => c.id),
                  });
                  setPathTitle('');
                  setPathDesc('');
                }, 'Learning path created.');
              }}
              className="bc-panel p-5 space-y-2.5"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                Create Learning Path ({(data.learningPaths || []).length})
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={pathTitle}
                  onChange={(e) => setPathTitle(e.target.value)}
                  placeholder="Path title (e.g. Rust Systems)"
                  className="bc-input !h-9 flex-1 !text-xs"
                />
                <input
                  type="number"
                  min={1}
                  value={pathHours}
                  onChange={(e) => setPathHours(Number(e.target.value))}
                  className="bc-input !h-9 w-16 !px-2 !text-xs tabular-nums"
                />
              </div>
              <input
                type="text"
                required
                value={pathDesc}
                onChange={(e) => setPathDesc(e.target.value)}
                placeholder="Path objective summary..."
                className="bc-input !h-9 w-full !text-xs"
              />
              <button
                type="submit"
                className="bc-btn-secondary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Create Path
              </button>
            </form>
          </div>

          {/* Row 3: Technology Directory Manager (All 200+ Searchable) */}
          {(() => {
            const qTech = adminTechSearch.trim().toLowerCase();
            const filteredTechs = (data.technologies || []).filter((t: any) => {
              if (!qTech) return true;
              return (
                String(t.name || '').toLowerCase().includes(qTech) ||
                String(t.category_name || '').toLowerCase().includes(qTech) ||
                (Array.isArray(t.aliases) && t.aliases.some((a: string) => a.toLowerCase().includes(qTech)))
              );
            });
            return (
              <div className="bc-panel p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                      Technologies Directory Manager ({filteredTechs.length} / {(data.technologies || []).length})
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Manage icons, categories, aliases, difficulty, content status, featured order, and publication state.
                    </p>
                  </div>
                  <input
                    type="text"
                    value={adminTechSearch}
                    onChange={(e) => {
                      setAdminTechSearch(e.target.value);
                      setAdminTechLimit(30);
                    }}
                    placeholder="Filter technologies or aliases..."
                    className="bc-input !h-9 w-full sm:w-64 !text-xs"
                  />
                </div>
                <div className="bc-table-wrap">
                  <table className="bc-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Symbol</th>
                        <th>Technology</th>
                        <th>Category</th>
                        <th>Level</th>
                        <th>Status</th>
                        <th>Courses</th>
                        <th>Visibility</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTechs.slice(0, adminTechLimit).map((t: any) => (
                        <tr key={t.id}>
                          <td className="font-mono tabular-nums text-[var(--text-secondary)]">{t.sort_order}</td>
                          <td
                            className="font-mono font-bold"
                            style={{ color: /^#[0-9A-Fa-f]{6}$/.test(t.brand_color || '') ? t.brand_color : 'var(--accent-primary)' }}
                          >
                            {t.icon_symbol}
                          </td>
                          <td className="font-semibold text-[var(--text-primary)]">{t.name}</td>
                          <td className="text-[var(--text-secondary)]">{t.category_name}</td>
                          <td className="text-[var(--text-secondary)]">{t.difficulty || 'Beginner'}</td>
                          <td className="capitalize text-[var(--text-secondary)]">
                            {String(t.learning_status || t.content_status || 'coming_soon').replace('_', ' ')}
                          </td>
                          <td className="tabular-nums text-[var(--text-primary)]">{t.course_count}</td>
                          <td className="text-[var(--text-secondary)]">
                            {t.is_published ? 'Published' : 'Draft'} · {t.is_popular ? 'Popular' : 'Std'}
                          </td>
                          <td className="text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTechId(t.id);
                                setTechName(t.name || '');
                                setTechSymbol(t.icon_symbol || '');
                                setTechCatId(t.category_id || 'cat_web_dev');
                                setTechBrandColor(t.brand_color || '#0A84FF');
                                setTechDifficulty((t.difficulty as any) || 'Beginner');
                                setTechContentStatus((t.content_status as any) || 'coming_soon');
                                setTechAliases(Array.isArray(t.aliases) ? t.aliases.join(', ') : '');
                                setTechFeaturedOrder(Number(t.featured_order || 0));
                                setTechIsPopular(Boolean(t.is_popular));
                                setTechDescription(t.description || '');
                              }}
                              className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(async () => {
                                  await api.patch(`/admin/technologies/${t.id}`, {
                                    sortOrder: Math.max(0, Number(t.sort_order || 0) - 1),
                                  });
                                }, `Moved ${t.name} earlier in bar.`)
                              }
                              className="bc-btn-secondary !h-7 !px-2 !text-[11px]"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                runAction(async () => {
                                  await api.patch(`/admin/technologies/${t.id}`, {
                                    isPublished: !t.is_published,
                                  });
                                }, `${t.name} ${t.is_published ? 'unpublished' : 'published'}.`)
                              }
                              className="bc-btn-secondary !h-7 !px-2.5 !text-[11px]"
                            >
                              {t.is_published ? 'Unpublish' : 'Publish'}
                            </button>
                            {Number(t.course_count || 0) === 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  runAction(async () => {
                                    await api.delete(`/admin/technologies/${t.id}`);
                                  }, `Deleted technology ${t.name}.`)
                                }
                                aria-label={`Delete ${t.name}`}
                                className="p-1 text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] rounded cursor-pointer inline-flex align-middle"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {adminTechLimit < filteredTechs.length && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdminTechLimit((n) => n + 50)}
                      className="bc-btn-secondary !h-8 !px-3 !text-xs tabular-nums"
                    >
                      Load 50 More ({filteredTechs.length - adminTechLimit} remaining)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminTechLimit(filteredTechs.length)}
                      className="bc-btn-secondary !h-8 !px-3 !text-xs tabular-nums"
                    >
                      Show All ({filteredTechs.length})
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Row 4: Course Catalog Management, Editorial Workflow & Completion Rules */}
          <div className="bc-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--text-primary)] tabular-nums">
              Courses, Editorial Workflow &amp; Completion Rules ({(data.courses || []).length})
            </h2>
            <div className="bc-table-wrap">
              <table className="bc-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Linked Technology</th>
                    <th>Level</th>
                    <th>Lessons</th>
                    <th>Completion Rule</th>
                    <th className="text-right">Editorial Workflow</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.courses || []).map((c: any) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-[var(--text-primary)]">{c.title}</td>
                      <td>
                        <select
                          aria-label={`Linked technology for ${c.title}`}
                          value={c.technology_id || ''}
                          onChange={(e) =>
                            runAction(async () => {
                              await api.patch(`/admin/courses/${c.id}`, { technologyId: e.target.value });
                            }, `Linked "${c.title}" to updated technology.`)
                          }
                          className="bc-select !h-7 max-w-[160px] !px-2 !text-xs"
                        >
                          {(data.technologies || []).map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="text-[var(--text-secondary)]">{c.difficulty}</td>
                      <td className="tabular-nums text-[var(--text-secondary)]">
                        {c.lesson_count} · {c.enrollment_count} enrolled
                      </td>
                      <td>
                        <select
                          aria-label={`Completion rule for ${c.title}`}
                          value={c.completion_rule || 'all_lessons'}
                          onChange={(e) =>
                            runAction(async () => {
                              await api.patch(`/admin/courses/${c.id}`, { completionRule: e.target.value });
                            }, `Updated certificate completion rule for "${c.title}".`)
                          }
                          className="bc-select !h-7 !px-2 !text-xs"
                        >
                          <option value="all_lessons">All Lessons</option>
                          <option value="lessons_and_assessments">Lessons + Assessments</option>
                          <option value="all_requirements">Lessons + Quizzes + Assignments</option>
                        </select>
                      </td>
                      <td className="text-right">
                        <select
                          aria-label={`Workflow status for ${c.title}`}
                          value={c.workflow_status || c.status || 'published'}
                          onChange={(e) =>
                            runAction(async () => {
                              await api.patch(`/admin/courses/${c.id}`, { workflowStatus: e.target.value });
                            }, `Course "${c.title}" workflow set to ${e.target.value}.`)
                          }
                          className="bc-select !h-7 !px-2 !text-xs capitalize"
                        >
                          <option value="draft">Draft</option>
                          <option value="review">In Review</option>
                          <option value="approved">Approved</option>
                          <option value="published">Published</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5: Module & Lesson Authoring / Editor + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bc-panel p-6 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    await api.post(`/admin/courses/${modCourseId}/modules`, { title: modTitle });
                    setModTitle('');
                  }, 'New module added to course.');
                }}
                className="space-y-2.5 pb-4 border-b border-[var(--border-subtle)]"
              >
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Add Module to Course</h3>
                <select
                  value={modCourseId}
                  onChange={(e) => setModCourseId(e.target.value)}
                  className="bc-select !h-9 w-full !text-xs"
                >
                  {(data.courses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={modTitle}
                    onChange={(e) => setModTitle(e.target.value)}
                    placeholder="Module title (e.g. Module 3: Testing)"
                    className="bc-input !h-9 flex-1 !text-xs"
                  />
                  <button
                    type="submit"
                    className="bc-btn-secondary !h-9 !px-3 !text-xs whitespace-nowrap shrink-0"
                  >
                    Add Module
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  Select Lesson to Edit ({(data.lessons || []).length})
                </h3>
                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)]">
                  {(data.lessons || []).slice(0, 40).map((les: any) => (
                    <button
                      key={les.id}
                      type="button"
                      onClick={() => {
                        setEditingLessonId(les.id);
                        setLessonCourseId(les.course_id);
                        setLessonModuleId(les.module_id);
                        setLessonTitle(les.title);
                        setLessonTopic(les.topic_name || '');
                        setLessonLanguage(les.language || 'javascript');
                        setLessonTier(les.access_tier === 'premium' ? 'premium' : 'free');
                        setLessonStatus((les.workflow_status || les.status || 'published') as any);
                        setLessonMarkdown(les.content_markdown || '');
                        setLessonCode(les.code_example || '');
                        loadLessonDetails(les.id);
                      }}
                      className="w-full px-3 py-2.5 text-left hover:bg-[var(--bg-subtle)] flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{les.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate tabular-nums">
                          {les.course_title} · v{les.version || 1} · {les.access_tier} · {les.workflow_status || les.status || 'published'}
                        </p>
                      </div>
                      <span className="text-[var(--accent-text)] font-medium shrink-0">Edit</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runAction(async () => {
                    if (editingLessonId) {
                      await api.patch(`/admin/lessons/${editingLessonId}`, {
                        title: lessonTitle,
                        topicName: lessonTopic,
                        language: lessonLanguage,
                        accessTier: lessonTier,
                        workflowStatus: lessonStatus,
                        contentMarkdown: lessonMarkdown,
                        codeExample: lessonCode,
                      });
                    } else {
                      await api.post('/admin/lessons', {
                        courseId: lessonCourseId,
                        moduleId: lessonModuleId,
                        title: lessonTitle,
                        topicName: lessonTopic,
                        language: lessonLanguage,
                        accessTier: lessonTier,
                        status: lessonStatus === 'archived' ? 'archived' : lessonStatus === 'published' ? 'published' : 'draft',
                        contentMarkdown: lessonMarkdown,
                        codeExample: lessonCode,
                      });
                    }
                    setEditingLessonId(null);
                    setLessonDetails(null);
                    setLessonTitle('');
                    setLessonTopic('');
                    setLessonMarkdown('');
                    setLessonCode('');
                  }, editingLessonId ? 'Lesson updated & version incremented.' : 'New lesson created.');
                }}
                className="bc-panel p-6 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {editingLessonId ? 'Edit Existing Lesson' : 'Create New Lesson'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {editingLessonId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLessonId(null);
                          setLessonDetails(null);
                          setLessonTitle('');
                          setLessonMarkdown('');
                          setLessonCode('');
                        }}
                        className="text-xs text-[var(--text-secondary)] hover:underline cursor-pointer"
                      >
                        New Lesson Mode
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewLessonModal((v) => !v)}
                      className="bc-btn-secondary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{previewLessonModal ? 'Hide Preview' : 'Preview'}</span>
                    </button>
                  </div>
                </div>

                {!editingLessonId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={lessonCourseId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setLessonCourseId(cid);
                        const firstMod = (data.modules || []).find((m: any) => m.course_id === cid);
                        if (firstMod) setLessonModuleId(firstMod.id);
                      }}
                      className="bc-select !h-9 !text-xs"
                    >
                      {(data.courses || []).map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={lessonModuleId}
                      onChange={(e) => setLessonModuleId(e.target.value)}
                      className="bc-select !h-9 !text-xs"
                    >
                      {(data.modules || [])
                        .filter((m: any) => m.course_id === lessonCourseId)
                        .map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    placeholder="Lesson title"
                    className="bc-input !h-9 !text-xs"
                  />
                  <input
                    type="text"
                    value={lessonTopic}
                    onChange={(e) => setLessonTopic(e.target.value)}
                    placeholder="Topic name"
                    className="bc-input !h-9 !text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={lessonLanguage}
                    onChange={(e) => setLessonLanguage(e.target.value)}
                    placeholder="Language (python, html...)"
                    className="bc-input !h-9 !text-xs font-mono"
                  />
                  <select
                    value={lessonTier}
                    onChange={(e) => setLessonTier(e.target.value as 'free' | 'premium')}
                    className="bc-select !h-9 !text-xs"
                  >
                    <option value="free">Free Tier</option>
                    <option value="premium">Premium Tier</option>
                  </select>
                  <select
                    value={lessonStatus}
                    onChange={(e) => setLessonStatus(e.target.value as any)}
                    className="bc-select !h-9 !text-xs"
                  >
                    <option value="draft">Draft</option>
                    <option value="review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <textarea
                  rows={4}
                  required
                  value={lessonMarkdown}
                  onChange={(e) => setLessonMarkdown(e.target.value)}
                  placeholder="Lesson markdown explanation..."
                  className="bc-textarea w-full !text-xs"
                />
                <textarea
                  rows={3}
                  value={lessonCode}
                  onChange={(e) => setLessonCode(e.target.value)}
                  placeholder="Code example snippet..."
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-3 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                />

                {previewLessonModal && (
                  <div className="p-4 rounded-lg border border-[var(--accent-primary)]/35 bg-[var(--bg-subtle)] space-y-2 text-xs">
                    <p className="font-bold text-sm text-[var(--text-primary)]">{lessonTitle || 'Lesson Preview'}</p>
                    <p className="whitespace-pre-wrap text-[var(--text-secondary)]">{lessonMarkdown}</p>
                    {lessonCode && (
                      <pre className="p-3 rounded-lg bg-[#090D16] text-slate-100 font-mono overflow-x-auto">{lessonCode}</pre>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
                >
                  {editingLessonId ? 'Save Lesson Revision' : 'Publish Lesson'}
                </button>
              </form>

              {/* Normalized Content Blocks & Code Examples Editor for Selected Lesson */}
              {editingLessonId && lessonDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bc-panel p-4 space-y-2.5 text-xs">
                    <h4 className="font-bold text-[var(--text-primary)] tabular-nums">
                      Structured Content Blocks ({lessonDetails.blocks.length})
                    </h4>
                    <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg max-h-36 overflow-y-auto">
                      {lessonDetails.blocks.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between gap-2 px-2.5 py-2">
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            [{b.block_type}] {b.title || b.content_markdown.slice(0, 32)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              runAction(async () => {
                                await api.delete(`/admin/blocks/${b.id}`);
                                await loadLessonDetails(editingLessonId);
                              }, 'Content block removed.')
                            }
                            className="text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] p-1 rounded cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <select
                      value={blockType}
                      onChange={(e) => setBlockType(e.target.value)}
                      className="bc-select !h-8 w-full !px-2 !text-xs"
                    >
                      {['callout', 'warning', 'step_guide', 'diagram', 'table', 'list', 'paragraph', 'heading', 'doc_link'].map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={blockTitle}
                      onChange={(e) => setBlockTitle(e.target.value)}
                      placeholder="Block heading/title"
                      className="bc-input !h-8 w-full !px-2 !text-xs"
                    />
                    <textarea
                      rows={2}
                      value={blockContent}
                      onChange={(e) => setBlockContent(e.target.value)}
                      placeholder="Block markdown content..."
                      className="bc-textarea w-full !p-2 !text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await api.post(`/admin/lessons/${editingLessonId}/blocks`, {
                            blockType,
                            title: blockTitle,
                            contentMarkdown: blockContent,
                          });
                          setBlockTitle('');
                          setBlockContent('');
                          await loadLessonDetails(editingLessonId);
                        }, 'Added structured content block.')
                      }
                      className="bc-btn-secondary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                    >
                      Add Content Block
                    </button>
                  </div>

                  <div className="bc-panel p-4 space-y-2.5 text-xs">
                    <h4 className="font-bold text-[var(--text-primary)] tabular-nums">
                      Runnable Code Examples ({lessonDetails.codeExamples.length})
                    </h4>
                    <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg max-h-36 overflow-y-auto">
                      {lessonDetails.codeExamples.map((exm: any) => (
                        <div key={exm.id} className="flex items-center justify-between gap-2 px-2.5 py-2">
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            [{exm.language}] {exm.title}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              runAction(async () => {
                                await api.delete(`/admin/examples/${exm.id}`);
                                await loadLessonDetails(editingLessonId);
                              }, 'Code example deleted.')
                            }
                            className="text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] p-1 rounded cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={exampleTitle}
                        onChange={(e) => setExampleTitle(e.target.value)}
                        placeholder="Example title"
                        className="bc-input !h-8 flex-1 !px-2 !text-xs"
                      />
                      <input
                        type="text"
                        value={exampleLang}
                        onChange={(e) => setExampleLang(e.target.value)}
                        placeholder="lang"
                        className="bc-input !h-8 w-20 !px-2 !text-xs font-mono"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={exampleCode}
                      onChange={(e) => setExampleCode(e.target.value)}
                      placeholder="Snippet code..."
                      className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <input
                      type="text"
                      value={exampleExpected}
                      onChange={(e) => setExampleExpected(e.target.value)}
                      placeholder="Expected output (optional)"
                      className="bc-input !h-8 w-full !px-2 !text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await api.post(`/admin/lessons/${editingLessonId}/examples`, {
                            title: exampleTitle,
                            language: exampleLang,
                            code: exampleCode,
                            expectedOutput: exampleExpected,
                          });
                          setExampleTitle('');
                          setExampleCode('');
                          setExampleExpected('');
                          await loadLessonDetails(editingLessonId);
                        }, 'Added code example to lesson.')
                      }
                      className="bc-btn-primary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                    >
                      Add Code Example
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Row 5b: Topics, 10-Type Exercise Builder, Assessments & Assignments/Templates Builders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Module Topics */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.post('/admin/topics', {
                    courseId: topicCourseId,
                    moduleId: topicModuleId,
                    title: topicTitle,
                    summary: topicSummary,
                  });
                  setTopicTitle('');
                  setTopicSummary('');
                }, 'Course topic added.');
              }}
              className="bc-panel p-5 space-y-2.5 text-xs"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                Module Topics ({(data.courseTopics || []).length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={topicCourseId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setTopicCourseId(cid);
                    const firstMod = (data.modules || []).find((m: any) => m.course_id === cid);
                    if (firstMod) setTopicModuleId(firstMod.id);
                  }}
                  className="bc-select !h-9 !px-2 !text-xs"
                >
                  {(data.courses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <select
                  value={topicModuleId}
                  onChange={(e) => setTopicModuleId(e.target.value)}
                  className="bc-select !h-9 !px-2 !text-xs"
                >
                  {(data.modules || [])
                    .filter((m: any) => m.course_id === topicCourseId)
                    .map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                </select>
              </div>
              <input
                type="text"
                required
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Topic title (e.g. Async Error Boundaries)"
                className="bc-input !h-9 w-full !text-xs"
              />
              <input
                type="text"
                value={topicSummary}
                onChange={(e) => setTopicSummary(e.target.value)}
                placeholder="Concise topic summary"
                className="bc-input !h-9 w-full !text-xs"
              />
              <button
                type="submit"
                className="bc-btn-secondary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Create Topic
              </button>
              {(data.courseTopics || []).length > 0 && (
                <div className="pt-2 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] max-h-28 overflow-y-auto">
                  {(data.courseTopics || []).slice(0, 6).map((tp: any) => (
                    <div key={tp.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span className="truncate text-[var(--text-secondary)]">
                        {tp.title} ({tp.module_title})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          runAction(async () => {
                            await api.delete(`/admin/topics/${tp.id}`);
                          }, 'Topic deleted.')
                        }
                        className="text-[var(--status-danger)] hover:bg-[var(--status-danger-soft)] p-1 rounded cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </form>

            {/* 10-Type Exercise Builder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  await api.post('/admin/exercises', {
                    courseId: exCourseId,
                    lessonId: exLessonId,
                    title: exTitle,
                    exerciseType: exType,
                    difficulty: exDifficulty,
                    prompt: exPrompt,
                    starterCode: exStarterCode,
                    options: exOptionsText,
                    correctAnswer: exCorrectAnswer,
                    hintText: exHint,
                    explanation: exExplanation,
                    xpReward: exXp,
                  });
                  setExTitle('');
                  setExPrompt('');
                  setExStarterCode('');
                  setExOptionsText('');
                  setExCorrectAnswer('');
                  setExHint('');
                  setExExplanation('');
                }, 'Interactive exercise published.');
              }}
              className="bc-panel p-5 space-y-2.5 text-xs"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                Interactive Exercise Builder ({(data.exercises || []).length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={exCourseId}
                  onChange={(e) => setExCourseId(e.target.value)}
                  className="bc-select !h-9 !px-2 !text-xs"
                >
                  {(data.courses || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <select
                  value={exLessonId}
                  onChange={(e) => setExLessonId(e.target.value)}
                  className="bc-select !h-9 !px-2 !text-xs"
                >
                  {(data.lessons || [])
                    .filter((l: any) => l.course_id === exCourseId)
                    .map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={exType}
                  onChange={(e) => setExType(e.target.value)}
                  className="bc-select !h-9 !px-2 !text-xs"
                >
                  {[
                    'multiple_choice',
                    'true_false',
                    'fill_blank',
                    'predict_output',
                    'find_error',
                    'code_completion',
                    'write_code',
                    'matching',
                    'short_answer',
                    'practical_task',
                  ].map((et) => (
                    <option key={et} value={et}>
                      {et}
                    </option>
                  ))}
                </select>
                <select
                  value={exDifficulty}
                  onChange={(e) => setExDifficulty(e.target.value)}
                  className="bc-select !h-9 !px-2 !text-xs"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <input
                  type="number"
                  min={5}
                  value={exXp}
                  onChange={(e) => setExXp(Number(e.target.value))}
                  placeholder="XP"
                  className="bc-input !h-9 !px-2 !text-xs tabular-nums"
                />
              </div>
              <input
                type="text"
                required
                value={exTitle}
                onChange={(e) => setExTitle(e.target.value)}
                placeholder="Exercise title"
                className="bc-input !h-9 w-full !text-xs"
              />
              <textarea
                rows={2}
                required
                value={exPrompt}
                onChange={(e) => setExPrompt(e.target.value)}
                placeholder="Exercise question / task prompt"
                className="bc-textarea w-full !p-2.5 !text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={exCorrectAnswer}
                  onChange={(e) => setExCorrectAnswer(e.target.value)}
                  placeholder="Correct answer or required token"
                  className="bc-input !h-9 !text-xs font-mono"
                />
                <input
                  type="text"
                  value={exHint}
                  onChange={(e) => setExHint(e.target.value)}
                  placeholder="Progressive hint text"
                  className="bc-input !h-9 !text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={exOptionsText}
                onChange={(e) => setExOptionsText(e.target.value)}
                placeholder="Options (one per line for MCQ/True-False/Matching) OR leave blank for code/short answer"
                className="bc-textarea w-full !p-2 !text-xs"
              />
              <textarea
                rows={2}
                value={exStarterCode}
                onChange={(e) => setExStarterCode(e.target.value)}
                placeholder="Starter code (optional)"
                className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
              />
              <button
                type="submit"
                className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Create Exercise
              </button>
            </form>

            {/* Assessment / Quiz Builder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runAction(async () => {
                  const options = asmQuestionOptions
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  await api.post('/admin/assessments', {
                    courseId: asmCourseId,
                    title: asmTitle,
                    type: 'quiz',
                    mode: 'untimed',
                    passingScorePct: asmPassingPct,
                    xpReward: asmXp,
                    questions: [
                      {
                        id: `q_${Date.now()}`,
                        kind: 'multiple_choice',
                        prompt: asmQuestionPrompt,
                        options,
                        correctAnswer: asmQuestionCorrect,
                        explanation: `Verified answer: ${asmQuestionCorrect}`,
                      },
                    ],
                  });
                  setAsmTitle('');
                  setAsmQuestionPrompt('');
                }, 'Assessment quiz created.');
              }}
              className="bc-panel p-5 space-y-2.5 text-xs"
            >
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Assessment &amp; Quiz Builder</h3>
              <select
                value={asmCourseId}
                onChange={(e) => setAsmCourseId(e.target.value)}
                className="bc-select !h-9 w-full !px-2 !text-xs"
              >
                {(data.courses || []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  value={asmTitle}
                  onChange={(e) => setAsmTitle(e.target.value)}
                  placeholder="Assessment title"
                  className="sm:col-span-2 bc-input !h-9 !text-xs"
                />
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={asmPassingPct}
                  onChange={(e) => setAsmPassingPct(Number(e.target.value))}
                  placeholder="Pass %"
                  className="bc-input !h-9 !px-2 !text-xs tabular-nums"
                />
              </div>
              <input
                type="text"
                required
                value={asmQuestionPrompt}
                onChange={(e) => setAsmQuestionPrompt(e.target.value)}
                placeholder="Initial quiz question prompt"
                className="bc-input !h-9 w-full !text-xs"
              />
              <textarea
                rows={2}
                value={asmQuestionOptions}
                onChange={(e) => setAsmQuestionOptions(e.target.value)}
                placeholder="Options (one per line)"
                className="bc-textarea w-full !p-2 !text-xs"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={asmQuestionCorrect}
                  onChange={(e) => setAsmQuestionCorrect(e.target.value)}
                  placeholder="Exact correct option"
                  className="bc-input !h-9 !text-xs"
                />
                <input
                  type="number"
                  min={10}
                  value={asmXp}
                  onChange={(e) => setAsmXp(Number(e.target.value))}
                  placeholder="XP Reward"
                  className="bc-input !h-9 !px-2 !text-xs tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Create Assessment
              </button>
            </form>

            {/* Assignment & Starter Project Template Builder */}
            <div className="bc-panel p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                  Assignments ({(data.assignments || []).length}) &amp; Starter Templates ({(data.projectTemplates || []).length})
                </h3>
                <div className="flex rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-0.5">
                  {(['assignment', 'template'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAsnOrTplMode(m)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                        asnOrTplMode === m
                          ? 'bg-[var(--accent-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {asnOrTplMode === 'assignment' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runAction(async () => {
                      await api.post('/admin/assignments', {
                        courseId: asnCourseId,
                        title: asnTitle,
                        instructionsMarkdown: asnInstructions,
                        requirements: asnReqs,
                      });
                      setAsnTitle('');
                      setAsnInstructions('');
                      setAsnReqs('');
                    }, 'Course assignment created.');
                  }}
                  className="space-y-2.5"
                >
                  <select
                    value={asnCourseId}
                    onChange={(e) => setAsnCourseId(e.target.value)}
                    className="bc-select !h-9 w-full !px-2 !text-xs"
                  >
                    {(data.courses || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={asnTitle}
                    onChange={(e) => setAsnTitle(e.target.value)}
                    placeholder="Assignment title"
                    className="bc-input !h-9 w-full !text-xs"
                  />
                  <textarea
                    rows={2}
                    required
                    value={asnInstructions}
                    onChange={(e) => setAsnInstructions(e.target.value)}
                    placeholder="Submission instructions..."
                    className="bc-textarea w-full !p-2.5 !text-xs"
                  />
                  <textarea
                    rows={2}
                    value={asnReqs}
                    onChange={(e) => setAsnReqs(e.target.value)}
                    placeholder="Checklist requirements (one per line)"
                    className="bc-textarea w-full !p-2 !text-xs"
                  />
                  <button
                    type="submit"
                    className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
                  >
                    Publish Assignment
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    runAction(async () => {
                      await api.post('/admin/project-templates', {
                        technologyId: tplTechId,
                        courseId: asnCourseId,
                        title: tplTitle,
                        summary: tplSummary,
                        starterFiles: { 'index.html': tplStarterCode || `<h1>${tplTitle}</h1>` },
                      });
                      setTplTitle('');
                      setTplSummary('');
                      setTplStarterCode('');
                    }, 'Starter project template created.');
                  }}
                  className="space-y-2.5"
                >
                  <select
                    value={tplTechId}
                    onChange={(e) => setTplTechId(e.target.value)}
                    className="bc-select !h-9 w-full !px-2 !text-xs"
                  >
                    {(data.technologies || []).slice(0, 40).map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    required
                    value={tplTitle}
                    onChange={(e) => setTplTitle(e.target.value)}
                    placeholder="Starter project title"
                    className="bc-input !h-9 w-full !text-xs"
                  />
                  <input
                    type="text"
                    required
                    value={tplSummary}
                    onChange={(e) => setTplSummary(e.target.value)}
                    placeholder="Summary of starter workspace"
                    className="bc-input !h-9 w-full !text-xs"
                  />
                  <textarea
                    rows={2}
                    value={tplStarterCode}
                    onChange={(e) => setTplStarterCode(e.target.value)}
                    placeholder="Initial starter file content"
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-2 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                  />
                  <button
                    type="submit"
                    className="bc-btn-secondary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
                  >
                    Create Starter Template
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Row 6: Validated Bulk Curriculum Import & Export (JSON / CSV) + Dry Run Preview */}
          <div className="bc-panel p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Bulk Curriculum Import &amp; Export</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Preview structure counts before importing validated JSON/CSV curriculum batches into SQLite.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(['json', 'csv'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() =>
                      runAction(async () => {
                        const token = getStoredToken();
                        const res = await fetch(`/api/admin/curriculum/export?format=${fmt}`, {
                          credentials: 'include',
                          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                        });
                        if (!res.ok) throw new Error(`Export failed (${res.status})`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `braincode-curriculum.${fmt}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }, `Exported curriculum (${fmt.toUpperCase()}).`)
                    }
                    className="bc-btn-secondary !h-9 !px-3.5 !text-xs whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export {fmt.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <select
                value={importFormat}
                onChange={(e) => {
                  setImportFormat(e.target.value as 'json' | 'csv');
                  setImportPreview(null);
                }}
                className="bc-select !h-9 !px-3 !text-xs"
              >
                <option value="json">Structured JSON Import</option>
                <option value="csv">CSV Rows Import</option>
              </select>
              <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={importPublishNow}
                  onChange={(e) => setImportPublishNow(e.target.checked)}
                />
                <span>Publish imported items immediately (unchecked imports as Draft)</span>
              </label>
            </div>

            <textarea
              rows={4}
              value={importPayload}
              onChange={(e) => {
                setImportPayload(e.target.value);
                setImportPreview(null);
              }}
              placeholder={
                importFormat === 'json'
                  ? '{"courses":[{"title":"Go APIs","slug":"go-apis","category_id":"cat_backend","technology_id":"tech_node","modules":[{"title":"Module 1","lessons":[{"title":"HTTP Servers","content_markdown":"### Intro"}]}]}]}'
                  : 'course_title,module_title,lesson_title,access_tier,language\nGo Systems,Module 1: Basics,Goroutines Intro,free,go'
              }
              className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 p-3 text-xs font-mono focus:outline-none focus:border-[var(--accent-primary)]"
            />

            {importPreview && (
              <div
                className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                  importPreview.valid
                    ? 'border-[var(--status-success)]/30 bg-[var(--status-success-soft)] text-[var(--status-success)]'
                    : 'border-[var(--status-warning)]/30 bg-[var(--status-warning-soft)] text-[var(--status-warning)]'
                }`}
              >
                <p className="font-bold tabular-nums">
                  Dry-Run Summary ({importPreview.format.toUpperCase()}): {importPreview.summary.courses} course(s) ·{' '}
                  {importPreview.summary.lessons} lesson(s) · {importPreview.summary.categories} categories ·{' '}
                  {importPreview.summary.technologies} technologies
                </p>
                {importPreview.warnings.map((w, i) => (
                  <p key={i}>Warning: {w}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  runAction(async () => {
                    const res =
                      importFormat === 'csv'
                        ? await api.post<any>('/admin/curriculum/import/preview', { csv: importPayload })
                        : await api.post<any>('/admin/curriculum/import/preview', { data: JSON.parse(importPayload) });
                    setImportPreview(res);
                  }, 'Import preview validated.')
                }
                className="bc-btn-secondary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Import (Dry Run)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  runAction(async () => {
                    if (importFormat === 'csv') {
                      await api.post('/admin/curriculum/import', {
                        csv: importPayload,
                        publishImmediately: importPublishNow,
                      });
                    } else {
                      const parsed = JSON.parse(importPayload);
                      await api.post('/admin/curriculum/import', {
                        data: parsed,
                        publishImmediately: importPublishNow,
                      });
                    }
                    setImportPayload('');
                    setImportPreview(null);
                  }, 'Validated curriculum batch imported cleanly.')
                }
                className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Validate &amp; Import Curriculum</span>
              </button>
            </div>
          </div>

          {/* Instructor Grading & Review Queues */}
          <div className="bc-panel p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Instructor Grading &amp; Review Queues</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Grade assessment attempts, course assignments, open-ended exercise responses, and student portfolio builds.
              </p>
            </div>

            {/* 1. Assessment Attempts */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] tabular-nums">
                Practical Assessment Attempts ({(data.pendingAttempts || []).length})
              </h3>
              {(data.pendingAttempts || []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No practical assessment submissions awaiting review.</p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                  {data.pendingAttempts.map((a: any) => (
                    <div
                      key={a.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="text-xs min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {a.assessment_title} · {a.full_name} (@{a.username})
                        </p>
                        <p className="text-[var(--text-secondary)] mt-0.5 tabular-nums">Max score: {a.max_score}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={a.max_score}
                          placeholder="Score"
                          value={gradeScores[a.id] ?? String(a.max_score)}
                          onChange={(e) => setGradeScores((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          className="bc-input !h-8 w-20 !px-2 !text-xs tabular-nums"
                        />
                        <input
                          type="text"
                          placeholder="Feedback note"
                          value={gradeNotes[a.id] ?? ''}
                          onChange={(e) => setGradeNotes((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          className="bc-input !h-8 w-44 sm:w-48 !px-2 !text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            runAction(async () => {
                              await api.patch(`/admin/assessments/attempts/${a.id}`, {
                                score: Number(gradeScores[a.id] ?? a.max_score),
                                instructorNotes: gradeNotes[a.id] || 'Reviewed by instructor.',
                              });
                            }, 'Assessment graded and learner notified.')
                          }
                          className="bc-btn-primary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                        >
                          Submit Grade
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Course Assignment Submissions */}
            <div className="space-y-2.5 pt-4 border-t border-[var(--border-subtle)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] tabular-nums">
                Assignment Submissions ({(data.pendingAssignmentSubmissions || []).length})
              </h3>
              {(data.pendingAssignmentSubmissions || []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No assignment submissions recorded yet.</p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                  {data.pendingAssignmentSubmissions.map((sub: any) => {
                    let criteria: Array<{ criterion: string; points: number }> = [];
                    try {
                      const parsed = JSON.parse(String(sub.rubric_json || '[]'));
                      if (Array.isArray(parsed)) {
                        criteria = parsed.map((item: any) => {
                          if (typeof item === 'string') {
                            const m = item.match(/\((\d{1,3})\s*(?:%|pts|points)?\)/i);
                            return { criterion: item, points: m ? Number(m[1]) : 25 };
                          }
                          return { criterion: String(item?.criterion || item?.title || ''), points: Number(item?.points || 25) };
                        }).filter((c) => c.criterion);
                      }
                    } catch {
                      criteria = [];
                    }
                    return (
                      <div key={sub.id} className="p-3.5 space-y-3 text-xs">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {sub.assignment_title} · {sub.full_name} (@{sub.username})
                            </p>
                            <p className="text-[var(--text-secondary)] truncate tabular-nums">
                              Status: {sub.status} · Score: {sub.score || 0}%
                              {sub.submission_text ? ` · "${sub.submission_text.slice(0, 70)}"` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <select
                              value={asnGradeStatus[sub.id] || sub.status || 'approved'}
                              onChange={(e) => setAsnGradeStatus((p) => ({ ...p, [sub.id]: e.target.value }))}
                              className="bc-select !h-8 !px-2 !text-xs"
                            >
                              <option value="approved">Approved</option>
                              <option value="graded">Graded</option>
                              <option value="needs_revision">Needs Revision</option>
                            </select>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={asnGradeScore[sub.id] ?? String(sub.score || 90)}
                              onChange={(e) => setAsnGradeScore((p) => ({ ...p, [sub.id]: e.target.value }))}
                              className="bc-input !h-8 w-16 !px-2 !text-xs tabular-nums"
                            />
                            <input
                              type="text"
                              placeholder="Feedback for learner..."
                              value={asnGradeFeedback[sub.id] ?? sub.instructor_feedback ?? ''}
                              onChange={(e) => setAsnGradeFeedback((p) => ({ ...p, [sub.id]: e.target.value }))}
                              className="bc-input !h-8 w-44 !px-2 !text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                runAction(async () => {
                                  const draft = asnRubricDrafts[sub.id] || {};
                                  const hasRubricInputs = criteria.length > 0 && Object.keys(draft).length > 0;
                                  if (hasRubricInputs) {
                                    await api.patch(`/admin/assignments/submissions/${sub.id}/rubric`, {
                                      status: asnGradeStatus[sub.id] || 'approved',
                                      instructorFeedback: asnGradeFeedback[sub.id] || 'Graded via course rubric.',
                                      criterionScores: criteria.map((cr) => ({
                                        criterion: cr.criterion,
                                        awarded: Number(draft[cr.criterion] ?? cr.points),
                                      })),
                                    });
                                  } else {
                                    await api.patch(`/admin/assignments/submissions/${sub.id}`, {
                                      status: asnGradeStatus[sub.id] || 'approved',
                                      score: Number(asnGradeScore[sub.id] ?? 90),
                                      instructorFeedback: asnGradeFeedback[sub.id] || 'Reviewed by instructor.',
                                    });
                                  }
                                }, 'Assignment rubric & grade saved.')
                              }
                              className="bc-btn-primary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                            >
                              {criteria.length > 0 ? 'Save Rubric Grade' : 'Save Grade'}
                            </button>
                          </div>
                        </div>

                        {criteria.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                            {criteria.map((cr) => (
                              <label
                                key={cr.criterion}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[var(--bg-subtle)]"
                              >
                                <span className="truncate text-[var(--text-secondary)]">{cr.criterion}</span>
                                <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                                  <input
                                    type="number"
                                    min={0}
                                    max={cr.points}
                                    value={asnRubricDrafts[sub.id]?.[cr.criterion] ?? String(cr.points)}
                                    onChange={(e) =>
                                      setAsnRubricDrafts((prev) => ({
                                        ...prev,
                                        [sub.id]: {
                                          ...(prev[sub.id] || {}),
                                          [cr.criterion]: e.target.value,
                                        },
                                      }))
                                    }
                                    className="bc-input !h-7 w-14 !px-1.5 !text-xs tabular-nums"
                                  />
                                  <span className="text-[var(--text-muted)]">/ {cr.points}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Exercise Submissions Pending Review */}
            {(data.pendingExerciseSubmissions || []).length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] tabular-nums">
                  Exercises Awaiting Instructor Review ({data.pendingExerciseSubmissions.length})
                </h3>
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                  {data.pendingExerciseSubmissions.map((exSub: any) => (
                    <div
                      key={exSub.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {exSub.exercise_title} · {exSub.full_name} (@{exSub.username})
                        </p>
                        <p className="text-[var(--text-secondary)] truncate">{exSub.answer_text || exSub.code_submitted}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={exGradeScore[exSub.id] ?? '85'}
                          onChange={(e) => setExGradeScore((p) => ({ ...p, [exSub.id]: e.target.value }))}
                          className="bc-input !h-8 w-16 !px-2 !text-xs tabular-nums"
                        />
                        <input
                          type="text"
                          placeholder="Instructor feedback..."
                          value={exGradeFeedback[exSub.id] ?? ''}
                          onChange={(e) => setExGradeFeedback((p) => ({ ...p, [exSub.id]: e.target.value }))}
                          className="bc-input !h-8 w-44 !px-2 !text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            runAction(async () => {
                              await api.patch(`/admin/exercises/submissions/${exSub.id}`, {
                                score: Number(exGradeScore[exSub.id] ?? 85),
                                instructorFeedback: exGradeFeedback[exSub.id] || 'Great explanation.',
                              });
                            }, 'Exercise submission graded.')
                          }
                          className="bc-btn-primary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                        >
                          Grade
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Student Projects Review */}
            {(data.submittedProjects || []).length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] tabular-nums">
                  Student Portfolio Projects ({data.submittedProjects.length})
                </h3>
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                  {data.submittedProjects.slice(0, 8).map((prj: any) => {
                    let criteria: Array<{ criterion: string; points: number }> = [];
                    try {
                      const parsed = JSON.parse(String(prj.template_rubric_json || '[]'));
                      if (Array.isArray(parsed)) {
                        criteria = parsed.map((item: any) => {
                          if (typeof item === 'string') {
                            const m = item.match(/\((\d{1,3})\s*(?:%|pts|points)?\)/i);
                            return { criterion: item, points: m ? Number(m[1]) : 25 };
                          }
                          return { criterion: String(item?.criterion || item?.title || ''), points: Number(item?.points || 25) };
                        }).filter((c) => c.criterion);
                      }
                    } catch {
                      criteria = [];
                    }
                    return (
                      <div key={prj.id} className="p-3.5 space-y-2.5 text-xs">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)]">
                              {prj.title} · {prj.owner_name} (@{prj.owner_username})
                            </p>
                            <p className="text-[var(--text-secondary)] capitalize">
                              Status: {String(prj.status || 'in_progress').replace('_', ' ')} · {prj.visibility}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={prjStatus[prj.id] || prj.status || 'approved'}
                              onChange={(e) => setPrjStatus((p) => ({ ...p, [prj.id]: e.target.value }))}
                              className="bc-select !h-8 !px-2 !text-xs"
                            >
                              <option value="in_progress">In Progress</option>
                              <option value="submitted">Submitted</option>
                              <option value="needs_revision">Needs Revision</option>
                              <option value="approved">Approved</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Review feedback..."
                              value={prjFeedback[prj.id] ?? prj.instructor_feedback ?? ''}
                              onChange={(e) => setPrjFeedback((p) => ({ ...p, [prj.id]: e.target.value }))}
                              className="bc-input !h-8 w-44 !px-2 !text-xs"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                runAction(async () => {
                                  const draft = prjRubricDrafts[prj.id] || {};
                                  if (criteria.length > 0 && Object.keys(draft).length > 0) {
                                    await api.patch(`/admin/projects/${prj.id}/rubric`, {
                                      status: prjStatus[prj.id] || 'approved',
                                      instructorFeedback: prjFeedback[prj.id] || 'Reviewed via project rubric.',
                                      criterionScores: criteria.map((cr) => ({
                                        criterion: cr.criterion,
                                        awarded: Number(draft[cr.criterion] ?? cr.points),
                                      })),
                                    });
                                  } else {
                                    await api.patch(`/admin/projects/${prj.id}/review`, {
                                      status: prjStatus[prj.id] || 'approved',
                                      instructorFeedback: prjFeedback[prj.id] || 'Reviewed.',
                                    });
                                  }
                                }, 'Project review saved.')
                              }
                              className="bc-btn-secondary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                            >
                              Save Review
                            </button>
                          </div>
                        </div>
                        {criteria.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-[var(--border-subtle)]">
                            {criteria.map((cr) => (
                              <label
                                key={cr.criterion}
                                className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[var(--bg-subtle)]"
                              >
                                <span className="truncate text-[var(--text-secondary)]">{cr.criterion}</span>
                                <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                                  <input
                                    type="number"
                                    min={0}
                                    max={cr.points}
                                    value={prjRubricDrafts[prj.id]?.[cr.criterion] ?? String(cr.points)}
                                    onChange={(e) =>
                                      setPrjRubricDrafts((prev) => ({
                                        ...prev,
                                        [prj.id]: {
                                          ...(prev[prj.id] || {}),
                                          [cr.criterion]: e.target.value,
                                        },
                                      }))
                                    }
                                    className="bc-input !h-7 w-14 !px-1.5 !text-xs tabular-nums"
                                  />
                                  <span className="text-[var(--text-muted)]">/ {cr.points}</span>
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
          }
        />

          {/* Instructor & Admin Student Progress Matrix */}
          <div className="bc-panel p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  Learner Progress &amp; Completion Matrix ({studentsProgress.length})
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Real-time learner progress scoped strictly to published lessons, passed assessments, solved exercises, and active certificates.
                </p>
              </div>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search learner name, username, or email..."
                className="bc-input !h-9 w-full sm:w-64 !text-xs"
              />
            </div>

            {(() => {
              const qStu = studentSearch.trim().toLowerCase();
              const filteredStudents = studentsProgress.filter((s) =>
                !qStu ? true : `${s.full_name} ${s.username} ${s.email}`.toLowerCase().includes(qStu)
              );
              if (filteredStudents.length === 0) {
                return <p className="text-xs text-[var(--text-muted)]">No matching learner progress records found.</p>;
              }
              return (
                <div className="bc-table-wrap">
                  <table className="bc-table">
                    <thead>
                      <tr>
                        <th>Learner</th>
                        <th className="text-right">Enrolled</th>
                        <th className="text-right">Published Lessons</th>
                        <th className="text-right">Assessments</th>
                        <th className="text-right">Exercises</th>
                        <th className="text-right">Active Certs</th>
                        <th className="text-right">XP / Streak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.slice(0, 30).map((s) => (
                        <tr key={s.id}>
                          <td>
                            <p className="font-semibold text-[var(--text-primary)]">{s.full_name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] font-mono">@{s.username} · {s.email}</p>
                          </td>
                          <td className="text-right tabular-nums text-[var(--text-secondary)]">{s.enrolled_courses}</td>
                          <td className="text-right tabular-nums text-[var(--text-secondary)]">
                            {s.completed_lessons} / {s.enrolled_lessons_total}
                          </td>
                          <td className="text-right tabular-nums text-[var(--text-secondary)]">{s.assessments_passed}</td>
                          <td className="text-right tabular-nums text-[var(--text-secondary)]">{s.exercises_solved}</td>
                          <td className="text-right tabular-nums text-[var(--text-secondary)]">{s.active_certificates}</td>
                          <td className="text-right font-mono tabular-nums text-[var(--text-primary)]">
                            {s.xp} XP · {s.streak_days}d
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: FINANCE & PLAN PRICING */}
      {activeTab === 'finance' && isAdmin && (
        <div className="space-y-6">
          <div className="bc-panel p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Configurable Plan Pricing</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Adjust monthly and yearly subscription prices in cents without deploying code changes.
              </p>
            </div>
            <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
              {(data.plans || []).map((p: any) => (
                <div
                  key={p.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{p.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{p.audience_label}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <span>Monthly (cents):</span>
                      <input
                        type="number"
                        min={0}
                        value={planMonthly[p.id] ?? String(p.monthly_price_cents)}
                        onChange={(e) => setPlanMonthly((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="bc-input !h-8 w-24 !px-2 !text-xs tabular-nums"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <span>Yearly (cents):</span>
                      <input
                        type="number"
                        min={0}
                        value={planYearly[p.id] ?? String(p.yearly_price_cents)}
                        onChange={(e) => setPlanYearly((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="bc-input !h-8 w-24 !px-2 !text-xs tabular-nums"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        runAction(async () => {
                          await api.patch(`/admin/plans/${p.id}`, {
                            monthlyPriceCents: Number(planMonthly[p.id] ?? p.monthly_price_cents),
                            yearlyPriceCents: Number(planYearly[p.id] ?? p.yearly_price_cents),
                          });
                        }, `Pricing updated for ${p.name}.`)
                      }
                      className="bc-btn-primary !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                    >
                      Save Price
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bc-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Payment Transaction Ledger</h2>
            {(data.payments || []).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No transactions recorded yet.</p>
            ) : (
              <div className="bc-table-wrap">
                <table className="bc-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>User</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((pay: any) => (
                      <tr key={pay.id}>
                        <td className="font-mono text-[var(--text-primary)]">{pay.reference}</td>
                        <td className="text-[var(--text-secondary)]">{pay.user_email}</td>
                        <td className="text-[var(--text-primary)]">{pay.description}</td>
                        <td className="capitalize text-[var(--text-secondary)]">{pay.status}</td>
                        <td className="text-right font-mono tabular-nums text-[var(--text-primary)]">
                          ${(pay.amount_cents / 100).toFixed(2)}
                        </td>
                        <td className="text-right">
                          {pay.status === 'succeeded' && (
                            <button
                              type="button"
                              onClick={() =>
                                runAction(async () => {
                                  await api.post(`/admin/payments/${pay.id}/refund`);
                                }, `Refunded ${pay.reference} and revoked linked entitlements.`)
                              }
                              className="bc-btn-danger !h-7 !px-2.5 !text-[11px] whitespace-nowrap shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Refund</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: ENTITLEMENTS & AUDIT LOGS */}
      {activeTab === 'entitlements' && isAdmin && (
        <div className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAction(async () => {
                await api.post('/admin/entitlements', {
                  userId: grantUserId,
                  featureKey: grantFeature,
                  source: grantSource,
                  durationDays: grantDays,
                  notes: grantNotes,
                });
                setGrantNotes('');
              }, 'Feature entitlement granted and audited.');
            }}
            className="bc-panel p-6 space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Grant Scholarship / Promotional Entitlement</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Grant decoupled feature access independently of billing subscriptions.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <select
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                className="bc-select !h-9 !text-xs"
              >
                {(data.users || []).map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
              <select
                value={grantFeature}
                onChange={(e) => setGrantFeature(e.target.value)}
                className="bc-select !h-9 !text-xs"
              >
                <option value="all_premium">all_premium</option>
                <option value="premium_course_access">premium_course_access</option>
                <option value="premium_lesson_access">premium_lesson_access</option>
                <option value="community_create">community_create</option>
                <option value="collaborative_workspace_access">collaborative_workspace_access</option>
              </select>
              <select
                value={grantSource}
                onChange={(e) => setGrantSource(e.target.value)}
                className="bc-select !h-9 !text-xs"
              >
                <option value="scholarship">scholarship</option>
                <option value="promotion">promotion</option>
                <option value="admin_grant">admin_grant</option>
              </select>
              <input
                type="number"
                min={1}
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                placeholder="Duration (days)"
                className="bc-input !h-9 !text-xs tabular-nums"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={grantNotes}
                onChange={(e) => setGrantNotes(e.target.value)}
                placeholder="Optional audit justification note"
                className="bc-input !h-9 flex-1 min-w-[220px] !text-xs"
              />
              <button
                type="submit"
                className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
              >
                Grant Entitlement
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bc-panel p-6 space-y-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">Active &amp; Historical Entitlements</h2>
              {(data.entitlementGrants || []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No explicit entitlement records yet.</p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                  {data.entitlementGrants.map((g: any) => (
                    <div
                      key={g.id}
                      className="p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {g.feature_key} · <span className="capitalize">{g.source}</span>
                        </p>
                        <p className="text-[var(--text-secondary)] truncate">
                          {g.user_email} · {g.status}
                        </p>
                      </div>
                      {g.status === 'active' && (
                        <button
                          type="button"
                          onClick={() =>
                            runAction(async () => {
                              await api.patch(`/admin/entitlements/${g.id}/revoke`);
                            }, 'Entitlement revoked.')
                          }
                          className="bc-btn-danger !h-7 !px-2.5 !text-[11px] whitespace-nowrap shrink-0"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bc-panel p-6 space-y-3">
              <h2 className="text-base font-bold text-[var(--text-primary)]">System Audit Trail</h2>
              {(data.auditLogs || []).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No administrative actions recorded yet.</p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg max-h-80 overflow-y-auto">
                  {data.auditLogs.map((log: any) => (
                    <div key={log.id} className="p-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-[var(--accent-text)]">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                          {String(log.created_at).slice(0, 19).replace('T', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Actor: {log.actor_email || log.actor_id} · Target: {log.target_type} ({log.target_id})
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Certificate Verification Registry, Revocation & Reinstatement */}
          <div className="bc-panel p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                  Certificate Verification Registry &amp; Revocation ({adminCerts.length})
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Revoke compromised or erroneously issued course and learning-path certificates (public verification reflects revocation immediately) or reinstate eligible awards.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="text"
                  value={certSearch}
                  onChange={(e) => setCertSearch(e.target.value)}
                  placeholder="Search code, learner, or title..."
                  className="bc-input !h-8 w-full sm:w-52 !text-xs"
                />
                {(['all', 'active', 'revoked'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCertFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize cursor-pointer border transition-colors ${
                      certFilter === st
                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const qC = certSearch.trim().toLowerCase();
              const filtered = adminCerts.filter((c) => {
                const st = String(c.status || 'active').toLowerCase();
                if (certFilter !== 'all' && st !== certFilter) return false;
                if (!qC) return true;
                return `${c.certificate_code} ${c.learner_name} ${c.learner_email} ${c.course_title}`.toLowerCase().includes(qC);
              });
              if (filtered.length === 0) {
                return <p className="text-xs text-[var(--text-muted)]">No certificates match the current filter.</p>;
              }
              return (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                  {filtered.map((c) => {
                    const isRevoked = c.status === 'revoked';
                    return (
                      <div
                        key={c.id}
                        className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-semibold flex flex-wrap items-center gap-2 text-[var(--text-primary)]">
                            <span className="font-mono">{c.certificate_code}</span>
                            <span>· {c.course_title}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isRevoked
                                  ? 'bg-[var(--status-danger-soft)] text-[var(--status-danger)]'
                                  : 'bg-[var(--status-success-soft)] text-[var(--status-success)]'
                              }`}
                            >
                              {c.status || 'active'}
                            </span>
                          </p>
                          <p className="text-[var(--text-secondary)] tabular-nums">
                            {c.learner_name} ({c.learner_email}) · Type: {c.certificate_type} · Issued {String(c.issued_at).slice(0, 10)}
                          </p>
                          {isRevoked && c.revocation_reason && (
                            <p className="text-[var(--status-danger)] text-[11px]">Reason: {c.revocation_reason}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {!isRevoked ? (
                            <>
                              <input
                                type="text"
                                value={revokeReasons[c.id] || ''}
                                onChange={(e) => setRevokeReasons((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                placeholder="Revocation reason (required)"
                                className="bc-input !h-8 w-48 !text-xs"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  runAction(async () => {
                                    await api.patch(`/admin/certificates/${c.id}/revoke`, {
                                      reason: revokeReasons[c.id] || '',
                                    });
                                    setRevokeReasons((prev) => ({ ...prev, [c.id]: '' }));
                                  }, `Certificate ${c.certificate_code} revoked.`)
                                }
                                className="bc-btn-danger !h-8 !px-3 !text-xs whitespace-nowrap shrink-0"
                              >
                                Revoke
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                runAction(async () => {
                                  await api.patch(`/admin/certificates/${c.id}/reinstate`, {});
                                }, `Certificate ${c.certificate_code} reinstated.`)
                              }
                              className="h-8 px-3 rounded-lg bg-[var(--status-success)] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Reinstate</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: CONTACT ENQUIRIES */}
      {activeTab === 'enquiries' && canSupport && (
        <div className="bc-panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] tabular-nums">
                Contact &amp; Support Enquiries ({(data.contactInquiries || []).length})
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Review incoming user, institutional training, technical issue, and partnership enquiries submitted through the Braincode contact forms.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['all', 'pending', 'reviewed', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setEnquiryFilter(st)}
                  className={`px-3 py-1.5 rounded-lg font-semibold capitalize cursor-pointer border transition-colors ${
                    enquiryFilter === st
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const list = (data.contactInquiries || []).filter((inq: ContactInquiry) =>
              enquiryFilter === 'all' ? true : inq.status === enquiryFilter
            );
            if (list.length === 0) {
              return (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center border border-dashed border-[var(--border-default)] rounded-lg">
                  No {enquiryFilter === 'all' ? '' : enquiryFilter} enquiries found.
                </p>
              );
            }
            return (
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                {list.map((inq: ContactInquiry) => (
                  <div
                    key={inq.id}
                    className="p-4 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm text-[var(--text-primary)]">{inq.subject}</p>
                        <p className="text-[var(--text-secondary)] mt-0.5">
                          <span className="font-semibold text-[var(--text-primary)]">{inq.name}</span> ({inq.email}) ·{' '}
                          <span className="text-[var(--accent-text)] font-medium">{inq.category || 'General Enquiry'}</span>
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-[var(--text-muted)] tabular-nums">
                        <p className="font-mono">{inq.id}</p>
                        <p>{String(inq.created_at).slice(0, 16).replace('T', ' ')}</p>
                      </div>
                    </div>

                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed bg-[var(--bg-subtle)] p-3 rounded-lg">
                      {inq.message}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <select
                        aria-label={`Status for ${inq.id}`}
                        value={enquiryStatusDrafts[inq.id] ?? inq.status ?? 'pending'}
                        onChange={(e) =>
                          setEnquiryStatusDrafts((prev) => ({
                            ...prev,
                            [inq.id]: e.target.value as 'pending' | 'reviewed' | 'resolved',
                          }))
                        }
                        className="bc-select !h-9 !text-xs capitalize"
                      >
                        <option value="pending">pending</option>
                        <option value="reviewed">reviewed</option>
                        <option value="resolved">resolved</option>
                      </select>
                      <input
                        type="text"
                        value={enquiryNotesDrafts[inq.id] ?? inq.admin_notes ?? ''}
                        onChange={(e) =>
                          setEnquiryNotesDrafts((prev) => ({ ...prev, [inq.id]: e.target.value }))
                        }
                        placeholder="Internal resolution notes..."
                        className="bc-input !h-9 flex-1 !text-xs"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          runAction(async () => {
                            await api.patch(`/admin/contact-inquiries/${inq.id}`, {
                              status: enquiryStatusDrafts[inq.id] ?? inq.status,
                              adminNotes: enquiryNotesDrafts[inq.id] ?? '',
                            });
                          }, `Enquiry ${inq.id} updated.`)
                        }
                        className="bc-btn-primary !h-9 !px-4 !text-xs whitespace-nowrap shrink-0"
                      >
                        Save Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB: USERS & MODERATION */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="bc-panel p-6 space-y-3">
            <h2 className="text-base font-bold text-[var(--text-primary)] tabular-nums">
              Moderation Reports ({data.reports.length})
            </h2>
            {data.reports.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No reports in the moderation queue.</p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg">
                {data.reports.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{r.target_type}</span> reported by @{r.reporter_username}:{' '}
                      {r.reason}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-medium text-[var(--text-secondary)]">{r.status}</span>
                      {r.status === 'open' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              runAction(async () => {
                                await api.patch(`/admin/reports/${r.id}`, { status: 'resolved' });
                              }, 'Report resolved.')
                            }
                            className="px-2.5 py-1 rounded-md bg-[var(--status-success)] text-white text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            Resolve
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runAction(async () => {
                                await api.patch(`/admin/reports/${r.id}`, { status: 'dismissed' });
                              }, 'Report dismissed.')
                            }
                            className="bc-btn-secondary !h-7 !px-2.5 !text-[11px] whitespace-nowrap shrink-0"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="bc-panel p-6 space-y-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">User Accounts, Roles &amp; Status</h2>
              <div className="bc-table-wrap">
                <table className="bc-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-right">XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u: any) => (
                      <tr key={u.id}>
                        <td className="font-medium text-[var(--text-primary)]">{u.full_name}</td>
                        <td className="text-[var(--text-secondary)]">{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={(e) =>
                              runAction(async () => {
                                await api.patch(`/admin/users/${u.id}`, { role: e.target.value });
                              }, `Updated role for ${u.email}.`)
                            }
                            className="bc-select !h-7 !px-2 !text-xs"
                          >
                            <option value="learner">learner</option>
                            <option value="instructor">instructor</option>
                            <option value="moderator">moderator</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={u.status}
                            onChange={(e) =>
                              runAction(async () => {
                                await api.patch(`/admin/users/${u.id}`, { status: e.target.value });
                              }, `Updated status for ${u.email}.`)
                            }
                            className="bc-select !h-7 !px-2 !text-xs"
                          >
                            <option value="active">active</option>
                            <option value="suspended">suspended</option>
                          </select>
                        </td>
                        <td className="text-right font-mono tabular-nums text-[var(--text-primary)]">{u.xp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

