import vm from 'node:vm';
import { db } from './db.ts';

export type CodeValidationMethod = 'vm_executed' | 'vm_syntax' | 'static_inspection';

export interface CodeValidationResult {
  id: string;
  source: 'code_examples' | 'lessons';
  lessonId: string;
  lessonStatus: string;
  title: string;
  language: string;
  validationMethod: CodeValidationMethod;
  valid: boolean;
  hasExpectedOutput: boolean;
  stdout: string;
  warnings: string[];
  errors: string[];
  inspectionNote: string;
}

function checkBalancedDelimiters(code: string): string[] {
  const errors: string[] = [];
  const pairs: Array<[string, string, string]> = [
    ['{', '}', 'curly braces'],
    ['(', ')', 'parentheses'],
    ['[', ']', 'square brackets'],
  ];
  for (const [open, close, label] of pairs) {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let escaped = false;
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === "'" && !inDouble && !inBacktick) {
        inSingle = !inSingle;
        continue;
      }
      if (ch === '"' && !inSingle && !inBacktick) {
        inDouble = !inDouble;
        continue;
      }
      if (ch === '`' && !inSingle && !inDouble) {
        inBacktick = !inBacktick;
        continue;
      }
      if (inSingle || inDouble || inBacktick) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth < 0) {
          errors.push(`Unmatched closing ${label} ('${close}').`);
          break;
        }
      }
    }
    if (depth > 0) {
      errors.push(`Unclosed ${label} (${depth} missing '${close}').`);
    }
  }
  return errors;
}

export function validateSingleCodeSnippet(params: {
  id: string;
  source: 'code_examples' | 'lessons';
  lessonId: string;
  lessonStatus?: string;
  title: string;
  language: string;
  code: string;
  expectedOutput?: string;
}): CodeValidationResult {
  const lang = String(params.language || 'javascript').trim().toLowerCase();
  const lessonStatus = String(params.lessonStatus || 'published').trim().toLowerCase();
  const code = String(params.code || '').trim();
  const hasExpectedOutput = Boolean(String(params.expectedOutput || '').trim());
  const warnings: string[] = [];
  const errors: string[] = [];
  let validationMethod: CodeValidationMethod = 'static_inspection';
  let stdout = '';

  if (!code) {
    return {
      id: params.id,
      source: params.source,
      lessonId: params.lessonId,
      lessonStatus,
      title: params.title,
      language: lang,
      validationMethod: 'static_inspection',
      valid: false,
      hasExpectedOutput,
      stdout: '',
      warnings: [],
      errors: ['Code snippet is empty.'],
      inspectionNote: 'Static inspection only.',
    };
  }

  // Secret/unsafe literal check across all languages
  if (/sk_live_[A-Za-z0-9]{10,}/.test(code) || /\beval\s*\(/.test(code)) {
    warnings.push('Unsafe pattern or credential-like token detected.');
  }

  const isEsmJs =
    (lang === 'javascript' || lang === 'js') &&
    (/^\s*(import\s+|export\s+)/m.test(code));

  if ((lang === 'javascript' || lang === 'js') && !isEsmJs) {
    validationMethod = 'vm_syntax';
    try {
      const script = new vm.Script(code);
      // Execute pure self-contained console-output snippets in isolated VM without Node globals
      const needsDomOrNodeGlobals = /\b(document|window|require|process|fetch|setTimeout|http|fs|res\.status|req\.)\b/.test(code);
      if (!needsDomOrNodeGlobals && code.includes('console.log')) {
        const logs: string[] = [];
        const sandbox = {
          console: {
            log: (...args: unknown[]) =>
              logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
            error: (...args: unknown[]) =>
              logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
          },
          Math,
          JSON,
          Array,
          Object,
          String,
          Number,
          Boolean,
          Date,
          Map,
          Set,
          RegExp,
          Error,
          Promise,
        };
        const ctx = vm.createContext(sandbox);
        script.runInContext(ctx, { timeout: 150 });
        validationMethod = 'vm_executed';
        stdout = logs.join('\n').trim();
      }
    } catch (err) {
      errors.push(`JavaScript syntax/execution error: ${(err as Error).message}`);
    }
  } else if (lang === 'json') {
    try {
      JSON.parse(code);
    } catch (err) {
      errors.push(`Invalid JSON: ${(err as Error).message}`);
    }
  } else if (lang === 'html') {
    const opens = (code.match(/<(div|section|article|main|header|footer|form|table|ul|ol|nav)\b/gi) || []).length;
    const closes = (code.match(/<\/(div|section|article|main|header|footer|form|table|ul|ol|nav)>/gi) || []).length;
    if (opens !== closes) {
      warnings.push(`HTML structural container tag mismatch (${opens} opening vs ${closes} closing).`);
    }
  } else if (lang === 'python' || lang === 'py') {
    const lines = code.split('\n');
    const missingColon = lines.some(
      (ln) =>
        /^\s*(def |class |if |elif |else\b|for |while |try\b|except\b)/.test(ln) &&
        !ln.trim().startsWith('#') &&
        !ln.trim().endsWith(':') &&
        !ln.trim().endsWith('\\')
    );
    if (missingColon) {
      warnings.push('Python block statement appears to be missing a trailing colon (:).');
    }
    errors.push(...checkBalancedDelimiters(code));
  } else {
    // TypeScript, JSX/TSX, ESM JS, CSS, SQL, Java, C++, Go, Rust, Bash, Dockerfile
    if (!['sql', 'bash', 'sh', 'dockerfile', 'markdown', 'text'].includes(lang)) {
      errors.push(...checkBalancedDelimiters(code));
    }
    if (lang === 'sql' && !/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|WITH|PRAGMA)\b/i.test(code)) {
      warnings.push('SQL snippet does not contain a standard SQL statement keyword.');
    }
  }

  if (
    params.source === 'code_examples' &&
    !hasExpectedOutput &&
    ['javascript', 'js', 'python', 'py', 'sql', 'java', 'cpp', 'typescript', 'ts'].includes(lang)
  ) {
    warnings.push('Expected output annotation is blank.');
  }

  const inspectionNote =
    validationMethod === 'vm_executed'
      ? 'Executed inside isolated Node VM (150ms timeout, no filesystem/network access).'
      : validationMethod === 'vm_syntax'
        ? 'Verified JavaScript syntax via Node VM parser.'
        : 'Statically inspected syntax and delimiters (full compiler/interpreter execution requires CODE_SANDBOX_URL).';

  return {
    id: params.id,
    source: params.source,
    lessonId: params.lessonId,
    lessonStatus,
    title: params.title,
    language: lang,
    validationMethod,
    valid: errors.length === 0,
    hasExpectedOutput,
    stdout,
    warnings,
    errors,
    inspectionNote,
  };
}

