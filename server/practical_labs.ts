import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { db } from './db.ts';
import { validateSingleCodeSnippet } from './code_validator.ts';
import {
  ENVIRONMENT_LABELS,
  resolveTechnologyCapability,
  type PracticalEnvironmentType,
  type TechnologyCapabilityProfile,
} from '../shared/technologyCapabilities.ts';

export interface SqlSampleTableInfo {
  tableName: string;
  columns: Array<{ name: string; type: string }>;
  sampleRowCount: number;
}

export const SQL_SANDBOX_SCHEMA_SUMMARY: SqlSampleTableInfo[] = [
  {
    tableName: 'departments',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'TEXT' },
      { name: 'budget', type: 'INTEGER' },
    ],
    sampleRowCount: 4,
  },
  {
    tableName: 'employees',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'name', type: 'TEXT' },
      { name: 'department_id', type: 'INTEGER' },
      { name: 'role', type: 'TEXT' },
      { name: 'salary', type: 'INTEGER' },
    ],
    sampleRowCount: 6,
  },
  {
    tableName: 'courses',
    columns: [
      { name: 'id', type: 'TEXT' },
      { name: 'title', type: 'TEXT' },
      { name: 'category', type: 'TEXT' },
      { name: 'difficulty', type: 'TEXT' },
      { name: 'hours', type: 'INTEGER' },
    ],
    sampleRowCount: 5,
  },
  {
    tableName: 'orders',
    columns: [
      { name: 'id', type: 'INTEGER' },
      { name: 'learner_name', type: 'TEXT' },
      { name: 'course_id', type: 'TEXT' },
      { name: 'amount_usd', type: 'INTEGER' },
      { name: 'status', type: 'TEXT' },
    ],
    sampleRowCount: 6,
  },
];

function createSeededMemorySqlDb(): DatabaseSync {
  const mem = new DatabaseSync(':memory:');
  mem.exec(`
    CREATE TABLE departments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      budget INTEGER NOT NULL
    );
    CREATE TABLE employees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      salary INTEGER NOT NULL
    );
    CREATE TABLE courses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      hours INTEGER NOT NULL
    );
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      learner_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      amount_usd INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    INSERT INTO departments (id, name, budget) VALUES
      (1, 'Curriculum Engineering', 240000),
      (2, 'Platform Security', 190000),
      (3, 'Data & AI Systems', 280000),
      (4, 'Product Design', 150000);

    INSERT INTO employees (id, name, department_id, role, salary) VALUES
      (101, 'Adaeze Okafor', 1, 'Senior Instructor', 112000),
      (102, 'Marcus Vance', 1, 'Principal Architect', 142000),
      (103, 'Elena Rostova', 3, 'Data Curriculum Lead', 128000),
      (104, 'Tariq Mensah', 2, 'AppSec Engineer', 135000),
      (105, 'Hana Kim', 4, 'Lead UX Designer', 118000),
      (106, 'David Chen', 3, 'ML Engineer', 138000);

    INSERT INTO courses (id, title, category, difficulty, hours) VALUES
      ('c_html', 'HTML5 Semantic Markup', 'Web Development', 'Beginner', 10),
      ('c_css', 'CSS3 Flexbox & Grid', 'Web Development', 'Beginner', 12),
      ('c_sql', 'SQL Relational Modeling', 'Database Management', 'Beginner', 14),
      ('c_py', 'Python Production Systems', 'Programming Languages', 'Beginner', 18),
      ('c_sec', 'AppSec & OWASP Defense', 'Cybersecurity', 'Intermediate', 16);

    INSERT INTO orders (id, learner_name, course_id, amount_usd, status) VALUES
      (1, 'Grace Obi', 'c_sql', 49, 'paid'),
      (2, 'Samuel Ade', 'c_py', 79, 'paid'),
      (3, 'Nadia Patel', 'c_sec', 79, 'paid'),
      (4, 'Lucas Meyer', 'c_html', 29, 'paid'),
      (5, 'Amara Eze', 'c_py', 79, 'refunded'),
      (6, 'Kofi Boateng', 'c_sql', 49, 'paid');
  `);
  return mem;
}

