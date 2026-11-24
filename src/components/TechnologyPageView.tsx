import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Database,
  Download,
  Eye,
  FileText,
  FolderKanban,
  HelpCircle,
  ListChecks,
  Lock,
  MoreHorizontal,
  PanelLeft,
  PenTool,
  Play,
  Search,
  Trophy,
  X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type {
  CertificateItem,
  CodeExampleItem,
  Course,
  CourseTopic,
  ExerciseItem,
  LessonContentBlock,
  LessonFull,
  LessonOutlineItem,
  Technology,
  TechnologyDetailResponse,
} from '../types';
import { ExerciseEngine } from './ExerciseEngine';
import { LessonContentRenderer } from './LessonContentRenderer';
import { NumberedCourseOutline } from './NumberedCourseOutline';
import { PracticeWorkspacePane, type PracticeTab, type SeededPracticeSnippet } from './PracticeWorkspacePane';
import { TechGlyph } from './TechGlyph';
import { TechnologyBar } from './TechnologyBar';

interface TechnologyPageViewProps {
  techSlug: string;
  allTechnologies: Technology[];
  isAuthenticated: boolean;
  onSelectTechnology: (slug: string) => void;
  onOpenCourse: (courseSlug: string, lessonId?: string) => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
  onOpenAiTutor?: (techName: string) => void;
  onExploreAvailableCourses?: () => void;
  onBackHome?: () => void;
  showBar?: boolean;
  inAppShell?: boolean;
}

type DrawerTab = 'reference' | 'examples' | 'challenges' | 'projects' | 'study_plan';
type MobileSurfaceTab = 'lesson' | PracticeTab;
type StageMode = 'overview' | 'lesson';

interface HydratedCourseItem extends Course {
  modules: Array<{
    id: string;
    title: string;
    topic: string;
    topics?: CourseTopic[];
    lessons: LessonOutlineItem[];
  }>;
  assessments: Array<{
    id: string;
    title: string;
    type: string;
    mode: string;
    time_limit_sec: number;
    xp_reward: number;
    passing_score_pct?: number;
    max_attempts?: number;
  }>;
}

