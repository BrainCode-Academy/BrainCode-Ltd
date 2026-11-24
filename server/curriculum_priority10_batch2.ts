import type { PriorityBatchBundle } from './curriculum_priority10_types.ts';

export const PRIORITY_BATCH_2_APP_STACK: PriorityBatchBundle = {
  modules: [
    // Python (expands mod_py_1 & mod_py_2 -> completes Intermediate/Advanced/Applied)
    {
      id: 'mod_py_3',
      courseId: 'crs_python',
      title: 'Module 3: HTTP APIs, SQLite Databases & Automated Pytest Testing',
      topic: 'JSON REST Consumers, Parameterized SQLite & Unit Assertions',
      sortOrder: 3,
    },
    {
      id: 'mod_py_4',
      courseId: 'crs_python',
      title: 'Module 4: Applied Python File-Based Management System',
      topic: 'Dataclasses, Pathlib Persistence & CLI Architecture',
      sortOrder: 4,
    },

    // React (expands mod_react_1)
    {
      id: 'mod_react_2',
      courseId: 'crs_react',
      title: 'Module 2: JSX Composition, Event Handling & Controlled Forms',
      topic: 'Props Contracts, Event Listeners, Validation & Reconciliation Keys',
      sortOrder: 2,
    },
    {
      id: 'mod_react_3',
      courseId: 'crs_react',
      title: 'Module 3: Custom Hooks, Data Fetching & Context Architecture',
      topic: 'useEffect Cleanup, AbortController, useReducer & Context',
      sortOrder: 3,
    },
    {
      id: 'mod_react_4',
      courseId: 'crs_react',
      title: 'Module 4: React Performance, Component Testing & Dashboard Project',
      topic: 'Memoization, Error Boundaries & API-Powered Dashboards',
      sortOrder: 4,
    },

    // TypeScript (expands mod_ts_1)
    {
      id: 'mod_ts_2',
      courseId: 'crs_typescript',
      title: 'Module 2: Generics, Utility Types & Strict API Contracts',
      topic: 'Generic Constraints, Partial/Pick/Omit & Mapped Types',
      sortOrder: 2,
    },
    {
      id: 'mod_ts_3',
      courseId: 'crs_typescript',
      title: 'Module 3: Async Promises, Error Narrowing & Type Guards',
      topic: 'unknown vs any, User-Defined Predicates & Async Return Types',
      sortOrder: 3,
    },
    {
      id: 'mod_ts_4',
      courseId: 'crs_typescript',
      title: 'Module 4: Typed UI Components & Full-Stack Shared Schemas',
      topic: 'Typed Props, Polymorphic Helpers & End-to-End Type Safety',
      sortOrder: 4,
    },
  ],

  lessons: [
    // ======================= PYTHON =======================
    {
      id: 'les_py_7',
      courseId: 'crs_python',
      moduleId: 'mod_py_3',
      title: 'Working with SQLite Databases & Parameterized SQL in Python',
      slug: 'python-sqlite-parameterized-queries',
      topicName: 'Python & SQLite Databases',
      summary: 'Connect Python’s built-in `sqlite3` module, open transaction contexts, and bind query arguments safely with `?` placeholders to block SQL injection.',
      language: 'python',
      accessTier: 'free',
      durationMinutes: 22,
      sortOrder: 7,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Initialize a SQLite database connection using Python standard library `sqlite3`.',
        'Protect every `SELECT`, `INSERT`, and `UPDATE` statement against SQL injection using parameterized tuple bindings `(value,)`.',
        'Wrap write transactions with `with conn:` context blocks for automatic commit/rollback safety.',
      ],
      prerequisites: ['File Handling, Modules & Error Handling (Lesson 6)'],
      detailedExplanation:
        'Python ships `sqlite3` directly inside the standard library, letting backend scripts, CLI tools, and analytics notebooks query relational tables cleanly with zero external server install.\n\nNever interpolate user input directly into SQL strings (`f"WHERE email = \'{email}\'"`)! Even an honest apostrophe (e.g., `O\'Connor`) crashes unescaped SQL, and malicious payloads execute arbitrary queries. Passing a tuple as the second argument to `cursor.execute(sql, (email,))` instructs SQLite to bind parameters safely as typed values.',
      conceptsAndTerminology: [
        { term: 'Parameterized Query', definition: 'SQL template using `?` placeholders filled separately via bound parameter tuples.' },
        { term: 'sqlite3.Row', definition: 'Row factory enabling dictionary-like column lookup (`row["name"]`) instead of brittle integer indexes.' },
        { term: 'Transaction Context (`with conn:`)', definition: 'Commits changes on clean block exit or rolls back automatically if an exception fires.' },
      ],
      stepByStepTeaching: [
        'Import `sqlite3` and open a connection (`conn = sqlite3.connect(":memory:")` or file path).',
        'Assign `conn.row_factory = sqlite3.Row` for readable named column access.',
        'Create tables with `CREATE TABLE IF NOT EXISTS` and bind inserts with `(name, grade)`.',
      ],
      syntaxAndUsage: [
        'Single-element Python tuples require a trailing comma: `cursor.execute("SELECT * FROM students WHERE id = ?", (student_id,))`.',
      ],
      practicalExampleNarrative:
        'An in-memory SQLite student ledger inserting and querying records via parameterized tuples.',
      codeExamples: [
        {
          title: 'Safe Parameterized SQLite Student Lookup',
          description: 'Uses `with conn:` transaction safety and `?` placeholders.',
          language: 'python',
          code: `import sqlite3\n\nconn = sqlite3.connect(":memory:")\nconn.row_factory = sqlite3.Row\nwith conn:\n    conn.execute("CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, score INTEGER)")\n    conn.execute("INSERT INTO students (name, score) VALUES (?, ?)", ("Ada Lovelace", 98))\n    conn.execute("INSERT INTO students (name, score) VALUES (?, ?)", ("Alan Turing", 91))\n\nrows = conn.execute("SELECT name, score FROM students WHERE score >= ?", (90,)).fetchall()\nfor r in rows:\n    print(f"{r['name']}: {r['score']}")`,
          expectedOutput: `Ada Lovelace: 98\nAlan Turing: 91`,
          explanation: 'Using `?` bindings escapes every argument safely and `sqlite3.Row` keeps column indexing readable.',
        },
      ],
      commonMistakes: [
        'Forgetting the trailing comma on single-value tuples: `(val)` is a grouped expression, NOT `(val,)`!',
        'Building SQL via Python f-strings (`f"SELECT * FROM users WHERE id={uid}"`).',
      ],
      bestPractices: [
        'Always close connections (`conn.close()`) or manage them explicitly inside helper contexts.',
        'Create composite indexes on frequently filtered columns.',
      ],
      practicalActivity:
        'Extend the student ledger to update a student score conditionally and delete records below a threshold using `?` parameters.',
      starterCode: `import sqlite3\nconn = sqlite3.connect(":memory:")\n# Create table and run parameterized INSERT + SELECT`,
      solutionHint: 'Remember `(min_score,)` needs a trailing comma for a 1-item tuple.',
      knowledgeChecks: [
        'Why does `cursor.execute("SELECT * FROM users WHERE name = ?", ("Ada"))` raise `ProgrammingError`?',
        'What does setting `conn.row_factory = sqlite3.Row` allow?',
      ],
      summaryPoints: [
        'Parameterized `?` placeholders guarantee SQL injection immunity.',
        '`with conn:` automates commit/rollback semantics cleanly.',
      ],
      furtherResources: ['Python Official Docs — sqlite3 DB-API 2.0 Interface'],
    },
    {
      id: 'les_py_8',
      courseId: 'crs_python',
      moduleId: 'mod_py_4',
      title: 'Automated Testing with pytest & Dataclasses for Student Systems',
      slug: 'python-pytest-dataclasses-management',
      topicName: 'Pytest & Applied Dataclasses',
      summary: 'Model domain records cleanly with `@dataclass`, serialize state to JSON via `pathlib.Path`, and verify logic using `pytest` assertions and edge-case tests.',
      language: 'python',
      accessTier: 'premium',
      durationMinutes: 25,
      sortOrder: 8,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Define clean domain entities using `@dataclass` and `asdict()`.',
        'Persist and reload structured student rosters safely using `pathlib.Path` and `json`.',
        'Write focused `pytest` unit tests covering valid paths and expected `ValueError` exceptions (`pytest.raises`).',
      ],
      prerequisites: ['Lesson 5, Lesson 6 & Lesson 7'],
      detailedExplanation:
        'Combining `@dataclass` with `pathlib` and `pytest` represents modern idiomatic Python engineering. `@dataclass` eliminates repetitive `__init__` and `__repr__` boilerplate while preserving crisp type annotations (`gpa: float`). Converting records with `dataclasses.asdict()` produces clean dictionaries ready for JSON persistence.\n\nBefore releasing any CLI or backend service, automated `test_*.py` functions verify calculations (`average_gpa`), duplicate ID guards, and file persistence deterministically.',
      conceptsAndTerminology: [
        { term: '@dataclass', definition: 'Decorator auto-generating `__init__`, `__repr__`, and equality comparison from typed fields.' },
        { term: 'pytest.raises', definition: 'Context manager asserting that invalid inputs cleanly raise expected exception classes.' },
      ],
      stepByStepTeaching: [
        'Model a `StudentRecord` using `@dataclass` with `student_id: str`, `full_name: str`, `scores: list[int]`.',
        'Compute derived properties like `average` without storing stale duplicate totals.',
        'Write unit tests verifying empty score lists return `0.0` instead of crashing with `ZeroDivisionError`.',
      ],
      syntaxAndUsage: [
        'Guard mutable default collections on dataclasses with `field(default_factory=list)`.',
      ],
      practicalExampleNarrative:
        'A typed `StudentRecord` dataclass with JSON serialization and `ZeroDivisionError`-safe GPA calculation.',
      codeExamples: [
        {
          title: 'StudentRecord Dataclass with Safe Average & JSON Export',
          description: 'Demonstrates `field(default_factory=list)`, `asdict()`, and unit assertions.',
          language: 'python',
          code: `from dataclasses import dataclass, field, asdict\nimport json\n\n@dataclass\nclass StudentRecord:\n    student_id: str\n    full_name: str\n    scores: list[int] = field(default_factory=list)\n\n    def average(self) -> float:\n        if not self.scores:\n            return 0.0\n        return round(sum(self.scores) / len(self.scores), 2)\n\ns = StudentRecord("STU-101", "Grace Hopper", [94, 88, 96])\nassert s.average() == 92.67\nassert StudentRecord("STU-102", "Empty").average() == 0.0\nprint(json.dumps(asdict(s)))`,
          expectedOutput: `{"student_id": "STU-101", "full_name": "Grace Hopper", "scores": [94, 88, 96]}`,
          explanation: 'Guarding `if not self.scores:` prevents zero division cleanly, and `field(default_factory=list)` avoids shared mutable list bugs across instances.',
        },
      ],
      commonMistakes: [
        'Writing `scores: list[int] = []` inside `@dataclass` (Python raises `ValueError: mutable default`!).',
        'Not testing empty-list edge cases inside aggregation methods.',
      ],
      bestPractices: [
        'Use `field(default_factory=list)` for mutable dataclass attributes.',
        'Test both happy paths and boundary inputs (`[]`, negative scores).',
      ],
      practicalActivity:
        'Add an `add_score(score: int)` method to `StudentRecord` rejecting values outside `0..100` with `ValueError`, plus two unit assertions.',
      starterCode: `from dataclasses import dataclass, field\n\n@dataclass\nclass StudentRecord:\n    student_id: str\n    scores: list[int] = field(default_factory=list)`,
      solutionHint: 'Raise `ValueError("Score must be 0..100")` inside `add_score`.',
      knowledgeChecks: [
        'Why must `@dataclass` use `field(default_factory=list)` instead of `= []`?',
      ],
      summaryPoints: [
        '`@dataclass`, `pathlib`, and `pytest` combine for clean, reliable Python applications.',
      ],
      furtherResources: ['Python Docs — dataclasses', 'pytest Documentation'],
    },

    // ======================= REACT =======================
    {
      id: 'les_react_2',
      courseId: 'crs_react',
      moduleId: 'mod_react_2',
      title: 'JSX Composition, Props Contracts, List Keys & Controlled Forms',
      slug: 'react-jsx-props-keys-forms',
      topicName: 'Components, Props & Forms',
      summary: 'Compose reusable UI components with explicit TypeScript props, preserve DOM/state identity via stable `key` props, and validate controlled `<form>` inputs.',
      language: 'javascript',
      accessTier: 'free',
      durationMinutes: 22,
      sortOrder: 2,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Design clean component boundaries passing data down via props and events up via callback props.',
        'Use stable unique entity IDs for list `key` props instead of mutable array indices.',
        'Manage controlled inputs and explicit form submission validation without full page reloads.',
      ],
      prerequisites: ['Derived State vs Redundant Effects (Lesson 1)'],
      detailedExplanation:
        'React reconciles changes between renders using component types and list **keys**. When rendering dynamic lists (`tasks.map((task, idx) => ...)`), using array index `idx` causes subtle input-focus and state corruption whenever items are reordered, filtered, or prepended—React attaches the previous row’s DOM state to the wrong item! Always key lists with stable database or UUID identifiers (`key={task.id}`).\n\nFor user input, **controlled form components** bind `value={text}` directly to React state and inspect `onSubmit={(e) => { e.preventDefault(); ... }}` so validation errors stay synchronized seamlessly.',
      conceptsAndTerminology: [
        { term: 'Reconciliation Key', definition: 'Unique sibling identifier helping React track which items moved, mounted, or unmounted.' },
        { term: 'Controlled Input', definition: 'Form input whose displayed value is driven strictly by React state (`value` + `onChange`).' },
        { term: 'children Prop', definition: 'Special composition slot allowing wrapper cards/modals to render arbitrary nested JSX.' },
      ],
      stepByStepTeaching: [
        'Define an explicit `Props` interface (`{ title: string; onSubmit: (val: string) => void }`).',
        'Bind controlled inputs with `value` and `onChange={(e) => setQuery(e.target.value)}`.',
        'Pass `key={item.id}` on the outermost JSX element returned inside `.map()`.',
      ],
      syntaxAndUsage: [
        'Always call `e.preventDefault()` at the top of custom `<form onSubmit>` handlers.',
      ],
      practicalExampleNarrative:
        'A reusable controlled enrollment form component paired with a uniquely keyed lesson list.',
      codeExamples: [
        {
          title: 'Controlled Form with Inline Validation & Keyed List',
          description: 'Validates title length before invoking `onCreate` and renders items keyed by stable ID.',
          language: 'javascript',
          code: `function TaskComposer({ onCreate }) {\n  const [title, setTitle] = React.useState('');\n  const [error, setError] = React.useState('');\n\n  function handleSubmit(e) {\n    e.preventDefault();\n    if (title.trim().length < 3) {\n      setError('Enter at least 3 characters.');\n      return;\n    }\n    onCreate(title.trim());\n    setTitle('');\n    setError('');\n  }\n\n  return (\n    <form onSubmit={handleSubmit}>\n      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" />\n      <button type="submit">Add Task</button>\n      {error && <p role="alert">{error}</p>}\n    </form>\n  );\n}`,
          expectedOutput: 'Blocks empty/short submissions cleanly, renders inline `role="alert"`, and clears the input on valid submit.',
          explanation: 'State owns input contents cleanly, guaranteeing synchronization between validation messages and form reset.',
        },
      ],
      commonMistakes: [
        'Passing `key={index}` on filterable or editable lists, corrupting child state on deletion.',
        'Calling `onSubmit={handleClick()}` (invoking immediately during render) instead of passing the function reference `onSubmit={handleClick}`.',
      ],
      bestPractices: [
        'Keep components pure functions of their props and state—never mutate props directly.',
      ],
      practicalActivity:
        'Build a `<CourseFilterBar />` component accepting `query`, `onQueryChange`, and `categories` props without owning duplicate copy state.',
      starterCode: `function CourseFilterBar({ query, onQueryChange }) {\n  return <input value={query} onChange={(e) => onQueryChange(e.target.value)} />;\n}`,
      solutionHint: 'Lift `query` state into the parent dashboard so sibling course cards filter synchronously.',
      knowledgeChecks: [
        'What breaks when using array `index` as `key` on a reorderable or deletable list?',
        'Why is `e.preventDefault()` required inside React form `onSubmit` handlers?',
      ],
      summaryPoints: [
        'Use stable IDs for `key` props and lift shared state cleanly to common parents.',
      ],
      furtherResources: ['React Docs — Rendering Lists & Sharing State'],
    },
    {
      id: 'les_react_3',
      courseId: 'crs_react',
      moduleId: 'mod_react_3',
      title: 'Custom Hooks, Async Data Fetching, Race Guards & Context',
      slug: 'react-custom-hooks-fetching-context',
      topicName: 'Custom Hooks & Data Fetching',
      summary: 'Extract reusable stateful hooks (`useDebouncedValue`, `useFetchJson`), prevent stale-response race conditions with `AbortController`, and share app-wide theme/auth via Context.',
      language: 'javascript',
      accessTier: 'free',
      durationMinutes: 25,
      sortOrder: 3,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Author reusable `use*` hooks encapsulating effects and cleanup.',
        'Cancel in-flight `fetch()` calls inside `useEffect` cleanup using `AbortController` to eliminate stale-data races.',
        'Combine `useReducer` with Context for clean multi-action UI state transitions.',
      ],
      prerequisites: ['Lesson 1 & Lesson 2'],
      detailedExplanation:
        'Whenever a user types quickly into a search box ("p" → "py" → "python"), three network requests fly out in parallel. If the response for `"p"` returns *after* `"python"`, naive effects overwrite fresh `"python"` results with stale `"p"` data! Returning a cleanup function `() => controller.abort()` from `useEffect` cancels outdated requests deterministically.\n\nBundling this fetching pattern—alongside `loading`, `error`, and `data` state—into a clean custom hook (`useCourseSearch(query)`) keeps page components declarative and readable.',
      conceptsAndTerminology: [
        { term: 'Cleanup Function', definition: 'Function returned from `useEffect` executing before the next effect run or component unmount.' },
        { term: 'AbortController', definition: 'Standard DOM API aborting obsolete async fetches during rapid prop/state changes.' },
        { term: 'Context Provider', definition: 'Shares read-mostly global data (Theme, Auth, Locale) cleanly across deep component trees.' },
      ],
      stepByStepTeaching: [
        'Create `const controller = new AbortController();` inside `useEffect`.',
        'Pass `{ signal: controller.signal }` into `fetch(...)`.',
        'Ignore `AbortError` inside `catch`, and return `() => controller.abort();` as the effect cleanup.',
      ],
      syntaxAndUsage: [
        'Custom hooks MUST begin with `use` (`useDashboardData`) so React’s Rules of Hooks linter validates call order.',
      ],
      practicalExampleNarrative:
        'A race-condition-proof data fetching custom hook using `AbortController` cleanup.',
      codeExamples: [
        {
          title: 'Race-Safe Custom Fetch Hook with AbortController',
          description: 'Cancels superseded requests automatically on dependency change or unmount.',
          language: 'javascript',
          code: `function useApiResource(url) {\n  const [state, setState] = React.useState({ data: null, loading: true, error: '' });\n\n  React.useEffect(() => {\n    const controller = new AbortController();\n    setState((s) => ({ ...s, loading: true, error: '' }));\n\n    fetch(url, { signal: controller.signal })\n      .then((res) => {\n        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n        return res.json();\n      })\n      .then((data) => setState({ data, loading: false, error: '' }))\n      .catch((err) => {\n        if (err.name === 'AbortError') return;\n        setState({ data: null, loading: false, error: err.message });\n      });\n\n    return () => controller.abort();\n  }, [url]);\n\n  return state;\n}`,
          expectedOutput: 'Always displays the latest requested `url` result and cleans up safely if the component unmounts mid-flight.',
          explanation: 'Inspecting `err.name === "AbortError"` ensures intentional cancellations never flash false error banners.',
        },
      ],
      commonMistakes: [
        'Omitting `url` from the `useEffect` dependency array `[url]` or omitting cleanup `controller.abort()`.',
        'Calling hooks conditionally (`if (ready) useState(...)`), breaking React hook slot indexing.',
      ],
      bestPractices: [
        'Always call hooks unconditionally at the top level of components or custom hooks.',
      ],
      practicalActivity:
        'Write a `useDebouncedValue(value, delayMs)` custom hook using `useState` + `useEffect` timer cleanup.',
      starterCode: `function useDebouncedValue(value, delay = 250) {\n  const [debounced, setDebounced] = React.useState(value);\n  // Add useEffect with setTimeout & clearTimeout cleanup\n  return debounced;\n}`,
      solutionHint: 'Return `() => clearTimeout(timer)` from `useEffect`.',
      knowledgeChecks: [
        'Why should `AbortError` be ignored inside the fetch `catch` handler?',
        'What breaks if a custom hook is invoked inside an `if` block?',
      ],
      summaryPoints: [
        'Custom hooks reuse stateful behavior cleanly; `AbortController` prevents out-of-order async bugs.',
      ],
      furtherResources: ['React Docs — Reusing Logic with Custom Hooks'],
    },
    {
      id: 'les_react_4',
      courseId: 'crs_react',
      moduleId: 'mod_react_4',
      title: 'React Performance, Error Boundaries & Dashboard Architecture',
      slug: 'react-performance-error-boundaries',
      topicName: 'Performance & Architecture',
      summary: 'Isolate runtime failures with Error Boundaries, avoid needless re-renders via `useMemo`/`React.memo`, and structure modular API dashboards.',
      language: 'javascript',
      accessTier: 'premium',
      durationMinutes: 22,
      sortOrder: 4,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Compute expensive filtered/sorted metrics cleanly with `useMemo` only where profiling warrants.',
        'Catch unexpected render exceptions gracefully using React Error Boundaries.',
        'Split route views lazily with `React.lazy` and `<Suspense>` to keep initial bundles fast.',
      ],
      prerequisites: ['Lesson 3'],
      detailedExplanation:
        'A common mistake in React apps is premature `useCallback` wrapping everywhere while neglecting real bottlenecks: colocate state near the components that use it so typing inside a modal doesn’t re-render an entire 237-row table!\n\nWhere expensive dataset sorting runs on every unrelated render, `useMemo` caches the derived slice. Meanwhile, wrapping major page sections in an **Error Boundary** prevents a single malformed widget payload from blanking the entire application screen.',
      conceptsAndTerminology: [
        { term: 'State Colocation', definition: 'Keeping state inside the lowest component subtree that actually needs it.' },
        { term: 'useMemo', definition: 'Caches a derived computation across renders until listed dependencies change.' },
        { term: 'Error Boundary', definition: 'Class component implementing `getDerivedStateFromError` to render fallback recovery UI.' },
      ],
      stepByStepTeaching: [
        'Colocate draft input state inside child form components instead of root `<App />`.',
        'Memoize expensive dataset sorts/aggregations (`const summary = useMemo(() => ..., [rows])`).',
        'Wrap asynchronous widgets with `<Suspense fallback={...}>` and an Error Boundary.',
      ],
      syntaxAndUsage: [
        'Avoid inline object literals `<Widget config={{ a: 1 }} />` when passing props to `React.memo(Widget)` children.',
      ],
      practicalExampleNarrative:
        'Using `useMemo` to cache summary analytics across dashboard filter updates.',
      codeExamples: [
        {
          title: 'Memoized Dashboard Metrics Derivation',
          description: 'Computes summary KPIs only when the `technologies` array reference changes.',
          language: 'javascript',
          code: `function CoverageSummaryStrip({ technologies, filterText }) {\n  const metrics = React.useMemo(() => {\n    const published = technologies.filter((t) => t.publishedLessons > 0).length;\n    const avg = technologies.length\n      ? Math.round(technologies.reduce((s, t) => s + t.score, 0) / technologies.length)\n      : 0;\n    return { total: technologies.length, published, avg };\n  }, [technologies]);\n\n  return (\n    <div>\n      <span>Total: {metrics.total} | Active: {metrics.published} | Avg: {metrics.avg}% | Query: {filterText}</span>\n    </div>\n  );\n}`,
          expectedOutput: 'Typing in `filterText` skips recomputing `metrics` because only `technologies` sits in the dependency array.',
          explanation: 'Colocating fast filter state separately from cached aggregate metrics keeps typing lag-free.',
        },
      ],
      commonMistakes: [
        'Leaving unstable dependencies inside `useMemo` that change identity on every render.',
        'Expecting `try/catch` around JSX in a functional parent to catch child render errors (only Error Boundaries catch render-phase errors).',
      ],
      bestPractices: [
        'Measure render counts with React DevTools Profiler before optimizing.',
      ],
      practicalActivity:
        'Wrap a dashboard analytics card with an Error Boundary fallback rendering a clean Retry button.',
      starterCode: `class WidgetBoundary extends React.Component { /* implement getDerivedStateFromError */ }`,
      solutionHint: 'Implement `static getDerivedStateFromError() { return { hasError: true }; }`.',
      knowledgeChecks: [
        'Why does moving typing input state into a small child component often speed up rendering more than adding `useMemo` everywhere?',
      ],
      summaryPoints: [
        'Colocate state, memoize genuine heavy derivations, and protect screens with Error Boundaries.',
      ],
      furtherResources: ['React Docs — Your First Component to Scaling Up'],
    },
    {
      id: 'les_react_5',
      courseId: 'crs_react',
      moduleId: 'mod_react_4',
      title: 'Component Testing Principles & Accessible Dashboard Patterns',
      slug: 'react-testing-accessible-dashboard',
      topicName: 'React Testing & Accessibility',
      summary: 'Test React UIs from a user’s perspective using semantic ARIA queries, mock HTTP boundaries cleanly, and ensure accessible tabs/dialogs.',
      language: 'javascript',
      accessTier: 'free',
      durationMinutes: 18,
      sortOrder: 5,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Query elements by accessible role (`getByRole("button", { name: /save/i })`) rather than fragile CSS class names.',
        'Manage focus restoration and Escape-key dismissal cleanly in modal dialogs.',
      ],
      prerequisites: ['Lesson 4'],
      detailedExplanation:
        'Good component tests verify observable behavior—what users see and click—rather than internal hook implementation details. Querying by ARIA role (`button`, `textbox`, `alert`) automatically validates your markup accessibility at the same time!',
      conceptsAndTerminology: [
        { term: 'User-Centric Query', definition: 'Selecting interactive controls via accessible label/role rather than `.btn-primary` CSS classes.' },
      ],
      stepByStepTeaching: [
        'Ensure buttons have explicit visible text or `aria-label` so both screen readers and test queries find them reliably.',
        'Bind `Escape` key closing inside dialog `useEffect` listeners and clean up on unmount.',
      ],
      syntaxAndUsage: [
        'Attach `role="dialog"` and `aria-modal="true"` to modal overlays.',
      ],
      practicalExampleNarrative:
        'Accessible modal wrapper handling Escape-key dismissal cleanly.',
      codeExamples: [
        {
          title: 'Keyboard-Accessible Modal Dialog Effect',
          description: 'Closes cleanly on Escape and removes the listener on unmount.',
          language: 'javascript',
          code: `function AccessibleModal({ open, title, onClose, children }) {\n  React.useEffect(() => {\n    if (!open) return;\n    const onKey = (e) => { if (e.key === 'Escape') onClose(); };\n    window.addEventListener('keydown', onKey);\n    return () => window.removeEventListener('keydown', onKey);\n  }, [open, onClose]);\n\n  if (!open) return null;\n  return <div role="dialog" aria-modal="true" aria-label={title}>{children}</div>;\n}`,
          expectedOutput: 'Renders modal accessible dialog and dismisses cleanly when pressing Escape.',
          explanation: 'Cleaning up `keydown` inside `useEffect` guarantees zero leaked window listeners.',
        },
      ],
      commonMistakes: [
        'Forgetting `if (!open) return;` inside the `useEffect` hook before registering global window listeners.',
      ],
      bestPractices: [
        'Keep tests focused on user workflows (filter -> submit -> verify error/success banner).',
      ],
      practicalActivity:
        'Add an `aria-label` and Escape listener to an interactive preview drawer.',
      starterCode: `function PreviewDrawer({ open, onClose }) { /* bind Escape */ }`,
      solutionHint: 'Guard `if (!open) return;` then add & remove `keydown` listener.',
      knowledgeChecks: [
        'Why is querying by `role="button"` preferable to querying `.css-xyz-class` in UI tests?',
      ],
      summaryPoints: [
        'Accessible semantic roles improve both real assistive users and test resilience.',
      ],
      furtherResources: ['Testing Library Guiding Principles'],
    },

    // ======================= TYPESCRIPT =======================
    {
      id: 'les_ts_2',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_2',
      title: 'Generics, Utility Types (`Pick`, `Omit`, `Partial`) & Contracts',
      slug: 'typescript-generics-utility-types',
      topicName: 'Generics & Utility Types',
      summary: 'Write reusable type-safe containers and API wrappers using generic `<T>` type parameters, constraints (`extends`), and built-in TypeScript utility transformations.',
      language: 'typescript',
      accessTier: 'free',
      durationMinutes: 22,
      sortOrder: 2,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Eliminate `any` by parameterizing functions and interfaces with generics `<T>`.',
        'Constrain generic type parameters via `T extends { id: string }` so shared properties stay strongly typed.',
        'Derive Create/Update DTOs cleanly from domain interfaces using `Omit<T, "id">`, `Pick<T, ...>`, and `Partial<T>`.',
      ],
      prerequisites: ['Discriminated Unions & Exhaustive Type Guards (Lesson 1)'],
      detailedExplanation:
        'Returning `any` from a reusable wrapper throws away TypeScript’s entire static verification net. **Generics** act like type-level parameters: `function wrapApiResult<T>(data: T): { ok: true; data: T }` preserves the exact caller type automatically without duplicate interfaces.\n\nLikewise, instead of duplicating `User`, `CreateUserInput`, and `UpdateUserPatch` by hand, TypeScript’s utility types (`Omit`, `Pick`, `Partial`, `Readonly`, `Record<K, V>`) derive safe variations from one canonical domain model so schema edits propagate across your entire codebase.',
      conceptsAndTerminology: [
        { term: 'Generic Parameter `<T>`', definition: 'Type variable captured dynamically at the call site to preserve concrete type information.' },
        { term: 'Generic Constraint (`extends`)', definition: 'Requires `T` to expose specific guaranteed members (`T extends { id: string }`).' },
        { term: 'Omit<T, Keys> / Pick<T, Keys>', definition: 'Creates derived object types by excluding or selecting specific keys from `T`.' },
      ],
      stepByStepTeaching: [
        'Replace `payload: any` helpers with `<T>(payload: T)` generic functions.',
        'Derive form-create payloads via `Omit<Course, "id" | "createdAt">` and patch payloads via `Partial<...>`.',
        'Use `Record<CoverageStatus, string>` so missing enum badge entries fail compilation immediately.',
      ],
      syntaxAndUsage: [
        '`function indexById<T extends { id: string }>(items: T[]): Record<string, T>` works cleanly on any entity carrying `.id`.',
      ],
      practicalExampleNarrative:
        'A type-safe pagination envelope and entity indexer leveraging generic constraints and `Omit`/`Partial`.',
      codeExamples: [
        {
          title: 'Constrained Generic Indexer & Derived DTO Types',
          description: 'Builds a lookup map over any object with `id: string` and derives safe create/patch DTOs.',
          language: 'typescript',
          code: `interface Course {\n  id: string;\n  title: string;\n  hours: number;\n}\n\ntype NewCourseInput = Omit<Course, 'id'>;\ntype CoursePatch = Partial<NewCourseInput>;\n\nfunction indexById<T extends { id: string }>(rows: readonly T[]): Record<string, T> {\n  const map: Record<string, T> = {};\n  for (const row of rows) map[row.id] = row;\n  return map;\n}\n\nconst indexed = indexById<Course>([{ id: 'crs_ts', title: 'TypeScript', hours: 14 }]);\nconsole.log(indexed['crs_ts']?.title);`,
          expectedOutput: `TypeScript`,
          explanation: '`indexById` guarantees `.id` exists at compile time and preserves every `Course` field on `indexed["crs_ts"]`.',
        },
      ],
      commonMistakes: [
        'Writing `<T>(x: any): T` inside helpers—silently bypassing type safety instead of verifying types.',
        'Using `{}` or `object` instead of `Record<string, unknown>` for arbitrary dictionaries.',
      ],
      bestPractices: [
        'Define one canonical entity interface and derive request/patch types with `Pick`, `Omit`, and `Partial`.',
      ],
      practicalActivity:
        'Write a generic `paginate<T>(items: readonly T[], page: number, pageSize: number)` returning `{ rows: T[]; total: number; page: number }`.',
      starterCode: `function paginate<T>(items: readonly T[], page: number, size: number) {\n  // Slice and return typed pagination result\n}`,
      solutionHint: 'Compute `const start = page * size; return { rows: items.slice(start, start + size), total: items.length, page };`.',
      knowledgeChecks: [
        'What is the difference between `Omit<User, "passwordHash">` and `Pick<User, "id" | "email">`?',
        'Why does `<T extends { id: string }>` prevent accessing non-existent fields inside the helper?',
      ],
      summaryPoints: [
        'Generics and utility types keep domain contracts single-sourced without sacrificing strictness.',
      ],
      furtherResources: ['TypeScript Handbook — Generics & Utility Types'],
    },
    {
      id: 'les_ts_3',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_3',
      title: 'Safe Error Narrowing with `unknown` & User-Defined Type Guards',
      slug: 'typescript-unknown-narrowing-type-guards',
      topicName: 'unknown & Type Predicates',
      summary: 'Replace unsafe `any` catches with `unknown`, narrow unknown API payloads safely using type predicates (`x is User`), and type async Promises accurately.',
      language: 'typescript',
      accessTier: 'free',
      durationMinutes: 20,
      sortOrder: 3,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Handle `catch (err: unknown)` safely via `err instanceof Error` narrowing.',
        'Author user-defined type predicates (`function isApiError(x: unknown): x is ApiErrorPayload`) for untrusted JSON responses.',
        'Annotate async functions explicitly with `Promise<T>` return types.',
      ],
      prerequisites: ['Lesson 1 & Lesson 2'],
      detailedExplanation:
        'At network and `JSON.parse()` boundaries, TypeScript cannot verify runtime shapes automatically—forcing `as MyType` casts hides crashes until production! Instead, treat external inputs as `unknown` (TypeScript’s type-safe counterpart to `any`), validate their shape at runtime using narrowing checks or **type predicate functions** (`value is ExpectedType`), and let TypeScript refine the type in subsequent branches.',
      conceptsAndTerminology: [
        { term: 'unknown', definition: 'Top type forbidding property access until narrowed via `typeof`, `instanceof`, or type guards.' },
        { term: 'Type Predicate (`val is T`)', definition: 'Boolean function signature narrowing `val` to `T` inside caller `if` blocks.' },
      ],
      stepByStepTeaching: [
        'Treat `JSON.parse()` outputs as `unknown` instead of `any`.',
        'Write a runtime guard checking `typeof x === "object" && x !== null && "title" in x`.',
        'Narrow caught errors safely: `const msg = err instanceof Error ? err.message : String(err);`.',
      ],
      syntaxAndUsage: [
        'Enable `"useUnknownInCatchVariables": true` (default in TypeScript `strict: true`).',
      ],
      practicalExampleNarrative:
        'Validating untrusted JSON webhook data safely with a runtime type guard.',
      codeExamples: [
        {
          title: 'Runtime Type Predicate Guard on Unknown JSON',
          description: 'Safely narrows an unknown parsed payload before accessing `.slug`.',
          language: 'typescript',
          code: `interface TechPayload {\n  id: string;\n  slug: string;\n}\n\nfunction isTechPayload(val: unknown): val is TechPayload {\n  return (\n    typeof val === 'object' &&\n    val !== null &&\n    typeof (val as Record<string, unknown>).id === 'string' &&\n    typeof (val as Record<string, unknown>).slug === 'string'\n  );\n}\n\nconst raw: unknown = JSON.parse('{"id":"tech_ts","slug":"typescript"}');\nif (isTechPayload(raw)) {\n  console.log('Verified slug:', raw.slug.toUpperCase());\n}`,
          expectedOutput: `Verified slug: TYPESCRIPT`,
          explanation: 'If `raw` lacked `.slug`, `isTechPayload(raw)` cleanly returns `false` instead of throwing `TypeError: Cannot read properties of undefined`.',
        },
      ],
      commonMistakes: [
        'Casting `JSON.parse(str) as User` without validating required runtime keys.',
        'Accessing `err.message` directly inside `catch (err)` without checking `err instanceof Error`.',
      ],
      bestPractices: [
        'Always prefer `unknown` over `any` at API, localStorage, and JSON boundaries.',
      ],
      practicalActivity:
        'Implement `extractErrorMessage(err: unknown): string` handling `Error` instances, `{ error: string }` objects, and fallback strings.',
      starterCode: `function extractErrorMessage(err: unknown): string {\n  // Narrow err safely\n  return 'Unknown error';\n}`,
      solutionHint: 'Check `if (err instanceof Error) return err.message;`.',
      knowledgeChecks: [
        'Why is `unknown` safer than `any` when parsing untrusted JSON?',
      ],
      summaryPoints: [
        '`unknown` + runtime type guards catch malformed boundary data before runtime crashes occur.',
      ],
      furtherResources: ['TypeScript Handbook — Narrowing'],
    },
    {
      id: 'les_ts_4',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_4',
      title: 'Typed Reusable Components & End-to-End API Client Contracts',
      slug: 'typescript-reusable-components-api-contracts',
      topicName: 'Typed Components & API Contracts',
      summary: 'Share request/response TypeScript types across UI forms, reusable table components, and typed `api.get<T>()` wrappers.',
      language: 'typescript',
      accessTier: 'premium',
      durationMinutes: 24,
      sortOrder: 4,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Design generic reusable UI components (`DataTable<T>`) accepting typed columns and row accessors.',
        'Pair typed Express response DTOs with generic client fetch methods (`requestJson<Res>()`).',
      ],
      prerequisites: ['Lesson 2 & Lesson 3'],
      detailedExplanation:
        'Full-stack TypeScript shines brightest when UI components and server endpoints agree on exact contracts. A generic `<DataTable<T> rows={rows} columns={...} />` component lets callers declare `key: keyof T` or typed `render(row: T)` cells—turning misspelled column keys (`row.complteness` instead of `row.completeness`) into immediate red squiggles at edit time rather than silent blank table columns in production.',
      conceptsAndTerminology: [
        { term: 'Indexed Access (`keyof T`)', definition: 'Union of all valid property keys on interface `T`, preventing typo bugs in column definitions.' },
      ],
      stepByStepTeaching: [
        'Define `interface ColumnDef<T> { header: string; accessor: keyof T; }`.',
        'Annotate typed API response shapes alongside `fetchJson<T>(url)`.',
      ],
      syntaxAndUsage: [
        'Use `readonly T[]` on component input arrays so components never mutate caller state accidentally.',
      ],
      practicalExampleNarrative:
        'A compile-time checked generic table column schema and typed API fetch helper.',
      codeExamples: [
        {
          title: 'Keyof-Checked Generic Table Columns & Typed Fetch',
          description: 'Prevents misspelled property names across table configurations.',
          language: 'typescript',
          code: `interface TechSummary {\n  id: string;\n  name: string;\n  score: number;\n}\n\ninterface ColumnSpec<T> {\n  label: string;\n  field: keyof T;\n}\n\nconst columns: ColumnSpec<TechSummary>[] = [\n  { label: 'Technology', field: 'name' },\n  { label: 'Completeness %', field: 'score' },\n];\n\nconst sampleRow: TechSummary = { id: 'tech_ts', name: 'TypeScript', score: 88 };\nconsole.log(columns.map((c) => \`\${c.label}: \${String(sampleRow[c.field])}\`).join(' | '));`,
          expectedOutput: `Technology: TypeScript | Completeness %: 88`,
          explanation: 'Using `field: keyof TechSummary` enforces at compile time that every column key actually exists on `TechSummary`.',
        },
      ],
      commonMistakes: [
        'Typing reusable UI component callbacks with `(row: any) => ...`, losing autocomplete and refactor safety.',
      ],
      bestPractices: [
        'Keep shared API payload types centralized (`src/types.ts`) so pages and components import identical contracts.',
      ],
      practicalActivity:
        'Add an optional `format?: (val: T[keyof T], row: T) => string` formatter to `ColumnSpec<T>`.',
      starterCode: `interface ColumnSpec<T> { label: string; field: keyof T; }`,
      solutionHint: 'Use `row: T` inside `render?: (row: T) => string`.',
      knowledgeChecks: [
        'What compile-time safeguard does `field: keyof T` provide inside a reusable table component?',
      ],
      summaryPoints: [
        'Generic components (`keyof T`) and typed API helpers propagate refactoring safety end-to-end.',
      ],
      furtherResources: ['TypeScript Handbook — Indexed Access & Keyof'],
    },
    {
      id: 'les_ts_5',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_4',
      title: 'Strict Configuration (`tsconfig.json`), Mapped Types & Production Readiness',
      slug: 'typescript-strict-config-mapped-types',
      topicName: 'Strict Config & Mapped Types',
      summary: 'Configure strict TypeScript compiler flags (`strictNullChecks`, `noUncheckedIndexedAccess`), build status maps via `Record`, and eliminate implicit `any` leaks.',
      language: 'typescript',
      accessTier: 'free',
      durationMinutes: 18,
      sortOrder: 5,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Explain why `noUncheckedIndexedAccess` catches out-of-bounds array/dictionary lookups cleanly.',
        'Exhaustively map union types using `Record<MyUnion, Metadata>`.',
      ],
      prerequisites: ['Lesson 4'],
      detailedExplanation:
        'Without `strictNullChecks`, TypeScript lets `null` or `undefined` masquerade as valid strings or objects—leading to classic `Cannot read properties of undefined` crashes. Enabling `"strict": true` turns nullability into an explicit compiler-checked contract.\n\nPair this with `Record<UnionType, Config>` so adding a new status variant (`"archived"`) immediately flags every switch/badge map missing a configuration entry.',
      conceptsAndTerminology: [
        { term: 'strictNullChecks', definition: 'Prevents `null` and `undefined` from being assigned to non-nullable types implicitly.' },
        { term: 'Record<K, V>', definition: 'Built-in mapped dictionary enforcing keys matching union `K`.' },
      ],
      stepByStepTeaching: [
        'Keep `"strict": true` enabled in `tsconfig.json`.',
        'Replace switch-case badge lookups with `const BADGES: Record<Status, string>`.',
      ],
      syntaxAndUsage: [
        'Run `npx tsc --noEmit` in CI scripts to fail builds on any type error even when bundlers ignore types.',
      ],
      practicalExampleNarrative:
        'Exhaustive `Record<Difficulty, number>` XP multiplier mapping.',
      codeExamples: [
        {
          title: 'Exhaustive Union Mapping with Record<K, V>',
          description: 'Forces every union member to define an explicit multiplier.',
          language: 'typescript',
          code: `type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';\n\nconst XP_MULTIPLIER: Record<Difficulty, number> = {\n  Beginner: 1,\n  Intermediate: 1.5,\n  Advanced: 2,\n};\n\nfunction computeXp(base: number, level: Difficulty): number {\n  return Math.round(base * XP_MULTIPLIER[level]);\n}\n\nconsole.log(computeXp(40, 'Advanced'));`,
          expectedOutput: `80`,
          explanation: 'Adding `"Expert"` to `Difficulty` without updating `XP_MULTIPLIER` fails `tsc --noEmit` immediately.',
        },
      ],
      commonMistakes: [
        'Suppressing compiler errors with `@ts-ignore` instead of fixing the underlying nullable check.',
      ],
      bestPractices: [
        'Run `tsc --noEmit` alongside builds before shipping.',
      ],
      practicalActivity:
        'Define `type WorkflowState = "draft" | "review" | "published"` and an exhaustive `Record<WorkflowState, string>` badge label dictionary.',
      starterCode: `type WorkflowState = 'draft' | 'review' | 'published';`,
      solutionHint: 'Assign `{ draft: "...", review: "...", published: "..." }` typed as `Record<WorkflowState, string>`.',
      knowledgeChecks: [
        'Why should `npx tsc --noEmit` be run alongside Vite bundling?',
      ],
      summaryPoints: [
        'Strict compiler flags and `Record<Union, ...>` turn forgotten status branches into compile errors.',
      ],
      furtherResources: ['TypeScript TSConfig Reference'],
    },
  ],

  exercises: [
    // Python Exercise Module 3
    {
      id: 'ex_py_sqlite_5',
      courseId: 'crs_python',
      moduleId: 'mod_py_3',
      lessonId: 'les_py_7',
      technologyId: 'tech_python',
      title: 'Fix Unescaped Single-Value SQLite Tuple',
      exerciseType: 'find_error',
      difficulty: 'Intermediate',
      prompt: 'Why does `conn.execute("SELECT * FROM students WHERE name = ?", ("Ada"))` raise `sqlite3.ProgrammingError`?',
      starterCode: 'conn.execute("SELECT * FROM students WHERE name = ?", ("Ada",))',
      options: [
        '("Ada") evaluates to a plain string instead of a 1-element tuple — it needs a trailing comma: ("Ada",)',
        'SQLite requires double quotes around column names',
        'Placeholder must be `$1` instead of `?`',
        'Memory databases cannot filter by string columns',
      ],
      correctAnswer: '("Ada") evaluates to a plain string instead of a 1-element tuple — it needs a trailing comma: ("Ada",)',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'In Python, parentheses around a single value `("Ada")` are just grouping; adding the comma `("Ada",)` creates a 1-item tuple.',
      hintText: 'How does Python distinguish a grouped string from a 1-element tuple?',
      xpReward: 30,
      sortOrder: 5,
    },
    {
      id: 'ex_py_dc_6',
      courseId: 'crs_python',
      moduleId: 'mod_py_4',
      lessonId: 'les_py_8',
      technologyId: 'tech_python',
      title: 'Safe Mutable Default in Python Dataclasses',
      exerciseType: 'code_completion',
      difficulty: 'Intermediate',
      prompt: 'Complete the dataclass field declaration so each student instance gets its own empty `scores` list:\n`scores: list[int] = ______(default_factory=list)`',
      starterCode: 'from dataclasses import dataclass, field\n@dataclass\nclass Student:\n    scores: list[int] = ______(default_factory=list)',
      options: ['field', 'list', 'default', 'copy'],
      correctAnswer: 'field',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`dataclasses.field(default_factory=list)` instantiates a fresh list per instance.',
      hintText: 'Imported right alongside `dataclass` from `dataclasses`.',
      xpReward: 30,
      sortOrder: 6,
    },

    // React Exercises
    {
      id: 'ex_react_tf_2',
      courseId: 'crs_react',
      moduleId: 'mod_react_2',
      lessonId: 'les_react_2',
      technologyId: 'tech_react',
      title: 'Array Index as List Key Safety',
      exerciseType: 'true_false',
      difficulty: 'Beginner',
      prompt: 'True or False: Using the array `index` as React’s `key` prop is always safe even when users filter, reorder, or delete rows containing inputs.',
      starterCode: '',
      options: ['True', 'False'],
      correctAnswer: 'False',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'When array positions shift on deletion or sorting, index keys cause React to bind old DOM/component state onto the wrong item.',
      hintText: 'Think about what happens to index 0 if the first row is deleted.',
      xpReward: 25,
      sortOrder: 2,
    },
    {
      id: 'ex_react_comp_3',
      courseId: 'crs_react',
      moduleId: 'mod_react_3',
      lessonId: 'les_react_3',
      technologyId: 'tech_react',
      title: 'Cancel Stale Fetch Requests in useEffect',
      exerciseType: 'code_completion',
      difficulty: 'Intermediate',
      prompt: 'Complete the `useEffect` cleanup line to abort obsolete HTTP requests when dependencies change:\n`return () => controller.______();`',
      starterCode: 'const controller = new AbortController();\nfetch(url, { signal: controller.signal });\nreturn () => controller.______();',
      options: ['abort', 'cancel', 'close', 'stop'],
      correctAnswer: 'abort',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Calling `controller.abort()` cancels the underlying `fetch` promise via its linked `AbortSignal`.',
      hintText: 'Matches the first word of `AbortController`.',
      xpReward: 30,
      sortOrder: 3,
    },
    {
      id: 'ex_react_write_4',
      courseId: 'crs_react',
      moduleId: 'mod_react_4',
      lessonId: 'les_react_4',
      technologyId: 'tech_react',
      title: 'Memoize Derived Dashboard Totals',
      exerciseType: 'write_code',
      difficulty: 'Intermediate',
      prompt: 'Use `React.useMemo` to derive `publishedCount` from a `courses` array dependency so unrelated UI state updates skip recalculation.',
      starterCode: 'const publishedCount = React.useMemo(\n  () => courses.filter(c => c.published).length,\n  [courses]\n);',
      options: [],
      correctAnswer: 'React.useMemo(() => courses.filter(c => c.published).length, [courses])',
      validationRule: { mode: 'contains_tokens', tokens: ['useMemo', 'courses', 'filter'] },
      explanation: 'Passing `[courses]` as the dependency array recalculates only when `courses` reference updates.',
      hintText: 'Wrap the `.filter(...)` call inside `useMemo(..., [courses])`.',
      xpReward: 35,
      sortOrder: 4,
    },

    // TypeScript Exercises
    {
      id: 'ex_ts_mc_1',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_2',
      lessonId: 'les_ts_2',
      technologyId: 'tech_ts_std',
      title: 'Derive Create Payload Without Server ID',
      exerciseType: 'multiple_choice',
      difficulty: 'Beginner',
      prompt: 'Given `interface Lesson { id: string; title: string; minutes: number; }`, which TypeScript utility produces `{ title: string; minutes: number }`?',
      starterCode: '',
      options: [
        'Omit<Lesson, "id">',
        'Partial<Lesson>',
        'Record<"id", Lesson>',
        'Exclude<Lesson, "id">',
      ],
      correctAnswer: 'Omit<Lesson, "id">',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`Omit<T, K>` removes object property `K` from interface `T` cleanly (`Exclude` operates on union members, not object properties).',
      hintText: 'Look for the utility specifically designed to omit object keys.',
      xpReward: 25,
      sortOrder: 1,
    },
    {
      id: 'ex_ts_err_2',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_3',
      lessonId: 'les_ts_3',
      technologyId: 'tech_ts_std',
      title: 'Fix Unsafe Error Property Access in Catch Block',
      exerciseType: 'find_error',
      difficulty: 'Intermediate',
      prompt: 'Under strict TypeScript, `catch (err) { return err.message; }` fails compilation because `err` is `unknown`. How do you narrow it cleanly?',
      starterCode: 'try { run(); } catch (err: unknown) {\n  return err instanceof Error ? err.message : String(err);\n}',
      options: [
        'Narrow with `err instanceof Error ? err.message : String(err)`',
        'Disable TypeScript strict mode across the project',
        'Replace `catch` with `finally`',
        'Write `err.toString().message`',
      ],
      correctAnswer: 'Narrow with `err instanceof Error ? err.message : String(err)`',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Checking `instanceof Error` proves to the compiler that `.message` exists safely at runtime.',
      hintText: 'Check the standard JS runtime class check.',
      xpReward: 30,
      sortOrder: 2,
    },
    {
      id: 'ex_ts_write_3',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_4',
      lessonId: 'les_ts_4',
      technologyId: 'tech_ts_std',
      title: 'Write a Constrained Generic Entity Finder',
      exerciseType: 'write_code',
      difficulty: 'Intermediate',
      prompt: 'Write `findById<T extends { id: string }>(items: readonly T[], id: string): T | undefined` returning the matched element.',
      starterCode: 'function findById<T extends { id: string }>(items: readonly T[], id: string): T | undefined {\n  return items.find(item => item.id === id);\n}',
      options: [],
      correctAnswer: 'return items.find(item => item.id === id);',
      validationRule: { mode: 'contains_tokens', tokens: ['extends', 'id', 'find'] },
      explanation: 'Constraining `T extends { id: string }` ensures `item.id` is type-checked while returning the exact caller item type `T`.',
      hintText: 'Add `<T extends { id: string }>` and call `items.find(...)`.',
      xpReward: 35,
      sortOrder: 3,
    },
  ],

  assessments: [
    {
      id: 'asm_py_adv_quiz',
      courseId: 'crs_python',
      lessonId: 'les_py_7',
      title: 'Python Databases, Dataclasses & Testing Assessment',
      xpReward: 120,
      questions: [
        {
          id: 'py_adv_q1',
          kind: 'multiple_choice',
          prompt: 'Which SQLite Python pattern blocks SQL injection when querying by user email?',
          options: [
            'conn.execute("SELECT * FROM users WHERE email = ?", (email,))',
            'conn.execute(f"SELECT * FROM users WHERE email = \'{email}\'")',
            'conn.execute("SELECT * FROM users WHERE email = " + email)',
            'conn.executescript(email)',
          ],
          correctAnswer: 'conn.execute("SELECT * FROM users WHERE email = ?", (email,))',
          explanation: 'Parameterized `?` bindings keep untrusted values cleanly separated from SQL syntax.',
        },
        {
          id: 'py_adv_q2',
          kind: 'true_false',
          prompt: 'True or False: Declaring `items: list[str] = []` directly inside a Python `@dataclass` is valid without `field(default_factory=list)`.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Python raises `ValueError: mutable default <class \'list\'>` unless `field(default_factory=list)` is used.',
        },
      ],
    },
    {
      id: 'asm_react_quiz',
      courseId: 'crs_react',
      lessonId: 'les_react_2',
      title: 'React Component State, Hooks & Fetching Assessment',
      xpReward: 120,
      questions: [
        {
          id: 'rct_q1',
          kind: 'multiple_choice',
          prompt: 'Which mechanism cancels stale in-flight `fetch()` calls when search query props change inside `useEffect`?',
          options: ['AbortController cleanup function', 'Calling setState twice', 'Using var instead of const', 'Passing index as key'],
          correctAnswer: 'AbortController cleanup function',
          explanation: 'Passing `controller.signal` and calling `controller.abort()` in cleanup prevents older responses overwriting newer UI state.',
        },
        {
          id: 'rct_q2',
          kind: 'true_false',
          prompt: 'True or False: React hooks may be called inside conditional `if (...)` statements as long as they run before `return`.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'The Rules of Hooks require calling hooks unconditionally in the exact same order on every render.',
        },
        {
          id: 'rct_q3',
          kind: 'multiple_choice',
          prompt: 'What is the best value to pass as the `key` prop when mapping editable task items?',
          options: ['Stable unique database/entity ID (`task.id`)', 'Array index (`idx`)', '`Math.random()` inside render', 'The mutable title text'],
          correctAnswer: 'Stable unique database/entity ID (`task.id`)',
          explanation: '`Math.random()` remounts DOM nodes every render, and array indices drift on reordering/deletion.',
        },
      ],
    },
    {
      id: 'asm_ts_quiz',
      courseId: 'crs_typescript',
      lessonId: 'les_ts_2',
      title: 'TypeScript Generics, Narrowing & Strict Contracts Assessment',
      xpReward: 120,
      questions: [
        {
          id: 'ts_q1',
          kind: 'multiple_choice',
          prompt: 'Which TypeScript type forces you to narrow an external payload before reading properties?',
          options: ['unknown', 'any', 'Function', 'Object'],
          correctAnswer: 'unknown',
          explanation: '`unknown` disallows property reads until narrowed via `typeof`, `instanceof`, or type predicates.',
        },
        {
          id: 'ts_q2',
          kind: 'multiple_choice',
          prompt: 'Which utility type creates a dictionary requiring keys for EVERY member of union `type Tab = "home" | "courses"`?',
          options: ['Record<Tab, string>', 'Partial<Tab>', 'Pick<Tab, "home">', 'Omit<Tab, "home">'],
          correctAnswer: 'Record<Tab, string>',
          explanation: '`Record<K, V>` checks exhaustively that every union key in `K` is mapped.',
        },
        {
          id: 'ts_q3',
          kind: 'true_false',
          prompt: 'True or False: A discriminated union switch helper checking `const _exhaustive: never = value;` helps catch unhandled union cases at compile time.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Assigning an unhandled union branch to `never` causes a TypeScript compiler error immediately.',
        },
      ],
    },
  ],

  assignments: [
    {
      id: 'asn_react_dashboard',
      courseId: 'crs_react',
      moduleId: 'mod_react_3',
      technologyId: 'tech_react',
      title: 'Race-Safe Searchable Course Filter & Progress Tracker',
      description: 'Build a React dashboard view combining `useDebouncedValue`, `AbortController` fetch cleanup, and derived progress KPIs.',
      instructionsMarkdown:
        '### Assignment Brief\n\nImplement a searchable catalog panel that debounces query input cleanly, aborts superseded requests on unmount/re-query, and calculates total completed % directly during render.',
      requirements: [
        'Use stable entity IDs as `key` props.',
        'Include an `AbortController` cleanup inside `useEffect`.',
        'Derive completion percentage inline without duplicating derived state.',
      ],
      starterFiles: {
        'Dashboard.tsx': 'export function CourseTracker({ items }: { items: Array<{ id: string; title: string; done: boolean }> }) {\n  return <div>{/* Render keyed list + derived progress */}</div>;\n}\n',
      },
      rubric: ['Hooks & Effect Hygiene (40%)', 'Derived State Purity (30%)', 'Accessible Markup & Keys (30%)'],
      difficulty: 'Intermediate',
      xpReward: 160,
    },
    {
      id: 'asn_ts_typed_store',
      courseId: 'crs_typescript',
      moduleId: 'mod_ts_3',
      technologyId: 'tech_ts_std',
      title: 'Strictly Typed Result Union & Generic Cache Module',
      description: 'Author a zero-`any` TypeScript utility module with discriminated `ApiResult<T>`, constrained `indexById<T>`, and runtime type predicates.',
      instructionsMarkdown:
        '### Assignment Brief\n\nWrite a TypeScript module passing `tsc --noEmit` with strict mode enabled—implementing `ApiResult<T>`, a safe `parsePayload(raw: unknown)` predicate, and generic entity indexing.',
      requirements: [
        'Zero usages of `any` or `@ts-ignore`.',
        'Include at least one `val is ...` runtime type predicate.',
        'Use `Omit` or `Partial` for update inputs.',
      ],
      starterFiles: {
        'contracts.ts': 'export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };\n',
      },
      rubric: ['Strict Type Safety (40%)', 'Runtime Narrowing Accuracy (35%)', 'Generic Design (25%)'],
      difficulty: 'Intermediate',
      xpReward: 160,
    },
  ],

  projects: [
    {
      id: 'ptpl_py_student_mgmt',
      technologyId: 'tech_python',
      learningPathId: 'path_python_dev',
      courseId: 'crs_python',
      title: 'Python: File-Based Student Management & Grade Analytics App',
      slug: 'python-file-student-management-app',
      category: 'Python Project',
      difficulty: 'Intermediate',
      estimatedHours: 10,
      summary:
        'Build a persistent CLI/SQLite student management application supporting student registration, score updates, JSON/CSV roster persistence via `pathlib`, cohort analytics, and `pytest` unit coverage.',
      requirements: [
        'Milestone 1: Model `StudentRecord` using `@dataclass` with field validation (`0..100` score bounds).',
        'Milestone 2: Save and reload student rosters atomically via `pathlib.Path` + JSON and/or parameterized `sqlite3` queries.',
        'Milestone 3: Produce cohort pass-rate/distinction summary reports handling empty/missing file exceptions gracefully.',
        'Acceptance Criteria: Includes passing `pytest` assertions covering happy paths and `ValueError`/`FileNotFoundError`.',
        'Submission & Rubric: Submit Python source + test suite; graded on Data Modeling & Typing (30%), File/DB Safety (35%), Test & Exception Resilience (35%).',
      ],
      starterFiles: {
        'README.md':
          '# Project: Python Student Management Application\n\n## Milestones\n1. Implement `StudentRecord` dataclass with validation.\n2. Persist records safely with `pathlib` / `sqlite3`.\n3. Verify edge cases via `pytest`.\n\n## Rubric\n- Typing & Dataclass Design: 30%\n- File / SQLite Safety: 35%\n- Exception Handling & Tests: 35%',
        'student_manager.py':
          'from dataclasses import dataclass, field, asdict\nfrom pathlib import Path\nimport json\n\n@dataclass\nclass StudentRecord:\n    student_id: str\n    full_name: str\n    scores: list[int] = field(default_factory=list)\n\n    def average(self) -> float:\n        return round(sum(self.scores) / len(self.scores), 2) if self.scores else 0.0\n\ndef save_roster(path: Path, students: list[StudentRecord]) -> None:\n    path.write_text(json.dumps([asdict(s) for s in students], indent=2), encoding="utf-8")\n',
      },
      deliverables: ['`student_manager.py` module', '`test_student_manager.py` unit suite', 'Sample JSON roster output'],
    },
    {
      id: 'ptpl_ts_reusable_ui',
      technologyId: 'tech_ts_std',
      learningPathId: 'path_frontend',
      courseId: 'crs_typescript',
      title: 'TypeScript: Typed Component Library & API Contract Kit',
      slug: 'typescript-typed-reusable-components-app',
      category: 'TypeScript Project',
      difficulty: 'Intermediate to Advanced',
      estimatedHours: 10,
      summary:
        'Build a zero-`any` TypeScript domain kit featuring constrained generic data tables, discriminated `ApiResult<T>` state machines, runtime JSON validators, and exhaustive `Record` status mappers.',
      requirements: [
        'Milestone 1: Strict domain contracts (`Course`, `Lesson`, `ApiResult<T>`) using `Omit` / `Partial` DTOs.',
        'Milestone 2: Runtime `unknown` validators with user-defined type predicates (`x is Course`).',
        'Milestone 3: Generic `ColumnSpec<T>` table formatter keyed by `keyof T` + `Record` badge mapper.',
        'Acceptance Criteria: Passes `tsc --noEmit` cleanly with `"strict": true`.',
        'Submission & Rubric: Submit TypeScript sources; graded on Strictness & Zero-Any (35%), Generic Reusability (35%), Runtime Guard Safety (30%).',
      ],
      starterFiles: {
        'README.md':
          '# Project: Typed Application with Reusable Components\n\n## Milestones\n1. Model DTOs cleanly with Omit/Partial.\n2. Guard external JSON using type predicates.\n3. Render a `keyof T`-checked table formatter.',
        'kit.ts':
          'export type Result<T> = { ok: true; data: T } | { ok: false; error: string };\nexport interface TableColumn<T> { label: string; key: keyof T; }\n',
      },
      deliverables: ['Strict TypeScript source files', 'Passing `tsc --noEmit` verification notes'],
    },
  ],
};
