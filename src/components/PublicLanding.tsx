import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookmarkCheck,
  Bot,
  Check,
  ChevronDown,
  Code2,
  FolderGit2,
  Layers,
  Menu,
  Moon,
  Play,
  Search,
  Sparkles,
  Sun,
  Terminal,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import type {
  Course,
  LearningPath,
  SearchResponse,
  SubscriptionPlan,
  Technology,
} from '../types';
import { TechGlyph } from './TechGlyph';
import { TechnologyBar } from './TechnologyBar';
import { TechnologyPageView } from './TechnologyPageView';
import {
  DIRECTORY_CATEGORY_CHIPS,
  TechnologyDirectorySection,
} from './TechnologyDirectorySection';
import { ContactPageSection } from './ContactPageSection';
import { SocialLinksRow } from './SocialLinksRow';

interface PublicLandingProps {
  initialPage?: 'home' | 'contact';
  initialTechSlug?: string | null;
  onPageChange?: (page: 'home' | 'contact') => void;
  onTechSlugChange?: (slug: string | null) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onEnterApp: (route?: string) => void;
}

const ABOUT_LEARNING_AREAS = [
  { title: 'Software Development', desc: 'System architecture, clean patterns, testing workflows, and multi-file projects.' },
  { title: 'Programming Languages', desc: 'Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, PHP, Swift, and Kotlin.' },
  { title: 'Databases', desc: 'Relational SQL, PostgreSQL, MySQL, SQLite, MongoDB, Redis, and data modeling.' },
  { title: 'Web Development', desc: 'Semantic HTML5, responsive CSS, React, Next.js, Node.js, and REST/GraphQL APIs.' },
  { title: 'Artificial Intelligence', desc: 'AI fundamentals, prompt engineering, applied machine learning, and ethical guardrails.' },
  { title: 'Cloud Computing', desc: 'Docker containers, Kubernetes orchestration, AWS/GCP/Azure foundations, and CI/CD.' },
  { title: 'Cybersecurity', desc: 'Authentication security, OWASP defenses, cryptography basics, and network hardening.' },
  { title: 'Developer Tools', desc: 'Git workflows, Linux shell, package ecosystems, debugging, and live workspaces.' },
  { title: 'Career Learning Paths', desc: 'Role-focused tracks connecting structured lessons, exercises, portfolios, and certificates.' },
];

const WEBSITE_BUILDER_DEFAULT = `<!DOCTYPE html>
<html lang="en">
<head>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 20px; background: #09111f; color: #f8fafc; }
  .card { border: 1px solid #1e3a5f; border-radius: 12px; padding: 18px; background: #0e182b; }
  h2 { margin: 0 0 6px; font-size: 18px; }
  p { margin: 0 0 14px; font-size: 13px; color: #94a3b8; }
  button { background: #0A84FF; color: #fff; border: 0; padding: 8px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
  <section class="card">
    <h2>Developer Portfolio Starter</h2>
    <p>Edit this HTML/CSS and click Run Site Preview to test inside Braincode.</p>
    <button onclick="document.getElementById('status').textContent='Published preview verified at ' + new Date().toLocaleTimeString()">Test Interaction</button>
    <p id="status" style="color:#38bdf8;margin-top:10px;margin-bottom:0;"></p>
  </section>
</body>
</html>`;

const PRACTICE_LABS: Record<string, { label: string; lang: string; code: string }> = {
  html: {
    label: 'HTML',
    lang: 'html',
    code: `<!DOCTYPE html>
<html>
<body style="font-family:'Inter',system-ui,sans-serif;background:#09111f;color:#f8fafc;padding:18px;">
  <h2 style="margin:0 0 8px;">Semantic HTML5 Lab</h2>
  <p style="color:#94a3b8;font-size:13px;">Edit markup and run live inside the isolated browser sandbox.</p>
  <button onclick="document.getElementById('msg').textContent='Executed safely at ' + new Date().toLocaleTimeString()"
    style="background:#0A84FF;color:#fff;border:0;padding:8px 14px;border-radius:8px;cursor:pointer;">
    Run Code
  </button>
  <p id="msg" style="color:#38bdf8;font-size:12px;margin-top:10px;"></p>
</body>
</html>`,
  },
  javascript: {
    label: 'JavaScript',
    lang: 'javascript',
    code: `const tracks = [
  { tech: 'JavaScript', hours: 18, free: true },
  { tech: 'TypeScript', hours: 18, free: true },
  { tech: 'Node.js', hours: 16, free: true }
];
const totalHours = tracks.reduce((sum, item) => sum + item.hours, 0);
console.log('Total engineering hours:', totalHours);`,
  },
  python: {
    label: 'Python',
    lang: 'python',
    code: `def mastery_band(xp: int) -> str:
    if xp >= 1000:
        return "Senior Builder"
    elif xp >= 300:
        return "Active Developer"
    return "Foundation Learner"

for tech, score in [("HTML", 450), ("Python", 1120), ("SQL", 320)]:
    print(f"{tech}: {mastery_band(score)}")`,
  },
  sql: {
    label: 'SQL',
    lang: 'sql',
    code: `SELECT t.name AS technology,
       COUNT(c.id) AS published_courses,
       SUM(c.estimated_hours) AS total_hours
FROM technologies t
JOIN courses c ON c.technology_id = t.id
WHERE c.status = 'published'
GROUP BY t.id
ORDER BY total_hours DESC;`,
  },
};

