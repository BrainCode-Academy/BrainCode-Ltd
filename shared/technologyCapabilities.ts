export type PracticalEnvironmentType =
  | 'web_dev_lab'
  | 'frontend_framework_lab'
  | 'programming_lab'
  | 'database_sql_lab'
  | 'ai_data_lab'
  | 'cloud_devops_lab'
  | 'security_network_lab'
  | 'design_uiux_lab'
  | 'systems_tools_lab'
  | 'game_robotics_lab';

export type PreviewCapability =
  | 'live_browser_dom'
  | 'live_sql_table'
  | 'live_svg_tokens'
  | 'interactive_security_tool'
  | 'static_inspection_only';

export type ExecutionCapability =
  | 'browser_sandbox'
  | 'server_sqlite_memory'
  | 'js_vm_or_remote'
  | 'interactive_toolkit'
  | 'remote_container_required';

export type ValidationMethod =
  | 'dom_and_html_rules'
  | 'js_vm_test_cases'
  | 'sqlite_query_execution'
  | 'static_ast_and_delimiters'
  | 'config_manifest_linter'
  | 'wcag_svg_inspector'
  | 'security_header_hash_lab';

export type CapabilityStatus = 'full_live' | 'hybrid_interactive' | 'static_and_reasoning';

export interface LabFileSpec {
  filename: string;
  language: string;
  code: string;
}

export interface LabTaskSpec {
  id: string;
  title: string;
  instructions: string;
  requiredTokens: string[];
  expectedReasoningQuestion?: string;
  expectedReasoningOptions?: string[];
  expectedReasoningAnswer?: string;
}

export interface TechnologyCapabilityProfile {
  technologyId: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  displayName: string;
  environmentType: PracticalEnvironmentType;
  environmentLabel: string;
  editorConfig: {
    primaryLanguage: string;
    primaryFilename: string;
    multiFileSupported: boolean;
    tabSize: number;
    placeholder: string;
  };
  supportedFileTypes: string[];
  starterFiles: LabFileSpec[];
  previewCapability: PreviewCapability;
  executionCapability: ExecutionCapability;
  validationMethod: ValidationMethod;
  exerciseTypes: string[];
  assessmentMethod: string;
  requiredWorkspaceTools: string[];
  learningActivityTypes: string[];
  guidedTask: LabTaskSpec;
  knownLimitations: string;
  capabilityStatus: CapabilityStatus;
}

export interface TechnologyCapabilityInput {
  id?: string;
  slug: string;
  name: string;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
}

interface CapabilityOverride {
  environmentType?: PracticalEnvironmentType;
  environmentLabel?: string;
  primaryLanguage?: string;
  primaryFilename?: string;
  multiFileSupported?: boolean;
  supportedFileTypes?: string[];
  starterFiles?: LabFileSpec[];
  previewCapability?: PreviewCapability;
  executionCapability?: ExecutionCapability;
  validationMethod?: ValidationMethod;
  exerciseTypes?: string[];
  assessmentMethod?: string;
  requiredWorkspaceTools?: string[];
  learningActivityTypes?: string[];
  guidedTask?: LabTaskSpec;
  knownLimitations?: string;
  capabilityStatus?: CapabilityStatus;
}

export const ENVIRONMENT_LABELS: Record<PracticalEnvironmentType, string> = {
  web_dev_lab: 'Web Development Lab',
  frontend_framework_lab: 'Frontend Framework Lab',
  programming_lab: 'Programming & Software Lab',
  database_sql_lab: 'Database & SQL Query Lab',
  ai_data_lab: 'AI & Data Science Lab',
  cloud_devops_lab: 'Cloud, Containers & DevOps Lab',
  security_network_lab: 'Cybersecurity & Networking Lab',
  design_uiux_lab: 'Design, SVG & UI/UX Studio',
  systems_tools_lab: 'Systems, CS & Developer Tools Lab',
  game_robotics_lab: 'Game Development & Robotics Lab',
};

const CATEGORY_TO_ENV: Record<string, PracticalEnvironmentType> = {
  cat_web_dev: 'web_dev_lab',
  'web-development': 'web_dev_lab',
  cat_frontend: 'frontend_framework_lab',
  'frontend-development': 'frontend_framework_lab',
  cat_frameworks: 'frontend_framework_lab',
  'frameworks-libraries': 'frontend_framework_lab',
  cat_langs: 'programming_lab',
  'programming-languages': 'programming_lab',
  cat_backend: 'programming_lab',
  'backend-development': 'programming_lab',
  cat_web: 'web_dev_lab',
  'full-stack-development': 'web_dev_lab',
  cat_mobile: 'programming_lab',
  'mobile-app-development': 'programming_lab',
  cat_db: 'database_sql_lab',
  'database-management': 'database_sql_lab',
  cat_ai: 'ai_data_lab',
  'ai-machine-learning': 'ai_data_lab',
  cat_ds: 'ai_data_lab',
  'data-science-analytics': 'ai_data_lab',
  cat_cloud: 'cloud_devops_lab',
  'cloud-computing': 'cloud_devops_lab',
  cat_devops: 'cloud_devops_lab',
  'devops-software-engineering': 'cloud_devops_lab',
  cat_sec: 'security_network_lab',
  cybersecurity: 'security_network_lab',
  cat_net: 'security_network_lab',
  networking: 'security_network_lab',
  cat_uiux: 'design_uiux_lab',
  'ui-ux-product-design': 'design_uiux_lab',
  cat_design: 'design_uiux_lab',
  'graphics-digital-design': 'design_uiux_lab',
  cat_cs: 'systems_tools_lab',
  'computer-fundamentals': 'systems_tools_lab',
  cat_tools: 'systems_tools_lab',
  'software-tools-productivity': 'systems_tools_lab',
  cat_game: 'game_robotics_lab',
  'game-development': 'game_robotics_lab',
  cat_robotics: 'game_robotics_lab',
  'robotics-emerging-tech': 'game_robotics_lab',
};