export function executeInMemorySqlLab(rawSql: string): {
  ok: boolean;
  executionMode: 'server_sqlite_memory';
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  changes: number;
  durationMs: number;
  statementType: 'query' | 'mutation' | 'empty';
  error?: string;
} {
  const sql = String(rawSql || '').trim();
  const started = Date.now();
  if (!sql) {
    return {
      ok: false,
      executionMode: 'server_sqlite_memory',
      columns: [],
      rows: [],
      rowCount: 0,
      changes: 0,
      durationMs: 0,
      statementType: 'empty',
      error: 'Enter one or more SQL statements before running the query.',
    };
  }
  if (sql.length > 8000) {
    return {
      ok: false,
      executionMode: 'server_sqlite_memory',
      columns: [],
      rows: [],
      rowCount: 0,
      changes: 0,
      durationMs: 0,
      statementType: 'empty',
      error: 'Query exceeds 8,000 character sandbox limit.',
    };
  }
  // Disallow host-attached filesystem pragmas/attach statements
  if (/\b(ATTACH|DETACH|LOAD_EXTENSION|PRAGMA\s+WRITABLE_SCHEMA)\b/i.test(sql)) {
    return {
      ok: false,
      executionMode: 'server_sqlite_memory',
      columns: [],
      rows: [],
      rowCount: 0,
      changes: 0,
      durationMs: 0,
      statementType: 'empty',
      error: 'Blocked unsafe SQLite pragma or extension directive inside practice sandbox.',
    };
  }

  let mem: DatabaseSync | null = null;
  try {
    mem = createSeededMemorySqlDb();
    // Strip leading comments when determining primary final statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.split('\n').every((ln) => ln.trim() === '' || ln.trim().startsWith('--')));

    if (statements.length === 0) {
      return {
        ok: false,
        executionMode: 'server_sqlite_memory',
        columns: [],
        rows: [],
        rowCount: 0,
        changes: 0,
        durationMs: Date.now() - started,
        statementType: 'empty',
        error: 'No executable SQL statements found.',
      };
    }

    let lastRows: Array<Record<string, unknown>> = [];
    let totalChanges = 0;
    let lastWasQuery = false;

    for (const stmtSql of statements.slice(0, 12)) {
      const cleaned = stmtSql
        .split('\n')
        .filter((ln) => !ln.trim().startsWith('--'))
        .join('\n')
        .trim();
      const isQuery = /^(SELECT|WITH|EXPLAIN|VALUES|PRAGMA\s+table_info)/i.test(cleaned);
      if (isQuery) {
        const rows = mem.prepare(stmtSql).all() as Array<Record<string, unknown>>;
        lastRows = rows.slice(0, 100);
        lastWasQuery = true;
      } else {
        const info = mem.prepare(stmtSql).run();
        totalChanges += Number(info.changes || 0);
        lastWasQuery = false;
      }
    }

    const columns = lastRows.length > 0 ? Object.keys(lastRows[0]) : [];
    return {
      ok: true,
      executionMode: 'server_sqlite_memory',
      columns,
      rows: lastRows,
      rowCount: lastRows.length,
      changes: totalChanges,
      durationMs: Date.now() - started,
      statementType: lastWasQuery ? 'query' : 'mutation',
    };
  } catch (err) {
    return {
      ok: false,
      executionMode: 'server_sqlite_memory',
      columns: [],
      rows: [],
      rowCount: 0,
      changes: 0,
      durationMs: Date.now() - started,
      statementType: 'query',
      error: (err as Error).message,
    };
  } finally {
    try {
      mem?.close();
    } catch {
      // ignore close error
    }
  }
}

