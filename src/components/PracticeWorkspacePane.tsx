import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Code2,
  Copy,
  Database,
  Eye,
  FileCode2,
  Info,
  Maximize2,
  Minimize2,
  Monitor,
  PenTool,
  Play,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Tablet,
  Terminal,
  Wand2,
  X,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Course, LessonFull, Workspace } from '../types';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';
import {
  DesignContrastInspectorPanel,
  GuidedTaskAndReasoningBar,
  SecurityNetworkToolkitPanel,
  SqlLabPreviewPanel,
  type SqlExecutionState,
} from './DisciplineLabPanels';
import {
  resolveTechnologyCapability,
  type LabFileSpec,
  type TechnologyCapabilityProfile,
} from '../../shared/technologyCapabilities';

export type PracticeTab = 'code' | 'preview' | 'whiteboard';

export interface SeededPracticeSnippet {
  code: string;
  language: string;
  title?: string;
  nonce: number;
}

interface PracticeWorkspacePaneProps {
  course: Course;
  activeLesson: LessonFull | null;
  seededSnippet: SeededPracticeSnippet | null;
  activeTab: PracticeTab;
  onTabChange: (tab: PracticeTab) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose?: () => void;
  onAskAiDebug?: (code: string, errorText?: string) => void;
}

const BROWSER_RUNNABLE = new Set(['html', 'css', 'javascript', 'js', 'svg']);

const PRACTICE_LANGUAGES = [
  { id: 'html', label: 'HTML (.html)' },
  { id: 'css', label: 'CSS (.css)' },
  { id: 'javascript', label: 'JavaScript (.js)' },
  { id: 'python', label: 'Python (.py)' },
  { id: 'sql', label: 'SQL (.sql)' },
  { id: 'typescript', label: 'TypeScript (.ts)' },
  { id: 'tsx', label: 'React TSX (.tsx)' },
  { id: 'java', label: 'Java (.java)' },
  { id: 'cpp', label: 'C++ (.cpp)' },
  { id: 'c', label: 'C (.c)' },
  { id: 'csharp', label: 'C# (.cs)' },
  { id: 'php', label: 'PHP (.php)' },
  { id: 'go', label: 'Go (.go)' },
  { id: 'rust', label: 'Rust (.rs)' },
  { id: 'json', label: 'JSON (.json)' },
  { id: 'yaml', label: 'YAML (.yaml)' },
  { id: 'dockerfile', label: 'Dockerfile' },
  { id: 'bash', label: 'Bash (.sh)' },
  { id: 'svg', label: 'SVG (.svg)' },
];

function getRelevantLanguageIds(
  profile: TechnologyCapabilityProfile,
  activeLesson: LessonFull | null,
  files: LabFileSpec[],
  currentLang: string
): Set<string> {
  const allowed = new Set<string>();
  const env = profile.environmentType;
  const primaryLang = normalizePracticeLanguage(profile.editorConfig.primaryLanguage);
  if (env === 'web_dev_lab' || env === 'frontend_framework_lab' || env === 'design_uiux_lab') {
    ['html', 'css', 'javascript', 'typescript', 'tsx', 'svg', 'json'].forEach((l) => allowed.add(l));
  } else if (env === 'database_sql_lab') {
    ['sql', 'json'].forEach((l) => allowed.add(l));
  } else if (env === 'cloud_devops_lab') {
    ['dockerfile', 'yaml', 'bash', 'json'].forEach((l) => allowed.add(l));
  } else if (env === 'security_network_lab') {
    ['bash', 'python', 'javascript', 'sql', 'json'].forEach((l) => allowed.add(l));
  } else if (env === 'ai_data_lab') {
    ['python', 'sql', 'json'].forEach((l) => allowed.add(l));
  } else {
    ['python', 'javascript', 'typescript', 'java', 'cpp', 'c', 'csharp', 'php', 'go', 'rust', 'json'].forEach((l) => {
      if (l === primaryLang || l === 'json') allowed.add(l);
    });
    if (allowed.size <= 1) {
      ['javascript', 'python', 'typescript', 'json'].forEach((l) => allowed.add(l));
    }
  }
  if (primaryLang) allowed.add(primaryLang);
  if (activeLesson?.language) allowed.add(normalizePracticeLanguage(activeLesson.language));
  files.forEach((f) => allowed.add(normalizePracticeLanguage(f.language)));
  if (currentLang) allowed.add(normalizePracticeLanguage(currentLang));
  return allowed;
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
  if (
    (lang === 'python' || lang === 'py') &&
    code
      .split('\n')
      .some((ln) => /^\s*(def|class|if|for|while)\b/.test(ln) && !ln.trim().endsWith(':'))
  ) {
    issues.push('Check Python block headers end with a colon (:).');
  }
  if (lang === 'json') {
    try {
      JSON.parse(code);
    } catch (err) {
      issues.push(`Invalid JSON: ${(err as Error).message}`);
    }
  }
  if (lang === 'yaml' || lang === 'yml') {
    if (code.includes('\t')) {
      issues.push('YAML forbids literal Tab characters; indent using spaces.');
    }
  }
  return issues;
}

