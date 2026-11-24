import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Code2,
  Compass,
  Download,
  Eye,
  FileText,
  Layers,
  ListChecks,
  Lock,
  Menu,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  PenTool,
  Printer,
  Save,
  Search,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type {
  AssignmentItem,
  Category,
  CertificateItem,
  CodeExampleItem,
  Course,
  CourseCompetencySummary,
  CourseTopic,
  ExerciseItem,
  LearnerRecommendation,
  LearningPath,
  LessonContentBlock,
  LessonFull,
  LessonOutlineItem,
  PathCertificateItem,
  ProjectTemplate,
  Technology,
} from '../types';
import { AiAssistantPanel } from './AiAssistantPanel';
import { ExerciseEngine } from './ExerciseEngine';
import { LessonContentRenderer } from './LessonContentRenderer';
import { NumberedCourseOutline } from './NumberedCourseOutline';
import { PracticeWorkspacePane, type PracticeTab, type SeededPracticeSnippet } from './PracticeWorkspacePane';
import { ProjectAssignmentPanel } from './ProjectAssignmentPanel';
import { TechnologyBar } from './TechnologyBar';

interface CoursesViewProps {
  initialCourseSlug?: string;
  initialLessonId?: string;
  onOpenPricing: () => void;
  onLaunchExercise: (lesson: LessonFull) => void;
  onSelectTechnology?: (slug: string) => void;
}

interface CourseReviewItem {
  id: string;
  user_id: string;
  rating: number;
  review_text: string;
  full_name: string;
  username: string;
  updated_at: string;
}

interface CertificateEligibility {
  eligible: boolean;
  completionRule: string;
  totalLessons: number;
  completedLessons: number;
  totalAssessments: number;
  passedAssessments: number;
  minCertificateScore?: number;
  bestAssessmentScore?: number;
  requirePracticalProjects?: boolean;
  practicalCompleted?: boolean;
  reason: string;
}

interface CourseDetailData {
  course: Course;
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
  exercises?: ExerciseItem[];
  assignments?: AssignmentItem[];
  projectTemplates?: ProjectTemplate[];
  reviews?: CourseReviewItem[];
  certificateEligibility?: CertificateEligibility | null;
  competencySummary?: CourseCompetencySummary | null;
  recommendations?: LearnerRecommendation[];
}

interface AssessmentDetail {
  assessment: {
    id: string;
    title: string;
    type: string;
    mode: string;
    time_limit_sec: number;
    xp_reward: number;
    passing_score_pct?: number;
    max_attempts?: number;
    allow_partial_credit?: number | boolean;
    objective_tags?: string[];
    questions: Array<{
      id: string;
      kind: string;
      prompt: string;
      options: string[];
      marks?: number;
      objectiveTag?: string;
      allowPartialCredit?: boolean;
    }>;
  };
  attempts: Array<{
    id: string;
    score: number;
    max_score: number;
    percentage?: number;
    passed?: number;
    status: string;
    instructor_notes: string;
    created_at: string;
  }>;
}

interface PathDetailResponse {
  learningPath: LearningPath;
  courses: Array<{
    id: string;
    title: string;
    slug: string;
    description: string;
    difficulty: string;
    estimated_hours: number;
    technology_name?: string;
    technology_slug?: string;
    total_lessons?: number;
  }>;
  projectTemplates: ProjectTemplate[];
  certificate: PathCertificateItem | null;
}

type StageMode = 'overview' | 'lesson' | 'assessment' | 'assignments';
type StudyRailTab = 'ai' | 'notes' | 'bookmarks' | 'downloads';
type MobileSurfaceTab = 'lesson' | PracticeTab;
type AiModeType =
  | 'explain_concept'
  | 'explain_code'
  | 'debug_error'
  | 'hint_only'
  | 'summarize_lesson'
  | 'practice_questions'
  | 'simplify_topic'
  | 'compare_techs'
  | 'review_code'
  | 'recommend_next'
  | 'explain_assessment'
  | 'platform_help';