export function listAllTechnologyCapabilities(filters?: {
  slug?: string;
  category?: string;
  environmentType?: PracticalEnvironmentType | '';
}): {
  totalTechnologies: number;
  summaryByEnvironment: Record<string, number>;
  summaryByStatus: Record<string, number>;
  capabilities: TechnologyCapabilityProfile[];
} {
  const rows = db
    .prepare(
      `SELECT t.id, t.slug, t.name, t.category_id, c.slug as category_slug, c.name as category_name
       FROM technologies t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.is_published = 1
       ORDER BY t.sort_order ASC, t.name ASC`
    )
    .all() as Array<{
    id: string;
    slug: string;
    name: string;
    category_id: string;
    category_slug: string | null;
    category_name: string | null;
  }>;

  const allProfiles = rows.map((r) =>
    resolveTechnologyCapability({
      id: r.id,
      slug: r.slug,
      name: r.name,
      categoryId: r.category_id,
      categorySlug: r.category_slug || undefined,
      categoryName: r.category_name || undefined,
    })
  );

  const summaryByEnvironment: Record<string, number> = {};
  const summaryByStatus: Record<string, number> = {};
  for (const p of allProfiles) {
    summaryByEnvironment[p.environmentType] = (summaryByEnvironment[p.environmentType] || 0) + 1;
    summaryByStatus[p.capabilityStatus] = (summaryByStatus[p.capabilityStatus] || 0) + 1;
  }

  let filtered = allProfiles;
  if (filters?.slug) {
    const target = filters.slug.trim().toLowerCase();
    filtered = filtered.filter((p) => p.slug.toLowerCase() === target || p.technologyId.toLowerCase() === target);
  }
  if (filters?.category && filters.category !== 'all') {
    const cat = filters.category.trim().toLowerCase();
    filtered = filtered.filter(
      (p) => p.categoryId.toLowerCase() === cat || p.categoryName.toLowerCase().includes(cat)
    );
  }
  if (filters?.environmentType) {
    filtered = filtered.filter((p) => p.environmentType === filters.environmentType);
  }

  return {
    totalTechnologies: allProfiles.length,
    summaryByEnvironment,
    summaryByStatus,
    capabilities: filtered,
  };
}

export function getTechnologyCapabilityBySlug(slugOrId: string): TechnologyCapabilityProfile | null {
  const row = db
    .prepare(
      `SELECT t.id, t.slug, t.name, t.category_id, c.slug as category_slug, c.name as category_name
       FROM technologies t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE LOWER(t.slug) = LOWER(?) OR LOWER(t.id) = LOWER(?)`
    )
    .get(slugOrId, slugOrId) as
    | {
        id: string;
        slug: string;
        name: string;
        category_id: string;
        category_slug: string | null;
        category_name: string | null;
      }
    | undefined;

  if (!row) return null;
  return resolveTechnologyCapability({
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id,
    categorySlug: row.category_slug || undefined,
    categoryName: row.category_name || undefined,
  });
}

function lintDisciplineSpecificContent(code: string, language: string, technologySlug?: string): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lang = language.toLowerCase();
  const slug = (technologySlug || '').toLowerCase();

  if (lang === 'dockerfile' || slug === 'docker') {
    if (!/^\s*FROM\s+\S+/im.test(code)) {
      errors.push('Dockerfile must specify a base image using FROM <image>.');
    }
    if (!/^\s*USER\s+(?!root\b)\S+/im.test(code)) {
      warnings.push('Container hardening tip: define a non-root USER instruction.');
    }
    if (/latest\b/i.test(code) && !/alpine/i.test(code)) {
      warnings.push('Pin explicit image tags rather than floating :latest tags for reproducible builds.');
    }
  } else if (lang === 'yaml' || lang === 'yml') {
    if (code.includes('\t')) {
      errors.push('YAML forbids literal Tab characters for indentation; use spaces instead.');
    }
    if (slug === 'kubernetes') {
      for (const reqKey of ['apiVersion:', 'kind:', 'metadata:']) {
        if (!code.includes(reqKey)) {
          errors.push(`Kubernetes manifest is missing required top-level key "${reqKey}".`);
        }
      }
    }
  } else if (lang === 'svg' || (slug === 'figma' && code.includes('<svg'))) {
    if (!code.includes('<svg') || !code.includes('</svg>')) {
      errors.push('SVG canvas must open with <svg ...> and close cleanly with </svg>.');
    }
    if (!code.includes('viewBox')) {
      warnings.push('Add a viewBox attribute so your vector diagram scales cleanly across viewports.');
    }
  } else if (lang === 'tsx' || lang === 'typescript' || slug === 'react') {
    if (slug === 'react' && !/\b(return|=>)\s*[\s\S]*</.test(code)) {
      warnings.push('React component starter does not appear to return JSX markup.');
    }
  }

  return { errors, warnings };
}

