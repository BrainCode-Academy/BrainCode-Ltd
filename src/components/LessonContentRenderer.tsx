import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Code2,
  Copy,
  ExternalLink,
  Info,
  Monitor,
  Play,
  RotateCcw,
  Smartphone,
  Tablet,
  Terminal,
} from 'lucide-react';
import type { CodeExampleItem, LessonContentBlock } from '../types';
import { useAuth } from '../context/AuthContext';

interface LessonContentRendererProps {
  blocks?: LessonContentBlock[];
  codeExamples?: CodeExampleItem[];
  fallbackMarkdown?: string;
  fallbackCode?: string;
  fallbackLanguage?: string;
  onOpenInWorkspace?: (code: string, language: string, title?: string) => void;
  workspaceActionLabel?: string;
}

const BROWSER_RUNNABLE_LANGS = new Set(['html', 'css', 'javascript', 'js', 'svg']);

function renderFormattedInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.08] font-mono text-[13px] text-[#0A84FF] dark:text-[#00D4FF]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderMarkdownLines(md: string) {
  const lines = md.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let orderedBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let inCodeFence = false;
  let codeFenceLines: string[] = [];
  let keyIdx = 0;

  const flushLists = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="list-disc pl-5 space-y-2 text-[15.5px] sm:text-base max-w-[72ch] text-slate-700 dark:text-white/80">
          {listBuffer.map((item, i) => (
            <li key={i} className="leading-[1.7]">
              {renderFormattedInline(item)}
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
    if (orderedBuffer.length > 0) {
      elements.push(
        <ol key={`ol-${keyIdx++}`} className="list-decimal pl-5 space-y-2 text-[15.5px] sm:text-base max-w-[72ch] text-slate-700 dark:text-white/80">
          {orderedBuffer.map((item, i) => (
            <li key={i} className="leading-[1.7]">
              {renderFormattedInline(item)}
            </li>
          ))}
        </ol>
      );
      orderedBuffer = [];
    }
  };

  const flushTable = () => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach((raw) => {
        elements.push(
          <p key={`tp-${keyIdx++}`} className="text-[15.5px] sm:text-base leading-[1.72] max-w-[72ch] text-slate-700 dark:text-white/80">
            {renderFormattedInline(raw)}
          </p>
        );
      });
      tableBuffer = [];
      return;
    }
    const rows = tableBuffer
      .filter((row) => !/^\s*\|?\s*:?-{2,}/.test(row))
      .map((row) =>
        row
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((c) => c.trim())
      );
    if (rows.length > 0) {
      const [header, ...body] = rows;
      elements.push(
        <div key={`tbl-${keyIdx++}`} className="bc-table-wrap">
          <table className="bc-table">
            <thead>
              <tr>
                {header.map((cell, ci) => (
                  <th key={ci} className="font-semibold">
                    {renderFormattedInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri}>
                  {r.map((cell, ci) => (
                    <td key={ci} className="text-[var(--text-secondary)]">
                      {renderFormattedInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine;
    if (line.trim().startsWith('```')) {
      flushLists();
      flushTable();
      if (!inCodeFence) {
        inCodeFence = true;
        codeFenceLines = [];
      } else {
        inCodeFence = false;
        elements.push(
          <pre
            key={`pre-${keyIdx++}`}
            className="p-4 rounded-xl bg-[#05070A] border border-white/10 text-slate-100 font-mono text-xs overflow-x-auto"
          >
            {codeFenceLines.join('\n')}
          </pre>
        );
      }
      continue;
    }
    if (inCodeFence) {
      codeFenceLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushLists();
      flushTable();
      continue;
    }

    if (trimmed.startsWith('|')) {
      flushLists();
      tableBuffer.push(trimmed);
      continue;
    }
    flushTable();

    if (/^#{1,3}\s+/.test(trimmed)) {
      flushLists();
      const text = trimmed.replace(/^#{1,3}\s+/, '');
      elements.push(
        <h3 key={`h-${keyIdx++}`} className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white pt-2">
          {text}
        </h3>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      orderedBuffer = [];
      listBuffer.push(trimmed.replace(/^[-*]\s+/, ''));
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      listBuffer = [];
      orderedBuffer.push(trimmed.replace(/^\d+\.\s+/, ''));
      continue;
    }

    flushLists();
    elements.push(
      <p key={`p-${keyIdx++}`} className="text-[15.5px] sm:text-base leading-[1.72] max-w-[72ch] text-slate-700 dark:text-white/80">
        {renderFormattedInline(trimmed)}
      </p>
    );
  }

  flushLists();
  flushTable();
  return elements;
}

function checkStaticDelimiters(code: string, lang: string): string[] {
  const issues: string[] = [];
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const closeToOpen: Record<string, string> = { ')': '(', '}': '{', ']': '[' };
  const stack: string[] = [];
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (!inSingle && !inDouble) {
      if (pairs[ch]) stack.push(ch);
      else if (closeToOpen[ch]) {
        if (stack.pop() !== closeToOpen[ch]) issues.push(`Unmatched '${ch}' delimiter detected.`);
      }
    }
  }
  if (stack.length > 0) issues.push(`Unclosed '${stack[stack.length - 1]}' delimiter detected.`);
  if ((lang === 'python' || lang === 'py') && code.split('\n').some((ln) => /^\s*(def|class|if|for|while)\b/.test(ln) && !ln.trim().endsWith(':'))) {
    issues.push('Check Python block headers end with a colon (:).');
  }
  return issues;
}

function InteractiveCodeExampleCard({
  example,
  onOpenInWorkspace,
  workspaceActionLabel = 'Try It Yourself',
}: {
  example: CodeExampleItem;
  onOpenInWorkspace?: (code: string, language: string, title?: string) => void;
  workspaceActionLabel?: string;
}) {
  const { capabilities } = useAuth();
  const [draft, setDraft] = useState(example.code);
  const [copied, setCopied] = useState(false);
  const [showExpected, setShowExpected] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [consoleLines, setConsoleLines] = useState<string[]>([]);

  useEffect(() => {
    setDraft(example.code);
    setPreviewDoc(null);
    setConsoleLines([]);
  }, [example.id, example.code]);

  const lang = (example.language || 'javascript').toLowerCase();
  const canRunLocally = BROWSER_RUNNABLE_LANGS.has(lang);

  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      if (evt.data && evt.data.__bcschools_inline === example.id) {
        setConsoleLines((prev) => [...prev.slice(-30), String(evt.data.text)]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [example.id]);

  const runExample = () => {
    setConsoleLines([]);
    if (lang === 'html' || lang === 'css' || lang === 'svg' || draft.trim().startsWith('<')) {
      const bridge = `<script>(function(){const s=(l,a)=>parent.postMessage({__bcschools_inline:"${example.id}",text:a.map(x=>typeof x==='object'?JSON.stringify(x):String(x)).join(' ')},'*');console.log=(...a)=>s('log',a);console.error=(...a)=>s('error',a);window.onerror=(m)=>s('error',[m]);window.addEventListener('unhandledrejection',(ev)=>s('error',[String(ev.reason)]));})();</script>`;
      const doc = draft.includes('</head>')
        ? draft.replace('</head>', `${bridge}</head>`)
        : `<!DOCTYPE html><html><head>${bridge}<style>body{font-family:'Inter',system-ui,-apple-system,sans-serif;padding:16px;margin:0;color:#0f172a;line-height:1.6;}</style></head><body>${draft}</body></html>`;
      setPreviewDoc(doc);
      return;
    }

    if (lang === 'javascript' || lang === 'js') {
      const wrapped = `<!DOCTYPE html><html><body style="font-family:'JetBrains Mono',ui-monospace,monospace;background:#05070A;color:#e2e8f0;padding:12px;margin:0;font-size:12px;">
        <div id="out"></div>
        <script>
          const out = document.getElementById('out');
          const pushLine = (msg, isErr) => {
            const row = document.createElement('div');
            if (isErr) row.style.color = '#f87171';
            row.textContent = (isErr ? 'Error: ' : '> ') + msg;
            out.appendChild(row);
            parent.postMessage({ __bcschools_inline: "${example.id}", text: (isErr ? 'Error: ' : '') + msg }, '*');
          };
          console.log = (...a) => pushLine(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '), false);
          console.error = (...a) => pushLine(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '), true);
          window.addEventListener('unhandledrejection', (ev) => pushLine(String(ev.reason), true));
          try { ${draft.replace(/<\/script>/gi, '<\\/script>')} } catch (e) {
            pushLine(e.message, true);
          }
        </script></body></html>`;
      setPreviewDoc(wrapped);
      return;
    }

    setPreviewDoc(null);
    const staticIssues = checkStaticDelimiters(draft, lang);
    setConsoleLines([
      staticIssues.length > 0
        ? `${lang.toUpperCase()} static syntax notice: ${staticIssues.join(' ')}`
        : `${lang.toUpperCase()} static syntax check passed (${draft.split('\n').length} lines). ${
            capabilities?.sandbox.remoteSandboxEnabled
              ? 'Open in Coding Workspace for remote execution.'
              : 'Live server execution requires CODE_SANDBOX_URL; compare with Expected Output or test concepts in the Workspace.'
          }`,
    ]);
  };

  const frameWidthClass =
    viewport === 'mobile' ? 'max-w-[375px] mx-auto' : viewport === 'tablet' ? 'max-w-[768px] mx-auto' : 'w-full';

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-subtle)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
            <Code2 className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" />
            <span className="uppercase">{lang} Example</span>
            <span aria-hidden="true">·</span>
            <span className="truncate font-sans font-bold text-[var(--text-primary)]">{example.title}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(draft).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            }}
            className="h-8 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {draft !== example.code && (
            <button
              type="button"
              onClick={() => {
                setDraft(example.code);
                setPreviewDoc(null);
                setConsoleLines([]);
              }}
              className="h-8 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {example.expected_output && (
            <button
              type="button"
              onClick={() => setShowExpected((v) => !v)}
              className="h-8 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[11px] font-medium cursor-pointer whitespace-nowrap"
            >
              {showExpected ? 'Hide Output' : 'Expected Output'}
            </button>
          )}
        </div>
      </div>

      <textarea
        rows={Math.min(16, Math.max(5, draft.split('\n').length + 1))}
        spellCheck={false}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label={`${example.title} interactive code`}
        className="block w-full bg-[#090D14] text-slate-100 font-mono text-xs leading-6 p-4 border-b border-[var(--border-default)] focus:outline-none resize-y"
      />

      <div className="px-4 py-2.5 bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {onOpenInWorkspace && (
            <button
              type="button"
              onClick={() => onOpenInWorkspace(draft, lang, example.title)}
              className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>{workspaceActionLabel}</span>
              <span aria-hidden="true">&raquo;</span>
            </button>
          )}

          {Boolean(example.is_runnable) && (
            <button
              type="button"
              onClick={runExample}
              className="h-9 px-3.5 rounded-lg bg-[#0A84FF] hover:bg-[#006EE6] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{canRunLocally ? 'Run Inline' : 'Check Syntax'}</span>
            </button>
          )}
        </div>

        {!canRunLocally && (
          <span className="text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#0A84FF] shrink-0" />
            <span>
              {capabilities?.sandbox.remoteSandboxEnabled
                ? `Open Practice Workspace to run ${lang.toUpperCase()}.`
                : `Syntax check active (${lang.toUpperCase()} server runner not configured).`}
            </span>
          </span>
        )}
      </div>

      {example.description && (
        <div className="px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-default)] space-y-1">
          <p className="text-xs font-bold text-[var(--text-primary)]">Example Explained</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{example.description}</p>
        </div>
      )}

      {showExpected && example.expected_output && (
        <div className="px-4 py-3 bg-[#090D14] border-t border-white/10 space-y-1">
          <p className="text-[11px] font-mono text-white/50">EXPECTED OUTPUT</p>
          <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap">{example.expected_output}</pre>
        </div>
      )}

      {previewDoc && (
        <div className="border-t border-[var(--border-default)] bg-[var(--bg-subtle)]">
          <div className="px-3 py-1.5 bg-[#090D14] border-b border-white/10 flex items-center justify-between text-[11px] text-white/65">
            <span className="font-mono">Live Preview Output</span>
            {(lang === 'html' || lang === 'css') && (
              <div className="flex items-center gap-1">
                {[
                  { id: 'desktop', icon: Monitor, label: 'Desktop' },
                  { id: 'tablet', icon: Tablet, label: 'Tablet' },
                  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
                ].map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    aria-label={vp.label}
                    onClick={() => setViewport(vp.id as 'desktop' | 'tablet' | 'mobile')}
                    className={`p-1 rounded cursor-pointer ${viewport === vp.id ? 'bg-[#0A84FF] text-white' : 'text-white/50 hover:text-white'}`}
                  >
                    <vp.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="p-2.5 bg-[var(--bg-subtle)]">
            <iframe
              title={`${example.title} sandbox preview`}
              sandbox="allow-scripts"
              srcDoc={previewDoc}
              className={`${frameWidthClass} block h-44 rounded-lg bg-white border border-[var(--border-default)]`}
            />
          </div>
        </div>
      )}

      {consoleLines.length > 0 && (
        <div className="px-4 py-3 bg-[#090D14] border-t border-white/10 font-mono text-xs text-cyan-300 flex items-start gap-2">
          <Terminal className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {consoleLines.map((line, i) => (
              <div key={i}>&gt; {line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function LessonContentRenderer({
  blocks = [],
  codeExamples = [],
  fallbackMarkdown = '',
  fallbackCode = '',
  fallbackLanguage = 'javascript',
  onOpenInWorkspace,
  workspaceActionLabel = 'Try It Yourself',
}: LessonContentRendererProps) {
  const hasStructuredBlocks = blocks.length > 0;

  return (
    <div className="space-y-6 lesson-prose">
      {hasStructuredBlocks ? (
        <div className="space-y-5">
          {blocks.map((block) => {
            if (block.block_type === 'heading') {
              return (
                <div key={block.id} className="pt-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {block.title || block.content_markdown}
                  </h2>
                  {block.title && block.content_markdown && (
                    <p className="text-[15.5px] sm:text-base text-slate-600 dark:text-white/75 mt-1.5 leading-[1.7] max-w-[72ch]">
                      {renderFormattedInline(block.content_markdown)}
                    </p>
                  )}
                </div>
              );
            }

            if (block.block_type === 'callout' || block.block_type === 'warning') {
              const isWarning = block.block_type === 'warning';
              const isNoteHeading =
                !block.title || /^note\b|^tip\b|^common pitfall\b/i.test(block.title.trim());
              return (
                <div
                  key={block.id}
                  className={`rounded-r-lg border-l-2 p-4 space-y-1.5 ${
                    isWarning || isNoteHeading
                      ? 'border-amber-500 bg-[var(--status-warning-soft)] text-[var(--text-primary)]'
                      : 'border-[#0A84FF] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-[#0A84FF] shrink-0" />
                    )}
                    <span>{block.title || 'Note'}</span>
                  </div>
                  <div className="space-y-2">{renderMarkdownLines(block.content_markdown)}</div>
                </div>
              );
            }

            if (block.block_type === 'step_guide') {
              return (
                <div
                  key={block.id}
                  className="pt-4 border-t border-[var(--border-subtle)] space-y-2.5"
                >
                  {block.title && (
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">{block.title}</h3>
                  )}
                  <div className="space-y-2">{renderMarkdownLines(block.content_markdown)}</div>
                </div>
              );
            }

            if (block.block_type === 'diagram') {
              return (
                <div
                  key={block.id}
                  className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2"
                >
                  {block.title && (
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">{block.title}</p>
                  )}
                  <pre className="font-mono text-xs text-[var(--text-primary)] dark:text-cyan-200 overflow-x-auto leading-relaxed">
                    {block.content_markdown}
                  </pre>
                </div>
              );
            }

            if (block.block_type === 'doc_link') {
              const href = typeof block.metadata?.url === 'string' ? block.metadata.url : '';
              return (
                <div
                  key={block.id}
                  className="py-3 border-y border-[var(--border-subtle)] flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <BookOpen className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate text-[var(--text-primary)]">{block.title || 'Reference Documentation'}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{block.content_markdown}</p>
                    </div>
                  </div>
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#0A84FF] hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            }

            if (block.block_type === 'code_example') {
              const raw = String(block.content_markdown || '').trim();
              const fenceMatch = raw.match(/^```([a-zA-Z0-9_+-]*)\s*\r?\n([\s\S]*?)\r?\n```(?:\s*\r?\n([\s\S]*))?$/);
              let cleanCode = raw;
              let inferredLang = '';
              let inferredExpected = '';
              if (fenceMatch) {
                inferredLang = fenceMatch[1] || '';
                cleanCode = fenceMatch[2] || '';
                const trailing = (fenceMatch[3] || '').trim();
                const expMatch = trailing.match(/Expected Output:\s*([\s\S]*)$/i);
                if (expMatch) {
                  inferredExpected = expMatch[1].replace(/^```[a-zA-Z0-9_+-]*\s*|\s*```$/g, '').trim();
                } else if (trailing) {
                  inferredExpected = trailing;
                }
              } else if (raw.startsWith('```') && raw.endsWith('```')) {
                cleanCode = raw.replace(/^```[a-zA-Z0-9_+-]*\s*\r?\n?/, '').replace(/\r?\n?```$/, '');
              }
              const lang =
                typeof block.metadata?.language === 'string' && block.metadata.language
                  ? block.metadata.language
                  : inferredLang || fallbackLanguage;
              const expectedOutput =
                typeof block.metadata?.expected_output === 'string' && block.metadata.expected_output
                  ? block.metadata.expected_output
                  : inferredExpected;
              return (
                <InteractiveCodeExampleCard
                  key={block.id}
                  example={{
                    id: block.id,
                    lesson_id: block.lesson_id,
                    title: block.title || 'Code Illustration',
                    description: '',
                    language: lang,
                    code: cleanCode,
                    expected_output: expectedOutput,
                    is_runnable: true,
                    sort_order: block.sort_order,
                  }}
                  onOpenInWorkspace={onOpenInWorkspace}
                  workspaceActionLabel={workspaceActionLabel}
                />
              );
            }

            if (block.block_type === 'common_mistakes' || block.block_type === 'best_practices') {
              const isMistakes = block.block_type === 'common_mistakes';
              return (
                <div
                  key={block.id}
                  className={`rounded-r-lg border-l-2 p-4 space-y-1.5 ${
                    isMistakes
                      ? 'border-amber-500 bg-[var(--status-warning-soft)] text-[var(--text-primary)]'
                      : 'border-emerald-500 bg-[var(--status-success-soft)] text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {isMistakes ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : (
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    )}
                    <span>{block.title || (isMistakes ? 'Common Mistakes to Avoid' : 'Best Practices')}</span>
                  </div>
                  <div className="space-y-2">{renderMarkdownLines(block.content_markdown)}</div>
                </div>
              );
            }

            if (block.block_type === 'visual_explanation' || block.block_type === 'summary' || block.block_type === 'next_steps') {
              return (
                <div
                  key={block.id}
                  className="pt-4 border-t border-[var(--border-subtle)] space-y-2"
                >
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {block.title ||
                      (block.block_type === 'visual_explanation'
                        ? 'How It Works Visually'
                        : block.block_type === 'next_steps'
                          ? 'What To Practise Next'
                          : 'Lesson Summary')}
                  </p>
                  <div className="space-y-2">{renderMarkdownLines(block.content_markdown)}</div>
                </div>
              );
            }

            if (block.block_type === 'image' || block.block_type === 'video_reference') {
              const rawUrl = typeof block.metadata?.url === 'string' ? block.metadata.url.trim() : '';
              const safeUrl = /^https?:\/\/|^\/assets\//i.test(rawUrl) ? rawUrl : '';
              return (
                <div
                  key={block.id}
                  className="pt-4 border-t border-[var(--border-subtle)] space-y-2"
                >
                  {block.title && <p className="text-xs font-bold text-[var(--text-primary)]">{block.title}</p>}
                  {safeUrl && block.block_type === 'image' && (
                    <img
                      src={safeUrl}
                      alt={block.title || 'Lesson diagram'}
                      referrerPolicy="no-referrer"
                      className="rounded-lg max-h-80 w-auto object-contain border border-[var(--border-default)]"
                    />
                  )}
                  {safeUrl && block.block_type === 'video_reference' && (
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[#0A84FF] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open Video Reference</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {block.content_markdown && <div className="space-y-2">{renderMarkdownLines(block.content_markdown)}</div>}
                </div>
              );
            }

            // paragraph / list / table / default
            return (
              <div key={block.id} className="space-y-2">
                {block.title && (
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{block.title}</h3>
                )}
                {renderMarkdownLines(block.content_markdown)}
              </div>
            );
          })}
        </div>
      ) : fallbackMarkdown.trim() ? (
        <div className="space-y-3">{renderMarkdownLines(fallbackMarkdown)}</div>
      ) : codeExamples.length === 0 && !fallbackCode.trim() ? (
        <div className="rounded-r-lg border-l-2 border-amber-500 bg-[var(--status-warning-soft)] p-4 text-xs text-[var(--text-primary)]">
          <p className="font-bold">Lesson Content In Preparation</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            This lesson outline is published while full step-by-step walkthroughs and examples are being completed. You can explore any other lesson from the Course Outline freely.
          </p>
        </div>
      ) : null}

      {/* Structured Code Examples */}
      {codeExamples.length > 0 ? (
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Examples to Try</h3>
          {codeExamples.map((ex) => (
            <InteractiveCodeExampleCard
              key={ex.id}
              example={ex}
              onOpenInWorkspace={onOpenInWorkspace}
              workspaceActionLabel={workspaceActionLabel}
            />
          ))}
        </div>
      ) : (
        fallbackCode && (
          <div className="pt-2">
            <InteractiveCodeExampleCard
              example={{
                id: 'lesson_fallback_example',
                lesson_id: '',
                title: 'Lesson Reference Code',
                description: '',
                language: fallbackLanguage,
                code: fallbackCode,
                expected_output: '',
                is_runnable: true,
                sort_order: 1,
              }}
              onOpenInWorkspace={onOpenInWorkspace}
              workspaceActionLabel={workspaceActionLabel}
            />
          </div>
        )
      )}
    </div>
  );
}
