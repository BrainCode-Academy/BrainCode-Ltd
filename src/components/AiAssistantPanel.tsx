import React, { useEffect, useState } from 'react';
import { Bot, Send, Sparkles, AlertTriangle } from 'lucide-react';
import { api, ApiError } from '../lib/api';

type AssistMode =
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

interface AiAssistantPanelProps {
  lessonId?: string;
  lessonTitle?: string;
  courseId?: string;
  exerciseId?: string;
  assessmentId?: string;
  initialMode?: AssistMode;
  initialCode?: string;
  initialError?: string;
  compact?: boolean;
}

const MODES: Array<{ value: AssistMode; label: string }> = [
  { value: 'explain_concept', label: 'Explain Concept' },
  { value: 'explain_code', label: 'Explain Code' },
  { value: 'debug_error', label: 'Debug Error' },
  { value: 'hint_only', label: 'Give Hint Only' },
  { value: 'summarize_lesson', label: 'Summarize Lesson' },
  { value: 'practice_questions', label: 'Practice Questions' },
  { value: 'simplify_topic', label: 'Simplify Topic' },
  { value: 'compare_techs', label: 'Compare Techs' },
  { value: 'review_code', label: 'Review Code' },
  { value: 'recommend_next', label: 'Recommend Next Step' },
  { value: 'explain_assessment', label: 'Explain Assessment' },
  { value: 'platform_help', label: 'Platform Guide' },
];

export function AiAssistantPanel({
  lessonId,
  lessonTitle,
  courseId,
  exerciseId,
  assessmentId,
  initialMode,
  initialCode = '',
  initialError = '',
  compact = false,
}: AiAssistantPanelProps) {
  const [mode, setMode] = useState<AssistMode>(
    initialMode || (initialError ? 'debug_error' : initialCode ? 'explain_code' : 'explain_concept')
  );
  const [prompt, setPrompt] = useState('');
  const [codeSnippet, setCodeSnippet] = useState(initialCode);
  const [errorText, setErrorText] = useState(initialError);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; disclaimer?: string }>>([]);
  const [usage, setUsage] = useState<{
    requestsToday: number;
    dailyLimit: number;
    remaining: number;
    model: string;
    aiConfigured?: boolean;
    aiStatus?: { status: string; lastErrorCode?: string | null; lastErrorMessage?: string | null };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (initialCode) setCodeSnippet(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (initialError) setErrorText(initialError);
  }, [initialError]);

  useEffect(() => {
    api
      .get<{ usage: NonNullable<typeof usage> }>('/ai/usage')
      .then((d) => setUsage(d.usage))
      .catch(() => {});
  }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = prompt.trim() || `Help me with ${MODES.find((m) => m.value === mode)?.label || 'this topic'}`;
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setPrompt('');
    setLoading(true);
    try {
      const res = await api.post<{
        reply: string;
        disclaimer: string;
        usage: { requestsToday: number; dailyLimit: number; remaining: number; model: string };
      }>('/ai/assist', {
        prompt: q,
        mode,
        lessonId,
        courseId,
        exerciseId,
        assessmentId,
        codeSnippet: codeSnippet.trim() || undefined,
        errorText: errorText.trim() || undefined,
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.reply, disclaimer: res.disclaimer }]);
      setUsage(res.usage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bc-panel flex flex-col ${compact ? 'h-full' : 'min-h-[620px]'}`}>
      <div className="p-4 sm:p-5 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">Braincode AI Learning Assistant</h2>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {lessonTitle ? `Context: ${lessonTitle}` : 'Context-aware tutoring, debugging & study guidance'}
            </p>
          </div>
        </div>
        {usage && (
          <div className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
            {usage.remaining}/{usage.dailyLimit} prompts left today · {usage.model}
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div className="px-4 py-3 border-b border-[var(--border-default)] flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === m.value
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Honest AI Configuration / Health Notice */}
      {usage && (usage.aiConfigured === false || usage.aiStatus?.status === 'degraded') && (
        <div className="mx-4 mt-3 rounded-lg border border-[var(--status-warning)]/35 bg-[var(--status-warning-soft)] px-3.5 py-2.5 text-xs text-[var(--status-warning)] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">
              {usage.aiConfigured === false ? 'AI Assistant Unavailable (Server Key Not Configured)' : 'AI Service Temporarily Degraded'}
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              {usage.aiStatus?.lastErrorMessage ||
                'Lessons, interactive exercises, code workspace sandbox, and assessments continue working normally without AI.'}
            </p>
          </div>
        </div>
      )}

      {/* Conversation History */}
      <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[420px]">
        {messages.length === 0 && (
          <div className="bc-subtle-box border-dashed p-6 text-center">
            <Sparkles className="w-6 h-6 text-[var(--accent-primary)] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">Ask a technical question or paste code to inspect</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-md mx-auto">
              Choose Hint Only when practicing assignments to get step-by-step reasoning before seeing full answers.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3.5 sm:p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-[var(--accent-soft)] border border-[var(--accent-primary)]/25 ml-3 sm:ml-6 text-[var(--text-primary)]'
                : 'bc-subtle-box mr-2 sm:mr-4 text-[var(--text-primary)]'
            }`}
          >
            <p className="text-xs font-semibold mb-1 text-[var(--text-muted)]">
              {m.role === 'user' ? 'You' : 'AI Tutor'}
            </p>
            <div>{m.text}</div>
            {m.disclaimer && (
              <p className="mt-2 pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
                {m.disclaimer}
              </p>
            )}
          </div>
        ))}

        {error && (
          <div className="rounded-lg border border-[var(--status-warning)]/40 bg-[var(--status-warning-soft)] p-3.5 text-xs text-[var(--status-warning)] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Optional Code / Error Context + Input */}
      <form onSubmit={handleAsk} className="p-4 border-t border-[var(--border-default)] space-y-3">
        {!compact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <textarea
              rows={2}
              value={codeSnippet}
              onChange={(e) => setCodeSnippet(e.target.value)}
              placeholder="Optional: Paste code snippet for explanation or debugging..."
              className="bc-textarea w-full text-xs font-mono"
            />
            <textarea
              rows={2}
              value={errorText}
              onChange={(e) => setErrorText(e.target.value)}
              placeholder="Optional: Paste console or compiler error output..."
              className="bc-textarea w-full text-xs font-mono"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask about this lesson, code logic, debugging steps, or next track..."
            className="bc-input min-w-0 flex-1 !h-11"
          />
          <button
            type="submit"
            disabled={loading}
            className="bc-btn-primary !h-11 !px-4 sm:!px-5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? 'Thinking...' : 'Ask AI'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