const FALLBACK_SNIPPETS: Record<string, { language: string; code: string }> = {
  html: {
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>My First HTML Page</title>
</head>
<body>
  <h1>My First Heading</h1>
  <p>My first paragraph.</p>
</body>
</html>`,
  },
  css: {
    language: 'css',
    code: `body {
  font-family: system-ui, sans-serif;
  padding: 24px;
  background: #f8fafc;
}
.card {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px;
}`,
  },
  javascript: {
    language: 'javascript',
    code: `const topics = ['Variables', 'Functions', 'Arrays'];
topics.forEach((topic, index) => {
  console.log(\`\${index + 1}. Learning \${topic}\`);
});`,
  },
  python: {
    language: 'python',
    code: `def greet_learner(name: str) -> str:
    return f"Welcome to Python, {name}!"

print(greet_learner("Developer"))`,
  },
  sql: {
    language: 'sql',
    code: `SELECT d.name AS department, COUNT(e.id) AS staff
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id
ORDER BY staff DESC;`,
  },
  kubernetes: {
    language: 'yaml',
    code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app`,
  },
  cybersecurity: {
    language: 'yaml',
    code: `# HTTP Defensive Headers Checklist
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff`,
  },
  figma: {
    language: 'css',
    code: `:root {
  --ink-primary: #0F172A;
  --surface-page: #F8FAFC;
  --accent-brand: #0A84FF;
}`,
  },
};

const SQL_SANDBOX_TABLES = [
  { name: 'departments', cols: 'id, name, budget', sample: 'SELECT id, name, budget FROM departments ORDER BY budget DESC;' },
  { name: 'employees', cols: 'id, name, department_id, role, salary', sample: 'SELECT name, role, salary FROM employees ORDER BY salary DESC;' },
  { name: 'courses', cols: 'id, title, category, difficulty, hours', sample: 'SELECT title, difficulty, hours FROM courses;' },
  { name: 'orders', cols: 'id, learner_name, course_id, amount_usd, status', sample: 'SELECT status, COUNT(*) AS orders_count, SUM(amount_usd) AS revenue FROM orders GROUP BY status;' },
];

export function TechnologyPageView({
  techSlug,
  allTechnologies,
  isAuthenticated,
  onSelectTechnology,
  onOpenCourse,
  onOpenAuth,
  onOpenAiTutor,
  onExploreAvailableCourses,
  onBackHome,
  showBar = true,
  inAppShell = false,
}: TechnologyPageViewProps) {
  const [data, setData] = useState<TechnologyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected course & inline lesson studio state
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);
  const [modulesState, setModulesState] = useState<HydratedCourseItem['modules']>([]);
  const [stageMode, setStageMode] = useState<StageMode>('lesson');
  const [activeLesson, setActiveLesson] = useState<LessonFull | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonBlocks, setLessonBlocks] = useState<LessonContentBlock[]>([]);
  const [codeExamples, setCodeExamples] = useState<CodeExampleItem[]>([]);
  const [lessonExercises, setLessonExercises] = useState<ExerciseItem[]>([]);
  const [lessonAssessments, setLessonAssessments] = useState<Array<{ id: string; title: string; type: string; xp_reward: number }>>([]);
  const [lessonProgress, setLessonProgress] = useState<{ completed: boolean; bookmarked: boolean; status?: string }>({
    completed: false,
    bookmarked: false,
    status: 'not_started',
  });
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [certStatus, setCertStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Unified 3-Area Chrome controls
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [outlineCompact, setOutlineCompact] = useState(false);
  const [showPracticePane, setShowPracticePane] = useState(true);
  const [practiceExpanded, setPracticeExpanded] = useState(false);
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('code');
  const [mobileSurfaceTab, setMobileSurfaceTab] = useState<MobileSurfaceTab>('lesson');
  const [seededPracticeSnippet, setSeededPracticeSnippet] = useState<SeededPracticeSnippet | null>(null);
  const practiceSectionRef = useRef<HTMLDivElement | null>(null);

  // Secondary Resources Slide-Over Drawer
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('reference');
  const [refSearch, setRefSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [expandedInterviewIds, setExpandedInterviewIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreMenuOpen]);

  // Interactive PX <-> EM Converter inside Quick Reference
  const [baseFontPx, setBaseFontPx] = useState('16');
  const [pxInput, setPxInput] = useState('24');
  const [emInput, setEmInput] = useState('1.5');

  const coursesList = useMemo<HydratedCourseItem[]>(() => {
    if (!data) return [];
    const list = (data.hydratedCourses && data.hydratedCourses.length > 0 ? data.hydratedCourses : data.courses) as HydratedCourseItem[];
    return list || [];
  }, [data]);

  const activeCourse = coursesList[selectedCourseIdx] || coursesList[0] || null;

  // Build fallback synthetic Course object for 0-course roadmap technologies (e.g., Kubernetes)
  const workspaceCourse = useMemo<Course>(() => {
    if (activeCourse) return activeCourse;
    const tech = data?.technology;
    return {
      id: `tech_${tech?.slug || techSlug}`,
      category_id: tech?.category_id || '',
      technology_id: tech?.id || '',
      title: tech ? `${tech.name} Practice` : `${techSlug.toUpperCase()} Practice`,
      slug: tech?.slug || techSlug,
      description: tech?.description || '',
      difficulty: tech?.difficulty || 'Beginner',
      estimated_hours: 4,
      thumbnail_url: '',
      status: 'draft',
      instructor_name: 'BrainCode Academy',
      prerequisites: data?.prerequisites || [],
      objectives: data?.objectives || [],
      enrolled: false,
      total_lessons: 0,
      completed_lessons: 0,
      free_lessons: 0,
      technology_name: tech?.name || techSlug,
      technology_slug: tech?.slug || techSlug,
      category_name: tech?.category_name || '',
      category_slug: tech?.category_slug || '',
    };
  }, [activeCourse, data, techSlug]);

  const allLessons = useMemo(() => modulesState.flatMap((m) => m.lessons), [modulesState]);

  const completedCount = useMemo(
    () => allLessons.filter((l) => Boolean(l.completed)).length,
    [allLessons]
  );

  const inProgressCount = useMemo(
    () => allLessons.filter((l) => !l.completed && l.progress_status === 'in_progress').length,
    [allLessons]
  );

  const currentIdx = useMemo(
    () => (activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1),
    [allLessons, activeLesson]
  );

  const prevLessonItem = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLessonItem = currentIdx >= 0 && currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const openLessonInline = async (lessonId: string, courseModules?: HydratedCourseItem['modules']) => {
    setLessonLoading(true);
    setLockedMessage(null);
    setCompletionError(null);
    setJustCompletedId(null);
    setStageMode('lesson');
    setMobileSurfaceTab('lesson');
    try {
      const res = await api.get<{
        lesson: LessonFull;
        blocks?: LessonContentBlock[];
        codeExamples?: CodeExampleItem[];
        exercises?: ExerciseItem[];
        lessonAssessments?: Array<{ id: string; title: string; type: string; xp_reward: number }>;
        progress: { completed: boolean; bookmarked: boolean; status?: string };
      }>(`/lessons/${lessonId}`);
      setActiveLesson(res.lesson);
      setLessonBlocks(res.blocks || []);
      setCodeExamples(res.codeExamples || []);
      setLessonExercises(res.exercises || []);
      setLessonAssessments(res.lessonAssessments || []);
      setLessonProgress({
        completed: Boolean(res.progress?.completed),
        bookmarked: Boolean(res.progress?.bookmarked),
        status: res.progress?.status || (res.progress?.completed ? 'completed' : 'not_started'),
      });
      if (isAuthenticated) {
        try {
          const openRes = await api.post<{
            ok: boolean;
            progress: { completed: boolean; bookmarked: boolean; status: 'completed' | 'in_progress' | 'not_started' };
          }>(`/lessons/${lessonId}/open`, {});
          const nextStatus: 'completed' | 'in_progress' | 'not_started' =
            openRes.progress?.status || (res.progress?.completed ? 'completed' : 'in_progress');
          setLessonProgress((prev) => ({
            ...prev,
            completed: Boolean(openRes.progress?.completed ?? prev.completed),
            status: nextStatus,
          }));
          setModulesState((prev) => {
            const base = courseModules || prev;
            return base.map((mod) => ({
              ...mod,
              lessons: mod.lessons.map((l) =>
                l.id === lessonId && !l.completed ? { ...l, progress_status: nextStatus } : l
              ),
            }));
          });
        } catch {
          // Keep read-only state if open tracking fails silently
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setLockedMessage(err.message);
      } else {
        setLockedMessage(err instanceof ApiError ? err.message : 'Unable to open this lesson right now.');
      }
    } finally {
      setLessonLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    window.scrollTo({ top: 0 });
    setLoading(true);
    setError(null);
    setSelectedCourseIdx(0);
    setActiveLesson(null);
    setLockedMessage(null);
    setResourcesOpen(false);
    setTopicSearch('');
    setRefSearch('');
    setCertStatus(null);
    setJustCompletedId(null);

    api
      .get<TechnologyDetailResponse>(`/technologies/${techSlug}`)
      .then((res) => {
        if (!active) return;
        setData(res);
        const list = (res.hydratedCourses && res.hydratedCourses.length > 0 ? res.hydratedCourses : res.courses) as HydratedCourseItem[];
        const primary = list?.[0];
        if (primary && primary.modules?.length > 0) {
          setModulesState(primary.modules);
          const flat = primary.modules.flatMap((m) => m.lessons);
          const initialTarget =
            flat.find((l) => !l.completed && l.progress_status === 'in_progress') ||
            flat.find((l) => l.access_tier === 'free') ||
            flat[0];
          if (initialTarget) {
            void openLessonInline(initialTarget.id, primary.modules);
          } else {
            setStageMode('overview');
          }
        } else {
          setModulesState([]);
          setStageMode('overview');
        }

        const starter =
          res.freeSample?.code_example ||
          FALLBACK_SNIPPETS[res.technology.slug]?.code ||
          res.capabilityProfile?.starterFiles?.[0]?.code ||
          '';
        if (starter) {
          setSeededPracticeSnippet({
            code: starter,
            language:
              res.freeSample?.language ||
              FALLBACK_SNIPPETS[res.technology.slug]?.language ||
              res.capabilityProfile?.starterFiles?.[0]?.language ||
              res.technology.slug,
            title: res.freeSample?.title || `${res.technology.name} Starter`,
            nonce: Date.now(),
          });
        }
      })
      .catch((e) => {
        if (!active) return;
        setError(e instanceof ApiError ? e.message : 'Unable to load technology.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [techSlug, isAuthenticated]);

  useEffect(() => {
    if (!data?.technology?.name) return;
    const prevTitle = document.title;
    document.title = `Learn ${data.technology.name} | BrainCode Academy`;
    return () => {
      document.title = prevTitle;
    };
  }, [data?.technology?.name]);

  const handleSwitchCourse = (idx: number) => {
    setSelectedCourseIdx(idx);
    const chosen = coursesList[idx];
    if (!chosen) return;
    setModulesState(chosen.modules || []);
    const flat = (chosen.modules || []).flatMap((m) => m.lessons);
    const first = flat.find((l) => l.access_tier === 'free') || flat[0];
    if (first) void openLessonInline(first.id, chosen.modules);
    else setStageMode('overview');
  };

  const handleMarkComplete = async () => {
    if (!activeLesson) return;
    if (!isAuthenticated) {
      onOpenAuth('signup');
      return;
    }
    setCompletionError(null);
    try {
      await api.post(`/lessons/${activeLesson.id}/complete`, {});
      setLessonProgress((prev) => ({ ...prev, completed: true, status: 'completed' }));
      setModulesState((prev) =>
        prev.map((mod) => ({
          ...mod,
          lessons: mod.lessons.map((l) =>
            l.id === activeLesson.id ? { ...l, completed: true, progress_status: 'completed' } : l
          ),
        }))
      );
      setJustCompletedId(activeLesson.id);
    } catch (err) {
      setCompletionError(err instanceof ApiError ? err.message : 'Could not save completion.');
    }
  };

  const handleBookmarkLesson = async () => {
    if (!activeLesson) return;
    if (!isAuthenticated) {
      onOpenAuth('signup');
      return;
    }
    try {
      const res = await api.post<{ bookmarked: boolean }>(`/lessons/${activeLesson.id}/bookmark`, {});
      setLessonProgress((prev) => ({ ...prev, bookmarked: res.bookmarked }));
    } catch {
      // ignore bookmark error
    }
  };

  const handleDownloadNotes = () => {
    if (!activeLesson) return;
    const text = `# ${activeLesson.title}\n\n${activeLesson.summary}\n\n${activeLesson.content_markdown || ''}\n\n## Code Example\n\`\`\`${activeLesson.language}\n${activeLesson.code_example || ''}\n\`\`\`\n`;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLesson.slug || 'lesson'}-notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadIntoWorkspace = (code: string, lang?: string, title?: string, autoPreview = false) => {
    setSeededPracticeSnippet({
      code,
      language: lang || activeLesson?.language || data?.technology.slug || 'html',
      title: title || activeLesson?.title || `${data?.technology.name || ''} Practice`,
      nonce: Date.now(),
    });
    setShowPracticePane(true);
    setPracticeTab(autoPreview ? 'preview' : 'code');
    setMobileSurfaceTab(autoPreview ? 'preview' : 'code');
    setResourcesOpen(false);
    window.setTimeout(() => {
      practiceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleClaimCertificate = async (courseId: string) => {
    if (!isAuthenticated) {
      onOpenAuth('signup');
      return;
    }
    try {
      const res = await api.post<{ certificate: CertificateItem }>(`/certificates/claim/${courseId}`, {});
      setCertStatus({ ok: true, text: `Issued certificate ${res.certificate.certificate_code}` });
    } catch (err) {
      setCertStatus({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Complete all lessons to claim your certificate.',
      });
    }
  };

  const handleBaseFontChange = (nextVal: string) => {
    setBaseFontPx(nextVal);
    const base = parseFloat(nextVal);
    const px = parseFloat(pxInput);
    if (Number.isFinite(base) && base > 0 && Number.isFinite(px)) {
      setEmInput(Number((px / base).toFixed(4)).toString());
    }
  };

  const handlePxChange = (nextVal: string) => {
    setPxInput(nextVal);
    const base = parseFloat(baseFontPx) || 16;
    const px = parseFloat(nextVal);
    if (Number.isFinite(px) && base > 0) {
      setEmInput(Number((px / base).toFixed(4)).toString());
    }
  };

  const handleEmChange = (nextVal: string) => {
    setEmInput(nextVal);
    const base = parseFloat(baseFontPx) || 16;
    const em = parseFloat(nextVal);
    if (Number.isFinite(em) && base > 0) {
      setPxInput(Number((em * base).toFixed(2)).toString());
    }
  };

  const filteredReferences = useMemo(() => {
    const refs = data?.learningCentre?.references || [];
    const q = refSearch.trim().toLowerCase();
    if (!q) return refs;
    return refs
      .map((tbl) => ({
        ...tbl,
        rows: tbl.rows.filter(
          (r) =>
            r.symbol.toLowerCase().includes(q) ||
            r.syntax.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
        ),
      }))
      .filter((tbl) => tbl.rows.length > 0);
  }, [data?.learningCentre?.references, refSearch]);

  const topicSearchResults = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return [];
    const results: Array<{ seq: string; lesson: LessonOutlineItem; moduleTitle: string }> = [];
    let seq = 0;
    for (const mod of modulesState) {
      for (const les of mod.lessons) {
        seq += 1;
        if (
          les.title.toLowerCase().includes(q) ||
          (les.topic_name || '').toLowerCase().includes(q) ||
          mod.title.toLowerCase().includes(q)
        ) {
          results.push({ seq: String(seq).padStart(2, '0'), lesson: les, moduleTitle: mod.title });
        }
      }
    }
    return results;
  }, [modulesState, topicSearch]);

  const learningStatus =
    data?.technology.learning_status ||
    (coursesList.length > 0 ? 'available' : data?.technology.content_status || 'coming_soon');

  const centre = data?.learningCentre;
  const hasPxEm = centre?.interactiveTools?.includes('px_em_converter');
  const hasSqlSchema = centre?.interactiveTools?.includes('sql_schema_viewer');

  const hasTechBar = showBar && allTechnologies.length > 0;
  const activeSeqStr = currentIdx >= 0 ? String(currentIdx + 1).padStart(2, '0') : '01';
  const totalSeqStr = String(Math.max(1, allLessons.length)).padStart(2, '0');

  const stickyOutlineClass = !showBar
    ? inAppShell
      ? 'lg:top-16 lg:h-[calc(100vh-4rem)]'
      : 'lg:top-0 lg:h-screen'
    : !hasTechBar
      ? inAppShell
        ? 'lg:top-[120px] lg:h-[calc(100vh-120px)]'
        : 'lg:top-[56px] lg:h-[calc(100vh-56px)]'
      : inAppShell
        ? 'lg:top-[166px] lg:h-[calc(100vh-166px)]'
        : 'lg:top-[102px] lg:h-[calc(100vh-102px)]';

  return (
    <div
      data-testid="unified-tutorial-studio"
      className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col"
    >
      {/* AREA 1: Top Navigation Header */}
      {showBar && (
        <header
          data-testid="studio-top-header"
          className={`sticky ${inAppShell ? 'top-16' : 'top-0'} z-30 bg-[var(--bg-surface)]/95 backdrop-blur-md`}
        >
          <div className="border-b border-[var(--border-default)]">
            <div className="max-w-[1600px] mx-auto px-2.5 sm:px-5 h-14 flex items-center justify-between gap-2 sm:gap-3">
              {/* Left: Back + Active Technology Title */}
              <div className="flex items-center gap-2 min-w-0">
                {onBackHome && (
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="bc-btn-secondary !h-9 lg:!h-8 !px-2.5 text-xs whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isAuthenticated ? 'All Courses' : 'Directory'}</span>
                  </button>
                )}

                {data?.technology && (
                  <div className="flex items-center gap-2 min-w-0">
                    <TechGlyph
                      slug={data.technology.slug}
                      name={data.technology.name}
                      symbol={data.technology.icon_symbol}
                      brandColor={data.technology.brand_color}
                      size="sm"
                    />
                    <h1 className="text-sm sm:text-base font-bold tracking-tight truncate">
                      Learn {data.technology.name}
                    </h1>
                    {stageMode === 'lesson' && activeLesson && allLessons.length > 0 && (
                      <span className="hidden sm:inline text-xs font-mono tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                        · Lesson {activeSeqStr} / {totalSeqStr}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Clean Primary Controls (Progress, Outline, Resources, More, Auth) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {allLessons.length > 0 && isAuthenticated && (
                  <div
                    data-testid="studio-progress-pill"
                    className="hidden md:flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium text-[var(--text-secondary)] tabular-nums whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0" />
                    <span>
                      Progress: <strong className="font-semibold text-[var(--text-primary)]">{completedCount}/{allLessons.length}</strong>
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  data-testid="toggle-outline-sidebar-btn"
                  aria-expanded={showSidebar}
                  aria-label={showSidebar ? 'Collapse curriculum sidebar' : 'Expand curriculum sidebar'}
                  onClick={() => {
                    if (window.innerWidth < 1024) setMobileOutlineOpen(true);
                    else setShowSidebar((v) => !v);
                  }}
                  className={`h-9 lg:h-8 px-2 sm:px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    showSidebar
                      ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-soft)] text-[var(--accent-text)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <PanelLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Outline</span>
                </button>

                {centre && (
                  <button
                    type="button"
                    data-testid="open-resources-drawer-btn"
                    onClick={() => setResourcesOpen(true)}
                    className="bc-btn-secondary !h-9 lg:!h-8 !px-2 sm:!px-3 text-xs whitespace-nowrap"
                  >
                    <BookMarked className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span className="hidden xs:inline sm:inline">Resources</span>
                  </button>
                )}

                {/* Secondary Actions Grouped Cleanly Under "More" */}
                <div ref={moreMenuRef} className="relative">
                  <button
                    type="button"
                    data-testid="studio-more-menu-btn"
                    aria-expanded={moreMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setMoreMenuOpen((v) => !v)}
                    className="bc-btn-secondary !h-9 lg:!h-8 !px-2 sm:!px-2.5 text-xs whitespace-nowrap"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">More</span>
                  </button>

                  {moreMenuOpen && (
                    <div
                      role="menu"
                      data-testid="studio-more-menu-popover"
                      className="absolute right-0 top-10 z-50 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-popover)] p-2.5 space-y-2"
                    >
                      {allLessons.length > 0 && (
                        <div className="space-y-1">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                            <input
                              type="search"
                              value={topicSearch}
                              onChange={(e) => setTopicSearch(e.target.value)}
                              placeholder="Jump to lesson..."
                              aria-label={`Search ${data?.technology.name || ''} lessons`}
                              className="bc-input w-full !h-8 pl-8 pr-2.5 text-xs"
                            />
                          </div>
                          {topicSearch.trim() && (
                            <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-1 space-y-0.5">
                              {topicSearchResults.length === 0 ? (
                                <p className="text-[11px] text-[var(--text-muted)] p-2">No lessons match "{topicSearch}".</p>
                              ) : (
                                topicSearchResults.map((item) => (
                                  <button
                                    key={item.lesson.id}
                                    type="button"
                                    onClick={() => {
                                      void openLessonInline(item.lesson.id);
                                      setTopicSearch('');
                                      setMoreMenuOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--bg-subtle)] text-xs cursor-pointer"
                                  >
                                    <span className="font-mono text-[var(--accent-text)] mr-1.5">{item.seq}.</span>
                                    <span className="font-medium text-[var(--text-primary)]">{item.lesson.title}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-1 border-t border-[var(--border-subtle)] space-y-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowPracticePane((v) => !v);
                            setMobileSurfaceTab('code');
                            setMoreMenuOpen(false);
                          }}
                          className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center justify-between cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2">
                            <Code2 className="w-3.5 h-3.5 text-[var(--status-success)]" />
                            <span>{showPracticePane ? 'Hide Practice Panel' : 'Open Practice Panel'}</span>
                          </span>
                        </button>

                        {onOpenAiTutor && data?.technology && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              onOpenAiTutor(data.technology.name);
                            }}
                            className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                          >
                            <Bot className="w-3.5 h-3.5 text-[var(--status-warning)]" />
                            <span>Ask AI Tutor</span>
                          </button>
                        )}

                        {isAuthenticated && activeCourse && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              onOpenCourse(activeCourse.slug, activeLesson?.id);
                            }}
                            className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[var(--accent-text)] hover:bg-[var(--accent-soft)] flex items-center gap-2 cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Open Full Course Workspace</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!isAuthenticated && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenAuth('login')}
                      className="hidden sm:inline-flex bc-btn-secondary !h-8 !px-3 text-xs whitespace-nowrap"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAuth('signup')}
                      className="bc-btn-primary !h-9 lg:!h-8 !px-2.5 sm:!px-3 text-xs whitespace-nowrap"
                    >
                      Get Started
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <TechnologyBar
            technologies={allTechnologies}
            activeSlug={techSlug}
            onSelectTechnology={onSelectTechnology}
          />
        </header>
      )}

      {/* 3-Area Body: Left Curriculum Sidebar + Main Content Area */}
      <div className="flex-1 w-full flex flex-col">
        {loading ? (
          <div className="flex flex-1">
            <div className="hidden lg:block w-[300px] border-r border-[var(--border-default)] p-4 space-y-3">
              <div className="h-24 rounded-xl bg-[var(--bg-muted)] animate-pulse" />
              <div className="h-96 rounded-xl bg-[var(--bg-muted)] animate-pulse" />
            </div>
            <div className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-4">
              <div className="h-[520px] rounded-xl bg-[var(--bg-muted)] animate-pulse" />
            </div>
          </div>
        ) : error || !data ? (
          <div className="m-4 rounded-xl border-l-2 border-[var(--status-danger)] bg-[var(--status-danger-soft)] p-6 text-sm text-[var(--status-danger)] space-y-3">
            <p>{error || 'Technology not found.'}</p>
            {onBackHome && (
              <button
                type="button"
                onClick={onBackHome}
                className="bc-btn-primary text-xs"
              >
                Return to Directory
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-1 items-stretch relative">
            {/* AREA 2: Left-Aligned Independently Scrollable Curriculum Sidebar */}
            {coursesList.length > 0 && activeCourse ? (
              <NumberedCourseOutline
                course={activeCourse}
                modules={modulesState}
                assessments={activeCourse.assessments || []}
                assignmentsCount={data.assignmentCount || 0}
                projectTemplatesCount={data.projectTemplates?.length || 0}
                activeLessonId={activeLesson?.id}
                stageMode={stageMode}
                completedCount={completedCount}
                totalCount={allLessons.length}
                certStatus={certStatus}
                stickyClassName={stickyOutlineClass}
                desktopVisible={showSidebar}
                courseSelector={
                  coursesList.length > 1 ? (
                    <select
                      aria-label="Select course track"
                      value={selectedCourseIdx}
                      onChange={(e) => handleSwitchCourse(Number(e.target.value))}
                      className="bc-select w-full !h-9 px-2.5 text-xs font-semibold"
                    >
                      {coursesList.map((c, idx) => (
                        <option key={c.id} value={idx}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  ) : undefined
                }
                onSelectOverview={() => {
                  setStageMode('overview');
                  setMobileSurfaceTab('lesson');
                }}
                onSelectLesson={(lessonId) => {
                  void openLessonInline(lessonId);
                }}
                onSelectAssessment={() => {
                  if (!isAuthenticated) onOpenAuth('login');
                  else onOpenCourse(activeCourse.slug);
                }}
                onSelectAssignments={() => {
                  setDrawerTab('projects');
                  setResourcesOpen(true);
                }}
                onClaimCertificate={(cid) => void handleClaimCertificate(cid)}
                onEnroll={() => {
                  if (!isAuthenticated) onOpenAuth('signup');
                  else onOpenCourse(activeCourse.slug);
                }}
                compact={outlineCompact}
                onToggleCompact={() => setOutlineCompact((c) => !c)}
                mobileOpen={mobileOutlineOpen}
                onCloseMobile={() => setMobileOutlineOpen(false)}
              />
            ) : (
              /* Roadmap Sidebar for In-Development Technologies (e.g., Kubernetes) */
              <>
                <aside
                  data-testid="curriculum-sidebar"
                  aria-label="Roadmap curriculum outline"
                  className={`${
                    showSidebar ? 'hidden lg:flex lg:flex-col lg:w-[295px] xl:w-[315px] shrink-0' : 'hidden'
                  } border-r border-[var(--border-default)] bg-[var(--bg-surface)] p-4 space-y-4 lg:sticky overflow-y-auto overscroll-contain ${stickyOutlineClass}`}
                >
                  <div>
                    <p className="text-[11px] font-semibold text-[var(--status-warning)]">
                      {learningStatus === 'in_development' ? 'Content In Preparation' : 'Upcoming Course'}
                    </p>
                    <h2 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{data.technology.name} Roadmap</h2>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">
                      Structured lessons are being prepared. Inspect starter examples and the Quick Reference today.
                    </p>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg">
                    {[
                      { num: '01.', label: `${data.technology.name} Foundations`, state: 'Overview' },
                      { num: '02.', label: 'Starter Practice Lab', state: 'Ready' },
                      { num: '03.', label: 'Guided Exercises & Quiz', state: 'In Preparation' },
                    ].map((step) => (
                      <div
                        key={step.num}
                        className="px-3 py-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="truncate font-medium text-[var(--text-primary)]">
                          <span className="font-mono text-[var(--text-muted)] mr-1.5">{step.num}</span>
                          {step.label}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] shrink-0">{step.state}</span>
                      </div>
                    ))}
                  </div>

                  {centre && (
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerTab('reference');
                        setResourcesOpen(true);
                      }}
                      className="bc-btn-secondary w-full !h-9 text-xs !border-[var(--accent-primary)]/40 !text-[var(--accent-text)]"
                    >
                      Open Quick Reference
                    </button>
                  )}
                </aside>

                {mobileOutlineOpen && (
                  <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOutlineOpen(false)} />
                    <aside className="relative z-10 w-[85vw] max-w-sm h-full bg-[var(--bg-surface)] p-5 space-y-4 overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">{data.technology.name} Roadmap</h2>
                        <button
                          type="button"
                          aria-label="Close course outline"
                          onClick={() => setMobileOutlineOpen(false)}
                          className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Full {data.technology.name} lessons are currently in preparation. Explore the starter example in Code or open Resources for the Quick Reference.
                      </p>
                    </aside>
                  </div>
                )}
              </>
            )}

            {/* AREA 3: Main Content Area (Spacious Reading Canvas + Docked Practice Lab) */}
            <div
              data-testid="main-content-area"
              className="flex-1 min-w-0 px-3 sm:px-6 lg:px-10 py-4 sm:py-7"
            >
              <div
                className={`${
                  practiceExpanded && showPracticePane ? 'max-w-6xl' : 'max-w-4xl'
                } mx-auto space-y-5 sm:space-y-6 transition-[max-width] duration-200`}
              >
                {/* Mobile / Tablet Segmented Workspace Switcher (< lg) */}
                <div
                  role="tablist"
                  aria-label="Mobile learning workspace switcher"
                  className="lg:hidden grid grid-cols-4 gap-1 p-1 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)]"
                >
                  {(
                    [
                      { id: 'lesson', label: 'LESSON', icon: BookOpen },
                      { id: 'code', label: 'CODE', icon: Code2 },
                      { id: 'preview', label: 'PREVIEW', icon: Eye },
                      { id: 'whiteboard', label: 'BOARD', icon: PenTool },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon;
                    const active = mobileSurfaceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        data-testid={`mobile-tab-${tab.id}`}
                        onClick={() => {
                          setMobileSurfaceTab(tab.id);
                          if (tab.id !== 'lesson') setPracticeTab(tab.id);
                        }}
                        className={`min-h-[44px] px-1.5 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[var(--bg-surface)] text-[var(--accent-text)] shadow-[var(--shadow-sm)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Lesson / Overview Stage */}
                <main
                  aria-label="Primary lesson content"
                  className={`min-w-0 space-y-6 ${mobileSurfaceTab === 'lesson' ? 'block' : 'hidden lg:block'}`}
                >
                {coursesList.length === 0 ? (
                  /* Honest In-Development Technology Stage (zero fake lessons!) */
                  <article className="bc-panel p-5 sm:p-8 space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-default)] pb-5">
                      <div className="space-y-1 min-w-0">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--status-warning)]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{learningStatus === 'in_development' ? 'Course Content In Preparation' : 'Coming Soon'}</span>
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                          {data.technology.name} Tutorial
                        </h2>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                          {data.technology.overview_markdown || data.technology.description}
                        </p>
                      </div>
                      {onExploreAvailableCourses && (
                        <button
                          type="button"
                          onClick={onExploreAvailableCourses}
                          className="bc-btn-primary !h-9 text-xs whitespace-nowrap"
                        >
                          Browse Ready Courses
                        </button>
                      )}
                    </div>

                    <div className="rounded-r-lg border-l-2 border-[var(--status-warning)] bg-[var(--status-warning-soft)] p-4 text-xs text-[var(--text-primary)] space-y-1.5">
                      <p className="font-bold">Transparent Status Notice</p>
                      <p className="leading-relaxed text-[var(--text-secondary)]">
                        We do not publish empty placeholder lessons. Full step-by-step {data.technology.name} lessons, exercises, and quizzes are currently being written. In the meantime, you can inspect the starter snippet in the Practice panel, read the Quick Reference in Resources, or explore a related technology.
                      </p>
                    </div>

                    {data.objectives && data.objectives.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Planned Learning Outcomes</h3>
                        <ul className="space-y-1.5 text-sm text-[var(--text-secondary)] list-disc pl-5">
                          {data.objectives.map((obj, idx) => (
                            <li key={idx}>{obj}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {data.relatedTechnologies && data.relatedTechnologies.length > 0 && (
                      <div className="pt-4 border-t border-[var(--border-default)] space-y-3">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Related Technologies Ready to Explore</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {data.relatedTechnologies.slice(0, 4).map((rel) => (
                            <button
                              key={rel.id}
                              type="button"
                              onClick={() => onSelectTechnology(rel.slug)}
                              className="p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-primary)] text-left flex items-center gap-3 cursor-pointer"
                            >
                              <TechGlyph
                                slug={rel.slug}
                                name={rel.name}
                                symbol={rel.icon_symbol}
                                brandColor={rel.brand_color}
                                size="sm"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-[var(--text-primary)] truncate">{rel.name}</p>
                                <p className="text-[11px] text-[var(--text-muted)] truncate">
                                  {Number(rel.course_count || 0) > 0
                                    ? `${rel.course_count} published course`
                                    : 'In preparation'}
                                </p>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ) : lockedMessage ? (
                  <div className="bc-panel p-6 sm:p-8 text-center space-y-4">
                    <Lock className="w-9 h-9 text-[var(--status-warning)] mx-auto" />
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Pro Lesson</h2>
                    <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">{lockedMessage}</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => onOpenAuth('signup')}
                        className="bc-btn-primary text-xs"
                      >
                        {isAuthenticated ? 'Upgrade Plan' : 'Sign Up / Sign In'}
                      </button>
                      {nextLessonItem && (
                        <button
                          type="button"
                          onClick={() => void openLessonInline(nextLessonItem.id)}
                          className="bc-btn-secondary text-xs"
                        >
                          Skip to Next Lesson
                        </button>
                      )}
                    </div>
                  </div>
                ) : stageMode === 'overview' && activeCourse ? (
                  <article className="bc-panel p-5 sm:p-8 space-y-6">
                    <div>
                      <p className="text-xs font-semibold text-[var(--accent-text)]">
                        Course Overview · {activeCourse.difficulty} · {activeCourse.estimated_hours}h
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1">{activeCourse.title}</h2>
                      <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                        {activeCourse.description}
                      </p>
                    </div>

                    {data.prerequisites && data.prerequisites.length > 0 && (
                      <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Before You Start</h3>
                        <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                          {data.prerequisites.map((pre, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <ListChecks className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                              <span>{pre}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(activeCourse.objectives?.length || data.objectives?.length) ? (
                      <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">What You Will Learn</h3>
                        <ul className="space-y-1.5 text-sm text-[var(--text-secondary)]">
                          {(activeCourse.objectives?.length ? activeCourse.objectives : data.objectives || []).map((obj, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {allLessons[0] && (
                      <div className="pt-4 border-t border-[var(--border-default)]">
                        <button
                          type="button"
                          onClick={() => void openLessonInline(allLessons[0].id)}
                          className="bc-btn-primary text-xs"
                        >
                          <span>Start Learning Lesson 01</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </article>
                ) : lessonLoading || !activeLesson ? (
                  <div className="h-[520px] rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 animate-pulse" />
                ) : (
                  <article
                    data-testid="tutorial-lesson-article"
                    className="bc-panel p-4 sm:p-8 lg:p-10 space-y-6"
                  >
                    {/* Header & Top Navigation (‹ Previous / Next › never locked!) */}
                    <header className="space-y-4 border-b border-[var(--border-default)] pb-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span className="font-semibold text-[var(--accent-text)] tabular-nums">
                              Lesson {String(currentIdx + 1).padStart(2, '0')}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{activeLesson.duration_minutes} min</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{activeLesson.access_tier === 'free' ? 'Free lesson' : 'Pro lesson'}</span>
                            {lessonProgress.completed ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[var(--status-success)] font-semibold">Completed</span>
                              </>
                            ) : lessonProgress.status === 'in_progress' ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-[var(--accent-text)] font-semibold">In Progress</span>
                              </>
                            ) : null}
                          </div>
                          <h2 className="text-2xl sm:text-[32px] font-bold tracking-tight leading-tight text-[var(--text-primary)]">
                            {activeLesson.title}
                          </h2>
                          {activeLesson.summary && (
                            <p className="text-[15.5px] sm:text-base text-[var(--text-secondary)] leading-relaxed pt-0.5 max-w-[70ch]">
                              {activeLesson.summary}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={handleBookmarkLesson}
                          title={lessonProgress.bookmarked ? 'Bookmarked' : 'Bookmark this lesson'}
                          aria-label={lessonProgress.bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
                          className={`h-9 w-9 rounded-lg border inline-flex items-center justify-center shrink-0 cursor-pointer ${
                            lessonProgress.bookmarked
                              ? 'border-[var(--status-success)] bg-[var(--status-success-soft)] text-[var(--status-success)]'
                              : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--accent-primary)]'
                          }`}
                        >
                          <BookMarked className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Top ‹ Previous / Next › Bar */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          data-testid="lesson-prev-top-btn"
                          disabled={!prevLessonItem}
                          onClick={() => prevLessonItem && void openLessonInline(prevLessonItem.id)}
                          className="bc-btn-secondary !h-9 !px-3.5 text-xs disabled:opacity-40 whitespace-nowrap"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Previous</span>
                        </button>

                        <button
                          type="button"
                          data-testid="lesson-next-top-btn"
                          disabled={!nextLessonItem}
                          onClick={() => nextLessonItem && void openLessonInline(nextLessonItem.id)}
                          className="h-9 px-4 rounded-lg bg-[var(--status-success)] hover:opacity-95 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </header>

                    {/* What You Will Learn — Clean Hairline-Divided Editorial Strip */}
                    {((activeLesson.objectives && activeLesson.objectives.length > 0) ||
                      (activeLesson.prerequisites && activeLesson.prerequisites.length > 0)) && (
                      <section className="border-b border-[var(--border-subtle)] pb-5 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                        {activeLesson.objectives && activeLesson.objectives.length > 0 && (
                          <div>
                            <p className="font-bold uppercase tracking-wider text-[11px] text-[var(--text-muted)] mb-2">
                              What You Will Learn
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)] leading-relaxed">
                              {activeLesson.objectives.map((obj) => (
                                <li key={obj}>{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {activeLesson.prerequisites && activeLesson.prerequisites.length > 0 && (
                          <div>
                            <p className="font-bold uppercase tracking-wider text-[11px] text-[var(--text-muted)] mb-2">
                              Before You Start
                            </p>
                            <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)] leading-relaxed">
                              {activeLesson.prerequisites.map((pre) => (
                                <li key={pre}>{pre}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </section>
                    )}

                    {/* Main Teaching Content & Try-It-Yourself Examples */}
                    <LessonContentRenderer
                      blocks={lessonBlocks}
                      codeExamples={codeExamples}
                      fallbackMarkdown={activeLesson.content_markdown}
                      fallbackCode={activeLesson.code_example}
                      fallbackLanguage={activeLesson.language}
                      workspaceActionLabel="Try It Yourself"
                      onOpenInWorkspace={(code, lang, title) =>
                        handleLoadIntoWorkspace(
                          code || activeLesson.starter_code || activeLesson.code_example || '',
                          lang,
                          title,
                          false
                        )
                      }
                    />

                    {/* Visual / Common Mistakes / Best Practices — Unboxed Editorial Sections */}
                    {(activeLesson.visual_explanation_markdown ||
                      (activeLesson.common_mistakes && activeLesson.common_mistakes.length > 0) ||
                      (activeLesson.best_practices && activeLesson.best_practices.length > 0)) && (
                      <section className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                        {activeLesson.visual_explanation_markdown && (
                          <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                              How It Works Visually
                            </p>
                            <pre className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 font-mono text-xs text-[var(--text-primary)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {activeLesson.visual_explanation_markdown}
                            </pre>
                          </div>
                        )}

                        {((activeLesson.common_mistakes && activeLesson.common_mistakes.length > 0) ||
                          (activeLesson.best_practices && activeLesson.best_practices.length > 0)) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            {activeLesson.common_mistakes && activeLesson.common_mistakes.length > 0 && (
                              <div className="rounded-r-lg border-l-2 border-[var(--status-warning)] bg-[var(--status-warning-soft)] p-4 space-y-1.5">
                                <p className="font-bold text-[var(--status-warning)]">Common Mistakes to Avoid</p>
                                <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                                  {activeLesson.common_mistakes.map((m, idx) => (
                                    <li key={idx}>{m}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {activeLesson.best_practices && activeLesson.best_practices.length > 0 && (
                              <div className="rounded-r-lg border-l-2 border-[var(--status-success)] bg-[var(--status-success-soft)] p-4 space-y-1.5">
                                <p className="font-bold text-[var(--status-success)]">Best Practices</p>
                                <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                                  {activeLesson.best_practices.map((bp, idx) => (
                                    <li key={idx}>{bp}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </section>
                    )}

                    {/* Knowledge Check / Practice Task */}
                    {lessonExercises.length > 0 ? (
                      <section className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Test Your Knowledge</h3>
                        <ExerciseEngine
                          exercises={lessonExercises}
                          onAskAi={
                            onOpenAiTutor
                              ? (_exId, snippet) => {
                                  if (snippet) handleLoadIntoWorkspace(snippet, activeLesson.language, activeLesson.title);
                                  onOpenAiTutor(`${data.technology.name}: ${activeLesson.title}`);
                                }
                              : undefined
                          }
                        />
                      </section>
                    ) : activeLesson.exercise_prompt ? (
                      <section className="bc-subtle-box p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">Practice Task</h3>
                          <button
                            type="button"
                            onClick={() =>
                              handleLoadIntoWorkspace(
                                activeLesson.starter_code || activeLesson.code_example || '',
                                activeLesson.language,
                                `${activeLesson.title} Practice`,
                                false
                              )
                            }
                            className="h-8 px-3 rounded-lg bg-[var(--status-success)] hover:opacity-95 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Open in Practice Editor &raquo;
                          </button>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)]">{activeLesson.exercise_prompt}</p>
                        {activeLesson.solution_hint && (
                          <details className="text-xs text-[var(--text-muted)]">
                            <summary className="cursor-pointer font-semibold">Show hint</summary>
                            <p className="mt-1.5 text-[var(--text-secondary)]">{activeLesson.solution_hint}</p>
                          </details>
                        )}
                      </section>
                    ) : null}

                    {/* Lesson Quiz Link */}
                    {lessonAssessments.length > 0 && activeCourse && (
                      <div className="p-4 rounded-r-lg border-l-2 border-[var(--accent-primary)] bg-[var(--accent-soft)] flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs">
                          <p className="font-bold text-[var(--accent-text)]">Quick Quiz</p>
                          <p className="text-[var(--text-secondary)]">{lessonAssessments[0].title}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => (isAuthenticated ? onOpenCourse(activeCourse.slug, activeLesson.id) : onOpenAuth('signup'))}
                          className="bc-btn-primary !h-9 text-xs whitespace-nowrap"
                        >
                          Take Quiz (+{lessonAssessments[0].xp_reward} XP)
                        </button>
                      </div>
                    )}

                    {/* Completion Banner */}
                    {justCompletedId === activeLesson.id && (
                      <div
                        data-testid="lesson-completion-banner"
                        className="rounded-r-lg border-l-2 border-[var(--status-success)] bg-[var(--status-success-soft)] p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-[var(--status-success)] flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Lesson {String(currentIdx + 1).padStart(2, '0')} marked as complete.</span>
                          </p>
                          <p className="text-[var(--text-secondary)]">
                            {nextLessonItem
                              ? `Up next: ${nextLessonItem.title}`
                              : 'You reached the final lesson! Open Resources or Workspace to review quizzes and certificate.'}
                          </p>
                        </div>
                        {nextLessonItem && (
                          <button
                            type="button"
                            onClick={() => void openLessonInline(nextLessonItem.id)}
                            className="h-9 px-4 rounded-lg bg-[var(--status-success)] hover:opacity-95 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                          >
                            <span>Continue to Next Lesson</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {completionError && (
                      <p className="text-xs text-[var(--status-danger)]">{completionError}</p>
                    )}

                    {/* Bottom Prev / Complete / Next Footer + What Comes Next */}
                    <footer className="pt-5 border-t border-[var(--border-default)] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            data-testid="lesson-prev-bottom-btn"
                            disabled={!prevLessonItem}
                            onClick={() => prevLessonItem && void openLessonInline(prevLessonItem.id)}
                            className="bc-btn-secondary !h-9 !px-3.5 text-xs disabled:opacity-40 whitespace-nowrap"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous</span>
                          </button>
                          <button
                            type="button"
                            data-testid="lesson-next-bottom-btn"
                            disabled={!nextLessonItem}
                            onClick={() => nextLessonItem && void openLessonInline(nextLessonItem.id)}
                            className="h-9 px-4 rounded-lg bg-[var(--status-success)] hover:opacity-95 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                          >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadNotes}
                            className="bc-btn-secondary !h-9 !px-3 text-xs whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Notes</span>
                          </button>

                          <button
                            type="button"
                            data-testid="mark-lesson-complete-btn"
                            onClick={() => void handleMarkComplete()}
                            className={`h-9 px-4 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              lessonProgress.completed
                                ? 'bg-[var(--status-success)] text-white'
                                : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                              {lessonProgress.completed
                                ? 'Completed'
                                : isAuthenticated
                                  ? 'Mark as Complete'
                                  : 'Sign In to Save Progress'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {nextLessonItem && (
                        <p className="text-xs text-[var(--text-muted)]">
                          <span className="font-semibold text-[var(--text-primary)]">What comes next:</span>{' '}
                          <button
                            type="button"
                            onClick={() => void openLessonInline(nextLessonItem.id)}
                            className="text-[var(--accent-text)] hover:underline font-medium cursor-pointer"
                          >
                            Lesson {String(currentIdx + 2).padStart(2, '0')}: {nextLessonItem.title}
                          </button>
                        </p>
                      )}
                    </footer>
                  </article>
                )}
                </main>

                {/* Integrated Practice Workspace Inside Area 3 */}
                {(showPracticePane || mobileSurfaceTab !== 'lesson') && (
                  <section
                    ref={practiceSectionRef}
                    aria-label="Interactive practice workspace"
                    className={`${
                      mobileSurfaceTab !== 'lesson'
                        ? 'block'
                        : showPracticePane
                          ? 'hidden lg:block'
                          : 'hidden'
                    }`}
                  >
                    <PracticeWorkspacePane
                      course={workspaceCourse}
                      activeLesson={activeLesson}
                      seededSnippet={seededPracticeSnippet}
                      activeTab={practiceTab}
                      onTabChange={(tab) => {
                        setPracticeTab(tab);
                        setMobileSurfaceTab(tab);
                      }}
                      isExpanded={practiceExpanded}
                      onToggleExpand={() => setPracticeExpanded((v) => !v)}
                      onClose={() => setShowPracticePane(false)}
                      onAskAiDebug={
                        onOpenAiTutor && data?.technology
                          ? () => onOpenAiTutor(data.technology.name)
                          : undefined
                      }
                    />
                  </section>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Organized Secondary Resources Slide-Over Drawer */}
      {resourcesOpen && data && centre && (
        <div
          data-testid="technology-resources-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={`${data.technology.name} Resources`}
          className="fixed inset-0 z-50 flex justify-end"
        >
          <div className="fixed inset-0 bg-black/55 backdrop-blur-[1px]" onClick={() => setResourcesOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-[var(--shadow-popover)] flex flex-col">
            {/* Drawer Header */}
            <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                  {data.technology.name} Resources
                </h2>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Quick Reference, Examples, Practice Challenges, Projects &amp; Quizzes
                </p>
              </div>
              <button
                type="button"
                aria-label="Close resources drawer"
                onClick={() => setResourcesOpen(false)}
                className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clean Single-Row Tab Bar */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: 'reference', label: 'Quick Reference', icon: FileText },
                  { id: 'examples', label: 'Examples', icon: Code2 },
                  { id: 'challenges', label: 'Quizzes & Challenges', icon: Trophy },
                  { id: 'projects', label: 'Projects', icon: FolderKanban },
                  { id: 'study_plan', label: 'Study Plan & Prep', icon: Compass },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = drawerTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`resources-tab-${tab.id}`}
                    onClick={() => setDrawerTab(tab.id)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {drawerTab === 'reference' && (
                <div className="space-y-5">
                  {hasPxEm && (
                    <div
                      data-testid="px-em-converter"
                      className="bc-subtle-box p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">PX ↔ EM Unit Converter</h3>
                          <p className="text-xs text-[var(--text-secondary)]">
                            Convert pixels to relative `em` units based on your root font size.
                          </p>
                        </div>
                        <span className="text-xs font-mono text-[var(--accent-text)] tabular-nums">
                          {pxInput || 0}px = {emInput || 0}em
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="block space-y-1 text-xs">
                          <span className="font-semibold text-[var(--text-secondary)]">Base Body Size (px)</span>
                          <input
                            type="number"
                            min="1"
                            value={baseFontPx}
                            onChange={(e) => handleBaseFontChange(e.target.value)}
                            className="bc-input w-full font-mono text-xs tabular-nums"
                          />
                        </label>
                        <label className="block space-y-1 text-xs">
                          <span className="font-semibold text-[var(--text-secondary)]">Pixels (px)</span>
                          <input
                            type="number"
                            step="0.5"
                            aria-label="Pixels value"
                            value={pxInput}
                            onChange={(e) => handlePxChange(e.target.value)}
                            className="bc-input w-full font-mono text-xs tabular-nums"
                          />
                        </label>
                        <label className="block space-y-1 text-xs">
                          <span className="font-semibold text-[var(--text-secondary)]">Relative Units (em)</span>
                          <input
                            type="number"
                            step="0.05"
                            aria-label="EM value"
                            value={emInput}
                            onChange={(e) => handleEmChange(e.target.value)}
                            className="bc-input w-full font-mono text-xs tabular-nums"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {hasSqlSchema && (
                    <div
                      data-testid="sql-sandbox-schema-viewer"
                      className="bc-subtle-box p-4 space-y-3"
                    >
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <Database className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>Practice Database Tables</span>
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)]">
                          Load any sample table query directly into the Practice Workspace.
                        </p>
                      </div>
                      <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)]">
                        {SQL_SANDBOX_TABLES.map((tbl) => (
                          <div
                            key={tbl.name}
                            className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-mono font-bold text-[var(--accent-text)]">{tbl.name}</p>
                              <p className="text-[11px] font-mono text-[var(--text-muted)] truncate">{tbl.cols}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLoadIntoWorkspace(tbl.sample, 'sql', `${tbl.name} query`, false)}
                              className="bc-btn-secondary !h-7 !px-2.5 text-[11px] whitespace-nowrap shrink-0"
                            >
                              Load Query
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={refSearch}
                      onChange={(e) => setRefSearch(e.target.value)}
                      placeholder={`Search ${data.technology.name} quick reference...`}
                      aria-label={`Search ${data.technology.name} reference tables`}
                      className="bc-input w-full pl-9 text-xs"
                    />
                  </div>

                  {filteredReferences.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                      No reference entries match "{refSearch}".
                    </p>
                  ) : (
                    filteredReferences.map((tbl) => (
                      <div key={tbl.id} className="bc-table-wrap">
                        <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                          <h4 className="text-sm font-bold text-[var(--text-primary)]">{tbl.title}</h4>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{tbl.description}</p>
                        </div>
                        <table className="bc-table">
                          <thead>
                            <tr>
                              <th>{tbl.columns[0]}</th>
                              <th>{tbl.columns[1]}</th>
                              <th>{tbl.columns[2]}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tbl.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-[var(--bg-subtle)]/60">
                                <td className="font-mono font-semibold text-[var(--accent-text)] whitespace-nowrap">
                                  {row.symbol}
                                </td>
                                <td className="font-mono text-[var(--text-primary)] whitespace-nowrap">
                                  {row.syntax}
                                </td>
                                <td className="text-[var(--text-secondary)]">{row.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))
                  )}
                </div>
              )}

              {drawerTab === 'examples' && (
                <div className="space-y-4">
                  {centre.guidedExamples.map((ex) => (
                    <div
                      key={ex.id}
                      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[var(--accent-text)]">{ex.topic}</p>
                          <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">{ex.title}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLoadIntoWorkspace(ex.code, ex.language, ex.title, false)}
                          className="h-8 px-3 rounded-lg bg-[var(--status-success)] hover:opacity-95 text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Try It Yourself</span>
                        </button>
                      </div>
                      <div className="p-4 space-y-2.5">
                        <p className="text-xs text-[var(--text-secondary)]">{ex.description}</p>
                        <pre className="p-3.5 rounded-lg border border-slate-800 bg-[#0B111C] text-slate-100 font-mono text-xs overflow-x-auto max-h-48">
                          {ex.code}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {drawerTab === 'challenges' && (
                <div className="space-y-5">
                  <div className="rounded-r-lg border-l-2 border-[var(--accent-primary)] bg-[var(--accent-soft)] p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                          Certification Exam
                        </p>
                        <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">{centre.certification.examTitle}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          Pass {centre.certification.passingScorePct}% · {centre.certification.durationMinutes} min · {centre.certification.questionCount} questions
                        </p>
                      </div>
                      {activeCourse && (
                        <button
                          type="button"
                          onClick={() => (isAuthenticated ? onOpenCourse(activeCourse.slug) : onOpenAuth('signup'))}
                          className="bc-btn-primary !h-9 text-xs whitespace-nowrap"
                        >
                          {isAuthenticated ? 'Go to Quizzes & Exam' : 'Sign In for Exam'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Coding Challenges</h3>
                    <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                      {centre.challenges.map((ch) => (
                        <div key={ch.id} className="p-4 space-y-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold text-[var(--accent-text)] tabular-nums">
                                {ch.difficulty} · {ch.estimatedMinutes} min · +{ch.xpReward} XP
                              </p>
                              <h4 className="text-sm font-bold text-[var(--text-primary)]">{ch.title}</h4>
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{ch.prompt}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleLoadIntoWorkspace(ch.starterCode, undefined, ch.title, false)}
                              className="h-8 px-3 rounded-lg bg-[var(--status-success)] hover:opacity-95 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                            >
                              Practise Challenge
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRevealedHints((prev) => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{revealedHints[ch.id] ? 'Hide Hint' : 'Show Hint'}</span>
                          </button>
                          {revealedHints[ch.id] && (
                            <p className="text-xs bg-[var(--status-warning-soft)] border-l-2 border-[var(--status-warning)] rounded-r-lg p-3 text-[var(--text-primary)]">
                              {ch.hint}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'projects' && (
                <div className="space-y-4">
                  {centre.websiteProject && (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
                      <div className="p-4 border-l-2 border-[var(--accent-primary)] bg-[var(--accent-soft)] space-y-1">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">{centre.websiteProject.title}</h3>
                        <p className="text-xs text-[var(--text-secondary)]">{centre.websiteProject.summary}</p>
                      </div>
                      <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-default)]">
                        {centre.websiteProject.phases.map((ph) => (
                          <div key={ph.phase} className="p-3.5 text-xs space-y-1">
                            <p className="font-bold text-[var(--text-primary)]">{ph.phase}: {ph.title}</p>
                            <ul className="list-disc pl-4 text-[var(--text-secondary)]">
                              {ph.deliverables.map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {data.projectTemplates && data.projectTemplates.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Starter Project Templates</h3>
                      <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                        {data.projectTemplates.map((tpl) => (
                          <div key={tpl.id} className="p-3.5 space-y-1">
                            <p className="text-[11px] font-semibold text-[var(--accent-text)]">{tpl.difficulty} · {tpl.estimated_hours}h</p>
                            <p className="text-sm font-bold text-[var(--text-primary)]">{tpl.title}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{tpl.summary}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'study_plan' && (
                <div className="space-y-5">
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
                      <span>Week-by-Week Study Plan</span>
                    </h3>
                    <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                      {centre.studyPlan.map((wk) => (
                        <div key={wk.week} className="p-3.5 space-y-1">
                          <p className="text-[11px] font-bold text-[var(--accent-text)]">Week {wk.week} · ~{wk.estimatedHours}h</p>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{wk.title}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{wk.focus}</p>
                          <ul className="list-disc pl-4 text-xs text-[var(--text-secondary)] pt-1">
                            {wk.milestones.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {centre.interviewPrep.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Interview Practice Questions</h3>
                      <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
                        {centre.interviewPrep.map((q) => {
                          const expanded = Boolean(expandedInterviewIds[q.id]);
                          return (
                            <div key={q.id}>
                              <button
                                type="button"
                                onClick={() => setExpandedInterviewIds((p) => ({ ...p, [q.id]: !p[q.id] }))}
                                className="w-full p-3.5 text-left flex items-center justify-between gap-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                              >
                                <span>{q.question}</span>
                                {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                              </button>
                              {expanded && (
                                <div className="px-3.5 pb-3.5 pt-2 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 text-xs text-[var(--text-secondary)]">
                                  {q.sampleAnswer}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {data.relatedTechnologies && data.relatedTechnologies.length > 0 && (
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Related Technologies</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {data.relatedTechnologies.map((rel) => (
                          <button
                            key={rel.id}
                            type="button"
                            onClick={() => {
                              setResourcesOpen(false);
                              onSelectTechnology(rel.slug);
                            }}
                            className="p-3 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent-primary)] text-left flex items-center gap-2.5 cursor-pointer"
                          >
                            <TechGlyph
                              slug={rel.slug}
                              name={rel.name}
                              symbol={rel.icon_symbol}
                              brandColor={rel.brand_color}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[var(--text-primary)] truncate">{rel.name}</p>
                              <p className="text-[11px] text-[var(--text-muted)] truncate">
                                {Number(rel.course_count || 0) > 0 ? `${rel.course_count} course` : 'In preparation'}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
