import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardCheck,
  Clock,
  HelpCircle,
  Lock,
  Maximize2,
  Minimize2,
  PlayCircle,
  Search,
  X,
} from 'lucide-react';
import type { CertificateItem, Course, CourseTopic, LessonOutlineItem } from '../types';

export interface NumberedOutlineModule {
  id: string;
  title: string;
  topic: string;
  topics?: CourseTopic[];
  lessons: LessonOutlineItem[];
}

export interface NumberedOutlineAssessment {
  id: string;
  title: string;
  type: string;
  mode: string;
  time_limit_sec: number;
  xp_reward: number;
  passing_score_pct?: number;
  max_attempts?: number;
}

interface CertificateEligibilityInfo {
  eligible: boolean;
  completionRule: string;
  totalLessons: number;
  completedLessons: number;
  totalAssessments: number;
  passedAssessments: number;
  reason: string;
}

interface NumberedCourseOutlineProps {
  course: Course;
  modules: NumberedOutlineModule[];
  assessments: NumberedOutlineAssessment[];
  assignmentsCount: number;
  projectTemplatesCount: number;
  activeLessonId?: string;
  activeAssessmentId?: string;
  stageMode: 'overview' | 'lesson' | 'assessment' | 'assignments';
  completedCount: number;
  totalCount: number;
  certificateEligibility?: CertificateEligibilityInfo | null;
  existingCert?: CertificateItem;
  certStatus: { ok: boolean; text: string } | null;
  onSelectOverview: () => void;
  onSelectLesson: (lessonId: string) => void;
  onSelectAssessment: (assessmentId: string) => void;
  onSelectAssignments: () => void;
  onClaimCertificate: (courseId: string) => void;
  onEnroll: (courseId: string) => void;
  compact: boolean;
  onToggleCompact: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  stickyClassName?: string;
  desktopVisible?: boolean;
  courseSelector?: React.ReactNode;
}

interface NumberedLessonNode extends LessonOutlineItem {
  seqNumber: string;
}

interface TopicTreeBranch {
  id: string;
  topicNumber: string;
  title: string;
  lessons: NumberedLessonNode[];
}

