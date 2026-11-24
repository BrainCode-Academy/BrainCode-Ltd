import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Database,
  HelpCircle,
  KeyRound,
  Network,
  Palette,
  PenTool,
  Play,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { LabTaskSpec } from '../../shared/technologyCapabilities';

export interface SqlExecutionState {
  ran: boolean;
  ok: boolean;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  changes: number;
  durationMs: number;
  statementType: 'query' | 'mutation' | 'empty';
  error?: string;
}

const SAMPLE_SQL_TABLES = [
  { name: 'departments', cols: 'id, name, budget' },
  { name: 'employees', cols: 'id, name, department_id, role, salary' },
  { name: 'courses', cols: 'id, title, category, difficulty, hours' },
  { name: 'orders', cols: 'id, learner_name, course_id, amount_usd, status' },
];

export function SqlLabPreviewPanel({
  sqlResult,
  running,
  onRunSampleQuery,
  onRunCurrent,
}: {
  sqlResult: SqlExecutionState | null;
  running: boolean;
  onRunSampleQuery: (query: string) => void;
  onRunCurrent: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>In-Memory Practice Schema (SQLite)</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onRunSampleQuery(
                  `SELECT d.name AS department, COUNT(e.id) AS staff, ROUND(AVG(e.salary), 0) AS avg_salary\nFROM departments d\nLEFT JOIN employees e ON e.department_id = d.id\nGROUP BY d.id, d.name\nORDER BY avg_salary DESC;`
                )
              }
              className="h-7 px-2.5 rounded-lg border border-[var(--border-default)] text-[11px] font-medium hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
            >
              Load JOIN Sample
            </button>
            <button
              type="button"
              onClick={() =>
                onRunSampleQuery(
                  `SELECT c.title, COUNT(o.id) AS orders, SUM(o.amount_usd) AS revenue_usd\nFROM courses c\nJOIN orders o ON o.course_id = c.id\nWHERE o.status = 'paid'\nGROUP BY c.id\nORDER BY revenue_usd DESC;`
                )
              }
              className="h-7 px-2.5 rounded-lg border border-[var(--border-default)] text-[11px] font-medium hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
            >
              Load Revenue Sample
            </button>
            <button
              type="button"
              disabled={running}
              onClick={onRunCurrent}
              className="h-7 px-2.5 rounded-lg bg-[#0A84FF] hover:bg-[#006EE6] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              <span>{running ? 'Running...' : 'Run Query'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          {SAMPLE_SQL_TABLES.map((tbl) => (
            <div
              key={tbl.name}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] min-w-0"
            >
              <span className="font-mono font-semibold text-[var(--text-primary)]">{tbl.name}</span>
              <span className="text-[var(--text-muted)] mx-1">·</span>
              <span className="font-mono text-[var(--text-secondary)] break-words">{tbl.cols}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        data-testid="sql-lab-result-grid"
        className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden"
      >
        {!sqlResult ? (
          <div className="p-6 text-center text-xs text-[var(--text-muted)]">
            Click <span className="font-semibold text-[var(--text-primary)]">Run Query</span> to execute your SQL
            against the practice tables above.
          </div>
        ) : !sqlResult.ok ? (
          <div className="p-4 text-xs text-[var(--status-danger)] flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold">SQL Execution Error</p>
              <p className="font-mono mt-0.5 break-words">{sqlResult.error}</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="px-3.5 py-2 border-b border-[var(--border-default)] bg-[var(--bg-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)] tabular-nums">
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {sqlResult.statementType === 'query'
                    ? `${sqlResult.rowCount} row(s) returned`
                    : `${sqlResult.changes} row(s) affected`}
                </span>
              </span>
              <span className="font-mono">SQLite :memory: · {sqlResult.durationMs} ms</span>
            </div>

            {sqlResult.columns.length > 0 ? (
              <div className="overflow-x-auto max-h-64">
                <table className="bc-table">
                  <thead>
                    <tr>
                      {sqlResult.columns.map((col) => (
                        <th key={col} className="font-mono whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {sqlResult.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {sqlResult.columns.map((col) => (
                          <td key={col} className="font-mono text-[var(--text-secondary)] whitespace-nowrap">
                            {row[col] === null || row[col] === undefined ? 'NULL' : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-xs text-[var(--text-muted)]">
                Statement completed cleanly with zero result rows.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function DesignContrastInspectorPanel({
  onOpenWhiteboard,
}: {
  onOpenWhiteboard: () => void;
}) {
  const [fgHex, setFgHex] = useState('#0F172A');
  const [bgHex, setBgHex] = useState('#F8FAFC');

  const ratio = useMemo(() => {
    const fg = hexToRgb(fgHex);
    const bg = hexToRgb(bgHex);
    if (!fg || !bg) return null;
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const hi = Math.max(l1, l2);
    const lo = Math.min(l1, l2);
    return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
  }, [fgHex, bgHex]);

  const aaNormal = ratio !== null && ratio >= 4.5;
  const aaLarge = ratio !== null && ratio >= 3.0;
  const aaaNormal = ratio !== null && ratio >= 7.0;

  return (
    <div
      data-testid="design-wcag-inspector"
      className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5 space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-[#0A84FF]" />
          <span>WCAG 2.1 Contrast &amp; Design Token Inspector</span>
        </p>
        <button
          type="button"
          onClick={onOpenWhiteboard}
          className="h-7 px-2.5 rounded-lg border border-[var(--border-default)] text-[11px] font-medium inline-flex items-center gap-1 hover:bg-[var(--bg-subtle)] cursor-pointer whitespace-nowrap"
        >
          <PenTool className="w-3 h-3 text-[#0A84FF]" />
          <span>Open Wireframe Whiteboard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
        <label className="space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)] block">Foreground Ink</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Foreground color picker"
              value={hexToRgb(fgHex) ? (fgHex.startsWith('#') ? fgHex : `#${fgHex}`) : '#0F172A'}
              onChange={(e) => setFgHex(e.target.value.toUpperCase())}
              className="h-8 w-9 rounded border border-[var(--border-default)] cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={fgHex}
              onChange={(e) => setFgHex(e.target.value)}
              aria-label="Foreground hex"
              className="w-full min-w-0 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 font-mono text-xs text-[var(--text-primary)]"
            />
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-medium text-[var(--text-muted)] block">Surface Background</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Background color picker"
              value={hexToRgb(bgHex) ? (bgHex.startsWith('#') ? bgHex : `#${bgHex}`) : '#F8FAFC'}
              onChange={(e) => setBgHex(e.target.value.toUpperCase())}
              className="h-8 w-9 rounded border border-[var(--border-default)] cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={bgHex}
              onChange={(e) => setBgHex(e.target.value)}
              aria-label="Background hex"
              className="w-full min-w-0 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2 font-mono text-xs text-[var(--text-primary)]"
            />
          </div>
        </label>

        <div
          className="rounded-lg border border-[var(--border-default)] p-2.5 text-center"
          style={{
            backgroundColor: hexToRgb(bgHex) ? bgHex : '#F8FAFC',
            color: hexToRgb(fgHex) ? fgHex : '#0F172A',
          }}
        >
          <div className="text-[11px] opacity-80">Contrast Ratio</div>
          <div data-testid="wcag-ratio-value" className="text-base font-bold font-mono tabular-nums">
            {ratio !== null ? `${ratio}:1` : 'Invalid Hex'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[var(--text-secondary)] tabular-nums">
        <span className={aaNormal ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-[var(--status-danger)] font-semibold'}>
          {aaNormal ? 'PASS' : 'FAIL'} WCAG AA Text (&ge;4.5:1)
        </span>
        <span aria-hidden="true">·</span>
        <span className={aaLarge ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-[var(--status-danger)] font-semibold'}>
          {aaLarge ? 'PASS' : 'FAIL'} AA Large (&ge;3.0:1)
        </span>
        <span aria-hidden="true">·</span>
        <span className={aaaNormal ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-[var(--text-muted)]'}>
          {aaaNormal ? 'PASS' : 'Below'} AAA (&ge;7.0:1)
        </span>
      </div>
    </div>
  );
}

function computeIpv4Cidr(cidrInput: string): {
  valid: boolean;
  network: string;
  broadcast: string;
  netmask: string;
  firstHost: string;
  lastHost: string;
  usableHosts: number;
  error?: string;
} {
  const parts = cidrInput.trim().split('/');
  if (parts.length !== 2) {
    return { valid: false, network: '', broadcast: '', netmask: '', firstHost: '', lastHost: '', usableHosts: 0, error: 'Use IPv4/prefix format such as 192.168.10.0/24.' };
  }
  const octets = parts[0].split('.').map((x) => Number(x));
  const prefix = Number(parts[1]);
  if (
    octets.length !== 4 ||
    octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255) ||
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > 32
  ) {
    return { valid: false, network: '', broadcast: '', netmask: '', firstHost: '', lastHost: '', usableHosts: 0, error: 'Enter a valid IPv4 address and /0 to /32 prefix.' };
  }
  const ipNum = (((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0);
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const net = (ipNum & mask) >>> 0;
  const bcast = (net | (~mask >>> 0)) >>> 0;
  const totalAddrs = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, totalAddrs - 2);
  const toIp = (n: number) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  return {
    valid: true,
    network: toIp(net),
    broadcast: toIp(bcast),
    netmask: toIp(mask),
    firstHost: prefix >= 31 ? toIp(net) : toIp((net + 1) >>> 0),
    lastHost: prefix >= 31 ? toIp(bcast) : toIp((bcast - 1) >>> 0),
    usableHosts: usable,
  };
}

export function SecurityNetworkToolkitPanel({ code }: { code: string }) {
  const [cidrInput, setCidrInput] = useState('10.20.1.0/24');
  const [hashInput, setHashInput] = useState('braincode-session-nonce');
  const [shaDigest, setShaDigest] = useState<string>('');

  const cidrResult = useMemo(() => computeIpv4Cidr(cidrInput), [cidrInput]);

  const headerAudit = useMemo(() => {
    const checks = [
      { label: 'Content-Security-Policy / CSP', present: /content-security-policy/i.test(code) },
      { label: 'Strict-Transport-Security / TLS', present: /strict-transport-security|tls-1\.3/i.test(code) },
      { label: 'X-Content-Type-Options: nosniff', present: /nosniff/i.test(code) },
      { label: 'Least-Privilege / Rate Limiting', present: /least-privilege|rate-limit/i.test(code) },
    ];
    return checks;
  }, [code]);

  const computeSha256 = async () => {
    try {
      const buf = new TextEncoder().encode(hashInput);
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setShaDigest(hex);
    } catch {
      setShaDigest('Web Crypto API unavailable in this browser context.');
    }
  };

  return (
    <div data-testid="security-network-toolkit" className="space-y-3">
      {/* IPv4 CIDR Subnet Calculator */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>IPv4 CIDR Subnet Calculator</span>
          </p>
          <input
            type="text"
            value={cidrInput}
            onChange={(e) => setCidrInput(e.target.value)}
            aria-label="IPv4 CIDR input"
            placeholder="192.168.10.0/24"
            className="h-8 w-full sm:w-44 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2.5 font-mono text-xs text-[var(--text-primary)]"
          />
        </div>

        {cidrResult.valid ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
            <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
              <div className="text-[var(--text-muted)]">Network ID</div>
              <div className="font-semibold text-[var(--text-primary)]">{cidrResult.network}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
              <div className="text-[var(--text-muted)]">Subnet Mask</div>
              <div className="font-semibold text-[var(--text-primary)]">{cidrResult.netmask}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
              <div className="text-[var(--text-muted)]">Usable Hosts</div>
              <div className="font-semibold text-[#0A84FF] dark:text-[#38BDF8]">{cidrResult.usableHosts}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
              <div className="text-[var(--text-muted)]">First Host</div>
              <div className="text-[var(--text-secondary)]">{cidrResult.firstHost}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
              <div className="text-[var(--text-muted)]">Last Host</div>
              <div className="text-[var(--text-secondary)]">{cidrResult.lastHost}</div>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-subtle)]">
              <div className="text-[var(--text-muted)]">Broadcast</div>
              <div className="text-[var(--text-secondary)]">{cidrResult.broadcast}</div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[var(--status-danger)]">{cidrResult.error}</p>
        )}
      </div>

      {/* Real Web Crypto SHA-256 Digest + Defensive Control Scan */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-3.5 space-y-2.5">
        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-[#0A84FF]" />
          <span>SHA-256 Digest Tool (Web Crypto API)</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            aria-label="SHA-256 input text"
            className="min-w-0 flex-1 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2.5 font-mono text-xs text-[var(--text-primary)]"
          />
          <button
            type="button"
            onClick={computeSha256}
            className="h-8 px-3 rounded-lg bg-[#0A84FF] hover:bg-[#006EE6] text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
          >
            Compute SHA-256
          </button>
        </div>
        {shaDigest && (
          <p className="font-mono text-[11px] break-all text-emerald-700 dark:text-emerald-300 bg-[var(--bg-subtle)] p-2 rounded-lg">
            {shaDigest}
          </p>
        )}

        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1">
          <p className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>Static Policy Scan of Current Editor File</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {headerAudit.map((chk) => (
              <div key={chk.label} className="flex items-center gap-1.5">
                {chk.present ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                )}
                <span className={chk.present ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>
                  {chk.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GuidedTaskAndReasoningBar({
  task,
  checking,
  validationOutcome,
  selectedReasoning,
  onSelectReasoning,
  onCheckTask,
}: {
  task: LabTaskSpec;
  checking: boolean;
  validationOutcome: {
    passedTaskChecks: boolean;
    errors: string[];
    missingTokens: string[];
    reasoningCheck?: { checked: boolean; correct: boolean; message: string };
    inspectionNote: string;
  } | null;
  selectedReasoning: string;
  onSelectReasoning: (val: string) => void;
  onCheckTask: () => void;
}) {
  return (
    <div
      data-testid="guided-lab-task-panel"
      className="px-3.5 py-3 border-t border-[var(--border-default)] bg-[var(--bg-subtle)] space-y-2.5 text-xs"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5 min-w-0 flex-1">
          <p className="font-semibold text-[var(--text-primary)]">{task.title}</p>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{task.instructions}</p>
        </div>
        <button
          type="button"
          data-testid="lab-validate-task-btn"
          disabled={checking}
          onClick={onCheckTask}
          className="h-8 px-3 rounded-lg border border-[#0A84FF]/40 bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8] text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          {checking ? 'Validating...' : 'Validate Task'}
        </button>
      </div>

      {task.expectedReasoningQuestion && task.expectedReasoningOptions && (
        <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
          <p className="text-[11px] font-semibold text-[var(--text-primary)]">
            Quick Check: {task.expectedReasoningQuestion}
          </p>
          <div className="flex flex-wrap gap-2">
            {task.expectedReasoningOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onSelectReasoning(opt)}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors text-left ${
                  selectedReasoning === opt
                    ? 'border-[#0A84FF] bg-[var(--accent-soft)] text-[#0A84FF] dark:text-[#38BDF8]'
                    : 'border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {validationOutcome && (
        <div
          data-testid="lab-validation-feedback"
          className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
            validationOutcome.passedTaskChecks
              ? 'border-emerald-500/35 bg-[var(--status-success-soft)] text-emerald-800 dark:text-emerald-200'
              : 'border-amber-500/35 bg-[var(--status-warning-soft)] text-amber-800 dark:text-amber-200'
          }`}
        >
          <div className="font-semibold flex items-center gap-1.5">
            {validationOutcome.passedTaskChecks ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {validationOutcome.passedTaskChecks
                ? 'Task validation checks passed.'
                : 'Review feedback below before completing this task.'}
            </span>
          </div>
          {validationOutcome.errors.length > 0 && (
            <p className="font-mono">Syntax/Lint: {validationOutcome.errors.join(' ')}</p>
          )}
          {validationOutcome.missingTokens.length > 0 && (
            <p>Missing required constructs: {validationOutcome.missingTokens.join(', ')}</p>
          )}
          {validationOutcome.reasoningCheck && <p>{validationOutcome.reasoningCheck.message}</p>}
          <p className="opacity-85">{validationOutcome.inspectionNote}</p>
        </div>
      )}
    </div>
  );
}
