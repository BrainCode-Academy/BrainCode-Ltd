import type { DatabaseSync } from 'node:sqlite';
import { formatSubstantiveLessonMarkdown, type RichLessonSpec } from './curriculum_priority10_types.ts';

interface DraftTrackSeed {
  courseId: string;
  techId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  objectives: string[];
  prerequisites: string[];
  language: string;
  modules: Array<{ id: string; title: string; topic: string; sortOrder: number }>;
  lessons: Array<{
    id: string;
    moduleId: string;
    title: string;
    slug: string;
    topicName: string;
    summary: string;
    conceptOverview: string;
    detailedExplanation: string;
    concepts: Array<{ term: string; definition: string }>;
    steps: string[];
    codeTitle: string;
    code: string;
    expectedOutput: string;
    mistakes: string[];
    bestPractices: string[];
    practicalActivity: string;
    starterCode: string;
    solutionHint: string;
    sortOrder: number;
  }>;
  exercises: Array<{
    id: string;
    moduleId: string;
    lessonId: string;
    title: string;
    exerciseType: string;
    difficulty: string;
    prompt: string;
    starterCode: string;
    options: string[];
    correctAnswer: string;
    validationRule: Record<string, unknown>;
    explanation: string;
    hintText: string;
    sortOrder: number;
  }>;
  assessment: {
    id: string;
    title: string;
    questions: Array<{
      id: string;
      kind: string;
      prompt: string;
      options?: string[];
      correctAnswer: string;
      explanation: string;
    }>;
  };
  assignment: {
    id: string;
    title: string;
    description: string;
    instructionsMarkdown: string;
    requirements: string[];
    starterFiles: Record<string, string>;
    rubric: Array<{ criterion: string; points: number }>;
  };
  projectTemplate: {
    id: string;
    title: string;
    slug: string;
    category: string;
    difficulty: string;
    estimatedHours: number;
    summary: string;
    learningOutcomes: string[];
    requirements: string[];
    milestones: Array<{ step: number; title: string; summary: string }>;
    checklist: string[];
    rubric: Array<{ criterion: string; points: number }>;
    deliverables: string[];
    submissionInstructions: string;
    starterFiles: Record<string, string>;
  };
}

const COURSE_PREREQUISITES_BACKFILL: Array<[string, string[]]> = [
  ['crs_html', ['Basic computer file navigation', 'Any modern desktop web browser']],
  ['crs_css', ['Basic HTML element and attribute familiarity']],
  ['crs_js', ['Foundational HTML and CSS structure knowledge']],
  ['crs_python', ['Basic logical problem-solving skills; no prior programming experience required']],
  ['crs_react', ['Solid JavaScript ES6+ fundamentals (functions, arrays, objects, promises)', 'Basic HTML & CSS layout familiarity']],
  ['crs_typescript', ['Intermediate JavaScript knowledge (objects, closures, async/await)']],
  ['crs_nodejs', ['Core JavaScript asynchronous programming familiarity', 'Basic HTTP request/response concepts']],
  ['crs_sql', ['Familiarity with tabular spreadsheets or basic data modeling']],
  ['crs_java', ['Basic variables, loops, and conditional logic in any programming language']],
  ['crs_fullstack', ['Core HTML, CSS, and JavaScript fundamentals']],
  ['crs_algorithms', ['Comfort writing functions, arrays, and loops in JavaScript or Python']],
  ['crs_ai_eng', ['Backend HTTP API familiarity and JSON schema basics']],
  ['crs_security', ['Basic understanding of HTTP requests, cookies, and web forms']],
  ['crs_git', ['Basic command-line terminal navigation (cd, ls, mkdir)']],
  ['crs_cloud_devops', ['Command-line shell familiarity and basic Git workflow']],
  ['crs_php', ['Basic HTML forms knowledge and general programming fundamentals']],
];

interface ProjectEnrichmentMeta {
  learningOutcomes: string[];
  milestones: Array<{ step: number; title: string; summary: string }>;
  checklist: string[];
  rubric: Array<{ criterion: string; points: number }>;
  submissionInstructions: string;
}

const PROJECT_ENRICHMENT: Record<string, ProjectEnrichmentMeta> = {
  ptpl_web_portfolio: {
    learningOutcomes: [
      'Architect multi-section semantic HTML5 landmarks with accessible keyboard navigation.',
      'Build fluid CSS Grid and Flexbox layouts that adapt cleanly across mobile, tablet, and desktop viewports.',
      'Validate interactive contact form fields on input and submit without page reload.',
    ],
    milestones: [
      { step: 1, title: 'Semantic Document Shell', summary: 'Structure header, nav, main, projects grid, and footer landmarks.' },
      { step: 2, title: 'Responsive Stylesheet & Tokens', summary: 'Configure CSS variables, fluid typography, and mobile-first grid.' },
      { step: 3, title: 'Accessible Contact Form', summary: 'Wire client-side validation messages with aria-live feedback.' },
    ],
    checklist: [
      'Page contains exactly one <h1> and logical <h2>/<h3> heading hierarchy',
      'Navigation links remain usable at 390px, 768px, and 1280px viewports',
      'All form inputs have explicit <label for="..."> associations',
      'Images include descriptive alt text attributes',
    ],
    rubric: [
      { criterion: 'Semantic HTML5 landmarks & heading hierarchy', points: 30 },
      { criterion: 'Responsive CSS Grid/Flexbox across 3 viewports', points: 30 },
      { criterion: 'Form validation UX & keyboard focus visibility', points: 25 },
      { criterion: 'Clean code organization & README notes', points: 15 },
    ],
    submissionInstructions:
      'Open the starter workspace, test desktop and mobile previews in the Coding Workspace, save your snapshot, and attach your workspace under Course Assignments.',
  },
  ptpl_html_multipage_site: {
    learningOutcomes: [
      'Link multiple semantic HTML pages cleanly with relative paths and active navigation landmarks.',
      'Implement accessible data tables with <caption>, <thead>, and scope attributes.',
      'Build constraint-validated signup and contact forms with native HTML5 attributes.',
    ],
    milestones: [
      { step: 1, title: 'Shared Header & Navigation', summary: 'Connect index, schedule, and join pages consistently.' },
      { step: 2, title: 'Accessible Data Table', summary: 'Publish event schedule using semantic th scope markers.' },
      { step: 3, title: 'Validated Registration Form', summary: 'Enforce required, email, and pattern validation attributes.' },
    ],
    checklist: [
      'Relative links resolve cleanly between every page',
      'Schedule table uses <caption> and <th scope="col|row">',
      'Registration form groups related inputs in <fieldset>/<legend>',
    ],
    rubric: [
      { criterion: 'Multi-page semantic HTML consistency', points: 35 },
      { criterion: 'Table and form accessibility compliance', points: 40 },
      { criterion: 'SEO metadata & Open Graph tags per page', points: 25 },
    ],
    submissionInstructions:
      'Verify HTML structure in the Braincode workspace preview, test form constraint validation, and submit your repository or workspace reference.',
  },
  ptpl_css_portfolio: {
    learningOutcomes: [
      'Maintain a scalable CSS custom-property token architecture supporting light and dark palettes.',
      'Combine Flexbox alignment with CSS Grid repeat(auto-fit, minmax()) card layouts.',
      'Respect prefers-reduced-motion while implementing subtle focus and hover transitions.',
    ],
    milestones: [
      { step: 1, title: 'Design Tokens Layer', summary: 'Define color, spacing, and typography custom properties in :root.' },
      { step: 2, title: 'Fluid Grid Showcase', summary: 'Assemble responsive project cards without media-query hacks.' },
      { step: 3, title: 'Focus & Motion Polish', summary: 'Ensure visible :focus-visible outlines and reduced-motion fallbacks.' },
    ],
    checklist: [
      'Zero horizontal scroll overflow at 375px viewport width',
      'Color contrast ratio exceeds 4.5:1 for primary body text',
      'Reduced-motion media query disables non-essential transforms',
    ],
    rubric: [
      { criterion: 'Design token structure & theme support', points: 35 },
      { criterion: 'Fluid Flexbox & Grid layout responsiveness', points: 40 },
      { criterion: 'Keyboard focus states & reduced-motion polish', points: 25 },
    ],
    submissionInstructions:
      'Preview desktop, tablet, and mobile breakpoints in the Braincode Coding Workspace before submitting.',
  },
  ptpl_js_taskboard: {
    learningOutcomes: [
      'Manage task array state immutably with filter, map, and deterministic counters.',
      'Implement parent container event delegation using event.target.closest().',
      'Persist and restore structured JSON task state safely across reloads.',
    ],
    milestones: [
      { step: 1, title: 'Pure State Helpers', summary: 'Write addTask, toggleTask, and filterTasks helper functions.' },
      { step: 2, title: 'Event Delegation Controller', summary: 'Attach single parent click handler for dynamic task controls.' },
      { step: 3, title: 'Storage Persistence & Summary', summary: 'Synchronize tasks to localStorage with safe JSON parsing.' },
    ],
    checklist: [
      'Task addition validates empty/whitespace titles',
      'Clicking complete or delete uses event.target.closest()',
      'Filter tabs update DOM count accurately without page refresh',
    ],
    rubric: [
      { criterion: 'Immutable state helpers & edge-case handling', points: 35 },
      { criterion: 'Event delegation & DOM update efficiency', points: 35 },
      { criterion: 'localStorage recovery & UX feedback', points: 30 },
    ],
    submissionInstructions:
      'Run the workspace preview and confirm console verification messages appear without runtime errors before submission.',
  },
  ptpl_python_cli: {
    learningOutcomes: [
      'Parse structured JSON and CSV study log files using pathlib and context managers.',
      'Aggregate learner metrics cleanly using Python dictionaries and comprehensions.',
      'Format reproducible CLI summary reports with explicit error handling.',
    ],
    milestones: [
      { step: 1, title: 'Log Loader & Validator', summary: 'Load study records defensively with try/except error paths.' },
      { step: 2, title: 'Aggregation Engine', summary: 'Compute total minutes, averages, and top technologies.' },
      { step: 3, title: 'CLI Summary Formatter', summary: 'Print readable table output and export summary JSON.' },
    ],
    checklist: [
      'Handles missing or malformed input files gracefully',
      'Uses type hints on all public analyzer functions',
      'Includes repeatable unit verification examples in README/tests',
    ],
    rubric: [
      { criterion: 'Data parsing & defensive exception handling', points: 35 },
      { criterion: 'Accurate aggregation logic & typing', points: 40 },
      { criterion: 'Clean CLI report output & documentation', points: 25 },
    ],
    submissionInstructions:
      'Build in your Braincode workspace or local Python 3 environment, document sample output, and submit your repository URL or workspace.',
  },
  ptpl_py_student_mgmt: {
    learningOutcomes: [
      'Model domain entities cleanly using Python dataclasses and enum statuses.',
      'Persist records atomically to JSON/CSV files without corrupting existing rows.',
      'Cover grade-calculation functions with deterministic pytest unit tests.',
    ],
    milestones: [
      { step: 1, title: 'Dataclass Domain Models', summary: 'Define Student and GradeEntry dataclasses with validation.' },
      { step: 2, title: 'JSON Repository Layer', summary: 'Implement load, upsert, and filtered query functions.' },
      { step: 3, title: 'Analytics & Test Suite', summary: 'Compute GPA/cohort averages and pass all edge-case tests.' },
    ],
    checklist: [
      'Rejects out-of-range grades (<0 or >100) with ValueError',
      'Separates storage I/O from grade calculation functions',
      'Includes unit test script covering empty cohorts and averages',
    ],
    rubric: [
      { criterion: 'Dataclass design & input validation', points: 35 },
      { criterion: 'File persistence & error safety', points: 35 },
      { criterion: 'Test coverage & clean CLI interface', points: 30 },
    ],
    submissionInstructions:
      'Organize modules cleanly, include sample test output in your submission notes, and attach your workspace or Git repo.',
  },
  ptpl_react_tracker: {
    learningOutcomes: [
      'Compose focused React components with explicit TypeScript prop contracts.',
      'Compute completion percentages via derived state instead of duplicate useState flags.',
      'Author a reusable custom hook to synchronize tracker state with storage.',
    ],
    milestones: [
      { step: 1, title: 'Component Tree & Props', summary: 'Build HabitList, HabitRow, and SummaryStats components.' },
      { step: 2, title: 'Custom Storage Hook', summary: 'Implement usePersistentHabits hook cleanly.' },
      { step: 3, title: 'Filtering & Streak Display', summary: 'Add category filter, streak counter, and accessible toggles.' },
    ],
    checklist: [
      'All mapped list items use stable unique IDs as React keys',
      'Derived completion stats calculate directly from habit array',
      'Form inputs are fully controlled with clear validation states',
    ],
    rubric: [
      { criterion: 'Component composition & TypeScript prop safety', points: 35 },
      { criterion: 'State & custom hook architecture (no redundant effects)', points: 40 },
      { criterion: 'Accessible interactive controls & visual clarity', points: 25 },
    ],
    submissionInstructions:
      'Review component structure against React rules of hooks, save your workspace, and submit notes or repo link.',
  },
  ptpl_ts_reusable_ui: {
    learningOutcomes: [
      'Author generic TypeScript helpers (`ApiResult<T>`, `ListFilter<T>`) with strict compiler safety.',
      'Use discriminated unions for exhaustive UI state rendering (`loading`, `error`, `ready`).',
      'Prevent silent `any` leaks across utility modules and component props.',
    ],
    milestones: [
      { step: 1, title: 'Discriminated Union Contracts', summary: 'Define AsyncState<T> and ApiError types.' },
      { step: 2, title: 'Generic Collection Helpers', summary: 'Implement sortByKey<T, K extends keyof T> and groupBy.' },
      { step: 3, title: 'Typed Component Primitives', summary: 'Wire DataTable<T> and StatusBadge with exhaustive checks.' },
    ],
    checklist: [
      'Zero `any` annotations in exported library signatures',
      'Exhaustive `never` helper guards switch statements',
      'Utility types (`Pick`, `Omit`, `Partial`) used purposefully',
    ],
    rubric: [
      { criterion: 'Strict TypeScript generics & narrowing accuracy', points: 40 },
      { criterion: 'API contract ergonomics & exhaustive guards', points: 35 },
      { criterion: 'Clear usage examples & README type guide', points: 25 },
    ],
    submissionInstructions:
      'Verify types under strict mode (`noImplicitAny`, `strictNullChecks`) and submit your workspace or repository.',
  },
  ptpl_nodejs_rest_api: {
    learningOutcomes: [
      'Build modular Express route handlers with explicit input validation and status codes.',
      'Use parameterized SQLite queries (`?`) to prevent SQL injection across all endpoints.',
      'Implement structured error middleware and health/readiness checks.',
    ],
    milestones: [
      { step: 1, title: 'SQLite Schema & Connection', summary: 'Initialize tasks table with indexes and constraints.' },
      { step: 2, title: 'Validated CRUD Routes', summary: 'Implement GET, POST, PATCH, and DELETE with 400/404 handling.' },
      { step: 3, title: 'Integration Verification', summary: 'Verify all routes with automated test assertions.' },
    ],
    checklist: [
      'All SQL statements bind parameters cleanly without string interpolation',
      'Central error middleware never leaks stack traces to clients',
      'Consistent JSON error shapes across 400, 404, and 500 responses',
    ],
    rubric: [
      { criterion: 'API route design & HTTP status correctness', points: 35 },
      { criterion: 'Parameterized SQL & input validation safety', points: 40 },
      { criterion: 'Modular architecture & API test notes', points: 25 },
    ],
    submissionInstructions:
      'Test endpoints locally against Express + SQLite, document curl/test verification, and submit your repository or workspace.',
  },
  ptpl_sql_ledger: {
    learningOutcomes: [
      'Normalize multi-table relational schemas using primary and foreign key constraints.',
      'Author accurate multi-table JOINs, GROUP BY aggregations, and HAVING filters.',
      'Design composite indexes matched cleanly to high-frequency analytical queries.',
    ],
    milestones: [
      { step: 1, title: 'Normalized DDL Schema', summary: 'Create learners, courses, enrollments, and progress tables.' },
      { step: 2, title: 'Cohort Completion Queries', summary: 'Compute per-course completion percentages with LEFT JOINs.' },
      { step: 3, title: 'Index Plan & Seed Dataset', summary: 'Verify query plans with EXPLAIN QUERY PLAN.' },
    ],
    checklist: [
      'Foreign keys enforce referential integrity cleanly',
      'Aggregation queries avoid double-counting on multi-joins',
      'Composite indexes cover primary dashboard filter columns',
    ],
    rubric: [
      { criterion: 'Schema normalization & constraint integrity', points: 35 },
      { criterion: 'Analytical JOIN & aggregation query accuracy', points: 40 },
      { criterion: 'Indexing rationale & query plan explanation', points: 25 },
    ],
    submissionInstructions:
      'Save schema and analytical SQL scripts in your Braincode workspace and summarize query results in your submission.',
  },
  ptpl_java_oop_app: {
    learningOutcomes: [
      'Structure domain records, repository interfaces, and service classes cleanly in Java 17+.',
      'Use `Map`, `List`, and Streams safely with defensive null and exception handling.',
      'Verify business rules with repeatable unit test assertions.',
    ],
    milestones: [
      { step: 1, title: 'Domain Records & Exceptions', summary: 'Create Course, Student, and EnrollmentException types.' },
      { step: 2, title: 'Repository & Service Layer', summary: 'Implement InMemoryCourseRepository with interface contract.' },
      { step: 3, title: 'CLI Runner & Verification', summary: 'Exercise enrollment, duplicate guard, and roster sorting.' },
    ],
    checklist: [
      'Encapsulates mutable collections via unmodifiable copies',
      'Uses Java records/interfaces to separate contract from storage',
      'Handles invalid capacity or duplicate enrollments cleanly',
    ],
    rubric: [
      { criterion: 'OOP encapsulation & interface separation', points: 35 },
      { criterion: 'Collections, Streams & exception handling safety', points: 40 },
      { criterion: 'Test scenarios & clean code readability', points: 25 },
    ],
    submissionInstructions:
      'Compile and run locally with `javac`/`java` or Gradle/Maven, record terminal output, and submit your repository or workspace.',
  },
  ptpl_cpp_cli: {
    learningOutcomes: [
      'Manage dynamic state safely with RAII containers (`std::vector`, `std::string`) and zero raw `new`/`delete`.',
      'Persist records through `std::ifstream` and `std::ofstream` with error checking.',
      'Separate pure state mutation functions cleanly from CLI terminal I/O.',
    ],
    milestones: [
      { step: 1, title: 'Task Struct & Ledger State', summary: 'Model Task items inside a safe C++20 class using std::vector.' },
      { step: 2, title: 'File Persistence Layer', summary: 'Implement deterministic load/save file serialization.' },
      { step: 3, title: 'Unit Assertions & CLI Menu', summary: 'Verify state mutations independently of std::cin.' },
    ],
    checklist: [
      'Zero manual raw `new`/`delete` calls anywhere in source',
      'Pass strings and vectors by `const&` for read-only helpers',
      'Compiles cleanly under `-std=c++20 -Wall -Wextra`',
    ],
    rubric: [
      { criterion: 'RAII & modern C++20 memory safety', points: 40 },
      { criterion: 'Clean separation of ledger logic and file I/O', points: 35 },
      { criterion: 'Warning-free compilation & verification cases', points: 25 },
    ],
    submissionInstructions:
      'Compile with `-std=c++20 -Wall -Wextra`, verify sample CLI output, and attach your workspace or repository.',
  },
};

function makeDraftCourseBundle(spec: DraftTrackSeed) {
  return spec;
}