function normalizePracticeLanguage(raw?: string, code?: string): string {
  const l = String(raw || '').trim().toLowerCase();
  if (l === 'js') return 'javascript';
  if (l === 'py') return 'python';
  if (l === 'ts') return 'typescript';
  if (l === 'c++') return 'cpp';
  if (l === 'c#') return 'csharp';
  if (l === 'rs') return 'rust';
  if (l === 'yml') return 'yaml';
  if (l === 'sh' || l === 'shell') return 'bash';
  if (l) return l;
  if (code && code.trim().startsWith('<svg')) return 'svg';
  if (code && code.trim().startsWith('<')) return 'html';
  return 'html';
}

function filenameForLanguage(lang: string): string {
  switch (lang) {
    case 'html':
      return 'index.html';
    case 'css':
      return 'styles.css';
    case 'javascript':
      return 'app.js';
    case 'python':
      return 'main.py';
    case 'sql':
      return 'query.sql';
    case 'typescript':
      return 'index.ts';
    case 'tsx':
      return 'App.tsx';
    case 'java':
      return 'Main.java';
    case 'cpp':
      return 'main.cpp';
    case 'c':
      return 'main.c';
    case 'csharp':
      return 'Program.cs';
    case 'php':
      return 'index.php';
    case 'go':
      return 'main.go';
    case 'rust':
      return 'main.rs';
    case 'json':
      return 'config.json';
    case 'yaml':
      return 'manifest.yaml';
    case 'dockerfile':
      return 'Dockerfile';
    case 'bash':
      return 'script.sh';
    case 'svg':
      return 'canvas.svg';
    default:
      return 'snippet.txt';
  }
}

function buildInitialFiles(
  course: Course,
  lesson: LessonFull | null,
  profile: TechnologyCapabilityProfile
): { files: LabFileSpec[]; activeIndex: number } {
  const starterFiles = profile.starterFiles.map((f) => ({ ...f }));
  const lessonCode = lesson ? lesson.starter_code || lesson.code_example : '';
  if (lessonCode) {
    const lang = normalizePracticeLanguage(lesson?.language, lessonCode);
    const fname = filenameForLanguage(lang);
    const existingIdx = starterFiles.findIndex((f) => f.filename === fname || f.language === lang);
    if (existingIdx >= 0) {
      starterFiles[existingIdx] = { ...starterFiles[existingIdx], language: lang, code: lessonCode };
      return { files: starterFiles, activeIndex: existingIdx };
    }
    return {
      files: [{ filename: fname, language: lang, code: lessonCode }, ...starterFiles],
      activeIndex: 0,
    };
  }
  return { files: starterFiles, activeIndex: 0 };
}