const FAQS = [
  {
    q: 'Do I need prior coding experience to start learning on Braincode?',
    a: 'No. Foundational tracks including HTML, CSS, JavaScript, TypeScript, Python, SQL, and Git start from first principles with free starter lessons, technical references, and interactive practice labs.',
  },
  {
    q: 'Why do some technologies say Available while others say In Development or Coming Soon?',
    a: 'Braincode shows honest curriculum status for every entry in our 200+ technology directory. Available technologies have full published courses with lessons and assessments; In Development and Coming Soon entries provide starter previews and transparent roadmap status without empty placeholder lessons.',
  },
  {
    q: 'How do Braincode course certificates work?',
    a: 'When you complete every published lesson in an enrolled course, Braincode verifies your server-side progress and issues a unique certificate code (CERT-BC-...) that anyone can verify publicly.',
  },
  {
    q: 'How is Braincode connected to BrainCode Technology Limited?',
    a: 'Braincode is a technology education platform designed, engineered, and operated by BrainCode Technology Limited as an integrated learning, coding workspace, AI tutoring, community, and developer portfolio ecosystem.',
  },
];

export function PublicLanding({
  initialPage = 'home',
  initialTechSlug = null,
  onPageChange,
  onTechSlugChange,
  onOpenAuth,
  onEnterApp,
}: PublicLandingProps) {
  const { user, brand, theme, toggleTheme } = useAuth();

  // Base catalog & pricing data
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [allTechnologies, setAllTechnologies] = useState<Technology[]>([]);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // 200+ Technology Directory shared filter/pagination state synced with Hero search & chips
  const [dirCategory, setDirCategory] = useState('');
  const [dirStatus, setDirStatus] = useState<'all' | 'available' | 'in_development' | 'coming_soon'>('all');
  const [dirLimit, setDirLimit] = useState(20);

  // Selected Technology Page & Dedicated /contact Page
  const [activeTechSlug, setActiveTechSlug] = useState<string | null>(initialTechSlug);
  const [activePage, setActivePage] = useState<'home' | 'contact'>(initialPage);

  // Navigation & Search UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAllPaths, setShowAllPaths] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  // Section C: Website Builder live editor state
  const [siteCode, setSiteCode] = useState(WEBSITE_BUILDER_DEFAULT);
  const [sitePreviewDoc, setSitePreviewDoc] = useState(WEBSITE_BUILDER_DEFAULT);

  // Section D: Practice Lab switcher state
  const [practiceTab, setPracticeTab] = useState<'html' | 'javascript' | 'python' | 'sql'>('html');
  const [practiceCode, setPracticeCode] = useState(PRACTICE_LABS.html.code);
  const [practicePreview, setPracticePreview] = useState<string | null>(PRACTICE_LABS.html.code);

  // Pricing, Verification, FAQ, Legal Modals
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    revoked?: boolean;
    message: string;
    learner_name?: string;
    course_title?: string;
    issued_at?: string;
  } | null>(null);

  // Sync external route props (e.g. popstate)
  useEffect(() => {
    setActiveTechSlug(initialTechSlug ?? null);
  }, [initialTechSlug]);

  useEffect(() => {
    setActivePage(initialPage);
  }, [initialPage]);

  useEffect(() => {
    if (activeTechSlug) return;
    if (activePage === 'contact') {
      document.title = `Contact Us | ${brand.product_name}`;
    } else {
      document.title = `${brand.product_name} — ${brand.tagline}`;
    }
  }, [activePage, activeTechSlug, brand.product_name, brand.tagline]);

  const selectTechnology = (slug: string | null) => {
    setActiveTechSlug(slug);
    setShowDropdown(false);
    setMobileMenuOpen(false);
    onTechSlugChange?.(slug);
  };

  const openPage = (page: 'home' | 'contact') => {
    setActiveTechSlug(null);
    setActivePage(page);
    setMobileMenuOpen(false);
    onPageChange?.(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Load baseline catalog + plans
  useEffect(() => {
    api.get<{ plans: SubscriptionPlan[] }>('/plans').then((res) => setPlans(res.plans)).catch(() => {});
    api
      .get<{
        technologies: Technology[];
        learningPaths: LearningPath[];
        courses: Course[];
      }>('/catalog')
      .then((res) => {
        setAllTechnologies(res.technologies);
        setLearningPaths(res.learningPaths);
        setCourses(res.courses);
      })
      .catch(() => {});
  }, []);

  // Debounced autocomplete dropdown query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      api
        .get<SearchResponse>(`/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => {
          setSearchResults(res);
          setShowDropdown(true);
        })
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(ev.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const switchPracticeTab = (tab: 'html' | 'javascript' | 'python' | 'sql') => {
    setPracticeTab(tab);
    setPracticeCode(PRACTICE_LABS[tab].code);
    setPracticePreview(tab === 'html' ? PRACTICE_LABS.html.code : null);
  };

  const runPracticeSnippet = () => {
    if (practiceTab === 'html') {
      setPracticePreview(practiceCode);
      return;
    }
    if (practiceTab === 'javascript') {
      const doc = `<!DOCTYPE html><html><body style="font-family:monospace;background:#05070A;color:#e2e8f0;padding:12px;">
        <div id="out"></div>
        <script>
          const out = document.getElementById('out');
          console.log = (...args) => {
            const row = document.createElement('div');
            row.textContent = '> ' + args.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' ');
            out.appendChild(row);
          };
          try { ${practiceCode.replace(/<\/script>/gi, '<\\/script>')} } catch(e) {
            const err = document.createElement('div'); err.style.color='#f87171'; err.textContent = e.message; out.appendChild(err);
          }
        </script></body></html>`;
      setPracticePreview(doc);
      return;
    }
    setPracticePreview(
      `<!DOCTYPE html><html><body style="font-family:monospace;background:#05070A;color:#38bdf8;padding:12px;font-size:12px;line-height:1.5;">` +
        `<div style="color:#94a3b8;font-size:11px;margin-bottom:6px;">[Sample reference output — switch to HTML or JavaScript for live browser execution]</div>` +
        `${
          practiceTab === 'python'
            ? 'HTML: Active Developer<br>Python: Senior Builder<br>SQL: Active Developer'
            : 'technology | published_courses | total_hours<br>Python | 1 | 22<br>JavaScript | 1 | 18'
        }</body></html>`
    );
  };

  const openCourseOrAuth = (courseSlug?: string) => {
    if (user && courseSlug) {
      onEnterApp(`course:${courseSlug}`);
      return;
    }
    if (user) {
      onEnterApp('courses');
      return;
    }
    onOpenAuth('signup');
  };

  const scrollToSection = (id: string, categorySlug?: string) => {
    setActiveTechSlug(null);
    setActivePage('home');
    onPageChange?.('home');
    setMobileMenuOpen(false);
    if (typeof categorySlug === 'string') {
      setDirCategory(categorySlug);
      setDirLimit(24);
    }
    setTimeout(() => {
      if (id === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 40);
  };

  const verifyCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = verifyCodeInput.trim().toUpperCase();
    if (!code) return;
    try {
      const res = await api.get<{
        valid: boolean;
        revoked?: boolean;
        message?: string;
        certificate: { learner_name: string; course_title: string; issued_at: string; revocation_reason?: string };
      }>(`/certificates/verify/${encodeURIComponent(code)}`);
      setVerifyResult({
        valid: Boolean(res.valid),
        revoked: Boolean(res.revoked),
        message:
          res.message ||
          (res.valid
            ? `Verified authentic ${brand.product_name} completion certificate.`
            : 'This certificate is no longer valid.'),
        learner_name: res.certificate?.learner_name,
        course_title: res.certificate?.course_title,
        issued_at: res.certificate?.issued_at,
      });
    } catch (err) {
      setVerifyResult({
        valid: false,
        revoked: false,
        message: err instanceof ApiError ? err.message : 'Verification code not found.',
      });
    }
  };

  const formatPrice = (cents: number) => (cents === 0 ? '$0' : `$${(cents / 100).toFixed(0)}`);

  if (activeTechSlug) {
    return (
      <TechnologyPageView
        techSlug={activeTechSlug}
        allTechnologies={allTechnologies}
        isAuthenticated={Boolean(user)}
        onSelectTechnology={(slug) => selectTechnology(slug)}
        onOpenCourse={(slug) => openCourseOrAuth(slug)}
        onOpenAuth={onOpenAuth}
        onOpenAiTutor={() => onEnterApp('ai')}
        onExploreAvailableCourses={() => {
          selectTechnology(null);
          setDirStatus('available');
          setTimeout(() => document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' }), 40);
        }}
        onBackHome={() => selectTechnology(null)}
        showBar
      />
    );
  }

  const monogram = (brand.product_name || 'Braincode').trim().charAt(0).toUpperCase() || 'B';

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] transition-colors flex flex-col">
      {/* Sticky Navigation + Technology Quick Bar */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-sm">
        <div className="border-b border-[var(--border-default)]">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 h-15 flex items-center justify-between gap-2 sm:gap-3">
            {/* Zone 1: Brand Logo + Product Name */}
            <button
              type="button"
              onClick={() => openPage('home')}
              className="flex items-center gap-2 text-left cursor-pointer shrink-0 min-w-0"
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.product_name}
                  className="w-8 h-8 rounded-lg object-cover border border-[var(--border-default)] shrink-0"
                />
              ) : (
                <span className="w-8 h-8 rounded-lg bg-[#0A84FF] text-white font-heading text-sm font-bold flex items-center justify-center shrink-0">
                  {monogram}
                </span>
              )}
              <span className="font-heading text-sm sm:text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap truncate">
                {brand.product_name}
              </span>
            </button>

            {/* Zone 2: Clean Desktop Navigation */}
            <nav aria-label="Primary" className="hidden xl:flex items-center gap-3 text-xs font-medium text-[var(--text-secondary)]">
              <button type="button" onClick={() => openPage('home')} className={`hover:text-[#0A84FF] whitespace-nowrap cursor-pointer ${activePage === 'home' ? 'text-[#0A84FF] font-semibold' : ''}`}>
                Home
              </button>
              <button type="button" onClick={() => (user ? onEnterApp('courses') : selectTechnology('html'))} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Learn
              </button>
              <button type="button" onClick={() => scrollToSection('directory', '')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Technologies
              </button>
              <button type="button" onClick={() => scrollToSection('career-paths')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Learning Paths
              </button>
              <button type="button" onClick={() => scrollToSection('courses-showcase')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Tutorials
              </button>
              <button type="button" onClick={() => scrollToSection('practice-lab')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Exercises
              </button>
              <button type="button" onClick={() => scrollToSection('certificates')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Certificates
              </button>
              <button type="button" onClick={() => scrollToSection('about')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                About Us
              </button>
              <button
                type="button"
                onClick={() => openPage('contact')}
                className={`hover:text-[#0A84FF] whitespace-nowrap cursor-pointer ${activePage === 'contact' ? 'text-[#0A84FF] font-semibold' : ''}`}
              >
                Contact Us
              </button>
              <button type="button" onClick={() => onEnterApp('communities')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Community
              </button>
              <button type="button" onClick={() => scrollToSection('pricing')} className="hover:text-[#0A84FF] whitespace-nowrap cursor-pointer">
                Pricing
              </button>
            </nav>

            {/* Zone 3: Tablet Contact Action + Theme + Auth Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openPage('contact')}
                className={`hidden sm:inline-flex xl:hidden h-9 px-3 items-center rounded-lg border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  activePage === 'contact'
                    ? 'border-[#0A84FF] bg-[var(--accent-soft)] text-[#0A84FF]'
                    : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Contact Us
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle color theme"
                className="h-9 w-9 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => onEnterApp('dashboard')}
                  className="bc-btn-primary h-9 px-3 sm:px-4 text-xs whitespace-nowrap shrink-0"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="hidden sm:inline-flex h-9 px-3.5 items-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('signup')}
                    className="bc-btn-primary h-9 px-3 sm:px-4 text-xs whitespace-nowrap shrink-0"
                  >
                    Get Started
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Toggle navigation menu"
                className="xl:hidden h-9 w-9 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="xl:hidden border-t border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-4 grid grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs font-medium">
              <button type="button" onClick={() => openPage('home')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Home
              </button>
              <button type="button" onClick={() => openCourseOrAuth()} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Learn
              </button>
              <button type="button" onClick={() => scrollToSection('directory', '')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Technologies (200+)
              </button>
              <button type="button" onClick={() => scrollToSection('career-paths')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Learning Paths
              </button>
              <button type="button" onClick={() => scrollToSection('courses-showcase')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Tutorials
              </button>
              <button type="button" onClick={() => scrollToSection('practice-lab')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Exercises
              </button>
              <button type="button" onClick={() => scrollToSection('certificates')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Certificates
              </button>
              <button type="button" onClick={() => scrollToSection('about')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                About Us
              </button>
              <button type="button" onClick={() => openPage('contact')} className="px-3 py-2 rounded-lg text-left font-semibold text-[#0A84FF] hover:bg-[var(--bg-subtle)] cursor-pointer">
                Contact Us
              </button>
              <button type="button" onClick={() => onEnterApp('communities')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Community
              </button>
              <button type="button" onClick={() => scrollToSection('pricing')} className="px-3 py-2 rounded-lg text-left hover:bg-[var(--bg-subtle)] cursor-pointer">
                Pricing
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                  className="min-[380px]:col-span-2 sm:col-span-3 px-3 py-2 rounded-lg border border-[var(--border-default)] text-center font-semibold cursor-pointer mt-1"
                >
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick technology bar + Directory modal */}
        <TechnologyBar
          technologies={allTechnologies}
          activeSlug={activeTechSlug || undefined}
          onSelectTechnology={(slug) => selectTechnology(slug)}
        />
      </header>

      {activePage === 'contact' ? (
        <main className="flex-1">
          <ContactPageSection isStandalonePage onBackHome={() => openPage('home')} />
        </main>
      ) : (
        <main className="flex-1">
        {/* HERO SECTION: "What do you want to learn?" */}
        <section className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-10 sm:pt-14 sm:pb-12 text-center space-y-6">
            <div className="max-w-3xl mx-auto space-y-3.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
                {brand.product_name} · {brand.tagline}
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-[1.1] text-[var(--text-primary)] text-balance">
                What do you want to learn?
              </h1>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-[1.65] text-balance">
                Explore 200+ technologies, programming languages, frameworks, databases and developer tools. Learn at your own pace, practise with real code and build skills for the future.
              </p>
            </div>

            {/* Prominent Database-Backed Search Input */}
            <div ref={searchBoxRef} className="max-w-3xl mx-auto relative text-left">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="global-search-input"
                    type="text"
                    value={searchQuery}
                    onFocus={() => searchResults && setShowDropdown(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setDirLimit(20);
                    }}
                    placeholder="Search HTML, Python, JavaScript, React, SQL, MongoDB..."
                    className="w-full h-12 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] pl-10 pr-9 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#0A84FF]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setShowDropdown(false);
                      }}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bc-btn-primary h-12 px-5 text-sm whitespace-nowrap shrink-0"
                >
                  <span>Explore Directory</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Instant DB Autocomplete Dropdown */}
              {showDropdown && searchResults && (
                <div className="absolute left-0 right-0 z-30 mt-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-popover)] max-h-96 overflow-y-auto p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>
                      {searchLoading
                        ? 'Searching catalog...'
                        : `Found ${searchResults.technologies.length} technologies, ${searchResults.courses.length} courses, ${searchResults.lessons.length} lessons`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDropdown(false)}
                      className="hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>

                  {searchResults.technologies.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchResults.technologies.slice(0, 8).map((tech) => (
                        <button
                          key={tech.id}
                          type="button"
                          onClick={() => selectTechnology(tech.slug)}
                          className="p-2.5 rounded-lg border border-[var(--border-default)] hover:border-[#0A84FF] text-left flex items-center gap-2.5 cursor-pointer"
                        >
                          <TechGlyph
                            slug={tech.slug}
                            name={tech.name}
                            symbol={tech.icon_symbol}
                            brandColor={tech.brand_color}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate">{tech.name}</p>
                            <p className="text-[11px] text-[var(--text-muted)] truncate">
                              {tech.category_name} ·{' '}
                              {tech.learning_status === 'available'
                                ? `${tech.course_count} course${Number(tech.course_count) > 1 ? 's' : ''}`
                                : tech.learning_status === 'in_development'
                                ? 'In Development'
                                : 'Coming Soon'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.courses.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-default)]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Courses</p>
                      {searchResults.courses.slice(0, 3).map((crs) => (
                        <button
                          key={crs.id}
                          type="button"
                          onClick={() => {
                            setShowDropdown(false);
                            if (crs.technology_slug) selectTechnology(crs.technology_slug);
                            else openCourseOrAuth(crs.slug);
                          }}
                          className="w-full p-2.5 rounded-lg hover:bg-[var(--bg-subtle)] text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="text-xs font-semibold truncate">{crs.title}</span>
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0">{crs.difficulty}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.exercises && searchResults.exercises.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-default)]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Exercises &amp; Practice</p>
                      {searchResults.exercises.slice(0, 3).map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => openCourseOrAuth(ex.course_slug)}
                          className="w-full p-2.5 rounded-lg hover:bg-[var(--bg-subtle)] text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="text-xs font-semibold truncate">{ex.title}</span>
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0">{ex.course_title}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.projectTemplates && searchResults.projectTemplates.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[var(--border-default)]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Starter Projects</p>
                      {searchResults.projectTemplates.slice(0, 2).map((pt) => (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => (user ? onEnterApp('projects') : onOpenAuth('signup'))}
                          className="w-full p-2.5 rounded-lg hover:bg-[var(--bg-subtle)] text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="text-xs font-semibold truncate">{pt.title}</span>
                          <span className="text-[11px] text-[var(--text-muted)] shrink-0">{pt.difficulty}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {searchResults.technologies.length === 0 &&
                    searchResults.courses.length === 0 &&
                    (!searchResults.exercises || searchResults.exercises.length === 0) &&
                    (!searchResults.projectTemplates || searchResults.projectTemplates.length === 0) && (
                      <p className="text-xs text-[var(--text-muted)] py-2">
                        No records matched &quot;{searchResults.query}&quot;. Try a language, framework, or alias like &quot;k8s&quot; or &quot;golang&quot;.
                      </p>
                    )}
                </div>
              )}
            </div>

            {/* Unmistakable Beginner Entry Row */}
            <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-[var(--text-secondary)] font-medium">New to coding? Start here:</span>
              <button
                type="button"
                data-testid="hero-start-html-btn"
                onClick={() => selectTechnology('html')}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start Learning HTML</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {[
                { slug: 'css', label: 'CSS' },
                { slug: 'javascript', label: 'JavaScript' },
                { slug: 'python', label: 'Python' },
                { slug: 'sql', label: 'SQL' },
              ].map((quick) => (
                <button
                  key={quick.slug}
                  type="button"
                  onClick={() => selectTechnology(quick.slug)}
                  className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[#0A84FF] font-medium cursor-pointer"
                >
                  {quick.label}
                </button>
              ))}
            </div>

            {/* Category Quick Filter Chips (Synced with Directory Section) */}
            <div
              role="group"
              aria-label="Filter technologies by category"
              className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-2"
            >
              {DIRECTORY_CATEGORY_CHIPS.map((chip) => {
                const active = dirCategory === chip.slug;
                return (
                  <button
                    key={chip.slug || 'all'}
                    type="button"
                    onClick={() => {
                      setDirCategory(chip.slug);
                      setDirLimit(24);
                      document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'border-[#0A84FF] bg-[#0A84FF] text-white'
                        : 'border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#0A84FF]'
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* DATABASE-DRIVEN 200+ TECHNOLOGY DIRECTORY */}
        <TechnologyDirectorySection
          searchQuery={searchQuery}
          onResetSearch={() => setSearchQuery('')}
          category={dirCategory}
          onCategoryChange={(slug) => setDirCategory(slug)}
          statusFilter={dirStatus}
          onStatusFilterChange={(st) => setDirStatus(st)}
          limit={dirLimit}
          onLimitChange={(lim) => setDirLimit(lim)}
          totalCatalogHint={allTechnologies.length}
          onSelectTechnology={(slug) => selectTechnology(slug)}
        />

        {/* SECTION A: Save Your Progress. Everywhere. */}
        <section id="progress-sync" className="border-y border-[var(--border-default)] bg-[var(--bg-surface)] py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
                Learner Account Benefits
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">
                Save your progress. Everywhere.
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Keep your learning continuous across desktop and mobile. Every completed lesson, bookmarked reference, study note, and coding workspace is saved directly to your {brand.product_name} account.
              </p>
              <ul className="space-y-2.5 text-sm text-[var(--text-primary)]">
                {[
                  'Resume any lesson or coding lab right where you stopped',
                  'Track XP, study streaks, and structured course completion',
                  'Save reusable workspaces and developer portfolio projects',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <BookmarkCheck className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => (user ? onEnterApp('dashboard') : onOpenAuth('signup'))}
                  className="bc-btn-primary h-10 px-5 text-sm"
                >
                  <span>{user ? 'Open My Dashboard' : 'Create Free Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-subtle)]">
                <img
                  src="/src/assets/images/progress_sync_illustration_1794927340411.jpg"
                  alt={`${brand.product_name} cross-device learning progress, study notes, and dashboard sync illustration`}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION B: Kickstart Your Career */}
        <section id="career-paths" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-subtle)]">
                <img
                  src="/src/assets/images/career_pathway_illustration_1794927338735.jpg"
                  alt={`Structured ${brand.product_name} developer career pathway leading to live project and certificate`}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5 order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
                Career Development Roadmaps
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">
                Kickstart your career.
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Follow role-focused learning paths combining languages, frameworks, system architecture, assessments, and capstone portfolios to move confidently into engineering roles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {(showAllPaths ? learningPaths : learningPaths.slice(0, 4)).map((path) => (
                  <div
                    key={path.id}
                    className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <p className="text-[11px] font-semibold text-[#0A84FF] dark:text-[#38BDF8] tabular-nums">
                        {path.difficulty} · {path.estimated_hours}h · {path.course_ids.length} courses
                      </p>
                      <h3 className="text-sm font-bold mt-1">{path.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{path.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCourseOrAuth()}
                      className="text-xs font-semibold text-[#0A84FF] hover:underline text-left inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>View Track</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openCourseOrAuth()}
                  className="bc-btn-primary h-10 px-5 text-sm"
                >
                  <span>Explore Learning Paths ({learningPaths.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {learningPaths.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPaths((v) => !v)}
                    className="bc-btn-secondary h-10 px-4 text-xs"
                  >
                    {showAllPaths ? 'Show Top 4 Tracks' : `Show All ${learningPaths.length} Paths`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION C: Build and Host Websites */}
        <section id="website-builder" className="border-y border-[var(--border-default)] bg-[var(--bg-surface)] py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
            <div className="lg:col-span-5 space-y-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
                Browser Workspaces &amp; Portfolio Hosting
              </p>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">
                Build and host websites.
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Author multi-file web projects directly inside {brand.product_name} Coding Workspaces, preview responsive layouts live, collaborate with peers over WebSockets, and showcase finished builds in your public portfolio.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onEnterApp('workspace')}
                  className="bc-btn-primary h-10 px-5 text-sm"
                >
                  <span>Start Building</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-300 dark:border-white/15 bg-[#0B0F17] text-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#101624]">
                  <span className="text-xs font-mono text-white/80 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-[#00D4FF]" />
                    <span>index.html — Live Studio Preview</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSitePreviewDoc(siteCode)}
                    className="px-3 py-1 rounded-lg bg-[#0A84FF] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Run Site Preview</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2">
                  <textarea
                    rows={10}
                    spellCheck={false}
                    value={siteCode}
                    onChange={(e) => setSiteCode(e.target.value)}
                    aria-label="Website builder HTML editor"
                    className="w-full bg-[#05070A] text-slate-100 font-mono text-xs p-4 focus:outline-none resize-none border-b md:border-b-0 md:border-r border-white/10"
                  />
                  <iframe
                    title={`${brand.product_name} Website Builder Preview`}
                    sandbox="allow-scripts"
                    srcDoc={sitePreviewDoc}
                    className="w-full h-56 md:h-full min-h-[210px] bg-[#09111f]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION D: Practise. Experiment. Improve. */}
        <section id="practice-lab" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-xl border border-[var(--border-default)] bg-[#0B0F17] text-white overflow-hidden">
              <div className="px-3.5 sm:px-4 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-[#101624]">
                <div className="flex flex-wrap items-center gap-1">
                  {(['html', 'javascript', 'python', 'sql'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => switchPracticeTab(tab)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                        practiceTab === tab ? 'bg-[#0A84FF] text-white' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {PRACTICE_LABS[tab].label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={runPracticeSnippet}
                  className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Try It Yourself</span>
                </button>
              </div>
              <textarea
                rows={9}
                spellCheck={false}
                value={practiceCode}
                onChange={(e) => setPracticeCode(e.target.value)}
                aria-label="Interactive coding practice editor"
                className="w-full bg-[#070A0F] text-slate-100 font-mono text-xs p-4 focus:outline-none resize-none border-b border-white/10"
              />
              {practicePreview && (
                <iframe
                  title={`${brand.product_name} Try It Yourself Output`}
                  sandbox="allow-scripts"
                  srcDoc={practicePreview}
                  className="w-full h-36 bg-[#09111f]"
                />
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
              Interactive Try-It-Yourself Lab
            </p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">
              Practise. Experiment. Improve.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Test HTML, CSS, and JavaScript live in an isolated browser sandbox, explore Python and SQL examples, and launch lesson exercises directly inside your saved workspace.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onEnterApp('workspace')}
                className="bc-btn-primary h-10 px-5 text-sm"
              >
                <Terminal className="w-4 h-4" />
                <span>Start Practising</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION E & F: Learn with AI + Certificates and Projects */}
        <section className="border-y border-[var(--border-default)] bg-[var(--bg-surface)] py-14 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Section E: Learn with AI */}
              <div
                id="ai-learning"
                className="p-6 sm:p-7 rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0A84FF] dark:text-[#38BDF8]">
                    <Bot className="w-4 h-4" />
                    <span>{brand.product_name} AI Tutor</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Learn with AI</h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Get clear concept explanations, step-by-step debugging hints, and architecture walkthroughs anchored to your current course and workspace—with transparent daily free and Pro quotas.
                  </p>
                  <div className="border-l-2 border-[#0A84FF] pl-3.5 py-1 text-xs space-y-1">
                    <p className="text-[var(--text-secondary)]">
                      Prompt: &quot;Why does <code className="font-mono">async/await</code> need <code className="font-mono">try/catch</code> around <code className="font-mono">fetch</code>?&quot;
                    </p>
                    <p className="text-[#0A84FF] dark:text-[#38BDF8] flex items-center gap-1.5 font-medium">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Explained with error-handling pattern &amp; practice prompt</span>
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => onEnterApp('ai')}
                    className="bc-btn-primary h-10 px-5 text-sm"
                  >
                    <span>Explore AI Learning</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Section F: Certificates & Projects */}
              <div
                id="certificates"
                className="p-6 sm:p-7 rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0A84FF] dark:text-[#38BDF8]">
                    <Award className="w-4 h-4" />
                    <span>Verified Credentials &amp; Developer Portfolios</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Certificates and Projects
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Turn completed coding labs into public portfolio showcases and earn server-verified {brand.product_name} course certificates (<span className="font-mono">CERT-BC-...</span>) upon finishing all lessons in a course.
                  </p>

                  <form onSubmit={verifyCertificate} className="space-y-2 pt-1">
                    <label htmlFor="verify-cert-code" className="block text-xs font-semibold">
                      Verify a Certificate Code
                    </label>
                    <div className="flex flex-col min-[380px]:flex-row gap-2">
                      <input
                        id="verify-cert-code"
                        type="text"
                        value={verifyCodeInput}
                        onChange={(e) => setVerifyCodeInput(e.target.value)}
                        placeholder="CERT-BC-2026-XXXXXX"
                        className="bc-input flex-1 text-xs font-mono"
                      />
                      <button
                        type="submit"
                        className="bc-btn-secondary h-10 px-4 text-xs whitespace-nowrap shrink-0"
                      >
                        Verify
                      </button>
                    </div>
                    {verifyResult && (
                      <p
                        className={`text-xs ${
                          verifyResult.valid
                            ? 'text-[var(--status-success)]'
                            : verifyResult.revoked
                              ? 'text-[var(--status-danger)] font-medium'
                              : 'text-[var(--status-warning)]'
                        }`}
                      >
                        {verifyResult.valid
                          ? `${verifyResult.learner_name} · ${verifyResult.course_title} (${verifyResult.issued_at?.slice(0, 10)})`
                          : verifyResult.revoked
                            ? `REVOKED (${verifyResult.learner_name} · ${verifyResult.course_title}): ${verifyResult.message}`
                            : verifyResult.message}
                      </p>
                    )}
                  </form>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onEnterApp('projects')}
                    className="bc-btn-secondary h-10 px-5 text-sm"
                  >
                    <FolderGit2 className="w-4 h-4" />
                    <span>Explore Certificates</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Published Courses Showcase */}
            {courses.length > 0 && (
              <div id="courses-showcase" className="pt-2 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">Available Published Courses ({courses.length})</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Start immediately with free introductory lessons across structured engineering courses.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCourseOrAuth()}
                    className="text-xs font-semibold text-[#0A84FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Browse Full Course Catalog</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.slice(0, 6).map((course) => (
                    <article
                      key={course.id}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-canvas)] p-5 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-medium text-[var(--text-muted)] tabular-nums">
                          {course.technology_name} · {course.difficulty} · {course.estimated_hours}h
                        </p>
                        <h4 className="text-sm font-bold">{course.title}</h4>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{course.description}</p>
                      </div>
                      <div className="pt-2.5 border-t border-[var(--border-default)] flex items-center justify-between gap-2 text-xs">
                        <span className="text-[var(--text-muted)] tabular-nums">
                          {course.free_lessons}/{course.total_lessons} free lessons
                        </span>
                        <div className="flex items-center gap-3">
                          {course.technology_slug && (
                            <button
                              type="button"
                              onClick={() => selectTechnology(course.technology_slug!)}
                              className="text-[var(--text-secondary)] hover:text-[#0A84FF] font-medium cursor-pointer"
                            >
                              Tech Guide
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openCourseOrAuth(course.slug)}
                            className="bc-btn-primary h-8 px-3 text-xs"
                          >
                            Start
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PRICING SECTION */}
        <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-16 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Free Learning &amp; Transparent Subscriptions</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Start learning for free with zero time limit. Upgrade anytime for full courses, team labs, and community creation.
              </p>
            </div>
            <div className="inline-flex items-center p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] self-start">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                Yearly
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const price = billingCycle === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents;
              const isHighlighted = plan.slug === 'pro-learner';
              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-xl border bg-[var(--bg-surface)] flex flex-col justify-between ${
                    isHighlighted
                      ? 'border-[#0A84FF] shadow-[var(--shadow-md)]'
                      : 'border-[var(--border-default)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-[#0A84FF] dark:text-[#38BDF8]">{plan.audience_label}</p>
                      {isHighlighted && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0A84FF] bg-[var(--accent-soft)] px-2 py-0.5 rounded">
                          Popular
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1.5 text-xl font-bold">{plan.name}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{plan.description}</p>
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tabular-nums">{formatPrice(price)}</span>
                      <span className="text-xs text-[var(--text-muted)]">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    <ul className="mt-6 space-y-2.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                          <Check className="w-4 h-4 text-[#0A84FF] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => (user ? onEnterApp('pricing') : onOpenAuth('signup'))}
                    className={`mt-7 w-full h-10 rounded-lg text-sm font-semibold cursor-pointer ${
                      isHighlighted ? 'bc-btn-primary' : 'bc-btn-secondary'
                    }`}
                  >
                    {plan.slug === 'starter-free' ? 'Create Free Account' : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ABOUT BRAINCODE SECTION */}
        <section id="about" className="border-t border-[var(--border-default)] py-14 sm:py-16 bg-[var(--bg-surface)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-start">
              <div className="lg:col-span-5 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
                  About {brand.product_name}
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-balance">
                  {brand.about_headline?.trim() || 'Empowering People Through Technology.'}
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {brand.about_description?.trim() ||
                    `${brand.product_name} is a technology education platform operated by ${brand.company_name}, designed to help learners build real-world coding, engineering, AI, cloud, and cybersecurity skills under one unified ecosystem.`}
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openPage('contact')}
                    className="bc-btn-primary h-10 px-4 text-xs"
                  >
                    <span>Contact Our Team</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('directory', '')}
                    className="bc-btn-secondary h-10 px-4 text-xs"
                  >
                    Explore 200+ Technologies
                  </button>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
                {ABOUT_LEARNING_AREAS.map((area) => (
                  <div
                    key={area.title}
                    className="border-t border-[var(--border-default)] pt-3"
                  >
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">{area.title}</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">{area.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div id="faq" className="max-w-4xl space-y-4">
              <h3 className="text-xl font-bold tracking-tight">Frequently Asked Questions</h3>
              <div className="divide-y divide-[var(--border-default)] border-y border-[var(--border-default)]">
                {FAQS.map((item, idx) => (
                  <div key={item.q} className="py-3.5">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between text-left gap-4 py-1 cursor-pointer"
                    >
                      <span className="text-sm font-semibold">{item.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--text-muted)] transition-transform shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {openFaq === idx && (
                      <p className="mt-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{item.a}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT US & FOLLOW BRAINCODE SECTION */}
        <ContactPageSection onOpenFullContact={() => openPage('contact')} />
      </main>
      )}

      {/* 4-GROUP ORGANIZED FOOTER */}
      <footer className="border-t border-[var(--border-default)] bg-[var(--bg-surface)] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-xs">
            {/* Group 1: Braincode */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{brand.product_name}</h3>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li>
                  <button type="button" onClick={() => scrollToSection('about')} className="hover:text-[#0A84FF] cursor-pointer">
                    About {brand.product_name}
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('about')} className="hover:text-[#0A84FF] cursor-pointer">
                    Our Mission
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('progress-sync')} className="hover:text-[#0A84FF] cursor-pointer">
                    Our Learning Platform
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('career-paths')} className="hover:text-[#0A84FF] cursor-pointer">
                    Careers
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openPage('contact')} className="hover:text-[#0A84FF] cursor-pointer">
                    Partnerships
                  </button>
                </li>
              </ul>
            </div>

            {/* Group 2: Learn */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Learn</h3>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li>
                  <button type="button" onClick={() => scrollToSection('directory', '')} className="hover:text-[#0A84FF] cursor-pointer">
                    Technologies
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('directory', 'programming-languages')} className="hover:text-[#0A84FF] cursor-pointer">
                    Programming Languages
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('directory', 'frameworks-libraries')} className="hover:text-[#0A84FF] cursor-pointer">
                    Frameworks
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('directory', 'databases')} className="hover:text-[#0A84FF] cursor-pointer">
                    Databases
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('career-paths')} className="hover:text-[#0A84FF] cursor-pointer">
                    Learning Paths
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('courses-showcase')} className="hover:text-[#0A84FF] cursor-pointer">
                    Tutorials
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('practice-lab')} className="hover:text-[#0A84FF] cursor-pointer">
                    Exercises
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('certificates')} className="hover:text-[#0A84FF] cursor-pointer">
                    Certificates
                  </button>
                </li>
              </ul>
            </div>

            {/* Group 3: Support */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Support</h3>
              <ul className="space-y-2 text-[var(--text-secondary)]">
                <li>
                  <button type="button" onClick={() => openPage('contact')} className="hover:text-[#0A84FF] cursor-pointer">
                    Contact Us
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openPage('contact')} className="hover:text-[#0A84FF] cursor-pointer">
                    Help Center
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('faq')} className="hover:text-[#0A84FF] cursor-pointer">
                    FAQs
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openPage('contact')} className="hover:text-[#0A84FF] cursor-pointer">
                    Technical Support
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalModal('terms')} className="hover:text-[#0A84FF] cursor-pointer">
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setLegalModal('privacy')} className="hover:text-[#0A84FF] cursor-pointer">
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Group 4: Connect With Us */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Connect With Us</h3>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                {brand.tagline}
              </p>
              <SocialLinksRow
                socialLinks={brand.social_links}
                whatsappUrl={brand.whatsapp_url}
                compact
              />
              <div className="space-y-1 pt-1 text-[var(--text-secondary)]">
                {brand.official_contact_email && (
                  <p>
                    Email:{' '}
                    <a href={`mailto:${brand.official_contact_email}`} className="text-[#0A84FF] hover:underline break-all">
                      {brand.official_contact_email}
                    </a>
                  </p>
                )}
                {brand.support_email && brand.support_email !== brand.official_contact_email && (
                  <p>
                    Support:{' '}
                    <a href={`mailto:${brand.support_email}`} className="text-[#0A84FF] hover:underline break-all">
                      {brand.support_email}
                    </a>
                  </p>
                )}
                {brand.business_phone && (
                  <p>
                    Phone:{' '}
                    <a href={`tel:${brand.business_phone}`} className="hover:text-[#0A84FF] tabular-nums">
                      {brand.business_phone}
                    </a>
                  </p>
                )}
                <p>
                  <button type="button" onClick={() => onEnterApp('communities')} className="text-[#0A84FF] hover:underline cursor-pointer">
                    Developer Community Hub →
                  </button>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Legal Attribution Bar */}
          <div className="pt-6 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <p>
              {brand.footer_about_text?.trim() ||
                `${brand.product_name} is a technology education platform by ${brand.company_name}.`}
            </p>
            <p className="tabular-nums shrink-0">
              &copy; {new Date().getFullYear()} {brand.company_name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 shadow-[var(--shadow-popover)]">
            <h3 className="text-lg font-bold">
              {legalModal === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
            </h3>
            <p className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              {legalModal === 'terms'
                ? `${brand.product_name}, operated by ${brand.company_name}, provides structured learning curricula, coding workspaces, and peer communities. Users retain ownership of original workspace code and portfolio projects while respecting community rules and academic honesty.`
                : `${brand.company_name} stores account credentials securely using salted cryptographic hashes, honors user profile visibility settings, and never shares private workspaces or unapproved user data with third parties without authorization.`}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="bc-btn-primary h-9 px-4 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