export function NumberedCourseOutline({
  course,
  modules,
  assessments,
  assignmentsCount,
  projectTemplatesCount,
  activeLessonId,
  activeAssessmentId,
  stageMode,
  completedCount,
  totalCount,
  certificateEligibility,
  existingCert,
  certStatus,
  onSelectOverview,
  onSelectLesson,
  onSelectAssessment,
  onSelectAssignments,
  onClaimCertificate,
  onEnroll,
  compact,
  onToggleCompact,
  mobileOpen = false,
  onCloseMobile,
  stickyClassName = 'lg:top-[102px] lg:h-[calc(100vh-102px)]',
  desktopVisible = true,
  courseSelector,
}: NumberedCourseOutlineProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
  const treeScrollRef = useRef<HTMLElement | null>(null);
  const activeLessonBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastAutoExpandedLessonRef = useRef<string | undefined>(undefined);

  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Build deterministic 3-level hierarchy: Module (1.) -> Numbered Topic (1.1) -> Numbered Lesson (01.)
  const numberedModules = useMemo(() => {
    let seq = 0;
    const q = filterQuery.trim().toLowerCase();

    return modules.map((mod, mIdx) => {
      const allItems: NumberedLessonNode[] = mod.lessons.map((les) => {
        seq += 1;
        return {
          ...les,
          seqNumber: String(seq).padStart(2, '0'),
        };
      });

      const visibleItems = q
        ? allItems.filter(
            (les) =>
              les.title.toLowerCase().includes(q) ||
              (les.topic_name || '').toLowerCase().includes(q) ||
              mod.title.toLowerCase().includes(q) ||
              les.seqNumber.includes(q)
          )
        : allItems;

      // Group visibleItems into numbered topics cleanly using topic_id / topic_name / mod.topics
      const branchMap = new Map<string, { id: string; title: string; lessons: NumberedLessonNode[] }>();
      const topicCatalog = mod.topics || [];

      const findCatalogTopic = (les: NumberedLessonNode): CourseTopic | undefined => {
        if (les.topic_id) {
          const byId = topicCatalog.find((tp) => tp.id === les.topic_id);
          if (byId) return byId;
        }
        const tName = (les.topic_name || '').trim().toLowerCase();
        if (tName) {
          return topicCatalog.find((tp) => tp.title.trim().toLowerCase() === tName);
        }
        return undefined;
      };

      for (const les of visibleItems) {
        const matchedCatalogTopic = findCatalogTopic(les);
        const branchTitle = (matchedCatalogTopic?.title || les.topic_name || mod.topic || mod.title || 'Core Topic').trim();
        const branchKey = matchedCatalogTopic?.id || `mod_${mod.id}_top_${branchTitle.toLowerCase()}`;
        const existing = branchMap.get(branchKey);
        if (existing) {
          existing.lessons.push(les);
        } else {
          branchMap.set(branchKey, {
            id: branchKey,
            title: branchTitle,
            lessons: [les],
          });
        }
      }

      const topicBranches: TopicTreeBranch[] = Array.from(branchMap.values()).map((branch, tIdx) => ({
        id: branch.id,
        topicNumber: `${mIdx + 1}.${tIdx + 1}`,
        title: branch.title,
        lessons: branch.lessons,
      }));

      return {
        ...mod,
        moduleNumber: mIdx + 1,
        allItems,
        visibleItems,
        topicBranches,
      };
    });
  }, [modules, filterQuery]);

  // Auto-expand the module + topic containing the newly selected lesson and scroll ONLY inside the sidebar nav
  useEffect(() => {
    if (!activeLessonId) return;
    if (lastAutoExpandedLessonRef.current === activeLessonId) return;
    lastAutoExpandedLessonRef.current = activeLessonId;

    for (const mod of numberedModules) {
      const matchedBranch = mod.topicBranches.find((tb) => tb.lessons.some((l) => l.id === activeLessonId));
      if (matchedBranch) {
        setCollapsedModules((prev) => (prev[mod.id] ? { ...prev, [mod.id]: false } : prev));
        setCollapsedTopics((prev) => (prev[matchedBranch.id] ? { ...prev, [matchedBranch.id]: false } : prev));
        break;
      }
    }

    const timer = window.setTimeout(() => {
      const navEl = treeScrollRef.current;
      const btnEl = activeLessonBtnRef.current;
      if (!navEl || !btnEl) return;
      const navRect = navEl.getBoundingClientRect();
      const btnRect = btnEl.getBoundingClientRect();
      const margin = 12;
      if (btnRect.top < navRect.top + margin) {
        navEl.scrollTo({
          top: Math.max(0, navEl.scrollTop + (btnRect.top - navRect.top) - margin),
          behavior: 'smooth',
        });
      } else if (btnRect.bottom > navRect.bottom - margin) {
        navEl.scrollTo({
          top: navEl.scrollTop + (btnRect.bottom - navRect.bottom) + margin,
          behavior: 'smooth',
        });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [activeLessonId, numberedModules]);

  const toggleModule = (modId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const toggleTopic = (topicId: string) => {
    setCollapsedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const allTopicIds = useMemo(
    () => numberedModules.flatMap((m) => m.topicBranches.map((tb) => tb.id)),
    [numberedModules]
  );

  const hasAnyCollapsed = useMemo(
    () =>
      modules.some((m) => Boolean(collapsedModules[m.id])) ||
      allTopicIds.some((tid) => Boolean(collapsedTopics[tid])),
    [modules, allTopicIds, collapsedModules, collapsedTopics]
  );

  const handleToggleAllTree = () => {
    if (hasAnyCollapsed) {
      setCollapsedModules({});
      setCollapsedTopics({});
    } else {
      const nextMods: Record<string, boolean> = {};
      modules.forEach((m) => {
        nextMods[m.id] = true;
      });
      const nextTopics: Record<string, boolean> = {};
      allTopicIds.forEach((tid) => {
        nextTopics[tid] = true;
      });
      setCollapsedModules(nextMods);
      setCollapsedTopics(nextTopics);
    }
  };

  const inProgressCount = useMemo(
    () =>
      modules.reduce(
        (sum, mod) =>
          sum + mod.lessons.filter((l) => !l.completed && l.progress_status === 'in_progress').length,
        0
      ),
    [modules]
  );

  const outlineBody = (
    <div className="flex flex-col h-full min-h-0">
      {/* Pinned Sidebar Header */}
      <div className="px-4 py-3.5 border-b border-[var(--border-default)] bg-[var(--bg-surface)] space-y-2.5 shrink-0">
        {courseSelector && <div>{courseSelector}</div>}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-[#0A84FF] dark:text-[#38BDF8] font-semibold truncate">
              Curriculum · {course.difficulty}
            </p>
            <h2 className="text-sm font-bold mt-0.5 leading-snug text-[var(--text-primary)] line-clamp-2">
              {course.title}
            </h2>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tabular-nums truncate">
              {course.technology_name || course.category_name} · {course.estimated_hours}h
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleCompact}
              title={compact ? 'Comfortable spacing' : 'Compact outline'}
              aria-label={compact ? 'Comfortable spacing' : 'Compact outline'}
              className="p-1.5 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
            >
              {compact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close course outline"
                className="lg:hidden min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Summary (Maintains completed + in_progress + not_started states) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] tabular-nums">
            <span className="text-[var(--text-secondary)] font-medium">
              {completedCount}/{totalCount} completed
              {inProgressCount > 0 ? ` · ${inProgressCount} in progress` : ''}
            </span>
            <span className="font-semibold tabular-nums text-[#0A84FF] dark:text-[#38BDF8]">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
            <div
              className="h-full bg-[#0A84FF] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {!course.enrolled && (
          <button
            type="button"
            onClick={() => onEnroll(course.id)}
            className="w-full py-2 px-3 rounded-lg bg-[#0A84FF] hover:bg-[#006EE6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
          >
            Enroll Free to Save Progress
          </button>
        )}

        {/* Overview, Tree Expand/Collapse & Filter */}
        <div className="space-y-2 pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSelectOverview();
                onCloseMobile?.();
              }}
              className={`flex-1 min-w-0 text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-workspace cursor-pointer ${
                stageMode === 'overview'
                  ? 'border-2 border-[#E11D48] bg-[#E11D48]/[0.06] dark:bg-[#E11D48]/15 text-[var(--text-primary)]'
                  : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" />
              <span className="truncate">Overview</span>
            </button>

            <button
              type="button"
              data-testid="curriculum-expand-toggle"
              onClick={handleToggleAllTree}
              title={hasAnyCollapsed ? 'Expand all modules & topics' : 'Collapse all modules & topics'}
              className="px-2.5 py-2 rounded-lg border border-[var(--border-default)] text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {hasAnyCollapsed ? (
                <>
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  <span>Expand all</span>
                </>
              ) : (
                <>
                  <ChevronsDownUp className="w-3.5 h-3.5" />
                  <span>Collapse all</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter topics or lessons..."
              aria-label="Filter course outline lessons"
              className="w-full h-8 pl-8 pr-7 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#0A84FF]"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery('')}
                aria-label="Clear outline filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Independently Scrollable Hierarchical Curriculum Tree */}
      <nav
        ref={treeScrollRef}
        aria-label="Curriculum modules and numbered topics"
        data-testid="curriculum-tree-scroll"
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3.5 space-y-3.5"
      >
        {numberedModules.map((mod) => {
          if (filterQuery.trim() && mod.visibleItems.length === 0) return null;
          const isModuleCollapsed = !filterQuery.trim() && Boolean(collapsedModules[mod.id]);
          const modCompleted = mod.allItems.filter((l) => l.completed).length;
          const modulePanelId = `module-panel-${mod.id}`;

          return (
            <section key={mod.id} className="space-y-1">
              {/* Level 1: Numbered Module Group Header */}
              <button
                type="button"
                data-module-id={mod.id}
                aria-expanded={!isModuleCollapsed}
                aria-controls={modulePanelId}
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[var(--bg-subtle)] group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isModuleCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span className="font-mono text-[11px] font-bold text-[#0A84FF] dark:text-[#38BDF8] tabular-nums shrink-0">
                    {mod.moduleNumber}.
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[#0A84FF]">
                    {mod.title}
                  </span>
                </div>
                <span className="text-[11px] tabular-nums text-[var(--text-muted)] shrink-0">
                  {modCompleted}/{mod.allItems.length}
                </span>
              </button>

              {/* Level 2: Numbered Topic Groups -> Level 3: Numbered Lessons */}
              {!isModuleCollapsed && (
                <div
                  id={modulePanelId}
                  className="pl-2.5 ml-2.5 border-l border-[var(--border-default)] space-y-2 pt-0.5"
                >
                  {mod.topicBranches.map((topic) => {
                    const isTopicCollapsed = !filterQuery.trim() && Boolean(collapsedTopics[topic.id]);
                    const topicCompleted = topic.lessons.filter((l) => l.completed).length;
                    const hasActiveLessonInTopic =
                      stageMode === 'lesson' &&
                      Boolean(activeLessonId && topic.lessons.some((l) => l.id === activeLessonId));
                    const topicPanelId = `topic-panel-${topic.id}`;

                    return (
                      <div key={topic.id} className="space-y-0.5">
                        {/* Numbered Topic Group Header */}
                        <button
                          type="button"
                          data-topic-id={topic.id}
                          aria-expanded={!isTopicCollapsed}
                          aria-controls={topicPanelId}
                          onClick={() => toggleTopic(topic.id)}
                          className={`w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                            hasActiveLessonInTopic && isTopicCollapsed
                              ? 'bg-[#E11D48]/[0.07] dark:bg-[#E11D48]/15'
                              : 'hover:bg-[var(--bg-subtle)]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 min-w-0">
                            {isTopicCollapsed ? (
                              <ChevronRight className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                            )}
                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                                hasActiveLessonInTopic
                                  ? 'bg-[#E11D48]/12 text-[#E11D48]'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                              }`}
                            >
                              {topic.topicNumber}
                            </span>
                            <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                              {topic.title}
                            </span>
                          </span>
                          <span className="text-[10px] tabular-nums text-[var(--text-muted)] shrink-0">
                            {topicCompleted}/{topic.lessons.length}
                          </span>
                        </button>

                        {/* Numbered Lessons inside Collapsible Topic Group */}
                        {!isTopicCollapsed && (
                          <div
                            id={topicPanelId}
                            role="group"
                            aria-label={`${topic.topicNumber} ${topic.title}`}
                            className="pl-2 space-y-0.5 pt-0.5"
                          >
                            {topic.lessons.map((les) => {
                              const isActive = activeLessonId === les.id && stageMode === 'lesson';
                              const statusKey = les.completed
                                ? 'completed'
                                : les.progress_status === 'in_progress'
                                  ? 'in_progress'
                                  : 'not_started';

                              return (
                                <button
                                  key={les.id}
                                  ref={isActive ? activeLessonBtnRef : undefined}
                                  type="button"
                                  data-lesson-id={les.id}
                                  data-active-lesson={isActive ? 'true' : 'false'}
                                  data-progress-status={statusKey}
                                  aria-current={isActive ? 'step' : undefined}
                                  onClick={() => {
                                    onSelectLesson(les.id);
                                    onCloseMobile?.();
                                  }}
                                  className={`w-full text-left rounded-lg text-xs flex items-center justify-between gap-2 transition-workspace cursor-pointer ${
                                    compact ? 'px-2.5 py-1.5' : 'px-2.5 py-2'
                                  } ${
                                    isActive
                                      ? 'border-2 border-[#E11D48] bg-[var(--bg-surface)] dark:bg-[#E11D48]/12 text-[var(--text-primary)] font-semibold'
                                      : 'border border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`font-mono text-[11px] tabular-nums shrink-0 ${
                                        isActive
                                          ? 'text-[#E11D48] font-bold'
                                          : les.completed
                                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                            : les.progress_status === 'in_progress'
                                              ? 'text-[#0A84FF] font-semibold'
                                              : 'text-[var(--text-muted)]'
                                      }`}
                                    >
                                      {les.seqNumber}.
                                    </span>
                                    <span className="truncate">{les.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {!compact && statusKey === 'in_progress' && (
                                      <span className="text-[10px] font-semibold text-[#0A84FF] dark:text-[#38BDF8] whitespace-nowrap">
                                        Active
                                      </span>
                                    )}
                                    {!compact && statusKey !== 'in_progress' && (
                                      <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                                        {les.duration_minutes}m
                                      </span>
                                    )}
                                    {les.completed ? (
                                      <CheckCircle2
                                        className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                                        aria-label="Completed"
                                      />
                                    ) : les.progress_status === 'in_progress' ? (
                                      <Clock
                                        className="w-3.5 h-3.5 text-[#0A84FF] shrink-0"
                                        aria-label="In progress"
                                      />
                                    ) : les.access_tier === 'premium' ? (
                                      <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-label="Pro lesson" />
                                    ) : (
                                      <PlayCircle
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isActive ? 'text-[#E11D48]' : 'text-[var(--text-muted)]/60'
                                        }`}
                                        aria-label="Not started"
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

        {/* Quizzes & Final Exam */}
        {assessments.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-default)] space-y-1.5">
            <p className="px-1 text-xs font-bold text-[var(--text-secondary)]">Quizzes &amp; Final Exam</p>
            {assessments.map((asm) => {
              const isActive = activeAssessmentId === asm.id && stageMode === 'assessment';
              return (
                <button
                  key={asm.id}
                  type="button"
                  onClick={() => {
                    onSelectAssessment(asm.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-workspace cursor-pointer ${
                    isActive
                      ? 'border-2 border-[#E11D48] bg-[#E11D48]/[0.06] dark:bg-[#E11D48]/15 font-semibold text-[var(--text-primary)]'
                      : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium truncate">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">{asm.title}</span>
                  </span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0 tabular-nums">
                    {asm.passing_score_pct || 70}%
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Assignments & Projects */}
        {(assignmentsCount > 0 || projectTemplatesCount > 0) && (
          <div className="pt-3 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => {
                onSelectAssignments();
                onCloseMobile?.();
              }}
              className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 transition-workspace cursor-pointer ${
                stageMode === 'assignments'
                  ? 'border-2 border-[#E11D48] bg-[#E11D48]/[0.06] dark:bg-[#E11D48]/15 text-[var(--text-primary)]'
                  : 'border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <ClipboardCheck className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" />
                <span className="truncate">Assignments &amp; Projects</span>
              </span>
              <span className="font-mono text-[11px] tabular-nums shrink-0">
                {assignmentsCount + projectTemplatesCount}
              </span>
            </button>
          </div>
        )}

        {/* Certificate Eligibility */}
        {totalCount > 0 && (
          <div className="pt-3 border-t border-[var(--border-default)] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5 text-[var(--text-primary)]">
                <Award className="w-4 h-4 text-[#0A84FF]" />
                <span>Certificate</span>
              </span>
              <span className="font-mono tabular-nums text-[11px] text-[var(--text-muted)]">
                {completedCount}/{totalCount}
              </span>
            </div>
            {certificateEligibility && (
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                {certificateEligibility.reason}
              </p>
            )}
            {existingCert?.status === 'revoked' ? (
              <div className="p-2.5 rounded-lg border border-red-500/30 bg-[var(--status-danger-soft)] text-[var(--status-danger)] text-[11px] space-y-1">
                <p className="font-bold">Certificate Revoked</p>
                <p>{existingCert.revocation_reason || 'Contact support for reinstatement.'}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onClaimCertificate(course.id)}
                className="w-full py-2 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] hover:border-[#0A84FF] text-[#0A84FF] dark:text-[#38BDF8] text-xs font-semibold cursor-pointer"
              >
                {existingCert ? 'View Issued Certificate' : 'Claim Completion Certificate'}
              </button>
            )}
            {certStatus && (
              <p className={`text-[11px] ${certStatus.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {certStatus.text}
              </p>
            )}
          </div>
        )}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Left-Aligned Independently Scrollable Sidebar */}
      <aside
        data-testid="curriculum-sidebar"
        aria-label="Course syllabus navigation"
        className={`${
          desktopVisible ? 'hidden lg:flex lg:flex-col lg:w-[288px] xl:w-[304px] shrink-0' : 'hidden'
        } border-r border-[var(--border-default)] bg-[var(--bg-surface)] lg:sticky overflow-hidden overscroll-contain ${stickyClassName}`}
      >
        {outlineBody}
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/55"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            aria-label="Mobile course syllabus navigation"
            className="relative z-10 w-[86vw] max-w-sm h-full bg-[var(--bg-surface)] border-r border-[var(--border-default)] flex flex-col overflow-hidden overscroll-contain"
          >
            {outlineBody}
          </aside>
        </div>
      )}
    </>
  );
}