export function auditAllCurriculumCodeExamples() {
  const examples = db
    .prepare(
      `SELECT ce.id, ce.lesson_id, ce.title, ce.language, ce.code, ce.expected_output,
              COALESCE(l.status, 'published') as lesson_status
       FROM code_examples ce
       LEFT JOIN lessons l ON l.id = ce.lesson_id
       ORDER BY ce.lesson_id ASC, ce.sort_order ASC`
    )
    .all() as Array<{
    id: string;
    lesson_id: string;
    title: string;
    language: string;
    code: string;
    expected_output: string;
    lesson_status: string;
  }>;

  const lessonExamples = db
    .prepare(
      `SELECT id, title, language, code_example, COALESCE(status, 'published') as lesson_status
       FROM lessons
       WHERE LENGTH(TRIM(COALESCE(code_example, ''))) > 0
       ORDER BY course_id ASC, sort_order ASC`
    )
    .all() as Array<{
    id: string;
    title: string;
    language: string;
    code_example: string;
    lesson_status: string;
  }>;

  const results: CodeValidationResult[] = [
    ...examples.map((ce) =>
      validateSingleCodeSnippet({
        id: ce.id,
        source: 'code_examples',
        lessonId: ce.lesson_id,
        lessonStatus: ce.lesson_status,
        title: ce.title,
        language: ce.language,
        code: ce.code,
        expectedOutput: ce.expected_output,
      })
    ),
    ...lessonExamples.map((l) =>
      validateSingleCodeSnippet({
        id: l.id,
        source: 'lessons',
        lessonId: l.id,
        lessonStatus: l.lesson_status,
        title: l.title,
        language: l.language,
        code: l.code_example,
        expectedOutput: 'primary_lesson_snippet',
      })
    ),
  ];

  const failed = results.filter((r) => !r.valid);
  const publishedFailed = failed.filter((r) => r.lessonStatus === 'published');
  const withWarnings = results.filter((r) => r.warnings.length > 0);
  const vmExecuted = results.filter((r) => r.validationMethod === 'vm_executed').length;
  const vmSyntax = results.filter((r) => r.validationMethod === 'vm_syntax').length;
  const staticInspected = results.filter((r) => r.validationMethod === 'static_inspection').length;

  return {
    checkedAt: new Date().toISOString(),
    remoteSandboxConfigured: Boolean(process.env.CODE_SANDBOX_URL),
    summary: {
      totalChecked: results.length,
      codeExamplesTableCount: examples.length,
      lessonInlineCount: lessonExamples.length,
      validCount: results.length - failed.length,
      failedCount: failed.length,
      publishedFailedCount: publishedFailed.length,
      warningsCount: withWarnings.length,
      vmExecutedCount: vmExecuted,
      vmSyntaxCount: vmSyntax,
      staticInspectionCount: staticInspected,
    },
    failed,
    warnings: withWarnings.slice(0, 50),
    sampleExecuted: results.filter((r) => r.validationMethod === 'vm_executed').slice(0, 15),
  };
}