const TECH_OVERRIDES: Record<string, CapabilityOverride> = {
  html: {
    environmentType: 'web_dev_lab',
    primaryLanguage: 'html',
    primaryFilename: 'index.html',
    multiFileSupported: true,
    supportedFileTypes: ['.html', '.css', '.js'],
    previewCapability: 'live_browser_dom',
    executionCapability: 'browser_sandbox',
    validationMethod: 'dom_and_html_rules',
    capabilityStatus: 'full_live',
    requiredWorkspaceTools: ['Multi-File Editor', 'Sandboxed Live Preview', 'Console', 'Responsive Viewport', 'Whiteboard'],
    learningActivityTypes: ['Semantic Document Authoring', 'Live Multi-File Rendering', 'Responsive Viewport Testing'],
    starterFiles: [
      {
        filename: 'index.html',
        language: 'html',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Semantic Profile Card</title>
</head>
<body>
  <main class="card">
    <header>
      <h1>BrainCode Learner</h1>
      <p>Semantic Web Engineering</p>
    </header>
    <section>
      <p id="status">Ready to build semantic HTML.</p>
      <button id="actionBtn" type="button">Inspect Milestone</button>
    </section>
  </main>
</body>
</html>`,
      },
      {
        filename: 'styles.css',
        language: 'css',
        code: `.card {
  max-width: 440px;
  margin: 20px auto;
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  font-family: system-ui, sans-serif;
}
button {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: #0A84FF;
  color: #ffffff;
  cursor: pointer;
}`,
      },
      {
        filename: 'app.js',
        language: 'javascript',
        code: `document.getElementById('actionBtn')?.addEventListener('click', () => {
  const el = document.getElementById('status');
  if (el) el.textContent = 'Milestone verified in live DOM!';
  console.log('Button clicked inside HTML5 lab');
});`,
      },
    ],
    guidedTask: {
      id: 'task_html_landmark',
      title: 'Semantic Landmark & Action Task',
      instructions: 'Ensure index.html includes <main>, <header>, and a <footer> landmark, then click Run Code to verify live DOM rendering.',
      requiredTokens: ['<main', '<header', '<footer'],
    },
    knownLimitations: 'Executes client HTML, CSS, and JavaScript natively inside an isolated sandbox="allow-scripts" preview iframe.',
  },
  css: {
    environmentType: 'web_dev_lab',
    primaryLanguage: 'css',
    primaryFilename: 'styles.css',
    multiFileSupported: true,
    supportedFileTypes: ['.css', '.html', '.js'],
    previewCapability: 'live_browser_dom',
    executionCapability: 'browser_sandbox',
    validationMethod: 'dom_and_html_rules',
    capabilityStatus: 'full_live',
    requiredWorkspaceTools: ['CSS & HTML Multi-File Editor', 'Live Style Preview', 'Responsive Viewport', 'Whiteboard'],
    learningActivityTypes: ['Flexbox & Grid Styling', 'Design Token Variables', 'Mobile/Tablet Breakpoint Testing'],
    starterFiles: [
      {
        filename: 'styles.css',
        language: 'css',
        code: `:root {
  --accent: #0A84FF;
  --surface: #f8fafc;
}
.layout-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 16px;
}
.tile {
  background: var(--surface);
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 14px;
  font-family: system-ui, sans-serif;
}
.tile strong { color: var(--accent); }`,
      },
      {
        filename: 'index.html',
        language: 'html',
        code: `<section class="layout-grid">
  <article class="tile"><strong>01.</strong> Box Model</article>
  <article class="tile"><strong>02.</strong> Flexbox</article>
  <article class="tile"><strong>03.</strong> CSS Grid</article>
</section>`,
      },
    ],
    guidedTask: {
      id: 'task_css_grid',
      title: 'Responsive CSS Grid & Variable Task',
      instructions: 'Define at least one CSS custom property (--var) and use display: grid or display: flex in styles.css.',
      requiredTokens: ['--', 'display:'],
    },
    knownLimitations: 'Live CSS cascade, Flexbox, Grid, and responsive preview execute natively in the browser.',
  },
  javascript: {
    environmentType: 'web_dev_lab',
    primaryLanguage: 'javascript',
    primaryFilename: 'app.js',
    multiFileSupported: true,
    supportedFileTypes: ['.js', '.html', '.css'],
    previewCapability: 'live_browser_dom',
    executionCapability: 'js_vm_or_remote',
    validationMethod: 'js_vm_test_cases',
    capabilityStatus: 'full_live',
    requiredWorkspaceTools: ['JS/HTML/CSS Editor', 'Console & Runtime Error Capture', 'VM Test Cases', 'Whiteboard'],
    learningActivityTypes: ['Interactive Console Scripting', 'DOM Event Wiring', 'Algorithm Unit Verification'],
    starterFiles: [
      {
        filename: 'app.js',
        language: 'javascript',
        code: `function calculateProgress(completed, total) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

console.log('Completion %:', calculateProgress(3, 5));`,
      },
      {
        filename: 'index.html',
        language: 'html',
        code: `<div style="font-family:system-ui,sans-serif;padding:16px;">
  <h2>JavaScript Practice Console</h2>
  <p>Edit <code>app.js</code> and click Run Code to inspect console output.</p>
</div>`,
      },
    ],
    guidedTask: {
      id: 'task_js_fn',
      title: 'Pure Function & Console Output Task',
      instructions: 'Write or keep calculateProgress(completed, total) returning a rounded percentage and log a sample output with console.log.',
      requiredTokens: ['function', 'return', 'console.log'],
      expectedReasoningQuestion: 'What does calculateProgress(3, 5) log to the console?',
      expectedReasoningOptions: ['60', '0.6', '35', 'Error'],
      expectedReasoningAnswer: '60',
    },
    knownLimitations: 'Executes standard ES2025 JavaScript natively in the browser sandbox and isolated Node VM for console tests.',
  },
  'tailwind-css': {
    environmentType: 'web_dev_lab',
    primaryLanguage: 'html',
    primaryFilename: 'index.html',
    multiFileSupported: true,
    supportedFileTypes: ['.html', '.css'],
    previewCapability: 'live_browser_dom',
    executionCapability: 'browser_sandbox',
    validationMethod: 'dom_and_html_rules',
    capabilityStatus: 'hybrid_interactive',
    starterFiles: [
      {
        filename: 'index.html',
        language: 'html',
        code: `<main style="font-family:system-ui,sans-serif;max-width:480px;margin:16px auto;">
  <div class="p-6 rounded-xl border border-slate-200 bg-white">
    <h2 class="text-lg font-bold text-slate-900">Utility Layout Practice</h2>
    <p class="text-sm text-slate-600 mt-1">Inspect spacing tokens, contrast, and responsive structure.</p>
  </div>
</main>`,
      },
      {
        filename: 'styles.css',
        language: 'css',
        code: `.p-6 { padding: 1.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.border { border: 1px solid #e2e8f0; }
.text-lg { font-size: 1.125rem; }
.font-bold { font-weight: 700; }
.text-sm { font-size: 0.875rem; }
.mt-1 { margin-top: 0.25rem; }`,
      },
    ],
    guidedTask: {
      id: 'task_tailwind_tokens',
      title: 'Utility Class Mapping Task',
      instructions: 'Pair clean HTML utility classes with explicit spacing/radius rules in styles.css.',
      requiredTokens: ['class=', 'padding'],
    },
    knownLimitations: 'Offline sandbox avoids external CDN scripts; pair utility classes with styles.css in the multi-file editor or enable CODE_SANDBOX_URL for full JIT build.',
  },
  typescript: {
    environmentType: 'frontend_framework_lab',
    primaryLanguage: 'typescript',
    primaryFilename: 'index.ts',
    multiFileSupported: true,
    supportedFileTypes: ['.ts', '.tsx', '.json'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    requiredWorkspaceTools: ['TypeScript Editor', 'Static Type & Delimiter Diagnostics', 'Reasoning Checks', 'Whiteboard'],
    learningActivityTypes: ['Interface & Union Modeling', 'Generic Signature Authoring', 'Type-Error Diagnosis'],
    starterFiles: [
      {
        filename: 'index.ts',
        language: 'typescript',
        code: `interface LearnerCourse {
  id: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
}

function formatCompletion(course: LearnerCourse): string {
  const pct = course.totalLessons > 0
    ? Math.round((course.completedLessons / course.totalLessons) * 100)
    : 0;
  return \`\${course.title}: \${pct}%\`;
}`,
      },
    ],
    guidedTask: {
      id: 'task_ts_interface',
      title: 'Typed Interface & Function Signature Task',
      instructions: 'Define a TypeScript interface or type alias and annotate function parameter + return types.',
      requiredTokens: ['interface ', ': string'],
      expectedReasoningQuestion: 'Why does TypeScript catch passing { title: "TS" } missing `id` to `formatCompletion`?',
      expectedReasoningOptions: [
        'Compile-time structural type checking rejects missing required properties',
        'JavaScript runtime deletes missing keys automatically',
        'TypeScript ignores missing properties in interfaces',
      ],
      expectedReasoningAnswer: 'Compile-time structural type checking rejects missing required properties',
    },
    knownLimitations: 'Static delimiter and annotation syntax diagnostics run locally. Full `tsc` type-checking requires configuring CODE_SANDBOX_URL.',
  },
  react: {
    environmentType: 'frontend_framework_lab',
    primaryLanguage: 'tsx',
    primaryFilename: 'App.tsx',
    multiFileSupported: true,
    supportedFileTypes: ['.tsx', '.ts', '.css'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    requiredWorkspaceTools: ['TSX Multi-File Editor', 'JSX & Hook Inspector', 'State Reasoning Check', 'Whiteboard'],
    learningActivityTypes: ['Component & Props Composition', 'useState/useEffect Pattern Checks', 'Render Flow Sketching'],
    starterFiles: [
      {
        filename: 'App.tsx',
        language: 'tsx',
        code: `import React, { useState } from 'react';

interface CounterProps {
  initialCount?: number;
}

export function LessonCounter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState<number>(initialCount);

  return (
    <section>
      <h3>Completed Steps: {count}</h3>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Record Step
      </button>
    </section>
  );
}`,
      },
      {
        filename: 'types.ts',
        language: 'typescript',
        code: `export interface MilestoneItem {
  id: string;
  label: string;
  done: boolean;
}`,
      },
    ],
    guidedTask: {
      id: 'task_react_state',
      title: 'React State & Functional Update Task',
      instructions: 'Use useState with a typed Props interface and a functional state updater `setCount((c) => c + 1)`.',
      requiredTokens: ['useState', 'export function', 'return'],
      expectedReasoningQuestion: 'Why prefer `setCount((c) => c + 1)` over `setCount(count + 1)` for consecutive updates?',
      expectedReasoningOptions: [
        'Functional updaters read the latest queued state instead of stale closure values',
        'Functional updaters skip re-rendering the DOM',
        'React blocks passing expressions to setState',
      ],
      expectedReasoningAnswer: 'Functional updaters read the latest queued state instead of stale closure values',
    },
    knownLimitations: 'Static JSX, React Hook, and TSX delimiter checks are active. Live React bundler compilation is intentionally disabled unless CODE_SANDBOX_URL is configured.',
  },
  python: {
    environmentType: 'programming_lab',
    primaryLanguage: 'python',
    primaryFilename: 'main.py',
    multiFileSupported: false,
    supportedFileTypes: ['.py'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    requiredWorkspaceTools: ['Python Editor', 'Syntax & Indentation Inspector', 'Expected-Output Reasoning', 'Whiteboard'],
    learningActivityTypes: ['Syntax & Delimiter Diagnostics', 'Expected-Output Reasoning', 'Problem Solving'],
    starterFiles: [
      {
        filename: 'main.py',
        language: 'python',
        code: `def summarize_scores(scores: list[int]) -> float:
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 2)

sample = [88, 92, 95]
print("Average:", summarize_scores(sample))`,
      },
    ],
    guidedTask: {
      id: 'task_python_fn',
      title: 'Python Guard Clause & Return Task',
      instructions: 'Include a `def` function with a guard clause for empty input and a `return` statement, then run Check Syntax.',
      requiredTokens: ['def ', 'return'],
      expectedReasoningQuestion: 'What does `summarize_scores([88, 92, 95])` return?',
      expectedReasoningOptions: ['91.67', '91', '275', '0.0'],
      expectedReasoningAnswer: '91.67',
    },
    knownLimitations: 'Python runtime execution requires a server container (CODE_SANDBOX_URL). BrainCode runs honest syntax/colon/delimiter checks and expected-output verification locally.',
  },
  java: {
    environmentType: 'programming_lab',
    primaryLanguage: 'java',
    primaryFilename: 'Main.java',
    multiFileSupported: false,
    supportedFileTypes: ['.java'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'Main.java',
        language: 'java',
        code: `public class Main {
    public static int clampScore(int score) {
        return Math.max(0, Math.min(100, score));
    }

    public static void main(String[] args) {
        System.out.println("Score: " + clampScore(105));
    }
}`,
      },
    ],
    guidedTask: {
      id: 'task_java_main',
      title: 'Java Class & Method Structure Check',
      instructions: 'Declare `public class Main` with a typed static helper method and `main(String[] args)`.',
      requiredTokens: ['class Main', 'public static void main'],
      expectedReasoningQuestion: 'What does `clampScore(105)` output?',
      expectedReasoningOptions: ['Score: 100', 'Score: 105', 'Score: 0', 'Compilation error'],
      expectedReasoningAnswer: 'Score: 100',
    },
    knownLimitations: 'JVM compilation (`javac`) requires configuring CODE_SANDBOX_URL; brace/class checks and expected-output reasoning operate locally.',
  },
  cpp: {
    environmentType: 'programming_lab',
    primaryLanguage: 'cpp',
    primaryFilename: 'main.cpp',
    multiFileSupported: false,
    supportedFileTypes: ['.cpp', '.hpp'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'main.cpp',
        language: 'cpp',
        code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> values{10, 20, 30};
    int sum = 0;
    for (int v : values) {
        sum += v;
    }
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}`,
      },
    ],
    guidedTask: {
      id: 'task_cpp_vec',
      title: 'C++ Range-Based Loop & Vector Check',
      instructions: 'Use `std::vector` and a range-based `for` loop inside `int main()`.',
      requiredTokens: ['#include', 'int main()', 'return 0'],
      expectedReasoningQuestion: 'What value prints to `std::cout` for `{10, 20, 30}`?',
      expectedReasoningOptions: ['Sum: 60', 'Sum: 30', 'Sum: 10', 'Undefined'],
      expectedReasoningAnswer: 'Sum: 60',
    },
    knownLimitations: 'Native C++ compilation (`g++`/`clang++`) requires configuring CODE_SANDBOX_URL; balanced delimiter inspection and reasoning checks are active.',
  },
  c: {
    environmentType: 'programming_lab',
    primaryLanguage: 'c',
    primaryFilename: 'main.c',
    multiFileSupported: false,
    supportedFileTypes: ['.c', '.h'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'main.c',
        language: 'c',
        code: `#include <stdio.h>

int main(void) {
    int count = 4;
    printf("Allocated slots: %d\\n", count);
    return 0;
}`,
      },
    ],
    guidedTask: {
      id: 'task_c_stdio',
      title: 'C Entry Point & Standard I/O Check',
      instructions: 'Include `<stdio.h>` and return `0` cleanly from `main`.',
      requiredTokens: ['#include <stdio.h>', 'return 0'],
    },
    knownLimitations: 'C compiler execution (`gcc`) requires CODE_SANDBOX_URL.',
  },
  csharp: {
    environmentType: 'programming_lab',
    primaryLanguage: 'csharp',
    primaryFilename: 'Program.cs',
    multiFileSupported: false,
    supportedFileTypes: ['.cs'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'Program.cs',
        language: 'csharp',
        code: `using System;
using System.Linq;

int[] scores = { 75, 90, 85 };
var passing = scores.Where(s => s >= 80).ToArray();
Console.WriteLine($"Passing count: {passing.Length}");`,
      },
    ],
    guidedTask: {
      id: 'task_csharp_linq',
      title: 'C# LINQ Filtering Task',
      instructions: 'Filter the `scores` array with `.Where(...)` and check expected output count.',
      requiredTokens: ['.Where(', 'Console.WriteLine'],
      expectedReasoningQuestion: 'What is `passing.Length` for `{ 75, 90, 85 }` with `s >= 80`?',
      expectedReasoningOptions: ['2', '3', '1', '0'],
      expectedReasoningAnswer: '2',
    },
    knownLimitations: '.NET SDK execution requires CODE_SANDBOX_URL.',
  },
  php: {
    environmentType: 'programming_lab',
    primaryLanguage: 'php',
    primaryFilename: 'index.php',
    multiFileSupported: false,
    supportedFileTypes: ['.php'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'index.php',
        language: 'php',
        code: `<?php
declare(strict_types=1);

function sanitizeTitle(string $raw): string {
    return htmlspecialchars(trim($raw), ENT_QUOTES, 'UTF-8');
}

echo sanitizeTitle('  BrainCode Academy  ');`,
      },
    ],
    guidedTask: {
      id: 'task_php_escape',
      title: 'PHP Strict Typing & Output Escaping Check',
      instructions: 'Use `declare(strict_types=1);` and escape user strings with `htmlspecialchars`.',
      requiredTokens: ['<?php', 'htmlspecialchars'],
    },
    knownLimitations: 'PHP CLI/FPM execution requires CODE_SANDBOX_URL.',
  },
  go: {
    environmentType: 'programming_lab',
    primaryLanguage: 'go',
    primaryFilename: 'main.go',
    multiFileSupported: false,
    supportedFileTypes: ['.go'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'main.go',
        language: 'go',
        code: `package main

import "fmt"

func safeDivide(a, b float64) (float64, bool) {
	if b == 0 {
		return 0, false
	}
	return a / b, true
}

func main() {
	res, ok := safeDivide(12, 3)
	fmt.Println(res, ok)
}`,
      },
    ],
    guidedTask: {
      id: 'task_go_err',
      title: 'Go Explicit Guard Return Check',
      instructions: 'Define `package main` and return `(value, ok)` cleanly on zero divisor.',
      requiredTokens: ['package main', 'func main()'],
      expectedReasoningQuestion: 'What does `safeDivide(12, 3)` return?',
      expectedReasoningOptions: ['4 true', '0 false', '3 true', 'Panic'],
      expectedReasoningAnswer: '4 true',
    },
    knownLimitations: 'Go toolchain compilation (`go run`) requires CODE_SANDBOX_URL.',
  },
  rust: {
    environmentType: 'programming_lab',
    primaryLanguage: 'rust',
    primaryFilename: 'main.rs',
    multiFileSupported: false,
    supportedFileTypes: ['.rs'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'main.rs',
        language: 'rust',
        code: `fn classify_score(score: u32) -> &'static str {
    match score {
        90..=100 => "Distinction",
        70..=89 => "Pass",
        _ => "Review",
    }
}

fn main() {
    println!("{}", classify_score(84));
}`,
      },
    ],
    guidedTask: {
      id: 'task_rust_match',
      title: 'Rust Exhaustive Match Pattern Check',
      instructions: 'Include an exhaustive `match` expression covering score ranges with a wildcard `_` arm.',
      requiredTokens: ['match ', 'fn main()'],
      expectedReasoningQuestion: 'What string does `classify_score(84)` return?',
      expectedReasoningOptions: ['"Pass"', '"Distinction"', '"Review"', 'Compile error'],
      expectedReasoningAnswer: '"Pass"',
    },
    knownLimitations: 'Cargo/rustc compilation requires CODE_SANDBOX_URL; delimiter checks and reasoning prompts run locally.',
  },
  sql: {
    environmentType: 'database_sql_lab',
    primaryLanguage: 'sql',
    primaryFilename: 'query.sql',
    multiFileSupported: false,
    supportedFileTypes: ['.sql'],
    previewCapability: 'live_sql_table',
    executionCapability: 'server_sqlite_memory',
    validationMethod: 'sqlite_query_execution',
    capabilityStatus: 'full_live',
    requiredWorkspaceTools: ['SQL Query Editor', 'Sample Relational Schema', 'Live Result Grid', 'Whiteboard'],
    learningActivityTypes: ['Live SELECT & JOIN Execution', 'Aggregation & Grouping', 'Schema Exploration'],
    starterFiles: [
      {
        filename: 'query.sql',
        language: 'sql',
        code: `-- Practice against BrainCode's in-memory relational tables:
-- departments(id, name, budget), employees(id, name, department_id, role, salary),
-- courses(id, title, category, difficulty, hours), orders(id, learner_name, course_id, amount_usd, status)

SELECT d.name AS department,
       COUNT(e.id) AS staff_count,
       ROUND(AVG(e.salary), 0) AS avg_salary
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id, d.name
ORDER BY avg_salary DESC;`,
      },
    ],
    guidedTask: {
      id: 'task_sql_join',
      title: 'Relational JOIN & Aggregation Query',
      instructions: 'Write a SQL query joining `departments` and `employees` (or querying `courses`/`orders`) and click Run Query to view live rows.',
      requiredTokens: ['SELECT', 'FROM'],
    },
    knownLimitations: 'Executes safely in an isolated per-request in-memory SQLite (:memory:) database pre-seeded with practice tables; no changes persist to BrainCode production storage.',
  },
  postgresql: {
    environmentType: 'database_sql_lab',
    primaryLanguage: 'sql',
    primaryFilename: 'query.sql',
    multiFileSupported: false,
    supportedFileTypes: ['.sql'],
    previewCapability: 'live_sql_table',
    executionCapability: 'server_sqlite_memory',
    validationMethod: 'sqlite_query_execution',
    capabilityStatus: 'hybrid_interactive',
    starterFiles: [
      {
        filename: 'query.sql',
        language: 'sql',
        code: `WITH paid_orders AS (
  SELECT course_id, SUM(amount_usd) AS revenue_usd, COUNT(*) AS sales
  FROM orders
  WHERE status = 'paid'
  GROUP BY course_id
)
SELECT c.title, c.category, p.sales, p.revenue_usd
FROM courses c
JOIN paid_orders p ON p.course_id = c.id
ORDER BY p.revenue_usd DESC;`,
      },
    ],
    guidedTask: {
      id: 'task_pg_cte',
      title: 'CTE (WITH) & Revenue Aggregation Query',
      instructions: 'Execute a Common Table Expression (`WITH ...`) summarizing paid orders joined to `courses`.',
      requiredTokens: ['WITH ', 'SELECT', 'JOIN'],
    },
    knownLimitations: 'Standard SQL & CTE queries execute via our in-memory SQLite engine; PostgreSQL-specific extensions (JSONB operators, psql meta-commands) are checked statically unless CODE_SANDBOX_URL is configured.',
  },
  mysql: {
    environmentType: 'database_sql_lab',
    primaryLanguage: 'sql',
    primaryFilename: 'query.sql',
    multiFileSupported: false,
    supportedFileTypes: ['.sql'],
    previewCapability: 'live_sql_table',
    executionCapability: 'server_sqlite_memory',
    validationMethod: 'sqlite_query_execution',
    capabilityStatus: 'hybrid_interactive',
    starterFiles: [
      {
        filename: 'query.sql',
        language: 'sql',
        code: `SELECT title, difficulty, hours
FROM courses
WHERE hours >= 12
ORDER BY hours DESC, title ASC;`,
      },
    ],
    guidedTask: {
      id: 'task_mysql_filter',
      title: 'Filtered & Ordered Course Catalog Query',
      instructions: 'Query `courses` using `WHERE` and multi-column `ORDER BY`.',
      requiredTokens: ['SELECT', 'WHERE', 'ORDER BY'],
    },
    knownLimitations: 'Standard ANSI SQL runs live in an isolated in-memory SQLite sandbox; MySQL engine-specific DDL flags require CODE_SANDBOX_URL.',
  },
  mongodb: {
    environmentType: 'database_sql_lab',
    primaryLanguage: 'json',
    primaryFilename: 'pipeline.json',
    multiFileSupported: false,
    supportedFileTypes: ['.json', '.js'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'config_manifest_linter',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'pipeline.json',
        language: 'json',
        code: `[
  { "$match": { "status": "published", "difficulty": "Beginner" } },
  { "$group": { "_id": "$category", "courseCount": { "$sum": 1 } } },
  { "$sort": { "courseCount": -1 } }
]`,
      },
    ],
    guidedTask: {
      id: 'task_mongo_agg',
      title: 'Aggregation Pipeline JSON Validation',
      instructions: 'Ensure your MongoDB aggregation pipeline is valid JSON containing `$match` and `$group` stages.',
      requiredTokens: ['$match', '$group'],
    },
    knownLimitations: 'Validates JSON aggregation syntax and stage structure; connecting to a live mongod cluster requires CODE_SANDBOX_URL.',
  },
  docker: {
    environmentType: 'cloud_devops_lab',
    primaryLanguage: 'dockerfile',
    primaryFilename: 'Dockerfile',
    multiFileSupported: true,
    supportedFileTypes: ['Dockerfile', '.yml', '.yaml'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'config_manifest_linter',
    capabilityStatus: 'static_and_reasoning',
    requiredWorkspaceTools: ['Dockerfile & Compose Editor', 'Manifest & Best-Practice Linter', 'Architecture Whiteboard'],
    learningActivityTypes: ['Multi-Stage Dockerfile Authoring', 'Container Layer Hardening', 'Architecture Diagramming'],
    starterFiles: [
      {
        filename: 'Dockerfile',
        language: 'dockerfile',
        code: `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:22-alpine
WORKDIR /app
USER node
COPY --from=builder /app .
EXPOSE 3000
CMD ["node", "dist/server.js"]`,
      },
      {
        filename: 'docker-compose.yml',
        language: 'yaml',
        code: `services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production`,
      },
    ],
    guidedTask: {
      id: 'task_docker_multistage',
      title: 'Non-Root Container Hardening Check',
      instructions: 'Specify `FROM`, `WORKDIR`, `EXPOSE`, and a non-root `USER` instruction in your Dockerfile.',
      requiredTokens: ['FROM ', 'WORKDIR ', 'USER ', 'CMD '],
    },
    knownLimitations: 'Runs real Dockerfile & Compose directive/security linting locally; building/running OCI containers requires CODE_SANDBOX_URL.',
  },
  kubernetes: {
    environmentType: 'cloud_devops_lab',
    primaryLanguage: 'yaml',
    primaryFilename: 'deployment.yaml',
    multiFileSupported: false,
    supportedFileTypes: ['.yaml', '.yml'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'config_manifest_linter',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'deployment.yaml',
        language: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: braincode-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: braincode-api
  template:
    metadata:
      labels:
        app: braincode-api
    spec:
      containers:
        - name: api
          image: ghcr.io/braincode/api:1.0.0
          ports:
            - containerPort: 3000`,
      },
    ],
    guidedTask: {
      id: 'task_k8s_deploy',
      title: 'Kubernetes Deployment Manifest Validation',
      instructions: 'Verify required `apiVersion`, `kind`, `metadata`, and `spec` fields with balanced YAML indentation.',
      requiredTokens: ['apiVersion:', 'kind:', 'metadata:', 'spec:'],
    },
    knownLimitations: 'Performs local Kubernetes schema & indentation checks; applying manifests to a cluster requires CODE_SANDBOX_URL.',
  },
  git: {
    environmentType: 'systems_tools_lab',
    primaryLanguage: 'bash',
    primaryFilename: 'workflow.sh',
    multiFileSupported: false,
    supportedFileTypes: ['.sh', '.md'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'interactive_toolkit',
    validationMethod: 'config_manifest_linter',
    capabilityStatus: 'hybrid_interactive',
    starterFiles: [
      {
        filename: 'workflow.sh',
        language: 'bash',
        code: `# Feature-branch & safe pull-request workflow
git checkout -b feat/lesson-outline
git status
git add src/components/NumberedCourseOutline.tsx
git commit -m "Add numbered course outline keyboard navigation"
git fetch origin main
git rebase origin/main`,
      },
    ],
    guidedTask: {
      id: 'task_git_branch',
      title: 'Safe Feature Branch & Commit Workflow',
      instructions: 'Sequence branch creation, staging, clear commit message, and upstream fetch/rebase commands.',
      requiredTokens: ['git ', 'commit', 'checkout'],
      expectedReasoningQuestion: 'Why use `git fetch` before `git rebase origin/main` instead of force-pushing directly to `main`?',
      expectedReasoningOptions: [
        'Preserves linear feature history and lets you resolve conflicts locally before review',
        'Deletes uncommitted changes permanently',
        'Skips commit signatures',
      ],
      expectedReasoningAnswer: 'Preserves linear feature history and lets you resolve conflicts locally before review',
    },
    knownLimitations: 'Git workflow commands are checked for safe branch/rebase sequence locally; live repo shell execution requires CODE_SANDBOX_URL.',
  },
  cybersecurity: {
    environmentType: 'security_network_lab',
    primaryLanguage: 'javascript',
    primaryFilename: 'security-audit.js',
    multiFileSupported: false,
    supportedFileTypes: ['.js', '.json'],
    previewCapability: 'interactive_security_tool',
    executionCapability: 'interactive_toolkit',
    validationMethod: 'security_header_hash_lab',
    capabilityStatus: 'hybrid_interactive',
    requiredWorkspaceTools: ['Security Code/Policy Editor', 'SHA-256 Digest & OWASP Audit Lab', 'Subnet Tool', 'Whiteboard'],
    learningActivityTypes: ['OWASP Header & Auth Audits', 'Web Crypto SHA-256 Hashing', 'Threat Modeling Diagrams'],
    starterFiles: [
      {
        filename: 'security-audit.js',
        language: 'javascript',
        code: `const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function auditHeaders(headers) {
  const required = ['Content-Security-Policy', 'X-Content-Type-Options', 'Strict-Transport-Security'];
  return required.filter((h) => !headers[h]);
}

console.log('Missing headers:', auditHeaders(securityHeaders));`,
      },
    ],
    guidedTask: {
      id: 'task_sec_headers',
      title: 'OWASP Response Header Hardening Task',
      instructions: 'Configure CSP, `nosniff`, and HSTS headers and test SHA-256 digests in the Security Lab tab.',
      requiredTokens: ['Content-Security-Policy', 'nosniff'],
    },
    knownLimitations: 'Browser executes JavaScript audits and real Web Crypto SHA-256 hashing locally. Live packet capture or authorized penetration tools require isolated lab infrastructure.',
  },
  'network-fundamentals': {
    environmentType: 'security_network_lab',
    primaryLanguage: 'json',
    primaryFilename: 'subnet-plan.json',
    multiFileSupported: false,
    supportedFileTypes: ['.json', '.txt'],
    previewCapability: 'interactive_security_tool',
    executionCapability: 'interactive_toolkit',
    validationMethod: 'security_header_hash_lab',
    capabilityStatus: 'hybrid_interactive',
    requiredWorkspaceTools: ['Topology Spec Editor', 'IPv4 CIDR Subnet Calculator', 'Topology Whiteboard'],
    learningActivityTypes: ['IPv4 Subnetting Math', 'VLAN & Routing Planning', 'Packet Flow Sketching'],
    starterFiles: [
      {
        filename: 'subnet-plan.json',
        language: 'json',
        code: `{
  "vpcCidr": "10.20.0.0/16",
  "subnets": [
    { "name": "public-ingress", "cidr": "10.20.1.0/24", "role": "load-balancer" },
    { "name": "private-app", "cidr": "10.20.2.0/24", "role": "application-tier" }
  ]
}`,
      },
    ],
    guidedTask: {
      id: 'task_net_cidr',
      title: 'CIDR Subnet Segmentation Task',
      instructions: 'Define non-overlapping `/24` subnets inside `subnet-plan.json` and verify host capacity with the CIDR calculator.',
      requiredTokens: ['vpcCidr', 'subnets', '/24'],
    },
    knownLimitations: 'Real IPv4 CIDR calculation and JSON plan checks run locally; live ICMP/TCP socket scanning is disabled in browser sandboxes.',
  },
  figma: {
    environmentType: 'design_uiux_lab',
    primaryLanguage: 'html',
    primaryFilename: 'wireframe.svg',
    multiFileSupported: true,
    supportedFileTypes: ['.svg', '.css', '.json'],
    previewCapability: 'live_svg_tokens',
    executionCapability: 'browser_sandbox',
    validationMethod: 'wcag_svg_inspector',
    capabilityStatus: 'hybrid_interactive',
    requiredWorkspaceTools: ['SVG & Design Token Editor', 'Live SVG Preview', 'WCAG Contrast Checker', 'Interactive Whiteboard'],
    learningActivityTypes: ['Component Wireframing', 'Design Token Definition', 'WCAG AA Contrast Auditing'],
    starterFiles: [
      {
        filename: 'wireframe.svg',
        language: 'svg',
        code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200" width="100%" height="200">
  <rect width="360" height="200" rx="14" fill="#F8FAFC" stroke="#CBD5E1"/>
  <rect x="20" y="20" width="320" height="44" rx="8" fill="#0F172A"/>
  <text x="36" y="47" fill="#FFFFFF" font-family="system-ui" font-size="14" font-weight="700">Design System Header</text>
  <rect x="20" y="80" width="152" height="96" rx="10" fill="#FFFFFF" stroke="#E2E8F0"/>
  <rect x="188" y="80" width="152" height="96" rx="10" fill="#0A84FF"/>
  <text x="212" y="133" fill="#FFFFFF" font-family="system-ui" font-size="13" font-weight="600">Primary CTA</text>
</svg>`,
      },
      {
        filename: 'tokens.css',
        language: 'css',
        code: `:root {
  --bg-canvas: #F8FAFC;
  --ink-primary: #0F172A;
  --brand-primary: #0A84FF;
}`,
      },
    ],
    guidedTask: {
      id: 'task_design_contrast',
      title: 'Accessible Frame & Contrast Audit',
      instructions: 'Render a multi-zone wireframe SVG with clean spacing tokens and check foreground/background contrast (>= 4.5:1) in the Design Inspector.',
      requiredTokens: ['<svg', '<rect', 'viewBox'],
    },
    knownLimitations: 'Native SVG frames, CSS design tokens, WCAG AA/AAA contrast math, and Whiteboard wireframing run live; proprietary .fig binary files open in Figma desktop/web.',
  },
  'design-systems': {
    environmentType: 'design_uiux_lab',
    primaryLanguage: 'css',
    primaryFilename: 'tokens.css',
    multiFileSupported: true,
    supportedFileTypes: ['.css', '.svg'],
    previewCapability: 'live_svg_tokens',
    executionCapability: 'browser_sandbox',
    validationMethod: 'wcag_svg_inspector',
    capabilityStatus: 'hybrid_interactive',
    starterFiles: [
      {
        filename: 'tokens.css',
        language: 'css',
        code: `:root {
  --surface: #ffffff;
  --ink: #0f172a;
  --accent: #0A84FF;
  --radius-card: 12px;
  --space-md: 16px;
}`,
      },
      {
        filename: 'wireframe.svg',
        language: 'svg',
        code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140" width="100%" height="140">
  <rect width="320" height="140" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>
  <text x="20" y="42" fill="#0F172A" font-family="system-ui" font-size="16" font-weight="700">60 / 30 / 10 Token Hierarchy</text>
  <rect x="20" y="64" width="120" height="40" rx="8" fill="#0A84FF"/>
  <text x="42" y="89" fill="#FFFFFF" font-family="system-ui" font-size="13" font-weight="600">Action Token</text>
</svg>`,
      },
    ],
    guidedTask: {
      id: 'task_tokens_wcag',
      title: 'Semantic Color & Radius Token Check',
      instructions: 'Declare semantic color and spacing variables inside `:root` and audit contrast in the Design Lab.',
      requiredTokens: [':root', '--'],
    },
    knownLimitations: 'Live CSS token preview & mathematical WCAG contrast checker run in browser.',
  },
  'artificial-intelligence': {
    environmentType: 'ai_data_lab',
    primaryLanguage: 'python',
    primaryFilename: 'prompt_pipeline.py',
    multiFileSupported: false,
    supportedFileTypes: ['.py', '.json'],
    previewCapability: 'static_inspection_only',
    executionCapability: 'remote_container_required',
    validationMethod: 'static_ast_and_delimiters',
    capabilityStatus: 'static_and_reasoning',
    starterFiles: [
      {
        filename: 'prompt_pipeline.py',
        language: 'python',
        code: `import json

def build_structured_prompt(topic: str, level: str) -> dict:
    return {
        "system": "You are a concise computer science mentor.",
        "user": f"Explain {topic} at a {level} level with 1 code example.",
        "response_format": "json_schema"
    }

print(json.dumps(build_structured_prompt("Recursion", "Beginner"), indent=2))`,
      },
    ],
    guidedTask: {
      id: 'task_ai_schema',
      title: 'Structured Prompt Payload Check',
      instructions: 'Author a structured prompt builder specifying system guardrails and explicit `response_format` schema.',
      requiredTokens: ['def ', 'return', 'system'],
    },
    knownLimitations: 'Python script inspection & structured schema validation run locally; live model/Python execution requires CODE_SANDBOX_URL or authenticated BrainCode AI Assistant.',
  },
};

function defaultProfileForEnvironment(
  env: PracticalEnvironmentType,
  input: TechnologyCapabilityInput
): TechnologyCapabilityProfile {
  const slug = input.slug.toLowerCase();
  const baseSlug = slug.replace(/[^a-z0-9]/g, '');
  const catName = input.categoryName || 'Technology';

  switch (env) {
    case 'web_dev_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_web_dev',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: 'html',
          primaryFilename: 'index.html',
          multiFileSupported: true,
          tabSize: 2,
          placeholder: `Write ${input.name} markup, styles, and scripts...`,
        },
        supportedFileTypes: ['.html', '.css', '.js'],
        starterFiles: [
          {
            filename: 'index.html',
            language: 'html',
            code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${input.name} Lab</title>
</head>
<body>
  <main>
    <h1>${input.name} Interactive Lab</h1>
    <p>Edit markup, CSS, and JavaScript across files and run live.</p>
  </main>
</body>
</html>`,
          },
          {
            filename: 'styles.css',
            language: 'css',
            code: `main { font-family: system-ui, sans-serif; padding: 20px; color: #0f172a; }`,
          },
          {
            filename: 'app.js',
            language: 'javascript',
            code: `console.log('${input.name} Web Lab ready');`,
          },
        ],
        previewCapability: 'live_browser_dom',
        executionCapability: 'browser_sandbox',
        validationMethod: 'dom_and_html_rules',
        exerciseTypes: ['write_code', 'practical_task', 'find_error', 'code_completion'],
        assessmentMethod: 'Live sandboxed DOM preview + semantic rule validation',
        requiredWorkspaceTools: ['Multi-File Editor', 'Live DOM Preview', 'Console', 'Responsive Viewport', 'Whiteboard'],
        learningActivityTypes: ['Live Multi-File Editing', 'DOM & CSS Inspection', 'Responsive Breakpoint Testing'],
        guidedTask: {
          id: `task_${baseSlug}_dom`,
          title: `${input.name} Live Markup Check`,
          instructions: 'Keep semantic HTML structure inside <main> and verify live output in Preview.',
          requiredTokens: ['<main', '</main>'],
        },
        knownLimitations: 'HTML, CSS, and JavaScript execute safely inside a sandbox="allow-scripts" browser iframe.',
        capabilityStatus: 'full_live',
      };

    case 'frontend_framework_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_frontend',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: 'tsx',
          primaryFilename: 'App.tsx',
          multiFileSupported: true,
          tabSize: 2,
          placeholder: `Author ${input.name} component & state definitions...`,
        },
        supportedFileTypes: ['.tsx', '.ts', '.css'],
        starterFiles: [
          {
            filename: 'App.tsx',
            language: 'tsx',
            code: `// ${input.name} Component Architecture Starter
interface ViewProps {
  title: string;
}

export function ModuleCard({ title }: ViewProps) {
  return (
    <article>
      <h2>{title}</h2>
    </article>
  );
}`,
          },
        ],
        previewCapability: 'static_inspection_only',
        executionCapability: 'remote_container_required',
        validationMethod: 'static_ast_and_delimiters',
        exerciseTypes: ['code_completion', 'find_error', 'predict_output', 'short_answer'],
        assessmentMethod: 'Static TSX/component rule inspection & architectural reasoning',
        requiredWorkspaceTools: ['Component Editor', 'Static Delimiter & Pattern Inspector', 'Whiteboard'],
        learningActivityTypes: ['Component Composition', 'Typed Props Modeling', 'State-Flow Diagramming'],
        guidedTask: {
          id: `task_${baseSlug}_cmp`,
          title: `${input.name} Component Structure Check`,
          instructions: `Define a clean exported ${input.name} component returning structured UI markup.`,
          requiredTokens: ['export ', 'return'],
        },
        knownLimitations: `${input.name} bundler/framework execution requires CODE_SANDBOX_URL. BrainCode performs real static structure & delimiter checks locally.`,
        capabilityStatus: 'static_and_reasoning',
      };

    case 'database_sql_lab': {
      const isRelational = ['sql', 'sqlite', 'postgresql', 'mysql', 'mariadb', 'duckdb', 'cockroachdb', 'sql-server', 'oracle-database', 'snowflake'].includes(slug);
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_db',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: isRelational ? 'sql' : 'json',
          primaryFilename: isRelational ? 'query.sql' : 'schema.json',
          multiFileSupported: false,
          tabSize: 2,
          placeholder: isRelational ? `Write ${input.name} SQL query...` : `Author ${input.name} query or document schema...`,
        },
        supportedFileTypes: isRelational ? ['.sql'] : ['.json', '.js'],
        starterFiles: [
          {
            filename: isRelational ? 'query.sql' : 'schema.json',
            language: isRelational ? 'sql' : 'json',
            code: isRelational
              ? `SELECT c.id, c.title, c.category, c.difficulty, c.hours\nFROM courses c\nORDER BY c.hours DESC;`
              : `{\n  "collection": "learners",\n  "filter": { "active": true },\n  "projection": { "name": 1, "xp": 1 }\n}`,
          },
        ],
        previewCapability: isRelational ? 'live_sql_table' : 'static_inspection_only',
        executionCapability: isRelational ? 'server_sqlite_memory' : 'remote_container_required',
        validationMethod: isRelational ? 'sqlite_query_execution' : 'config_manifest_linter',
        exerciseTypes: ['write_code', 'predict_output', 'find_error', 'multiple_choice'],
        assessmentMethod: isRelational ? 'Live in-memory SQL query result set comparison' : 'JSON/Document schema validation',
        requiredWorkspaceTools: isRelational
          ? ['SQL Query Editor', 'Relational Schema Reference', 'Result Grid', 'Whiteboard']
          : ['Schema & Query Editor', 'JSON Validator', 'ER Diagram Whiteboard'],
        learningActivityTypes: isRelational
          ? ['Live Query Execution', 'JOIN & Aggregation Practice', 'Schema Modeling']
          : ['Document Modeling', 'Query Pipeline Validation', 'Schema Sketching'],
        guidedTask: {
          id: `task_${baseSlug}_db`,
          title: isRelational ? `${input.name} Query Execution Task` : `${input.name} Schema Validation Task`,
          instructions: isRelational
            ? 'Run a SELECT query against departments, employees, courses, or orders to inspect live rows.'
            : 'Validate a well-formed JSON document/query configuration.',
          requiredTokens: isRelational ? ['SELECT', 'FROM'] : ['{', '}'],
        },
        knownLimitations: isRelational
          ? 'Standard SQL executes live via an isolated per-request in-memory SQLite (:memory:) engine; vendor-specific extensions require CODE_SANDBOX_URL.'
          : `${input.name} database server execution requires CODE_SANDBOX_URL; JSON query & schema validation run locally.`,
        capabilityStatus: isRelational ? 'hybrid_interactive' : 'static_and_reasoning',
      };
    }

    case 'ai_data_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_ai',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: 'python',
          primaryFilename: 'notebook_step.py',
          multiFileSupported: false,
          tabSize: 4,
          placeholder: `Author ${input.name} data pipeline or model logic...`,
        },
        supportedFileTypes: ['.py', '.json', '.sql'],
        starterFiles: [
          {
            filename: 'notebook_step.py',
            language: 'python',
            code: `# ${input.name} Experiment Pipeline\ndef evaluate_predictions(y_true: list[int], y_pred: list[int]) -> float:\n    matches = sum(1 for a, b in zip(y_true, y_pred) if a == b)\n    return round(matches / max(1, len(y_true)), 3)\n\nprint("Accuracy:", evaluate_predictions([1, 0, 1, 1], [1, 0, 0, 1]))`,
          },
        ],
        previewCapability: 'static_inspection_only',
        executionCapability: 'remote_container_required',
        validationMethod: 'static_ast_and_delimiters',
        exerciseTypes: ['predict_output', 'code_completion', 'short_answer', 'multiple_choice'],
        assessmentMethod: 'Static pipeline syntax checks & metric/output reasoning',
        requiredWorkspaceTools: ['Pipeline Code Editor', 'Syntax & Delimiter Diagnostics', 'Data Flow Whiteboard'],
        learningActivityTypes: ['Metric & Pipeline Reasoning', 'Code Completion', 'Model Diagramming'],
        guidedTask: {
          id: `task_${baseSlug}_ai`,
          title: `${input.name} Metric Function Check`,
          instructions: 'Implement a clean function with guard logic against division by zero and check expected accuracy.',
          requiredTokens: ['def ', 'return'],
          expectedReasoningQuestion: 'What accuracy does `evaluate_predictions([1, 0, 1, 1], [1, 0, 0, 1])` return?',
          expectedReasoningOptions: ['0.75', '0.5', '1.0', '0.25'],
          expectedReasoningAnswer: '0.75',
        },
        knownLimitations: `Python/ML runtime execution for ${input.name} requires configuring CODE_SANDBOX_URL. Static syntax inspection and reasoning checks are active.`,
        capabilityStatus: 'static_and_reasoning',
      };

    case 'cloud_devops_lab': {
      const isBash = slug === 'linux' || slug === 'bash' || slug === 'powershell' || slug === 'linux-security';
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_devops',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: isBash ? 'bash' : 'yaml',
          primaryFilename: isBash ? 'ops.sh' : 'pipeline.yaml',
          multiFileSupported: false,
          tabSize: 2,
          placeholder: `Write ${input.name} manifest or automation script...`,
        },
        supportedFileTypes: isBash ? ['.sh', '.conf'] : ['.yaml', '.yml', '.tf', '.json'],
        starterFiles: [
          {
            filename: isBash ? 'ops.sh' : 'pipeline.yaml',
            language: isBash ? 'bash' : 'yaml',
            code: isBash
              ? `#!/usr/bin/env bash\nset -euo pipefail\necho "Checking service permissions for ${input.name}"\nls -la`
              : `name: ${input.slug}-workflow\non:\n  push:\n    branches: [main]\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Run checks\n        run: npm test`,
          },
        ],
        previewCapability: 'static_inspection_only',
        executionCapability: 'remote_container_required',
        validationMethod: 'config_manifest_linter',
        exerciseTypes: ['find_error', 'code_completion', 'practical_task', 'multiple_choice'],
        assessmentMethod: 'Manifest/script structural linting & operational scenario reasoning',
        requiredWorkspaceTools: ['Config & Manifest Editor', 'Manifest Linter', 'Infrastructure Whiteboard'],
        learningActivityTypes: ['Manifest Validation', 'Failure-Mode Audits', 'Topology Diagramming'],
        guidedTask: {
          id: `task_${baseSlug}_ops`,
          title: `${input.name} Configuration Check`,
          instructions: isBash
            ? 'Include strict shell safety flags (`set -euo pipefail`) cleanly.'
            : 'Ensure valid YAML keys (`jobs:` / `steps:` or `services:`) without tab-indentation errors.',
          requiredTokens: isBash ? ['set -'] : [':'],
        },
        knownLimitations: `Live cloud/shell provisioning for ${input.name} requires CODE_SANDBOX_URL; manifest/YAML & script structure linting run locally.`,
        capabilityStatus: 'static_and_reasoning',
      };
    }

    case 'security_network_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_sec',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: 'json',
          primaryFilename: 'audit-policy.json',
          multiFileSupported: false,
          tabSize: 2,
          placeholder: `Author ${input.name} policy, rule, or network plan...`,
        },
        supportedFileTypes: ['.json', '.conf', '.txt'],
        starterFiles: [
          {
            filename: 'audit-policy.json',
            language: 'json',
            code: `{\n  "technology": "${input.name}",\n  "controls": ["least-privilege", "tls-1.3", "rate-limiting"],\n  "verifiedBy": "defensive-review"\n}`,
          },
        ],
        previewCapability: 'interactive_security_tool',
        executionCapability: 'interactive_toolkit',
        validationMethod: 'security_header_hash_lab',
        exerciseTypes: ['find_error', 'multiple_choice', 'short_answer', 'practical_task'],
        assessmentMethod: 'CIDR subnet calculator, Web Crypto SHA-256 toolkit, and defensive policy checks',
        requiredWorkspaceTools: ['Policy/Rule Editor', 'Subnet & Hash Toolkit', 'Architecture Whiteboard'],
        learningActivityTypes: ['Subnet Calculations', 'Cryptographic Hashing', 'Defensive Hardening'],
        guidedTask: {
          id: `task_${baseSlug}_sec`,
          title: `${input.name} Defensive Control Check`,
          instructions: 'Validate valid JSON policy configuration and experiment with SHA-256 digests & IPv4 CIDR calculations in the Preview/Lab tab.',
          requiredTokens: ['controls', '{'],
        },
        knownLimitations: 'Real Web Crypto hashing & IPv4 CIDR calculations run locally; privileged packet sniffing or active network scanning requires isolated lab infrastructure.',
        capabilityStatus: 'hybrid_interactive',
      };

    case 'design_uiux_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_design',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: 'svg',
          primaryFilename: 'canvas.svg',
          multiFileSupported: true,
          tabSize: 2,
          placeholder: `Edit SVG layout or design tokens for ${input.name}...`,
        },
        supportedFileTypes: ['.svg', '.css', '.html'],
        starterFiles: [
          {
            filename: 'canvas.svg',
            language: 'svg',
            code: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="100%" height="180">\n  <rect width="320" height="180" rx="12" fill="#FFFFFF" stroke="#E2E8F0"/>\n  <circle cx="70" cy="90" r="34" fill="#0A84FF"/>\n  <rect x="128" y="64" width="160" height="18" rx="4" fill="#0F172A"/>\n  <rect x="128" y="96" width="112" height="14" rx="4" fill="#64748B"/>\n</svg>`,
          },
        ],
        previewCapability: 'live_svg_tokens',
        executionCapability: 'browser_sandbox',
        validationMethod: 'wcag_svg_inspector',
        exerciseTypes: ['practical_task', 'short_answer', 'multiple_choice', 'matching'],
        assessmentMethod: 'Live SVG vector preview, mathematical WCAG contrast verification & whiteboard layout critique',
        requiredWorkspaceTools: ['SVG & Token Editor', 'Live Canvas Preview', 'WCAG Contrast Calculator', 'Interactive Whiteboard'],
        learningActivityTypes: ['Vector Layout Composition', 'Contrast Ratio Auditing', 'Wireframe Sketching'],
        guidedTask: {
          id: `task_${baseSlug}_svg`,
          title: `${input.name} Vector & Contrast Check`,
          instructions: 'Edit the SVG composition cleanly and verify WCAG AA contrast ratio in the Design Lab.',
          requiredTokens: ['<svg', 'viewBox'],
        },
        knownLimitations: `Proprietary desktop project files for ${input.name} cannot run natively in-browser; SVG/CSS design tokens, contrast auditing, and Interactive Whiteboard sketching run live.`,
        capabilityStatus: 'hybrid_interactive',
      };

    case 'game_robotics_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_game',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: slug === 'threejs' ? 'html' : 'cpp',
          primaryFilename: slug === 'threejs' ? 'scene.html' : 'loop.cpp',
          multiFileSupported: false,
          tabSize: 2,
          placeholder: `Write ${input.name} simulation or hardware control loop...`,
        },
        supportedFileTypes: slug === 'threejs' ? ['.html', '.js'] : ['.cpp', '.cs', '.gd', '.py'],
        starterFiles: [
          {
            filename: slug === 'threejs' ? 'scene.html' : 'loop.cpp',
            language: slug === 'threejs' ? 'html' : 'cpp',
            code:
              slug === 'threejs'
                ? `<canvas id="stage" width="320" height="160" style="border:1px solid #cbd5e1;border-radius:10px;"></canvas>\n<script>\n  const ctx = document.getElementById('stage').getContext('2d');\n  ctx.fillStyle = '#0A84FF';\n  ctx.fillRect(40, 50, 60, 60);\n  console.log('Canvas frame rendered');\n</script>`
                : `// ${input.name} State Loop Starter\nconst int SENSOR_PIN = 2;\nvoid setup() {\n  // Initialize pin & baud rate\n}\nvoid loop() {\n  // Read sensor threshold & update actuator\n}`,
          },
        ],
        previewCapability: slug === 'threejs' ? 'live_browser_dom' : 'static_inspection_only',
        executionCapability: slug === 'threejs' ? 'browser_sandbox' : 'remote_container_required',
        validationMethod: slug === 'threejs' ? 'dom_and_html_rules' : 'static_ast_and_delimiters',
        exerciseTypes: ['code_completion', 'predict_output', 'find_error', 'practical_task'],
        assessmentMethod: 'Control-loop syntax validation & state-machine whiteboard modeling',
        requiredWorkspaceTools: ['Simulation/Firmware Editor', 'Syntax Inspector', 'State Diagram Whiteboard'],
        learningActivityTypes: ['Game/Control Loop Logic', 'Pin & Coordinate Reasoning', 'State Machine Drawing'],
        guidedTask: {
          id: `task_${baseSlug}_sim`,
          title: `${input.name} Control Loop Check`,
          instructions: 'Verify balanced braces and state/loop initialization structure.',
          requiredTokens: ['{', '}'],
        },
        knownLimitations: `Hardware GPIO pins or native game engine builds (${input.name}) require target hardware or CODE_SANDBOX_URL; syntax checks and Whiteboard modeling are active.`,
        capabilityStatus: slug === 'threejs' ? 'full_live' : 'static_and_reasoning',
      };

    case 'systems_tools_lab':
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_tools',
        categoryName: catName,
        displayName: input.name,
        environmentType: env,
        environmentLabel: ENVIRONMENT_LABELS[env],
        editorConfig: {
          primaryLanguage: 'javascript',
          primaryFilename: 'lab.js',
          multiFileSupported: false,
          tabSize: 2,
          placeholder: `Practice ${input.name} algorithms, tests, or workflow commands...`,
        },
        supportedFileTypes: ['.js', '.ts', '.json', '.sh'],
        starterFiles: [
          {
            filename: 'lab.js',
            language: 'javascript',
            code: `// ${input.name} Practice Snippet\nfunction binarySearch(sorted, target) {\n  let lo = 0, hi = sorted.length - 1;\n  while (lo <= hi) {\n    const mid = Math.floor((lo + hi) / 2);\n    if (sorted[mid] === target) return mid;\n    if (sorted[mid] < target) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}\nconsole.log('Index of 14:', binarySearch([2, 6, 10, 14, 22], 14));`,
          },
        ],
        previewCapability: 'live_browser_dom',
        executionCapability: 'js_vm_or_remote',
        validationMethod: 'js_vm_test_cases',
        exerciseTypes: ['write_code', 'predict_output', 'find_error', 'short_answer'],
        assessmentMethod: 'Live JavaScript/Node VM execution or workflow validation',
        requiredWorkspaceTools: ['Code/Workflow Editor', 'Console Runner', 'Diagram Whiteboard'],
        learningActivityTypes: ['Algorithm Execution', 'Trace & Complexity Analysis', 'Diagramming'],
        guidedTask: {
          id: `task_${baseSlug}_sys`,
          title: `${input.name} Logic & Trace Task`,
          instructions: 'Run the helper snippet and inspect output in Console or sketch invariants on the Whiteboard.',
          requiredTokens: ['function', 'return'],
        },
        knownLimitations: 'Standard JavaScript algorithms run live in the browser & Node VM; external CLI/IDE tooling requires local install or CODE_SANDBOX_URL.',
        capabilityStatus: 'hybrid_interactive',
      };

    case 'programming_lab':
    default: {
      const lang = ['python', 'java', 'cpp', 'c', 'csharp', 'php', 'go', 'rust'].includes(slug)
        ? slug
        : slug === 'nodejs' || slug === 'express'
          ? 'javascript'
          : 'python';
      const ext =
        lang === 'javascript' ? '.js' : lang === 'java' ? '.java' : lang === 'cpp' ? '.cpp' : lang === 'go' ? '.go' : lang === 'rust' ? '.rs' : '.py';
      return {
        technologyId: input.id || `tech_${baseSlug}`,
        slug: input.slug,
        categoryId: input.categoryId || 'cat_langs',
        categoryName: catName,
        displayName: input.name,
        environmentType: 'programming_lab',
        environmentLabel: ENVIRONMENT_LABELS.programming_lab,
        editorConfig: {
          primaryLanguage: lang,
          primaryFilename: `main${ext}`,
          multiFileSupported: false,
          tabSize: lang === 'python' ? 4 : 2,
          placeholder: `Write clean ${input.name} code...`,
        },
        supportedFileTypes: [ext],
        starterFiles: [
          {
            filename: `main${ext}`,
            language: lang,
            code:
              lang === 'javascript'
                ? `const serviceName = "${input.name}";\nconsole.log("Running handler for:", serviceName);`
                : `# ${input.name} Practice Starter\ndef run_task(value: int) -> int:\n    return value * 2\n\nprint(run_task(21))`,
          },
        ],
        previewCapability: lang === 'javascript' ? 'live_browser_dom' : 'static_inspection_only',
        executionCapability: lang === 'javascript' ? 'js_vm_or_remote' : 'remote_container_required',
        validationMethod: lang === 'javascript' ? 'js_vm_test_cases' : 'static_ast_and_delimiters',
        exerciseTypes: ['code_completion', 'predict_output', 'find_error', 'write_code'],
        assessmentMethod:
          lang === 'javascript'
            ? 'Isolated VM execution + console verification'
            : 'Static syntax/delimiter inspection + expected-output reasoning',
        requiredWorkspaceTools: ['Language Editor', 'Syntax Diagnostics', 'Reasoning Checks', 'Whiteboard'],
        learningActivityTypes: ['Problem Solving', 'Static Syntax Checking', 'Expected-Output Reasoning'],
        guidedTask: {
          id: `task_${baseSlug}_prog`,
          title: `${input.name} Function & Output Check`,
          instructions: `Write clean ${input.name} logic and run ${lang === 'javascript' ? 'Run Code' : 'Check Syntax'} to inspect diagnostics.`,
          requiredTokens: lang === 'javascript' ? ['console.log'] : ['def ', 'return'],
        },
        knownLimitations:
          lang === 'javascript'
            ? 'JavaScript snippets execute in browser sandbox & isolated Node VM.'
            : `Full ${input.name} compiler/interpreter execution requires CODE_SANDBOX_URL; real static delimiter & structure checks run locally.`,
        capabilityStatus: lang === 'javascript' ? 'full_live' : 'static_and_reasoning',
      };
    }
  }
}