export function PracticeWorkspacePane({
  course,
  activeLesson,
  seededSnippet,
  activeTab,
  onTabChange,
  isExpanded,
  onToggleExpand,
  onClose,
  onAskAiDebug,
}: PracticeWorkspacePaneProps) {
  const { user, capabilities } = useAuth();
  const storageKey = `bc_practice_draft_${course.id}`;
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const instanceIdRef = useRef(`pws_${Math.random().toString(36).slice(2, 8)}`);

  const capabilityProfile = useMemo<TechnologyCapabilityProfile>(() => {
    return resolveTechnologyCapability({
      id: course.technology_id,
      slug: course.technology_slug || 'html',
      name: course.technology_name || course.title,
      categoryId: course.category_id,
      categorySlug: course.category_slug,
      categoryName: course.category_name,
    });
  }, [course.technology_id, course.technology_slug, course.technology_name, course.title, course.category_id, course.category_slug, course.category_name]);

  const hydrateFromStorageOrStarter = (): {
    files: LabFileSpec[];
    activeFilename: string;
    starterSnapshot: string;
  } => {
    const initial = buildInitialFiles(course, activeLesson, capabilityProfile);
    const defaultActive = initial.files[initial.activeIndex] || initial.files[0];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.files) && parsed.files.length > 0) {
          const validFiles = parsed.files.filter(
            (f: any) => f && typeof f.filename === 'string' && typeof f.code === 'string'
          ) as LabFileSpec[];
          if (validFiles.length > 0) {
            return {
              files: validFiles,
              activeFilename:
                typeof parsed.activeFilename === 'string' &&
                validFiles.some((f) => f.filename === parsed.activeFilename)
                  ? parsed.activeFilename
                  : validFiles[0].filename,
              starterSnapshot: typeof parsed.starterCode === 'string' ? parsed.starterCode : validFiles[0].code,
            };
          }
        }
        if (typeof parsed?.code === 'string') {
          const lang = normalizePracticeLanguage(parsed.language, parsed.code);
          const fname = filenameForLanguage(lang);
          const merged = [...initial.files];
          const idx = merged.findIndex((f) => f.filename === fname);
          if (idx >= 0) merged[idx] = { ...merged[idx], language: lang, code: parsed.code };
          else merged.unshift({ filename: fname, language: lang, code: parsed.code });
          return {
            files: merged,
            activeFilename: fname,
            starterSnapshot: typeof parsed.starterCode === 'string' ? parsed.starterCode : parsed.code,
          };
        }
      }
    } catch {
      // ignore malformed storage
    }
    return {
      files: initial.files,
      activeFilename: defaultActive?.filename || 'index.html',
      starterSnapshot: defaultActive?.code || '',
    };
  };

  const initialHydrated = useMemo(() => hydrateFromStorageOrStarter(), [storageKey]);

  const [files, setFiles] = useState<LabFileSpec[]>(initialHydrated.files);
  const [activeFilename, setActiveFilename] = useState<string>(initialHydrated.activeFilename);
  const [lastStarterCode, setLastStarterCode] = useState<string>(initialHydrated.starterSnapshot);
  const [snippetTitle, setSnippetTitle] = useState<string>(activeLesson?.title || course.title);
  const [previewDoc, setPreviewDoc] = useState<string>('');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ level: 'log' | 'error' | 'info'; text: string }>>([]);
  const [sqlResult, setSqlResult] = useState<SqlExecutionState | null>(null);
  const [runningSql, setRunningSql] = useState(false);
  const [validatingTask, setValidatingTask] = useState(false);
  const [selectedReasoning, setSelectedReasoning] = useState<string>('');
  const [taskValidationOutcome, setTaskValidationOutcome] = useState<{
    passedTaskChecks: boolean;
    errors: string[];
    missingTokens: string[];
    reasoningCheck?: { checked: boolean; correct: boolean; message: string };
    inspectionNote: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [cloudWorkspaceId, setCloudWorkspaceId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  const activeFileObj = useMemo(
    () => files.find((f) => f.filename === activeFilename) || files[0] || { filename: 'snippet.txt', language: 'html', code: '' },
    [files, activeFilename]
  );

  const code = activeFileObj.code;
  const language = activeFileObj.language;

  const setCode = (nextCode: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.filename === activeFileObj.filename ? { ...f, code: nextCode } : f))
    );
  };

  const setLanguage = (nextLang: string) => {
    const norm = normalizePracticeLanguage(nextLang);
    setFiles((prev) =>
      prev.map((f) => (f.filename === activeFileObj.filename ? { ...f, language: norm } : f))
    );
  };

  // Re-hydrate cleanly when switching courses
  useEffect(() => {
    const nextState = hydrateFromStorageOrStarter();
    setFiles(nextState.files);
    setActiveFilename(nextState.activeFilename);
    setLastStarterCode(nextState.starterSnapshot);
    setSnippetTitle(activeLesson?.title || course.title);
    setPreviewDoc('');
    setConsoleLogs([]);
    setSqlResult(null);
    setTaskValidationOutcome(null);
    setSelectedReasoning('');
    onTabChange('code');
  }, [storageKey]);

  // Persist current course multi-file draft across lessons & reloads
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          code,
          language,
          files,
          activeFilename: activeFileObj.filename,
          starterCode: lastStarterCode,
          title: snippetTitle,
          updatedAt: Date.now(),
        })
      );
    } catch {
      // ignore quota error
    }
  }, [code, language, files, activeFileObj.filename, lastStarterCode, snippetTitle, storageKey]);

  // Apply explicit "Try It Yourself" handoff from lesson blocks/examples
  useEffect(() => {
    if (!seededSnippet) return;
    const normLang = normalizePracticeLanguage(seededSnippet.language, seededSnippet.code);
    const fname = filenameForLanguage(normLang);
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.filename === fname || f.language === normLang);
      if (idx >= 0) {
        return prev.map((f, i) => (i === idx ? { ...f, language: normLang, code: seededSnippet.code } : f));
      }
      return [{ filename: fname, language: normLang, code: seededSnippet.code }, ...prev];
    });
    setActiveFilename(fname);
    setLastStarterCode(seededSnippet.code);
    setSnippetTitle(seededSnippet.title || activeLesson?.title || course.title);
    setTaskValidationOutcome(null);
    setStatusMessage(`Loaded "${seededSnippet.title || 'Example'}" into Code Editor.`);
  }, [seededSnippet]);

  // Capture sandbox console/runtime errors
  useEffect(() => {
    const handler = (evt: MessageEvent) => {
      if (evt.data && evt.data.__bcschools_practice === instanceIdRef.current) {
        setConsoleLogs((prev) => [
          ...prev.slice(-60),
          {
            level: evt.data.level === 'error' ? 'error' : 'log',
            text: String(evt.data.text),
          },
        ]);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const syncScroll = () => {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const executeSqlQuery = async (sqlOverride?: string, switchToPreview = true) => {
    const sqlText = sqlOverride !== undefined ? sqlOverride : code;
    if (sqlOverride !== undefined) setCode(sqlOverride);
    setRunningSql(true);
    setConsoleLogs([]);
    try {
      const res = await api.post<Omit<SqlExecutionState, 'ran'>>('/labs/sql/execute', { query: sqlText });
      setSqlResult({ ran: true, ...res });
      setConsoleLogs([
        {
          level: 'log',
          text:
            res.statementType === 'query'
              ? `SQLite :memory: returned ${res.rowCount} row(s) in ${res.durationMs}ms.`
              : `SQLite :memory: updated ${res.changes} row(s) in ${res.durationMs}ms.`,
        },
      ]);
    } catch (err) {
      const errText = err instanceof ApiError ? err.message : 'SQL execution failed.';
      setSqlResult({
        ran: true,
        ok: false,
        columns: [],
        rows: [],
        rowCount: 0,
        changes: 0,
        durationMs: 0,
        statementType: 'query',
        error: errText,
      });
      setConsoleLogs([{ level: 'error', text: errText }]);
    } finally {
      setRunningSql(false);
      if (switchToPreview) onTabChange('preview');
    }
  };

  const runCode = async (switchToPreview = true) => {
    setConsoleLogs([]);
    setStatusMessage(null);
    const id = instanceIdRef.current;
    const normLang = normalizePracticeLanguage(language, code);

    // 1. Live in-memory SQL execution
    if (normLang === 'sql') {
      await executeSqlQuery(code, switchToPreview);
      return;
    }

    // 2. Live multi-file HTML / CSS / SVG browser preview
    if (normLang === 'html' || normLang === 'css' || normLang === 'svg' || code.trim().startsWith('<')) {
      const bridge = `<script>(function(){const send=(lvl,args)=>parent.postMessage({__bcschools_practice:"${id}",level:lvl,text:args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')},'*');const origLog=console.log;const origErr=console.error;console.log=(...a)=>{origLog(...a);send('log',a);};console.error=(...a)=>{origErr(...a);send('error',a);};window.onerror=(m)=>send('error',[m]);window.addEventListener('unhandledrejection',(ev)=>send('error',[String(ev.reason)]));})();</script>`;
      const cssFile = files.find((f) => f.language === 'css' && f.filename !== activeFileObj.filename);
      const jsFile = files.find((f) => f.language === 'javascript' && f.filename !== activeFileObj.filename);
      const extraStyle = cssFile?.code ? `<style>${cssFile.code}</style>` : '';
      const extraScript =
        jsFile?.code && !code.includes('<script>')
          ? `<script>${jsFile.code.replace(/<\/script>/gi, '<\\/script>')}</script>`
          : '';

      let doc = code;
      if (normLang === 'svg' || code.trim().startsWith('<svg')) {
        doc = `<!DOCTYPE html><html><head>${bridge}<style>body{font-family:'Inter',system-ui,sans-serif;padding:18px;margin:0;background:#ffffff;display:flex;justify-content:center;align-items:center;min-height:200px;}</style></head><body>${code}</body></html>`;
      } else if (normLang === 'css' && !code.trim().startsWith('<')) {
        const htmlPartner = files.find((f) => f.language === 'html');
        const bodyHtml = htmlPartner?.code
          ? htmlPartner.code
          : `<div class="card demo-box"><h2>CSS Preview Canvas</h2><p>Style selectors such as <code>body</code>, <code>.card</code>, <code>h2</code>, and <code>p</code> reflect live here.</p><button>Sample Button</button></div>`;
        doc = `<!DOCTYPE html><html><head>${bridge}<style>${code}</style></head><body style="font-family:'Inter',system-ui,sans-serif;padding:20px;">${bodyHtml}</body></html>`;
      } else if (doc.includes('</head>')) {
        doc = doc.replace('</head>', `${bridge}${extraStyle}</head>`);
        if (extraScript && doc.includes('</body>')) {
          doc = doc.replace('</body>', `${extraScript}</body>`);
        }
      } else {
        doc = `<!DOCTYPE html><html><head>${bridge}${extraStyle}<style>body{font-family:'Inter',system-ui,sans-serif;padding:16px;margin:0;color:#0f172a;line-height:1.6;}</style></head><body>${doc}${extraScript}</body></html>`;
      }
      setPreviewDoc(doc);
      if (switchToPreview) onTabChange('preview');
      return;
    }

    // 3. Live isolated JavaScript console sandbox
    if (normLang === 'javascript') {
      const wrapped = `<!DOCTYPE html><html><body style="font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;background:#05070A;color:#e2e8f0;padding:14px;margin:0;font-size:12px;line-height:1.5;">
        <div style="color:#64748b;font-size:11px;margin-bottom:8px;">JavaScript Runtime Output</div>
        <div id="out"></div>
        <script>
          const out = document.getElementById('out');
          const pushLine = (msg, isErr) => {
            const row = document.createElement('div');
            row.style.padding = '2px 0';
            if (isErr) row.style.color = '#f87171';
            row.textContent = (isErr ? 'Error: ' : '> ') + msg;
            out.appendChild(row);
            parent.postMessage({ __bcschools_practice: "${id}", level: isErr ? 'error' : 'log', text: (isErr ? 'Error: ' : '') + msg }, '*');
          };
          console.log = (...a) => pushLine(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '), false);
          console.error = (...a) => pushLine(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '), true);
          window.addEventListener('unhandledrejection', (ev) => pushLine(String(ev.reason), true));
          try { ${code.replace(/<\/script>/gi, '<\\/script>')} } catch (e) {
            pushLine(e.message, true);
          }
        </script>
      </body></html>`;
      setPreviewDoc(wrapped);
      if (switchToPreview) onTabChange('preview');
      return;
    }

    // 4. Honest static syntax & discipline linting for non-browser technologies
    const issues = checkStaticDelimiters(code, normLang);
    const remoteEnabled = Boolean(capabilities?.sandbox?.remoteSandboxEnabled);
    setPreviewDoc('');
    if (issues.length > 0) {
      setConsoleLogs([
        { level: 'error', text: `${normLang.toUpperCase()} static syntax check: ${issues.join(' ')}` },
        {
          level: 'info',
          text: remoteEnabled
            ? 'Open in full Coding Workspace for remote container execution.'
            : 'Browser preview executes HTML, CSS, JavaScript, and in-memory SQL. Server-side execution requires configuring CODE_SANDBOX_URL.',
        },
      ]);
    } else {
      setConsoleLogs([
        {
          level: 'log',
          text: `${normLang.toUpperCase()} static delimiter & structure check passed (${code.split('\n').length} lines).`,
        },
        {
          level: 'info',
          text: remoteEnabled
            ? 'Remote container sandbox is enabled in the full Coding Workspace.'
            : 'Honest execution notice: Server execution for non-browser languages requires CODE_SANDBOX_URL; syntax structure validated cleanly.',
        },
      ]);
    }
    if (switchToPreview) onTabChange('preview');
  };

  const handleValidateTask = async () => {
    setValidatingTask(true);
    try {
      const combinedCode = files.map((f) => f.code).join('\n');
      const res = await api.post<{
        passedTaskChecks: boolean;
        errors: string[];
        missingTokens: string[];
        reasoningCheck?: { checked: boolean; correct: boolean; message: string };
        inspectionNote: string;
      }>('/labs/validate', {
        technologySlug: course.technology_slug,
        language,
        code: files.length > 1 && capabilityProfile.environmentType === 'web_dev_lab' ? combinedCode : code,
        requiredTokens: capabilityProfile.guidedTask.requiredTokens,
        reasoningAnswer: selectedReasoning || undefined,
        expectedReasoningAnswer: capabilityProfile.guidedTask.expectedReasoningAnswer,
      });
      setTaskValidationOutcome(res);
    } catch (err) {
      const issues = checkStaticDelimiters(code, normalizePracticeLanguage(language, code));
      const missingTokens = capabilityProfile.guidedTask.requiredTokens.filter(
        (tok) => !code.toLowerCase().includes(tok.toLowerCase())
      );
      setTaskValidationOutcome({
        passedTaskChecks: issues.length === 0 && missingTokens.length === 0,
        errors: issues,
        missingTokens,
        inspectionNote:
          err instanceof ApiError ? err.message : 'Validated locally against syntax delimiters and task rules.',
      });
    } finally {
      setValidatingTask(false);
    }
  };

  const handleLoadCurrentLessonStarter = () => {
    const initial = buildInitialFiles(course, activeLesson, capabilityProfile);
    const first = initial.files[initial.activeIndex] || initial.files[0];
    setFiles(initial.files);
    setActiveFilename(first.filename);
    setLastStarterCode(first.code);
    setSnippetTitle(activeLesson?.title || course.title);
    setTaskValidationOutcome(null);
    setStatusMessage('Loaded starter code from current lesson.');
  };

  const handleReset = () => {
    setCode(lastStarterCode);
    setPreviewDoc('');
    setConsoleLogs([]);
    setSqlResult(null);
    setTaskValidationOutcome(null);
    setStatusMessage('Reset editor to starter code.');
  };

  const handleFormat = () => {
    const formatted = code
      .split('\n')
      .map((line) => line.replace(/\s+$/g, ''))
      .join('\n')
      .trimEnd();
    setCode(formatted + '\n');
    setStatusMessage('Cleaned trailing whitespace.');
  };

  const handleSaveToWorkspace = async () => {
    if (!user) {
      setStatusMessage('Sign in to sync your practice code to your Braincode account.');
      return;
    }
    setSavingCloud(true);
    setStatusMessage(null);
    try {
      const filesPayload: Record<string, string> = {};
      for (const f of files) {
        filesPayload[f.filename] = f.code;
      }
      if (cloudWorkspaceId) {
        await api.put(`/workspaces/${cloudWorkspaceId}`, {
          name: `${course.technology_name || course.title} Practice`,
          language,
          files: filesPayload,
        });
        setStatusMessage('Saved changes to cloud workspace.');
      } else {
        const res = await api.post<{ workspace: Workspace }>('/workspaces', {
          name: `${course.technology_name || course.title} Practice`,
          description: `Practice sandbox for ${course.title}`,
          language,
          lessonId: activeLesson?.id || undefined,
          files: filesPayload,
        });
        setCloudWorkspaceId(res.workspace.id);
        setStatusMessage('Saved new practice workspace to your account.');
      }
    } catch (err) {
      setStatusMessage(err instanceof ApiError ? err.message : 'Could not save to cloud workspace; draft kept locally.');
    } finally {
      setSavingCloud(false);
    }
  };

  const lines = code.split('\n');
  const normLang = normalizePracticeLanguage(language, code);
  const canRunLocally = BROWSER_RUNNABLE.has(normLang);
  const isSqlLab = normLang === 'sql' || capabilityProfile.previewCapability === 'live_sql_table';
  const isDesignLab = capabilityProfile.environmentType === 'design_uiux_lab';
  const isSecurityLab = capabilityProfile.environmentType === 'security_network_lab';

  const primaryActionLabel = isSqlLab ? 'Run Query' : canRunLocally ? 'Run Code' : 'Check Syntax';
  const previewTabLabel = isSqlLab ? 'Query Lab' : isSecurityLab ? 'Security Lab' : 'Preview';

  const frameWidthClass =
    previewViewport === 'mobile'
      ? 'max-w-[375px] mx-auto'
      : previewViewport === 'tablet'
        ? 'max-w-[768px] mx-auto'
        : 'w-full';

  const firstErrorText = consoleLogs.find((l) => l.level === 'error')?.text;

  return (
    <section
      aria-label="Unified Practice Workspace"
      data-testid="practice-workspace-pane"
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden flex flex-col"
    >
      {/* Unified Tab Bar */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[var(--bg-muted)]">
          {(
            [
              { id: 'code', label: 'Code Editor', icon: Code2 },
              {
                id: 'preview',
                label: previewTabLabel,
                icon: isSqlLab ? Database : isSecurityLab ? ShieldCheck : Eye,
              },
              { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`practice-tab-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
                className={`min-h-[34px] px-2.5 sm:px-3 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 transition-workspace cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[var(--bg-surface)] text-[#0A84FF] dark:text-[#38BDF8] border border-[var(--border-default)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab !== 'whiteboard' && (
            <button
              type="button"
              data-testid="practice-run-btn"
              onClick={() => runCode(true)}
              className="h-9 px-3 rounded-lg bg-[#0A84FF] hover:bg-[#006EE6] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{primaryActionLabel}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Restore workspace split width' : 'Expand practice workspace'}
            title={isExpanded ? 'Restore split width' : 'Expand workspace'}
            className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide Practice Workspace"
              title="Hide Practice Workspace"
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Discipline Context Strip (unboxed clean metadata typography) */}
      <div
        data-testid="practice-lab-context"
        className="px-3.5 py-2 border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          <span className="font-semibold text-[var(--text-primary)]">{capabilityProfile.environmentLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{capabilityProfile.displayName}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {capabilityProfile.capabilityStatus === 'full_live'
              ? 'Live Interactive Preview'
              : capabilityProfile.capabilityStatus === 'hybrid_interactive'
                ? 'Interactive Toolkit & Canvas'
                : 'Syntax & Structure Check'}
          </span>
        </div>
        <span className="text-[var(--text-muted)] truncate max-w-xs" title={capabilityProfile.assessmentMethod}>
          {capabilityProfile.previewCapability === 'live_browser_dom'
            ? 'Instant HTML, CSS & JS output'
            : capabilityProfile.previewCapability === 'live_sql_table'
              ? 'Runs live SQL against practice tables'
              : 'Checks syntax & task steps'}
        </span>
      </div>

      {/* CODE EDITOR TAB (kept mounted via CSS so user edits never reset) */}
      <div className={activeTab === 'code' ? 'flex flex-col' : 'hidden'}>
        {/* Multi-file tab strip when multiple files exist */}
        {files.length > 1 && (
          <div
            data-testid="practice-file-tabs"
            className="px-3.5 py-1.5 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-wrap items-center gap-1.5"
          >
            {files.map((f) => {
              const isSelected = f.filename === activeFileObj.filename;
              return (
                <button
                  key={f.filename}
                  type="button"
                  data-testid={`practice-file-tab-${f.filename}`}
                  onClick={() => setActiveFilename(f.filename)}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-mono inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-[var(--bg-surface)] text-[#0A84FF] dark:text-[#38BDF8] border border-[var(--border-default)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <FileCode2 className="w-3 h-3 shrink-0" />
                  <span>{f.filename}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Code Utility Toolbar */}
        <div className="px-3.5 py-2 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <select
              value={language}
              onChange={(e) => {
                if (e.target.value === '__show_all__') {
                  setShowAllLanguages(true);
                  return;
                }
                setLanguage(e.target.value);
              }}
              aria-label="Practice language"
              className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 text-xs font-mono font-medium text-[var(--text-primary)]"
            >
              {(showAllLanguages
                ? PRACTICE_LANGUAGES
                : PRACTICE_LANGUAGES.filter((l) =>
                    getRelevantLanguageIds(capabilityProfile, activeLesson, files, language).has(l.id)
                  )
              ).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
              {!showAllLanguages && (
                <option value="__show_all__">+ All languages...</option>
              )}
            </select>
            <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[160px]" title={snippetTitle}>
              {snippetTitle}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {activeLesson && (activeLesson.starter_code || activeLesson.code_example) && (
              <button
                type="button"
                onClick={handleLoadCurrentLessonStarter}
                className="h-8 px-2.5 rounded-lg border border-[var(--border-default)] text-[11px] font-medium hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
              >
                Load Lesson Code
              </button>
            )}
            <button
              type="button"
              onClick={handleFormat}
              title="Clean trailing spaces"
              className="h-8 px-2 rounded-lg border border-[var(--border-default)] text-[11px] inline-flex items-center gap-1 hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clean</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(code).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="h-8 px-2 rounded-lg border border-[var(--border-default)] text-[11px] inline-flex items-center gap-1 hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="h-8 px-2 rounded-lg border border-[var(--border-default)] text-[11px] inline-flex items-center gap-1 hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              disabled={savingCloud}
              onClick={handleSaveToWorkspace}
              className="h-8 px-2.5 rounded-lg border border-[#0A84FF]/40 bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{savingCloud ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>

        {/* Monospaced Editor with Synced Line-Number Gutter */}
        <div className="flex bg-[#090D14] text-slate-100 font-mono text-xs leading-6 relative">
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="w-11 py-3 pr-2.5 pl-2 text-right text-slate-500 select-none border-r border-white/10 overflow-hidden bg-[#06090F] tabular-nums shrink-0 max-h-[380px]"
          >
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            ref={textareaRef}
            data-testid="practice-code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={syncScroll}
            spellCheck={false}
            placeholder={capabilityProfile.editorConfig.placeholder}
            aria-label="Practice code editor"
            rows={14}
            className="flex-1 min-w-0 min-h-[300px] max-h-[380px] bg-transparent text-slate-100 p-3 font-mono text-xs leading-6 focus:outline-none resize-y"
          />
        </div>

        {/* Honest Capability & Limitations Notice when non-browser / non-SQL */}
        {!canRunLocally && !isSqlLab && (
          <div className="px-3.5 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[#0A84FF] shrink-0 mt-0.5" />
            <span>{capabilityProfile.knownLimitations}</span>
          </div>
        )}

        {/* Guided Practical Task & Reasoning Verification */}
        <GuidedTaskAndReasoningBar
          task={capabilityProfile.guidedTask}
          checking={validatingTask}
          validationOutcome={taskValidationOutcome}
          selectedReasoning={selectedReasoning}
          onSelectReasoning={setSelectedReasoning}
          onCheckTask={handleValidateTask}
        />

        <div className="px-3.5 py-2 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
          <span>{statusMessage || 'Draft auto-preserved locally across lesson navigation.'}</span>
          {onAskAiDebug && (
            <button
              type="button"
              onClick={() => onAskAiDebug(code, firstErrorText)}
              className="text-[#0A84FF] dark:text-[#38BDF8] font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Explain / Debug with AI</span>
            </button>
          )}
        </div>
      </div>

      {/* LIVE PREVIEW / LAB TOOLS / CONSOLE TAB */}
      <div className={activeTab === 'preview' ? 'flex flex-col' : 'hidden'}>
        <div className="px-3.5 py-2 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 bg-[var(--bg-subtle)]">
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            {isSqlLab
              ? 'Isolated In-Memory SQLite Query Engine'
              : isSecurityLab
                ? 'Security & Networking Lab Tools'
                : canRunLocally
                  ? 'Isolated Live Preview (sandbox="allow-scripts")'
                  : `${language.toUpperCase()} Diagnostics`}
          </span>
          <div className="flex items-center gap-1.5">
            {canRunLocally && !isSqlLab && (
              <div className="flex items-center gap-1">
                {[
                  { id: 'desktop', icon: Monitor, label: 'Desktop preview width' },
                  { id: 'tablet', icon: Tablet, label: 'Tablet preview width' },
                  { id: 'mobile', icon: Smartphone, label: 'Mobile preview width' },
                ].map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    aria-label={vp.label}
                    onClick={() => setPreviewViewport(vp.id as 'desktop' | 'tablet' | 'mobile')}
                    className={`p-1.5 rounded cursor-pointer ${
                      previewViewport === vp.id
                        ? 'bg-[#0A84FF] text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <vp.icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => runCode(false)}
              className="h-7 px-2.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[11px] font-semibold cursor-pointer whitespace-nowrap"
            >
              {isSqlLab ? 'Re-Run Query' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="p-3 bg-[var(--bg-subtle)] space-y-3">
          {isSqlLab ? (
            <SqlLabPreviewPanel
              sqlResult={sqlResult}
              running={runningSql}
              onRunSampleQuery={(sampleSql) => executeSqlQuery(sampleSql, false)}
              onRunCurrent={() => executeSqlQuery(code, false)}
            />
          ) : (
            <>
              {previewDoc ? (
                <iframe
                  title="Practice live preview"
                  data-testid="practice-preview-iframe"
                  sandbox="allow-scripts"
                  srcDoc={previewDoc}
                  className={`${frameWidthClass} block h-72 rounded-lg bg-white border border-[var(--border-default)]`}
                />
              ) : !isSecurityLab ? (
                <div className="h-44 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-2 text-center p-4">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    {canRunLocally
                      ? 'Click Run Code to execute and render live output here.'
                      : `${language.toUpperCase()} static inspection active.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => runCode(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#0A84FF] hover:bg-[#006EE6] text-white text-xs font-semibold cursor-pointer"
                  >
                    {canRunLocally ? 'Run Code Now' : 'Run Syntax Check'}
                  </button>
                </div>
              ) : null}

              {isDesignLab && (
                <DesignContrastInspectorPanel onOpenWhiteboard={() => onTabChange('whiteboard')} />
              )}
              {isSecurityLab && <SecurityNetworkToolkitPanel code={code} />}
            </>
          )}
        </div>

        {/* Captured Console & Diagnostic Output */}
        <div
          data-testid="practice-console-output"
          className="px-3.5 py-3 bg-[#090D14] border-t border-white/10 font-mono text-xs space-y-1 min-h-[88px] max-h-44 overflow-y-auto"
        >
          <div className="flex items-center justify-between text-[11px] text-white/50 pb-1">
            <span className="inline-flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Console &amp; Diagnostic Output</span>
            </span>
            {firstErrorText && onAskAiDebug && (
              <button
                type="button"
                onClick={() => onAskAiDebug(code, firstErrorText)}
                className="text-rose-300 hover:underline font-sans font-semibold cursor-pointer"
              >
                Debug error with AI
              </button>
            )}
          </div>
          {consoleLogs.length === 0 ? (
            <p className="text-white/45 text-[11px]">&gt; Console ready. Output and runtime errors appear here.</p>
          ) : (
            consoleLogs.map((entry, idx) => (
              <div
                key={idx}
                className={
                  entry.level === 'error'
                    ? 'text-rose-400'
                    : entry.level === 'info'
                      ? 'text-amber-300'
                      : 'text-cyan-300'
                }
              >
                &gt; {entry.text}
              </div>
            ))
          )}
        </div>
      </div>

      {/* WHITEBOARD TAB (kept mounted via CSS so drawings survive tab & lesson changes) */}
      <div className={activeTab === 'whiteboard' ? 'p-3.5' : 'hidden'}>
        <InteractiveWhiteboard
          courseId={course.id}
          courseTitle={course.title}
          lessonTitle={activeLesson?.title}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
        />
      </div>
    </section>
  );
}
