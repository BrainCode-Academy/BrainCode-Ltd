import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Compass,
  FileCode2,
  FolderKanban,
  HelpCircle,
  ListChecks,
  Menu,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type {
  Course,
  LearningCentreSectionDef,
  ProjectTemplate,
  TechnologyLearningCentre as TechnologyLearningCentreData,
} from '../types';

interface TechnologyLearningCentreProps {
  techName: string;
  techSlug: string;
  centre: TechnologyLearningCentreData;
  courses: Array<
    Course & {
      assessments: Array<{ id: string; title: string; type: string; mode: string; xp_reward: number; passing_score_pct?: number }>;
    }
  >;
  projectTemplates?: ProjectTemplate[];
  onOpenCourse: (courseSlug: string, lessonId?: string) => void;
  onLoadCodeInEditor: (code: string, language?: string, autoRun?: boolean) => void;
  onOpenAiTutor?: (techName: string) => void;
}

const SECTION_GROUP_LABELS: Record<LearningCentreSectionDef['group'], string> = {
  curriculum: 'Core Curriculum',
  practice: 'Projects & Labs',
  planning: 'Study Plan & Career',
  certification: 'Certification',
  reference: 'References & Tools',
};

const SQL_SANDBOX_TABLES = [
  { name: 'departments', cols: 'id, name, budget', sample: 'SELECT id, name, budget FROM departments ORDER BY budget DESC;' },
  { name: 'employees', cols: 'id, name, department_id, role, salary', sample: 'SELECT name, role, salary FROM employees ORDER BY salary DESC;' },
  { name: 'courses', cols: 'id, title, category, difficulty, hours', sample: 'SELECT title, difficulty, hours FROM courses;' },
  { name: 'orders', cols: 'id, learner_name, course_id, amount_usd, status', sample: 'SELECT status, COUNT(*) AS orders_count, SUM(amount_usd) AS revenue FROM orders GROUP BY status;' },
];

