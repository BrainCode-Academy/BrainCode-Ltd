import React, { useEffect, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { ExerciseItem, ExerciseSubmissionItem } from '../types';

interface ExerciseEngineProps {
  exercises: ExerciseItem[];
  onSolved?: (xpAwarded: number) => void;
  onAskAi?: (exerciseId: string, codeSnippet: string, title: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'Multiple Choice',
  multi_select: 'Multi-Select',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  predict_output: 'Predict Output',
  find_error: 'Find & Fix Error',
  code_completion: 'Code Completion',
  write_code: 'Write Code',
  sql_write: 'SQL Query Lab',
  ordering: 'Sequence Ordering',
  matching: 'Concept Matching',
  short_answer: 'Short Explanation',
  scenario_analysis: 'Scenario Analysis',
  design_submission: 'Design Submission',
  practical_task: 'Practical Task',
};

function ExerciseCard({
  exercise,
  onSolved,
  onAskAi,
}: {
  exercise: ExerciseItem;
  onSolved?: (xpAwarded: number) => void;
  onAskAi?: (exerciseId: string, codeSnippet: string, title: string) => void;
}) {
  const { setUser } = useAuth();
  const hasOptions = Array.isArray(exercise.options) && exercise.options.length > 0;
  const isCodeType =
    exercise.exercise_type === 'write_code' ||
    exercise.exercise_type === 'practical_task' ||
    (exercise.exercise_type === 'find_error' && !hasOptions) ||
    exercise.exercise_type === 'sql_write';
  const isLongTextType =
    exercise.exercise_type === 'short_answer' ||
    exercise.exercise_type === 'scenario_analysis' ||
    exercise.exercise_type === 'design_submission';

  const [answerText, setAnswerText] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [orderedItems, setOrderedItems] = useState<string[]>(
    Array.isArray(exercise.options) && exercise.options.length > 0 ? [...exercise.options] : []
  );
  const [codeText, setCodeText] = useState(exercise.starter_code || '');
  const [showHint, setShowHint] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submissions, setSubmissions] = useState<ExerciseSubmissionItem[]>(exercise.submissions || []);
  const [solved, setSolved] = useState(Boolean(exercise.solved));
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
    explanation?: string;
    xpAwarded?: number;
    score?: number;
    partialCredit?: boolean;
  } | null>(null);
  const [solutionData, setSolutionData] = useState<{ correctAnswer: string; explanation: string } | null>(
    exercise.correct_answer
      ? { correctAnswer: exercise.correct_answer, explanation: exercise.explanation || '' }
      : null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setCodeText(exercise.starter_code || '');
    setAnswerText('');
    setSelectedOptions([]);
    setOrderedItems(Array.isArray(exercise.options) && exercise.options.length > 0 ? [...exercise.options] : []);
    setSubmissions(exercise.submissions || []);
    setSolved(Boolean(exercise.solved));
    setFeedback(null);
    setShowHint(false);
    setErrorMsg(null);
    setSolutionData(
      exercise.correct_answer
        ? { correctAnswer: exercise.correct_answer, explanation: exercise.explanation || '' }
        : null
    );
  }, [exercise.id, exercise.options]);

  const maxAttempts = exercise.max_attempts && exercise.max_attempts > 0 ? exercise.max_attempts : 0;
  const attemptsLeft = maxAttempts > 0 ? Math.max(0, maxAttempts - submissions.length) : null;

  const moveOrderItem = (idx: number, delta: -1 | 1) => {
    setOrderedItems((prev) => {
      const target = idx + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      next.splice(target, 0, picked);
      return next;
    });
  };

  const toggleMultiOption = (opt: string) => {
    setSelectedOptions((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    let computedAnswer = answerText;
    if (exercise.exercise_type === 'multi_select') {
      computedAnswer = JSON.stringify(selectedOptions);
    } else if (exercise.exercise_type === 'ordering' && orderedItems.length > 0) {
      computedAnswer = JSON.stringify(orderedItems);
    }
    try {
      const res = await api.post<{
        ok: boolean;
        submission: ExerciseSubmissionItem;
        feedback: string;
        isCorrect: boolean;
        score?: number;
        partialCreditApplied?: boolean;
        explanation?: string;
        xpAwarded: number;
        user?: any;
      }>(`/exercises/${exercise.id}/submit`, {
        answerText: isCodeType ? '' : computedAnswer,
        codeSubmitted: isCodeType ? codeText : '',
      });
      setSubmissions((prev) => [res.submission, ...prev]);
      if (res.isCorrect) setSolved(true);
      if (res.user) setUser(res.user);
      setFeedback({
        ok: res.isCorrect,
        text: res.feedback,
        explanation: res.explanation,
        xpAwarded: res.xpAwarded,
        score: res.score,
        partialCredit: res.partialCreditApplied,
      });
      if (res.isCorrect && res.xpAwarded > 0) {
        onSolved?.(res.xpAwarded);
      }
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Unable to submit exercise.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevealSolution = async () => {
    setErrorMsg(null);
    try {
      const sol = await api.get<{ correctAnswer: string; explanation: string }>(`/exercises/${exercise.id}/solution`);
      setSolutionData(sol);
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Submit at least once before revealing the solution.');
    }
  };

  const trueFalseOptions = exercise.exercise_type === 'true_false' && !hasOptions ? ['True', 'False'] : exercise.options;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-[var(--text-muted)] tabular-nums">
            <span>{TYPE_LABELS[exercise.exercise_type] || exercise.exercise_type}</span>
            <span aria-hidden="true"> · </span>
            <span>{exercise.difficulty}</span>
            {exercise.marks ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>{exercise.marks} marks</span>
              </>
            ) : null}
            {maxAttempts > 0 ? (
              <>
                <span aria-hidden="true"> · </span>
                <span>{attemptsLeft} attempts left</span>
              </>
            ) : null}
            <span aria-hidden="true"> · </span>
            <span className="text-[#0A84FF] dark:text-[#38BDF8] font-semibold">+{exercise.xp_reward} XP</span>
          </p>
          <h4 className="text-base font-bold text-[var(--text-primary)]">{exercise.title}</h4>
          {exercise.learning_objective && (
            <p className="text-[11px] text-[var(--text-muted)]">Objective: {exercise.learning_objective}</p>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
          {solved ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Solved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <HelpCircle className="w-4 h-4" />
              <span>Unsolved</span>
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{exercise.prompt}</p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {exercise.exercise_type === 'multi_select' && hasOptions ? (
          <div className="space-y-2">
            {exercise.options.map((opt) => {
              const checked = selectedOptions.includes(opt);
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'border-[#0A84FF] bg-[var(--accent-soft)] text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-default)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleMultiOption(opt)} className="shrink-0" />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        ) : exercise.exercise_type === 'ordering' && orderedItems.length > 0 ? (
          <div className="space-y-2">
            {orderedItems.map((item, idx) => (
              <div
                key={`${item}-${idx}`}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold text-[#0A84FF] tabular-nums">{idx + 1}.</span>
                  <span className="truncate">{item}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveOrderItem(idx, -1)}
                    className="px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] disabled:opacity-35 cursor-pointer"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={idx === orderedItems.length - 1}
                    onClick={() => moveOrderItem(idx, 1)}
                    className="px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-surface)] disabled:opacity-35 cursor-pointer"
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (exercise.exercise_type === 'multiple_choice' ||
            exercise.exercise_type === 'true_false' ||
            exercise.exercise_type === 'predict_output' ||
            exercise.exercise_type === 'find_error') &&
          trueFalseOptions.length > 0 ? (
          <div className="space-y-2.5">
            {exercise.starter_code && (
              <pre className="p-3.5 rounded-lg bg-[#090D14] text-slate-100 font-mono text-[13px] leading-6 overflow-x-auto border border-[var(--border-default)]">
                {exercise.starter_code}
              </pre>
            )}
            <div className="space-y-2">
              {trueFalseOptions.map((opt) => (
                <label
                  key={opt}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs sm:text-sm cursor-pointer transition-colors ${
                    answerText === opt
                      ? 'border-[#0A84FF] bg-[var(--accent-soft)] text-[var(--text-primary)] font-medium'
                      : 'border-[var(--border-default)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`ex-${exercise.id}`}
                    value={opt}
                    checked={answerText === opt}
                    onChange={() => setAnswerText(opt)}
                    className="shrink-0"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ) : isCodeType ? (
          <textarea
            rows={7}
            spellCheck={false}
            value={codeText}
            onChange={(e) => setCodeText(e.target.value)}
            placeholder={
              exercise.exercise_type === 'sql_write'
                ? 'Write your SQL query (executed against isolated SQLite practice dataset)...'
                : 'Write your code solution here...'
            }
            aria-label={`${exercise.title} code editor`}
            className="w-full rounded-lg border border-[var(--border-default)] bg-[#090D14] text-slate-100 font-mono text-xs leading-6 p-3.5 focus:outline-none focus:border-[#0A84FF]"
          />
        ) : isLongTextType ? (
          <textarea
            rows={4}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder="Write a clear technical explanation, trade-off analysis, or design rationale..."
            className="bc-textarea w-full text-xs leading-relaxed"
          />
        ) : (
          <div className="space-y-2">
            {exercise.starter_code && (
              <pre className="p-3 rounded-lg bg-[#090D14] text-slate-100 font-mono text-xs overflow-x-auto">
                {exercise.starter_code}
              </pre>
            )}
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder={
                exercise.exercise_type === 'matching'
                  ? 'Enter matching pairs (e.g. A->1, B->2)...'
                  : 'Type your exact answer...'
              }
              className="bc-input w-full font-mono text-xs"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            {exercise.hint_text && (
              <button
                type="button"
                onClick={() => setShowHint((v) => !v)}
                className="bc-btn-secondary h-9 px-3 text-xs"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
              </button>
            )}

            <button
              type="button"
              disabled={submissions.length === 0 && !solved}
              onClick={handleRevealSolution}
              className="bc-btn-secondary h-9 px-3 text-xs disabled:opacity-45"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Reveal Solution</span>
            </button>

            {((isCodeType && codeText !== (exercise.starter_code || '')) || (!isCodeType && answerText)) && (
              <button
                type="button"
                onClick={() => {
                  setCodeText(exercise.starter_code || '');
                  setAnswerText('');
                  setSelectedOptions([]);
                  setFeedback(null);
                  setErrorMsg(null);
                }}
                className="bc-btn-secondary h-9 px-3 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {onAskAi && (
              <button
                type="button"
                onClick={() => onAskAi(exercise.id, isCodeType ? codeText : answerText, exercise.title)}
                className="h-9 px-3 rounded-lg border border-[#0A84FF]/35 bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Ask AI for Hint</span>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || (maxAttempts > 0 && attemptsLeft === 0)}
            className="bc-btn-primary h-9 px-4 text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Checking...' : 'Submit Answer'}</span>
          </button>
        </div>
      </form>

      {showHint && exercise.hint_text && (
        <div className="p-3.5 rounded-r-lg border-l-2 border-amber-500 bg-[var(--status-warning-soft)] text-xs text-[var(--text-primary)]">
          <span className="font-semibold">Hint: </span>
          {exercise.hint_text}
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-r-lg border-l-2 border-red-500 bg-[var(--status-danger-soft)] text-xs text-[var(--status-danger)]">
          {errorMsg}
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-r-lg border-l-2 text-xs space-y-1.5 ${
            feedback.ok
              ? 'border-emerald-500 bg-[var(--status-success-soft)] text-emerald-800 dark:text-emerald-200'
              : 'border-amber-500 bg-[var(--status-warning-soft)] text-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              {feedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{feedback.text}</span>
            </span>
            <span className="font-mono tabular-nums">
              {feedback.score !== undefined ? `${feedback.score}%` : ''}
              {feedback.partialCredit ? ' (partial credit)' : ''}
              {feedback.xpAwarded ? ` · +${feedback.xpAwarded} XP` : ''}
            </span>
          </div>
          {feedback.explanation && <p className="opacity-90">{feedback.explanation}</p>}
        </div>
      )}

      {solutionData && (
        <div className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-xs space-y-2">
          <p className="font-bold text-[var(--text-primary)]">Reference Solution</p>
          <pre className="p-3 rounded-lg bg-[#090D14] text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap">
            {solutionData.correctAnswer}
          </pre>
          {solutionData.explanation && (
            <p className="text-[var(--text-secondary)] leading-relaxed">{solutionData.explanation}</p>
          )}
        </div>
      )}

      {submissions.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs font-semibold text-[var(--text-secondary)] inline-flex items-center gap-1 cursor-pointer"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="tabular-nums">Attempt History ({submissions.length})</span>
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1.5">
              {submissions.slice(0, 6).map((sub) => (
                <div
                  key={sub.id}
                  className="p-2.5 rounded-lg bg-[var(--bg-subtle)] text-[11px] flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-mono tabular-nums">
                    Attempt #{sub.attempt_number} · {Number(sub.is_correct) === 1 ? 'Passed' : 'Retry'} ({sub.score}%)
                  </span>
                  <span className="text-[var(--text-muted)] truncate max-w-md">
                    {sub.instructor_feedback || sub.feedback_text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExerciseEngine({ exercises, onSolved, onAskAi }: ExerciseEngineProps) {
  if (!exercises || exercises.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold flex items-center gap-2 text-[var(--text-primary)]">
          <Code2 className="w-4 h-4 text-[#0A84FF]" />
          <span className="tabular-nums">Practice Exercises ({exercises.length})</span>
        </h3>
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {exercises.filter((e) => e.solved).length}/{exercises.length} solved
        </span>
      </div>
      <div className="space-y-4">
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} onSolved={onSolved} onAskAi={onAskAi} />
        ))}
      </div>
    </section>
  );
}