export function validateLabSubmission(params: {
  technologySlug?: string;
  language: string;
  code: string;
  requiredTokens?: string[];
  reasoningAnswer?: string;
  expectedReasoningAnswer?: string;
  jsTestExpression?: string;
  jsExpectedResult?: string;
}): {
  valid: boolean;
  passedTaskChecks: boolean;
  validationMethod: string;
  remoteSandboxConfigured: boolean;
  stdout: string;
  errors: string[];
  warnings: string[];
  missingTokens: string[];
  reasoningCheck?: { checked: boolean; correct: boolean; message: string };
  inspectionNote: string;
} {
  const lang = String(params.language || 'javascript').trim().toLowerCase();
  const code = String(params.code || '');
  const baseCheck = validateSingleCodeSnippet({
    id: `lab_${Date.now()}`,
    source: 'code_examples',
    lessonId: 'practice_lab',
    title: params.technologySlug || lang,
    language: lang,
    code,
    expectedOutput: params.jsExpectedResult || 'verified',
  });

  const disciplineLint = lintDisciplineSpecificContent(code, lang, params.technologySlug);
  const errors = [...baseCheck.errors, ...disciplineLint.errors];
  const warnings = [...baseCheck.warnings, ...disciplineLint.warnings];

  const required = Array.isArray(params.requiredTokens) ? params.requiredTokens.filter(Boolean) : [];
  const lowerCode = code.toLowerCase();
  const missingTokens = required.filter((tok) => !lowerCode.includes(tok.toLowerCase()));

  let stdout = baseCheck.stdout;
  let validationMethod: string = baseCheck.validationMethod;
  const remoteSandboxConfigured = Boolean(process.env.CODE_SANDBOX_URL);

  // If JS test expression is provided, safely evaluate it against user's code in an isolated Node VM
  if ((lang === 'javascript' || lang === 'js') && params.jsTestExpression && errors.length === 0) {
    try {
      const ctx = vm.createContext({
        Math,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        console: { log: () => {}, error: () => {} },
      });
      const combined = `${code}\n;JSON.stringify((() => (${params.jsTestExpression}))())`;
      const actualJson = new vm.Script(combined).runInContext(ctx, { timeout: 150 });
      stdout = String(actualJson ?? '');
      validationMethod = 'vm_executed';
      if (params.jsExpectedResult !== undefined && stdout !== params.jsExpectedResult) {
        errors.push(`Test assertion failed: expected ${params.jsExpectedResult}, got ${stdout}.`);
      }
    } catch (err) {
      errors.push(`JavaScript test execution failed: ${(err as Error).message}`);
    }
  }

  let reasoningCheck: { checked: boolean; correct: boolean; message: string } | undefined;
  if (params.expectedReasoningAnswer && params.reasoningAnswer !== undefined && params.reasoningAnswer !== '') {
    const correct =
      params.reasoningAnswer.trim().toLowerCase() === params.expectedReasoningAnswer.trim().toLowerCase();
    reasoningCheck = {
      checked: true,
      correct,
      message: correct
        ? 'Reasoning verification passed!'
        : 'Reasoning check did not match yet — trace the code step-by-step and try again.',
    };
  }

  const valid = errors.length === 0;
  const passedTaskChecks =
    valid && missingTokens.length === 0 && (!reasoningCheck || reasoningCheck.correct);

  return {
    valid,
    passedTaskChecks,
    validationMethod,
    remoteSandboxConfigured,
    stdout,
    errors,
    warnings,
    missingTokens,
    reasoningCheck,
    inspectionNote: remoteSandboxConfigured
      ? baseCheck.inspectionNote
      : lang === 'javascript' || lang === 'js'
        ? baseCheck.inspectionNote
        : lang === 'sql'
          ? 'Validated SQL query structure; execute against our in-memory SQLite practice database via Run Query.'
          : `${baseCheck.inspectionNote} (Honest reporting: no fabricated runtime output.)`,
  };
}

export { ENVIRONMENT_LABELS };