export function TechnologyLearningCentre({
  techName,
  techSlug,
  centre,
  courses,
  projectTemplates = [],
  onOpenCourse,
  onLoadCodeInEditor,
  onOpenAiTutor,
}: TechnologyLearningCentreProps) {
  const [activeSectionId, setActiveSectionId] = useState<string>(centre.sections[0]?.id || 'tutorial');
  const [topicSearch, setTopicSearch] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [mobileOutlineOpen, setMobileOutlineOpen] = useState(false);
  const [expandedInterviewIds, setExpandedInterviewIds] = useState<Record<string, boolean>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  // Interactive PX <-> EM Converter State (HTML / CSS only)
  const [baseFontPx, setBaseFontPx] = useState<string>('16');
  const [pxInput, setPxInput] = useState<string>('24');
  const [emInput, setEmInput] = useState<string>('1.5');

  useEffect(() => {
    setActiveSectionId(centre.sections[0]?.id || 'tutorial');
    setTopicSearch('');
    setRefSearch('');
    setMobileOutlineOpen(false);
    setExpandedInterviewIds({});
    setRevealedHints({});
  }, [techSlug, centre.sections]);

  const activeSection = useMemo(
    () => centre.sections.find((s) => s.id === activeSectionId) || centre.sections[0],
    [centre.sections, activeSectionId]
  );

  const groupedSections = useMemo(() => {
    const order: LearningCentreSectionDef['group'][] = ['curriculum', 'practice', 'planning', 'certification', 'reference'];
    return order
      .map((grp) => ({
        group: grp,
        label: SECTION_GROUP_LABELS[grp],
        items: centre.sections.filter((s) => s.group === grp),
      }))
      .filter((g) => g.items.length > 0);
  }, [centre.sections]);

  const trimmedTopicQuery = topicSearch.trim().toLowerCase();

  const visibleTopicGroups = useMemo(() => {
    if (trimmedTopicQuery) {
      return centre.topicGroups
        .map((grp) => ({
          ...grp,
          topics: grp.topics.filter((t) => {
            const hay = `${t.title} ${t.subtopics.join(' ')} ${grp.title}`.toLowerCase();
            return hay.includes(trimmedTopicQuery);
          }),
        }))
        .filter((grp) => grp.topics.length > 0);
    }
    return centre.topicGroups.filter((grp) => grp.sectionId === activeSection?.id);
  }, [centre.topicGroups, activeSection?.id, trimmedTopicQuery]);

  const filteredReferences = useMemo(() => {
    const q = refSearch.trim().toLowerCase();
    if (!q) return centre.references;
    return centre.references
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
  }, [centre.references, refSearch]);

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

  const handleSelectSection = (id: string) => {
    setActiveSectionId(id);
    setTopicSearch('');
    setMobileOutlineOpen(false);
  };

  const renderSidebarNav = () => (
    <nav aria-label={`${techName} Learning Centre Sections`} className="space-y-4">
      {groupedSections.map((grp) => (
        <div key={grp.group} className="space-y-1">
          <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            {grp.label}
          </p>
          <div className="space-y-0.5">
            {grp.items.map((sec) => {
              const isActive = !trimmedTopicQuery && activeSection?.id === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  data-testid={`lc-section-${sec.id}`}
                  onClick={() => handleSelectSection(sec.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-white font-semibold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate">
                    <span className={`font-mono text-[11px] mr-1.5 tabular-nums ${isActive ? 'text-white/80' : 'text-[var(--text-muted)]'}`}>
                      {String(sec.order).padStart(2, '0')}
                    </span>
                    {sec.label}
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}`} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const renderTopicGroups = (groups: TechnologyLearningCentreData['topicGroups']) => {
    if (groups.length === 0) {
      return (
        <div className="rounded-xl border border-[var(--border-default)] p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--text-primary)]">No matching topics found</p>
          <p className="text-xs text-[var(--text-muted)]">
            Clear your search query or choose another section from the Learning Centre outline.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {groups.map((grp) => (
          <div
            key={grp.id}
            className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{grp.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{grp.description}</p>
              </div>
              <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums shrink-0">
                {grp.topics.length} topic{grp.topics.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {grp.topics.map((topic, idx) => {
                const isInteractive = topic.status === 'available' && Boolean(topic.lessonId && topic.courseSlug);
                return (
                  <div
                    key={topic.id}
                    className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                          {topic.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        <span>{topic.difficulty}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{topic.estimatedMinutes} min</span>
                        <span aria-hidden="true"> · </span>
                        <span className={isInteractive ? 'text-[var(--status-success)] font-medium' : 'text-[var(--text-muted)]'}>
                          {isInteractive ? 'Interactive Lesson Ready' : topic.status === 'in_development' ? 'Curriculum Outline' : 'Roadmap Topic'}
                        </span>
                      </p>
                      {topic.subtopics.length > 0 && (
                        <p className="text-xs text-[var(--text-secondary)]">
                          {topic.subtopics.join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      {isInteractive && topic.courseSlug && topic.lessonId ? (
                        <button
                          type="button"
                          onClick={() => onOpenCourse(topic.courseSlug!, topic.lessonId!)}
                          className="bc-btn-secondary !h-8 !px-3 text-xs !border-[var(--accent-primary)]/40 !text-[var(--accent-text)] whitespace-nowrap shrink-0"
                        >
                          Open Lesson →
                        </button>
                      ) : courses[0] ? (
                        <button
                          type="button"
                          onClick={() => onOpenCourse(courses[0].slug)}
                          className="bc-btn-secondary !h-8 !px-3 text-xs whitespace-nowrap shrink-0"
                        >
                          Study in Course →
                        </button>
                      ) : onOpenAiTutor ? (
                        <button
                          type="button"
                          onClick={() => onOpenAiTutor(`${techName}: ${topic.title}`)}
                          className="bc-btn-secondary !h-8 !px-3 text-xs whitespace-nowrap shrink-0"
                        >
                          Explore Topic
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSectionContent = () => {
    if (trimmedTopicQuery) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-secondary)]">
              Showing curriculum matches for <span className="font-semibold text-[var(--text-primary)]">"{topicSearch}"</span>
            </p>
            <button
              type="button"
              onClick={() => setTopicSearch('')}
              className="text-xs font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
            >
              Clear search
            </button>
          </div>
          {renderTopicGroups(visibleTopicGroups)}
        </div>
      );
    }

    const secId = activeSection?.id || 'tutorial';

    if (secId === 'projects') {
      const projectGroups = centre.topicGroups.filter(
        (g) => g.sectionId === 'projects' || g.topics.some((t) => t.kind === 'project')
      );
      return (
        <div className="space-y-6">
          {centre.websiteProject && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
              <div className="p-4 sm:p-5 border-l-2 border-[var(--accent-primary)] bg-[var(--accent-soft)] flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                    Capstone Build
                  </p>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">{centre.websiteProject.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{centre.websiteProject.summary}</p>
                </div>
                {courses[0] && (
                  <button
                    type="button"
                    onClick={() => onOpenCourse(courses[0].slug)}
                    className="bc-btn-primary !h-9 !px-3.5 text-xs whitespace-nowrap shrink-0"
                  >
                    Start Capstone in Workspace
                  </button>
                )}
              </div>
              {centre.websiteProject.phases.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] border-t border-[var(--border-default)]">
                  {centre.websiteProject.phases.map((ph) => (
                    <div key={ph.phase} className="p-4 space-y-1.5">
                      <p className="text-[11px] font-mono text-[var(--accent-text)]">{ph.phase}</p>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{ph.title}</p>
                      <ul className="space-y-1 text-[11px] text-[var(--text-secondary)] list-disc pl-4">
                        {ph.deliverables.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {projectGroups.length > 0 && renderTopicGroups(projectGroups)}

          {projectTemplates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Applied Project Templates</span>
              </h3>
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                {projectTemplates.map((tpl) => (
                  <div key={tpl.id} className="p-4 space-y-1">
                    <p className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {tpl.difficulty} · {tpl.estimated_hours}h
                    </p>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{tpl.title}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">{tpl.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (secId === 'examples') {
      return (
        <div className="space-y-4">
          {centre.guidedExamples.map((ex) => (
            <div
              key={ex.id}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--accent-text)]">{ex.topic}</p>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{ex.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onLoadCodeInEditor(ex.code, ex.language, true)}
                  className="bc-btn-primary !h-8 !px-3 text-xs whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Load in Try-It Editor</span>
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-[var(--text-secondary)]">{ex.description}</p>
                <pre className="p-3.5 rounded-lg border border-slate-800 bg-[#0B111C] text-slate-100 font-mono text-xs overflow-x-auto max-h-56">
                  {ex.code}
                </pre>
                <p className="text-[11px] text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-primary)]">Expected Behavior:</span> {ex.expectedOutput}
                </p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (secId === 'challenges') {
      const quizAssessments = courses.flatMap((c) =>
        (c.assessments || []).map((a) => ({ ...a, courseSlug: c.slug, courseTitle: c.title }))
      );
      return (
        <div className="space-y-6">
          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
            {centre.challenges.map((ch) => (
              <div key={ch.id} className="p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--accent-text)] tabular-nums">
                      {ch.difficulty} · {ch.estimatedMinutes} min · +{ch.xpReward} XP
                    </p>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{ch.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{ch.objective}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoadCodeInEditor(ch.starterCode, undefined, false)}
                    className="bc-btn-primary !h-8 !px-3 text-xs whitespace-nowrap shrink-0"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Load Starter Code</span>
                  </button>
                </div>

                <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] p-3 rounded-lg border border-[var(--border-subtle)]">
                  {ch.prompt}
                </p>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setRevealedHints((prev) => ({ ...prev, [ch.id]: !prev[ch.id] }))}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{revealedHints[ch.id] ? 'Hide Hint' : 'Show Hint'}</span>
                  </button>
                </div>

                {revealedHints[ch.id] && (
                  <p className="text-xs text-[var(--text-primary)] bg-[var(--status-warning-soft)] border-l-2 border-[var(--status-warning)] rounded-r-lg p-3">
                    {ch.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          {quizAssessments.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[var(--border-default)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--status-warning)]" />
                <span>Interactive Course Quizzes &amp; Graded Assessments</span>
              </h3>
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                {quizAssessments.map((asm) => (
                  <div
                    key={asm.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] text-[var(--text-muted)] capitalize tabular-nums">
                        {asm.type} · {asm.mode} · +{asm.xp_reward} XP
                      </p>
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate mt-0.5">{asm.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenCourse(asm.courseSlug)}
                      className="bc-btn-secondary !h-8 !px-3 text-xs whitespace-nowrap shrink-0"
                    >
                      Open Quiz →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (secId === 'syllabus') {
      return (
        <div className="space-y-6">
          {centre.syllabusSummary.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Curriculum Syllabus Units</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] divide-y sm:divide-y-0 sm:gap-px sm:bg-[var(--border-subtle)] overflow-hidden">
                {centre.syllabusSummary.map((unit) => (
                  <div
                    key={unit.unit}
                    className="p-4 bg-[var(--bg-surface)] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                        {unit.unit}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                        ~{unit.hours}h
                      </span>
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{unit.title}</h4>
                    <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc pl-4">
                      {unit.outcomes.map((out, i) => (
                        <li key={i}>{out}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Week-by-Week Study Plan</span>
            </h3>
            <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
              {centre.studyPlan.map((wk) => (
                <div key={wk.week} className="p-4 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)] tabular-nums">
                    Week {wk.week} · Est. {wk.estimatedHours} hours
                  </p>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{wk.title}</h4>
                  <p className="text-xs text-[var(--text-secondary)]">{wk.focus}</p>
                  <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc pl-4 pt-1">
                    {wk.milestones.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (secId === 'interview') {
      return (
        <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
          {centre.interviewPrep.map((q) => {
            const expanded = Boolean(expandedInterviewIds[q.id]);
            return (
              <div key={q.id}>
                <button
                  type="button"
                  onClick={() => setExpandedInterviewIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                  className="w-full p-4 text-left flex items-start justify-between gap-3 hover:bg-[var(--bg-subtle)] cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[var(--accent-text)]">{q.level} Level</p>
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{q.question}</h3>
                  </div>
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-1" />
                  )}
                </button>
                {expanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]/40 space-y-2.5 text-xs">
                    <p className="text-[var(--text-secondary)] leading-relaxed">{q.sampleAnswer}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-primary)]">Key Signals:</span>{' '}
                      {q.keyPoints.join(' · ')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (secId === 'best_practices') {
      return (
        <div className="space-y-5">
          {centre.summaryPoints.length > 0 && (
            <div className="bc-subtle-box p-4 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Executive Chapter Summary
              </h3>
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                {centre.summaryPoints.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success)] shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
            {centre.bestPractices.map((bp) => (
              <div key={bp.id} className="p-4 sm:p-5 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold text-[var(--accent-text)]">{bp.category}</p>
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{bp.title}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-r-lg border-l-2 border-[var(--status-success)] bg-[var(--status-success-soft)] p-3 space-y-1">
                    <p className="text-[11px] font-bold text-[var(--status-success)]">Recommended Practice</p>
                    <p className="text-[var(--text-secondary)]">{bp.guidance}</p>
                  </div>
                  <div className="rounded-r-lg border-l-2 border-[var(--status-danger)] bg-[var(--status-danger-soft)] p-3 space-y-1">
                    <p className="text-[11px] font-bold text-[var(--status-danger)]">Common Anti-Pattern</p>
                    <p className="text-[var(--text-secondary)]">{bp.antiPattern}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (secId === 'certification') {
      return (
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                  Verified Credential Blueprint
                </p>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] mt-0.5">
                  {centre.certification.examTitle}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {centre.certification.prerequisiteSummary}
                </p>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-lg bg-[var(--bg-surface)] text-xs font-mono tabular-nums shrink-0">
                <div className="px-3 py-2">
                  <span className="block text-[10px] text-[var(--text-muted)]">PASS MARK</span>
                  <span className="font-bold text-[var(--status-success)]">{centre.certification.passingScorePct}%</span>
                </div>
                <div className="px-3 py-2">
                  <span className="block text-[10px] text-[var(--text-muted)]">DURATION</span>
                  <span className="font-bold text-[var(--text-primary)]">{centre.certification.durationMinutes}m</span>
                </div>
                <div className="px-3 py-2">
                  <span className="block text-[10px] text-[var(--text-muted)]">ITEMS</span>
                  <span className="font-bold text-[var(--text-primary)]">{centre.certification.questionCount}</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {centre.certification.examSections.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Examination Domain Weights</p>
                  <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg">
                    {centre.certification.examSections.map((es) => (
                      <div key={es.domain} className="p-3 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-[var(--text-primary)]">{es.domain}</span>
                          <span className="font-mono font-bold text-[var(--accent-text)] tabular-nums">{es.weightPct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--bg-muted)] overflow-hidden">
                          <div className="h-full bg-[var(--accent-primary)] rounded-full" style={{ width: `${es.weightPct}%` }} />
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">{es.topics.join(' · ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {centre.certification.preparationTips.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-bold text-[var(--text-primary)]">Preparation Checklist</p>
                  <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc pl-4">
                    {centre.certification.preparationTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {centre.certificationExams.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[var(--status-success)]" />
                <span>Live Tracked Examinations</span>
              </h4>
              <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                {centre.certificationExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-[11px] font-semibold text-[var(--accent-text)] capitalize tabular-nums">
                        {exam.type} · {exam.mode} · {exam.questionCount} questions · Pass {exam.passingScorePct}% · +{exam.xpReward} XP
                      </p>
                      <h5 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{exam.title}</h5>
                      {exam.userBestScorePct !== null && exam.userBestScorePct !== undefined && (
                        <p className="text-[11px] font-mono tabular-nums text-[var(--status-success)]">
                          Your best attempt: {exam.userBestScorePct}% ({exam.userPassed ? 'Passed' : 'Retry Available'})
                        </p>
                      )}
                    </div>
                    {exam.courseSlug && (
                      <button
                        type="button"
                        onClick={() => onOpenCourse(exam.courseSlug)}
                        className="bc-btn-primary !h-9 !px-3.5 text-xs whitespace-nowrap shrink-0"
                      >
                        {exam.type === 'exam' ? 'Take Certification Exam →' : 'Start Assessment →'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (secId === 'references') {
      const hasPxEm = centre.interactiveTools.includes('px_em_converter');
      const hasSqlSchema = centre.interactiveTools.includes('sql_schema_viewer');

      return (
        <div className="space-y-5">
          {hasPxEm && (
            <div
              data-testid="px-em-converter"
              className="bc-subtle-box p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Interactive PX ↔ EM Unit Converter</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Convert pixels to relative `em` units based on your root body font size.
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
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Isolated SQLite (:memory:) Schema Explorer</h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Load any sandbox table query directly into the Try-It-Yourself runner on the right.
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
                      onClick={() => onLoadCodeInEditor(tbl.sample, 'sql', true)}
                      className="bc-btn-secondary !h-7 !px-2.5 text-[11px] whitespace-nowrap shrink-0"
                    >
                      Run Query
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
              placeholder={`Filter ${techName} tags, attributes, status codes, or commands...`}
              aria-label={`Search ${techName} reference tables`}
              className="bc-input w-full pl-9 text-xs"
            />
          </div>

          {filteredReferences.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-4 text-center">
              No reference entries match "{refSearch}".
            </p>
          ) : (
            <div className="space-y-4">
              {filteredReferences.map((tbl) => (
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
              ))}
            </div>
          )}
        </div>
      );
    }

    return renderTopicGroups(visibleTopicGroups);
  };

  return (
    <section
      data-testid="technology-learning-centre"
      className="bc-panel overflow-hidden"
    >
      {/* Top Bar */}
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
              {techName} Comprehensive Learning Centre
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] tabular-nums">
            {centre.metrics.totalSections} structured sections · {centre.metrics.totalTopics} topics ·{' '}
            {centre.metrics.guidedExamplesCount} guided examples · {centre.metrics.referenceEntriesCount} reference entries
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 min-w-0">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              placeholder={`Search ${techName} topics...`}
              aria-label={`Search ${techName} Learning Centre topics`}
              className="bc-input w-full !h-9 pl-8 text-xs"
            />
          </div>
          <button
            type="button"
            onClick={() => setMobileOutlineOpen((prev) => !prev)}
            className="lg:hidden bc-btn-secondary !h-9 !px-3 text-xs whitespace-nowrap shrink-0"
          >
            {mobileOutlineOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
            <span>Sections</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOutlineOpen && (
        <div className="lg:hidden p-4 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
          {renderSidebarNav()}
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        <aside className="hidden lg:block lg:col-span-4 border-r border-[var(--border-default)] p-4 bg-[var(--bg-subtle)]/50">
          {renderSidebarNav()}
        </aside>

        <div className="lg:col-span-8 p-4 sm:p-5 space-y-4 min-w-0">
          {!trimmedTopicQuery && activeSection && (
            <div className="pb-3 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">{activeSection.label}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{activeSection.summary}</p>
              </div>
            </div>
          )}

          {renderSectionContent()}
        </div>
      </div>
    </section>
  );
}