export function CoursesView({
  initialCourseSlug,
  initialLessonId,
  onOpenPricing,
  onLaunchExercise,
  onSelectTechnology,
}: CoursesViewProps) {
  const { user, setUser } = useAuth();

  // Catalog state
  const [categories, setCategories] = useState<Category[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedAccess, setSelectedAccess] = useState<'all' | 'free' | 'premium'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Path detail modal state
  const [selectedPathDetail, setSelectedPathDetail] = useState<PathDetailResponse | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [pathCertMsg, setPathCertMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Course studio state
  const [activeCourseSlug, setActiveCourseSlug] = useState<string | null>(initialCourseSlug || null);
  const [courseDetail, setCourseDetail] = useState<CourseDetailData | null>(null);
  const [stageMode, setStageMode] = useState<StageMode>('overview');
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [outlineCompact, setOutlineCompact] = useState(false);
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [showPracticePane, setShowPracticePane] = useState(true);
  const [practiceExpanded, setPracticeExpanded] = useState(false);
  const [practiceTab, setPracticeTab] = useState<PracticeTab>('code');
  const [mobileSurfaceTab, setMobileSurfaceTab] = useState<MobileSurfaceTab>('lesson');
  const [seededPracticeSnippet, setSeededPracticeSnippet] = useState<SeededPracticeSnippet | null>(null);
  const [showStudyRail, setShowStudyRail] = useState(false);
  const [courseMoreOpen, setCourseMoreOpen] = useState(false);
  const courseMoreRef = useRef<HTMLDivElement | null>(null);
  const [studyRailTab, setStudyRailTab] = useState<StudyRailTab>('ai');
  const [justCompletedLessonId, setJustCompletedLessonId] = useState<string | null>(null);
  const practiceSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!courseMoreOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (courseMoreRef.current && !courseMoreRef.current.contains(e.target as Node)) {
        setCourseMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCourseMoreOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [courseMoreOpen]);

  // Lesson viewer state
  const [activeLesson, setActiveLesson] = useState<LessonFull | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<LessonContentBlock[]>([]);
  const [codeExamples, setCodeExamples] = useState<CodeExampleItem[]>([]);
  const [lessonExercises, setLessonExercises] = useState<ExerciseItem[]>([]);
  const [lessonAssessments, setLessonAssessments] = useState<
    Array<{ id: string; title: string; type: string; xp_reward: number }>
  >([]);
  const [prevLessonId, setPrevLessonId] = useState<string | null>(null);
  const [nextLessonId, setNextLessonId] = useState<string | null>(null);
  const [lessonProgress, setLessonProgress] = useState<{ completed: boolean; bookmarked: boolean }>({
    completed: false,
    bookmarked: false,
  });
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  // DB-synced personal notes
  const [personalNote, setPersonalNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

  // Contextual AI handoff state
  const [aiExerciseId, setAiExerciseId] = useState<string | undefined>(undefined);
  const [aiMode, setAiMode] = useState<AiModeType>('explain_concept');
  const [aiSeedCode, setAiSeedCode] = useState<string | undefined>(undefined);

  // Certificate modal & claim status
  const [certStatus, setCertStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [previewCertificate, setPreviewCertificate] = useState<CertificateItem | null>(null);

  // Course reviews
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);

  // Assessment state
  const [activeAssessment, setActiveAssessment] = useState<AssessmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number;
    maxScore: number;
    percentage?: number;
    passingScorePct?: number;
    passed?: boolean;
    status: string;
    xpAwarded: number;
    feedback: Array<{
      id: string;
      kind?: string;
      prompt: string;
      objectiveTag?: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      marksEarned?: number;
      marksPossible?: number;
      partialCredit?: boolean;
      explanation: string;
      note?: string;
    }>;
    objectivePerformance?: Array<{
      objective: string;
      earned: number;
      max: number;
      percentage: number;
    }>;
    recommendations?: LearnerRecommendation[];
  } | null>(null);

  useEffect(() => {
    if (initialCourseSlug) setActiveCourseSlug(initialCourseSlug);
  }, [initialCourseSlug]);

  const loadCatalog = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedTech) params.set('tech', selectedTech);
    if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
    if (selectedAccess !== 'all') params.set('access', selectedAccess);
    if (search.trim()) params.set('q', search.trim());
    api
      .get<{
        categories: Category[];
        technologies: Technology[];
        learningPaths: LearningPath[];
        courses: Course[];
      }>(`/catalog?${params.toString()}`)
      .then((d) => {
        setCategories(d.categories);
        setTechnologies(d.technologies);
        setPaths(d.learningPaths);
        setCourses(d.courses);
      })
      .finally(() => setLoading(false));
  };

  const loadCertificates = () => {
    api
      .get<{ certificates: CertificateItem[] }>('/certificates')
      .then((d) => setCertificates(d.certificates))
      .catch(() => {});
  };

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory, selectedTech, selectedDifficulty, selectedAccess]);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCourseOutline = async (
    slug: string,
    opts?: { preserveActiveLesson?: boolean; targetLessonId?: string; autoEnterLesson?: boolean }
  ) => {
    const preserveActiveLesson = opts?.preserveActiveLesson ?? false;
    const autoEnterLesson = opts?.autoEnterLesson ?? !preserveActiveLesson;
    setActiveCourseSlug(slug);
    if (!preserveActiveLesson) {
      window.scrollTo({ top: 0 });
      setActiveLesson(null);
      setActiveAssessment(null);
      setStageMode('overview');
      setJustCompletedLessonId(null);
    }
    setLockedMessage(null);
    const data = await api.get<CourseDetailData>(`/courses/${slug}`);
    setCourseDetail(data);

    if (autoEnterLesson) {
      const flattened = data.modules.flatMap((m) => m.lessons);
      const preferredId =
        opts?.targetLessonId && flattened.some((l) => l.id === opts.targetLessonId)
          ? opts.targetLessonId
          : data.course.last_lesson_id && flattened.some((l) => l.id === data.course.last_lesson_id)
            ? data.course.last_lesson_id
            : flattened[0]?.id;
      if (preferredId) {
        await openLesson(preferredId);
      }
    }
  };

  useEffect(() => {
    if (activeCourseSlug) {
      loadCourseOutline(activeCourseSlug, {
        preserveActiveLesson: false,
        targetLessonId: initialLessonId,
        autoEnterLesson: true,
      }).catch(() => {});
    }
  }, [activeCourseSlug, initialLessonId]);

  useEffect(() => {
    if (!activeAssessment || activeAssessment.assessment.time_limit_sec <= 0 || assessmentResult) return;
    if (secondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [activeAssessment, secondsLeft, assessmentResult]);

  const handleEnroll = async (courseId: string) => {
    await api.post(`/courses/${courseId}/enroll`);
    if (activeCourseSlug) await loadCourseOutline(activeCourseSlug, { preserveActiveLesson: true, autoEnterLesson: false });
    loadCatalog();
  };

  const openLesson = async (lessonId: string) => {
    setLockedMessage(null);
    setActiveAssessment(null);
    setAssessmentResult(null);
    setNoteStatus(null);
    setAiExerciseId(undefined);
    setJustCompletedLessonId(null);
    setMobileSurfaceTab('lesson');
    try {
      const data = await api.get<{
        lesson: LessonFull;
        blocks?: LessonContentBlock[];
        codeExamples?: CodeExampleItem[];
        exercises?: ExerciseItem[];
        noteText?: string;
        prevLessonId?: string | null;
        nextLessonId?: string | null;
        assessments?: Array<{ id: string; title: string; type: string; xp_reward: number }>;
        progress: { completed: boolean; bookmarked: boolean };
      }>(`/lessons/${lessonId}`);
      setActiveLesson(data.lesson);
      setLessonBlocks(data.blocks || []);
      setCodeExamples(data.codeExamples || []);
      setLessonExercises(data.exercises || []);
      setLessonAssessments(data.assessments || []);
      setPrevLessonId(data.prevLessonId || null);
      setNextLessonId(data.nextLessonId || null);
      setLessonProgress(data.progress);
      setPersonalNote(data.noteText ?? '');
      setAiSeedCode(data.lesson.starter_code || data.lesson.code_example || undefined);
      setAiMode('explain_concept');
      setStageMode('lesson');
      if (user) {
        try {
          const openRes = await api.post<{
            ok: boolean;
            progress: { completed: boolean; bookmarked: boolean; status: 'completed' | 'in_progress' | 'not_started' };
          }>(`/lessons/${lessonId}/open`, {});
          const nextStatus: 'completed' | 'in_progress' | 'not_started' =
            openRes.progress?.status || (data.progress?.completed ? 'completed' : 'in_progress');
          setCourseDetail((prev) =>
            prev
              ? {
                  ...prev,
                  modules: prev.modules.map((mod) => ({
                    ...mod,
                    lessons: mod.lessons.map((l) =>
                      l.id === lessonId && !l.completed ? { ...l, progress_status: nextStatus } : l
                    ),
                  })),
                }
              : prev
          );
        } catch {
          // non-blocking
        }
      }
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'PREMIUM_REQUIRED' || err.status === 403 || err.status === 401)) {
        setActiveLesson(null);
        setStageMode('overview');
        setLockedMessage(err.message);
      }
    }
  };

  const saveLessonNote = async () => {
    if (!activeLesson) return;
    setSavingNote(true);
    setNoteStatus(null);
    try {
      await api.put(`/lessons/${activeLesson.id}/note`, { noteText: personalNote });
      setNoteStatus('Saved to your Braincode account.');
    } catch (err) {
      setNoteStatus(err instanceof ApiError ? err.message : 'Sign in to sync notes to your account.');
    } finally {
      setSavingNote(false);
    }
  };

  const claimCourseCertificate = async (courseId: string) => {
    setCertStatus(null);
    try {
      const res = await api.post<{ ok: boolean; alreadyIssued: boolean; certificate: CertificateItem }>(
        `/certificates/claim/${courseId}`
      );
      setCertStatus({
        ok: true,
        text: `Certificate ${res.certificate.certificate_code} verified and issued to ${res.certificate.learner_name}.`,
      });
      setPreviewCertificate(res.certificate);
      loadCertificates();
    } catch (err) {
      setCertStatus({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Unable to claim certificate.',
      });
    }
  };

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;
    const res = await api.post<{ ok: boolean; xpAwarded: number; user: any }>(`/lessons/${activeLesson.id}/complete`);
    setLessonProgress((p) => ({ ...p, completed: true }));
    setJustCompletedLessonId(activeLesson.id);
    if (res.user) setUser(res.user);
    if (activeCourseSlug) loadCourseOutline(activeCourseSlug, { preserveActiveLesson: true, autoEnterLesson: false });
  };

  const handleBookmarkLesson = async () => {
    if (!activeLesson) return;
    const res = await api.post<{ bookmarked: boolean }>(`/lessons/${activeLesson.id}/bookmark`);
    setLessonProgress((p) => ({ ...p, bookmarked: res.bookmarked }));
    if (activeCourseSlug) loadCourseOutline(activeCourseSlug, { preserveActiveLesson: true, autoEnterLesson: false });
  };

  const openAssessment = async (assessmentId: string) => {
    setActiveLesson(null);
    setLockedMessage(null);
    setAssessmentResult(null);
    setAnswers({});
    setMobileSurfaceTab('lesson');
    const data = await api.get<AssessmentDetail>(`/assessments/${assessmentId}`);
    setActiveAssessment(data);
    setSecondsLeft(data.assessment.time_limit_sec || 0);
    setStageMode('assessment');
  };

  const submitAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssessment) return;
    const res = await api.post<any>(`/assessments/${activeAssessment.assessment.id}/submit`, { answers });
    setAssessmentResult(res);
    if (res.user) setUser(res.user);
    if (activeCourseSlug) loadCourseOutline(activeCourseSlug, { preserveActiveLesson: true, autoEnterLesson: false });
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseDetail) return;
    setReviewStatus(null);
    try {
      await api.post(`/courses/${courseDetail.course.id}/reviews`, {
        rating: reviewRating,
        reviewText: reviewText.trim(),
      });
      setReviewText('');
      setReviewStatus('Review saved. Thank you for the feedback.');
      await loadCourseOutline(courseDetail.course.slug, { preserveActiveLesson: true, autoEnterLesson: false });
    } catch (err) {
      setReviewStatus(err instanceof ApiError ? err.message : 'Unable to submit review.');
    }
  };

  const openLearningPathModal = async (slug: string) => {
    setPathLoading(true);
    setPathCertMsg(null);
    try {
      const data = await api.get<PathDetailResponse>(`/learning-paths/${slug}`);
      setSelectedPathDetail(data);
    } catch {
      // ignore
    } finally {
      setPathLoading(false);
    }
  };

  const claimPathCertificate = async (pathId: string, slug: string) => {
    setPathCertMsg(null);
    try {
      const res = await api.post<{ ok: boolean; certificate: PathCertificateItem }>(`/learning-paths/${pathId}/certificate`);
      setPathCertMsg({
        ok: true,
        text: `Path Certificate ${res.certificate.certificate_code} issued for ${res.certificate.path_title}.`,
      });
      await openLearningPathModal(slug);
    } catch (err) {
      setPathCertMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Unable to claim path certificate yet.',
      });
    }
  };

  const downloadNotes = (lesson: LessonFull) => {
    const noteSection = personalNote.trim() ? `\n## Personal Study Notes\n${personalNote}\n` : '';
    const content = `# ${lesson.title}\n\n${lesson.summary}\n\n${lesson.content_markdown}\n\n## Code Example\n\`\`\`${lesson.language}\n${lesson.code_example}\n\`\`\`\n${noteSection}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lesson.downloadable_resource || `${lesson.slug}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allLessons: LessonOutlineItem[] = courseDetail ? courseDetail.modules.flatMap((m) => m.lessons) : [];
  const currentIdx = activeLesson ? allLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const bookmarkedLessons = allLessons.filter((l) => l.bookmarked);

  if (activeCourseSlug && courseDetail) {
    const {
      course,
      modules,
      assessments,
      assignments = [],
      projectTemplates = [],
      reviews = [],
      certificateEligibility,
    } = courseDetail;
    const completedCount = allLessons.filter((l) => l.completed).length;
    const existingCert = certificates.find((c) => c.course_id === course.id);

    const activeSeqStr = currentIdx >= 0 ? String(currentIdx + 1).padStart(2, '0') : '01';
    const totalSeqStr = String(Math.max(1, allLessons.length)).padStart(2, '0');
    const resolvedNextId =
      nextLessonId || (currentIdx >= 0 && currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1].id : null);
    const nextLessonItem = resolvedNextId ? allLessons.find((l) => l.id === resolvedNextId) : null;
    const nextSeqStr =
      nextLessonItem && currentIdx >= 0 ? String(currentIdx + 2).padStart(2, '0') : undefined;

    return (
      <div className="-m-4 sm:-m-6 lg:-m-8 flex flex-col min-h-[calc(100vh-4rem)]">
        {/* AREA 1: Top Course Navigation Header */}
        <header
          data-testid="course-top-header"
          className="lg:sticky lg:top-16 z-20 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-default)] px-3 sm:px-6 h-[52px] flex items-center justify-between gap-2 sm:gap-3"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                setActiveCourseSlug(null);
                setCourseDetail(null);
                setActiveLesson(null);
                setActiveAssessment(null);
                setStageMode('overview');
                setJustCompletedLessonId(null);
              }}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>All Courses</span>
            </button>
            <span className="text-[var(--border-strong)] shrink-0" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveLesson(null);
                setActiveAssessment(null);
                setStageMode('overview');
                setMobileSurfaceTab('lesson');
              }}
              className="text-xs font-semibold text-[var(--accent-text)] hover:underline truncate min-w-0 max-w-[92px] sm:max-w-[260px] cursor-pointer text-left"
            >
              {course.title}
            </button>
            {stageMode === 'lesson' && activeLesson && (
              <>
                <span className="hidden sm:inline text-[var(--border-strong)]" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline text-xs font-mono tabular-nums text-[var(--text-muted)] whitespace-nowrap">
                  Lesson {activeSeqStr} / {totalSeqStr}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileOutlineOpen(true)}
              className="lg:hidden min-h-[36px] px-2 sm:px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Menu className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0" />
              <span>Outline</span>
            </button>
            <button
              type="button"
              data-testid="toggle-outline-sidebar-btn"
              aria-expanded={showLeftSidebar}
              aria-label={showLeftSidebar ? 'Collapse curriculum sidebar' : 'Expand curriculum sidebar'}
              onClick={() => setShowLeftSidebar((v) => !v)}
              className={`hidden lg:inline-flex h-8 px-2.5 rounded-lg border text-xs font-medium items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                showLeftSidebar
                  ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-soft)] text-[var(--accent-text)]'
                  : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PanelLeft className="w-3.5 h-3.5" />
              <span>Outline</span>
            </button>

            <div ref={courseMoreRef} className="relative">
              <button
                type="button"
                data-testid="course-more-menu-btn"
                aria-expanded={courseMoreOpen}
                aria-haspopup="menu"
                aria-label="More course options"
                onClick={() => setCourseMoreOpen((v) => !v)}
                className="h-9 lg:h-8 px-2 sm:px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <MoreHorizontal className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">More</span>
              </button>

              {courseMoreOpen && (
                <div
                  role="menu"
                  data-testid="course-more-menu-popover"
                  className="absolute right-0 top-10 z-40 w-60 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-popover)] p-1.5 space-y-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowPracticePane((v) => !v);
                      setCourseMoreOpen(false);
                    }}
                    className="hidden lg:flex w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] items-center gap-2 cursor-pointer"
                  >
                    <Code2 className="w-3.5 h-3.5 text-[var(--status-success)]" />
                    <span>{showPracticePane ? 'Hide Practice Panel' : 'Show Practice Panel'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowStudyRail((v) => !v);
                      setCourseMoreOpen(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] flex items-center gap-2 cursor-pointer"
                  >
                    <PanelRight className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>{showStudyRail ? 'Close Study Companion' : 'Open Study Companion & Notes'}</span>
                  </button>
                </div>
              )}
            </div>

            {!course.enrolled && (
              <button
                type="button"
                onClick={() => handleEnroll(course.id)}
                className="bc-btn-primary !h-9 lg:!h-8 !px-2.5 sm:!px-3.5 whitespace-nowrap"
              >
                Enroll Free
              </button>
            )}
          </div>
        </header>

        {/* 3-Area Split Below Header: Left Curriculum Sidebar + Main Content Area */}
        <div className="flex flex-1 items-stretch relative">
          {/* AREA 2: Left Independently Scrollable Numbered Curriculum Sidebar */}
          <NumberedCourseOutline
            course={course}
            modules={modules}
            assessments={assessments}
            assignmentsCount={assignments.length}
            projectTemplatesCount={projectTemplates.length}
            activeLessonId={activeLesson?.id}
            activeAssessmentId={activeAssessment?.assessment.id}
            stageMode={stageMode}
            completedCount={completedCount}
            totalCount={allLessons.length}
            certificateEligibility={certificateEligibility}
            existingCert={existingCert}
            certStatus={certStatus}
            stickyClassName="lg:top-[116px] lg:h-[calc(100vh-116px)]"
            desktopVisible={showLeftSidebar}
            onSelectOverview={() => {
              setActiveLesson(null);
              setActiveAssessment(null);
              setStageMode('overview');
              setMobileSurfaceTab('lesson');
            }}
            onSelectLesson={(lessonId) => openLesson(lessonId)}
            onSelectAssessment={(assessmentId) => openAssessment(assessmentId)}
            onSelectAssignments={() => {
              setActiveLesson(null);
              setActiveAssessment(null);
              setStageMode('assignments');
              setMobileSurfaceTab('lesson');
            }}
            onClaimCertificate={(cid) => claimCourseCertificate(cid)}
            onEnroll={(cid) => handleEnroll(cid)}
            compact={outlineCompact}
            onToggleCompact={() => setOutlineCompact((c) => !c)}
            mobileOpen={mobileOutlineOpen}
            onCloseMobile={() => setMobileOutlineOpen(false)}
          />

          {/* AREA 3: Main Content Area (Lesson / Assessment / Overview + Integrated Practice Workspace) */}
          <div data-testid="main-content-area" className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-5 sm:py-7">
            <div
              className={`${
                practiceExpanded && showPracticePane ? 'max-w-6xl' : 'max-w-4xl'
              } mx-auto space-y-6 transition-[max-width] duration-200`}
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
                        if (tab.id !== 'lesson') {
                          setPracticeTab(tab.id);
                        }
                      }}
                      className={`min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[11px] font-bold inline-flex items-center justify-center gap-1 sm:gap-1.5 transition-workspace cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[var(--bg-surface)] text-[var(--accent-text)] shadow-[var(--shadow-sm)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <main className={`min-w-0 space-y-6 ${mobileSurfaceTab === 'lesson' ? 'block' : 'hidden lg:block'}`}>
            {lockedMessage && (
              <div className="bc-panel p-6 sm:p-8 text-center space-y-4">
                <Lock className="w-9 h-9 text-[var(--status-warning)] mx-auto" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Premium Lesson Access Required</h2>
                <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">{lockedMessage}</p>
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="bc-btn-primary !px-6"
                >
                  View Pro &amp; Studio Plans
                </button>
              </div>
            )}

            {stageMode === 'overview' && !lockedMessage && (
              <div className="space-y-6">
                <div className="bc-panel p-6 sm:p-7 space-y-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                      Course Overview ·{' '}
                      {course.completion_rule === 'lessons_and_assessments'
                        ? 'Lessons + Assessments Required'
                        : 'Complete All Lessons'}
                    </p>
                    <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{course.title}</h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <div className="pt-4 border-t border-[var(--border-subtle)]">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Prerequisites
                      </h3>
                      <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                        {course.prerequisites.map((pre) => (
                          <li key={pre} className="flex items-start gap-2">
                            <ListChecks className="w-3.5 h-3.5 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                            <span>{pre}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <h3 className="text-sm font-semibold mb-2.5 text-[var(--text-primary)]">What you will build and demonstrate</h3>
                    <ul className="space-y-2">
                      {course.objectives.map((obj) => (
                        <li key={obj} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs text-[var(--text-muted)] tabular-nums">
                      {allLessons.length} lessons · {assessments.length} assessment(s) · {assignments.length}{' '}
                      assignment(s)
                      {certificateEligibility?.minCertificateScore
                        ? ` · Certificate min ${certificateEligibility.minCertificateScore}%`
                        : ''}
                      {certificateEligibility?.requirePracticalProjects ? ' · Project approval required' : ''}
                    </div>
                    {allLessons[0] && (
                      <button
                        type="button"
                        onClick={() => openLesson(course.last_lesson_id || allLessons[0].id)}
                        className="bc-btn-primary"
                      >
                        <span>{completedCount > 0 ? 'Continue Learning' : 'Start First Lesson'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Course Competency & Objective Mastery Summary */}
                {courseDetail.competencySummary && courseDetail.competencySummary.objectives?.length > 0 && (
                  <div
                    data-testid="course-competency-summary"
                    className="bc-panel p-6 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        Learning Objective Competency Summary
                      </h3>
                      <span className="text-xs font-mono tabular-nums text-[var(--accent-text)]">
                        {courseDetail.competencySummary.objectives.filter((o) => o.status === 'mastered').length}/
                        {courseDetail.competencySummary.objectives.length} mastered ·{' '}
                        {courseDetail.competencySummary.metrics.averageMasteryPct}% avg
                      </span>
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {courseDetail.competencySummary.objectives.map((item) => (
                        <div
                          key={item.key || item.title}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-medium text-[var(--text-primary)]">{item.title}</span>
                          <span
                            className={`font-mono tabular-nums shrink-0 ${
                              item.status === 'mastered'
                                ? 'text-[var(--status-success)]'
                                : item.status === 'needs_review'
                                  ? 'text-[var(--status-warning)]'
                                  : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {item.masteryPct}% · {String(item.status || 'not_started').replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Course Reviews & Feedback */}
                <div className="bc-panel p-6 space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                    <Star className="w-4 h-4 text-[var(--status-warning)]" />
                    <span>Learner Course Reviews ({reviews.length})</span>
                  </h3>
                  {reviews.length > 0 && (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="py-3 text-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-[var(--text-primary)]">
                              {rev.full_name} (@{rev.username})
                            </span>
                            <span className="font-mono text-[var(--status-warning)] tabular-nums shrink-0">{rev.rating}/5</span>
                          </div>
                          {rev.review_text && <p className="text-[var(--text-secondary)]">{rev.review_text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {user && (
                    <form onSubmit={submitReview} className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                      <div className="flex items-center gap-3 text-xs">
                        <label className="font-semibold text-[var(--text-primary)]">Rate this course:</label>
                        <select
                          value={reviewRating}
                          onChange={(e) => setReviewRating(Number(e.target.value))}
                          className="bc-select !h-8 !text-xs"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} / 5 Stars
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Share how this course helped your workflow..."
                          className="bc-input !h-9 flex-1 min-w-0 !text-xs"
                        />
                        <button
                          type="submit"
                          className="bc-btn-secondary !h-9 shrink-0"
                        >
                          Post Review
                        </button>
                      </div>
                      {reviewStatus && <p className="text-[11px] text-[var(--status-success)]">{reviewStatus}</p>}
                    </form>
                  )}
                </div>
              </div>
            )}

            {stageMode === 'assignments' && (
              <ProjectAssignmentPanel
                assignments={assignments}
                projectTemplates={projectTemplates}
                onAssignmentSubmitted={() =>
                  loadCourseOutline(course.slug, { preserveActiveLesson: true, autoEnterLesson: false })
                }
              />
            )}

            {stageMode === 'lesson' && activeLesson && (
              <div className="bc-panel p-5 sm:p-8 lg:p-10 space-y-6">
                {/* Beginner-Friendly Guided Mentor Strip */}
                <div
                  data-testid="guided-mentor-prompt"
                  className="rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-soft)] px-4 py-3 flex items-start gap-3 text-xs"
                >
                  <Compass className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {currentIdx === 0 && !lessonProgress.completed
                        ? `Welcome to ${course.technology_name || course.title} — Lesson ${activeSeqStr} of ${totalSeqStr}`
                        : `You're currently learning Lesson ${activeSeqStr} of ${totalSeqStr}`}
                    </p>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      Read the walkthrough below, then click <span className="font-semibold text-[var(--text-primary)]">Try It Yourself</span> on
                      any example to edit and run code live beside this lesson or sketch notes on the Whiteboard.
                    </p>
                  </div>
                </div>

                {/* Lesson Title & Quick Actions */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-mono font-bold text-[var(--accent-text)] tabular-nums">{activeSeqStr}.</span>
                      <span className="capitalize">{activeLesson.access_tier} lesson</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{activeLesson.duration_minutes} min</span>
                      {activeLesson.topic_name && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{activeLesson.topic_name}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{activeLesson.title}</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{activeLesson.summary}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!prevLessonId && currentIdx <= 0}
                      onClick={() => {
                        const target = prevLessonId || (currentIdx > 0 ? allLessons[currentIdx - 1].id : null);
                        if (target) openLesson(target);
                      }}
                      className="bc-btn-secondary !h-8 !px-3 disabled:opacity-40 whitespace-nowrap"
                    >
                      &lsaquo; Previous
                    </button>
                    <button
                      type="button"
                      disabled={!resolvedNextId}
                      onClick={() => {
                        if (resolvedNextId) openLesson(resolvedNextId);
                      }}
                      className="bc-btn-primary !h-8 !px-3 !bg-[var(--status-success)] hover:!opacity-90 disabled:opacity-40 whitespace-nowrap"
                    >
                      Next &rsaquo;
                    </button>
                    <button
                      type="button"
                      onClick={handleBookmarkLesson}
                      className={`h-8 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        lessonProgress.bookmarked
                          ? 'border-[var(--status-warning)] text-[var(--status-warning)] bg-[var(--status-warning-soft)]'
                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{lessonProgress.bookmarked ? 'Saved' : 'Bookmark'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStudyRail(true);
                        setStudyRailTab('ai');
                      }}
                      className="h-8 px-3 rounded-lg border border-[var(--accent-primary)]/35 bg-[var(--accent-soft)] text-[var(--accent-text)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>

                {/* Lesson Prerequisites / Learning Objectives Strip */}
                {((activeLesson.prerequisites && activeLesson.prerequisites.length > 0) ||
                  (activeLesson.objectives && activeLesson.objectives.length > 0)) && (
                  <div className="border-y border-[var(--border-subtle)] py-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {activeLesson.prerequisites && activeLesson.prerequisites.length > 0 && (
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Prerequisites
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                          {activeLesson.prerequisites.map((p) => (
                            <li key={p}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeLesson.objectives && activeLesson.objectives.length > 0 && (
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Lesson Objectives
                        </p>
                        <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                          {activeLesson.objectives.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Structured Lesson Blocks & Runnable Code Examples */}
                <LessonContentRenderer
                  blocks={lessonBlocks}
                  codeExamples={codeExamples}
                  fallbackMarkdown={activeLesson.content_markdown}
                  fallbackCode={activeLesson.code_example}
                  fallbackLanguage={activeLesson.language}
                  workspaceActionLabel="Try It Yourself"
                  onOpenInWorkspace={(code, lang, title) => {
                    setSeededPracticeSnippet({
                      code: code || activeLesson.starter_code || activeLesson.code_example || '',
                      language: lang || activeLesson.language || 'html',
                      title: title || activeLesson.title,
                      nonce: Date.now(),
                    });
                    setShowPracticePane(true);
                    setPracticeTab('code');
                    setMobileSurfaceTab('code');
                    window.setTimeout(() => {
                      practiceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 60);
                  }}
                />

                {/* Phase 24 Structured Lesson Mastery Sections */}
                {(activeLesson.visual_explanation_markdown ||
                  (activeLesson.common_mistakes && activeLesson.common_mistakes.length > 0) ||
                  (activeLesson.best_practices && activeLesson.best_practices.length > 0) ||
                  activeLesson.next_step_guidance) && (
                  <div className="space-y-3 pt-1">
                    {activeLesson.visual_explanation_markdown && (
                      <div className="bc-subtle-box p-4 space-y-1.5">
                        <p className="text-xs font-bold text-[var(--text-primary)]">Visual Concept Breakdown</p>
                        <pre className="font-mono text-xs text-[var(--text-secondary)] overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {activeLesson.visual_explanation_markdown}
                        </pre>
                      </div>
                    )}

                    {((activeLesson.common_mistakes && activeLesson.common_mistakes.length > 0) ||
                      (activeLesson.best_practices && activeLesson.best_practices.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {activeLesson.common_mistakes && activeLesson.common_mistakes.length > 0 && (
                          <div className="rounded-lg border border-[var(--status-warning)]/25 bg-[var(--status-warning-soft)] p-4 space-y-1.5">
                            <p className="font-bold text-[var(--status-warning)]">Common Mistakes to Avoid</p>
                            <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                              {activeLesson.common_mistakes.map((m, idx) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {activeLesson.best_practices && activeLesson.best_practices.length > 0 && (
                          <div className="rounded-lg border border-[var(--status-success)]/25 bg-[var(--status-success-soft)] p-4 space-y-1.5">
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

                    {activeLesson.next_step_guidance && (
                      <div className="border-t border-[var(--border-subtle)] pt-3 text-xs">
                        <span className="font-bold text-[var(--text-primary)]">Next Practice Step: </span>
                        <span className="text-[var(--text-secondary)]">{activeLesson.next_step_guidance}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Interactive Exercises Engine */}
                {lessonExercises.length > 0 ? (
                  <ExerciseEngine
                    exercises={lessonExercises}
                    onSolved={() => {
                      if (activeCourseSlug)
                        loadCourseOutline(activeCourseSlug, { preserveActiveLesson: true, autoEnterLesson: false });
                    }}
                    onAskAi={(exerciseId, codeSnippet) => {
                      setAiExerciseId(exerciseId);
                      setAiMode('hint_only');
                      setAiSeedCode(codeSnippet || activeLesson.starter_code || activeLesson.code_example);
                      setShowStudyRail(true);
                      setStudyRailTab('ai');
                    }}
                  />
                ) : (
                  activeLesson.exercise_prompt && (
                    <div className="bc-subtle-box p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                          <Code2 className="w-4 h-4 text-[var(--accent-primary)]" />
                          <span>Practical Coding Exercise</span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSeededPracticeSnippet({
                                code: activeLesson.starter_code || activeLesson.code_example || '',
                                language: activeLesson.language || 'html',
                                title: activeLesson.title,
                                nonce: Date.now(),
                              });
                              setShowPracticePane(true);
                              setPracticeTab('code');
                              setMobileSurfaceTab('code');
                              window.setTimeout(() => {
                                practiceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }, 60);
                            }}
                            className="bc-btn-primary !h-8 !px-3.5 whitespace-nowrap"
                          >
                            Try in Practice Editor
                          </button>
                          <button
                            type="button"
                            onClick={() => onLaunchExercise(activeLesson)}
                            className="bc-btn-secondary !h-8 !px-3 whitespace-nowrap"
                          >
                            Full IDE
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{activeLesson.exercise_prompt}</p>
                      {activeLesson.solution_hint && (
                        <details className="text-xs text-[var(--text-muted)]">
                          <summary className="cursor-pointer font-medium">View debugging hint</summary>
                          <p className="mt-1.5">{activeLesson.solution_hint}</p>
                        </details>
                      )}
                    </div>
                  )
                )}

                {lessonAssessments.length > 0 && (
                  <div className="bc-subtle-box p-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                      <p className="font-bold text-[var(--accent-text)]">Lesson Checkpoint Quiz Available</p>
                      <p className="text-[var(--text-secondary)]">{lessonAssessments[0].title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openAssessment(lessonAssessments[0].id)}
                      className="bc-btn-primary !h-8 !px-3.5 whitespace-nowrap"
                    >
                      Take Quiz (+{lessonAssessments[0].xp_reward} XP)
                    </button>
                  </div>
                )}

                {/* Guided Completion Prompt & Next Step */}
                {justCompletedLessonId === activeLesson.id && (
                  <div
                    data-testid="lesson-completion-banner"
                    className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-[var(--status-success)] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Great work! You&apos;ve completed Lesson {activeSeqStr}.</span>
                      </p>
                      <p className="text-[var(--text-secondary)]">
                        {nextLessonItem
                          ? `Ready to continue to Lesson ${nextSeqStr}: ${nextLessonItem.title}?`
                          : 'You have reached the final lesson in this outline. Check your certificate progress in the sidebar!'}
                      </p>
                    </div>
                    {nextLessonItem && (
                      <button
                        type="button"
                        data-testid="continue-next-lesson-btn"
                        onClick={() => openLesson(nextLessonItem.id)}
                        className="bc-btn-primary !h-8 !px-4 !bg-[var(--status-success)] hover:!opacity-90 whitespace-nowrap"
                      >
                        <span>Continue to Lesson {nextSeqStr}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Lesson Footer Navigation */}
                <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!prevLessonId && currentIdx <= 0}
                      onClick={() => {
                        const target = prevLessonId || (currentIdx > 0 ? allLessons[currentIdx - 1].id : null);
                        if (target) openLesson(target);
                      }}
                      className="bc-btn-secondary !h-9 !px-3.5 disabled:opacity-40 whitespace-nowrap"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!resolvedNextId}
                      onClick={() => {
                        if (resolvedNextId) openLesson(resolvedNextId);
                      }}
                      className="bc-btn-secondary !h-9 !px-3.5 disabled:opacity-40 whitespace-nowrap"
                    >
                      Next Lesson
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadNotes(activeLesson)}
                      className="bc-btn-secondary !h-9 !px-3.5 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Notes</span>
                    </button>
                    <button
                      type="button"
                      data-testid="mark-lesson-complete-btn"
                      onClick={handleCompleteLesson}
                      className={`bc-btn-primary !h-9 !px-4 whitespace-nowrap ${
                        lessonProgress.completed ? '!bg-[var(--status-success)]' : ''
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lessonProgress.completed ? 'Completed (+50 XP)' : 'Mark as Complete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {stageMode === 'assessment' && activeAssessment && (
              <div className="bc-panel p-5 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-[var(--accent-text)] font-semibold uppercase">
                      {activeAssessment.assessment.type} · {activeAssessment.assessment.mode} · Pass{' '}
                      {activeAssessment.assessment.passing_score_pct || 70}%
                    </p>
                    <h2 className="text-xl font-bold mt-1 text-[var(--text-primary)]">{activeAssessment.assessment.title}</h2>
                  </div>
                  {activeAssessment.assessment.time_limit_sec > 0 && !assessmentResult && (
                    <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] font-mono tabular-nums text-xs inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--status-warning)]" />
                      <span>
                        {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}
                </div>

                {!assessmentResult ? (
                  <form onSubmit={submitAssessment} className="space-y-6">
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {activeAssessment.assessment.questions.map((q, idx) => {
                        let selectedMulti: string[] = [];
                        if (q.kind === 'multi_select') {
                          try {
                            const parsed = JSON.parse(answers[q.id] || '[]');
                            if (Array.isArray(parsed)) selectedMulti = parsed.map(String);
                          } catch {
                            selectedMulti = [];
                          }
                        }
                        return (
                          <div key={q.id} className="py-5 first:pt-0 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-[var(--text-primary)]">
                                {idx + 1}. {q.prompt}
                              </p>
                              <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] shrink-0">
                                {q.marks ? `${q.marks} pts` : '1 pt'}
                                {q.objectiveTag ? ` · ${q.objectiveTag}` : ''}
                              </span>
                            </div>
                            {q.kind === 'multi_select' && q.options && q.options.length > 0 ? (
                              <div className="space-y-2">
                                {q.options.map((opt) => {
                                  const checked = selectedMulti.includes(opt);
                                  return (
                                    <label
                                      key={opt}
                                      className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                                        checked
                                          ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                                          : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          const next = checked
                                            ? selectedMulti.filter((x) => x !== opt)
                                            : [...selectedMulti, opt];
                                          setAnswers((a) => ({ ...a, [q.id]: JSON.stringify(next) }));
                                        }}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : q.options && q.options.length > 0 ? (
                              <div className="space-y-2">
                                {q.options.map((opt) => (
                                  <label
                                    key={opt}
                                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      answers[q.id] === opt
                                        ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={q.id}
                                      value={opt}
                                      checked={answers[q.id] === opt}
                                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                                    />
                                    <span>{opt}</span>
                                  </label>
                                ))}
                              </div>
                            ) : q.kind === 'sql_write' ? (
                              <textarea
                                rows={4}
                                spellCheck={false}
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                placeholder="Write your SQL query to answer this challenge..."
                                className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D16] text-slate-100 font-mono p-3 text-xs"
                              />
                            ) : q.kind === 'practical' ? (
                              <textarea
                                rows={3}
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                placeholder="Write your engineering explanation or implementation notes..."
                                className="bc-textarea w-full !text-xs"
                              />
                            ) : (
                              <input
                                type="text"
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                placeholder="Type your exact answer..."
                                className="bc-input w-full !text-xs font-mono"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="submit"
                      className="bc-btn-primary !px-6"
                    >
                      Submit Assessment
                    </button>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div className="p-5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-primary)]/25 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-[var(--accent-primary)]" />
                        <div>
                          <p className="text-base font-bold tabular-nums text-[var(--text-primary)]">
                            Score: {assessmentResult.score} / {assessmentResult.maxScore}
                            {assessmentResult.percentage !== undefined ? ` (${assessmentResult.percentage}%)` : ''}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {assessmentResult.passed ? 'Passed' : `Target: ${assessmentResult.passingScorePct || 70}%`} ·{' '}
                            Status: {assessmentResult.status} · XP Earned: +{assessmentResult.xpAwarded}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAiMode('explain_assessment');
                            setShowStudyRail(true);
                            setStudyRailTab('ai');
                          }}
                          className="bc-btn-secondary !h-8 !px-3.5 text-[var(--accent-text)]"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          <span>Explain with AI</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAssessmentResult(null)}
                          className="bc-btn-secondary !h-8 !px-3.5"
                        >
                          Retry
                        </button>
                      </div>
                    </div>

                    {assessmentResult.objectivePerformance && assessmentResult.objectivePerformance.length > 0 && (
                      <div
                        data-testid="assessment-objective-performance"
                        className="bc-subtle-box p-4 space-y-2.5"
                      >
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                          Objective Mastery Breakdown
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                          {assessmentResult.objectivePerformance.map((op) => (
                            <div
                              key={op.objective}
                              className="py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="font-medium truncate text-[var(--text-primary)]">{op.objective}</span>
                              <span
                                className={`font-mono tabular-nums shrink-0 font-semibold ${
                                  op.percentage >= 70
                                    ? 'text-[var(--status-success)]'
                                    : 'text-[var(--status-warning)]'
                                }`}
                              >
                                {op.earned}/{op.max} ({op.percentage}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {assessmentResult.recommendations && assessmentResult.recommendations.length > 0 && (
                      <div className="rounded-lg border border-[var(--status-warning)]/25 bg-[var(--status-warning-soft)] p-4 space-y-2 text-xs">
                        <p className="font-bold text-[var(--status-warning)]">Targeted Review Recommendations</p>
                        {assessmentResult.recommendations.slice(0, 3).map((rec) => (
                          <div key={rec.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[var(--text-secondary)]">
                              <span className="font-semibold text-[var(--text-primary)]">{rec.title}</span> — {rec.reason}
                            </span>
                            {rec.lessonId && (
                              <button
                                type="button"
                                onClick={() => openLesson(rec.lessonId!)}
                                className="text-[var(--accent-text)] font-semibold hover:underline cursor-pointer shrink-0"
                              >
                                Review Lesson →
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="divide-y divide-[var(--border-subtle)]">
                      {assessmentResult.feedback.map((f) => (
                        <div key={f.id} className="py-3.5 text-xs space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-[var(--text-primary)]">{f.prompt}</p>
                            {f.marksPossible !== undefined && (
                              <span
                                className={`font-mono tabular-nums text-[11px] shrink-0 font-semibold ${
                                  f.isCorrect ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'
                                }`}
                              >
                                {f.marksEarned ?? (f.isCorrect ? f.marksPossible : 0)}/{f.marksPossible} marks
                                {f.partialCredit ? ' (partial credit)' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[var(--text-secondary)]">
                            Your answer: <span className="font-mono text-[var(--text-primary)]">{f.userAnswer || '(blank)'}</span> · Expected:{' '}
                            <span className="font-mono text-[var(--text-primary)]">{f.correctAnswer}</span>
                          </p>
                          <p className="text-[var(--text-muted)]">{f.note || f.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeAssessment.attempts.length > 0 && (
                  <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <h3 className="text-xs font-semibold mb-2 text-[var(--text-primary)]">Previous Attempts</h3>
                    <div className="space-y-1.5">
                      {activeAssessment.attempts.map((att) => (
                        <div key={att.id} className="text-xs flex items-center justify-between text-[var(--text-muted)]">
                          <span className="tabular-nums">
                            {att.score}/{att.max_score}
                            {att.percentage !== undefined ? ` (${att.percentage}%)` : ''} · {att.status}
                          </span>
                          <span className="font-mono">{att.created_at.slice(0, 10)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
              </main>

              {/* Integrated Practice Workspace Inside Area 3 */}
              <section
                ref={practiceSectionRef}
                aria-label="Interactive practice workspace"
                className={`${
                  showPracticePane
                    ? mobileSurfaceTab !== 'lesson'
                      ? 'block'
                      : 'hidden lg:block'
                    : mobileSurfaceTab !== 'lesson'
                      ? 'block lg:hidden'
                      : 'hidden'
                }`}
              >
                <PracticeWorkspacePane
                  course={course}
                  activeLesson={activeLesson}
                  seededSnippet={seededPracticeSnippet}
                  activeTab={practiceTab}
                  onTabChange={(nextTab) => {
                    setPracticeTab(nextTab);
                    setMobileSurfaceTab(nextTab);
                  }}
                  isExpanded={practiceExpanded}
                  onToggleExpand={() => setPracticeExpanded((v) => !v)}
                  onAskAiDebug={(codeSnippet, errText) => {
                    setAiMode(errText ? 'debug_error' : 'explain_code');
                    setAiSeedCode(errText ? `${codeSnippet}\n\n// Error:\n// ${errText}` : codeSnippet);
                    setShowStudyRail(true);
                    setStudyRailTab('ai');
                  }}
                />
              </section>
            </div>
          </div>
        </div>

        {/* Slide-Over Study Companion Drawer (AI Tutor | DB-Synced Notes | Saved | Files) */}
        {showStudyRail && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
              onClick={() => setShowStudyRail(false)}
              aria-hidden="true"
            />
            <aside
              aria-label="Study Companion Drawer"
              className="relative z-10 w-full max-w-md h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-[var(--text-primary)]">Study Companion</span>
                <button
                  type="button"
                  onClick={() => setShowStudyRail(false)}
                  aria-label="Close Study Companion"
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--bg-subtle)] text-[11px] font-semibold">
                  {(
                    [
                      { id: 'ai', label: 'AI Tutor' },
                      { id: 'notes', label: 'Notes' },
                      { id: 'bookmarks', label: 'Saved' },
                      { id: 'downloads', label: 'Files' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setStudyRailTab(t.id)}
                      className={`py-1.5 rounded-lg cursor-pointer ${
                        studyRailTab === t.id
                          ? 'bg-[var(--bg-surface)] text-[var(--accent-text)] shadow-[var(--shadow-sm)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {studyRailTab === 'ai' && (
                  <AiAssistantPanel
                    lessonId={activeLesson?.id}
                    lessonTitle={activeLesson?.title || course.title}
                    courseId={course.id}
                    exerciseId={aiExerciseId}
                    assessmentId={activeAssessment?.assessment.id}
                    initialMode={aiMode}
                    initialCode={aiSeedCode || activeLesson?.starter_code || activeLesson?.code_example}
                    compact
                  />
                )}

                {studyRailTab === 'notes' && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">My Notes</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {activeLesson
                          ? `Attached to: ${activeLesson.title}`
                          : 'Open any lesson to write and sync study notes.'}
                      </p>
                    </div>
                    {activeLesson && (
                      <>
                        <textarea
                          rows={8}
                          value={personalNote}
                          onChange={(e) => {
                            setPersonalNote(e.target.value);
                            setNoteStatus(null);
                          }}
                          placeholder="Summarize key concepts, edge cases, or interview questions..."
                          className="bc-textarea w-full !text-xs"
                        />
                        <button
                          type="button"
                          disabled={savingNote}
                          onClick={saveLessonNote}
                          className="bc-btn-primary w-full !h-9"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{savingNote ? 'Saving...' : 'Save Note to Account'}</span>
                        </button>
                        {noteStatus && <p className="text-[11px] text-[var(--status-success)]">{noteStatus}</p>}
                      </>
                    )}
                  </div>
                )}

                {studyRailTab === 'bookmarks' && (
                  <div className="space-y-2.5 text-xs">
                    <p className="font-bold text-[var(--text-primary)]">Bookmarked Lessons ({bookmarkedLessons.length})</p>
                    {bookmarkedLessons.length === 0 ? (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Bookmark any lesson inside this course to pin quick jump links here.
                      </p>
                    ) : (
                      <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                        {bookmarkedLessons.map((bl) => (
                          <button
                            key={bl.id}
                            type="button"
                            onClick={() => {
                              openLesson(bl.id);
                              setShowStudyRail(false);
                            }}
                            className="w-full py-2.5 px-1 hover:text-[var(--accent-text)] text-left cursor-pointer"
                          >
                            <p className="font-semibold truncate text-[var(--text-primary)]">{bl.title}</p>
                            <p className="text-[10px] text-[var(--text-muted)] tabular-nums">{bl.duration_minutes} min</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {studyRailTab === 'downloads' && (
                  <div className="space-y-3 text-xs">
                    <p className="font-bold text-[var(--text-primary)]">Downloads &amp; Offline Notes</p>
                    {activeLesson ? (
                      <div className="bc-subtle-box p-3 space-y-2">
                        <p className="font-medium flex items-center gap-1.5 text-[var(--text-primary)]">
                          <FileText className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                          <span className="truncate">{activeLesson.downloadable_resource || `${activeLesson.slug}.md`}</span>
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadNotes(activeLesson)}
                          className="bc-btn-secondary w-full !h-8"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Notes</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Select a lesson to export formatted Markdown study sheets and examples.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Verified Certificate Preview & Print Modal */}
        {previewCertificate && (
          <div className="fixed inset-0 z-50 bg-black/70 p-4 flex items-center justify-center">
            <div className="max-w-xl w-full bc-panel p-6 sm:p-8 space-y-5 relative text-center">
              <button
                type="button"
                aria-label="Close certificate preview"
                onClick={() => setPreviewCertificate(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent-text)]">
                Braincode {previewCertificate.status === 'revoked' ? 'Revoked' : 'Verified'} Credential
              </p>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{previewCertificate.course_title}</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Awarded to <span className="font-bold text-[var(--text-primary)]">{previewCertificate.learner_name}</span>
              </p>
              <div className="bc-subtle-box p-3 font-mono text-xs text-[var(--text-primary)]">
                Code: {previewCertificate.certificate_code} · Issued {previewCertificate.issued_at.slice(0, 10)}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                BrainCode Technology Limited · Learn. Build. Innovate. Grow.
              </p>
              <div className="flex justify-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bc-btn-primary"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Catalog Browser View
  return (
    <div className="space-y-8">
      {technologies.length > 0 && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-2">
          <TechnologyBar
            technologies={technologies}
            activeSlug={selectedTech}
            onSelectTechnology={(slug) => {
              if (onSelectTechnology) {
                onSelectTechnology(slug);
              } else {
                setSelectedTech((prev) => (prev === slug ? '' : slug));
              }
            }}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Explore Courses, Technologies &amp; Certificates</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Structured curricula organized by Category → Technology → Learning Path → Course → Module → Lesson.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadCatalog();
          }}
          className="flex items-center gap-2 w-full md:w-auto"
        >
          <div className="relative flex-1 min-w-0 sm:flex-initial">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search technologies or courses..."
              className="bc-input w-full sm:w-64 min-w-0 !pl-9 !text-xs"
            />
          </div>
          <button
            type="submit"
            className="bc-btn-primary shrink-0"
          >
            Search
          </button>
        </form>
      </div>

      {/* Earned Certificates Banner */}
      {certificates.length > 0 && (
        <section className="bc-panel p-5 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2 text-[var(--status-success)]">
            <Award className="w-4 h-4" />
            <span>Your Earned Certificates ({certificates.length})</span>
          </h2>
          <div className="divide-y divide-[var(--border-subtle)]">
            {certificates.map((cert) => {
              const isRevoked = cert.status === 'revoked';
              return (
                <div
                  key={cert.id}
                  className={`py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isRevoked ? 'opacity-80' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)]">{cert.course_title}</p>
                    <p className="text-[var(--text-muted)]">Issued to {cert.learner_name}</p>
                    {isRevoked && cert.revocation_reason && (
                      <p className="text-[11px] text-[var(--status-danger)]">{cert.revocation_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono text-[11px] ${isRevoked ? 'text-[var(--status-danger)] line-through' : 'text-[var(--status-success)]'}`}>
                      {cert.certificate_code}
                    </span>
                    <span className={`text-[11px] font-semibold ${isRevoked ? 'text-[var(--status-danger)]' : 'text-[var(--status-success)]'}`}>
                      {isRevoked ? 'Revoked' : 'Active'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedTech('');
          }}
          aria-label="Filter by category"
          className="bc-select !h-9 !text-xs w-full sm:w-auto"
        >
          <option value="">All Categories ({categories.length})</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>

        {technologies.length > 0 && (
          <select
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
            aria-label="Filter by technology"
            className="bc-select !h-9 !text-xs w-full sm:w-auto"
          >
            <option value="">All Technologies ({technologies.length})</option>
            {technologies.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          aria-label="Filter by difficulty"
          className="bc-select !h-9 !text-xs w-full sm:w-auto"
        >
          <option value="">All Levels</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <select
          value={selectedAccess}
          onChange={(e) => setSelectedAccess(e.target.value as 'all' | 'free' | 'premium')}
          aria-label="Filter by free or premium access"
          className="bc-select !h-9 !text-xs w-full sm:w-auto"
        >
          <option value="all">Free &amp; Pro Courses</option>
          <option value="free">Includes Free Lessons</option>
          <option value="premium">Pro Track Content</option>
        </select>

        {(selectedCategory || selectedTech || selectedDifficulty || selectedAccess !== 'all' || search) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('');
              setSelectedTech('');
              setSelectedDifficulty('');
              setSelectedAccess('all');
              setSearch('');
            }}
            className="text-xs font-semibold text-[var(--accent-text)] hover:underline px-2 cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Learning Paths */}
      {paths.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[var(--text-primary)]">Career Learning Paths ({paths.length})</h2>
            <span className="text-xs text-[var(--text-muted)]">Click a path to inspect milestones &amp; certificates</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paths.map((p) => (
              <div
                key={p.id}
                className="bc-panel p-5 flex flex-col justify-between gap-3"
              >
                <div>
                  <p className="text-xs text-[var(--accent-text)] font-medium tabular-nums">
                    {p.difficulty} · {p.estimated_hours}h · {p.course_ids.length} courses
                  </p>
                  <button
                    type="button"
                    onClick={() => openLearningPathModal(p.slug)}
                    className="text-base font-bold mt-1 text-left text-[var(--text-primary)] hover:text-[var(--accent-text)] cursor-pointer"
                  >
                    {p.title}
                  </button>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{p.description}</p>
                </div>
                <div className="space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--text-secondary)]">
                    {p.course_ids.map((cid, idx) => {
                      const matched = courses.find((c) => c.id === cid);
                      if (!matched) return null;
                      return (
                        <React.Fragment key={cid}>
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <button
                            type="button"
                            onClick={() => loadCourseOutline(matched.slug)}
                            className="font-medium hover:text-[var(--accent-text)] hover:underline cursor-pointer text-left"
                          >
                            {matched.title}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => openLearningPathModal(p.slug)}
                    className="text-xs font-semibold text-[var(--accent-text)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Inspect Milestones &amp; Certificate</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Courses Grid */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Available Courses</h2>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="bc-panel border-dashed p-10 text-center text-sm text-[var(--text-muted)]">
            No courses match your current filter. Clear filters to view all curricula.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {courses.map((course) => (
              <article
                key={course.id}
                className="bc-panel overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[var(--bg-subtle)] overflow-hidden">
                  <img
                    src={course.thumbnail_url || '/src/assets/images/course_fullstack_architecture_1794920076647.jpg'}
                    alt={course.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-xs text-[var(--text-muted)] mb-1.5">
                    {course.category_name} · {course.technology_name} · {course.estimated_hours}h
                  </div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{course.title}</h3>
                  <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-3 flex-1">{course.description}</p>
                  <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--text-muted)] tabular-nums">
                      {course.free_lessons} free · {course.total_lessons} lessons
                    </span>
                    <button
                      type="button"
                      onClick={() => loadCourseOutline(course.slug)}
                      className="bc-btn-primary !h-8 !px-3.5 whitespace-nowrap"
                    >
                      {course.enrolled ? 'Continue Learning' : 'Start Learning'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Career Learning Path Detail Modal */}
      {(selectedPathDetail || pathLoading) && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 overflow-y-auto flex items-start justify-center">
          <div className="max-w-3xl w-full my-8 bc-panel p-6 sm:p-8 space-y-5 relative">
            <button
              type="button"
              aria-label="Close learning path modal"
              onClick={() => setSelectedPathDetail(null)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {pathLoading || !selectedPathDetail ? (
              <div className="h-40 rounded-xl bg-[var(--bg-subtle)] animate-pulse" />
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-text)]">
                    {selectedPathDetail.learningPath.target_role || 'Career Roadmap'} ·{' '}
                    {selectedPathDetail.learningPath.difficulty} · {selectedPathDetail.learningPath.estimated_hours}h
                  </p>
                  <h2 className="text-2xl font-bold mt-1 text-[var(--text-primary)]">{selectedPathDetail.learningPath.title}</h2>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                    {selectedPathDetail.learningPath.overview || selectedPathDetail.learningPath.description}
                  </p>
                </div>

                {selectedPathDetail.learningPath.prerequisites && selectedPathDetail.learningPath.prerequisites.length > 0 && (
                  <div className="bc-subtle-box p-4 text-xs space-y-1.5">
                    <p className="font-bold text-[var(--text-primary)]">Prerequisites</p>
                    <ul className="list-disc pl-4 space-y-1 text-[var(--text-secondary)]">
                      {selectedPathDetail.learningPath.prerequisites.map((pre) => (
                        <li key={pre}>{pre}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedPathDetail.learningPath.milestones && selectedPathDetail.learningPath.milestones.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Path Milestones
                    </h3>
                    <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
                      {selectedPathDetail.learningPath.milestones.map((m) => (
                        <div key={m.step} className="py-2.5 text-xs">
                          <p className="font-bold text-[var(--text-primary)]">
                            Step {m.step}: {m.title}
                          </p>
                          <p className="text-[var(--text-secondary)] mt-0.5">{m.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Included Courses ({selectedPathDetail.courses.length})
                  </h3>
                  <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl px-3.5">
                    {selectedPathDetail.courses.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedPathDetail(null);
                          loadCourseOutline(c.slug);
                        }}
                        className="w-full py-3 text-left flex items-center justify-between gap-3 cursor-pointer hover:text-[var(--accent-text)]"
                      >
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{c.title}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {c.technology_name} · {c.difficulty} · {c.estimated_hours}h
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPathDetail.projectTemplates.length > 0 && (
                  <ProjectAssignmentPanel projectTemplates={selectedPathDetail.projectTemplates} />
                )}

                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
                  {selectedPathDetail.certificate ? (
                    <div className="text-xs text-[var(--status-success)] font-mono">
                      Verified Certificate: {selectedPathDetail.certificate.certificate_code}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        claimPathCertificate(selectedPathDetail.learningPath.id, selectedPathDetail.learningPath.slug)
                      }
                      className="bc-btn-primary"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Claim Career Path Certificate</span>
                    </button>
                  )}
                  {pathCertMsg && (
                    <p className={`text-xs ${pathCertMsg.ok ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'}`}>
                      {pathCertMsg.text}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