const DRAFT_EXPANSION_TRACKS: DraftTrackSeed[] = [
  makeDraftCourseBundle({
    courseId: 'crs_go_draft',
    techId: 'tech_go',
    categoryId: 'cat_langs',
    title: 'Go Concurrent Services & CLI Engineering',
    slug: 'go-concurrent-services-cli-draft',
    description:
      'Master idiomatic Go syntax, explicit error handling, interfaces, goroutines, channels, and clean HTTP services.',
    difficulty: 'Intermediate',
    estimatedHours: 18,
    objectives: [
      'Write clean, strongly typed Go packages with explicit error wrapping.',
      'Compose small interfaces and structs for testable service boundaries.',
      'Coordinate concurrent worker pools safely with goroutines, WaitGroups, and contexts.',
    ],
    prerequisites: ['Basic programming variables, loops, and functions familiarity'],
    language: 'go',
    modules: [
      { id: 'mod_go_1', title: 'Module 1: Go Core Types, Slices & Error Handling', topic: 'Packages, Structs & Explicit Errors', sortOrder: 1 },
      { id: 'mod_go_2', title: 'Module 2: Interfaces, Goroutines & HTTP Services', topic: 'Concurrency & Net/HTTP', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_go_1',
        moduleId: 'mod_go_1',
        title: 'Go Packages, Slices, Maps & Zero Values',
        slug: 'go-packages-slices-maps-draft',
        topicName: 'Go Data Structures & Zero Values',
        summary: 'Understand Go variable declarations, slices vs arrays, maps, and predictable zero values.',
        conceptOverview:
          'Go favors clarity over hidden magic: uninitialized variables always receive safe zero values (`0`, `""`, `false`, `nil`), and slices provide dynamic views over arrays.',
        detailedExplanation:
          'In Go, packages organize code by directory. Every slice holds a pointer to a backing array, a length (`len`), and a capacity (`cap`). Using `append` grows slices automatically, while `make(map[string]int)` initializes writable maps.',
        concepts: [
          { term: 'Short declaration (`:=`)', definition: 'Declares and initializes a typed variable inside a function scope.' },
          { term: 'Slice', definition: 'Dynamically sized view (`[]T`) over a contiguous backing array.' },
          { term: 'Zero value', definition: 'Deterministic default value assigned automatically before explicit assignment.' },
        ],
        steps: [
          'Declare a slice with `scores := []int{88, 92, 95}`.',
          'Append a new element with `scores = append(scores, 97)`.',
          'Check map membership safely using the comma-ok idiom (`val, ok := counts[key]`).',
        ],
        codeTitle: 'Slice & Map Summary in Go',
        code: `package main\n\nimport "fmt"\n\nfunc main() {\n\tscores := []int{88, 92, 95}\n\tscores = append(scores, 97)\n\tsum := 0\n\tfor _, s := range scores {\n\t\tsum += s\n\t}\n\tfmt.Printf("Count=%d Avg=%d\\n", len(scores), sum/len(scores))\n}`,
        expectedOutput: 'Count=4 Avg=93',
        mistakes: ['Writing to a nil map without `make(...)`, which causes a runtime panic.', 'Ignoring slice capacity sharing when slicing sub-arrays.'],
        bestPractices: ['Always initialize maps via `make(map[K]V)` or map literals.', 'Use `for i, v := range slice` cleanly without manual index bounds errors.'],
        practicalActivity: 'Write a Go function `countWords(words []string) map[string]int` that counts word frequencies.',
        starterCode: `package main\n\nimport "fmt"\n\nfunc countWords(words []string) map[string]int {\n\tfreq := make(map[string]int)\n\tfor _, w := range words {\n\t\tfreq[w]++\n\t}\n\treturn freq\n}\n\nfunc main() {\n\tfmt.Println(countWords([]string{"go", "sql", "go"}))\n}`,
        solutionHint: 'Initialize `freq := make(map[string]int)` and increment `freq[w]++`.',
        sortOrder: 1,
      },
      {
        id: 'les_go_2',
        moduleId: 'mod_go_1',
        title: 'Structs, Methods & Small Interfaces in Go',
        slug: 'go-structs-interfaces-draft',
        topicName: 'Structural Interfaces & Receivers',
        summary: 'Design decoupled Go components using value/pointer receivers and implicit interfaces.',
        conceptOverview:
          'Go types satisfy interfaces implicitly—no `implements` keyword is required—allowing callers to define small, focused interfaces right where they are needed.',
        detailedExplanation:
          'Value receivers (`func (u User) Label() string`) read fields safely on copies, whereas pointer receivers (`func (c *Counter) Inc()`) mutate state in place. Accept small interfaces (`io.Reader`, `Notifier`) and return concrete structs.',
        concepts: [
          { term: 'Pointer receiver', definition: 'Method binding (`*T`) that allows mutating the receiver struct.' },
          { term: 'Implicit satisfaction', definition: 'Any type implementing an interface’s methods satisfies it automatically.' },
        ],
        steps: [
          'Define a `Task` struct with exported `Title` and `Done` fields.',
          'Add a pointer method `(t *Task) Complete()` to toggle state.',
          'Define a single-method interface `Describer` and pass matching structs cleanly.',
        ],
        codeTitle: 'Pointer Receivers & Implicit Interfaces',
        code: `package main\n\nimport "fmt"\n\ntype Task struct {\n\tTitle string\n\tDone  bool\n}\n\nfunc (t *Task) Complete() {\n\tt.Done = true\n}\n\nfunc main() {\n\tt := Task{Title: "Deploy Go service"}\n\tt.Complete()\n\tfmt.Printf("%s -> done=%v\\n", t.Title, t.Done)\n}`,
        expectedOutput: 'Deploy Go service -> done=true',
        mistakes: ['Mixing value and pointer receivers unpredictably on the same mutable struct.', 'Creating giant 15-method interfaces before concrete use cases exist.'],
        bestPractices: ['Keep interfaces to 1–3 methods.', 'Use pointer receivers consistently when any method mutates fields.'],
        practicalActivity: 'Implement a `Notifier` interface with `Send(msg string) error` and a `ConsoleNotifier` struct.',
        starterCode: `package main\n\nimport "fmt"\n\ntype Notifier interface {\n\tSend(msg string)\n}\n\ntype ConsoleNotifier struct{}\n\nfunc (ConsoleNotifier) Send(msg string) {\n\tfmt.Println("NOTIFY:", msg)\n}\n\nfunc main() {\n\tvar n Notifier = ConsoleNotifier{}\n\tn.Send("Build succeeded")\n}`,
        solutionHint: 'Define `func (ConsoleNotifier) Send(msg string)` to satisfy `Notifier` implicitly.',
        sortOrder: 2,
      },
      {
        id: 'les_go_3',
        moduleId: 'mod_go_1',
        title: 'Explicit Error Returns, Wrapping & Sentinel Checks',
        slug: 'go-explicit-error-handling-draft',
        topicName: 'Idiomatic Error Handling',
        summary: 'Handle failure paths cleanly with `(T, error)` returns, `%w` wrapping, and `errors.Is`.',
        conceptOverview:
          'Go treats errors as ordinary return values rather than hidden exceptions, making control flow transparent at every call site.',
        detailedExplanation:
          'Functions return `(result, err)`. Callers check `if err != nil` immediately, return early, and add context with `fmt.Errorf("load config: %w", err)` so upstream checks using `errors.Is` remain intact.',
        concepts: [
          { term: '%w verb', definition: 'Wraps an underlying error inside `fmt.Errorf` for inspection with `errors.Is`/`errors.As`.' },
          { term: 'Guard clause', definition: 'Checking `if err != nil { return ..., err }` early to avoid nested indentation.' },
        ],
        steps: [
          'Define a sentinel error with `var ErrEmptyInput = errors.New("empty input")`.',
          'Wrap lower-level errors using `%w`.',
          'Match sentinel errors reliably with `errors.Is(err, ErrEmptyInput)`.',
        ],
        codeTitle: 'Error Wrapping with fmt.Errorf & errors.Is',
        code: `package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\nvar ErrEmpty = errors.New("empty value")\n\nfunc validateName(s string) error {\n\tif s == "" {\n\t\treturn fmt.Errorf("validateName: %w", ErrEmpty)\n\t}\n\treturn nil\n}\n\nfunc main() {\n\terr := validateName("")\n\tfmt.Println("is ErrEmpty:", errors.Is(err, ErrEmpty))\n}`,
        expectedOutput: 'is ErrEmpty: true',
        mistakes: ['Discarding errors with `_` on I/O or JSON operations.', 'Using `%v` instead of `%w` when callers need `errors.Is` matching.'],
        bestPractices: ['Handle or return every error explicitly.', 'Keep error messages lowercase without trailing punctuation.'],
        practicalActivity: 'Write `divide(a, b float64) (float64, error)` returning an error when `b == 0`.',
        starterCode: `package main\n\nimport (\n\t"errors"\n\t"fmt"\n)\n\nfunc divide(a, b float64) (float64, error) {\n\tif b == 0 {\n\t\treturn 0, errors.New("division by zero")\n\t}\n\treturn a / b, nil\n}\n\nfunc main() {\n\tfmt.Println(divide(10, 0))\n}`,
        solutionHint: 'Check `if b == 0` first and return `0, errors.New(...)`.',
        sortOrder: 3,
      },
      {
        id: 'les_go_4',
        moduleId: 'mod_go_2',
        title: 'Goroutines, Channels & WaitGroup Synchronization',
        slug: 'go-goroutines-channels-draft',
        topicName: 'CSP Concurrency Primitives',
        summary: 'Spawn lightweight concurrent workers and aggregate results without race conditions.',
        conceptOverview:
          'Go’s motto is "Do not communicate by sharing memory; share memory by communicating" using goroutines and typed channels.',
        detailedExplanation:
          'Prefixing a call with `go` launches a lightweight goroutine managed by Go’s scheduler. Use `sync.WaitGroup` or buffered channels so main functions never exit before workers complete, and verify with `go test -race`.',
        concepts: [
          { term: 'Goroutine', definition: 'Lightweight concurrent execution unit multiplexed over OS threads.' },
          { term: 'sync.WaitGroup', definition: 'Counter barrier waiting until `Add(n)` workers call `Done()`.' },
        ],
        steps: [
          'Create a `sync.WaitGroup` and call `wg.Add(1)` before spawning each goroutine.',
          'Call `defer wg.Done()` at the top of the worker function.',
          'Call `wg.Wait()` before closing a results channel.',
        ],
        codeTitle: 'Concurrent Worker Pool Aggregation',
        code: `package main\n\nimport (\n\t"fmt"\n\t"sync"\n)\n\nfunc main() {\n\tnums := []int{2, 4, 6}\n\tresults := make(chan int, len(nums))\n\tvar wg sync.WaitGroup\n\tfor _, n := range nums {\n\t\twg.Add(1)\n\t\tgo func(v int) {\n\t\t\tdefer wg.Done()\n\t\t\tresults <- v * v\n\t\t}(n)\n\t}\n\twg.Wait()\n\tclose(results)\n\tsum := 0\n\tfor r := range results {\n\t\tsum += r\n\t}\n\tfmt.Println("Sum of squares:", sum)\n}`,
        expectedOutput: 'Sum of squares: 56',
        mistakes: ['Spawning unbounded goroutines without a bounded pool or `context.Context` cancellation.', 'Closing a channel from a consumer rather than the producer/coordinator.'],
        bestPractices: ['Always bound concurrency and pass `context.Context` first to cancelable operations.', 'Run `go test -race ./...` in CI.'],
        practicalActivity: 'Collect squared integers from 3 concurrent goroutines using a buffered channel.',
        starterCode: `package main\n\nimport "fmt"\n\nfunc main() {\n\tch := make(chan int, 2)\n\tgo func() { ch <- 10 }()\n\tgo func() { ch <- 20 }()\n\tfmt.Println(<-ch + <-ch)\n}`,
        solutionHint: 'Read both values from the buffered channel before printing.',
        sortOrder: 4,
      },
      {
        id: 'les_go_5',
        moduleId: 'mod_go_2',
        title: 'Production JSON HTTP Handlers with net/http',
        slug: 'go-net-http-json-draft',
        topicName: 'Standard Library HTTP Services',
        summary: 'Build clean REST endpoints using standard library `net/http`, `encoding/json`, and timeouts.',
        conceptOverview:
          'Go’s standard library `net/http` is production-grade out of the box, requiring minimal dependencies for fast, structured JSON APIs.',
        detailedExplanation:
          'Always set explicit `ReadHeaderTimeout` on `http.Server`, validate request payloads via `json.NewDecoder`, write explicit `Content-Type: application/json` headers, and return deterministic JSON error envelopes.',
        concepts: [
          { term: 'http.HandlerFunc', definition: 'Function signature `(http.ResponseWriter, *http.Request)` handling HTTP routes.' },
          { term: 'JSON struct tags', definition: 'Field annotations like `` `json:"title"` `` controlling JSON serialization.' },
        ],
        steps: [
          'Define response struct with `json` field tags.',
          'Set `w.Header().Set("Content-Type", "application/json")` before `WriteHeader`.',
          'Configure `http.Server` with read/write timeouts.',
        ],
        codeTitle: 'Standard Library JSON Health Handler',
        code: `package main\n\nimport (\n\t"encoding/json"\n\t"net/http"\n)\n\ntype HealthResponse struct {\n\tStatus string \`json:"status"\`\n}\n\nfunc healthHandler(w http.ResponseWriter, r *http.Request) {\n\tw.Header().Set("Content-Type", "application/json")\n\t_ = json.NewEncoder(w).Encode(HealthResponse{Status: "ok"})\n}`,
        expectedOutput: '{"status":"ok"}',
        mistakes: ['Calling `http.ListenAndServe` without timeouts in production servers.', 'Setting headers after calling `w.WriteHeader(...)`.'],
        bestPractices: ['Enforce `http.MaxBytesReader` on incoming request bodies.', 'Pass `r.Context()` downstream to DB and external calls.'],
        practicalActivity: 'Write a Go struct and JSON encoder snippet returning `{"service":"braincode","ok":true}`.',
        starterCode: `package main\n\nimport (\n\t"encoding/json"\n\t"os"\n)\n\nfunc main() {\n\tpayload := map[string]any{"service": "braincode", "ok": true}\n\t_ = json.NewEncoder(os.Stdout).Encode(payload)\n}`,
        solutionHint: 'Use `json.NewEncoder(os.Stdout).Encode(...)`.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_go_mc_1',
        moduleId: 'mod_go_1',
        lessonId: 'les_go_1',
        title: 'Nil Map Initialization Guard',
        exerciseType: 'multiple_choice',
        difficulty: 'Beginner',
        prompt: 'What happens if you assign a key directly to an uninitialized `var m map[string]int` in Go?',
        starterCode: '',
        options: ['Runtime panic: assignment to entry in nil map', 'Go auto-allocates the map', 'Compile-time syntax error', 'Silent no-op'],
        correctAnswer: 'Runtime panic: assignment to entry in nil map',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Reading a nil map returns the zero value safely, whereas writing to a nil map triggers a runtime panic unless initialized with `make(...)`.',
        hintText: 'Think about `make(map[string]int)` vs `var m map[string]int`.',
        sortOrder: 1,
      },
      {
        id: 'ex_go_tf_2',
        moduleId: 'mod_go_1',
        lessonId: 'les_go_2',
        title: 'Implicit Interface Satisfaction',
        exerciseType: 'true_false',
        difficulty: 'Beginner',
        prompt: 'True or False: In Go, a struct must explicitly declare an `implements` keyword to satisfy an interface.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'False',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Go uses structural/implicit interface satisfaction: any type implementing the required method signatures satisfies the interface automatically.',
        hintText: 'Compare Java `implements` with Go interfaces.',
        sortOrder: 2,
      },
      {
        id: 'ex_go_write_3',
        moduleId: 'mod_go_2',
        lessonId: 'les_go_4',
        title: 'Write a WaitGroup Worker Guard',
        exerciseType: 'write_code',
        difficulty: 'Intermediate',
        prompt: 'Complete the goroutine body so the WaitGroup decrements even if the work returns early.',
        starterCode: `wg.Add(1)\ngo func() {\n  // ensure Done runs on exit\n}()`,
        options: [],
        correctAnswer: 'defer wg.Done()',
        validationRule: { mode: 'contains_tokens', tokens: ['defer', 'wg.Done()'] },
        explanation: 'Using `defer wg.Done()` guarantees cleanup even across early returns.',
        hintText: 'Combine `defer` with `wg.Done()`.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_go_quiz',
      title: 'Go Concurrency & Idiomatic Error Handling Check',
      questions: [
        {
          id: 'go_q1',
          kind: 'multiple_choice',
          prompt: 'Which `fmt.Errorf` verb wraps an error so `errors.Is()` can match the original cause?',
          options: ['%w', '%v', '%s', '%q'],
          correctAnswer: '%w',
          explanation: '`%w` wraps the inner error and preserves the error chain for `errors.Is` and `errors.As`.',
        },
        {
          id: 'go_q2',
          kind: 'true_false',
          prompt: 'True or False: Passing a struct with a value receiver `(s Store)` mutates the caller’s original struct.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Value receivers work on a copy; mutating methods require a pointer receiver `(s *Store)`.',
        },
        {
          id: 'go_q3',
          kind: 'multiple_choice',
          prompt: 'Which command flag enables Go’s built-in data race detector during tests?',
          options: ['go test -race ./...', 'go test -strict ./...', 'go build -threads ./...', 'go vet -async ./...'],
          correctAnswer: 'go test -race ./...',
          explanation: 'The `-race` flag instruments memory accesses to catch concurrent data races.',
        },
      ],
    },
    assignment: {
      id: 'asn_go_worker',
      title: 'Concurrent URL Health Checker CLI in Go',
      description: 'Build a bounded worker pool CLI that checks service URLs concurrently with context timeouts.',
      instructionsMarkdown:
        'Implement a Go program reading target URLs, fanning work across 4 worker goroutines with `context.WithTimeout`, and printing latency and HTTP status summaries.',
      requirements: [
        'Use a bounded worker pool instead of spawning unbounded goroutines.',
        'Wrap network errors with `%w` and respect a 3-second context timeout.',
        'Zero data races under `go test -race`.',
      ],
      starterFiles: {
        'main.go': `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Health checker CLI starter")\n}`,
      },
      rubric: [
        { criterion: 'Bounded worker pool & WaitGroup cleanup', points: 40 },
        { criterion: 'Context timeout propagation', points: 35 },
        { criterion: 'Explicit error handling & output clarity', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_go_service',
      title: 'Go: Concurrent Job Queue & JSON Status Service',
      slug: 'go-concurrent-job-queue-service',
      category: 'Backend Systems',
      difficulty: 'Intermediate',
      estimatedHours: 8,
      summary: 'Design a concurrent Go background job processor with graceful shutdown and HTTP status endpoints.',
      learningOutcomes: [
        'Coordinate producer/worker goroutines cleanly over typed Go channels.',
        'Implement graceful HTTP server shutdown on SIGINT using `context.Context`.',
        'Expose structured JSON metrics endpoints using `net/http`.',
      ],
      requirements: [
        'Queue jobs cleanly with a bounded worker pool.',
        'Expose `/health` and `/jobs` JSON routes.',
        'Pass unit tests under `go test -race`.',
      ],
      milestones: [
        { step: 1, title: 'Job Channel & Workers', summary: 'Create typed Job struct and bounded worker pool.' },
        { step: 2, title: 'HTTP JSON Routes', summary: 'Serve job submission and status summary routes.' },
        { step: 3, title: 'Graceful Shutdown & Tests', summary: 'Drain active jobs cleanly on shutdown signal.' },
      ],
      checklist: ['ReadHeaderTimeout configured on http.Server', 'Channels closed cleanly after worker exit', 'Race detector passes'],
      rubric: [
        { criterion: 'Concurrency safety & channel orchestration', points: 40 },
        { criterion: 'HTTP JSON contract & error handling', points: 35 },
        { criterion: 'Tests & documentation quality', points: 25 },
      ],
      deliverables: ['main.go', 'worker_test.go', 'README.md'],
      submissionInstructions: 'Run `go test -race ./...` locally and submit your repository link or workspace notes.',
      starterFiles: {
        'main.go': `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Go job service starter")\n}`,
      },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_rust_draft',
    techId: 'tech_rust',
    categoryId: 'cat_langs',
    title: 'Rust Ownership, Lifetimes & Fearless Concurrency',
    slug: 'rust-systems-ownership-draft',
    description:
      'Build memory-safe high-performance systems in Rust using ownership rules, borrowing, enums, Result<T, E>, and iterators.',
    difficulty: 'Intermediate',
    estimatedHours: 20,
    objectives: [
      'Reason accurately about move semantics, stack vs heap data, and borrow checker rules.',
      'Model domain states exhaustively with enums and Pattern Matching.',
      'Propagate recoverable errors cleanly with Result<T, E> and the `?` operator.',
    ],
    prerequisites: ['Comfort with basic variables, functions, and control flow in any language'],
    language: 'rust',
    modules: [
      { id: 'mod_rs_1', title: 'Module 1: Ownership, Borrowing & Structs', topic: 'Memory Safety Without Garbage Collection', sortOrder: 1 },
      { id: 'mod_rs_2', title: 'Module 2: Enums, Error Handling & Iterators', topic: 'Option, Result & Zero-Cost Abstractions', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_rs_1',
        moduleId: 'mod_rs_1',
        title: 'Ownership, Moves & Immutable Variables in Rust',
        slug: 'rust-ownership-moves-draft',
        topicName: 'Ownership Rules & Move Semantics',
        summary: 'Learn Rust’s three ownership rules and why moves prevent double-free bugs at compile time.',
        conceptOverview:
          'Every value in Rust has a single owner; when the owner goes out of scope, Rust drops the value deterministically without a garbage collector.',
        detailedExplanation:
          'Assigning a heap-allocated `String` to another binding transfers ownership (a move), invalidating the original variable so memory can never be freed twice.',
        concepts: [
          { term: 'Owner', definition: 'The single variable binding responsible for dropping a value at scope exit.' },
          { term: 'Move', definition: 'Transfer of ownership for non-`Copy` heap values like `String` or `Vec<T>`.' },
        ],
        steps: [
          'Declare a mutable string with `let mut title = String::from("Braincode");`.',
          'Observe ownership transfer when passing `title` into a consuming function.',
          'Call `.clone()` only when an independent heap copy is genuinely required.',
        ],
        codeTitle: 'Ownership Move vs Copy Semantics',
        code: `fn consume(name: String) {\n    println!("Consumed: {}", name);\n}\n\nfn main() {\n    let s = String::from("Braincode");\n    consume(s);\n    let count = 42;\n    println!("Copy int still valid: {}", count);\n}`,
        expectedOutput: 'Consumed: Braincode\nCopy int still valid: 42',
        mistakes: ['Attempting to use a moved `String` without borrowing (`&String`).', 'Sprinkling `.clone()` everywhere instead of passing `&str` slices.'],
        bestPractices: ['Accept `&str` rather than `String` when functions only read text.', 'Prefer `let` immutability by default.'],
        practicalActivity: 'Write a Rust function taking ownership of a `Vec<i32>` and returning its sum.',
        starterCode: `fn sum_vec(nums: Vec<i32>) -> i32 {\n    nums.iter().sum()\n}\n\nfn main() {\n    println!("{}", sum_vec(vec![10, 20, 30]));\n}`,
        solutionHint: 'Use `nums.iter().sum()`.',
        sortOrder: 1,
      },
      {
        id: 'les_rs_2',
        moduleId: 'mod_rs_1',
        title: 'References, Slices & Borrow Checker Rules',
        slug: 'rust-references-borrowing-draft',
        topicName: 'Immutable & Mutable Borrows',
        summary: 'Share read access broadly or exclusive write access safely using `&T` and `&mut T`.',
        conceptOverview:
          'Rust prevents data races at compile time by permitting either any number of shared `&T` references OR exactly one `&mut T` reference at a time.',
        detailedExplanation:
          'Borrowing lets functions inspect or update data without taking ownership. String slices (`&str`) reference contiguous UTF-8 byte ranges cleanly.',
        concepts: [
          { term: '&T', definition: 'Shared immutable reference; multiple readers allowed simultaneously.' },
          { term: '&mut T', definition: 'Exclusive mutable reference; prevents aliasing during writes.' },
        ],
        steps: [
          'Pass `&String` or `&str` when reading length or formatting text.',
          'Use `&mut Vec<T>` only for functions that push or sort elements in place.',
        ],
        codeTitle: 'Safe Borrowing in Rust',
        code: `fn push_tag(tags: &mut Vec<String>, tag: &str) {\n    tags.push(tag.to_string());\n}\n\nfn main() {\n    let mut tags = vec![String::from("rust")];\n    push_tag(&mut tags, "systems");\n    println!("Count={}", tags.len());\n}`,
        expectedOutput: 'Count=2',
        mistakes: ['Holding a `&T` borrow across a `.push()` mutation on the same `Vec<T>`.'],
        bestPractices: ['Scope mutable borrows tightly.', 'Accept slices (`&[T]` / `&str`) for read-only helpers.'],
        practicalActivity: 'Write `first_word(s: &str) -> &str` using byte/char slicing.',
        starterCode: `fn first_word(s: &str) -> &str {\n    s.split_whitespace().next().unwrap_or("")\n}\n\nfn main() {\n    println!("{}", first_word("rust safety rules"));\n}`,
        solutionHint: 'Use `split_whitespace().next().unwrap_or("")`.',
        sortOrder: 2,
      },
      {
        id: 'les_rs_3',
        moduleId: 'mod_rs_1',
        title: 'Structs, Impl Blocks & Traits',
        slug: 'rust-structs-traits-draft',
        topicName: 'Data Modeling & Shared Behavior',
        summary: 'Attach methods to structs and enforce shared contracts through Rust traits.',
        conceptOverview:
          'Rust separates data layout (`struct`) from behavior (`impl` and `trait`), favoring composition over class inheritance.',
        detailedExplanation:
          'Derive standard traits like `#[derive(Debug, Clone, PartialEq)]` and define custom traits when multiple concrete structs share behavior.',
        concepts: [
          { term: 'impl block', definition: 'Associates methods and constructors (`new`) with a struct or enum.' },
          { term: 'Trait bound', definition: 'Constrains generic functions (`fn print_summary<T: Summary>(item: &T)`).' },
        ],
        steps: ['Define a `Course` struct with `title` and `hours`.', 'Implement `Summary` trait for `Course`.'],
        codeTitle: 'Struct with Custom Trait Implementation',
        code: `trait Summary {\n    fn summarize(&self) -> String;\n}\n\nstruct Module { title: String, minutes: u32 }\n\nimpl Summary for Module {\n    fn summarize(&self) -> String {\n        format!("{} ({}m)", self.title, self.minutes)\n    }\n}\n\nfn main() {\n    let m = Module { title: String::from("Ownership"), minutes: 25 };\n    println!("{}", m.summarize());\n}`,
        expectedOutput: 'Ownership (25m)',
        mistakes: ['Forgetting `&self` on instance methods when an associated function is not intended.'],
        bestPractices: ['Derive `Debug` on public domain structs.', 'Use idiomatic `pub fn new(...) -> Self` constructors.'],
        practicalActivity: 'Implement a `describe(&self) -> String` method on a `Learner` struct.',
        starterCode: `struct Learner { name: String, xp: u32 }\nimpl Learner {\n    fn describe(&self) -> String {\n        format!("{}: {} XP", self.name, self.xp)\n    }\n}\nfn main() { println!("{}", Learner { name: "Ada".into(), xp: 120 }.describe()); }`,
        solutionHint: 'Use `format!("{}: {} XP", self.name, self.xp)`.',
        sortOrder: 3,
      },
      {
        id: 'les_rs_4',
        moduleId: 'mod_rs_2',
        title: 'Enums, Option<T>, Result<T, E> & Pattern Matching',
        slug: 'rust-enums-result-matching-draft',
        topicName: 'Exhaustive Error & Null Safety',
        summary: 'Eliminate null-pointer crashes using `Option<T>` and explicit `Result<T, E>` propagation.',
        conceptOverview:
          'Rust has no `null` reference; missing values are modeled explicitly as `Option<T>` (`Some`/`None`), and `match` ensures every variant is handled.',
        detailedExplanation:
          'The `?` operator cleanly unwraps `Ok(val)` or returns `Err(e)` early from functions returning `Result`, making error propagation concise without sacrificing safety.',
        concepts: [
          { term: 'Option<T>', definition: 'Enum representing either `Some(T)` or `None`.' },
          { term: 'Result<T, E>', definition: 'Enum representing success `Ok(T)` or failure `Err(E)`.' },
        ],
        steps: ['Return `Result<u32, String>` from validation helpers.', 'Use `match` cleanly instead of `.unwrap()` in production paths.'],
        codeTitle: 'Safe Parsing with Result & Match',
        code: `fn parse_score(raw: &str) -> Result<u32, String> {\n    let val: u32 = raw.trim().parse().map_err(|_| String::from("Not a valid integer"))?;\n    if val > 100 {\n        return Err(String::from("Score cannot exceed 100"));\n    }\n    Ok(val)\n}\n\nfn main() {\n    println!("{:?}", parse_score("95"));\n}`,
        expectedOutput: 'Ok(95)',
        mistakes: ['Calling `.unwrap()` on untrusted user input, causing panics.'],
        bestPractices: ['Prefer `match`, `if let`, `unwrap_or`, or `?` over `.unwrap()`.'],
        practicalActivity: 'Parse a score string safely and clamp errors into descriptive messages.',
        starterCode: `fn safe_port(raw: &str) -> Result<u16, String> {\n    raw.parse::<u16>().map_err(|_| "Invalid port".to_string())\n}\nfn main() { println!("{:?}", safe_port("3000")); }`,
        solutionHint: 'Use `.parse::<u16>().map_err(...)`.',
        sortOrder: 4,
      },
      {
        id: 'les_rs_5',
        moduleId: 'mod_rs_2',
        title: 'Zero-Cost Iterators, Closures & Unit Testing',
        slug: 'rust-iterators-testing-draft',
        topicName: 'Functional Pipelines & Cargo Tests',
        summary: 'Chain `.iter()`, `.filter()`, and `.map()` cleanly with built-in `#[test]` verification.',
        conceptOverview:
          'Rust iterators are lazy and compile down to tight loops identical to hand-written index code, with zero bounds-check surprises.',
        detailedExplanation:
          'Combine `.iter().filter(...).map(...).collect()` for expressive transformations and co-locate unit tests inside `#[cfg(test)] mod tests`.',
        concepts: [
          { term: 'Lazy iterator', definition: 'Produces items only when consumed by `.collect()`, `.sum()`, or `for`.' },
          { term: '#[test]', definition: 'Attribute marking functions executed automatically by `cargo test`.' },
        ],
        steps: ['Filter active numeric entries via `.filter(|x| **x >= 70)`.', 'Collect results into `Vec<i32>`.'],
        codeTitle: 'Iterator Pipeline & Aggregation',
        code: `fn passing_scores(scores: &[i32]) -> Vec<i32> {\n    scores.iter().copied().filter(|&s| s >= 70).collect()\n}\n\nfn main() {\n    println!("{:?}", passing_scores(&[55, 72, 91, 64]));\n}`,
        expectedOutput: '[72, 91]',
        mistakes: ['Collecting intermediate `Vec` allocations unnecessarily inside multi-step chains.'],
        bestPractices: ['Prefer iterator adapters and write `#[cfg(test)]` unit tests alongside modules.'],
        practicalActivity: 'Filter passing scores >= 70 and return their count.',
        starterCode: `fn count_passing(scores: &[i32]) -> usize {\n    scores.iter().filter(|&&s| s >= 70).count()\n}\nfn main() { println!("{}", count_passing(&[50, 75, 88])); }`,
        solutionHint: 'Chain `.filter(...).count()`.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_rs_mc_1',
        moduleId: 'mod_rs_1',
        lessonId: 'les_rs_2',
        title: 'Exclusive Mutable Reference Rule',
        exerciseType: 'multiple_choice',
        difficulty: 'Beginner',
        prompt: 'Which combination of references to the same value is allowed simultaneously in safe Rust?',
        starterCode: '',
        options: ['Multiple immutable (&T) references', 'Two mutable (&mut T) references', 'One &T and one &mut T overlapping', 'Raw pointer dereference outside unsafe'],
        correctAnswer: 'Multiple immutable (&T) references',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Any number of immutable readers (`&T`) may coexist safely, while `&mut T` requires exclusivity.',
        hintText: 'Recall shared read vs exclusive write guarantees.',
        sortOrder: 1,
      },
      {
        id: 'ex_rs_pred_2',
        moduleId: 'mod_rs_2',
        lessonId: 'les_rs_5',
        title: 'Predict Iterator Filter Output',
        exerciseType: 'predict_output',
        difficulty: 'Intermediate',
        prompt: 'What does `vec![40, 70, 90].iter().filter(|&&x| x >= 70).count()` evaluate to?',
        starterCode: '',
        options: ['1', '2', '3', '70'],
        correctAnswer: '2',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Both `70` and `90` satisfy `x >= 70`, yielding a count of 2.',
        hintText: 'Notice the `>=` comparison.',
        sortOrder: 2,
      },
      {
        id: 'ex_rs_write_3',
        moduleId: 'mod_rs_2',
        lessonId: 'les_rs_4',
        title: 'Safe Result Propagation',
        exerciseType: 'write_code',
        difficulty: 'Intermediate',
        prompt: 'Write a Rust return statement using `Result` and the `?` operator or `Ok(...)` wrapper for `parse_age`.',
        starterCode: `fn parse_age(raw: &str) -> Result<u8, String> {\n  // return Ok(age) cleanly\n}`,
        options: [],
        correctAnswer: 'Ok(',
        validationRule: { mode: 'contains_tokens', tokens: ['parse', 'Ok('] },
        explanation: 'Parsing with `.parse::<u8>()` and returning `Ok(...)` handles validation cleanly.',
        hintText: 'Use `raw.parse::<u8>()` mapped to `Result`.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_rust_quiz',
      title: 'Rust Ownership & Error Safety Assessment',
      questions: [
        {
          id: 'rs_q1',
          kind: 'multiple_choice',
          prompt: 'Which Rust enum represents a recoverable operation that can fail with error type `E`?',
          options: ['Result<T, E>', 'Option<T>', 'Box<T>', 'PhantomData<T>'],
          correctAnswer: 'Result<T, E>',
          explanation: '`Result<T, E>` carries either `Ok(T)` or `Err(E)`.',
        },
        {
          id: 'rs_q2',
          kind: 'true_false',
          prompt: 'True or False: Rust requires a runtime garbage collector to free heap memory.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Rust drops owned resources deterministically at scope exit via ownership rules.',
        },
        {
          id: 'rs_q3',
          kind: 'multiple_choice',
          prompt: 'Which operator unwraps `Ok(v)` or returns `Err(e)` early from a Result-returning function?',
          options: ['?', '!', '::', '&mut'],
          correctAnswer: '?',
          explanation: 'The `?` operator propagates errors ergonomically.',
        },
      ],
    },
    assignment: {
      id: 'asn_rust_cli_parser',
      title: 'Safe Log Analyzer CLI in Rust',
      description: 'Build a Cargo CLI that reads log lines safely with BufReader and computes structured summaries using HashMap.',
      instructionsMarkdown:
        'Author a Rust binary crate reading sample log records using `Result<_, io::Error>`, counting log severities cleanly without `.unwrap()`.',
      requirements: [
        'Use `Result` propagation cleanly—zero `.unwrap()` calls on I/O paths.',
        'Include at least 2 `#[test]` unit assertions.',
      ],
      starterFiles: {
        'src/main.rs': `fn main() {\n    println!("Rust CLI analyzer starter");\n}`,
      },
      rubric: [
        { criterion: 'Borrow checker & slice ergonomics', points: 40 },
        { criterion: 'Exhaustive Result handling (no panic unwraps)', points: 35 },
        { criterion: 'Unit tests & clean structure', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_rust_cli',
      title: 'Rust: Memory-Safe Markdown & Word Indexer CLI',
      slug: 'rust-markdown-word-indexer',
      category: 'Systems Tooling',
      difficulty: 'Intermediate',
      estimatedHours: 8,
      summary: 'Index local text documents cleanly with Rust slices, HashMaps, and zero-unwrap Result error propagation.',
      learningOutcomes: [
        'Process text files via `std::fs` and buffered reading safely.',
        'Leverage `HashMap<&str, usize>` or owned string frequency indexes.',
        'Write deterministic `cargo test` suites.',
      ],
      requirements: [
        'Accept input file path cleanly via arguments.',
        'Return descriptive `Result` errors when files are missing.',
      ],
      milestones: [
        { step: 1, title: 'Tokenization Helper', summary: 'Split and normalize lowercase words cleanly with iterators.' },
        { step: 2, title: 'Frequency Indexer', summary: 'Build word count map and top-N sorting.' },
        { step: 3, title: 'Cargo Tests', summary: 'Verify empty inputs, punctuation stripping, and error paths.' },
      ],
      checklist: ['Zero unsafe blocks', 'Zero unwrap() on file paths', 'Passes cargo clippy & cargo test'],
      rubric: [
        { criterion: 'Ownership & iterator elegance', points: 40 },
        { criterion: 'Error handling completeness', points: 35 },
        { criterion: 'Test suite reliability', points: 25 },
      ],
      deliverables: ['Cargo.toml', 'src/main.rs', 'README.md'],
      submissionInstructions: 'Run `cargo test` and submit your crate repository or workspace summary.',
      starterFiles: {
        'src/main.rs': `fn main() {\n    println!("Word indexer starter");\n}`,
      },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_csharp_draft',
    techId: 'tech_csharp',
    categoryId: 'cat_langs',
    title: 'C# & Modern .NET Backend Architecture',
    slug: 'csharp-dotnet-backend-draft',
    description: 'Build clean object-oriented services in C# 12 with records, LINQ, async/await, and dependency injection.',
    difficulty: 'Intermediate',
    estimatedHours: 18,
    objectives: [
      'Model immutable domain records and interfaces cleanly in C#.',
      'Query in-memory collections expressively using LINQ.',
      'Write non-blocking async methods with CancellationToken support.',
    ],
    prerequisites: ['Basic OOP or imperative programming familiarity'],
    language: 'csharp',
    modules: [
      { id: 'mod_cs_1', title: 'Module 1: Modern C# Types, Records & Null Safety', topic: 'Nullable Reference Types & OOP', sortOrder: 1 },
      { id: 'mod_cs_2', title: 'Module 2: LINQ Pipelines & Async Task Programming', topic: 'LINQ, Generics & Async/Await', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_cs_1',
        moduleId: 'mod_cs_1',
        title: 'Nullable Reference Types, Records & Pattern Matching',
        slug: 'csharp-records-nullable-draft',
        topicName: 'Safe Data Models in C#',
        summary: 'Eliminate NullReferenceExceptions with nullable annotations and immutable C# records.',
        conceptOverview: 'Modern C# enables compile-time null-state analysis and concise `record` declarations with value-based equality.',
        detailedExplanation: 'Use `public record CourseSummary(string Title, int Hours);` for immutable DTOs and mark optional references explicitly with `?`.',
        concepts: [
          { term: 'record', definition: 'Reference or value type providing built-in value equality and `with` expressions.' },
          { term: 'Nullable annotation (`string?`)', definition: 'Signals to the compiler that null checks are required before dereferencing.' },
        ],
        steps: ['Enable `<Nullable>enable</Nullable>`.', 'Model DTOs with positional `record` syntax.'],
        codeTitle: 'Immutable C# Record & Pattern Matching',
        code: `public record LessonInfo(string Title, int Minutes);\n\nvar item = new LessonInfo("LINQ Basics", 20);\nvar longer = item with { Minutes = 25 };\nConsole.WriteLine($"{longer.Title} - {longer.Minutes}m");`,
        expectedOutput: 'LINQ Basics - 25m',
        mistakes: ['Suppressing nullable warnings blindly with `!` instead of validating inputs.'],
        bestPractices: ['Use `record` types for immutable API DTOs.', 'Validate external inputs at API boundaries.'],
        practicalActivity: 'Create a `LearnerRecord(string Name, int Xp)` and compute a level-up copy with `with`.',
        starterCode: `public record Learner(string Name, int Xp);\nvar l = new Learner("Sam", 100) with { Xp = 150 };\nConsole.WriteLine(l);`,
        solutionHint: 'Use the `with` non-destructive mutation expression.',
        sortOrder: 1,
      },
      {
        id: 'les_cs_2',
        moduleId: 'mod_cs_1',
        title: 'Interfaces, Encapsulation & Dependency Injection',
        slug: 'csharp-interfaces-di-draft',
        topicName: 'Clean Service Abstractions',
        summary: 'Decouple business services from persistence implementations using interfaces and constructor injection.',
        conceptOverview: 'Constructor injection makes dependencies explicit and allows swapping real databases for fast unit fakes.',
        detailedExplanation: 'Define an interface `ILessonRepository`, register concrete implementations in .NET DI (`AddScoped<ILessonRepository, SqlLessonRepository>()`), and inject interfaces cleanly.',
        concepts: [
          { term: 'Constructor Injection', definition: 'Supplying required interface dependencies through the class constructor.' },
          { term: 'Scoped lifetime', definition: 'One service instance created per HTTP request.' },
        ],
        steps: ['Extract repository interface `ICourseRepo`.', 'Inject `ICourseRepo` via primary constructor.'],
        codeTitle: 'Interface & Service Constructor Injection',
        code: `public interface IClock { DateTime UtcNow { get; } }\npublic class CourseService(IClock clock)\n{\n    public string Stamp() => clock.UtcNow.ToString("yyyy-MM-dd");\n}`,
        expectedOutput: '2026-11-19',
        mistakes: ['Using static global state inside domain services instead of injectable abstractions.'],
        bestPractices: ['Register DB contexts as Scoped, never Singleton.'],
        practicalActivity: 'Define `IGreeter` and a `WelcomeService` receiving `IGreeter` via constructor.',
        starterCode: `public interface IGreeter { string Greet(string name); }\npublic class WelcomeService(IGreeter g) { public string Run(string n) => g.Greet(n); }`,
        solutionHint: 'Pass interface into primary constructor.',
        sortOrder: 2,
      },
      {
        id: 'les_cs_3',
        moduleId: 'mod_cs_2',
        title: 'LINQ Queries, Filtering & Projections',
        slug: 'csharp-linq-queries-draft',
        topicName: 'Declarative Data Pipelines',
        summary: 'Filter, group, and project collections cleanly using deferred LINQ method chains.',
        conceptOverview: 'LINQ standardizes querying across in-memory lists and Entity Framework SQL providers with one composable API.',
        detailedExplanation: 'Combine `.Where()`, `.OrderByDescending()`, and `.Select()` cleanly, materializing with `.ToList()` only when executing.',
        concepts: [
          { term: 'Deferred execution', definition: 'LINQ expressions run only when iterated (`foreach`, `.ToList()`, `.Count()`).' },
        ],
        steps: ['Filter items via `.Where(...)`.', 'Sort and project slim DTO fields with `.Select(...)`.'],
        codeTitle: 'LINQ Top-Scores Pipeline',
        code: `var scores = new[] { 65, 88, 92, 74 };\nvar passing = scores.Where(s => s >= 70).OrderByDescending(s => s).ToList();\nConsole.WriteLine(string.Join(", ", passing));`,
        expectedOutput: '92, 88, 74',
        mistakes: ['Calling `.ToList()` after every intermediate operator, allocating redundant lists.'],
        bestPractices: ['Keep projections slim before `.ToList()`.'],
        practicalActivity: 'Compute average passing score (>=70) using `.Where()` and `.Average()`.',
        starterCode: `var scores = new[] { 50, 80, 90 };\nConsole.WriteLine(scores.Where(x => x >= 70).Average());`,
        solutionHint: 'Chain `.Where(x => x >= 70).Average()`.',
        sortOrder: 3,
      },
      {
        id: 'les_cs_4',
        moduleId: 'mod_cs_2',
        title: 'Async/Await, Task & CancellationToken Hygiene',
        slug: 'csharp-async-await-task-draft',
        topicName: 'Non-Blocking Server Execution',
        summary: 'Keep ASP.NET Core request threads scalable using `async Task<T>` and cancellation tokens.',
        conceptOverview: '`async`/`await` yields threads back to the thread pool while awaiting I/O without blocking.',
        detailedExplanation: 'Never block on `.Result` or `.Wait()`, which risks deadlocks; thread `CancellationToken ct` cleanly from controller to DB call.',
        concepts: [
          { term: 'CancellationToken', definition: 'Cooperative signal aborting in-flight async work when a client disconnects.' },
        ],
        steps: ['Return `Task<T>` rather than `async void`.', 'Pass `CancellationToken` to async I/O APIs.'],
        codeTitle: 'Async Task Helper with CancellationToken',
        code: `public async Task<string> FetchStatusAsync(CancellationToken ct)\n{\n    await Task.Delay(10, ct);\n    return "healthy";\n}`,
        expectedOutput: 'healthy',
        mistakes: ['Using `.Result` inside ASP.NET request handlers or `async void` outside event handlers.'],
        bestPractices: ['Suffix async methods with `Async` and accept `CancellationToken`.'],
        practicalActivity: 'Write an `async Task<int> ComputeAsync(int n, CancellationToken ct)` method.',
        starterCode: `public async Task<int> ComputeAsync(int n, CancellationToken ct)\n{\n    await Task.Yield();\n    return n * 2;\n}`,
        solutionHint: 'Return `Task<int>` with `await`.',
        sortOrder: 4,
      },
      {
        id: 'les_cs_5',
        moduleId: 'mod_cs_2',
        title: 'Minimal APIs, Input Validation & xUnit Tests',
        slug: 'csharp-minimal-apis-testing-draft',
        topicName: 'Typed HTTP Endpoints & Tests',
        summary: 'Wire clean .NET Minimal APIs returning `Results.Ok` / `Results.BadRequest` and test service rules.',
        conceptOverview: 'Minimal APIs pair concise lambda route registration with typed dependency injection.',
        detailedExplanation: 'Return `TypedResults` cleanly and extract pure validation logic so xUnit tests run in milliseconds.',
        concepts: [
          { term: 'TypedResults', definition: 'Strongly typed HTTP result factories making endpoint contracts testable.' },
        ],
        steps: ['Validate DTO inputs first.', 'Return explicit `400 BadRequest` or `201 Created`.'],
        codeTitle: 'Clean Validation Guard in Minimal API Handler',
        code: `static string ValidateTitle(string? title)\n{\n    if (string.IsNullOrWhiteSpace(title)) return "INVALID";\n    return title.Trim();\n}\nConsole.WriteLine(ValidateTitle("  C# Track "));`,
        expectedOutput: 'C# Track',
        mistakes: ['Catching generic `Exception` silently and returning 200 OK.'],
        bestPractices: ['Return ProblemDetails (RFC 9457) on validation/server errors.'],
        practicalActivity: 'Validate an email string and return trimmed lowercase output.',
        starterCode: `static bool IsValid(string? email) => !string.IsNullOrWhiteSpace(email) && email.Contains('@');\nConsole.WriteLine(IsValid("dev@braincode.tech"));`,
        solutionHint: 'Check `!string.IsNullOrWhiteSpace` and `.Contains("@")`.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_cs_mc_1',
        moduleId: 'mod_cs_1',
        lessonId: 'les_cs_1',
        title: 'Immutable DTO Construct',
        exerciseType: 'multiple_choice',
        difficulty: 'Beginner',
        prompt: 'Which C# type keyword provides concise positional syntax, value equality, and `with` expressions out of the box?',
        starterCode: '',
        options: ['record', 'delegate', 'volatile', 'namespace'],
        correctAnswer: 'record',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'C# `record` types generate value equality and `with` cloning automatically.',
        hintText: 'Added in C# 9 specifically for immutable models.',
        sortOrder: 1,
      },
      {
        id: 'ex_cs_tf_2',
        moduleId: 'mod_cs_2',
        lessonId: 'les_cs_4',
        title: 'Blocking .Result Anti-Pattern',
        exerciseType: 'true_false',
        difficulty: 'Intermediate',
        prompt: 'True or False: Calling `.Result` synchronously on async tasks inside request handlers is recommended in production .NET APIs.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'False',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Sync-over-async blocks thread pool threads and can cause thread starvation or deadlocks.',
        hintText: 'Use `await` end-to-end.',
        sortOrder: 2,
      },
      {
        id: 'ex_cs_write_3',
        moduleId: 'mod_cs_2',
        lessonId: 'les_cs_3',
        title: 'LINQ Filter & Count',
        exerciseType: 'write_code',
        difficulty: 'Intermediate',
        prompt: 'Use LINQ `.Where(...)` to keep items greater than 50.',
        starterCode: `var passed = scores./* filter > 50 */`,
        options: [],
        correctAnswer: '.Where(',
        validationRule: { mode: 'contains_tokens', tokens: ['.Where(', '50'] },
        explanation: '`.Where(x => x > 50)` filters the sequence cleanly.',
        hintText: 'Use `.Where(s => s > 50)`.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_csharp_quiz',
      title: 'C# & .NET Engineering Assessment',
      questions: [
        {
          id: 'cs_q1',
          kind: 'multiple_choice',
          prompt: 'Which parameter type lets ASP.NET Core abort long-running DB work when the HTTP caller disconnects?',
          options: ['CancellationToken', 'ThreadAbortSignal', 'LockCookie', 'MemoryBarrier'],
          correctAnswer: 'CancellationToken',
          explanation: '`CancellationToken` propagates cooperative cancellation through async calls.',
        },
        {
          id: 'cs_q2',
          kind: 'true_false',
          prompt: 'True or False: LINQ `.Where()` executes immediately on arrays before iterating or calling `.ToList()`.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'LINQ `.Where()` uses deferred execution until materialized.',
        },
        {
          id: 'cs_q3',
          kind: 'multiple_choice',
          prompt: 'Which .NET DI lifetime creates one instance per incoming HTTP request?',
          options: ['Scoped', 'Singleton', 'Static', 'Const'],
          correctAnswer: 'Scoped',
          explanation: 'Scoped services live for the duration of a single HTTP request scope.',
        },
      ],
    },
    assignment: {
      id: 'asn_csharp_catalog_api',
      title: 'Typed Course Catalog Service in C# & .NET',
      description: 'Implement a repository interface, immutable record DTOs, LINQ filtering, and unit tests.',
      instructionsMarkdown: 'Build `ICourseRepository`, filter courses with LINQ, and verify 3 xUnit assertions.',
      requirements: ['Use immutable C# records for DTOs', 'Implement constructor dependency injection'],
      starterFiles: { 'Program.cs': 'Console.WriteLine("C# .NET API starter");' },
      rubric: [
        { criterion: 'DI & interface design', points: 40 },
        { criterion: 'LINQ & async/await hygiene', points: 35 },
        { criterion: 'Unit tests', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_csharp_api',
      title: 'C#: Layered Task Tracker .NET Minimal API',
      slug: 'csharp-dotnet-task-tracker-api',
      category: 'Backend API',
      difficulty: 'Intermediate',
      estimatedHours: 8,
      summary: 'Build a clean C# Minimal API with records, LINQ queries, validation, and async cancellation tokens.',
      learningOutcomes: [
        'Separate endpoints cleanly from repository interfaces.',
        'Filter collections safely with LINQ and nullable annotations.',
      ],
      requirements: ['Records for requests/responses', 'CancellationToken support on async handlers'],
      milestones: [
        { step: 1, title: 'Domain Records', summary: 'Define TaskItem and CreateTaskDto records.' },
        { step: 2, title: 'LINQ Repository', summary: 'Implement filtered queries and status updates.' },
      ],
      checklist: ['Nullable enabled', 'Zero async void', 'Clean validation messages'],
      rubric: [
        { criterion: 'Type safety & records', points: 40 },
        { criterion: 'Async & LINQ correctness', points: 35 },
        { criterion: 'Documentation & tests', points: 25 },
      ],
      deliverables: ['Program.cs', 'TaskService.cs', 'README.md'],
      submissionInstructions: 'Build with `dotnet test` locally and attach your repository or summary.',
      starterFiles: { 'Program.cs': 'Console.WriteLine(".NET API starter");' },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_postgres_draft',
    techId: 'tech_postgres',
    categoryId: 'cat_db',
    title: 'PostgreSQL Indexing, Transactions & JSONB Engineering',
    slug: 'postgresql-indexing-transactions-draft',
    description: 'Design scalable PostgreSQL schemas using constraints, CTEs, B-Tree/GIN indexes, MVCC transactions, and EXPLAIN ANALYZE.',
    difficulty: 'Intermediate',
    estimatedHours: 16,
    objectives: [
      'Normalize relational tables with strict foreign key and CHECK constraints.',
      'Diagnose sequential scans cleanly using EXPLAIN (ANALYZE, BUFFERS).',
      'Query hybrid relational + JSONB documents with GIN indexes.',
    ],
    prerequisites: ['Foundational SQL SELECT, WHERE, and JOIN familiarity'],
    language: 'sql',
    modules: [
      { id: 'mod_pg_1', title: 'Module 1: Constraints, CTEs & Window Functions', topic: 'Relational Integrity & Analytical SQL', sortOrder: 1 },
      { id: 'mod_pg_2', title: 'Module 2: B-Tree/GIN Indexes, MVCC & Transactions', topic: 'Query Performance & ACID', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_pg_1',
        moduleId: 'mod_pg_1',
        title: 'PostgreSQL Data Types, CHECK Constraints & Foreign Keys',
        slug: 'postgres-types-constraints-draft',
        topicName: 'Schema Safety at the Database Layer',
        summary: 'Use `TIMESTAMPTZ`, `UUID`, `NUMERIC`, and `CHECK` constraints so bad data cannot enter tables.',
        conceptOverview: 'Enforcing invariants directly in PostgreSQL prevents bugs across multiple application services or background scripts.',
        detailedExplanation: 'Prefer `TIMESTAMPTZ` for all timestamps, `NUMERIC` (never float) for money, and named `CHECK` constraints for status enums or positive quantities.',
        concepts: [
          { term: 'TIMESTAMPTZ', definition: 'Timezone-aware UTC timestamp normalized automatically on write.' },
          { term: 'CHECK constraint', definition: 'Row-level predicate evaluated on every INSERT and UPDATE.' },
        ],
        steps: ['Declare explicit `PRIMARY KEY` and `REFERENCES`.', 'Add `CHECK (price_cents >= 0)` on billing tables.'],
        codeTitle: 'Strict PostgreSQL Table DDL',
        code: `CREATE TABLE enrollments (\n  id UUID PRIMARY KEY,\n  learner_id UUID NOT NULL,\n  course_slug TEXT NOT NULL,\n  progress_pct INTEGER NOT NULL CHECK (progress_pct BETWEEN 0 AND 100),\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);`,
        expectedOutput: 'CREATE TABLE',
        mistakes: ['Using `FLOAT` or `REAL` for financial amounts instead of integer cents or `NUMERIC`.'],
        bestPractices: ['Always store timestamps as `TIMESTAMPTZ`.', 'Name critical constraints explicitly for clearer migration diffs.'],
        practicalActivity: 'Write a `CREATE TABLE` statement enforcing `rating BETWEEN 1 AND 5`.',
        starterCode: `CREATE TABLE course_reviews (\n  id SERIAL PRIMARY KEY,\n  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)\n);`,
        solutionHint: 'Include `CHECK (rating BETWEEN 1 AND 5)`.',
        sortOrder: 1,
      },
      {
        id: 'les_pg_2',
        moduleId: 'mod_pg_1',
        title: 'CTEs & Window Functions for Cohort Analytics',
        slug: 'postgres-cte-window-functions-draft',
        topicName: 'Analytical Queries Without Subquery Nesting',
        summary: 'Write readable multi-stage queries using `WITH` CTEs and `ROW_NUMBER()` / `SUM() OVER ()`.',
        conceptOverview: 'Window functions compute rankings and running totals across partitions without collapsing individual rows.',
        detailedExplanation: 'Combine `WITH` common table expressions for clear stages and `PARTITION BY` inside `OVER (...)` to rank learners per course track cleanly.',
        concepts: [
          { term: 'CTE (WITH)', definition: 'Named temporary result set scoped cleanly to a single SQL statement.' },
          { term: 'OVER (PARTITION BY ...)', definition: 'Defines row groups for window calculations without GROUP BY collapsing.' },
        ],
        steps: ['Wrap base aggregation in a `WITH` clause.', 'Apply `RANK() OVER (PARTITION BY course_id ORDER BY xp DESC)`.'],
        codeTitle: 'Window Function Ranking per Track',
        code: `SELECT learner_name, course_id, xp,\n       RANK() OVER (PARTITION BY course_id ORDER BY xp DESC) AS rank_in_course\nFROM cohort_scores;`,
        expectedOutput: 'rank_in_course = 1, 2, ... per course_id',
        mistakes: ['Attempting to filter window functions directly in `WHERE` instead of wrapping in a CTE.'],
        bestPractices: ['Use CTEs to separate filtering, aggregation, and window ranking cleanly.'],
        practicalActivity: 'Rank learners per `track` ordered by descending `score`.',
        starterCode: `SELECT learner, track, score, ROW_NUMBER() OVER (PARTITION BY track ORDER BY score DESC) AS pos FROM attempts;`,
        solutionHint: 'Use `ROW_NUMBER() OVER (PARTITION BY track ORDER BY score DESC)`.',
        sortOrder: 2,
      },
      {
        id: 'les_pg_3',
        moduleId: 'mod_pg_2',
        title: 'Composite B-Tree Indexes & EXPLAIN ANALYZE',
        slug: 'postgres-btree-explain-analyze-draft',
        topicName: 'Column Ordering & Index Scans',
        summary: 'Match composite index column order to equality and range predicates and verify with EXPLAIN ANALYZE.',
        conceptOverview: 'A B-Tree index `(user_id, created_at DESC)` serves `WHERE user_id = $1 ORDER BY created_at DESC` efficiently without extra sorting.',
        detailedExplanation: 'Place high-selectivity equality columns first and range/sort columns last. Always test realistic table sizes with `EXPLAIN (ANALYZE, BUFFERS)`.',
        concepts: [
          { term: 'Left-prefix rule', definition: 'Composite index `(a, b)` accelerates queries filtering on `a` or `(a, b)`.' },
          { term: 'CONCURRENTLY', definition: 'Creates production indexes without blocking concurrent table writes.' },
        ],
        steps: ['Put equality filters before range filters.', 'Verify `Index Scan` replaces `Seq Scan` under `EXPLAIN ANALYZE`.'],
        codeTitle: 'Composite Index for User Activity Feed',
        code: `CREATE INDEX CONCURRENTLY idx_audit_actor_created\nON audit_logs (actor_id, created_at DESC);`,
        expectedOutput: 'CREATE INDEX',
        mistakes: ['Wrapping indexed columns in functions like `LOWER(email)` without creating a matching expression index.'],
        bestPractices: ['Use `CREATE INDEX CONCURRENTLY` in live production migrations.'],
        practicalActivity: 'Write an index statement on `submissions(user_id, created_at DESC)`.',
        starterCode: `CREATE INDEX idx_sub_user_date ON submissions (user_id, created_at DESC);`,
        solutionHint: 'List `user_id` first (equality), then `created_at DESC` (sort).',
        sortOrder: 3,
      },
      {
        id: 'les_pg_4',
        moduleId: 'mod_pg_2',
        title: 'JSONB Documents & GIN Indexes',
        slug: 'postgres-jsonb-gin-draft',
        topicName: 'Hybrid Relational & Document Queries',
        summary: 'Store flexible metadata cleanly in `JSONB` and accelerate containment queries (`@>`) with GIN indexes.',
        conceptOverview: '`JSONB` stores binary pre-parsed JSON supporting indexing, path extraction (`->>`), and containment checks.',
        detailedExplanation: 'Normalize core columns first, use `JSONB` for extensible metadata, and attach a `GIN` index when filtering with `@>`.',
        concepts: [
          { term: 'JSONB', definition: 'Binary JSON storage supporting fast key lookup and GIN indexing.' },
          { term: 'GIN Index', definition: 'Generalized Inverted Index accelerating `@>` JSONB and array containment queries.' },
        ],
        steps: ['Define `metadata JSONB NOT NULL DEFAULT \'{}\'`.', 'Index with `USING GIN (metadata)`.'],
        codeTitle: 'GIN-Indexed JSONB Containment Query',
        code: `CREATE INDEX idx_events_meta_gin ON events USING GIN (metadata);\nSELECT id FROM events WHERE metadata @> '{"plan":"pro"}';`,
        expectedOutput: 'Index Bitmap Scan on idx_events_meta_gin',
        mistakes: ['Storing core foreign keys inside `JSONB` blobs instead of relational columns.'],
        bestPractices: ['Keep core FKs relational; reserve `JSONB` for variable attributes.'],
        practicalActivity: 'Write a `@>` query finding rows whose `tags` JSONB contains `"sql"`.',
        starterCode: `SELECT id FROM articles WHERE meta @> '{"topic":"sql"}';`,
        solutionHint: 'Use the JSONB containment operator `@>`.',
        sortOrder: 4,
      },
      {
        id: 'les_pg_5',
        moduleId: 'mod_pg_2',
        title: 'ACID Transactions, Locks & Concurrency Safety',
        slug: 'postgres-acid-transactions-draft',
        topicName: 'Preventing Lost Updates & Race Conditions',
        summary: 'Coordinate multi-step state updates atomically using `BEGIN/COMMIT` and `SELECT ... FOR UPDATE`.',
        conceptOverview: 'Wrapping balance or enrollment seat updates in transactions prevents partial writes and race conditions under concurrent requests.',
        detailedExplanation: 'Use `BEGIN; ... COMMIT;`, keep transactions short (never hold open across external HTTP calls), and lock critical rows deterministically with `FOR UPDATE`.',
        concepts: [
          { term: 'MVCC', definition: 'Multi-Version Concurrency Control allowing readers and writers not to block each other.' },
          { term: 'FOR UPDATE', definition: 'Acquires an exclusive row lock until transaction commit or rollback.' },
        ],
        steps: ['Begin transaction before checking capacity.', 'Update atomically and commit cleanly.'],
        codeTitle: 'Atomic Seat Reservation Transaction',
        code: `BEGIN;\nUPDATE cohorts SET enrolled_count = enrolled_count + 1\nWHERE id = 'coh_1' AND enrolled_count < max_seats;\nCOMMIT;`,
        expectedOutput: 'COMMIT (atomic conditional increment)',
        mistakes: ['Doing `SELECT` in app code, checking in JS, and running an unguarded `UPDATE` outside a transaction.'],
        bestPractices: ['Use atomic conditional `UPDATE ... WHERE` predicates or `FOR UPDATE` row locks.'],
        practicalActivity: 'Write an atomic SQL `UPDATE` guarding `credits >= 10` inside `WHERE`.',
        starterCode: `UPDATE wallets SET credits = credits - 10 WHERE user_id = 'u1' AND credits >= 10;`,
        solutionHint: 'Enforce the balance check inside the same `UPDATE ... WHERE`.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_pg_mc_1',
        moduleId: 'mod_pg_2',
        lessonId: 'les_pg_4',
        title: 'JSONB Indexing Strategy',
        exerciseType: 'multiple_choice',
        difficulty: 'Intermediate',
        prompt: 'Which PostgreSQL index type accelerates JSONB `@>` containment queries?',
        starterCode: '',
        options: ['GIN', 'HASH only', 'BRIN only', 'Clustered Heap'],
        correctAnswer: 'GIN',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'GIN (Generalized Inverted Index) indexes nested keys/values for `@>` queries.',
        hintText: 'Three-letter acronym starting with G.',
        sortOrder: 1,
      },
      {
        id: 'ex_pg_tf_2',
        moduleId: 'mod_pg_1',
        lessonId: 'les_pg_1',
        title: 'Money Column Precision',
        exerciseType: 'true_false',
        difficulty: 'Beginner',
        prompt: 'True or False: `FLOAT` is recommended over `NUMERIC` or integer cents for currency amounts in PostgreSQL.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'False',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Binary floating point introduces rounding drift; always use integer minor units or `NUMERIC`.',
        hintText: 'Think about `0.1 + 0.2`.',
        sortOrder: 2,
      },
      {
        id: 'ex_pg_write_3',
        moduleId: 'mod_pg_2',
        lessonId: 'les_pg_3',
        title: 'Non-Blocking Production Index',
        exerciseType: 'write_code',
        difficulty: 'Intermediate',
        prompt: 'Write a PostgreSQL index creation command that does not block writes on `users(email)`.',
        starterCode: `-- create non-blocking index on users(email)`,
        options: [],
        correctAnswer: 'CREATE INDEX CONCURRENTLY',
        validationRule: { mode: 'contains_tokens', tokens: ['CONCURRENTLY', 'users', 'email'] },
        explanation: '`CREATE INDEX CONCURRENTLY` avoids holding write-blocking ShareLock across large tables.',
        hintText: 'Add the `CONCURRENTLY` keyword.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_postgres_quiz',
      title: 'PostgreSQL Schema & Indexing Assessment',
      questions: [
        {
          id: 'pg_q1',
          kind: 'multiple_choice',
          prompt: 'Which column order is optimal in a composite B-Tree index for `WHERE tenant_id = $1 AND created_at >= $2 ORDER BY created_at DESC`?',
          options: ['(tenant_id, created_at DESC)', '(created_at, tenant_id)', '(id, created_at)', '(created_at DESC)'],
          correctAnswer: '(tenant_id, created_at DESC)',
          explanation: 'Place equality columns (`tenant_id`) first, followed by range/sort columns (`created_at DESC`).',
        },
        {
          id: 'pg_q2',
          kind: 'true_false',
          prompt: 'True or False: Calling `EXPLAIN ANALYZE` on an `UPDATE` or `DELETE` actually executes the statement unless rolled back.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: '`EXPLAIN ANALYZE` runs the statement to measure real timing—wrap mutating checks in `BEGIN; EXPLAIN ANALYZE ...; ROLLBACK;`.',
        },
        {
          id: 'pg_q3',
          kind: 'multiple_choice',
          prompt: 'Which PostgreSQL type stores JSON pre-parsed in binary form supporting GIN indexing?',
          options: ['JSONB', 'JSONTEXT', 'TEXTJSON', 'CLOB'],
          correctAnswer: 'JSONB',
          explanation: '`JSONB` eliminates repeated text reparsing and supports GIN indexes.',
        },
      ],
    },
    assignment: {
      id: 'asn_pg_analytics',
      title: 'Normalized SaaS Billing Schema & Query Plan Report',
      description: 'Design normalized PostgreSQL tables with constraints, CTE analytics, and composite indexes.',
      instructionsMarkdown: 'Author schema.sql + queries.sql with CHECK constraints, window functions, and EXPLAIN rationale.',
      requirements: ['No float currency columns', 'Composite index covering main dashboard filter'],
      starterFiles: { 'schema.sql': '-- PostgreSQL normalized schema starter\n' },
      rubric: [
        { criterion: 'Constraints & normalization', points: 40 },
        { criterion: 'CTE & window query accuracy', points: 35 },
        { criterion: 'Indexing plan rationale', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_postgres_warehouse',
      title: 'PostgreSQL: Multi-Tenant Learning Telemetry Schema',
      slug: 'postgresql-learning-telemetry-schema',
      category: 'Database Engineering',
      difficulty: 'Intermediate',
      estimatedHours: 7,
      summary: 'Design an ACID-safe PostgreSQL schema with JSONB event attributes, GIN index, and cohort retention CTEs.',
      learningOutcomes: ['Model multi-tenant constraints', 'Write CTE retention queries cleanly'],
      requirements: ['TIMESTAMPTZ everywhere', 'GIN index on JSONB event properties'],
      milestones: [
        { step: 1, title: 'Normalized Core Tables', summary: 'Create workspaces, users, and events DDL.' },
        { step: 2, title: 'Retention CTE Report', summary: 'Compute 7-day active learner metrics.' },
      ],
      checklist: ['CONCURRENTLY migration syntax', 'EXPLAIN notes included', 'Integer minor-unit billing'],
      rubric: [
        { criterion: 'DDL integrity & constraints', points: 40 },
        { criterion: 'Analytical query precision', points: 35 },
        { criterion: 'Indexing strategy', points: 25 },
      ],
      deliverables: ['schema.sql', 'analytics.sql', 'README.md'],
      submissionInstructions: 'Document your EXPLAIN notes and submit your SQL workspace.',
      starterFiles: { 'schema.sql': '-- PostgreSQL telemetry starter\n' },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_mongo_draft',
    techId: 'tech_mongo',
    categoryId: 'cat_db',
    title: 'MongoDB Document Modeling & Aggregation Pipelines',
    slug: 'mongodb-modeling-aggregation-draft',
    description: 'Model embedded vs referenced documents, build fast compound indexes, and author multi-stage Aggregation Pipelines.',
    difficulty: 'Intermediate',
    estimatedHours: 14,
    objectives: [
      'Choose cleanly between embedding and referencing based on cardinality and query patterns.',
      'Construct efficient compound indexes following the ESR (Equality, Sort, Range) rule.',
      'Transform and group collections using `$match`, `$group`, and `$project` pipelines.',
    ],
    prerequisites: ['JSON syntax familiarity and basic database querying concepts'],
    language: 'javascript',
    modules: [
      { id: 'mod_mg_1', title: 'Module 1: Document Modeling & CRUD Queries', topic: 'Embed vs Reference Design', sortOrder: 1 },
      { id: 'mod_mg_2', title: 'Module 2: ESR Compound Indexes & Aggregation', topic: 'Aggregation Framework & Tuning', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_mg_1',
        moduleId: 'mod_mg_1',
        title: 'Document Model Design: Embedding vs Referencing',
        slug: 'mongodb-embed-vs-reference-draft',
        topicName: 'Access-Pattern Driven Schema Design',
        summary: 'Decide when to embed bounded subdocuments vs reference separate collections by ObjectId.',
        conceptOverview: 'Data accessed together should generally live together, unless unbounded array growth threatens the 16MB BSON document limit.',
        detailedExplanation: 'Embed bounded metadata (like a user address or 3 preferences); reference unbounded child streams (comments, activity logs) to avoid document bloat.',
        concepts: [
          { term: 'Bounded array', definition: 'Subdocument list guaranteed to stay small (e.g., 5 tags, 2 addresses).' },
          { term: '16MB BSON limit', definition: 'Maximum size of a single MongoDB document.' },
        ],
        steps: ['Map primary read/write queries first.', 'Split unbounded child entities into indexed collections.'],
        codeTitle: 'Bounded Embedded Document vs Referenced IDs',
        code: `const courseDoc = {\n  slug: 'sql-engineering',\n  title: 'SQL & Relational Databases',\n  tags: ['sql', 'indexing'],\n  stats: { lessons: 6, avgMinutes: 18 }\n};\nconsole.log(JSON.stringify(courseDoc.stats));`,
        expectedOutput: '{"lessons":6,"avgMinutes":18}',
        mistakes: ['Pushing thousands of unbounded audit entries into an embedded array on a User document.'],
        bestPractices: ['Apply Schema Validation (`$jsonSchema`) on collections for data consistency.'],
        practicalActivity: 'Model a blog post with bounded `tags` array and external `authorId` reference.',
        starterCode: `const post = { title: 'MongoDB Indexing', authorId: 'usr_101', tags: ['nosql', 'esr'] };\nconsole.log(post.tags.length);`,
        solutionHint: 'Keep tags bounded in the post document and reference `authorId`.',
        sortOrder: 1,
      },
      {
        id: 'les_mg_2',
        moduleId: 'mod_mg_1',
        title: 'Atomic Updates ($set, $inc, $addToSet) & Projections',
        slug: 'mongodb-atomic-updates-draft',
        topicName: 'Field-Level Mutations Without Overwrites',
        summary: 'Mutate documents atomically with update operators instead of replacing whole documents.',
        conceptOverview: 'Operators like `$set`, `$inc`, and `$addToSet` modify specific fields safely under concurrent requests.',
        detailedExplanation: 'Always pass explicit field projections (`{ passwordHash: 0 }` or allowlisted fields) so sensitive hashes never leave the database.',
        concepts: [
          { term: '$addToSet', definition: 'Appends to an array only if the value is not already present.' },
          { term: '$inc', definition: 'Atomically increments or decrements numeric counters.' },
        ],
        steps: ['Use `updateOne` with `$set` and `$inc`.', 'Guard conditional updates in the filter query.'],
        codeTitle: 'Atomic Counter & Set Update Filter',
        code: `const updateFilter = { _id: 'crs_1', seatsRemaining: { $gt: 0 } };\nconst updateOp = { $inc: { seatsRemaining: -1 }, $addToSet: { enrolledIds: 'usr_42' } };\nconsole.log(updateFilter.seatsRemaining.$gt, updateOp.$inc.seatsRemaining);`,
        expectedOutput: '0 -1',
        mistakes: ['Calling `replaceOne` from partial client payloads and accidentally deleting omitted fields.'],
        bestPractices: ['Use `$set` and explicit projections on every query.'],
        practicalActivity: 'Construct an atomic `$inc` + `$addToSet` update document.',
        starterCode: `const op = { $inc: { xp: 50 }, $addToSet: { badges: 'first-lab' } };\nconsole.log(op.$inc.xp);`,
        solutionHint: 'Combine `$inc` and `$addToSet` in one update object.',
        sortOrder: 2,
      },
      {
        id: 'les_mg_3',
        moduleId: 'mod_mg_2',
        title: 'Compound Indexes & the ESR Rule',
        slug: 'mongodb-esr-compound-indexes-draft',
        topicName: 'Equality -> Sort -> Range Index Ordering',
        summary: 'Design compound indexes that avoid in-memory sort limits using the ESR principle.',
        conceptOverview: 'Order compound index keys as Equality fields first, Sort fields second, and Range fields last.',
        detailedExplanation: 'Putting a range field before a sort field prevents MongoDB from delivering sorted output directly from the index.',
        concepts: [
          { term: 'ESR Rule', definition: 'Equality -> Sort -> Range ordering guideline for compound indexes.' },
        ],
        steps: ['List query predicates by type.', 'Order index keys E -> S -> R cleanly.'],
        codeTitle: 'ESR Compound Index Definition',
        code: `const indexSpec = { category: 1, createdAt: -1, difficultyScore: 1 };\nconsole.log(Object.keys(indexSpec).join(' -> '));`,
        expectedOutput: 'category -> createdAt -> difficultyScore',
        mistakes: ['Creating 15 single-field indexes that bloat write amplification and RAM.'],
        bestPractices: ['Inspect `explain("executionStats")` to verify `totalDocsExamined` stays close to `nReturned`.'],
        practicalActivity: 'Order keys for equality `status`, sort `updatedAt`, range `xp > 100`.',
        starterCode: `const idx = { status: 1, updatedAt: -1, xp: 1 };\nconsole.log(JSON.stringify(idx));`,
        solutionHint: 'Equality (`status`) -> Sort (`updatedAt`) -> Range (`xp`).',
        sortOrder: 3,
      },
      {
        id: 'les_mg_4',
        moduleId: 'mod_mg_2',
        title: 'Aggregation Pipelines: $match, $group & $project',
        slug: 'mongodb-aggregation-pipelines-draft',
        topicName: 'Server-Side Analytics Stages',
        summary: 'Filter early with `$match`, summarize with `$group`, and reshape output using `$project`.',
        conceptOverview: 'Placing `$match` and `$sort` first lets Aggregation Pipelines utilize indexes before transforming documents.',
        detailedExplanation: 'Always shrink documents early with `$match` and `$project` before expensive `$group` or `$lookup` stages.',
        concepts: [
          { term: '$match', definition: 'Filters stream early—leveraging indexes at pipeline start.' },
          { term: '$group', definition: 'Aggregates documents by `_id` key using `$sum`, `$avg`, `$max`.' },
        ],
        steps: ['Start pipeline with `$match`.', 'Group by category with `$sum: 1` and `$avg`.'],
        codeTitle: 'Cohort Aggregation Pipeline Stages',
        code: `const pipeline = [\n  { $match: { status: 'published' } },\n  { $group: { _id: '$category', totalCourses: { $sum: 1 } } },\n  { $sort: { totalCourses: -1 } }\n];\nconsole.log('Stages:', pipeline.length);`,
        expectedOutput: 'Stages: 3',
        mistakes: ['Running `$lookup` or `$unwind` across an entire unfiltered collection first.'],
        bestPractices: ['Put `$match` as Stage 1 whenever possible.'],
        practicalActivity: 'Build a 3-stage pipeline grouping completed lessons per track.',
        starterCode: `const stages = [{ $match: { completed: true } }, { $group: { _id: '$courseId', done: { $sum: 1 } } }];\nconsole.log(stages[1].$group.done.$sum);`,
        solutionHint: 'Use `$match` first, then `$group`.',
        sortOrder: 4,
      },
      {
        id: 'les_mg_5',
        moduleId: 'mod_mg_2',
        title: 'Schema Validation ($jsonSchema) & Multi-Document Transactions',
        slug: 'mongodb-schema-validation-draft',
        topicName: 'Guardrails & Replica Set Transactions',
        summary: 'Enforce collection-level schema rules and coordinate multi-collection writes cleanly.',
        conceptOverview: 'MongoDB supports native JSON Schema validation (`$jsonSchema`) so malformed writes are rejected consistently.',
        detailedExplanation: 'Design around single-document atomicity whenever practical, reserving multi-document transactions for cross-collection invariants.',
        concepts: [
          { term: '$jsonSchema', definition: 'Server-enforced JSON Schema rules applied on insert/update.' },
        ],
        steps: ['Attach `validator: { $jsonSchema: ... }`.', 'Test invalid payloads against `validationAction: "error"`.'],
        codeTitle: 'Collection JSON Schema Validator',
        code: `const validator = {\n  $jsonSchema: {\n    bsonType: 'object',\n    required: ['email', 'role'],\n    properties: { email: { bsonType: 'string' }, role: { enum: ['learner', 'instructor', 'admin'] } }\n  }\n};\nconsole.log(validator.$jsonSchema.required.join(','));`,
        expectedOutput: 'email,role',
        mistakes: ['Disabling validation in production without application-layer schema checks.'],
        bestPractices: ['Combine TypeScript runtime validation (e.g., Zod) with `$jsonSchema`.'],
        practicalActivity: 'Define required fields `["title", "slug"]` inside a `$jsonSchema` validator.',
        starterCode: `const schema = { bsonType: 'object', required: ['title', 'slug'] };\nconsole.log(schema.required.length);`,
        solutionHint: 'List required fields inside `required: [...]`.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_mg_mc_1',
        moduleId: 'mod_mg_2',
        lessonId: 'les_mg_3',
        title: 'ESR Index Ordering',
        exerciseType: 'multiple_choice',
        difficulty: 'Intermediate',
        prompt: 'In MongoDB compound index design, what does the ESR acronym stand for?',
        starterCode: '',
        options: ['Equality, Sort, Range', 'Encode, Scan, Reduce', 'Evaluate, Split, Return', 'Entry, Shard, Replica'],
        correctAnswer: 'Equality, Sort, Range',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'ESR puts Equality keys first, Sort keys second, and Range keys last.',
        hintText: 'Think about avoiding in-memory sort stages.',
        sortOrder: 1,
      },
      {
        id: 'ex_mg_tf_2',
        moduleId: 'mod_mg_1',
        lessonId: 'les_mg_1',
        title: 'Unbounded Embedded Arrays',
        exerciseType: 'true_false',
        difficulty: 'Beginner',
        prompt: 'True or False: Storing millions of unbounded event logs inside an embedded array on a single User document is an anti-pattern in MongoDB.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'True',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Unbounded arrays grow past the 16MB document limit and cause frequent document reallocations.',
        hintText: 'Consider the 16MB BSON limit.',
        sortOrder: 2,
      },
      {
        id: 'ex_mg_write_3',
        moduleId: 'mod_mg_2',
        lessonId: 'les_mg_4',
        title: 'Aggregation Match Stage',
        exerciseType: 'write_code',
        difficulty: 'Beginner',
        prompt: 'Write the opening MongoDB aggregation stage that filters documents with `status: "active"`.',
        starterCode: `const firstStage = /* ... */;`,
        options: [],
        correctAnswer: '$match',
        validationRule: { mode: 'contains_tokens', tokens: ['$match', 'status', 'active'] },
        explanation: 'Filtering with `$match` first allows index usage before grouping.',
        hintText: 'Use `{ $match: { status: "active" } }`.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_mongo_quiz',
      title: 'MongoDB Document Design & Aggregation Quiz',
      questions: [
        {
          id: 'mg_q1',
          kind: 'multiple_choice',
          prompt: 'Which update operator adds an item to an array only if it does not already exist?',
          options: ['$addToSet', '$push', '$inc', '$rename'],
          correctAnswer: '$addToSet',
          explanation: '`$addToSet` treats the array like a mathematical set.',
        },
        {
          id: 'mg_q2',
          kind: 'true_false',
          prompt: 'True or False: Placing `$match` at the beginning of an aggregation pipeline helps MongoDB use collection indexes.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Leading `$match` and `$sort` stages compile into index scans.',
        },
        {
          id: 'mg_q3',
          kind: 'multiple_choice',
          prompt: 'What is the maximum BSON size of a single MongoDB document?',
          options: ['16 MB', '64 KB', '1 GB', '4 MB'],
          correctAnswer: '16 MB',
          explanation: 'Single BSON documents are capped at 16 MB.',
        },
      ],
    },
    assignment: {
      id: 'asn_mongo_catalog',
      title: 'Catalog Schema & Aggregation Analytics Report',
      description: 'Model Braincode courses and enrollments in MongoDB JSON schemas + ESR index specification.',
      instructionsMarkdown: 'Document embed-vs-reference decisions, ESR index specs, and a 3-stage aggregation query.',
      requirements: ['No unbounded embedded arrays', 'Includes ESR compound index justification'],
      starterFiles: { 'pipeline.js': 'const pipeline = [];\n' },
      rubric: [
        { criterion: 'Document boundary decisions', points: 40 },
        { criterion: 'ESR index design', points: 35 },
        { criterion: 'Aggregation pipeline clarity', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_mongo_analytics',
      title: 'MongoDB: Course Telemetry & Aggregation Pipeline Kit',
      slug: 'mongodb-course-telemetry-kit',
      category: 'NoSQL Database',
      difficulty: 'Intermediate',
      estimatedHours: 6,
      summary: 'Design validated collections, ESR compound indexes, and analytical pipelines for course completion tracking.',
      learningOutcomes: ['Author $jsonSchema collection rules', 'Optimize pipelines with leading $match'],
      requirements: ['ESR compound index', '$group summary stage'],
      milestones: [
        { step: 1, title: 'Document Schemas', summary: 'Define course and progress documents.' },
        { step: 2, title: 'Pipelines & Indexes', summary: 'Configure ESR index and group summary.' },
      ],
      checklist: ['Bounded arrays only', '$jsonSchema enforced', 'Projections omit internal fields'],
      rubric: [
        { criterion: 'Schema & validation', points: 40 },
        { criterion: 'Index & pipeline design', points: 60 },
      ],
      deliverables: ['schema.json', 'pipeline.js', 'README.md'],
      submissionInstructions: 'Document query shapes and attach your pipeline scripts.',
      starterFiles: { 'pipeline.js': 'console.log("MongoDB analytics kit");\n' },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_nextjs_draft',
    techId: 'tech_nextjs',
    categoryId: 'cat_frameworks',
    title: 'Next.js App Router, Server Components & Full-Stack Data',
    slug: 'nextjs-app-router-fullstack-draft',
    description: 'Master file-based routing, Server vs Client Components, caching boundaries, Server Actions, and route handlers in Next.js.',
    difficulty: 'Intermediate',
    estimatedHours: 16,
    objectives: [
      'Separate Server Components cleanly from interactive `"use client"` leaf islands.',
      'Implement dynamic routes, loading boundaries, and typed metadata.',
      'Validate mutations safely in Route Handlers and Server Actions.',
    ],
    prerequisites: ['React component/hooks basics and TypeScript fundamentals'],
    language: 'tsx',
    modules: [
      { id: 'mod_nx_1', title: 'Module 1: App Router, Layouts & Server Components', topic: 'RSC Architecture & Metadata', sortOrder: 1 },
      { id: 'mod_nx_2', title: 'Module 2: Data Fetching, Mutations & Security Boundaries', topic: 'Route Handlers, Validation & Streaming', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_nx_1',
        moduleId: 'mod_nx_1',
        title: 'File-System App Router, Layouts & Nested Routes',
        slug: 'nextjs-app-router-layouts-draft',
        topicName: 'Layouts, Pages & Loading States',
        summary: 'Organize persistent shells in `layout.tsx` and stream page segments cleanly.',
        conceptOverview: 'The App Router maps directories under `app/` directly to URL segments while preserving shared layouts across navigation.',
        detailedExplanation: '`layout.tsx` wraps child pages without unmounting state across sibling transitions, and `loading.tsx` wraps routes automatically in React `Suspense`.',
        concepts: [
          { term: 'page.tsx', definition: 'Makes a route segment publicly accessible and renders its UI.' },
          { term: 'layout.tsx', definition: 'Shared UI wrapper preserving state across child segment navigation.' },
        ],
        steps: ['Create `app/courses/layout.tsx`.', 'Add `app/courses/[slug]/page.tsx` receiving `params`.'],
        codeTitle: 'Dynamic App Router Page Component',
        code: `export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {\n  const { slug } = await params;\n  return <main><h1>Course: {slug}</h1></main>;\n}`,
        expectedOutput: '<main><h1>Course: react-hooks</h1></main>',
        mistakes: ['Importing heavy client-only chart libraries into root Server layouts unnecessarily.'],
        bestPractices: ['Co-locate `loading.tsx` and `error.tsx` per route boundary.'],
        practicalActivity: 'Write a dynamic `[slug]/page.tsx` extracting `slug` safely.',
        starterCode: `export function renderCourseHeading(slug: string) {\n  return \`Course Track: \${slug}\`;\n}`,
        solutionHint: 'Await `params` in Next.js 15+ App Router pages.',
        sortOrder: 1,
      },
      {
        id: 'les_nx_2',
        moduleId: 'mod_nx_1',
        title: 'Server Components vs Client Components (`"use client"`)',
        slug: 'nextjs-rsc-client-boundaries-draft',
        topicName: 'Zero-Bundle Server Rendering vs Interactive Islands',
        summary: 'Keep secret queries and heavy Markdown parsing on the server while isolating state/events into Client Components.',
        conceptOverview: 'Components in App Router are Server Components by default; add `"use client"` only on interactive leaf components needing hooks or browser APIs.',
        detailedExplanation: 'Never import server database credentials into `"use client"` modules; pass serialized plain props down from Server parents instead.',
        concepts: [
          { term: '"use client" directive', definition: 'Marks the network boundary where interactive React hooks hydrate in the browser.' },
        ],
        steps: ['Fetch data cleanly inside Server Component.', 'Render interactive `<FilterControls />` client child.'],
        codeTitle: 'Server Parent Passing Serialized Data to Client Island',
        code: `// Server wrapper concept\nfunction serializeProps(items: Array<{ id: string; title: string }>) {\n  return items.map((x) => ({ id: x.id, title: x.title }));\n}`,
        expectedOutput: '[{ id, title }] plain JSON-serializable props',
        mistakes: ['Passing non-serializable class instances or functions from Server Components to Client Components.'],
        bestPractices: ['Push `"use client"` boundaries as close to leaf controls as possible.'],
        practicalActivity: 'Identify which props are JSON-serializable across the RSC boundary.',
        starterCode: `type SafeCardProps = { id: string; title: string; published: boolean };`,
        solutionHint: 'Use plain objects, strings, numbers, booleans, and arrays across RSC boundaries.',
        sortOrder: 2,
      },
      {
        id: 'les_nx_3',
        moduleId: 'mod_nx_2',
        title: 'Dynamic SEO Metadata & Open Graph Generation',
        slug: 'nextjs-metadata-seo-draft',
        topicName: 'Typed Metadata API',
        summary: 'Export `generateMetadata` to populate per-route titles, descriptions, and social cards dynamically.',
        conceptOverview: 'Next.js deduplicates `fetch` / metadata lookups and injects clean `<title>` and `<meta>` tags during server rendering.',
        detailedExplanation: 'Always sanitize missing slugs with `notFound()` rather than rendering blank placeholder metadata.',
        concepts: [
          { term: 'generateMetadata', definition: 'Async server function computing route-specific SEO head tags.' },
        ],
        steps: ['Implement `generateMetadata` returning `title` and `description`.', 'Call `notFound()` when item lookup returns null.'],
        codeTitle: 'Dynamic Route Metadata Helper',
        code: `export function buildMeta(title: string, summary: string) {\n  return { title: \`\${title} | Braincode\`, description: summary.slice(0, 155) };\n}`,
        expectedOutput: '{ title: "React | Braincode", description: "..." }',
        mistakes: ['Leaking private/draft course titles inside public `generateMetadata`.'],
        bestPractices: ['Verify publication flags before returning metadata.'],
        practicalActivity: 'Format clean `<title>` and `<meta>` description helpers under 160 chars.',
        starterCode: `function formatSeo(name: string) { return \`Learn \${name} | Braincode\`; }`,
        solutionHint: 'Append `| Braincode` consistently.',
        sortOrder: 3,
      },
      {
        id: 'les_nx_4',
        moduleId: 'mod_nx_2',
        title: 'Route Handlers, Server Actions & Auth Guards',
        slug: 'nextjs-route-handlers-security-draft',
        topicName: 'Validating Mutations at Every Entry Point',
        summary: 'Verify session authentication, authorization roles, and schema payloads inside every Server Action and Route Handler.',
        conceptOverview: 'Server Actions are public HTTP POST endpoints under the hood—always authenticate and authorize inside the action itself.',
        detailedExplanation: 'Never trust hidden form inputs for `userId` or `priceCents`; derive user identity from verified session cookies on the server.',
        concepts: [
          { term: 'Server Action guard', definition: 'Explicit session + input validation executed at the start of every `"use server"` mutation.' },
        ],
        steps: ['Verify `session?.user` at line 1 of the handler.', 'Validate input shapes and call `revalidatePath` on success.'],
        codeTitle: 'Authenticated Mutation Validation Pattern',
        code: `function assertAuthorized(userId: string | null, ownerId: string) {\n  if (!userId) throw new Error('AUTH_REQUIRED');\n  if (userId !== ownerId) throw new Error('FORBIDDEN');\n}`,
        expectedOutput: 'Throws AUTH_REQUIRED or FORBIDDEN cleanly',
        mistakes: ['Checking auth only in Next.js middleware without verifying inside Server Actions.'],
        bestPractices: ['Enforce defense-in-depth auth checks inside every handler and action.'],
        practicalActivity: 'Write a guard helper verifying `session?.user` and title length >= 3.',
        starterCode: `function validateNoteInput(userId: string | null, note: string) {\n  return Boolean(userId && note.trim().length >= 3);\n}`,
        solutionHint: 'Reject missing `userId` or blank strings.',
        sortOrder: 4,
      },
      {
        id: 'les_nx_5',
        moduleId: 'mod_nx_2',
        title: 'Caching Strategies, Revalidation & Streaming UI',
        slug: 'nextjs-caching-streaming-draft',
        topicName: 'Static vs Dynamic Rendering & Suspense',
        summary: 'Balance static edge speed with fresh dynamic user state using targeted revalidation and Suspense.',
        conceptOverview: 'Keep user-specific dashboards dynamic while statically caching public catalog pages with tag-based revalidation (`revalidateTag`).',
        detailedExplanation: 'Isolate user-cookie reads inside dynamic child `<Suspense>` boundaries so public shells render instantaneously.',
        concepts: [
          { term: 'revalidateTag', definition: 'Invalidates cached server data selectively after an admin curriculum update.' },
        ],
        steps: ['Wrap slow panels in `<Suspense fallback={<Skeleton />}>`.', 'Invalidate catalog tags on CMS publish events.'],
        codeTitle: 'Suspense Stream Boundary Design',
        code: `type CachePolicy = { scope: 'public' | 'user'; revalidateSeconds: number };\nconst catalogPolicy: CachePolicy = { scope: 'public', revalidateSeconds: 300 };`,
        expectedOutput: '{ scope: "public", revalidateSeconds: 300 }',
        mistakes: ['Accidentally caching personalized user responses under shared public cache keys.'],
        bestPractices: ['Never cache responses containing user session cookies.'],
        practicalActivity: 'Distinguish public catalog caching from uncached per-user dashboards.',
        starterCode: `const shouldCache = (isAuthenticatedEndpoint: boolean) => !isAuthenticatedEndpoint;`,
        solutionHint: 'Disable shared caching on user-authenticated responses.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_nx_mc_1',
        moduleId: 'mod_nx_1',
        lessonId: 'les_nx_2',
        title: 'Client Component Directive',
        exerciseType: 'multiple_choice',
        difficulty: 'Beginner',
        prompt: 'Which file-top directive is required when a Next.js App Router component uses `useState` or `onClick` handlers?',
        starterCode: '',
        options: ['"use client"', '"use browser"', '"use hooks"', '"use state"'],
        correctAnswer: '"use client"',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Adding `"use client"` marks the interactive client boundary.',
        hintText: 'Exact string literal at line 1 of the file.',
        sortOrder: 1,
      },
      {
        id: 'ex_nx_tf_2',
        moduleId: 'mod_nx_2',
        lessonId: 'les_nx_4',
        title: 'Server Action Authentication',
        exerciseType: 'true_false',
        difficulty: 'Intermediate',
        prompt: 'True or False: Next.js Server Actions should validate caller authentication and ownership directly inside each action.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'True',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Server Actions expose callable POST endpoints and must verify session + ownership every time.',
        hintText: 'Think defense-in-depth.',
        sortOrder: 2,
      },
      {
        id: 'ex_nx_write_3',
        moduleId: 'mod_nx_2',
        lessonId: 'les_nx_4',
        title: 'Session Guard Check',
        exerciseType: 'write_code',
        difficulty: 'Intermediate',
        prompt: 'Add an authentication check throwing or returning early if `!userId`.',
        starterCode: `async function saveDraft(userId: string | null, title: string) {\n  // guard unauthenticated calls\n}`,
        options: [],
        correctAnswer: 'if (!userId)',
        validationRule: { mode: 'contains_tokens', tokens: ['!userId'] },
        explanation: 'Checking `if (!userId)` immediately protects private mutations.',
        hintText: 'Guard `!userId` before mutating state.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_nextjs_quiz',
      title: 'Next.js App Router & RSC Architecture Check',
      questions: [
        {
          id: 'nx_q1',
          kind: 'multiple_choice',
          prompt: 'By default in the Next.js App Router, components inside `app/` are rendered as:',
          options: ['Server Components', 'Client-only SPAs', 'Web Workers', 'Legacy Pages Router SSR'],
          correctAnswer: 'Server Components',
          explanation: 'Components default to Server Components unless `"use client"` is declared.',
        },
        {
          id: 'nx_q2',
          kind: 'true_false',
          prompt: 'True or False: You should import database secret keys directly inside a `"use client"` component.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Client bundles ship to browsers; keep secrets strictly on the server.',
        },
        {
          id: 'nx_q3',
          kind: 'multiple_choice',
          prompt: 'Which special file automatically wraps a Next.js route segment in a React Suspense loading UI?',
          options: ['loading.tsx', 'spinner.tsx', 'fallback.tsx', 'pending.tsx'],
          correctAnswer: 'loading.tsx',
          explanation: '`loading.tsx` provides instant route transition loading states via React Suspense.',
        },
      ],
    },
    assignment: {
      id: 'asn_nextjs_portal',
      title: 'App Router Course Directory & Protected Notes Feature',
      description: 'Design Server Components for public catalog routes and authenticated Client + Server Action notes.',
      instructionsMarkdown: 'Separate Server data fetching cleanly from `"use client"` interactive controls and protect notes with session checks.',
      requirements: ['Leaf-only `"use client"` islands', 'Server-side auth validation on mutations'],
      starterFiles: { 'app/page.tsx': 'export default function Home() { return <main>Next.js App</main>; }\n' },
      rubric: [
        { criterion: 'RSC boundary separation', points: 40 },
        { criterion: 'Mutation validation & error handling', points: 35 },
        { criterion: 'Metadata & loading UX', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_nextjs_catalog',
      title: 'Next.js: App Router Technology Docs & Notes App',
      slug: 'nextjs-app-router-docs-notes',
      category: 'Full-Stack Web',
      difficulty: 'Intermediate',
      estimatedHours: 8,
      summary: 'Architect a fast Server-rendered docs browser with dynamic routes, Suspense loading boundaries, and authenticated notes.',
      learningOutcomes: ['Separate RSC and Client islands cleanly', 'Generate dynamic SEO metadata'],
      requirements: ['Dynamic [slug] pages', 'Protected mutation validation'],
      milestones: [
        { step: 1, title: 'Layouts & Dynamic Pages', summary: 'Configure App Router hierarchy and loading.tsx.' },
        { step: 2, title: 'Client Islands & Actions', summary: 'Connect interactive filters and validated notes.' },
      ],
      checklist: ['Zero server secrets in client bundles', 'Suspense fallback present', 'SEO metadata configured'],
      rubric: [
        { criterion: 'Server/Client component architecture', points: 45 },
        { criterion: 'Validation & security boundaries', points: 35 },
        { criterion: 'UX polish & metadata', points: 20 },
      ],
      deliverables: ['app/layout.tsx', 'app/learn/[slug]/page.tsx', 'README.md'],
      submissionInstructions: 'Verify client bundle hygiene and submit your repository link.',
      starterFiles: { 'app/page.tsx': 'export default function Page() { return <main>Next.js Starter</main>; }\n' },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_tailwind_draft',
    techId: 'tech_tailwind',
    categoryId: 'cat_frontend',
    title: 'Tailwind CSS Design Systems & Responsive Precision',
    slug: 'tailwind-css-design-systems-draft',
    description: 'Build crisp, accessible, dark-mode-ready interfaces cleanly using Tailwind CSS v4 tokens, spacing scales, and responsive utilities.',
    difficulty: 'Beginner',
    estimatedHours: 12,
    objectives: [
      'Compose consistent layouts with Tailwind Flex, Grid, and spacing utilities.',
      'Implement clean light/dark surface hierarchies without custom CSS sprawl.',
      'Build accessible focus rings, keyboard targets, and mobile-first breakpoints.',
    ],
    prerequisites: ['Basic HTML and CSS box model familiarity'],
    language: 'html',
    modules: [
      { id: 'mod_tw_1', title: 'Module 1: Utility Scale, Layout & Responsive Breakpoints', topic: 'Mobile-First Flex, Grid & Spacing', sortOrder: 1 },
      { id: 'mod_tw_2', title: 'Module 2: Dark Mode, States & Component Patterns', topic: 'Contrast, Focus Rings & Composition', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_tw_1',
        moduleId: 'mod_tw_1',
        title: 'Utility-First Layout, Spacing Scale & Responsive Grid',
        slug: 'tailwind-layout-spacing-grid-draft',
        topicName: 'Mobile-First Grids Without Custom CSS Bloat',
        summary: 'Use Tailwind spacing tokens (`p-4`, `gap-6`) and responsive grid prefixes (`sm:`, `lg:`) coherently.',
        conceptOverview: 'Tailwind utilities apply predictable 4px spacing increments (`4` = `1rem`) directly in markup so layout relationships stay transparent.',
        detailedExplanation: 'Author unprefixed utilities for mobile (`grid-cols-1`), then enhance upward with `md:grid-cols-2 lg:grid-cols-3`.',
        concepts: [
          { term: 'Mobile-first prefix (`lg:`)', definition: 'Applies rules from the breakpoint width and upward.' },
          { term: 'gap-4 / p-6', definition: 'Consistent 1rem / 1.5rem spacing tokens aligned to a harmonic scale.' },
        ],
        steps: ['Start single-column with `grid grid-cols-1 gap-4`.', 'Scale columns cleanly via `md:grid-cols-2 lg:grid-cols-3`.'],
        codeTitle: 'Responsive 3-Card Utility Grid',
        code: `<div style="font-family:system-ui;padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">\n  <div style="padding:16px;border:1px solid #cbd5e1;border-radius:12px;"><strong>Track 1</strong><p>Semantic UI</p></div>\n  <div style="padding:16px;border:1px solid #cbd5e1;border-radius:12px;"><strong>Track 2</strong><p>Design Tokens</p></div>\n</div>`,
        expectedOutput: '2 responsive cards rendered side by side on wide screens',
        mistakes: ['Mixing arbitrary pixel classes (`w-[347px]`) everywhere instead of design-scale utilities.'],
        bestPractices: ['Extract repeated markup into React components rather than copying huge class strings without structure.'],
        practicalActivity: 'Build a responsive 2-column feature layout that collapses cleanly on narrow mobile screens.',
        starterCode: `<section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">\n  <article style="padding:14px;border:1px solid #334155;border-radius:10px;">Card A</article>\n  <article style="padding:14px;border:1px solid #334155;border-radius:10px;">Card B</article>\n</section>`,
        solutionHint: 'Use `grid-cols-1 md:grid-cols-2 gap-4` in Tailwind projects.',
        sortOrder: 1,
      },
      {
        id: 'les_tw_2',
        moduleId: 'mod_tw_1',
        title: 'Typography Hierarchy & Tabular Numeric Alignment',
        slug: 'tailwind-typography-tabular-draft',
        topicName: 'Readability, Measure & KPI Alignment',
        summary: 'Pair line-height, max-width (`max-w-prose`), and `tabular-nums` cleanly for interfaces and metrics.',
        conceptOverview: 'Long paragraphs need `max-w-2xl leading-relaxed`, while prices, XP counters, and timestamps need `tabular-nums` so columns never jitter.',
        detailedExplanation: 'Use deliberate contrast between headings (`font-bold tracking-tight`) and muted secondary labels.',
        concepts: [
          { term: 'tabular-nums', definition: 'Renders digits in equal widths so KPI counters align vertically.' },
        ],
        steps: ['Cap reading copy at `max-w-2xl`.', 'Apply `tabular-nums` to table numbers and metrics.'],
        codeTitle: 'Aligned KPI Metric Card HTML',
        code: `<div style="font-family:system-ui;padding:16px;border:1px solid #cbd5e1;border-radius:12px;">\n  <div style="font-size:12px;color:#64748b;">LESSONS COMPLETED</div>\n  <div style="font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;">14 / 20</div>\n</div>`,
        expectedOutput: 'Aligned KPI metric card displaying 14 / 20',
        mistakes: ['Letting article prose stretch across 1400px ultra-wide monitors without `max-w-*`.'],
        bestPractices: ['Enforce 60–75 character line lengths on lesson prose.'],
        practicalActivity: 'Create a 3-stat summary strip with uniform `tabular-nums` alignment.',
        starterCode: `<div style="display:flex;gap:16px;font-variant-numeric:tabular-nums;"><span>XP: 450</span><span>Streak: 7d</span></div>`,
        solutionHint: 'Combine clear weight contrast with `tabular-nums`.',
        sortOrder: 2,
      },
      {
        id: 'les_tw_3',
        moduleId: 'mod_tw_2',
        title: 'Dark Mode Tokens & Surface Elevation Hierarchy',
        slug: 'tailwind-dark-mode-surfaces-draft',
        topicName: 'Accessible Light & Dark Palettes',
        summary: 'Build cohesive `dark:` surfaces using controlled slate/obsidian tones rather than washed-out gray text.',
        conceptOverview: 'Effective dark mode elevates cards cleanly above background canvas via subtle 1px borders (`border-white/10`) and crisp contrast.',
        detailedExplanation: 'Pair `bg-white dark:bg-[#0B0F17]` cards over `bg-slate-50 dark:bg-[#05070A]` page backgrounds with >=4.5:1 text contrast.',
        concepts: [
          { term: 'Surface layering', definition: 'Distinguishing page backdrop, card container, and hover state via controlled tonal steps.' },
        ],
        steps: ['Define base canvas vs card background.', 'Verify foreground text readability in both themes.'],
        codeTitle: 'Light/Dark Contrast Card Preview',
        code: `<div style="background:#0B0F17;color:#F8FAFC;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,.12);font-family:system-ui;">\n  <strong>Obsidian Card Surface</strong>\n  <p style="color:#94A3B8;margin:4px 0 0;font-size:13px;">High-contrast subtle border separation.</p>\n</div>`,
        expectedOutput: 'Elevated dark-surface card with crisp text contrast',
        mistakes: ['Using `#000` pure black cards on `#000` pure black backgrounds with no border.'],
        bestPractices: ['Test every view in both Light and Dark modes before shipping.'],
        practicalActivity: 'Design a surface card pairing a clear border and muted secondary caption.',
        starterCode: `<article style="background:#0B0F17;color:#fff;padding:16px;border-radius:12px;border:1px solid #1e293b;">Panel</article>`,
        solutionHint: 'Separate card from canvas with a 1px border.',
        sortOrder: 3,
      },
      {
        id: 'les_tw_4',
        moduleId: 'mod_tw_2',
        title: 'Interactive Focus Rings, Hover & Group Modifiers',
        slug: 'tailwind-interactive-focus-states-draft',
        topicName: 'Keyboard-Accessible Controls',
        summary: 'Style `:hover`, `:focus-visible`, `disabled:`, and `group-hover:` cleanly for accessible buttons and cards.',
        conceptOverview: 'Replacing browser default outlines requires an explicit `focus-visible:ring-2 focus-visible:ring-[#0A84FF]` alternative.',
        detailedExplanation: 'Never ship `focus:outline-none` without a clear `focus-visible:ring-*` replacement so keyboard users always see focus.',
        concepts: [
          { term: 'focus-visible:', definition: 'Displays high-visibility focus rings for keyboard navigation without noisy mouse click outlines.' },
        ],
        steps: ['Add `focus-visible:ring-2` on interactive buttons.', 'Style `disabled:opacity-50` clearly.'],
        codeTitle: 'Accessible Interactive Button State Markup',
        code: `<button type="button" style="background:#0A84FF;color:#fff;padding:10px 18px;border:none;border-radius:10px;font-weight:600;cursor:pointer;">Continue Lesson</button>`,
        expectedOutput: 'Accessible primary CTA button',
        mistakes: ['Removing outline completely with `outline-none` without adding `focus-visible:ring-*`.'],
        bestPractices: ['Ensure clickable controls maintain at least 36px–44px comfortable height on touch screens.'],
        practicalActivity: 'Style an interactive card button with clear hover and disabled feedback.',
        starterCode: `<button type="button" style="padding:10px 16px;border-radius:8px;background:#0A84FF;color:#fff;border:none;">Action</button>`,
        solutionHint: 'Pair `focus-visible:outline-2` or `focus-visible:ring-2`.',
        sortOrder: 4,
      },
      {
        id: 'les_tw_5',
        moduleId: 'mod_tw_2',
        title: 'Tailwind CSS v4 `@import "tailwindcss"` & `@theme` Tokens',
        slug: 'tailwind-v4-theme-tokens-draft',
        topicName: 'Modern CSS-First Configuration',
        summary: 'Configure brand colors, fonts, and dark-mode variants natively inside `index.css` in Tailwind CSS v4.',
        conceptOverview: 'Tailwind v4 eliminates heavy JavaScript config boilerplate by exposing `@theme` tokens directly inside standard CSS.',
        detailedExplanation: 'Declare `--font-sans` and brand variables in `@theme` alongside `@custom-variant dark (&:where(.dark, .dark *));` for class-based theme toggling.',
        concepts: [
          { term: '@theme directive', definition: 'Defines custom design tokens directly inside your CSS stylesheet.' },
        ],
        steps: ['Import `@import "tailwindcss";` cleanly.', 'Define brand accent and surface variables in `@theme`.'],
        codeTitle: 'Tailwind v4 CSS Theme Declaration Reference',
        code: `/* In index.css:\n   @import "tailwindcss";\n   @custom-variant dark (&:where(.dark, .dark *));\n*/\n<div style="font-family:system-ui;padding:12px;border-left:4px solid #0A84FF;">Tailwind v4 Token Ready</div>`,
        expectedOutput: 'Token-styled banner rendered',
        mistakes: ['Mixing stale Tailwind v3 plugin syntax with `@import "tailwindcss"` arbitrarily.'],
        bestPractices: ['Keep design tokens centralized in CSS variables.'],
        practicalActivity: 'Define primary `#0A84FF` accent styling consistently across two UI elements.',
        starterCode: `<div style="border:1px solid #0A84FF;color:#0A84FF;padding:10px;border-radius:8px;">Brand Accent Token</div>`,
        solutionHint: 'Keep CSS custom properties consistent across light and dark modes.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_tw_mc_1',
        moduleId: 'mod_tw_2',
        lessonId: 'les_tw_4',
        title: 'Keyboard Focus Visibility',
        exerciseType: 'multiple_choice',
        difficulty: 'Beginner',
        prompt: 'Which Tailwind variant displays a focus ring primarily during keyboard Tab navigation without cluttering mouse clicks?',
        starterCode: '',
        options: ['focus-visible:', 'hover-ring:', 'tab-only:', 'active-focus:'],
        correctAnswer: 'focus-visible:',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: '`focus-visible:` targets keyboard navigation cleanly while preserving aesthetics on mouse click.',
        hintText: 'Matches CSS `:focus-visible`.',
        sortOrder: 1,
      },
      {
        id: 'ex_tw_tf_2',
        moduleId: 'mod_tw_1',
        lessonId: 'les_tw_1',
        title: 'Mobile-First Responsive Breakpoints',
        exerciseType: 'true_false',
        difficulty: 'Beginner',
        prompt: 'True or False: In Tailwind CSS, `md:grid-cols-2` applies two columns at medium screens and smaller.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'False',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'Tailwind breakpoints are mobile-first (`min-width`), so `md:` applies at medium screens AND larger.',
        hintText: 'Unprefixed classes target mobile; `md:` applies upward.',
        sortOrder: 2,
      },
      {
        id: 'ex_tw_fill_3',
        moduleId: 'mod_tw_1',
        lessonId: 'les_tw_2',
        title: 'Aligned Numeric Utility',
        exerciseType: 'fill_blank',
        difficulty: 'Beginner',
        prompt: 'Complete the Tailwind utility class that forces digits into uniform width so KPI counters align vertically: ______-nums',
        starterCode: '',
        options: [],
        correctAnswer: 'tabular',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: '`tabular-nums` enables `font-variant-numeric: tabular-nums`.',
        hintText: 'Think of data tables (`tabular`).',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_tailwind_quiz',
      title: 'Tailwind CSS Architecture & Accessibility Check',
      questions: [
        {
          id: 'tw_q1',
          kind: 'multiple_choice',
          prompt: 'Which class limits paragraph line length cleanly for comfortable reading?',
          options: ['max-w-prose', 'w-screen', 'whitespace-nowrap', 'truncate-all'],
          correctAnswer: 'max-w-prose',
          explanation: '`max-w-prose` caps line width around ~65 characters.',
        },
        {
          id: 'tw_q2',
          kind: 'true_false',
          prompt: 'True or False: Tailwind CSS v4 configures theme tokens directly via `@theme` inside CSS without requiring a JS config file.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Tailwind v4 adopts CSS-first configuration with `@import "tailwindcss"` and `@theme`.',
        },
        {
          id: 'tw_q3',
          kind: 'multiple_choice',
          prompt: 'Which utility adds a visible ring only on keyboard focus navigation?',
          options: ['focus-visible:ring-2', 'outline-none', 'ring-hover', 'sr-only'],
          correctAnswer: 'focus-visible:ring-2',
          explanation: '`focus-visible:ring-2` ensures clear keyboard accessibility.',
        },
      ],
    },
    assignment: {
      id: 'asn_tailwind_dashboard',
      title: 'Responsive Pricing & Feature Matrix UI',
      description: 'Design a responsive 3-tier pricing card grid supporting light/dark surfaces and keyboard focus rings.',
      instructionsMarkdown: 'Author semantic markup styled cleanly with mobile-first utilities, `tabular-nums`, and accessible button states.',
      requirements: ['No horizontal overflow at 390px', 'Dark and light surface parity'],
      starterFiles: { 'index.html': '<!-- Tailwind UI assignment starter -->\n' },
      rubric: [
        { criterion: 'Responsive spacing & grid', points: 40 },
        { criterion: 'Light/Dark surface contrast', points: 35 },
        { criterion: 'Focus accessibility & alignment', points: 25 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_tailwind_uikit',
      title: 'Tailwind CSS: Light/Dark SaaS Component System',
      slug: 'tailwind-saas-component-system',
      category: 'Frontend UI',
      difficulty: 'Beginner',
      estimatedHours: 6,
      summary: 'Assemble reusable KPI cards, accessible navigation headers, and pricing grids with consistent design tokens.',
      learningOutcomes: ['Author mobile-first responsive utilities', 'Maintain consistent dark-mode borders and contrast'],
      requirements: ['390px/768px/1280px responsive checks', 'Accessible focus rings'],
      milestones: [
        { step: 1, title: 'Navigation & Surface Cards', summary: 'Create responsive navbar and elevated card primitives.' },
        { step: 2, title: 'Metrics & Dark Parity', summary: 'Verify tabular numbers and dark-mode contrast.' },
      ],
      checklist: ['Zero horizontal scroll at 390px', 'Tabular nums on stats', 'Clear focus-visible indicators'],
      rubric: [
        { criterion: 'Visual hierarchy & responsiveness', points: 50 },
        { criterion: 'Accessibility & contrast', points: 50 },
      ],
      deliverables: ['index.html', 'styles.css', 'README.md'],
      submissionInstructions: 'Preview mobile and desktop viewports in the workspace before submitting.',
      starterFiles: { 'index.html': '<main><h1>Component System Starter</h1></main>\n' },
    },
  }),

  makeDraftCourseBundle({
    courseId: 'crs_mysql_draft',
    techId: 'tech_mysql',
    categoryId: 'cat_db',
    title: 'MySQL Relational Modeling, InnoDB & Query Optimization',
    slug: 'mysql-innodb-optimization-draft',
    description: 'Master InnoDB storage mechanics, foreign key modeling, composite indexing, UTF8MB4 encoding, and EXPLAIN query tuning.',
    difficulty: 'Intermediate',
    estimatedHours: 14,
    objectives: [
      'Configure `utf8mb4` character sets and InnoDB foreign keys cleanly.',
      'Understand clustered primary-key lookups and secondary B-Tree indexes.',
      'Optimize slow `JOIN` and `ORDER BY` queries using `EXPLAIN`.',
    ],
    prerequisites: ['Basic SQL SELECT, INSERT, and UPDATE familiarity'],
    language: 'sql',
    modules: [
      { id: 'mod_my_1', title: 'Module 1: InnoDB Schemas, Keys & Constraints', topic: 'Clustered Indexes & UTF8MB4', sortOrder: 1 },
      { id: 'mod_my_2', title: 'Module 2: Query Tuning, EXPLAIN & Transactions', topic: 'Covering Indexes & Deadlock Prevention', sortOrder: 2 },
    ],
    lessons: [
      {
        id: 'les_my_1',
        moduleId: 'mod_my_1',
        title: 'InnoDB Engine, UTF8MB4 & Primary Key Design',
        slug: 'mysql-innodb-utf8mb4-draft',
        topicName: 'Clustered Index Fundamentals',
        summary: 'Configure InnoDB tables with `utf8mb4`, `AUTO_INCREMENT` or monotonic IDs, and strict foreign keys.',
        conceptOverview: 'InnoDB physically clusters table rows on the primary key B-Tree, so compact monotonic primary keys keep secondary indexes lean.',
        detailedExplanation: 'Always specify `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` so emojis and international characters store reliably without truncation.',
        concepts: [
          { term: 'Clustered index', definition: 'In InnoDB, the table data itself is stored inside the primary key B-Tree leaf pages.' },
          { term: 'utf8mb4', definition: 'Full 4-byte UTF-8 encoding supporting all Unicode characters cleanly.' },
        ],
        steps: ['Use `utf8mb4` collation explicitly.', 'Keep primary keys narrow and sequential.'],
        codeTitle: 'InnoDB Normalized Schema Example',
        code: `CREATE TABLE learners (\n  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n  email VARCHAR(160) NOT NULL UNIQUE,\n  full_name VARCHAR(120) NOT NULL,\n  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
        expectedOutput: 'Query OK, 0 rows affected',
        mistakes: ['Using legacy `utf8` (utf8mb3) in MySQL, which breaks 4-byte Unicode characters.'],
        bestPractices: ['Use `INNODB` everywhere and store monotonic compact PKs.'],
        practicalActivity: 'Write a `courses` table using InnoDB and `utf8mb4`.',
        starterCode: `CREATE TABLE tracks (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, slug VARCHAR(80) NOT NULL UNIQUE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,
        solutionHint: 'Specify `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`.',
        sortOrder: 1,
      },
      {
        id: 'les_my_2',
        moduleId: 'mod_my_1',
        title: 'Foreign Keys, Cascading Rules & Data Integrity',
        slug: 'mysql-foreign-keys-draft',
        topicName: 'Referential Integrity in InnoDB',
        summary: 'Protect parent-child relationships using `FOREIGN KEY` indexes and explicit `ON DELETE` rules.',
        conceptOverview: 'InnoDB enforces parent-child existence strictly and automatically indexes foreign-key columns if omitted.',
        detailedExplanation: 'Choose `ON DELETE CASCADE` for ephemeral child joins (session rows) and `RESTRICT` for financial/certificate audit history.',
        concepts: [
          { term: 'ON DELETE RESTRICT', definition: 'Prevents accidental deletion of parent rows referenced by historical records.' },
        ],
        steps: ['Match child FK column type identically (`BIGINT UNSIGNED`).', 'Choose RESTRICT vs CASCADE deliberately.'],
        codeTitle: 'Typed Foreign Key Constraint',
        code: `CREATE TABLE enrollments (\n  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,\n  learner_id BIGINT UNSIGNED NOT NULL,\n  course_id BIGINT UNSIGNED NOT NULL,\n  UNIQUE KEY uq_learner_course (learner_id, course_id)\n) ENGINE=InnoDB;`,
        expectedOutput: 'Query OK, 0 rows affected',
        mistakes: ['Mismatched signed `INT` vs `BIGINT UNSIGNED` foreign keys causing error 150.'],
        bestPractices: ['Keep parent PK and child FK column types identical.'],
        practicalActivity: 'Add a composite `UNIQUE KEY` preventing duplicate enrollments.',
        starterCode: `ALTER TABLE enrollments ADD UNIQUE KEY uq_pair (learner_id, course_id);`,
        solutionHint: 'Use `UNIQUE KEY (learner_id, course_id)`.',
        sortOrder: 2,
      },
      {
        id: 'les_my_3',
        moduleId: 'mod_my_2',
        title: 'Covering Indexes & EXPLAIN Execution Plans',
        slug: 'mysql-covering-indexes-explain-draft',
        topicName: 'Reading EXPLAIN Type & Extra Columns',
        summary: 'Eliminate expensive `Using filesort` and `type = ALL` table scans using covering composite indexes.',
        conceptOverview: 'When all `SELECT` columns reside inside the index leaf, InnoDB satisfies the query via `Using index` without touching the clustered heap.',
        detailedExplanation: 'Watch `EXPLAIN` output carefully: aim for `ref` or `range` access types rather than `ALL`, and eliminate `Using filesort` on hot feeds.',
        concepts: [
          { term: 'Using index', definition: 'MySQL EXPLAIN indicator showing a covering index satisfied the query directly.' },
        ],
        steps: ['Inspect `EXPLAIN SELECT ...`.', 'Add composite index matching `WHERE` and `ORDER BY`.'],
        codeTitle: 'Composite Index Eliminating Filesort',
        code: `CREATE INDEX idx_lessons_course_order ON lessons (course_id, status, sort_order);`,
        expectedOutput: 'Query OK, 0 rows affected',
        mistakes: ['Using `SELECT *` on every query, preventing covering index scans.'],
        bestPractices: ['Project only needed columns cleanly.'],
        practicalActivity: 'Design a composite index for `WHERE user_id = ? AND status = ? ORDER BY created_at DESC`.',
        starterCode: `CREATE INDEX idx_orders_user_status ON orders (user_id, status, created_at);`,
        solutionHint: 'Put equality columns first, then `created_at`.',
        sortOrder: 3,
      },
      {
        id: 'les_my_4',
        moduleId: 'mod_my_2',
        title: 'Keyset Pagination vs Deep OFFSET Limits',
        slug: 'mysql-keyset-pagination-draft',
        topicName: 'Fast Infinite Lists at Scale',
        summary: 'Replace slow `LIMIT 20 OFFSET 10000` queries with seek/keyset cursors (`WHERE id < ?`).',
        conceptOverview: 'Deep `OFFSET` forces InnoDB to scan and discard thousands of rows; cursor/keyset pagination jumps straight into the B-Tree.',
        detailedExplanation: 'Remember the last seen `(created_at, id)` pair from Page N and pass it into Page N+1 with `LIMIT 20`.',
        concepts: [
          { term: 'Keyset (Seek) Pagination', definition: 'Uses indexed range filter `WHERE id < last_id LIMIT N` for constant-time paging.' },
        ],
        steps: ['Order deterministically by `(created_at DESC, id DESC)`.', 'Filter next page using cursor tuple comparison.'],
        codeTitle: 'Constant-Time Keyset Pagination Query',
        code: `SELECT id, title, created_at\nFROM notifications\nWHERE user_id = 42 AND id < 9500\nORDER BY id DESC\nLIMIT 20;`,
        expectedOutput: '20 rows returned via index range scan',
        mistakes: ['Rendering `OFFSET 50000` on large notification or activity tables.'],
        bestPractices: ['Pair `(user_id, id)` index with seek cursors for activity feeds.'],
        practicalActivity: 'Rewrite an `OFFSET 1000` query to seek cleanly using `id < ?`.',
        starterCode: `SELECT id, title FROM posts WHERE id < 500 ORDER BY id DESC LIMIT 15;`,
        solutionHint: 'Filter `WHERE id < last_seen_id` instead of `OFFSET`.',
        sortOrder: 4,
      },
      {
        id: 'les_my_5',
        moduleId: 'mod_my_2',
        title: 'InnoDB Transactions, Isolation & Deadlock Hygiene',
        slug: 'mysql-transactions-deadlocks-draft',
        topicName: 'Consistent Lock Ordering',
        summary: 'Prevent multi-row deadlocks cleanly with deterministic lock acquisition order and retryable handlers.',
        conceptOverview: 'InnoDB defaults to `REPEATABLE READ` isolation; locking rows in consistent primary-key order avoids circular deadlock waits.',
        detailedExplanation: 'Always acquire locks on multi-row updates in ascending `id` order inside short `START TRANSACTION; ... COMMIT;` blocks.',
        concepts: [
          { term: 'Deadlock', definition: 'Circular wait between two transactions holding locks the other needs; InnoDB aborts one automatically.' },
        ],
        steps: ['Sort target IDs before locking rows.', 'Keep transactions strictly database-local.'],
        codeTitle: 'Deterministic Short Transaction Block',
        code: `START TRANSACTION;\nUPDATE accounts SET balance_cents = balance_cents - 500 WHERE id = 10 AND balance_cents >= 500;\nCOMMIT;`,
        expectedOutput: 'Query OK, transaction committed cleanly',
        mistakes: ['Calling external payment webhooks inside an open SQL transaction.'],
        bestPractices: ['Sort multi-row updates consistently by ID and handle deadlock retries cleanly.'],
        practicalActivity: 'Write an atomic balance check + deduction inside `START TRANSACTION`.',
        starterCode: `START TRANSACTION;\nUPDATE seats SET available = available - 1 WHERE cohort_id = 5 AND available > 0;\nCOMMIT;`,
        solutionHint: 'Guard `available > 0` inside the `WHERE` predicate.',
        sortOrder: 5,
      },
    ],
    exercises: [
      {
        id: 'ex_my_mc_1',
        moduleId: 'mod_my_1',
        lessonId: 'les_my_1',
        title: 'Unicode Character Set Choice',
        exerciseType: 'multiple_choice',
        difficulty: 'Beginner',
        prompt: 'Which MySQL character set supports full 4-byte Unicode characters including modern emojis without truncation?',
        starterCode: '',
        options: ['utf8mb4', 'utf8mb3', 'latin1', 'ascii'],
        correctAnswer: 'utf8mb4',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: 'In MySQL, legacy `utf8` aliases `utf8mb3` (max 3 bytes); always choose `utf8mb4`.',
        hintText: 'Includes `mb4` for 4-byte support.',
        sortOrder: 1,
      },
      {
        id: 'ex_my_tf_2',
        moduleId: 'mod_my_2',
        lessonId: 'les_my_4',
        title: 'Deep Offset Scalability',
        exerciseType: 'true_false',
        difficulty: 'Intermediate',
        prompt: 'True or False: `OFFSET 100000` avoids scanning skipped rows in InnoDB.',
        starterCode: '',
        options: ['True', 'False'],
        correctAnswer: 'False',
        validationRule: { mode: 'exact_case_insensitive' },
        explanation: '`OFFSET` still reads and discards the skipped rows; keyset cursor filtering (`id < ?`) avoids that cost.',
        hintText: 'Compare `OFFSET` vs keyset seek.',
        sortOrder: 2,
      },
      {
        id: 'ex_my_write_3',
        moduleId: 'mod_my_2',
        lessonId: 'les_my_3',
        title: 'Create Composite Filter Index',
        exerciseType: 'write_code',
        difficulty: 'Intermediate',
        prompt: 'Create a composite index on `enrollments(user_id, enrolled_at)`.',
        starterCode: `-- create composite index`,
        options: [],
        correctAnswer: 'CREATE INDEX',
        validationRule: { mode: 'contains_tokens', tokens: ['CREATE', 'INDEX', 'enrollments', 'user_id'] },
        explanation: 'Indexing `(user_id, enrolled_at)` accelerates per-learner chronological queries.',
        hintText: 'Use `CREATE INDEX idx_name ON enrollments (user_id, enrolled_at);`.',
        sortOrder: 3,
      },
    ],
    assessment: {
      id: 'asm_mysql_quiz',
      title: 'MySQL InnoDB & Query Performance Assessment',
      questions: [
        {
          id: 'my_q1',
          kind: 'multiple_choice',
          prompt: 'Which MySQL `EXPLAIN` `Extra` value indicates all requested columns were satisfied directly from the index without reading table rows?',
          options: ['Using index', 'Using filesort', 'Using temporary', 'Full scan'],
          correctAnswer: 'Using index',
          explanation: '`Using index` confirms a covering index scan.',
        },
        {
          id: 'my_q2',
          kind: 'true_false',
          prompt: 'True or False: In InnoDB, child foreign key columns and referenced parent columns can use mismatched signedness (`INT` vs `INT UNSIGNED`) cleanly.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'InnoDB requires exact column type and signedness parity for foreign keys.',
        },
        {
          id: 'my_q3',
          kind: 'multiple_choice',
          prompt: 'Which pagination strategy stays constant-time even at page 5,000?',
          options: ['Keyset / cursor seek (WHERE id < last_id)', 'Deep OFFSET', 'SELECT * then slice in app', 'RAND() sorting'],
          correctAnswer: 'Keyset / cursor seek (WHERE id < last_id)',
          explanation: 'Keyset pagination uses the B-Tree index directly to skip prior rows.',
        },
      ],
    },
    assignment: {
      id: 'asn_mysql_tuning',
      title: 'MySQL Course Catalog Schema & Index Tuning Exercise',
      description: 'Author InnoDB DDL with utf8mb4, foreign keys, covering index, and keyset query.',
      instructionsMarkdown: 'Write DDL + EXPLAIN optimization notes replacing an `OFFSET` query with keyset seek.',
      requirements: ['utf8mb4 charset', 'Matching FK types', 'Keyset cursor SQL'],
      starterFiles: { 'schema.sql': '-- MySQL InnoDB starter\n' },
      rubric: [
        { criterion: 'InnoDB schema & FK matching', points: 40 },
        { criterion: 'Covering index & keyset query', points: 60 },
      ],
    },
    projectTemplate: {
      id: 'ptpl_mysql_catalog',
      title: 'MySQL: Indexed Enrollment & Notification Feed Schema',
      slug: 'mysql-indexed-enrollment-schema',
      category: 'Database Engineering',
      difficulty: 'Intermediate',
      estimatedHours: 6,
      summary: 'Design an InnoDB `utf8mb4` database schema with covering indexes and keyset notification feed pagination.',
      learningOutcomes: ['Design clustered-index-friendly InnoDB tables', 'Eliminate deep OFFSET scans cleanly'],
      requirements: ['ENGINE=InnoDB DEFAULT CHARSET=utf8mb4', 'Keyset seek pagination query'],
      milestones: [
        { step: 1, title: 'Normalized InnoDB DDL', summary: 'Create learners, courses, and enrollments.' },
        { step: 2, title: 'Index & Keyset Feed', summary: 'Add covering index and cursor feed query.' },
      ],
      checklist: ['Matching unsigned PK/FK types', 'Zero utf8mb3', 'Covering index documented'],
      rubric: [
        { criterion: 'Schema integrity', points: 50 },
        { criterion: 'Query performance design', points: 50 },
      ],
      deliverables: ['schema.sql', 'queries.sql', 'README.md'],
      submissionInstructions: 'Document index choices and attach SQL files.',
      starterFiles: { 'schema.sql': '-- MySQL starter schema\n' },
    },
  }),
];

function upsertProjectMeta(db: DatabaseSync, id: string, meta: ProjectEnrichmentMeta) {
  const row = db.prepare(`SELECT id, learning_outcomes_json FROM project_templates WHERE id = ?`).get(id) as
    | { id: string; learning_outcomes_json?: string }
    | undefined;
  if (!row) return;
  const existingOutcomes = String(row.learning_outcomes_json || '[]').trim();
  if (existingOutcomes !== '' && existingOutcomes !== '[]') return;
  db.prepare(
    `UPDATE project_templates
     SET learning_outcomes_json = ?,
         milestones_json = ?,
         checklist_json = ?,
         rubric_json = ?,
         submission_instructions = ?
     WHERE id = ?`
  ).run(
    JSON.stringify(meta.learningOutcomes),
    JSON.stringify(meta.milestones),
    JSON.stringify(meta.checklist),
    JSON.stringify(meta.rubric),
    meta.submissionInstructions,
    id
  );
}

function insertDraftLessonTree(
  db: DatabaseSync,
  now: string,
  spec: {
    courseId: string;
    moduleId: string;
    language: string;
    les: DraftTrackSeed['lessons'][number];
  }
) {
  const { courseId, moduleId, language, les } = spec;
  const topicId = `top_${les.id}`;
  db.prepare(
    `INSERT OR IGNORE INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(topicId, courseId, moduleId, les.topicName, `${les.slug}-topic`, les.summary, les.sortOrder, now);

  const structured: RichLessonSpec = {
    id: les.id,
    courseId,
    moduleId,
    title: les.title,
    slug: les.slug,
    topicName: les.topicName,
    summary: les.summary,
    accessTier: les.sortOrder <= 2 ? 'free' : 'premium',
    durationMinutes: 18,
    sortOrder: les.sortOrder,
    language,
    status: 'draft',
    workflowStatus: 'draft',
    objectives: [`Understand ${les.topicName}`, `Apply ${les.codeTitle} cleanly without common pitfalls`],
    prerequisites: ['Prior module lessons or core syntax familiarity'],
    detailedExplanation: `${les.conceptOverview}\n\n${les.detailedExplanation}`,
    conceptsAndTerminology: les.concepts,
    stepByStepTeaching: les.steps,
    syntaxAndUsage: les.steps.slice(0, 3),
    practicalExampleNarrative: les.conceptOverview,
    codeExamples: [
      {
        title: les.codeTitle,
        description: les.summary,
        language,
        code: les.code,
        expectedOutput: les.expectedOutput,
        explanation: les.detailedExplanation,
      },
    ],
    commonMistakes: les.mistakes,
    bestPractices: les.bestPractices,
    practicalActivity: les.practicalActivity,
    starterCode: les.starterCode,
    solutionHint: les.solutionHint,
    knowledgeChecks: [les.steps[0] || les.topicName],
    summaryPoints: [les.summary],
    furtherResources: [`Braincode ${language.toUpperCase()} Reference & Coding Workspace`],
  };

  const md = formatSubstantiveLessonMarkdown(structured);
  db.prepare(
    `INSERT OR IGNORE INTO lessons (
       id, module_id, topic_id, course_id, title, slug, topic_name, summary, content_markdown,
       code_example, language, video_url, downloadable_resource, access_tier, duration_minutes,
       exercise_prompt, starter_code, solution_hint, status, workflow_status, qa_status,
       author_id, is_ai_generated, objectives_json, prerequisites_json, version, sort_order, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '', ?, 18, ?, ?, ?, 'draft', 'draft', 'pass', 'usr_instructor_elena', 0, ?, ?, 1, ?, ?)`
  ).run(
    les.id,
    moduleId,
    topicId,
    courseId,
    les.title,
    les.slug,
    les.topicName,
    les.summary,
    md,
    les.code,
    language,
    structured.accessTier,
    les.practicalActivity,
    les.starterCode,
    les.solutionHint,
    JSON.stringify(structured.objectives),
    JSON.stringify(structured.prerequisites),
    les.sortOrder,
    now
  );

  const insertBlk = db.prepare(
    `INSERT OR IGNORE INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  insertBlk.run(`blk_${les.id}_1`, les.id, 'paragraph', 'Core Architecture', les.detailedExplanation, '{}', 1);
  insertBlk.run(
    `blk_${les.id}_2`,
    les.id,
    'list',
    'Key Terminology',
    les.concepts.map((c) => `- **${c.term}**: ${c.definition}`).join('\n'),
    '{}',
    2
  );
  insertBlk.run(
    `blk_${les.id}_3`,
    les.id,
    'step_guide',
    'Step-by-Step Guide',
    les.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    '{}',
    3
  );
  insertBlk.run(
    `blk_${les.id}_4`,
    les.id,
    'code_example',
    les.codeTitle,
    `\`\`\`${language}\n${les.code}\n\`\`\`\nExpected Output: \`${les.expectedOutput}\``,
    JSON.stringify({ language }),
    4
  );
  insertBlk.run(`blk_${les.id}_5`, les.id, 'warning', 'Common Mistakes to Avoid', les.mistakes.map((m) => `- ${m}`).join('\n'), '{}', 5);
  insertBlk.run(`blk_${les.id}_6`, les.id, 'callout', 'Best Practices', les.bestPractices.map((b) => `- ${b}`).join('\n'), '{}', 6);

  const runnable = ['html', 'css', 'javascript', 'js'].includes(language.toLowerCase()) ? 1 : 0;
  db.prepare(
    `INSERT OR IGNORE INTO code_examples (id, lesson_id, title, description, language, code, expected_output, is_runnable, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).run(`ce_${les.id}_1`, les.id, les.codeTitle, les.summary, language, les.code, les.expectedOutput, runnable);
}

export function seedPhase21Curriculum(db: DatabaseSync) {
  const now = new Date().toISOString();

  // 1. Backfill prerequisites on Priority 10 & existing published courses where still empty
  const updatePrereq = db.prepare(
    `UPDATE courses SET prerequisites_json = ? WHERE id = ? AND (prerequisites_json = '[]' OR prerequisites_json = '')`
  );
  for (const [cid, prereqs] of COURSE_PREREQUISITES_BACKFILL) {
    updatePrereq.run(JSON.stringify(prereqs), cid);
  }

  // 2. Complete Priority 10 assessment / exercise / project gaps without auto-publishing draft or review units
  const htmlQuiz = db.prepare(`SELECT questions_json FROM assessments WHERE id = 'asm_html_quiz'`).get() as
    | { questions_json: string }
    | undefined;
  if (htmlQuiz) {
    try {
      const parsed = JSON.parse(htmlQuiz.questions_json) as Array<Record<string, unknown>>;
      if (parsed.length < 3) {
        parsed.push(
          {
            id: 'hq3',
            kind: 'multiple_choice',
            prompt: 'Which table attribute explicitly associates a header cell (`<th>`) with its column or row for screen readers?',
            options: ['scope', 'coltarget', 'aria-table-dir', 'headerset'],
            correctAnswer: 'scope',
            explanation: '`scope="col"` or `scope="row"` clarifies header association unambiguously.',
          },
          {
            id: 'hq4',
            kind: 'multiple_choice',
            prompt: 'Which attribute prevents an image from failing WCAG if decorative vs informative?',
            options: ['alt', 'data-caption', 'title-text', 'src-label'],
            correctAnswer: 'alt',
            explanation: 'Every `<img>` must define descriptive `alt` text or empty `alt=""` when purely decorative.',
          }
        );
        db.prepare(`UPDATE assessments SET questions_json = ? WHERE id = 'asm_html_quiz'`).run(JSON.stringify(parsed));
      }
    } catch {
      // keep existing if malformed
    }
  }

  const cppQuiz = db.prepare(`SELECT questions_json FROM assessments WHERE id = 'asm_cpp_draft_quiz'`).get() as
    | { questions_json: string }
    | undefined;
  if (cppQuiz) {
    try {
      const parsed = JSON.parse(cppQuiz.questions_json) as Array<Record<string, unknown>>;
      if (parsed.length < 3) {
        parsed.push(
          {
            id: 'cpp_q3',
            kind: 'multiple_choice',
            prompt: 'Which smart pointer expresses exclusive single ownership in modern C++ without manual `delete`?',
            options: ['std::unique_ptr<T>', 'std::raw_ptr<T>', 'std::auto_free<T>', 'void*'],
            correctAnswer: 'std::unique_ptr<T>',
            explanation: '`std::unique_ptr` enforces single ownership and deterministic cleanup at scope exit.',
          },
          {
            id: 'cpp_q4',
            kind: 'true_false',
            prompt: 'True or False: `std::span<const int>` copies all elements of a contiguous vector when passed to a helper function.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: '`std::span` is a lightweight non-owning view (`pointer + size`) with zero element copying.',
          }
        );
        db.prepare(`UPDATE assessments SET questions_json = ? WHERE id = 'asm_cpp_draft_quiz'`).run(JSON.stringify(parsed));
      }
    } catch {
      // ignore
    }
  }

  const insertEx = db.prepare(
    `INSERT OR IGNORE INTO exercises (
       id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty,
       prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation,
       hint_text, xp_reward, sort_order, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Enrich Priority 10 exercises (including matching, predict_output, short_answer, and Java/C++ practice depth)
  const extraPriorityExercises = [
    [
      'ex_html_match_5',
      'crs_html',
      'mod_html_2',
      'les_html_4',
      'tech_html_std',
      'Match HTML5 Semantic Landmarks',
      'matching',
      'Beginner',
      'Match landmarks to purposes in order (e.g. header=banner, nav=links, main=primary, footer=colophon):',
      'A: header | B: nav | C: main | D: footer',
      [],
      'header=banner, nav=links, main=primary, footer=colophon',
      { mode: 'exact_case_insensitive' },
      'Semantic landmarks organize document regions for assistive navigation.',
      'Copy format: header=banner, nav=links, main=primary, footer=colophon',
      25,
      5,
    ],
    [
      'ex_css_short_5',
      'crs_css',
      'mod_css_2',
      'les_css_3',
      'tech_css_std',
      'Explain CSS `minmax()` Auto-Fit Behavior',
      'short_answer',
      'Intermediate',
      'In 1-2 sentences, explain what `repeat(auto-fit, minmax(220px, 1fr))` accomplishes on desktop vs mobile screens.',
      '',
      [],
      'auto-fit wraps grid columns automatically when width drops below 220px and stretches tracks proportionally with 1fr',
      { mode: 'keyword_rubric', minLength: 20, keywords: ['column', 'width', 'wrap', 'responsive', '1fr'] },
      '`auto-fit` + `minmax()` delivers responsive multi-column grids without manual media queries.',
      'Mention minimum width (`220px`) and proportional `1fr` expansion.',
      30,
      5,
    ],
    [
      'ex_java_err_3',
      'crs_java',
      'mod_java_1',
      'les_java_1',
      'tech_java',
      'Fix Java Unclosed Stream Resource Bug',
      'find_error',
      'Intermediate',
      'Identify the resource-leak risk in opening `BufferedReader` manually without `try-with-resources` and write the fixed `try (...)` header.',
      `BufferedReader br = Files.newBufferedReader(path);`,
      [],
      'try (BufferedReader br = Files.newBufferedReader(path))',
      { mode: 'contains_tokens', tokens: ['try (', 'BufferedReader', 'Files.newBufferedReader'] },
      '`try-with-resources` closes AutoCloseable streams cleanly even when exceptions occur.',
      'Wrap the BufferedReader declaration inside `try (...)`.',
      35,
      3,
    ],
    [
      'ex_java_comp_4',
      'crs_java',
      'mod_java_1',
      'les_java_1',
      'tech_java',
      'Complete Immutable Java Record Declaration',
      'code_completion',
      'Beginner',
      'Write the Java keyword that defines an immutable value carrier class with `title` and `minutes`: `public ______ LessonSummary(String title, int minutes) {}`',
      '',
      [],
      'record',
      { mode: 'exact_case_insensitive' },
      'Java `record` generates constructor, accessors, `equals`, `hashCode`, and `toString`.',
      'Introduced in Java 16.',
      25,
      4,
    ],
    [
      'ex_java_write_5',
      'crs_java',
      'mod_java_1',
      'les_java_1',
      'tech_java',
      'Filter Java List with Streams API',
      'write_code',
      'Intermediate',
      'Write a Java stream expression filtering `scores` greater than or equal to 70 and collecting `.toList()`.',
      `List<Integer> passed = scores.stream()/* ... */;`,
      [],
      '.filter(',
      { mode: 'contains_tokens', tokens: ['.stream()', '.filter(', '70', '.toList()'] },
      'Java Streams express declarative filtering cleanly without mutating the source list.',
      'Chain `.filter(s -> s >= 70).toList()`.',
      40,
      5,
    ],
    [
      'ex_cpp_comp_3',
      'crs_cpp_draft',
      'mod_cpp_1',
      'les_cpp_1',
      'tech_cpp',
      'Zero-Copy Parameter Passing in C++',
      'code_completion',
      'Intermediate',
      'Complete the parameter signature to pass `std::vector<int>` without copying: `int total(______ nums)`',
      '',
      [],
      'const std::vector<int>&',
      { mode: 'exact_case_insensitive' },
      '`const std::vector<int>&` avoids heap copies while preserving read-only safety.',
      'Use `const` + `&` reference.',
      30,
      3,
    ],
    [
      'ex_cpp_write_4',
      'crs_cpp_draft',
      'mod_cpp_1',
      'les_cpp_2',
      'tech_cpp',
      'Create RAII Unique Pointer',
      'write_code',
      'Intermediate',
      'Allocate a `Task` object safely on the heap in modern C++20 without calling `new`.',
      `// create std::unique_ptr<Task> using make_unique`,
      [],
      'std::make_unique',
      { mode: 'contains_tokens', tokens: ['make_unique', 'Task'] },
      '`std::make_unique<Task>(...)` guarantees exception-safe single-ownership RAII cleanup.',
      'Use `auto ptr = std::make_unique<Task>(...);`.',
      35,
      4,
    ],
  ] as const;

  for (const ex of extraPriorityExercises) {
    insertEx.run(
      ex[0],
      ex[1],
      ex[2],
      ex[3],
      ex[4],
      ex[5],
      ex[6],
      ex[7],
      ex[8],
      ex[9],
      JSON.stringify(ex[10]),
      ex[11],
      JSON.stringify(ex[12]),
      ex[13],
      ex[14],
      ex[15],
      ex[16],
      now
    );
  }

  // Enrich existing project templates metadata
  for (const [id, meta] of Object.entries(PROJECT_ENRICHMENT)) {
    upsertProjectMeta(db, id, meta);
  }

  // Add 2nd C++ draft project template + project templates for incomplete existing courses
  const insertProj = db.prepare(
    `INSERT OR IGNORE INTO project_templates (
       id, technology_id, learning_path_id, course_id, title, slug, category, difficulty,
       estimated_hours, summary, requirements_json, starter_files_json, deliverables_json,
       learning_outcomes_json, milestones_json, checklist_json, rubric_json, submission_instructions, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const extraCourseProjects: Array<{
    id: string;
    techId: string;
    pathId: string;
    courseId: string;
    title: string;
    slug: string;
    category: string;
    difficulty: string;
    hours: number;
    summary: string;
    reqs: string[];
    files: Record<string, string>;
    deliv: string[];
    meta: ProjectEnrichmentMeta;
  }> = [
    {
      id: 'ptpl_cpp_stl_bench',
      techId: 'tech_cpp',
      pathId: '',
      courseId: 'crs_cpp_draft',
      title: 'C++20: STL Container & Binary Search Bench',
      slug: 'cpp20-stl-search-bench',
      category: 'Systems & Algorithms',
      difficulty: 'Intermediate',
      hours: 6,
      summary: 'Compare sorted std::vector binary search vs std::unordered_map lookups using RAII and zero raw pointers.',
      reqs: ['Use std::span<const int> helpers', 'Compile cleanly with -std=c++20 -Wall -Wextra'],
      files: { 'main.cpp': '#include <vector>\n#include <algorithm>\nint main() { return 0; }\n' },
      deliv: ['main.cpp', 'CMakeLists.txt', 'README.md'],
      meta: {
        learningOutcomes: ['Benchmark STL containers objectively', 'Write warning-free C++20'],
        milestones: [
          { step: 1, title: 'Data Generator', summary: 'Generate deterministic sorted test vectors.' },
          { step: 2, title: 'Benchmark Runner', summary: 'Measure lookup microseconds with std::chrono.' },
        ],
        checklist: ['Zero raw new/delete', 'Zero -Wall warnings', 'Reproducible timing table'],
        rubric: [
          { criterion: 'C++20 RAII & STL usage', points: 50 },
          { criterion: 'Benchmark accuracy & analysis', points: 50 },
        ],
        submissionInstructions: 'Include compiler version and benchmark table output in your submission notes.',
      },
    },
    {
      id: 'ptpl_fullstack_auth_board',
      techId: 'tech_ts',
      pathId: 'path_core_swe',
      courseId: 'crs_fullstack',
      title: 'Full-Stack: Event-Delegated Board with Validation Guard',
      slug: 'fullstack-event-board-validation',
      category: 'Full-Stack Web',
      difficulty: 'Intermediate',
      hours: 7,
      summary: 'Connect responsive HTML/CSS grid cards, delegated DOM state, and server entitlement guard functions.',
      reqs: ['Single parent event listener via closest()', 'Backend permission predicate returning 403 payload'],
      files: {
        'index.html': '<!DOCTYPE html><html><body><main id="board"></main></body></html>',
        'app.js': 'console.log("Full-stack board starter");\n',
      },
      deliv: ['index.html', 'app.js', 'README.md'],
      meta: {
        learningOutcomes: ['Eliminate listener leaks via event delegation', 'Separate UI UX from backend trust boundaries'],
        milestones: [
          { step: 1, title: 'Responsive Grid UI', summary: 'Build semantic cards in HTML/CSS Grid.' },
          { step: 2, title: 'Delegated State & Guard', summary: 'Wire closest() handler and entitlement check.' },
        ],
        checklist: ['Tested desktop & mobile preview', 'Authorization check verified in console'],
        rubric: [
          { criterion: 'Semantic HTML & CSS Grid', points: 35 },
          { criterion: 'Delegation & trust-boundary logic', points: 65 },
        ],
        submissionInstructions: 'Build in the Braincode Coding Workspace and verify both preview and console output.',
      },
    },
    {
      id: 'ptpl_algo_graph_router',
      techId: 'tech_algo',
      pathId: 'path_systems_ai',
      courseId: 'crs_algorithms',
      title: 'Algorithms: BFS Shortest-Hop Course Prerequisite Planner',
      slug: 'algo-bfs-prerequisite-planner',
      category: 'Algorithms & CS',
      difficulty: 'Intermediate',
      hours: 6,
      summary: 'Traverse prerequisite graphs using Breadth-First Search and hash-map cycle detection.',
      reqs: ['O(V + E) BFS queue traversal', 'Handle unreachable targets cleanly (-1)'],
      files: { 'planner.js': 'function shortestPath(adj, start, goal) { return -1; }\n' },
      deliv: ['planner.js', 'README.md'],
      meta: {
        learningOutcomes: ['Model directed/undirected graphs as adjacency lists', 'Reason cleanly about Big-O time/space'],
        milestones: [
          { step: 1, title: 'Adjacency Builder', summary: 'Represent nodes and edges cleanly with Map/Set.' },
          { step: 2, title: 'BFS & Edge Tests', summary: 'Verify cycles and disconnected graphs.' },
        ],
        checklist: ['Visited Set marked on enqueue', 'Zero infinite loops on cycles'],
        rubric: [
          { criterion: 'BFS correctness & Big-O optimality', points: 60 },
          { criterion: 'Edge-case tests', points: 40 },
        ],
        submissionInstructions: 'Run test cases in the Braincode Workspace console and submit.',
      },
    },
    {
      id: 'ptpl_ai_schema_evaluator',
      techId: 'tech_genai',
      pathId: 'path_systems_ai',
      courseId: 'crs_ai_eng',
      title: 'Applied AI: Quota-Guarded JSON Rubric Validator',
      slug: 'ai-quota-json-rubric-validator',
      category: 'AI Systems',
      difficulty: 'Advanced',
      hours: 6,
      summary: 'Build a server-side prompt quota check, retry classifier, and strict JSON feedback validator.',
      reqs: ['Block non-retryable 402/403 quota/billing errors immediately', 'Validate required output keys cleanly'],
      files: { 'validator.js': 'export function validateFeedback(obj) { return Boolean(obj?.summary); }\n' },
      deliv: ['validator.js', 'README.md'],
      meta: {
        learningOutcomes: ['Avoid leaking provider keys to browsers', 'Classify retryable vs permanent API failures'],
        milestones: [
          { step: 1, title: 'Quota & Error Classifier', summary: 'Implement non-retryable 401/402/429 guards.' },
          { step: 2, title: 'Schema Validator', summary: 'Reject malformed JSON payloads gracefully.' },
        ],
        checklist: ['Zero hardcoded API keys', 'Non-retryable billing errors fail fast'],
        rubric: [
          { criterion: 'Security & quota boundaries', points: 50 },
          { criterion: 'Schema & error handling rigor', points: 50 },
        ],
        submissionInstructions: 'Verify classifier unit assertions in the workspace and submit.',
      },
    },
    {
      id: 'ptpl_sec_audit_checklist',
      techId: 'tech_cybersec',
      pathId: '',
      courseId: 'crs_security',
      title: 'Security: URL Sanitizer & Session Hardening Lab',
      slug: 'security-url-session-hardening',
      category: 'Application Security',
      difficulty: 'Intermediate',
      hours: 5,
      summary: 'Implement strict URL protocol allowlisting, safe error responses, and ownership checks.',
      reqs: ['Reject javascript: and data: URIs strictly', 'Prevent IDOR via explicit ownerId checks'],
      files: { 'sanitize.js': 'export function isSafeHttpUrl(raw) { return /^https?:\\/\\//i.test(raw); }\n' },
      deliv: ['sanitize.js', 'audit-notes.md'],
      meta: {
        learningOutcomes: ['Neutralize stored XSS URL payloads', 'Verify server-side ownership on every route'],
        milestones: [
          { step: 1, title: 'URL Allowlist Validator', summary: 'Block javascript:/data: vectors with URL parser.' },
          { step: 2, title: 'Authorization Guard', summary: 'Enforce role + owner verification.' },
        ],
        checklist: ['Handles URL encoding/case bypasses', 'Tested against malicious vectors'],
        rubric: [
          { criterion: 'XSS & protocol sanitization', points: 50 },
          { criterion: 'Authorization logic', points: 50 },
        ],
        submissionInstructions: 'Run test payloads in the Coding Workspace console and attach notes.',
      },
    },
    {
      id: 'ptpl_git_workflow_guide',
      techId: 'tech_git',
      pathId: '',
      courseId: 'crs_git',
      title: 'Git: Feature Branch & Conflict Resolution Runbook',
      slug: 'git-branch-conflict-runbook',
      category: 'Developer Tooling',
      difficulty: 'Beginner',
      hours: 4,
      summary: 'Practice clean feature branching, atomic commits, non-destructive reverts, and merge conflict resolution.',
      reqs: ['Atomic focused commits', 'Clean conflict marker resolution workflow'],
      files: { 'WORKFLOW.md': '# Git Branching & Recovery Checklist\n' },
      deliv: ['WORKFLOW.md', 'commit-log.txt'],
      meta: {
        learningOutcomes: ['Recover safely with git reflog and revert', 'Keep PR history readable'],
        milestones: [
          { step: 1, title: 'Feature Branch Flow', summary: 'Branch, commit, and merge cleanly.' },
          { step: 2, title: 'Conflict Resolution', summary: 'Resolve conflicting edits without losing tests.' },
        ],
        checklist: ['No force push to shared main', 'All conflict markers removed'],
        rubric: [
          { criterion: 'Command accuracy', points: 50 },
          { criterion: 'History hygiene & recovery plan', points: 50 },
        ],
        submissionInstructions: 'Document branch log and conflict resolution steps in your workspace.',
      },
    },
    {
      id: 'ptpl_devops_dockerfile',
      techId: 'tech_docker',
      pathId: '',
      courseId: 'crs_cloud_devops',
      title: 'DevOps: Multi-Stage Non-Root Node/Vite Container',
      slug: 'devops-multistage-nonroot-container',
      category: 'Cloud & Containers',
      difficulty: 'Intermediate',
      hours: 5,
      summary: 'Author a multi-stage Dockerfile with `.dockerignore`, healthcheck, and non-root runtime user.',
      reqs: ['Multi-stage builder + slim runtime stage', 'USER node non-root execution'],
      files: { Dockerfile: 'FROM node:22-alpine AS builder\nWORKDIR /app\n' },
      deliv: ['Dockerfile', '.dockerignore', 'README.md'],
      meta: {
        learningOutcomes: ['Shrink container image footprint via multi-stage builds', 'Drop root privileges inside containers'],
        milestones: [
          { step: 1, title: 'Builder & Dockerignore', summary: 'Exclude node_modules and secrets from build context.' },
          { step: 2, title: 'Non-Root Runtime & Healthcheck', summary: 'Configure HEALTHCHECK and non-root USER.' },
        ],
        checklist: ['No .env secrets baked into image', 'Non-root USER specified', 'Healthcheck configured'],
        rubric: [
          { criterion: 'Multi-stage efficiency', points: 45 },
          { criterion: 'Container security posture', points: 55 },
        ],
        submissionInstructions: 'Verify Dockerfile instructions and submit your workspace or repo link.',
      },
    },
    {
      id: 'ptpl_php_pdo_service',
      techId: 'tech_php',
      pathId: '',
      courseId: 'crs_php',
      title: 'PHP 8: Strict Typed PDO Enrollment Repository',
      slug: 'php8-strict-pdo-repository',
      category: 'Backend Web',
      difficulty: 'Intermediate',
      hours: 6,
      summary: 'Implement PHP 8.3 prepared PDO statements, `declare(strict_types=1)`, and HTML escaping helpers.',
      reqs: ['Prepared statements only (`?` placeholders)', 'htmlspecialchars(..., ENT_QUOTES, "UTF-8") output escaping'],
      files: { 'src/EnrollmentRepo.php': "<?php\ndeclare(strict_types=1);\n// PHP 8 repository starter\n" },
      deliv: ['src/EnrollmentRepo.php', 'README.md'],
      meta: {
        learningOutcomes: ['Eliminate SQL injection cleanly via PDO prepares', 'Leverage strict PHP 8 types and readonly properties'],
        milestones: [
          { step: 1, title: 'Strict Repository Class', summary: 'Inject PDO via constructor promotion.' },
          { step: 2, title: 'Escaped View Helper', summary: 'Sanitize user-supplied strings cleanly.' },
        ],
        checklist: ['strict_types=1 declared', 'Zero concatenated SQL strings'],
        rubric: [
          { criterion: 'PDO prepared statement safety', points: 50 },
          { criterion: 'PHP 8 typing & XSS escaping', points: 50 },
        ],
        submissionInstructions: 'Inspect static syntax in Braincode and submit your repository link.',
      },
    },
  ];

  for (const p of extraCourseProjects) {
    insertProj.run(
      p.id,
      p.techId,
      p.pathId,
      p.courseId,
      p.title,
      p.slug,
      p.category,
      p.difficulty,
      p.hours,
      p.summary,
      JSON.stringify(p.reqs),
      JSON.stringify(p.files),
      JSON.stringify(p.deliv),
      JSON.stringify(p.meta.learningOutcomes),
      JSON.stringify(p.meta.milestones),
      JSON.stringify(p.meta.checklist),
      JSON.stringify(p.meta.rubric),
      p.meta.submissionInstructions,
      now
    );
  }

  // 3. Improve the 7 existing incomplete courses cleanly with draft expansion modules/lessons, exercises, assessments & assignments
  const incompleteCourseAdditions: Array<{
    courseId: string;
    techId: string;
    module: { id: string; title: string; topic: string; sortOrder: number };
    lessons: DraftTrackSeed['lessons'];
    language: string;
    exercises: DraftTrackSeed['exercises'];
    assessment?: DraftTrackSeed['assessment'];
    assignment?: DraftTrackSeed['assignment'];
  }> = [
    {
      courseId: 'crs_fullstack',
      techId: 'tech_ts',
      language: 'javascript',
      module: { id: 'mod_fs_3_draft', title: 'Module 3: Client-Server Sync & Error Recovery (Draft)', topic: 'Optimistic Updates & Input Validation', sortOrder: 3 },
      lessons: [
        {
          id: 'les_fs_4_draft',
          moduleId: 'mod_fs_3_draft',
          title: 'Request AbortController, Retries & Stale UI Guards',
          slug: 'fullstack-abort-stale-ui-draft',
          topicName: 'Race-Free Search & Fetching',
          summary: 'Cancel stale in-flight fetches so rapid typing never renders out-of-order responses.',
          conceptOverview: 'Concurrent user input can return responses out of order; `AbortController` cancels superseded network requests cleanly.',
          detailedExplanation: 'Instantiate `new AbortController()`, pass `signal` to `fetch()`, and abort the previous controller inside cleanup.',
          concepts: [{ term: 'AbortController', definition: 'Web API signaling cancellation to pending `fetch` promises.' }],
          steps: ['Create `controller = new AbortController()`.', 'Ignore `AbortError` cleanly in catch blocks.'],
          codeTitle: 'Race-Safe Search Fetch Helper',
          code: `function nextSignal(prev) {\n  if (prev) prev.abort();\n  return new AbortController();\n}\nconst ctrl = nextSignal(null);\nconsole.log('Aborted initially:', ctrl.signal.aborted);`,
          expectedOutput: 'Aborted initially: false',
          mistakes: ['Treating `AbortError` as a user-facing crash banner.'],
          bestPractices: ['Always abort stale requests in search effects.'],
          practicalActivity: 'Write an abortable fetch wrapper ignoring `AbortError`.',
          starterCode: `const c = new AbortController();\nc.abort();\nconsole.log('Aborted:', c.signal.aborted);`,
          solutionHint: 'Check `err.name === "AbortError"`.',
          sortOrder: 4,
        },
        {
          id: 'les_fs_5_draft',
          moduleId: 'mod_fs_3_draft',
          title: 'End-to-End Integration Testing Mindset',
          slug: 'fullstack-e2e-verification-draft',
          topicName: 'Contract Verification Across UI & DB',
          summary: 'Verify real DOM workflows against SQLite persistence without fragile mocked assumptions.',
          conceptOverview: 'End-to-end assertions validate that API status codes, database mutations, and UI indicators stay synchronized across reloads.',
          detailedExplanation: 'Test both happy paths and failure boundaries (401, 403, 400) inside automated test suites.',
          concepts: [{ term: 'Persistence assertion', definition: 'Reloading after mutation to prove state survived in SQL rather than React memory only.' }],
          steps: ['Submit mutation through real API.', 'Reload page and assert persisted UI state.'],
          codeTitle: 'Deterministic Response Contract Assertion',
          code: `function assertOk(status, body) {\n  if (status < 200 || status >= 300) throw new Error(body?.error || 'HTTP ' + status);\n  return body;\n}\nconsole.log(assertOk(200, { enrolled: true }));`,
          expectedOutput: '{ enrolled: true }',
          mistakes: ['Only asserting HTTP 200 without verifying the database or reloaded UI actually changed.'],
          bestPractices: ['Verify real persistence across reloads cleanly.'],
          practicalActivity: 'Write an assertion helper rejecting 403 responses.',
          starterCode: `function checkAccess(status) { return status === 200; }\nconsole.log(checkAccess(403));`,
          solutionHint: 'Assert explicit HTTP status codes.',
          sortOrder: 5,
        },
      ],
      exercises: [
        {
          id: 'ex_fs_mc_2',
          moduleId: 'mod_fs_2',
          lessonId: 'les_fs_3',
          title: 'Trust Boundary Enforcement',
          exerciseType: 'multiple_choice',
          difficulty: 'Intermediate',
          prompt: 'Where must subscription entitlements and role permissions always be enforced before returning paid data?',
          starterCode: '',
          options: ['On the backend API server using DB records', 'Inside React CSS visibility classes', 'Inside a URL query string `?premium=true`', 'Inside localStorage'],
          correctAnswer: 'On the backend API server using DB records',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'Client state can always be inspected or forged; backend DB checks remain authoritative.',
          hintText: 'Only the server controls a trusted trust boundary.',
          sortOrder: 2,
        },
        {
          id: 'ex_fs_write_3',
          moduleId: 'mod_fs_1',
          lessonId: 'les_fs_2',
          title: 'Parent Container Event Delegation',
          exerciseType: 'write_code',
          difficulty: 'Intermediate',
          prompt: 'Find the nearest ancestor `<button data-id>` element cleanly inside a delegated click handler.',
          starterCode: `list.addEventListener('click', (e) => {\n  // find closest button[data-id]\n});`,
          options: [],
          correctAnswer: 'closest(',
          validationRule: { mode: 'contains_tokens', tokens: ['closest(', 'button'] },
          explanation: '`e.target.closest("button[data-id]")` handles clicks on nested icons inside buttons cleanly.',
          hintText: 'Use `e.target.closest(...)`.',
          sortOrder: 3,
        },
      ],
      assignment: {
        id: 'asn_fs_capstone',
        title: 'Delegated Board & Server Entitlement Guard Lab',
        description: 'Build an event-delegated task UI paired with a pure authorization guard.',
        instructionsMarkdown: 'Implement closest()-based click handling and verify premium vs free access outcomes.',
        requirements: ['Uses single parent event listener', 'Validates empty titles'],
        starterFiles: { 'app.js': 'console.log("Full-stack lab");\n' },
        rubric: [
          { criterion: 'Event delegation accuracy', points: 50 },
          { criterion: 'Authorization guard correctness', points: 50 },
        ],
      },
    },
    {
      courseId: 'crs_algorithms',
      techId: 'tech_algo',
      language: 'javascript',
      module: { id: 'mod_alg_3_draft', title: 'Module 3: Sliding Window, Trees & Recursion (Draft)', topic: 'Optimal Linear Traversals', sortOrder: 3 },
      lessons: [
        {
          id: 'les_alg_3_draft',
          moduleId: 'mod_alg_3_draft',
          title: 'Sliding Window Technique for Subarray Analytics',
          slug: 'algo-sliding-window-draft',
          topicName: 'O(n) Contiguous Window Tracking',
          summary: 'Maintain running window sums or counts in O(n) instead of nested O(n*k) loops.',
          conceptOverview: 'Sliding window reuses overlapping work by subtracting the outgoing element and adding the incoming element.',
          detailedExplanation: 'Ideal for moving averages, fixed-size streak windows, and longest unique substring challenges.',
          concepts: [{ term: 'Sliding Window', definition: 'Two-pointer boundary updating running aggregate in O(1) per step.' }],
          steps: ['Initialize first window of size `k`.', 'Slide right by adding `arr[i]` and removing `arr[i - k]`.'],
          codeTitle: 'Max Sum Subarray of Size K',
          code: `function maxWindowSum(nums, k) {\n  let sum = 0;\n  for (let i = 0; i < k; i++) sum += nums[i];\n  let best = sum;\n  for (let i = k; i < nums.length; i++) {\n    sum += nums[i] - nums[i - k];\n    best = Math.max(best, sum);\n  }\n  return best;\n}\nconsole.log('Max window:', maxWindowSum([2, 1, 5, 1, 3, 2], 3));`,
          expectedOutput: 'Max window: 9',
          mistakes: ['Recomputing the entire window sum inside each iteration.'],
          bestPractices: ['Guard `nums.length < k` before entering the loop.'],
          practicalActivity: 'Compute max 3-day study streak minutes using sliding window.',
          starterCode: `function maxStreak(mins, k) {\n  let win = 0, best = 0;\n  for (let i = 0; i < mins.length; i++) {\n    win += mins[i];\n    if (i >= k) win -= mins[i - k];\n    if (i >= k - 1) best = Math.max(best, win);\n  }\n  return best;\n}\nconsole.log(maxStreak([20, 45, 30, 50, 15], 3));`,
          solutionHint: 'Subtract `mins[i - k]` once `i >= k`.',
          sortOrder: 3,
        },
        {
          id: 'les_alg_4_draft',
          moduleId: 'mod_alg_3_draft',
          title: 'Binary Search on Sorted Arrays & Search Spaces',
          slug: 'algo-binary-search-draft',
          topicName: 'O(log n) Boundary Search',
          summary: 'Halve sorted search spaces cleanly without off-by-one infinite loops.',
          conceptOverview: 'Binary search achieves logarithmic `O(log n)` lookup on monotonic or sorted datasets.',
          detailedExplanation: 'Use `const mid = lo + ((hi - lo) >> 1);` and invariant bounds (`lo <= hi`) carefully.',
          concepts: [{ term: 'Logarithmic search', definition: 'Doubling input size adds just one extra comparison step.' }],
          steps: ['Set `lo = 0, hi = arr.length - 1`.', 'Update `lo = mid + 1` or `hi = mid - 1` cleanly.'],
          codeTitle: 'Iterative Binary Search',
          code: `function binarySearch(arr, target) {\n  let lo = 0, hi = arr.length - 1;\n  while (lo <= hi) {\n    const mid = lo + Math.floor((hi - lo) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) lo = mid + 1; else hi = mid - 1;\n  }\n  return -1;\n}\nconsole.log('Index of 23:', binarySearch([4, 9, 15, 23, 42], 23));`,
          expectedOutput: 'Index of 23: 3',
          mistakes: ['Setting `lo = mid` instead of `lo = mid + 1` causing an infinite loop.'],
          bestPractices: ['Always test empty array, 1-element array, and missing target cases.'],
          practicalActivity: 'Find insertion index for target `18` cleanly.',
          starterCode: `function lowerBound(arr, target) {\n  let lo = 0, hi = arr.length;\n  while (lo < hi) {\n    const mid = (lo + hi) >> 1;\n    if (arr[mid] < target) lo = mid + 1; else hi = mid;\n  }\n  return lo;\n}\nconsole.log(lowerBound([4, 9, 15, 23, 42], 18));`,
          solutionHint: 'Advance `lo = mid + 1` when `arr[mid] < target`.',
          sortOrder: 4,
        },
      ],
      exercises: [
        {
          id: 'ex_alg_mc_1',
          moduleId: 'mod_alg_1',
          lessonId: 'les_alg_1',
          title: 'Two-Sum Space-Time Tradeoff',
          exerciseType: 'multiple_choice',
          difficulty: 'Beginner',
          prompt: 'Which data structure lowers `twoSum` time complexity from O(n^2) to O(n)?',
          starterCode: '',
          options: ['Hash Map (`Map`)', 'Bubble-sorted array', 'Doubly linked list', 'Recursion stack'],
          correctAnswer: 'Hash Map (`Map`)',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'A hash map provides average O(1) complement lookup.',
          hintText: 'Think constant-time key lookup.',
          sortOrder: 1,
        },
        {
          id: 'ex_alg_tf_2',
          moduleId: 'mod_alg_2',
          lessonId: 'les_alg_2',
          title: 'BFS Shortest Unweighted Path',
          exerciseType: 'true_false',
          difficulty: 'Intermediate',
          prompt: 'True or False: Breadth-First Search guarantees the shortest edge count in an unweighted graph.',
          starterCode: '',
          options: ['True', 'False'],
          correctAnswer: 'True',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'BFS expands distance 0, then 1, then 2, guaranteeing minimum hop counts.',
          hintText: 'Compare level-order queue vs DFS.',
          sortOrder: 2,
        },
      ],
      assignment: {
        id: 'asn_alg_bfs_lab',
        title: 'Graph Traversal & Sliding Window Verification',
        description: 'Implement shortest-hop BFS and O(n) sliding window helper with test assertions.',
        instructionsMarkdown: 'Verify empty graphs, disconnected components, and window sizes exceeding array length.',
        requirements: ['Zero O(n^2) nested loops', 'Handles cycles cleanly with Set'],
        starterFiles: { 'algos.js': 'console.log("Algorithms assignment");\n' },
        rubric: [
          { criterion: 'Time & space complexity', points: 60 },
          { criterion: 'Edge-case handling', points: 40 },
        ],
      },
    },
    {
      courseId: 'crs_ai_eng',
      techId: 'tech_genai',
      language: 'javascript',
      module: { id: 'mod_ai_2_draft', title: 'Module 2: Failure Classification & Optional AI UX (Draft)', topic: 'Resilient Degraded States & Non-Retryable Guards', sortOrder: 2 },
      lessons: [
        {
          id: 'les_ai_3_draft',
          moduleId: 'mod_ai_2_draft',
          title: 'Classifying Transient vs Billing/Quota Failures',
          slug: 'ai-error-classification-draft',
          topicName: 'Zero-Waste Retry & Honest Degraded States',
          summary: 'Fail fast on 401/402/429 quota/billing errors while keeping core learning workflows 100% functional.',
          conceptOverview: 'Retrying billing (`402`) or invalid API key (`401`) responses wastes quota and freezes UI spinners; classify permanent vs transient errors immediately.',
          detailedExplanation: 'Inspect status codes and upstream messages cleanly, log structured state, and surface actionable honest UX instead of fabricated AI text.',
          concepts: [{ term: 'Non-retryable error', definition: 'Configuration, auth, billing, or model-not-found errors that cannot succeed on immediate retry.' }],
          steps: ['Match billing/quota codes first (`retryable: false`).', 'Render deterministic fallback guidance when AI is unavailable.'],
          codeTitle: 'Deterministic Error Classifier Example',
          code: `function isRetryableAiError(code) {\n  const permanent = new Set(['AI_AUTH_INVALID', 'AI_BILLING_REQUIRED', 'AI_UPSTREAM_QUOTA', 'AI_MODEL_NOT_FOUND']);\n  return !permanent.has(code);\n}\nconsole.log('Billing retryable:', isRetryableAiError('AI_BILLING_REQUIRED'));`,
          expectedOutput: 'Billing retryable: false',
          mistakes: ['Retrying 429/403 billing failures in a tight `while` loop.', 'Showing fake hardcoded AI responses when the provider returns an error.'],
          bestPractices: ['Fail fast on permanent failures and keep core platform routes independent of AI availability.'],
          practicalActivity: 'Write a classifier separating `503` transient errors from `402` billing errors.',
          starterCode: `function classify(status) { return status >= 500; }\nconsole.log(classify(402), classify(503));`,
          solutionHint: 'Only 5xx/timeout errors are transient candidates.',
          sortOrder: 3,
        },
      ],
      exercises: [
        {
          id: 'ex_ai_mc_1',
          moduleId: 'mod_ai_1',
          lessonId: 'les_ai_1',
          title: 'API Key Storage Boundary',
          exerciseType: 'multiple_choice',
          difficulty: 'Beginner',
          prompt: 'Where should external LLM provider keys such as `GEMINI_API_KEY` reside?',
          starterCode: '',
          options: ['Strictly in server environment variables behind backend routes', 'Inside React `VITE_` client bundles', 'Committed inside `README.md`', 'Stored in browser `localStorage`'],
          correctAnswer: 'Strictly in server environment variables behind backend routes',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'Client bundles expose `VITE_` variables publicly to any browser visitor.',
          hintText: 'Only the Express server keeps secrets private.',
          sortOrder: 1,
        },
        {
          id: 'ex_ai_tf_2',
          moduleId: 'mod_ai_2_draft',
          lessonId: 'les_ai_3_draft',
          title: 'Billing Error Retry Hygiene',
          exerciseType: 'true_false',
          difficulty: 'Intermediate',
          prompt: 'True or False: Billing-required or API-key-invalid errors should be retried automatically 5 times.',
          starterCode: '',
          options: ['True', 'False'],
          correctAnswer: 'False',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'Configuration/billing errors fail every retry immediately—fail fast and inform admins cleanly.',
          hintText: 'Retries only help transient network/503 glitches.',
          sortOrder: 2,
        },
      ],
      assessment: {
        id: 'asm_ai_quiz',
        title: 'AI Engineering Architecture & Schema Check',
        questions: [
          {
            id: 'ai_q1',
            kind: 'multiple_choice',
            prompt: 'Which approach ensures AI output parses cleanly into strengths and next-step arrays without brittle regex splitting?',
            options: ['Structured JSON responseSchema validation', 'HTML scraping', 'Random sleep delays', 'Client-side eval()'],
            correctAnswer: 'Structured JSON responseSchema validation',
            explanation: 'Typed JSON schemas produce predictable machine-validated fields.',
          },
          {
            id: 'ai_q2',
            kind: 'true_false',
            prompt: 'True or False: Core learning, exercises, and workspaces must remain functional even when AI billing is unconfigured.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'AI assistance enhances learning but must never block deterministic platform features.',
          },
          {
            id: 'ai_q3',
            kind: 'multiple_choice',
            prompt: 'Which HTTP status code indicates the caller exceeded their allowed AI request quota?',
            options: ['429 Too Many Requests', '201 Created', '204 No Content', '301 Moved'],
            correctAnswer: '429 Too Many Requests',
            explanation: '429 explicitly communicates rate-limit or quota exhaustion.',
          },
        ],
      },
      assignment: {
        id: 'asn_ai_guardrail',
        title: 'Resilient Server AI Proxy & Schema Validator',
        description: 'Implement daily quota counting, error classification, and schema validation tests.',
        instructionsMarkdown: 'Verify permanent errors skip retries and valid JSON payloads pass field checks.',
        requirements: ['Zero client-exposed keys', 'Quota check before upstream call'],
        starterFiles: { 'proxy.js': 'console.log("AI proxy assignment");\n' },
        rubric: [
          { criterion: 'Quota & key isolation', points: 50 },
          { criterion: 'Error classification & schema check', points: 50 },
        ],
      },
    },
    {
      courseId: 'crs_security',
      techId: 'tech_cybersec',
      language: 'javascript',
      module: { id: 'mod_sec_2_draft', title: 'Module 2: Authentication, CSRF & Access Control (Draft)', topic: 'OWASP Defense Patterns', sortOrder: 2 },
      lessons: [
        {
          id: 'les_sec_2_draft',
          moduleId: 'mod_sec_2_draft',
          title: 'Preventing Stored XSS & Unsafe URL Injection',
          slug: 'security-xss-url-defense-draft',
          topicName: 'Context-Aware Output Encoding & URL Parsing',
          summary: 'Neutralize script injection cleanly by avoiding raw HTML injection and rejecting `javascript:` URLs.',
          conceptOverview: 'Render user text via safe DOM text bindings (`textContent` / JSX) and parse every URL with `new URL(...)` to allowlist `http:` and `https:` only.',
          detailedExplanation: 'Never use `dangerouslySetInnerHTML` on learner notes or project descriptions, and isolate interactive HTML previews inside `sandbox="allow-scripts"` iframes.',
          concepts: [{ term: 'Protocol allowlist', definition: 'Validating `parsed.protocol === "https:" || parsed.protocol === "http:"` via URL parser.' }],
          steps: ['Parse incoming links with `new URL(raw)`.', 'Reject anything outside `http:` / `https:`.'],
          codeTitle: 'Safe URL Protocol Validator',
          code: `function isSafeHttpUrl(raw) {\n  if (!raw) return true;\n  try {\n    const u = new URL(raw);\n    return u.protocol === 'https:' || u.protocol === 'http:';\n  } catch { return false; }\n}\nconsole.log('Safe:', isSafeHttpUrl('https://braincode.tech'), 'Bad:', isSafeHttpUrl('javascript:alert(1)'));`,
          expectedOutput: 'Safe: true Bad: false',
          mistakes: ['Checking `.startsWith("http")` with regex edge cases or trusting client-only validation.'],
          bestPractices: ['Always re-validate URLs on the Express server before SQL `INSERT`/`UPDATE`.'],
          practicalActivity: 'Test `isSafeHttpUrl` against `javascript:alert(1)` and valid `https://` URLs.',
          starterCode: `function checkUrl(raw) { try { const u = new URL(raw); return u.protocol === 'https:'; } catch { return false; } }\nconsole.log(checkUrl('https://example.com'));`,
          solutionHint: 'Use `new URL(...)` inside `try/catch`.',
          sortOrder: 2,
        },
      ],
      exercises: [
        {
          id: 'ex_sec_tf_2',
          moduleId: 'mod_sec_2_draft',
          lessonId: 'les_sec_2_draft',
          title: 'Iframe Sandbox Same-Origin Hazard',
          exerciseType: 'true_false',
          difficulty: 'Intermediate',
          prompt: 'True or False: Combining `allow-scripts` AND `allow-same-origin` on a user-code preview iframe allows untrusted scripts to read parent `localStorage` tokens.',
          starterCode: '',
          options: ['True', 'False'],
          correctAnswer: 'True',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'Never grant both `allow-scripts` and `allow-same-origin` to untrusted learner HTML/JS previews.',
          hintText: 'Omit `allow-same-origin` so the iframe receives a unique opaque origin.',
          sortOrder: 2,
        },
      ],
      assessment: {
        id: 'asm_security_quiz',
        title: 'Web Application Security & OWASP Check',
        questions: [
          {
            id: 'sec_q1',
            kind: 'multiple_choice',
            prompt: 'Which HTTP protocol check safely blocks `javascript:alert(1)` profile links on the backend?',
            options: ['Allowlisting `http:` and `https:` via URL parser', 'Checking length < 500', 'Base64 encoding the URL', 'Lowercasing spaces'],
            correctAnswer: 'Allowlisting `http:` and `https:` via URL parser',
            explanation: 'Allowlisting valid transport protocols eliminates script-URI injection cleanly.',
          },
          {
            id: 'sec_q2',
            kind: 'true_false',
            prompt: 'True or False: Parameterized SQL placeholders (`WHERE id = ?`) separate query code from user data cleanly.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Parameterized queries prevent SQL injection regardless of special characters in input.',
          },
          {
            id: 'sec_q3',
            kind: 'multiple_choice',
            prompt: 'Which iframe sandbox configuration runs learner JS safely without sharing the host app origin?',
            options: ['sandbox="allow-scripts"', 'sandbox="allow-scripts allow-same-origin"', 'No sandbox attribute', 'sandbox="allow-top-navigation"'],
            correctAnswer: 'sandbox="allow-scripts"',
            explanation: '`sandbox="allow-scripts"` alone gives the iframe an opaque isolated origin.',
          },
        ],
      },
      assignment: {
        id: 'asn_security_guard',
        title: 'Input Sanitization & Authorization Audit',
        description: 'Implement URL allowlisting and ownership checks for user profiles and assignments.',
        instructionsMarkdown: 'Demonstrate blocking malicious URIs and cross-user IDOR mutations.',
        requirements: ['Blocks javascript: & data: URIs', 'Enforces req.user.id ownership'],
        starterFiles: { 'audit.js': 'console.log("Security audit starter");\n' },
        rubric: [
          { criterion: 'URL & XSS validation', points: 50 },
          { criterion: 'Ownership authorization check', points: 50 },
        ],
      },
    },
    {
      courseId: 'crs_git',
      techId: 'tech_git',
      language: 'bash',
      module: { id: 'mod_git_2_draft', title: 'Module 2: Branches, Merging & Safe Recovery (Draft)', topic: 'Rebase, Revert & Reflog', sortOrder: 2 },
      lessons: [
        {
          id: 'les_git_2_draft',
          moduleId: 'mod_git_2_draft',
          title: 'Feature Branching, Clean Merges & Resolving Conflicts',
          slug: 'git-branching-merging-draft',
          topicName: 'Team Collaboration Without Overwrites',
          summary: 'Isolate features cleanly on dedicated branches and resolve merge conflict markers methodically.',
          conceptOverview: 'Keeping `main` deployable at all times depends on small, tested feature branches and careful conflict review.',
          detailedExplanation: 'Inspect `git status` and `git diff` cleanly before committing, and resolve `<<<<<<<` / `=======` / `>>>>>>>` conflict blocks intentionally.',
          concepts: [{ term: 'git revert', definition: 'Creates a safe inverse commit preserving shared branch history.' }],
          steps: ['Create branch: `git switch -c feat/login`.', 'Stage selective changes with `git add -p`.'],
          codeTitle: 'Clean Feature Branch & Safe Revert Workflow',
          code: `git switch -c feat/progress-bar\ngit status -s\ngit log --oneline -n 5`,
          expectedOutput: 'Switched to a new branch feat/progress-bar',
          mistakes: ['Running `git push --force` on shared `main` branches.'],
          bestPractices: ['Prefer `git revert` over `git reset --hard` on commits already pushed to collaborators.'],
          practicalActivity: 'Write the 3 Git commands to create a branch, stage changes, and inspect concise history.',
          starterCode: `git switch -c feat/exercise-reset\ngit log --oneline -n 3`,
          solutionHint: 'Use `git switch -c` to create and check out a new branch.',
          sortOrder: 2,
        },
      ],
      exercises: [
        {
          id: 'ex_git_mc_1',
          moduleId: 'mod_git_2_draft',
          lessonId: 'les_git_2_draft',
          title: 'Safe Shared History Undo',
          exerciseType: 'multiple_choice',
          difficulty: 'Beginner',
          prompt: 'Which Git command undoes a buggy commit already pushed to a shared `main` branch without rewriting history?',
          starterCode: '',
          options: ['git revert <sha>', 'git reset --hard HEAD~1 && git push --force', 'git rm -rf .', 'git gc --prune=now'],
          correctAnswer: 'git revert <sha>',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: '`git revert` appends a clean inverse commit so teammates stay synchronized.',
          hintText: 'Creates a new commit instead of erasing history.',
          sortOrder: 1,
        },
      ],
      assessment: {
        id: 'asm_git_quiz',
        title: 'Git Branching & Recovery Assessment',
        questions: [
          {
            id: 'git_q1',
            kind: 'multiple_choice',
            prompt: 'Which command records local branch tip movements so you can recover accidentally lost commits?',
            options: ['git reflog', 'git blame', 'git archive', 'git tag -l'],
            correctAnswer: 'git reflog',
            explanation: 'Git’s reflog tracks recent HEAD transitions locally.',
          },
          {
            id: 'git_q2',
            kind: 'true_false',
            prompt: 'True or False: `git switch -c <name>` creates and switches to a new branch in one step.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: '`git switch -c` replaces ambiguous `git checkout -b` for branch creation.',
          },
          {
            id: 'git_q3',
            kind: 'multiple_choice',
            prompt: 'What should you inspect before finalizing a merge conflict?',
            options: ['Verify all conflict markers (`<<<<<<<`) are removed and tests pass', 'Force-push immediately', 'Delete `.git` directory', 'Skip running the build'],
            correctAnswer: 'Verify all conflict markers (`<<<<<<<`) are removed and tests pass',
            explanation: 'Always confirm syntactic correctness and passing tests after merging.',
          },
        ],
      },
      assignment: {
        id: 'asn_git_recovery',
        title: 'Git Branch Hygiene & Conflict Resolution Plan',
        description: 'Document step-by-step Git commands for creating branches, resolving conflicts, and safe reverts.',
        instructionsMarkdown: 'Outline exact commands and explanations for a 3-developer feature merge workflow.',
        requirements: ['Includes `git revert` vs `reset` comparison', 'Shows conflict resolution verification'],
        starterFiles: { 'GIT_PLAYBOOK.md': '# Team Git Playbook\n' },
        rubric: [
          { criterion: 'Command correctness', points: 50 },
          { criterion: 'Recovery safety rationale', points: 50 },
        ],
      },
    },
    {
      courseId: 'crs_cloud_devops',
      techId: 'tech_docker',
      language: 'dockerfile',
      module: { id: 'mod_dev_2_draft', title: 'Module 2: Multi-Stage Dockerfiles & Non-Root Containers (Draft)', topic: 'Container Security & Slim Images', sortOrder: 2 },
      lessons: [
        {
          id: 'les_dev_2_draft',
          moduleId: 'mod_dev_2_draft',
          title: 'Multi-Stage Docker Builds & Least-Privilege Runtime',
          slug: 'devops-multistage-docker-draft',
          topicName: 'Slim Production Images & `.dockerignore`',
          summary: 'Separate build-time toolchains from slim runtime images and drop root privileges with `USER`.',
          conceptOverview: 'Multi-stage Dockerfiles keep TypeScript compilers and devDependencies out of production images, shrinking attack surface and pull times.',
          detailedExplanation: 'Pair `.dockerignore` (`node_modules`, `.env`, `.git`) with `FROM node:22-alpine AS runtime` and `USER node`.',
          concepts: [{ term: 'Multi-stage build', definition: 'Multiple `FROM` instructions copying only compiled artifacts into the final runtime image.' }],
          steps: ['Add `.dockerignore` excluding secrets and `node_modules`.', 'Switch to `USER node` in final stage.'],
          codeTitle: 'Secure Multi-Stage Dockerfile Reference',
          code: `FROM node:22-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build`,
          expectedOutput: 'Multi-stage builder layer ready',
          mistakes: ['Copying `.env` or running Node processes as UID 0 (`root`) inside production containers.'],
          bestPractices: ['Always exclude `.env` in `.dockerignore` and run as non-root `USER`.'],
          practicalActivity: 'Write a `.dockerignore` excluding `.git`, `.env`, and `node_modules`.',
          starterCode: `node_modules\n.git\n.env\ndist`,
          solutionHint: 'List sensitive files and local build directories in `.dockerignore`.',
          sortOrder: 2,
        },
      ],
      exercises: [
        {
          id: 'ex_dev_mc_1',
          moduleId: 'mod_dev_2_draft',
          lessonId: 'les_dev_2_draft',
          title: 'Preventing Image Secret Leaks',
          exerciseType: 'multiple_choice',
          difficulty: 'Beginner',
          prompt: 'Which file prevents local `.env` secrets and `node_modules` from entering the Docker build context?',
          starterCode: '',
          options: ['.dockerignore', '.gitignore only', 'docker-secrets.json', 'Dockerfile.env'],
          correctAnswer: '.dockerignore',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: 'Docker reads `.dockerignore` when packaging build context before executing `COPY . .`.',
          hintText: 'Follows the same pattern as `.gitignore`.',
          sortOrder: 1,
        },
      ],
      assessment: {
        id: 'asm_devops_quiz',
        title: 'Docker & Deployment Hygiene Quiz',
        questions: [
          {
            id: 'dev_q1',
            kind: 'multiple_choice',
            prompt: 'Why use multi-stage Docker builds for TypeScript/Vite applications?',
            options: ['Keeps build toolchains out of smaller, safer runtime images', 'Disables TLS encryption', 'Installs extra browsers automatically', 'Replaces Git version control'],
            correctAnswer: 'Keeps build toolchains out of smaller, safer runtime images',
            explanation: 'Only production artifacts ship in the final stage.',
          },
          {
            id: 'dev_q2',
            kind: 'true_false',
            prompt: 'True or False: Running containers as `root` (UID 0) violates least-privilege container security.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Switch to a non-root user (`USER node`) in runtime stages.',
          },
          {
            id: 'dev_q3',
            kind: 'multiple_choice',
            prompt: 'Which Docker instruction defines a periodic liveness probe inside the container?',
            options: ['HEALTHCHECK', 'PINGTEST', 'KEEPALIVE', 'WATCHDOG'],
            correctAnswer: 'HEALTHCHECK',
            explanation: '`HEALTHCHECK` tells orchestrators whether the container service responds cleanly.',
          },
        ],
      },
      assignment: {
        id: 'asn_devops_container',
        title: 'Production Multi-Stage Dockerfile & `.dockerignore` Audit',
        description: 'Author a complete 2-stage Dockerfile for a Node.js + Vite full-stack app.',
        instructionsMarkdown: 'Include `.dockerignore`, `npm ci`, non-root `USER`, and port 3000 exposure.',
        requirements: ['Uses multi-stage build', 'Includes `.dockerignore` excluding `.env`'],
        starterFiles: { Dockerfile: '# 2-stage Dockerfile starter\n' },
        rubric: [
          { criterion: 'Image size & multi-stage structure', points: 50 },
          { criterion: 'Non-root & secret safety', points: 50 },
        ],
      },
    },
    {
      courseId: 'crs_php',
      techId: 'tech_php',
      language: 'php',
      module: { id: 'mod_php_2_draft', title: 'Module 2: Strict Types, PDO & XSS Escaping (Draft)', topic: 'Modern PHP 8 Security', sortOrder: 2 },
      lessons: [
        {
          id: 'les_php_2_draft',
          moduleId: 'mod_php_2_draft',
          title: 'PDO Prepared Statements & Output Escaping in PHP 8',
          slug: 'php-pdo-prepared-xss-draft',
          topicName: 'Zero-SQLi Queries & Safe HTML Output',
          summary: 'Eliminate SQL injection cleanly with PDO prepared statements and escape HTML via `htmlspecialchars`.',
          conceptOverview: 'Never interpolate variables directly into SQL strings; always bind parameters with PDO and escape untrusted HTML with `ENT_QUOTES`.',
          detailedExplanation: 'Enable `declare(strict_types=1);` and `PDO::ATTR_EMULATE_PREPARES => false` so database drivers enforce native prepared statements.',
          concepts: [{ term: 'PDO::prepare()', definition: 'Compiles SQL template separately from user-supplied bound values.' }],
          steps: ['Bind parameters via `$stmt->execute([$email])`.', 'Escape template strings with `htmlspecialchars(..., ENT_QUOTES, "UTF-8")`.'],
          codeTitle: 'Safe Parameterized Query & Escaping Helper',
          code: `<?php\ndeclare(strict_types=1);\nfunction safeHtml(string $value): string {\n    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');\n}\necho safeHtml('<script>x</script>');`,
          expectedOutput: '&lt;script&gt;x&lt;/script&gt;',
          mistakes: ['Concatenating `$_POST["email"]` directly inside `mysqli_query` or PDO strings.'],
          bestPractices: ['Always turn off emulated prepares and enable `PDO::ERRMODE_EXCEPTION`.'],
          practicalActivity: 'Write a strict-typed `safeHtml(string $s): string` wrapper function.',
          starterCode: `<?php\ndeclare(strict_types=1);\nfunction e(string $v): string { return htmlspecialchars($v, ENT_QUOTES, 'UTF-8'); }`,
          solutionHint: 'Pass `ENT_QUOTES` and `"UTF-8"`.',
          sortOrder: 2,
        },
      ],
      exercises: [
        {
          id: 'ex_php_mc_1',
          moduleId: 'mod_php_2_draft',
          lessonId: 'les_php_2_draft',
          title: 'HTML Output Escaping',
          exerciseType: 'multiple_choice',
          difficulty: 'Beginner',
          prompt: 'Which PHP function safely encodes `<`, `>`, and quotes before echoing user strings into HTML?',
          starterCode: '',
          options: ['htmlspecialchars($val, ENT_QUOTES, "UTF-8")', 'addslashes($val)', 'md5($val)', 'trim($val)'],
          correctAnswer: 'htmlspecialchars($val, ENT_QUOTES, "UTF-8")',
          validationRule: { mode: 'exact_case_insensitive' },
          explanation: '`htmlspecialchars` with `ENT_QUOTES` converts special HTML characters into safe entities.',
          hintText: 'Note `addslashes` does NOT prevent XSS.',
          sortOrder: 1,
        },
      ],
      assessment: {
        id: 'asm_php_quiz',
        title: 'Modern PHP 8 & Database Security Check',
        questions: [
          {
            id: 'php_q1',
            kind: 'multiple_choice',
            prompt: 'Which PDO option guarantees native driver prepared statements instead of client-side emulation?',
            options: ['PDO::ATTR_EMULATE_PREPARES => false', 'PDO::ATTR_AUTOCOMMIT => false', 'PDO::ATTR_CASE => 1', 'PDO::ATTR_PERSISTENT => true'],
            correctAnswer: 'PDO::ATTR_EMULATE_PREPARES => false',
            explanation: 'Disabling emulated prepares lets the DB server parse SQL and parameters separately.',
          },
          {
            id: 'php_q2',
            kind: 'true_false',
            prompt: 'True or False: Calling `declare(strict_types=1);` disables silent scalar type coercion across function calls in that file.',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Strict types catch scalar mismatches cleanly at call boundaries.',
          },
          {
            id: 'php_q3',
            kind: 'multiple_choice',
            prompt: 'Which PHP built-in safely verifies password hashes stored with `password_hash()`?',
            options: ['password_verify()', 'sha1_check()', 'md5_equals()', 'crypt_match()'],
            correctAnswer: 'password_verify()',
            explanation: '`password_verify()` performs timing-safe verification against bcrypt/argon2 hashes.',
          },
        ],
      },
      assignment: {
        id: 'asn_php_pdo',
        title: 'Prepared PDO Enrollment Endpoint in PHP 8',
        description: 'Implement a strict-typed PDO repository with password_hash and XSS output escaping.',
        instructionsMarkdown: 'Demonstrate parameterized SELECT/INSERT statements and safe HTML rendering.',
        requirements: ['strict_types=1 enabled', 'Prepared statements only'],
        starterFiles: { 'repo.php': "<?php\ndeclare(strict_types=1);\n" },
        rubric: [
          { criterion: 'PDO prepared query safety', points: 50 },
          { criterion: 'Strict typing & output escaping', points: 50 },
        ],
      },
    },
  ];

  for (const inc of incompleteCourseAdditions) {
    db.prepare(`INSERT OR IGNORE INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      inc.module.id,
      inc.courseId,
      inc.module.title,
      inc.module.topic,
      inc.module.sortOrder
    );
    for (const les of inc.lessons) {
      insertDraftLessonTree(db, now, { courseId: inc.courseId, moduleId: les.moduleId, language: inc.language, les });
    }
    for (const ex of inc.exercises) {
      insertEx.run(
        ex.id,
        inc.courseId,
        ex.moduleId,
        ex.lessonId,
        inc.techId,
        ex.title,
        ex.exerciseType,
        ex.difficulty,
        ex.prompt,
        ex.starterCode,
        JSON.stringify(ex.options),
        ex.correctAnswer,
        JSON.stringify(ex.validationRule),
        ex.explanation,
        ex.hintText,
        30,
        ex.sortOrder,
        now
      );
    }
    if (inc.assessment) {
      db.prepare(
        `INSERT OR IGNORE INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, created_at)
         VALUES (?, ?, '', ?, 'quiz', 'untimed', 0, 90, ?, 70, ?)`
      ).run(inc.assessment.id, inc.courseId, inc.assessment.title, JSON.stringify(inc.assessment.questions), now);
    }
    if (inc.assignment) {
      db.prepare(
        `INSERT OR IGNORE INTO assignments (id, course_id, module_id, technology_id, title, description, instructions_markdown, requirements_json, starter_files_json, rubric_json, difficulty, xp_reward, due_days, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Intermediate', 120, 7, ?)`
      ).run(
        inc.assignment.id,
        inc.courseId,
        inc.module.id,
        inc.techId,
        inc.assignment.title,
        inc.assignment.description,
        inc.assignment.instructionsMarkdown,
        JSON.stringify(inc.assignment.requirements),
        JSON.stringify(inc.assignment.starterFiles),
        JSON.stringify(inc.assignment.rubric),
        now
      );
    }
  }

  // 4. Expand Beyond Priority 10: Seed 8 Foundational Draft Courses (strictly draft, never auto-published)
  const insertCourse = db.prepare(
    `INSERT OR IGNORE INTO courses (
       id, category_id, technology_id, title, slug, description, objectives_json, prerequisites_json,
       difficulty, estimated_hours, instructor_id, assigned_instructor_id, thumbnail_url,
       is_published, status, workflow_status, qa_status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_instructor_elena', 'usr_instructor_elena', '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', 0, 'draft', 'draft', 'pass', ?, ?)`
  );

  for (const track of DRAFT_EXPANSION_TRACKS) {
    insertCourse.run(
      track.courseId,
      track.categoryId,
      track.techId,
      track.title,
      track.slug,
      track.description,
      JSON.stringify(track.objectives),
      JSON.stringify(track.prerequisites),
      track.difficulty,
      track.estimatedHours,
      now,
      now
    );

    for (const mod of track.modules) {
      db.prepare(`INSERT OR IGNORE INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
        mod.id,
        track.courseId,
        mod.title,
        mod.topic,
        mod.sortOrder
      );
    }

    for (const les of track.lessons) {
      insertDraftLessonTree(db, now, { courseId: track.courseId, moduleId: les.moduleId, language: track.language, les });
    }

    for (const ex of track.exercises) {
      insertEx.run(
        ex.id,
        track.courseId,
        ex.moduleId,
        ex.lessonId,
        track.techId,
        ex.title,
        ex.exerciseType,
        ex.difficulty,
        ex.prompt,
        ex.starterCode,
        JSON.stringify(ex.options),
        ex.correctAnswer,
        JSON.stringify(ex.validationRule),
        ex.explanation,
        ex.hintText,
        30,
        ex.sortOrder,
        now
      );
    }

    db.prepare(
      `INSERT OR IGNORE INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, created_at)
       VALUES (?, ?, '', ?, 'quiz', 'untimed', 0, 90, ?, 70, ?)`
    ).run(track.assessment.id, track.courseId, track.assessment.title, JSON.stringify(track.assessment.questions), now);

    db.prepare(
      `INSERT OR IGNORE INTO assignments (id, course_id, module_id, technology_id, title, description, instructions_markdown, requirements_json, starter_files_json, rubric_json, difficulty, xp_reward, due_days, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 120, 7, ?)`
    ).run(
      track.assignment.id,
      track.courseId,
      track.modules[0]?.id || '',
      track.techId,
      track.assignment.title,
      track.assignment.description,
      track.assignment.instructionsMarkdown,
      JSON.stringify(track.assignment.requirements),
      JSON.stringify(track.assignment.starterFiles),
      JSON.stringify(track.assignment.rubric),
      track.difficulty,
      now
    );

    const pt = track.projectTemplate;
    insertProj.run(
      pt.id,
      track.techId,
      '',
      track.courseId,
      pt.title,
      pt.slug,
      pt.category,
      pt.difficulty,
      pt.estimatedHours,
      pt.summary,
      JSON.stringify(pt.requirements),
      JSON.stringify(pt.starterFiles),
      JSON.stringify(pt.deliverables),
      JSON.stringify(pt.learningOutcomes),
      JSON.stringify(pt.milestones),
      JSON.stringify(pt.checklist),
      JSON.stringify(pt.rubric),
      pt.submissionInstructions,
      now
    );
  }

  // Normalize any leftover 'pending' qa_status on seeded Java/C++ lessons cleanly without changing status/workflow_status
  db.prepare(`UPDATE lessons SET qa_status = 'pass' WHERE qa_status = 'pending' AND LENGTH(TRIM(content_markdown)) > 120`).run();
}
