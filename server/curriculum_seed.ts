import type { DatabaseSync } from 'node:sqlite';
import { TECHNOLOGIES_CATALOG } from './technology_catalog_data.ts';
import { seedNormalizedCurriculumEnrichment } from './curriculum_enrichment.ts';

interface CategorySeed {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

interface PathSeed {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  estimatedHours: number;
  targetRole: string;
  courseIds: string[];
}

interface CourseSeed {
  id: string;
  categoryId: string;
  technologyId: string;
  title: string;
  slug: string;
  description: string;
  objectives: string[];
  difficulty: string;
  estimatedHours: number;
  thumbnailUrl: string;
  modules: Array<{
    id: string;
    title: string;
    topic: string;
    sortOrder: number;
    lessons: Array<{
      id: string;
      title: string;
      slug: string;
      topicName: string;
      summary: string;
      contentMarkdown: string;
      codeExample: string;
      language: string;
      accessTier: 'free' | 'premium';
      durationMinutes: number;
      exercisePrompt: string;
      starterCode: string;
      solutionHint: string;
      sortOrder: number;
    }>;
  }>;
  assessment?: {
    id: string;
    lessonId: string;
    title: string;
    type: string;
    mode: string;
    timeLimitSec: number;
    xpReward: number;
    questions: Array<Record<string, unknown>>;
  };
}

const CATEGORIES: CategorySeed[] = [
  { id: 'cat_web_dev', name: 'Web Development', slug: 'web-development', description: 'Semantic markup, modern styling, browser APIs, and accessible web architecture.', sortOrder: 1 },
  { id: 'cat_langs', name: 'Programming Languages', slug: 'programming-languages', description: 'Core language paradigms, memory models, strong typing, and idiomatic syntax.', sortOrder: 2 },
  { id: 'cat_frontend', name: 'Frontend Development', slug: 'frontend-development', description: 'Component systems, reactive state management, and design frameworks.', sortOrder: 3 },
  { id: 'cat_backend', name: 'Backend Development', slug: 'backend-development', description: 'Server APIs, middleware pipelines, authentication, and scalable services.', sortOrder: 4 },
  { id: 'cat_web', name: 'Full-Stack Development', slug: 'full-stack-development', description: 'End-to-end applications connecting frontend interfaces, APIs, and databases.', sortOrder: 5 },
  { id: 'cat_mobile', name: 'Mobile App Development', slug: 'mobile-app-development', description: 'Cross-platform and native iOS/Android application engineering.', sortOrder: 6 },
  { id: 'cat_db', name: 'Database Management', slug: 'database-management', description: 'Relational modeling, SQL optimization, NoSQL stores, and indexing.', sortOrder: 7 },
  { id: 'cat_ai', name: 'Artificial Intelligence and Machine Learning', slug: 'ai-machine-learning', description: 'LLM engineering, supervised models, evaluation pipelines, and AI workflows.', sortOrder: 8 },
  { id: 'cat_ds', name: 'Data Science and Analytics', slug: 'data-science-analytics', description: 'Data transformation, exploratory statistics, visualization, and reporting.', sortOrder: 9 },
  { id: 'cat_sec', name: 'Cybersecurity', slug: 'cybersecurity', description: 'Application hardening, cryptography basics, OWASP mitigation, and network defense.', sortOrder: 10 },
  { id: 'cat_net', name: 'Networking', slug: 'networking', description: 'TCP/IP fundamentals, DNS, HTTP/TLS internals, and routing.', sortOrder: 11 },
  { id: 'cat_cloud', name: 'Cloud Computing', slug: 'cloud-computing', description: 'Cloud infrastructure, IAM boundaries, managed runtimes, and serverless architectures.', sortOrder: 12 },
  { id: 'cat_devops', name: 'DevOps and Software Engineering', slug: 'devops-software-engineering', description: 'Containerization, CI/CD pipelines, Linux administration, and observability.', sortOrder: 13 },
  { id: 'cat_uiux', name: 'UI/UX and Product Design', slug: 'ui-ux-product-design', description: 'Information architecture, wireframing, usability testing, and design tokens.', sortOrder: 14 },
  { id: 'cat_design', name: 'Graphics and Digital Design', slug: 'graphics-digital-design', description: 'Visual systems, SVG illustration, typography, and digital media production.', sortOrder: 15 },
  { id: 'cat_cs', name: 'Computer Fundamentals', slug: 'computer-fundamentals', description: 'Algorithms, data structures, operating systems, and computational thinking.', sortOrder: 16 },
  { id: 'cat_tools', name: 'Software Tools and Productivity', slug: 'software-tools-productivity', description: 'Version control with Git, GitHub collaboration, CLI workflows, and IDE mastery.', sortOrder: 17 },
  { id: 'cat_game', name: 'Game Development', slug: 'game-development', description: 'Game loops, 2D/3D rendering math, collision detection, and state machines.', sortOrder: 18 },
  { id: 'cat_robotics', name: 'Robotics and Emerging Technology', slug: 'robotics-emerging-tech', description: 'Embedded controllers, sensor telemetry, automation logic, and edge computing.', sortOrder: 19 },
  { id: 'cat_frameworks', name: 'Frameworks & Libraries', slug: 'frameworks-libraries', description: 'Full-stack meta-frameworks, server frameworks, state managers, and reusable UI libraries.', sortOrder: 20 },
];

const LEARNING_PATHS: PathSeed[] = [
  { id: 'path_complete_web', title: 'Complete Web Developer', slug: 'complete-web-developer', description: 'Start with HTML semantics and CSS layout systems, master interactive JavaScript, and ship full-stack TypeScript web apps.', difficulty: 'Beginner', estimatedHours: 42, targetRole: 'Web Developer', courseIds: ['crs_html', 'crs_css', 'crs_js', 'crs_fullstack'] },
  { id: 'path_frontend', title: 'Frontend Developer', slug: 'frontend-developer', description: 'Build responsive interfaces with CSS Grid, Tailwind design tokens, TypeScript, and modern React component patterns.', difficulty: 'Beginner to Intermediate', estimatedHours: 36, targetRole: 'Frontend Engineer', courseIds: ['crs_html', 'crs_css', 'crs_js', 'crs_react'] },
  { id: 'path_backend', title: 'Backend Developer', slug: 'backend-developer', description: 'Design REST APIs, relational schemas, authentication boundaries, and scalable server runtimes.', difficulty: 'Intermediate', estimatedHours: 34, targetRole: 'Backend Engineer', courseIds: ['crs_fullstack', 'crs_sql', 'crs_python'] },
  { id: 'path_core_swe', title: 'Full-Stack Developer', slug: 'full-stack-developer', description: 'Connect browser interfaces, TypeScript APIs, relational SQL, and algorithms into production applications.', difficulty: 'Beginner to Advanced', estimatedHours: 56, targetRole: 'Full-Stack Engineer', courseIds: ['crs_fullstack', 'crs_sql', 'crs_algorithms', 'crs_ai_eng'] },
  { id: 'path_python_dev', title: 'Python Developer', slug: 'python-developer', description: 'Progress from Python syntax and data structures to OOP, file pipelines, error handling, and applied projects.', difficulty: 'Beginner to Intermediate', estimatedHours: 26, targetRole: 'Python Engineer', courseIds: ['crs_python', 'crs_sql'] },
  { id: 'path_js_dev', title: 'JavaScript Developer', slug: 'javascript-developer', description: 'Master closures, DOM event delegation, async concurrency, and algorithmic problem solving in JS.', difficulty: 'Beginner to Intermediate', estimatedHours: 30, targetRole: 'JavaScript Engineer', courseIds: ['crs_js', 'crs_algorithms'] },
  { id: 'path_react_dev', title: 'React Developer', slug: 'react-developer', description: 'Architect predictable component trees, hooks, form validation, and typed API integrations.', difficulty: 'Intermediate', estimatedHours: 28, targetRole: 'React Engineer', courseIds: ['crs_js', 'crs_react', 'crs_fullstack'] },
  { id: 'path_mobile_dev', title: 'Mobile App Developer', slug: 'mobile-app-developer', description: 'Learn typed UI engineering principles, state management, and cross-platform API integration.', difficulty: 'Intermediate', estimatedHours: 24, targetRole: 'Mobile Developer', courseIds: ['crs_react', 'crs_fullstack'] },
  { id: 'path_dba', title: 'Database Administrator', slug: 'database-administrator', description: 'Model normalized schemas, write fast relational joins, enforce constraints, and tune query indexes.', difficulty: 'Beginner to Intermediate', estimatedHours: 20, targetRole: 'Database Engineer', courseIds: ['crs_sql', 'crs_fullstack'] },
  { id: 'path_ai_ml_beg', title: 'AI and Machine Learning Beginner', slug: 'ai-ml-beginner', description: 'Combine Python programming fundamentals with structured LLM engineering and safe API orchestration.', difficulty: 'Beginner to Intermediate', estimatedHours: 32, targetRole: 'AI Developer', courseIds: ['crs_python', 'crs_ai_eng'] },
  { id: 'path_cybersec', title: 'Cybersecurity Fundamentals', slug: 'cybersecurity-fundamentals', description: 'Understand threat modeling, salted hashing, authorization boundaries, and defensive coding.', difficulty: 'Beginner to Intermediate', estimatedHours: 18, targetRole: 'Security Analyst', courseIds: ['crs_security', 'crs_fullstack'] },
  { id: 'path_cloud_devops', title: 'Cloud and DevOps Beginner', slug: 'cloud-devops-beginner', description: 'Master Git branching, Linux essentials, containerized Docker builds, and automated deployment checks.', difficulty: 'Beginner to Intermediate', estimatedHours: 22, targetRole: 'Cloud / DevOps Engineer', courseIds: ['crs_cloud_devops', 'crs_security'] },
];

const COURSES: CourseSeed[] = [
  {
    id: 'crs_python',
    categoryId: 'cat_langs',
    technologyId: 'tech_python',
    title: 'Python Programming: From Syntax to Production Systems',
    slug: 'python-programming-complete',
    description: 'Master Python systematically—from syntax, variables, loops, and functions to collections, OOP, file handling, modules, and error resilience.',
    objectives: [
      'Write clean Python syntax using strong data types, conditions, and loops.',
      'Organize logic with functions, lists, tuples, dictionaries, and custom classes.',
      'Handle files, modules, and runtime exceptions safely in practical projects.',
    ],
    difficulty: 'Beginner',
    estimatedHours: 22,
    thumbnailUrl: '/src/assets/images/course_ai_engineering_1794920077792.jpg',
    modules: [
      {
        id: 'mod_py_1',
        title: 'Module 1: Python Foundations & Control Flow',
        topic: 'Syntax, Variables, Operators & Flow',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_py_1',
            title: 'Python Introduction & Syntax',
            slug: 'python-intro-syntax',
            topicName: 'Python Introduction & Syntax',
            summary: 'Understand Python indentation rules, comments, interpreter execution, and clean output formatting.',
            contentMarkdown: '### Why Python Uses Significant Whitespace\n\nUnlike brace-delimited languages, Python uses consistent 4-space indentation to define code blocks. This enforces readable structure across scripts and backend services.\n\n### Running Your First Program\n\nUse `print()` with f-strings to inspect expressions clearly during development.',
            codeExample: 'platform = "Braincode"\nlesson_num = 1\nprint(f"Welcome to {platform} · Python Lesson {lesson_num}")',
            language: 'python',
            accessTier: 'free',
            durationMinutes: 12,
            exercisePrompt: 'Write a Python snippet (or JS equivalent in browser preview) formatting a learner welcome line with variables.',
            starterCode: '# Python 3 syntax reference\nlearner = "Ada"\ntrack = "Python Fundamentals"\nprint(f"{learner} enrolled in {track}")',
            solutionHint: 'Use f"{variable}" inside print() for readable string interpolation.',
            sortOrder: 1,
          },
          {
            id: 'les_py_2',
            title: 'Variables, Data Types & Operators',
            slug: 'python-variables-types-operators',
            topicName: 'Variables and Data Types',
            summary: 'Work with int, float, str, bool, arithmetic/comparison operators, and explicit type conversions.',
            contentMarkdown: '### Dynamic Binding with Strong Types\n\nPython binds names to objects (`int`, `float`, `str`, `bool`). Use `int()`, `float()`, and `str()` when combining user input with arithmetic.\n\n### Operators\n\nUse `//` for integer floor division, `**` for exponentiation, and `==` / `is` deliberately.',
            codeExample: 'lessons_done = 4\ntotal_lessons = 10\ncompletion_pct = (lessons_done / total_lessons) * 100\nprint(f"Progress: {completion_pct:.1f}%")',
            language: 'python',
            accessTier: 'free',
            durationMinutes: 15,
            exercisePrompt: 'Compute average quiz score across three integer submissions and format to 2 decimal places.',
            starterCode: 'scores = [88, 94, 91]\navg = sum(scores) / len(scores)\nprint(f"Average score: {avg:.2f}")',
            solutionHint: 'Divide sum(scores) by len(scores) and format with :.2f.',
            sortOrder: 2,
          },
          {
            id: 'les_py_3',
            title: 'Conditions, Loops & Functions',
            slug: 'python-conditions-loops-functions',
            topicName: 'Conditions, Loops & Functions',
            summary: 'Branch logic with if/elif/else, iterate cleanly over ranges and sequences, and encapsulate reusable functions.',
            contentMarkdown: '### Control Flow\n\nCombine `if`, `elif`, and `else` with truthiness rules. Prefer `for item in collection:` over manual index loops, and use `enumerate()` when you need both index and value.\n\n### Functions & Type Hints\n\nAnnotate parameters and return types (`def score_band(points: int) -> str:`) for clarity.',
            codeExample: 'def classify_score(points: int) -> str:\n    if points >= 90:\n        return "Distinction"\n    elif points >= 70:\n        return "Pass"\n    return "Review Needed"\n\nfor p in [95, 74, 58]:\n    print(p, classify_score(p))',
            language: 'python',
            accessTier: 'free',
            durationMinutes: 18,
            exercisePrompt: 'Write a function that filters passing scores (>= 70) from a list using a loop or comprehension.',
            starterCode: 'def passing_only(scores):\n    return [s for s in scores if s >= 70]\n\nprint(passing_only([55, 72, 89, 64, 91]))',
            solutionHint: 'Check `s >= 70` inside your loop or list comprehension.',
            sortOrder: 3,
          },
        ],
      },
      {
        id: 'mod_py_2',
        title: 'Module 2: Data Structures, OOP & File Systems',
        topic: 'Collections, Classes, Files & Modules',
        sortOrder: 2,
        lessons: [
          {
            id: 'les_py_4',
            title: 'Lists, Tuples and Dictionaries',
            slug: 'python-lists-tuples-dictionaries',
            topicName: 'Lists, Tuples and Dictionaries',
            summary: 'Choose mutable lists, immutable tuples, sets, and O(1) lookup dictionaries for structured data.',
            contentMarkdown: '### Choosing the Right Container\n\n- **List**: Ordered mutable sequence (`tasks.append(...)`).\n- **Tuple**: Immutable fixed record (`(lat, lng)`).\n- **Dictionary**: Key-value hash map (`user["role"]`), ideal for indexing records by ID.',
            codeExample: 'catalog = {"py": "Python", "sql": "SQL", "ts": "TypeScript"}\nfor slug, label in catalog.items():\n    print(f"{slug} -> {label}")',
            language: 'python',
            accessTier: 'free',
            durationMinutes: 18,
            exercisePrompt: 'Aggregate course enrollments by technology key inside a dictionary.',
            starterCode: 'enrollments = ["python", "sql", "python", "react"]\ncounts = {}\nfor tech in enrollments:\n    counts[tech] = counts.get(tech, 0) + 1\nprint(counts)',
            solutionHint: 'Use `counts.get(tech, 0) + 1` to avoid KeyError on first insertion.',
            sortOrder: 4,
          },
          {
            id: 'les_py_5',
            title: 'Object-Oriented Programming in Python',
            slug: 'python-oop',
            topicName: 'Object-Oriented Programming',
            summary: 'Model domain entities with classes, `__init__`, methods, inheritance, and dataclasses.',
            contentMarkdown: '### Modeling Domain Entities\n\nUse classes or `@dataclass` to group state and behavior cleanly while enforcing invariants in methods.',
            codeExample: 'class CourseProgress:\n    def __init__(self, title: str, total: int):\n        self.title = title\n        self.total = total\n        self.completed = 0\n\n    def complete_one(self):\n        if self.completed < self.total:\n            self.completed += 1\n        return f"{self.completed}/{self.total}"',
            language: 'python',
            accessTier: 'premium',
            durationMinutes: 22,
            exercisePrompt: 'Design a LearnerProfile class that tracks XP and awards level-ups every 250 XP.',
            starterCode: '',
            solutionHint: 'Store `self.xp` in `__init__` and compute `self.xp // 250 + 1`.',
            sortOrder: 5,
          },
          {
            id: 'les_py_6',
            title: 'File Handling, Modules, Error Handling & Advanced Python',
            slug: 'python-files-modules-errors',
            topicName: 'File Handling, Modules & Errors',
            summary: 'Use context managers (`with open(...)`), organize packages, catch specific exceptions, and build real Python projects.',
            contentMarkdown: '### Context Managers & Explicit Exceptions\n\nAlways open files inside `with open(path, "r", encoding="utf-8") as f:` so descriptors close deterministically even when exceptions occur. Catch narrow exceptions like `FileNotFoundError` or `ValueError` rather than bare `except:`.',
            codeExample: 'import json\nfrom pathlib import Path\n\ndef load_curriculum(path: str) -> dict:\n    try:\n        text = Path(path).read_text(encoding="utf-8")\n        return json.loads(text)\n    except FileNotFoundError:\n        return {"courses": []}',
            language: 'python',
            accessTier: 'premium',
            durationMinutes: 25,
            exercisePrompt: 'Write a safe JSON loader returning a typed fallback dict on FileNotFoundError or JSONDecodeError.',
            starterCode: '',
            solutionHint: 'Catch `(FileNotFoundError, json.JSONDecodeError)` explicitly.',
            sortOrder: 6,
          },
        ],
      },
    ],
    assessment: {
      id: 'asm_py_quiz',
      lessonId: 'les_py_1',
      title: 'Python Core Mastery Check',
      type: 'quiz',
      mode: 'untimed',
      timeLimitSec: 0,
      xpReward: 100,
      questions: [
        {
          id: 'py_q1',
          kind: 'multiple_choice',
          prompt: 'Which Python statement guarantees deterministic file closure even if an exception is raised?',
          options: ['with open(path) as f:', 'open(path).read()', 'try: open(path)', 'import file'],
          correctAnswer: 'with open(path) as f:',
          explanation: 'The `with` context manager automatically invokes `__exit__` to close the file handle safely.',
        },
        {
          id: 'py_q2',
          kind: 'true_false',
          prompt: 'True or False: Python tuples can be mutated in place using .append().',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Tuples are immutable sequences; lists support .append(), whereas tuples cannot change length after creation.',
        },
      ],
    },
  },
  {
    id: 'crs_html',
    categoryId: 'cat_web_dev',
    technologyId: 'tech_html_std',
    title: 'HTML5 Semantic Markup & Accessible Web Architecture',
    slug: 'html5-semantic-architecture',
    description: 'Master HTML5 document landmarks, accessible forms, validation attributes, tables, and multimedia semantics.',
    objectives: [
      'Structure pages with semantic landmarks (`header`, `nav`, `main`, `article`, `footer`).',
      'Build accessible HTML forms with native constraints and descriptive labels.',
      'Organize tabular data cleanly using `thead`, `tbody`, and `scope`.',
    ],
    difficulty: 'Beginner',
    estimatedHours: 8,
    thumbnailUrl: '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
    modules: [
      {
        id: 'mod_html_1',
        title: 'Module 1: Document Semantics & Forms',
        topic: 'Landmarks, Headings & Form Validation',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_html_1',
            title: 'HTML Document Anatomy & Semantic Landmarks',
            slug: 'html-landmarks-anatomy',
            topicName: 'HTML Elements & Landmarks',
            summary: 'Replace generic div containers with meaningful HTML5 landmarks for accessibility and SEO.',
            contentMarkdown: '### Meaning Before Styling\n\nBrowsers and assistive screen readers inspect `<header>`, `<nav>`, `<main>`, and `<article>` elements to build a navigable document outline.',
            codeExample: '<main>\n  <article>\n    <h1>Course Outline</h1>\n    <p>Semantic content stays readable everywhere.</p>\n  </article>\n</main>',
            language: 'html',
            accessTier: 'free',
            durationMinutes: 12,
            exercisePrompt: 'Build a semantic article card containing a header, main summary, and footer metadata line.',
            starterCode: '<!DOCTYPE html>\n<html>\n<body style="font-family:system-ui;padding:24px;background:#0b1220;color:#fff;">\n  <main>\n    <article>\n      <header><h2>HTML5 Semantics</h2></header>\n      <p>Clean document landmarks improve accessibility.</p>\n    </article>\n  </main>\n</body>\n</html>',
            solutionHint: 'Wrap the primary article inside `<main>` and keep headings hierarchical.',
            sortOrder: 1,
          },
          {
            id: 'les_html_2',
            title: 'Accessible Forms & Native Input Validation',
            slug: 'html-accessible-forms',
            topicName: 'Forms & Input Attributes',
            summary: 'Associate every control with `<label for="...">` and enforce email, required, and minLength checks.',
            contentMarkdown: '### Labeling Every Control\n\nAlways pair `<label for="email">` with `<input id="email" type="email" required />` so click targets and screen readers work consistently.',
            codeExample: '<form>\n  <label for="email">Email</label>\n  <input id="email" type="email" required />\n  <button type="submit">Enroll</button>\n</form>',
            language: 'html',
            accessTier: 'free',
            durationMinutes: 15,
            exercisePrompt: 'Create an interactive HTML registration snippet with explicit label bindings and console logging on submit.',
            starterCode: '<form id="reg" style="font-family:system-ui;padding:20px;background:#0b1220;color:#fff;">\n  <label for="u">Username</label><br/>\n  <input id="u" required minlength="3" style="margin:8px 0;padding:6px;" /><br/>\n  <button type="submit">Register</button>\n</form>\n<script>\n  document.getElementById("reg").addEventListener("submit", (e) => {\n    e.preventDefault();\n    console.log("Submitted:", document.getElementById("u").value);\n  });\n</script>',
            solutionHint: 'Match `for` on `<label>` to the `id` attribute of `<input>`.',
            sortOrder: 2,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_css',
    categoryId: 'cat_web_dev',
    technologyId: 'tech_css_std',
    title: 'Modern CSS: Flexbox, Grid & Responsive Design Tokens',
    slug: 'modern-css-grid-flexbox',
    description: 'Master layout algorithms, cascade specificity, CSS custom properties for light/dark themes, and fluid responsive grids.',
    objectives: [
      'Align navigation bars and toolbars cleanly with Flexbox.',
      'Compose multi-column responsive grids using CSS Grid and minmax().',
      'Implement light and dark themes cleanly with CSS custom properties.',
    ],
    difficulty: 'Beginner',
    estimatedHours: 10,
    thumbnailUrl: '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
    modules: [
      {
        id: 'mod_css_1',
        title: 'Module 1: Flexbox, Grid & Theme Variables',
        topic: 'Box Model, Flexbox & Grid',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_css_1',
            title: 'CSS Custom Properties & Flexbox Alignment',
            slug: 'css-variables-flexbox',
            topicName: 'Custom Properties & Flexbox',
            summary: 'Use `--surface` and `--accent` variables with `display: flex` for maintainable UI bars.',
            contentMarkdown: '### Design Tokens in CSS\n\nCustom properties defined on `:root` let you switch surface palettes cleanly between light and dark modes without duplicating selector rules.',
            codeExample: ':root { --accent: #0A84FF; }\n.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }',
            language: 'html',
            accessTier: 'free',
            durationMinutes: 14,
            exercisePrompt: 'Style a responsive header bar using Flexbox and custom CSS variables.',
            starterCode: '<style>\n  :root { --bg: #0b1220; --accent: #0A84FF; }\n  body { margin: 0; background: var(--bg); color: white; font-family: system-ui; padding: 20px; }\n  .bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border: 1px solid #263b5e; border-radius: 12px; }\n  .btn { background: var(--accent); color: white; border: 0; padding: 8px 14px; border-radius: 8px; }\n</style>\n<div class="bar"><strong>Braincode</strong><button class="btn">Start Learning</button></div>',
            solutionHint: 'Combine `display: flex`, `align-items: center`, and `justify-content: space-between`.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_js',
    categoryId: 'cat_web_dev',
    technologyId: 'tech_js',
    title: 'JavaScript Engineering: Closures, Async & DOM Mastery',
    slug: 'javascript-closures-async-dom',
    description: 'Deep dive into modern JavaScript closures, array transformations, Promise/async-await orchestration, and clean DOM patterns.',
    objectives: [
      'Transform structured data cleanly using map, filter, reduce, and Set/Map.',
      'Manage asynchronous requests and error boundaries using async/await.',
      'Understand lexical scope and closures in UI state handlers.',
    ],
    difficulty: 'Beginner to Intermediate',
    estimatedHours: 16,
    thumbnailUrl: '/src/assets/images/course_systems_algorithms_1794920076843.jpg',
    modules: [
      {
        id: 'mod_js_1',
        title: 'Module 1: Functional Arrays & Async Flows',
        topic: 'Data Transformation & Async/Await',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_js_1',
            title: 'Array Pipelines & Immutability Patterns',
            slug: 'js-array-pipelines',
            topicName: 'Array Transformations',
            summary: 'Chain `.filter()`, `.map()`, and `.reduce()` safely without mutating source arrays.',
            contentMarkdown: '### Pure Data Pipelines\n\nReturning new arrays prevents subtle stale-state bugs in interactive applications.',
            codeExample: 'const lessons = [{ title: "Intro", mins: 10, free: true }, { title: "Auth", mins: 25, free: false }];\nconst freeMins = lessons.filter(l => l.free).reduce((sum, l) => sum + l.mins, 0);',
            language: 'javascript',
            accessTier: 'free',
            durationMinutes: 15,
            exercisePrompt: 'Filter published courses and compute total estimated study hours using reduce().',
            starterCode: 'const courses = [\n  { title: "HTML", hours: 8, published: true },\n  { title: "Draft", hours: 12, published: false },\n  { title: "Python", hours: 22, published: true }\n];\nconst total = courses.filter(c => c.published).reduce((acc, c) => acc + c.hours, 0);\nconsole.log("Published study hours:", total);',
            solutionHint: 'Filter by `c.published` before calling `.reduce()`.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_react',
    categoryId: 'cat_frontend',
    technologyId: 'tech_react',
    title: 'React Component Architecture & Custom Hooks',
    slug: 'react-component-architecture',
    description: 'Build composable React applications with unidirectional state, custom hooks, derived state, and clean async fetching.',
    objectives: [
      'Design reusable functional components with strict TypeScript props.',
      'Avoid redundant state by computing derived UI values inline.',
      'Encapsulate async loading, error, and retry flows inside custom hooks.',
    ],
    difficulty: 'Intermediate',
    estimatedHours: 16,
    thumbnailUrl: '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
    modules: [
      {
        id: 'mod_react_1',
        title: 'Module 1: Hooks & Component Composition',
        topic: 'State, Props & Effects',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_react_1',
            title: 'Derived State vs Redundant Effects',
            slug: 'react-derived-state',
            topicName: 'State Architecture',
            summary: 'Eliminate double-render bugs by computing filtered lists directly during render instead of syncing via useEffect.',
            contentMarkdown: '### Single Source of Truth\n\nWhenever data can be computed directly from existing props and state—like filtering courses by search text—compute it inline rather than duplicating it into a second `useState`.',
            codeExample: 'const filtered = courses.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));',
            language: 'javascript',
            accessTier: 'free',
            durationMinutes: 16,
            exercisePrompt: 'Simulate derived search filtering across a course list in JavaScript.',
            starterCode: 'const courses = ["HTML Semantics", "Python Systems", "React Hooks"];\nconst query = "py";\nconsole.log(courses.filter(c => c.toLowerCase().includes(query)));',
            solutionHint: 'Normalize both the item and query using `.toLowerCase()`.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_sql',
    categoryId: 'cat_db',
    technologyId: 'tech_sql',
    title: 'SQL & Relational Database Engineering',
    slug: 'sql-relational-engineering',
    description: 'Design normalized relational tables, write complex JOIN and GROUP BY queries, and optimize lookups with B-Tree indexes.',
    objectives: [
      'Write clean SELECT, WHERE, JOIN, GROUP BY, and HAVING queries.',
      'Enforce foreign-key referential integrity across user and learning tables.',
      'Measure and accelerate query plans using composite indexes.',
    ],
    difficulty: 'Beginner to Intermediate',
    estimatedHours: 14,
    thumbnailUrl: '/src/assets/images/course_systems_algorithms_1794920076843.jpg',
    modules: [
      {
        id: 'mod_sql_1',
        title: 'Module 1: Relational Queries & Joins',
        topic: 'SELECT, JOIN & Indexes',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_sql_1',
            title: 'SELECT Filtering, Joins & Aggregations',
            slug: 'sql-joins-aggregations',
            topicName: 'Joins & Aggregation',
            summary: 'Combine related tables cleanly with INNER JOIN, LEFT JOIN, COUNT, and GROUP BY.',
            contentMarkdown: '### Combining Normalized Tables\n\nRelational databases keep courses, enrollments, and progress separated into normalized tables connected by foreign keys. Use `LEFT JOIN` to keep parent rows even when child rows do not yet exist.',
            codeExample: 'SELECT c.title, COUNT(e.user_id) AS enrolled_count\nFROM courses c\nLEFT JOIN enrollments e ON e.course_id = c.id\nGROUP BY c.id;',
            language: 'sql',
            accessTier: 'free',
            durationMinutes: 16,
            exercisePrompt: 'Practice writing an aggregated enrollment SQL query and simulate grouping in JavaScript.',
            starterCode: 'const rows = [{ course: "SQL", user: "u1" }, { course: "SQL", user: "u2" }, { course: "HTML", user: "u1" }];\nconst grouped = rows.reduce((m, r) => ((m[r.course] = (m[r.course] || 0) + 1), m), {});\nconsole.log("Enrollment counts:", grouped);',
            solutionHint: 'Group by course identifier before counting distinct student rows.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_java',
    categoryId: 'cat_langs',
    technologyId: 'tech_java',
    title: 'Java Object-Oriented Systems & Collections',
    slug: 'java-oop-collections',
    description: 'Master strongly typed classes, interfaces, generics, Java Collections, and exception handling on the JVM.',
    objectives: [
      'Apply interfaces and polymorphism cleanly in modular Java packages.',
      'Select optimal collections (`ArrayList`, `HashMap`, `HashSet`).',
    ],
    difficulty: 'Intermediate',
    estimatedHours: 18,
    thumbnailUrl: '/src/assets/images/course_systems_algorithms_1794920076843.jpg',
    modules: [
      {
        id: 'mod_java_1',
        title: 'Module 1: JVM Types & Interfaces',
        topic: 'Classes, Interfaces & Collections',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_java_1',
            title: 'Classes, Records & Interface Contracts in Java',
            slug: 'java-classes-interfaces',
            topicName: 'OOP & Contracts',
            summary: 'Separate interface behavior contracts from concrete implementations for testable Java services.',
            contentMarkdown: '### Programming to Interfaces\n\nDefining a `PaymentAdapter` interface allows swapping sandbox and production billing providers without changing business logic.',
            codeExample: 'public interface EntitlementCheck {\n  boolean hasAccess(String userId, String feature);\n}',
            language: 'java',
            accessTier: 'free',
            durationMinutes: 16,
            exercisePrompt: 'Model an entitlement interface pattern cleanly.',
            starterCode: '',
            solutionHint: 'Keep interface methods focused on inputs and boolean or result-object outputs.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_php',
    categoryId: 'cat_backend',
    technologyId: 'tech_php',
    title: 'Modern PHP 8 & Secure Database Backends',
    slug: 'modern-php-backends',
    description: 'Build typed PHP 8 REST handlers, validate incoming JSON payloads, and run SQL safely using PDO prepared statements.',
    objectives: [
      'Use strict types (`declare(strict_types=1);`) and typed properties.',
      'Prevent SQL injection with PDO parameterized queries.',
    ],
    difficulty: 'Beginner to Intermediate',
    estimatedHours: 12,
    thumbnailUrl: '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
    modules: [
      {
        id: 'mod_php_1',
        title: 'Module 1: Typed PHP & PDO',
        topic: 'Syntax & Prepared Statements',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_php_1',
            title: 'PDO Prepared Statements & JSON Endpoints',
            slug: 'php-pdo-json',
            topicName: 'Prepared Statements',
            summary: 'Bind SQL parameters safely using PDO placeholders and return structured JSON headers.',
            contentMarkdown: '### Never Concatenate User Input into SQL\n\nAlways prepare parameterized statements (`$stmt = $pdo->prepare(...)`) and bind variables with `execute([$id])`.',
            codeExample: '$stmt = $pdo->prepare("SELECT id, title FROM courses WHERE slug = ?");\n$stmt->execute([$slug]);',
            language: 'php',
            accessTier: 'free',
            durationMinutes: 15,
            exercisePrompt: 'Inspect the PDO parameterized query pattern.',
            starterCode: '',
            solutionHint: 'Use `?` or named `:slug` placeholders in `prepare()`.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_security',
    categoryId: 'cat_sec',
    technologyId: 'tech_cybersec',
    title: 'Cybersecurity Fundamentals & Web Application Defense',
    slug: 'cybersecurity-web-defense',
    description: 'Protect web applications against injection, broken access control, credential stuffing, and forged payment webhooks.',
    objectives: [
      'Hash passwords with per-user salts using scrypt/Argon2 and timing-safe comparisons.',
      'Verify HMAC webhook signatures and enforce backend RBAC authorization.',
    ],
    difficulty: 'Beginner to Intermediate',
    estimatedHours: 14,
    thumbnailUrl: '/src/assets/images/course_systems_algorithms_1794920076843.jpg',
    modules: [
      {
        id: 'mod_sec_1',
        title: 'Module 1: Authentication & Access Control',
        topic: 'Hashing, HMAC & Trust Boundaries',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_sec_1',
            title: 'Password Salting, Timing-Safe Equality & Webhook Signatures',
            slug: 'security-hashing-hmac',
            topicName: 'Cryptographic Verification',
            summary: 'Eliminate timing leaks and verify third-party webhook authenticity before altering user state.',
            contentMarkdown: '### Defense in Depth\n\nCombine salted password derivation (`crypto.scryptSync`), sliding-window rate limiters, and `crypto.timingSafeEqual` on webhook HMAC digests.',
            codeExample: 'const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");',
            language: 'javascript',
            accessTier: 'free',
            durationMinutes: 18,
            exercisePrompt: 'Write a constant-time token comparison helper in JavaScript.',
            starterCode: 'function safeCompare(a, b) {\n  if (a.length !== b.length) return false;\n  let diff = 0;\n  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);\n  return diff === 0;\n}\nconsole.log("Match:", safeCompare("sig_123", "sig_123"));',
            solutionHint: 'XOR every character across equal-length strings without returning early on mismatch.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_cloud_devops',
    categoryId: 'cat_devops',
    technologyId: 'tech_docker',
    title: 'Git, Linux & Docker Containers for Developers',
    slug: 'git-linux-docker-foundations',
    description: 'Package applications reliably with Docker multi-stage builds, automate CI checks, and manage branches cleanly in Git.',
    objectives: [
      'Navigate Linux permissions, processes, and environment variables safely.',
      'Write clean multi-stage Dockerfiles for Node.js and Python apps.',
    ],
    difficulty: 'Beginner',
    estimatedHours: 12,
    thumbnailUrl: '/src/assets/images/course_ai_engineering_1794920077792.jpg',
    modules: [
      {
        id: 'mod_ops_1',
        title: 'Module 1: Containers & Version Control',
        topic: 'Dockerfiles & Git Workflows',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_ops_1',
            title: 'Multi-Stage Dockerfiles & Non-Root Containers',
            slug: 'docker-multistage-builds',
            topicName: 'Docker Architecture',
            summary: 'Shrink image footprints and reduce attack surface by separating build stages from runtime containers.',
            contentMarkdown: '### Lean Production Images\n\nCompile TypeScript and Vite bundles in a builder stage, then copy only `dist/` and production dependencies into a slim non-root runtime stage.',
            codeExample: 'FROM node:22-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci && npm run build',
            language: 'dockerfile',
            accessTier: 'free',
            durationMinutes: 14,
            exercisePrompt: 'Inspect container layer caching order when copying package.json before application source.',
            starterCode: '',
            solutionHint: 'Copy `package.json` and run `npm ci` before `COPY . .` to maximize layer caching.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_typescript',
    categoryId: 'cat_frontend',
    technologyId: 'tech_ts_std',
    title: 'TypeScript Generics, Unions & Strict Contracts',
    slug: 'typescript-strict-contracts',
    description: 'Eliminate runtime type bugs using TypeScript interfaces, discriminated unions, generics, and type narrowing.',
    objectives: [
      'Model API response envelopes cleanly using discriminated unions.',
      'Write reusable type-safe helpers with constrained generic parameters.',
    ],
    difficulty: 'Intermediate',
    estimatedHours: 14,
    thumbnailUrl: '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
    modules: [
      {
        id: 'mod_ts_1',
        title: 'Module 1: Structural Typing & Narrowing',
        topic: 'Interfaces, Unions & Generics',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_ts_1',
            title: 'Discriminated Unions & Exhaustive Type Guards',
            slug: 'typescript-discriminated-unions',
            topicName: 'Discriminated Unions',
            summary: 'Use literal tag properties so TypeScript narrows union payloads safely in switch and conditional blocks.',
            contentMarkdown: '### Predictable State Modeling\n\nAttaching a literal `status` field lets TypeScript verify every branch (`loading`, `ready`, `error`) at compile time without unsafe casts.',
            codeExample: 'type ApiState<T> = { status: "loading" } | { status: "ok"; data: T } | { status: "error"; message: string };',
            language: 'javascript',
            accessTier: 'free',
            durationMinutes: 16,
            exercisePrompt: 'Test a state handler in JavaScript returning structured status strings.',
            starterCode: 'function renderState(s) {\n  if (s.status === "ok") return "Items: " + s.data.length;\n  if (s.status === "error") return "Err: " + s.message;\n  return "Loading...";\n}\nconsole.log(renderState({ status: "ok", data: ["TS", "React"] }));',
            solutionHint: 'Check `s.status` explicitly before accessing variant-specific fields.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_nodejs',
    categoryId: 'cat_backend',
    technologyId: 'tech_node',
    title: 'Node.js APIs, Streams & Event Loop Architecture',
    slug: 'nodejs-apis-event-loop',
    description: 'Build production Node.js HTTP servers, understand non-blocking I/O, validate inputs, and handle graceful shutdowns.',
    objectives: [
      'Understand non-blocking event-loop phases and async error propagation.',
      'Construct modular Express middleware and structured JSON validation.',
    ],
    difficulty: 'Intermediate',
    estimatedHours: 15,
    thumbnailUrl: '/src/assets/images/course_systems_algorithms_1794920076843.jpg',
    modules: [
      {
        id: 'mod_node_1',
        title: 'Module 1: Async I/O & HTTP Routing',
        topic: 'Event Loop & API Handlers',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_node_1',
            title: 'Async Request Handlers & Input Validation',
            slug: 'nodejs-async-validation',
            topicName: 'API Architecture',
            summary: 'Validate request bodies cleanly and return explicit HTTP status codes without leaking stack traces.',
            contentMarkdown: '### Explicit Validation Boundaries\n\nSanitize and verify types at route entry before hitting the database so bad client payloads return deterministic `400` JSON errors.',
            codeExample: 'const email = String(req.body?.email || "").trim().toLowerCase();\nif (!email.includes("@")) return res.status(400).json({ error: "Invalid email" });',
            language: 'javascript',
            accessTier: 'free',
            durationMinutes: 15,
            exercisePrompt: 'Validate a normalized payload object and print the clean result.',
            starterCode: 'function validateEnrollment(input) {\n  const slug = String(input.slug || "").trim();\n  if (!slug) throw new Error("Course slug required");\n  return { slug, ok: true };\n}\nconsole.log(validateEnrollment({ slug: "nodejs-apis" }));',
            solutionHint: 'Trim strings and reject empty identifiers early.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'crs_git',
    categoryId: 'cat_tools',
    technologyId: 'tech_git',
    title: 'Git Version Control, Branching & Clean History',
    slug: 'git-version-control-workflows',
    description: 'Master Git commits, feature branching, merge conflict resolution, interactive rebasing, and bisect debugging.',
    objectives: [
      'Keep commit history atomic and bisect-friendly across feature branches.',
      'Resolve merge conflicts calmly and safely recover detached HEAD states.',
    ],
    difficulty: 'Beginner',
    estimatedHours: 8,
    thumbnailUrl: '/src/assets/images/course_fullstack_architecture_1794920076647.jpg',
    modules: [
      {
        id: 'mod_git_1',
        title: 'Module 1: Branches, Diffs & Merge Safety',
        topic: 'Core Git CLI Commands',
        sortOrder: 1,
        lessons: [
          {
            id: 'les_git_1',
            title: 'Branching, Staging & Atomic Commits',
            slug: 'git-branching-atomic-commits',
            topicName: 'Git Workflows',
            summary: 'Inspect staged diffs with `git diff --staged` and keep feature branches small and reviewable.',
            contentMarkdown: '### Working Safely with Branches\n\nAlways create a focused branch (`git checkout -b feat/search-filter`), stage deliberate hunks, and verify tests before opening a pull request.',
            codeExample: 'git checkout -b feat/tech-directory\ngit add -p\ngit commit -m "Add technology category filtering"',
            language: 'bash',
            accessTier: 'free',
            durationMinutes: 12,
            exercisePrompt: 'Review a simulated Git commit log filter in JavaScript.',
            starterCode: 'const commits = [\n  { hash: "a1f4", msg: "Add tech catalog index" },\n  { hash: "b2c9", msg: "Fix mobile grid spacing" }\n];\nconsole.log(commits.map(c => `${c.hash} ${c.msg}`).join("\\n"));',
            solutionHint: 'Write clear imperative commit subjects describing why the change exists.',
            sortOrder: 1,
          },
        ],
      },
    ],
  },
];

export function seedExpandedCurriculum(db: DatabaseSync) {
  const now = new Date().toISOString();

  // 1. Seed / upsert all Categories
  const insertCat = db.prepare(
    `INSERT OR IGNORE INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  for (const cat of CATEGORIES) {
    insertCat.run(cat.id, cat.name, cat.slug, cat.description, cat.sortOrder);
  }

  // 2. Seed / update 233+ genuine Technologies with aliases, colors, difficulty & honest status
  const insertTech = db.prepare(
    `INSERT INTO technologies (id, category_id, name, slug, description, icon_symbol, sort_order, is_published, overview_markdown, is_popular, aliases_json, difficulty, brand_color, content_status, featured_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       category_id = excluded.category_id,
       description = CASE WHEN technologies.description = '' THEN excluded.description ELSE technologies.description END,
       icon_symbol = COALESCE(NULLIF(excluded.icon_symbol, ''), technologies.icon_symbol),
       sort_order = CASE WHEN technologies.sort_order = 0 THEN excluded.sort_order ELSE technologies.sort_order END,
       overview_markdown = CASE WHEN technologies.overview_markdown = '' THEN excluded.overview_markdown ELSE technologies.overview_markdown END,
       is_popular = CASE WHEN technologies.is_popular = 0 THEN excluded.is_popular ELSE technologies.is_popular END,
       aliases_json = CASE WHEN technologies.aliases_json = '[]' OR technologies.aliases_json = '' THEN excluded.aliases_json ELSE technologies.aliases_json END,
       difficulty = CASE WHEN technologies.difficulty = '' THEN excluded.difficulty ELSE technologies.difficulty END,
       brand_color = CASE WHEN technologies.brand_color = '#0A84FF' OR technologies.brand_color = '' THEN excluded.brand_color ELSE technologies.brand_color END,
       content_status = excluded.content_status,
       featured_order = CASE WHEN technologies.featured_order = 0 THEN excluded.featured_order ELSE technologies.featured_order END,
       created_at = CASE WHEN technologies.created_at = '' THEN excluded.created_at ELSE technologies.created_at END`
  );
  for (let i = 0; i < TECHNOLOGIES_CATALOG.length; i++) {
    const t = TECHNOLOGIES_CATALOG[i];
    const createdStamp = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + (TECHNOLOGIES_CATALOG.length - i) * 3600000).toISOString();
    insertTech.run(
      t.id,
      t.categoryId,
      t.name,
      t.slug,
      t.description,
      t.iconSymbol,
      t.sortOrder,
      t.overviewMarkdown,
      t.isPopular,
      JSON.stringify(t.aliases),
      t.difficulty,
      t.brandColor,
      t.contentStatus,
      t.featuredOrder,
      createdStamp
    );
  }

  // Ensure seeded existing legacy tech rows have clean icons, metadata & honest status
  db.prepare(`UPDATE technologies SET icon_symbol = 'AL', sort_order = 234, is_popular = 1, brand_color = '#0EA5E9', difficulty = 'Intermediate', content_status = 'available', aliases_json = '["dsa","graphs","trees","sorting"]', created_at = COALESCE(NULLIF(created_at, ''), ?) WHERE slug = 'algorithms-data-structures'`).run(now);
  db.prepare(`UPDATE technologies SET icon_symbol = 'GM', sort_order = 235, is_popular = 0, brand_color = '#8B5CF6', difficulty = 'Intermediate', content_status = 'available', aliases_json = '["gemini","llm","ai pipelines"]', created_at = COALESCE(NULLIF(created_at, ''), ?) WHERE slug = 'gemini-ai-systems'`).run(now);
  db.prepare(`UPDATE technologies SET icon_symbol = 'WEB', sort_order = 236, is_popular = 0, brand_color = '#E34F26', difficulty = 'Beginner', content_status = 'coming_soon', aliases_json = '["web basics"]', created_at = COALESCE(NULLIF(created_at, ''), ?) WHERE slug = 'html-css-javascript'`).run(now);
  db.prepare(`UPDATE technologies SET icon_symbol = 'TSR', sort_order = 237, is_popular = 0, brand_color = '#3178C6', difficulty = 'Intermediate', content_status = 'available', aliases_json = '["fullstack ts","dom"]', created_at = COALESCE(NULLIF(created_at, ''), ?) WHERE slug = 'typescript-react'`).run(now);

  // 3. Seed Courses, Modules, Lessons, Assessments
  const insertCourse = db.prepare(
    `INSERT OR IGNORE INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'usr_mentor_admin', ?, 1, 'published', ?)`
  );
  const insertMod = db.prepare(
    `INSERT OR IGNORE INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`
  );
  const insertLesson = db.prepare(
    `INSERT OR IGNORE INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, code_example, language, video_url, downloadable_resource, access_tier, duration_minutes, exercise_prompt, starter_code, solution_hint, status, version, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, 'published', 1, ?)`
  );
  const insertAssessment = db.prepare(
    `INSERT OR IGNORE INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const c of COURSES) {
    insertCourse.run(
      c.id,
      c.categoryId,
      c.technologyId,
      c.title,
      c.slug,
      c.description,
      JSON.stringify(c.objectives),
      c.difficulty,
      c.estimatedHours,
      c.thumbnailUrl,
      now
    );
    for (const m of c.modules) {
      insertMod.run(m.id, c.id, m.title, m.topic, m.sortOrder);
      for (const l of m.lessons) {
        insertLesson.run(
          l.id,
          m.id,
          c.id,
          l.title,
          l.slug,
          l.topicName,
          l.summary,
          l.contentMarkdown,
          l.codeExample,
          l.language,
          `${l.slug}-notes.md`,
          l.accessTier,
          l.durationMinutes,
          l.exercisePrompt,
          l.starterCode,
          l.solutionHint,
          l.sortOrder
        );
      }
    }
    if (c.assessment) {
      insertAssessment.run(
        c.assessment.id,
        c.id,
        c.assessment.lessonId,
        c.assessment.title,
        c.assessment.type,
        c.assessment.mode,
        c.assessment.timeLimitSec,
        c.assessment.xpReward,
        JSON.stringify(c.assessment.questions),
        now
      );
    }
  }

  // 4. Seed all 12 Structured Learning Paths
  const insertPath = db.prepare(
    `INSERT OR IGNORE INTO learning_paths (id, title, slug, description, difficulty, estimated_hours, target_role, course_ids_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const p of LEARNING_PATHS) {
    insertPath.run(
      p.id,
      p.title,
      p.slug,
      p.description,
      p.difficulty,
      p.estimatedHours,
      p.targetRole,
      JSON.stringify(p.courseIds)
    );
  }

  // 5. Technology-Specific Reference Docs
  const insertRes = db.prepare(
    `INSERT OR IGNORE INTO resources (id, title, category, technology, type, summary, content_markdown, code_snippet, video_url, downloadable_filename, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?)`
  );
  insertRes.run(
    'res_ref_python',
    'Python 3 Core Syntax & Collections Reference',
    'Reference',
    'Python',
    'reference',
    'Quick lookup for Python list/dict comprehensions, slicing, context managers, and exception types.',
    'Python provides concise built-in data structures (`list`, `tuple`, `set`, `dict`), slicing (`items[start:stop:step]`), and `with` resource management.',
    'counts = {k: v for k, v in items if v > 0}',
    'python-quick-reference.md',
    now
  );
  insertRes.run(
    'res_ref_html',
    'HTML5 Semantic Elements & Input Attributes Guide',
    'Reference',
    'HTML',
    'reference',
    'Semantic landmark reference covering header, nav, main, section, article, aside, footer, and ARIA labels.',
    'Use landmark elements before adding generic div wrappers so document structure stays clear to browsers and assistive technologies.',
    '<main aria-label="Primary content">\n  <article>...</article>\n</main>',
    'html5-reference.md',
    now
  );
  insertRes.run(
    'res_ref_react',
    'React Hooks & Component Composition Reference',
    'Reference',
    'React',
    'reference',
    'Patterns for useState, useEffect cleanup, useCallback stability, and custom data hooks.',
    'Always return cleanup functions from effects subscribing to timers or WebSockets so unmounted views never leak listeners.',
    'useEffect(() => {\n  const id = setInterval(tick, 1000);\n  return () => clearInterval(id);\n}, []);',
    'react-hooks-reference.md',
    now
  );

  // 6. Seed normalized curriculum tables (topics, structured blocks, code examples, 10-type exercises, assignments, project templates, 15 career paths)
  seedNormalizedCurriculumEnrichment(db);
  db.prepare(`UPDATE courses SET completion_rule = 'lessons_and_assessments' WHERE id = 'crs_fullstack' AND completion_rule = 'all_lessons'`).run();
}