export function resolveTechnologyCapability(input: TechnologyCapabilityInput): TechnologyCapabilityProfile {
  const slug = String(input.slug || '').trim().toLowerCase();
  const catKey = String(input.categoryId || input.categorySlug || '').trim().toLowerCase();
  const override = TECH_OVERRIDES[slug];
  const env: PracticalEnvironmentType =
    override?.environmentType || CATEGORY_TO_ENV[catKey] || 'programming_lab';

  const base = defaultProfileForEnvironment(env, input);
  if (!override) return base;

  return {
    ...base,
    ...override,
    environmentType: env,
    environmentLabel: override.environmentLabel || ENVIRONMENT_LABELS[env],
    editorConfig: {
      ...base.editorConfig,
      primaryLanguage: override.primaryLanguage || base.editorConfig.primaryLanguage,
      primaryFilename: override.primaryFilename || base.editorConfig.primaryFilename,
      multiFileSupported:
        override.multiFileSupported !== undefined
          ? override.multiFileSupported
          : base.editorConfig.multiFileSupported,
    },
    supportedFileTypes: override.supportedFileTypes || base.supportedFileTypes,
    starterFiles: override.starterFiles || base.starterFiles,
    previewCapability: override.previewCapability || base.previewCapability,
    executionCapability: override.executionCapability || base.executionCapability,
    validationMethod: override.validationMethod || base.validationMethod,
    exerciseTypes: override.exerciseTypes || base.exerciseTypes,
    assessmentMethod: override.assessmentMethod || base.assessmentMethod,
    requiredWorkspaceTools: override.requiredWorkspaceTools || base.requiredWorkspaceTools,
    learningActivityTypes: override.learningActivityTypes || base.learningActivityTypes,
    guidedTask: override.guidedTask || base.guidedTask,
    knownLimitations: override.knownLimitations || base.knownLimitations,
    capabilityStatus: override.capabilityStatus || base.capabilityStatus,
  };
}
