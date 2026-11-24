import type { DatabaseSync } from 'node:sqlite';

interface ExtraLearningPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  overview: string;
  audience: string;
  difficulty: string;
  estimatedHours: number;
  targetRole: string;
  courseIds: string[];
  prerequisites: string[];
  objectives: string[];
  milestones: Array<{ step: number; title: string; summary: string }>;
  projectTemplateIds: string[];
}

const LEARNING_PATH_METADATA: Record<
  string,
  {
    overview: string;
    audience: string;
    prerequisites: string[];
    objectives: string[];
    milestones: Array<{ step: number; title: string; summary: string }>;
    projectTemplateIds: string[];
  }
> = {
  path_complete_web: {
    overview:
      'Go from zero web knowledge to building responsive, accessible, interactive web applications with semantic HTML5, modern CSS Grid/Flexbox, DOM-driven JavaScript, and full-stack TypeScript.',
    audience: 'Beginners and career switchers aiming to build real websites and web apps.',
    prerequisites: ['Basic computer literacy', 'A modern web browser'],
    objectives: [
      'Author accessible, semantic HTML5 document structures and validated forms.',
      'Build responsive layouts using CSS custom properties, Flexbox, and Grid.',
      'Handle browser events, state transitions, and client-side interactivity in JS & TypeScript.',
    ],
    milestones: [
      { step: 1, title: 'Markup & Visual Structure', summary: 'Complete HTML5 and Modern CSS foundations.' },
      { step: 2, title: 'Interactive Browser Logic', summary: 'Build dynamic DOM pipelines in JavaScript.' },
      { step: 3, title: 'Full-Stack Portfolio Site', summary: 'Deliver the Responsive Developer Portfolio project.' },
    ],
    projectTemplateIds: ['ptpl_web_portfolio', 'ptpl_js_taskboard'],
  },
  path_frontend: {
    overview:
      'Specialize in user-facing engineering: clean design tokens, responsive layouts, accessible UI patterns, TypeScript contracts, and composable React architecture.',
    audience: 'Aspiring frontend engineers and UI developers.',
    prerequisites: ['Basic comfort with HTML/CSS concepts'],
    objectives: [
      'Create multi-breakpoint layouts without fragile CSS overrides.',
      'Avoid redundant state and effect bugs in React applications.',
      'Build accessible forms, drawers, and interactive coding tools.',
    ],
    milestones: [
      { step: 1, title: 'Semantic & Responsive UI', summary: 'Master HTML5 landmarks and CSS Grid.' },
      { step: 2, title: 'Type-Safe React Components', summary: 'Architect hooks and derived state cleanly.' },
      { step: 3, title: 'Interactive Dashboard App', summary: 'Ship the React Course Tracker template.' },
    ],
    projectTemplateIds: ['ptpl_web_portfolio', 'ptpl_react_tracker'],
  },
  path_backend: {
    overview:
      'Architect reliable server APIs, relational SQL databases, authentication boundaries, input validation, and structured Python/Node.js services.',
    audience: 'Developers transitioning into API, systems, or database engineering.',
    prerequisites: ['Basic programming syntax familiarity'],
    objectives: [
      'Model normalized relational tables with foreign keys and composite indexes.',
      'Protect API endpoints using server-side validation and entitlement checks.',
      'Build clean CLI and API data pipelines in Python and Node.js.',
    ],
    milestones: [
      { step: 1, title: 'Relational SQL Mastery', summary: 'Design schemas, JOINs, and indexed queries.' },
      { step: 2, title: 'API Trust Boundaries', summary: 'Implement validation and role guards.' },
      { step: 3, title: 'Inventory & Analytics API', summary: 'Ship the SQL + Python data project.' },
    ],
    projectTemplateIds: ['ptpl_sql_ledger', 'ptpl_python_cli'],
  },
  path_core_swe: {
    overview:
      'Master the full vertical slice of modern software engineering: accessible browser UIs, TypeScript contracts, relational databases, algorithms, and production AI pipelines.',
    audience: 'Builders preparing for full-stack software engineering roles.',
    prerequisites: ['Foundational familiarity with HTML/JS or any programming language'],
    objectives: [
      'Design end-to-end features spanning UI, API, and SQLite/PostgreSQL storage.',
      'Analyze Big-O complexity and implement graph/hash-map algorithms.',
      'Integrate server-side LLM endpoints with strict schema validation and quotas.',
    ],
    milestones: [
      { step: 1, title: 'Full-Stack Web Systems', summary: 'Ship accessible DOM & API validation flows.' },
      { step: 2, title: 'Data & Algorithmic Rigor', summary: 'Pass SQL and Data Structures challenges.' },
      { step: 3, title: 'Applied AI Capstone', summary: 'Deliver a production-ready capstone project.' },
    ],
    projectTemplateIds: ['ptpl_react_tracker', 'ptpl_sql_ledger'],
  },
  path_python_dev: {
    overview:
      'A structured Python mastery journey covering syntax, types, control flow, collections, object-oriented design, file systems, error resilience, and relational SQL integration.',
    audience: 'First-time programmers, automation builders, and aspiring backend/AI developers.',
    prerequisites: ['No prior coding experience required'],
    objectives: [
      'Write idiomatic Python functions, comprehensions, and dataclasses.',
      'Handle files, JSON payloads, and exceptions safely.',
      'Connect Python workflows with SQL databases.',
    ],
    milestones: [
      { step: 1, title: 'Python Core Syntax', summary: 'Complete variables, loops, functions, and collections.' },
      { step: 2, title: 'OOP & Resilient File I/O', summary: 'Build modular classes and exception handlers.' },
      { step: 3, title: 'Python CLI Log Analyzer', summary: 'Deliver the Python CLI Portfolio Project.' },
    ],
    projectTemplateIds: ['ptpl_python_cli', 'ptpl_sql_ledger'],
  },
};

const EXTRA_LEARNING_PATHS: ExtraLearningPath[] = [
  {
    id: 'path_uiux_designer',
    title: 'UI/UX Designer',
    slug: 'ui-ux-designer',
    description:
      'Bridge visual product design with semantic HTML, accessible form usability, CSS design tokens, and responsive component systems.',
    overview:
      'Learn how accessibility standards, typography hierarchy, color contrast, spacing systems, and responsive CSS Grid translate design intent into inclusive production interfaces.',
    audience: 'Product designers, UI engineers, and web creators.',
    difficulty: 'Beginner',
    estimatedHours: 22,
    targetRole: 'UI/UX Designer & Design Engineer',
    courseIds: ['crs_html', 'crs_css', 'crs_react'],
    prerequisites: ['Interest in visual systems and digital product usability'],
    objectives: [
      'Structure interfaces around semantic landmarks and keyboard navigation.',
      'Design light/dark theme token palettes with accessible WCAG AA contrast.',
      'Translate layout specs into responsive CSS Grid and Flexbox components.',
    ],
    milestones: [
      { step: 1, title: 'Accessible Information Structure', summary: 'Semantic HTML5 & WCAG form patterns.' },
      { step: 2, title: 'Design Tokens & Grids', summary: 'CSS custom properties, Flexbox, and Grid.' },
      { step: 3, title: 'Component System Prototype', summary: 'Ship an accessible portfolio showcase.' },
    ],
    projectTemplateIds: ['ptpl_web_portfolio'],
  },
  {
    id: 'path_data_analyst',
    title: 'Data Analyst',
    slug: 'data-analyst',
    description:
      'Transform raw datasets into trustworthy insights using SQL aggregations, relational joins, Python data processing, and reproducible reporting scripts.',
    overview:
      'Build practical analytical fluency: clean structured records in Python, aggregate normalized tables with SQL GROUP BY/HAVING, and produce verified metrics reports.',
    audience: 'Aspiring data analysts, business intelligence specialists, and researchers.',
    difficulty: 'Beginner to Intermediate',
    estimatedHours: 28,
    targetRole: 'Data Analyst',
    courseIds: ['crs_sql', 'crs_python'],
    prerequisites: ['Basic spreadsheet or math comfort'],
    objectives: [
      'Write accurate multi-table SQL joins and summary aggregations.',
      'Automate JSON/CSV parsing and data validation in Python.',
      'Prevent duplicate counting and missing-key errors in analytical reports.',
    ],
    milestones: [
      { step: 1, title: 'Relational Querying', summary: 'Master SQL filtering, JOINs, and GROUP BY.' },
      { step: 2, title: 'Python Data Pipelines', summary: 'Process files, dicts, and numerical averages cleanly.' },
      { step: 3, title: 'Course Analytics Warehouse', summary: 'Deliver the SQL Metrics & CLI Report project.' },
    ],
    projectTemplateIds: ['ptpl_sql_ledger', 'ptpl_python_cli'],
  },
  {
    id: 'path_swe_foundations',
    title: 'Software Engineering Foundations',
    slug: 'software-engineering-foundations',
    description:
      'Build rock-solid engineering habits: Git version control, Linux & Docker containers, Big-O algorithms, defensive security, and type-safe TypeScript.',
    overview:
      'Focus on the timeless engineering skills that transfer across every stack: atomic commits, algorithmic complexity, secure coding boundaries, and reproducible environments.',
    audience: 'Computer science students, self-taught coders, and junior engineers.',
    difficulty: 'Beginner to Intermediate',
    estimatedHours: 36,
    targetRole: 'Junior Software Engineer',
    courseIds: ['crs_git', 'crs_algorithms', 'crs_typescript', 'crs_security', 'crs_cloud_devops'],
    prerequisites: ['Basic familiarity with writing functions in any language'],
    objectives: [
      'Maintain clean Git branches, diffs, and conflict-free workflows.',
      'Reason about hash maps, BFS graphs, and time/space tradeoffs.',
      'Prevent common web security flaws using cryptographic best practices.',
    ],
    milestones: [
      { step: 1, title: 'Version Control & Containers', summary: 'Complete Git workflows and Docker builds.' },
      { step: 2, title: 'Algorithms & Strict Types', summary: 'Complete Big-O, graphs, and TypeScript unions.' },
      { step: 3, title: 'Security Hardening Lab', summary: 'Verify hashing and HMAC authentication flows.' },
    ],
    projectTemplateIds: ['ptpl_js_taskboard', 'ptpl_python_cli'],
  },
];

export function seedNormalizedCurriculumEnrichment(db: DatabaseSync) {
  const now = new Date().toISOString();

  // 1. Seed the 3 extra Career Learning Paths so we have 15 complete tracks & enrich all 15
  const upsertExtraPath = db.prepare(
    `INSERT INTO learning_paths (
       id, title, slug, description, difficulty, estimated_hours, target_role, course_ids_json,
       overview, audience, prerequisites_json, objectives_json, milestones_json, project_template_ids_json, is_published
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(slug) DO UPDATE SET
       overview = CASE WHEN learning_paths.overview = '' THEN excluded.overview ELSE learning_paths.overview END,
       audience = CASE WHEN learning_paths.audience = '' THEN excluded.audience ELSE learning_paths.audience END,
       prerequisites_json = CASE WHEN learning_paths.prerequisites_json = '[]' THEN excluded.prerequisites_json ELSE learning_paths.prerequisites_json END,
       objectives_json = CASE WHEN learning_paths.objectives_json = '[]' THEN excluded.objectives_json ELSE learning_paths.objectives_json END,
       milestones_json = CASE WHEN learning_paths.milestones_json = '[]' THEN excluded.milestones_json ELSE learning_paths.milestones_json END,
       project_template_ids_json = CASE WHEN learning_paths.project_template_ids_json = '[]' THEN excluded.project_template_ids_json ELSE learning_paths.project_template_ids_json END`
  );
  for (const p of EXTRA_LEARNING_PATHS) {
    upsertExtraPath.run(
      p.id,
      p.title,
      p.slug,
      p.description,
      p.difficulty,
      p.estimatedHours,
      p.targetRole,
      JSON.stringify(p.courseIds),
      p.overview,
      p.audience,
      JSON.stringify(p.prerequisites),
      JSON.stringify(p.objectives),
      JSON.stringify(p.milestones),
      JSON.stringify(p.projectTemplateIds)
    );
  }

  // Enrich the original 12 learning paths where metadata is still empty
  const existingPaths = db.prepare(`SELECT id, title, description, difficulty, target_role, overview FROM learning_paths`).all() as Array<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    target_role: string;
    overview: string;
  }>;
  const updatePathMeta = db.prepare(
    `UPDATE learning_paths
     SET overview = ?, audience = ?, prerequisites_json = ?, objectives_json = ?, milestones_json = ?, project_template_ids_json = ?
     WHERE id = ?`
  );
  for (const p of existingPaths) {
    if (p.overview && p.overview.trim().length > 0) continue;
    const preset = LEARNING_PATH_METADATA[p.id];
    if (preset) {
      updatePathMeta.run(
        preset.overview,
        preset.audience,
        JSON.stringify(preset.prerequisites),
        JSON.stringify(preset.objectives),
        JSON.stringify(preset.milestones),
        JSON.stringify(preset.projectTemplateIds),
        p.id
      );
    } else {
      updatePathMeta.run(
        p.description,
        `Learners targeting ${p.target_role || p.title} roles (${p.difficulty}).`,
        JSON.stringify(['Foundational coding or web familiarity']),
        JSON.stringify([
          `Complete all structured courses in ${p.title}`,
          'Pass module exercises and hands-on coding labs',
          'Build and publish a portfolio-ready project',
        ]),
        JSON.stringify([
          { step: 1, title: 'Core Foundations', summary: 'Complete introductory lessons and syntax labs.' },
          { step: 2, title: 'Practical Application', summary: 'Solve intermediate exercises and quizzes.' },
          { step: 3, title: 'Portfolio Milestone', summary: 'Ship a real-world project and claim certificate.' },
        ]),
        JSON.stringify(['ptpl_web_portfolio']),
        p.id
      );
    }
  }

  // 2. Sync course_topics from published lessons & modules safely
  const lessonsAll = db
    .prepare(
      `SELECT l.id, l.course_id, l.module_id, l.title, l.topic_name, l.topic_id, l.summary, l.content_markdown,
              l.code_example, l.language, l.exercise_prompt, l.starter_code, l.solution_hint, l.sort_order
       FROM lessons l
       ORDER BY l.course_id, l.module_id, l.sort_order ASC`
    )
    .all() as Array<{
    id: string;
    course_id: string;
    module_id: string;
    title: string;
    topic_name: string;
    topic_id: string;
    summary: string;
    content_markdown: string;
    code_example: string;
    language: string;
    exercise_prompt: string;
    starter_code: string;
    solution_hint: string;
    sort_order: number;
  }>;

  const insertTopic = db.prepare(
    `INSERT OR IGNORE INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const linkLessonTopic = db.prepare(`UPDATE lessons SET topic_id = ? WHERE id = ? AND (topic_id = '' OR topic_id IS NULL)`);
  const seenTopics = new Map<string, string>();

  for (const les of lessonsAll) {
    const tName = (les.topic_name || les.title || 'Core Topic').trim();
    const key = `${les.course_id}::${les.module_id}::${tName.toLowerCase()}`;
    let topicId = seenTopics.get(key);
    if (!topicId) {
      topicId = `top_${les.module_id}_${seenTopics.size + 1}`;
      const slug = tName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `topic-${seenTopics.size + 1}`;
      insertTopic.run(topicId, les.course_id, les.module_id, tName, slug, les.summary || tName, les.sort_order, now);
      seenTopics.set(key, topicId);
    }
    if (!les.topic_id) {
      linkLessonTopic.run(topicId, les.id);
    }
  }

  // 3. Seed structured lesson_content_blocks & code_examples if a lesson doesn't have any yet
  const countBlocks = db.prepare(`SELECT COUNT(*) as c FROM lesson_content_blocks WHERE lesson_id = ?`);
  const insertBlock = db.prepare(
    `INSERT OR IGNORE INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const countExamples = db.prepare(`SELECT COUNT(*) as c FROM code_examples WHERE lesson_id = ?`);
  const insertExample = db.prepare(
    `INSERT OR IGNORE INTO code_examples (id, lesson_id, title, description, language, code, expected_output, is_runnable, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const les of lessonsAll) {
    const existingBlockCount = (countBlocks.get(les.id) as { c: number }).c;
    if (existingBlockCount === 0) {
      insertBlock.run(
        `blk_${les.id}_1`,
        les.id,
        'paragraph',
        'Concept Overview',
        les.content_markdown || les.summary,
        JSON.stringify({ summary: les.summary }),
        1
      );
      if (les.code_example) {
        insertBlock.run(
          `blk_${les.id}_2`,
          les.id,
          'code_example',
          `${les.title} — Reference Pattern`,
          les.code_example,
          JSON.stringify({ language: les.language || 'javascript', runnable: ['html', 'javascript', 'css'].includes(les.language) }),
          2
        );
      }
      insertBlock.run(
        `blk_${les.id}_3`,
        les.id,
        'callout',
        'Key Takeaway & Best Practice',
        les.solution_hint || `Practice ${les.title} step-by-step in the coding lab before advancing to the next topic.`,
        JSON.stringify({ variant: 'tip' }),
        3
      );
      insertBlock.run(
        `blk_${les.id}_4`,
        les.id,
        'step_guide',
        'How to Practise This Lesson',
        `1. Read the core concept and inspect the code example line-by-line.\n2. Modify values inside the interactive editor to observe how output changes.\n3. Complete the hands-on exercise and mark this lesson complete once verified.`,
        JSON.stringify({}),
        4
      );
    }

    const existingExCount = (countExamples.get(les.id) as { c: number }).c;
    if (existingExCount === 0 && (les.code_example || les.starter_code)) {
      const lang = (les.language || 'javascript').toLowerCase();
      const isBrowserRunnable = ['html', 'css', 'javascript', 'js'].includes(lang) ? 1 : 0;
      if (les.code_example) {
        insertExample.run(
          `cex_${les.id}_1`,
          les.id,
          `${les.title} — Primary Example`,
          les.summary,
          lang,
          les.code_example,
          lang === 'python'
            ? 'Outputs formatted string or computed result via stdout print().'
            : lang === 'sql'
            ? 'Returns grouped relational result rows sorted by aggregate count.'
            : 'Executes cleanly in the Braincode browser preview / console.',
          isBrowserRunnable,
          1
        );
      }
      if (les.starter_code && les.starter_code !== les.code_example) {
        insertExample.run(
          `cex_${les.id}_2`,
          les.id,
          `${les.title} — Guided Lab Sandbox`,
          les.exercise_prompt || 'Editable practice template for hands-on experimentation.',
          lang,
          les.starter_code,
          'Verify expected behavior in the console or live preview output.',
          isBrowserRunnable,
          2
        );
      }
    }
  }

  // Add extra rich structured blocks (tables, warnings, doc links) to key flagship lessons
  insertBlock.run(
    'blk_les_py_2_table',
    'les_py_2',
    'table',
    'Core Python Data Types Quick Reference',
    '| Type | Example | Mutable | Primary Use |\n| --- | --- | --- | --- |\n| `int` | `42` | No | Exact whole numbers & counters |\n| `float` | `3.14` | No | Continuous decimal ratios |\n| `str` | `"Braincode"` | No | UTF-8 text & formatting |\n| `bool` | `True` | No | Conditions & feature flags |\n| `list` | `[1, 2, 3]` | Yes | Ordered collections |',
    JSON.stringify({ format: 'markdown_table' }),
    5
  );
  insertBlock.run(
    'blk_les_py_1_warn',
    'les_py_1',
    'warning',
    'Common Beginner Mistake: Mixing Tabs and Spaces',
    'Never mix tab characters and spaces for Python indentation in the same file—Python 3 raises `TabError`. Configure your editor to insert 4 spaces per indent level.',
    JSON.stringify({ severity: 'warning' }),
    6
  );
  insertBlock.run(
    'blk_les_html_1_table',
    'les_html_1',
    'table',
    'HTML5 Semantic Landmarks',
    '| Element | Purpose | Accessibility Benefit |\n| --- | --- | --- |\n| `<header>` | Page or section intro & branding | Screen reader banner landmark |\n| `<nav>` | Primary navigation links | Direct skip-to-navigation shortcut |\n| `<main>` | Unique primary page content | Primary skip-to-content target |\n| `<article>` | Self-contained post or card | Reusable syndication unit |',
    JSON.stringify({ format: 'markdown_table' }),
    5
  );
  insertBlock.run(
    'blk_les_sql_1_warn',
    'les_sql_1',
    'warning',
    'Common SQL Mistake: Filtering Aggregated Counts with WHERE',
    'Use `WHERE` to filter individual rows *before* grouping, and `HAVING` to filter grouped aggregate values (e.g., `HAVING COUNT(e.user_id) >= 5`).',
    JSON.stringify({ severity: 'warning' }),
    5
  );

  // 4. Seed rich interactive Exercises covering ALL 10 exercise types
  const insertExercise = db.prepare(
    `INSERT OR IGNORE INTO exercises (
       id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty,
       prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation, hint_text, xp_reward, sort_order, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const SEEDED_EXERCISES = [
    // 1. Multiple Choice
    {
      id: 'ex_py_mc_1',
      courseId: 'crs_python',
      moduleId: 'mod_py_1',
      lessonId: 'les_py_1',
      technologyId: 'tech_python',
      title: 'Python String Interpolation Syntax',
      type: 'multiple_choice',
      difficulty: 'Beginner',
      prompt: 'Which Python syntax inserts the variable `track` cleanly inside a formatted string?',
      starterCode: '',
      options: ['f"Enrolled in {track}"', '"Enrolled in {track}"', 'format("Enrolled in $track")', 'print(Enrolled in track)'],
      correctAnswer: 'f"Enrolled in {track}"',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Python f-strings (prefixed with `f`) evaluate expressions inside `{...}` directly at runtime.',
      hint: 'Look for the prefix letter placed immediately before the opening quote.',
      xp: 25,
      sortOrder: 1,
    },
    // 2. True / False
    {
      id: 'ex_py_tf_2',
      courseId: 'crs_python',
      moduleId: 'mod_py_1',
      lessonId: 'les_py_2',
      technologyId: 'tech_python',
      title: 'Floor Division vs Floating Division',
      type: 'true_false',
      difficulty: 'Beginner',
      prompt: 'True or False: In Python 3, evaluating `5 / 2` returns the integer `2` instead of `2.5`.',
      starterCode: '',
      options: ['True', 'False'],
      correctAnswer: 'False',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Single slash `/` always performs floating-point division (`2.5`). Use `//` for integer floor division (`2`).',
      hint: 'Recall the difference between `/` and `//` in Python 3.',
      xp: 20,
      sortOrder: 2,
    },
    // 3. Fill-in-the-blank
    {
      id: 'ex_py_fib_3',
      courseId: 'crs_python',
      moduleId: 'mod_py_1',
      lessonId: 'les_py_3',
      technologyId: 'tech_python',
      title: 'Python Function Keyword',
      type: 'fill_blank',
      difficulty: 'Beginner',
      prompt: 'Complete the Python function header: `______ classify_score(points: int) -> str:`',
      starterCode: '______ classify_score(points: int) -> str:\n    return "Pass"',
      options: [],
      correctAnswer: 'def',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Python functions are declared using the `def` keyword followed by the function name and parameter list.',
      hint: 'Three-letter Python keyword short for "define".',
      xp: 25,
      sortOrder: 3,
    },
    // 4. Predict-the-output
    {
      id: 'ex_py_pred_4',
      courseId: 'crs_python',
      moduleId: 'mod_py_2',
      lessonId: 'les_py_4',
      technologyId: 'tech_python',
      title: 'Predict Dictionary `.get()` Output',
      type: 'predict_output',
      difficulty: 'Beginner',
      prompt: 'What number will this Python code print?\n```python\ncounts = {"py": 2, "sql": 1}\nprint(counts.get("go", 0) + counts["py"])\n```',
      starterCode: '',
      options: ['2', '0', '3', 'KeyError'],
      correctAnswer: '2',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`counts.get("go", 0)` safely returns the fallback `0` because `"go"` is absent, and `0 + 2` equals `2`.',
      hint: 'The second argument to `.get(key, default)` prevents KeyError and supplies `0`.',
      xp: 30,
      sortOrder: 4,
    },
    // 5. Find-the-error
    {
      id: 'ex_html_err_1',
      courseId: 'crs_html',
      moduleId: 'mod_html_1',
      lessonId: 'les_html_2',
      technologyId: 'tech_html_std',
      title: 'Find the Accessibility Defect',
      type: 'find_error',
      difficulty: 'Beginner',
      prompt: 'Inspect this form snippet and identify why clicking the label does NOT focus the email field:\n`<label for="user_email">Email</label><input id="email" type="email" required />`',
      starterCode: '<label for="user_email">Email</label>\n<input id="email" type="email" required />',
      options: [
        'The label `for` attribute ("user_email") does not match the input `id` ("email")',
        'The input is missing a placeholder attribute',
        'Required inputs cannot have labels',
        'type="email" must be uppercase',
      ],
      correctAnswer: 'The label `for` attribute ("user_email") does not match the input `id` ("email")',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Implicit or explicit label association requires `<label for="X">` to match `<input id="X">` identically.',
      hint: 'Compare the `for` attribute value against the input `id`.',
      xp: 25,
      sortOrder: 1,
    },
    // 6. Code Completion
    {
      id: 'ex_css_comp_1',
      courseId: 'crs_css',
      moduleId: 'mod_css_1',
      lessonId: 'les_css_1',
      technologyId: 'tech_css_std',
      title: 'Complete the Flexbox Toolbar Alignment',
      type: 'code_completion',
      difficulty: 'Beginner',
      prompt: 'Complete the CSS property value to push the left brand logo and right CTA button to opposite ends:\n`.toolbar { display: flex; justify-content: ______; align-items: center; }`',
      starterCode: '.toolbar {\n  display: flex;\n  justify-content: ______;\n  align-items: center;\n}',
      options: ['space-between', 'center', 'flex-start', 'column'],
      correctAnswer: 'space-between',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`justify-content: space-between` distributes items evenly with the first at the start and the last at the end.',
      hint: 'Standard Flexbox keyword that puts maximum space *between* first and last children.',
      xp: 25,
      sortOrder: 1,
    },
    // 7. Write Code (pattern/test verified)
    {
      id: 'ex_js_write_1',
      courseId: 'crs_js',
      moduleId: 'mod_js_1',
      lessonId: 'les_js_1',
      technologyId: 'tech_js',
      title: 'Write a Pure Course Hours Reducer',
      type: 'write_code',
      difficulty: 'Intermediate',
      prompt: 'Write a JavaScript function `sumPublishedHours(courses)` that filters items with `published === true` and sums their `hours` property using `.filter()` and `.reduce()`.',
      starterCode: 'function sumPublishedHours(courses) {\n  // Filter published courses and sum hours\n  return courses\n    .filter(c => c.published)\n    .reduce((acc, c) => acc + c.hours, 0);\n}',
      options: [],
      correctAnswer: 'return courses.filter(c => c.published).reduce((acc, c) => acc + c.hours, 0);',
      validationRule: { mode: 'contains_tokens', tokens: ['filter', 'reduce', 'published'] },
      explanation: 'Chaining `.filter(c => c.published)` before `.reduce((sum, c) => sum + c.hours, 0)` avoids mutating the input array.',
      hint: 'Filter for `c.published` first, then accumulate `c.hours` starting from initial value `0`.',
      xp: 40,
      sortOrder: 1,
    },
    // 8. Matching
    {
      id: 'ex_sql_match_1',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_1',
      lessonId: 'les_sql_1',
      technologyId: 'tech_sql',
      title: 'Match SQL Clauses to Their Execution Role',
      type: 'matching',
      difficulty: 'Beginner',
      prompt: 'Match each SQL clause (`LEFT JOIN`, `GROUP BY`, `HAVING`) with its exact query behavior:',
      starterCode: '',
      options: [
        'LEFT JOIN -> Keeps all left-table rows even without right-table matches | GROUP BY -> Collapses rows into summary buckets | HAVING -> Filters aggregated group results',
        'LEFT JOIN -> Deletes unmatched rows | GROUP BY -> Sorts rows alphabetically | HAVING -> Creates table indexes',
      ],
      correctAnswer:
        'LEFT JOIN -> Keeps all left-table rows even without right-table matches | GROUP BY -> Collapses rows into summary buckets | HAVING -> Filters aggregated group results',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'SQL evaluates FROM/JOIN first, then WHERE, GROUP BY, HAVING, SELECT, and ORDER BY.',
      hint: 'LEFT JOIN preserves all parent rows; HAVING runs after GROUP BY.',
      xp: 35,
      sortOrder: 1,
    },
    // 9. Short Written Answer
    {
      id: 'ex_sec_short_1',
      courseId: 'crs_security',
      moduleId: 'mod_sec_1',
      lessonId: 'les_sec_1',
      technologyId: 'tech_cybersec',
      title: 'Explain Constant-Time Comparison',
      type: 'short_answer',
      difficulty: 'Intermediate',
      prompt: 'In 1–3 sentences, explain why verifying webhook HMAC signatures requires constant-time equality (`timingSafeEqual`) instead of `===`.',
      starterCode: '',
      options: [],
      correctAnswer: 'timing attack early return byte comparison',
      validationRule: { mode: 'keyword_rubric', minLength: 20, keywords: ['timing', 'equal', 'early', 'byte', 'length', 'compare', 'hmac'] },
      explanation: 'Standard `===` stops comparing on the first mismatched byte, leaking partial signature prefixes via response-time measurement (timing side-channel).',
      hint: 'Think about what standard string equality does as soon as the first character differs.',
      xp: 35,
      sortOrder: 1,
    },
    // 10. Practical Coding Task
    {
      id: 'ex_fs_prac_1',
      courseId: 'crs_fullstack',
      moduleId: 'mod_fs_1',
      lessonId: 'les_fs_1',
      technologyId: 'tech_ts',
      title: 'Practical Lab: Build a Responsive 3-Column Card Layout',
      type: 'practical_task',
      difficulty: 'Beginner',
      prompt: 'In your workspace or editor, write semantic `<main>` and `<article>` HTML with CSS `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` and submit your solution markup.',
      starterCode: '<main class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;">\n  <article><h3>HTML5</h3></article>\n  <article><h3>CSS Grid</h3></article>\n  <article><h3>TypeScript</h3></article>\n</main>',
      options: [],
      correctAnswer: 'grid-template-columns',
      validationRule: { mode: 'contains_tokens', tokens: ['<main', 'grid'] },
      explanation: 'Using semantic landmarks with CSS Grid `auto-fit` yields responsive multi-column cards without extra breakpoints.',
      hint: 'Include `<main>` and a CSS Grid container.',
      xp: 50,
      sortOrder: 1,
    },
    // Additional React & TypeScript exercises
    {
      id: 'ex_react_mc_1',
      courseId: 'crs_react',
      moduleId: 'mod_react_1',
      lessonId: 'les_react_1',
      technologyId: 'tech_react',
      title: 'Derived State Best Practice',
      type: 'multiple_choice',
      difficulty: 'Intermediate',
      prompt: 'When filtering an array of courses based on a `searchQuery` state variable, what is the cleanest React pattern?',
      starterCode: '',
      options: [
        'Compute `const filtered = courses.filter(...)` directly during render',
        'Store a duplicate `filteredCourses` state and sync it inside `useEffect`',
        'Mutate `courses` in place inside an event handler',
        'Store the filtered HTML string in `localStorage`',
      ],
      correctAnswer: 'Compute `const filtered = courses.filter(...)` directly during render',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Deriving values inline from existing state avoids redundant renders and prevents state-sync bugs.',
      hint: 'Avoid duplicating state that can be computed deterministically from existing props/state.',
      xp: 30,
      sortOrder: 1,
    },
  ];

  for (const ex of SEEDED_EXERCISES) {
    insertExercise.run(
      ex.id,
      ex.courseId,
      ex.moduleId,
      ex.lessonId,
      ex.technologyId,
      ex.title,
      ex.type,
      ex.difficulty,
      ex.prompt,
      ex.starterCode,
      JSON.stringify(ex.options),
      ex.correctAnswer,
      JSON.stringify(ex.validationRule),
      ex.explanation,
      ex.hint,
      ex.xp,
      ex.sortOrder,
      now
    );
  }

  // 5. Seed Additional Course Quizzes (with passing_score_pct = 70) so every flagship track has real quizzes
  const insertAsm = db.prepare(
    `INSERT OR IGNORE INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, randomize_questions, max_attempts, created_at)
     VALUES (?, ?, ?, ?, 'quiz', ?, ?, ?, ?, 70, 0, 0, ?)`
  );
  insertAsm.run(
    'asm_html_quiz',
    'crs_html',
    'les_html_1',
    'HTML5 Semantics & Forms Assessment',
    'untimed',
    0,
    80,
    JSON.stringify([
      {
        id: 'hq1',
        kind: 'multiple_choice',
        prompt: 'Which element identifies the unique primary content region of a webpage for screen readers?',
        options: ['<main>', '<div class="content">', '<span>', '<section>'],
        correctAnswer: '<main>',
        explanation: '`<main>` maps directly to the ARIA main landmark so assistive tools can jump straight to primary content.',
      },
      {
        id: 'hq2',
        kind: 'true_false',
        prompt: 'True or False: Matching `<label for="email">` with `<input id="email">` expands the clickable focus target.',
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'Clicking a properly bound `<label>` focuses or toggles the associated input control.',
      },
    ]),
    now
  );
  insertAsm.run(
    'asm_sql_quiz',
    'crs_sql',
    'les_sql_1',
    'SQL Joins & Relational Indexing Quiz',
    'untimed',
    0,
    90,
    JSON.stringify([
      {
        id: 'sq1',
        kind: 'multiple_choice',
        prompt: 'Which JOIN preserves every row from the left table even when no matching row exists in the right table?',
        options: ['LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'NATURAL DELETE'],
        correctAnswer: 'LEFT JOIN',
        explanation: 'LEFT JOIN retains all rows from the left table with NULL columns where the right table has no match.',
      },
      {
        id: 'sq2',
        kind: 'fill_blank',
        prompt: 'Which SQL clause filters groups *after* GROUP BY aggregation (as opposed to WHERE)?',
        correctAnswer: 'HAVING',
        explanation: '`HAVING` filters grouped aggregate results after `GROUP BY` has been evaluated.',
      },
    ]),
    now
  );
  insertAsm.run(
    'asm_js_quiz',
    'crs_js',
    'les_js_1',
    'Modern JavaScript Arrays & Immutability Quiz',
    'untimed',
    0,
    90,
    JSON.stringify([
      {
        id: 'jq1',
        kind: 'multiple_choice',
        prompt: 'Which array method transforms each item into a single accumulated value without mutating the source array?',
        options: ['.reduce()', '.splice()', '.push()', '.sort()'],
        correctAnswer: '.reduce()',
        explanation: '`.reduce()` walks elements with an accumulator callback and leaves the original array untouched.',
      },
    ]),
    now
  );

  // 6. Seed Course Assignments (with instructions, requirements, starter files, rubric)
  const insertAssignment = db.prepare(
    `INSERT OR IGNORE INTO assignments (
       id, course_id, module_id, technology_id, title, description, instructions_markdown,
       requirements_json, starter_files_json, rubric_json, difficulty, xp_reward, due_days, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const SEEDED_ASSIGNMENTS = [
    {
      id: 'asn_html_landing',
      courseId: 'crs_html',
      moduleId: 'mod_html_1',
      technologyId: 'tech_html_std',
      title: 'Accessible Course Registration Page',
      description: 'Build a semantic HTML5 landing & enrollment form with accessible labels and native validation.',
      instructions:
        '### Assignment Brief\n\nConstruct a single-page course registration layout using `<header>`, `<main>`, `<section>`, and `<form>`. Every form control must pair `<label for="...">` with an `id` and use semantic input types.',
      requirements: [
        'Use `<header>`, `<main>`, and `<footer>` semantic landmarks.',
        'Include an accessible enrollment `<form>` with at least 3 labeled inputs.',
        'Enforce `required` and `type="email"` HTML5 validation.',
      ],
      starterFiles: {
        'index.html': '<!DOCTYPE html>\n<html lang="en">\n<body>\n  <header><h1>Course Registration</h1></header>\n  <main>\n    <!-- Add your accessible form here -->\n  </main>\n</body>\n</html>',
      },
      rubric: ['Semantic Landmark Structure (40%)', 'Label & Accessibility Binding (35%)', 'Native Validation Completeness (25%)'],
      difficulty: 'Beginner',
      xp: 120,
      dueDays: 7,
    },
    {
      id: 'asn_py_grader',
      courseId: 'crs_python',
      moduleId: 'mod_py_2',
      technologyId: 'tech_python',
      title: 'Python Student Gradebook CLI & Summary Report',
      description: 'Implement a Python script using dictionaries, functions, and safe file error handling to summarize cohort scores.',
      instructions:
        '### Assignment Brief\n\nWrite a Python module containing a `CohortReport` class or function suite that reads student scores, classifies grades (`Distinction`, `Pass`, `Review`), and safely handles missing files with `try/except FileNotFoundError`.',
      requirements: [
        'Store student records cleanly using dictionaries or dataclasses.',
        'Handle missing input files gracefully without crashing.',
        'Output formatted pass rate and average score to 2 decimal places.',
      ],
      starterFiles: {
        'gradebook.py': 'def summarize_scores(records: dict[str, list[int]]) -> dict:\n    # Compute average per student\n    return {}\n',
      },
      rubric: ['Data Structure Choice (35%)', 'Error Handling Safety (35%)', 'Formatting & Readability (30%)'],
      difficulty: 'Beginner to Intermediate',
      xp: 150,
      dueDays: 7,
    },
    {
      id: 'asn_sql_analytics',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_1',
      technologyId: 'tech_sql',
      title: 'Normalized Course Enrollment Schema & Reporting Queries',
      description: 'Write DDL tables with foreign keys plus 3 reporting queries using LEFT JOIN, GROUP BY, and HAVING.',
      instructions:
        '### Assignment Brief\n\nDefine `courses`, `users`, and `enrollments` tables with explicit `FOREIGN KEY` constraints and write queries listing top-enrolled courses and inactive enrollments.',
      requirements: [
        'Use `PRIMARY KEY` and `FOREIGN KEY` constraints cleanly.',
        'Include at least one `LEFT JOIN` + `COUNT()` + `GROUP BY` query.',
        'Create at least one `CREATE INDEX IF NOT EXISTS` for enrollment lookups.',
      ],
      starterFiles: {
        'schema.sql': '-- Write normalized tables and queries\nSELECT 1;\n',
      },
      rubric: ['Normalization & Foreign Keys (40%)', 'Query Accuracy (40%)', 'Index Design (20%)'],
      difficulty: 'Intermediate',
      xp: 150,
      dueDays: 7,
    },
    {
      id: 'asn_fs_contract',
      courseId: 'crs_fullstack',
      moduleId: 'mod_fs_2',
      technologyId: 'tech_ts',
      title: 'Type-Safe Entitlement & Validation Middleware',
      description: 'Design an API guard module enforcing authentication, input validation, and database entitlement checks.',
      instructions:
        '### Assignment Brief\n\nWrite a TypeScript/JavaScript handler validating incoming payloads and checking user entitlements before mutating records.',
      requirements: [
        'Reject missing or malformed fields with HTTP `400` semantics.',
        'Return `401` when unauthenticated and `403` when premium entitlement is missing.',
      ],
      starterFiles: {
        'guard.ts': 'export function checkAccess(user: { id: string } | null, isPremium: boolean) {\n  // Implement backend trust boundary\n}\n',
      },
      rubric: ['Validation Completeness (40%)', 'Status Code Accuracy (30%)', 'Type Safety (30%)'],
      difficulty: 'Intermediate',
      xp: 160,
      dueDays: 7,
    },
  ];
  for (const a of SEEDED_ASSIGNMENTS) {
    insertAssignment.run(
      a.id,
      a.courseId,
      a.moduleId,
      a.technologyId,
      a.title,
      a.description,
      a.instructions,
      JSON.stringify(a.requirements),
      JSON.stringify(a.starterFiles),
      JSON.stringify(a.rubric),
      a.difficulty,
      a.xp,
      a.dueDays,
      now
    );
  }

  // 7. Seed Real-World Project Templates across Web, Python, Database, React
  const insertProjectTpl = db.prepare(
    `INSERT OR IGNORE INTO project_templates (
       id, technology_id, learning_path_id, course_id, title, slug, category, difficulty,
       estimated_hours, summary, requirements_json, starter_files_json, deliverables_json, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const PROJECT_TEMPLATES = [
    {
      id: 'ptpl_web_portfolio',
      technologyId: 'tech_html_std',
      learningPathId: 'path_complete_web',
      courseId: 'crs_html',
      title: 'Responsive Developer Portfolio & Contact Showcase',
      slug: 'responsive-developer-portfolio',
      category: 'Web Project',
      difficulty: 'Beginner',
      hours: 6,
      summary: 'Design and build a multi-section personal engineering portfolio featuring semantic landmarks, CSS Grid cards, light/dark custom properties, and an accessible contact form.',
      requirements: [
        'Semantic HTML5 structure (`header`, `nav`, `main`, `section`, `footer`)',
        'CSS Grid card layout responsive from 375px mobile to 1440px desktop',
        'Working light/dark CSS variable theme switcher',
      ],
      starterFiles: {
        'index.html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Developer Portfolio</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <header class="topbar"><strong>Ada.dev</strong><button id="themeBtn">Switch Theme</button></header>\n  <main class="grid">\n    <article class="card"><h2>Featured Project</h2><p>Built with semantic HTML &amp; CSS Grid.</p></article>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>',
        'styles.css': ':root { --bg: #0b1220; --fg: #f8fafc; --accent: #0A84FF; }\nbody { margin: 0; font-family: system-ui; background: var(--bg); color: var(--fg); padding: 24px; }\n.topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }\n.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }\n.card { border: 1px solid #263b5e; border-radius: 12px; padding: 18px; }',
        'app.js': 'document.getElementById("themeBtn")?.addEventListener("click", () => {\n  console.log("Theme toggle clicked");\n});',
      },
      deliverables: ['Live HTML/CSS/JS workspace snapshot', 'Public Portfolio showcase card'],
    },
    {
      id: 'ptpl_python_cli',
      technologyId: 'tech_python',
      learningPathId: 'path_python_dev',
      courseId: 'crs_python',
      title: 'Python Study Log & Quiz Analyzer CLI',
      slug: 'python-study-log-analyzer',
      category: 'Python Project',
      difficulty: 'Beginner to Intermediate',
      hours: 8,
      summary: 'Create a modular Python CLI application that reads JSON/CSV study sessions, calculates per-technology study hours and averages, and catches file/parse exceptions safely.',
      requirements: [
        'Use functions with type annotations and docstrings',
        'Aggregate totals using Python dictionaries',
        'Handle `FileNotFoundError` and `ValueError` cleanly',
      ],
      starterFiles: {
        'analyzer.py': 'import json\nfrom pathlib import Path\n\ndef summarize_sessions(entries: list[dict]) -> dict[str, int]:\n    totals: dict[str, int] = {}\n    for row in entries:\n        tech = row.get("technology", "General")\n        totals[tech] = totals.get(tech, 0) + int(row.get("minutes", 0))\n    return totals\n\nif __name__ == "__main__":\n    sample = [{"technology": "Python", "minutes": 45}, {"technology": "SQL", "minutes": 30}]\n    print(summarize_sessions(sample))\n',
        'README.md': '# Python Study Log Analyzer\n\nFollow the specification in the project panel and extend `summarize_sessions`.',
      },
      deliverables: ['Modular Python script (`analyzer.py`)', 'Sample JSON dataset & edge-case tests'],
    },
    {
      id: 'ptpl_sql_ledger',
      technologyId: 'tech_sql',
      learningPathId: 'path_dba',
      courseId: 'crs_sql',
      title: 'SQL Learning Analytics & Enrollment Warehouse',
      slug: 'sql-learning-analytics-warehouse',
      category: 'Database Project',
      difficulty: 'Intermediate',
      hours: 7,
      summary: 'Model a relational database schema with students, courses, assessments, and certificates, then write analytical JOIN and aggregation queries backed by composite indexes.',
      requirements: [
        'Normalized tables with foreign key constraints',
        'At least 4 reporting queries using `LEFT JOIN`, `GROUP BY`, `HAVING`, and `ORDER BY`',
        'Documented composite index choices for read performance',
      ],
      starterFiles: {
        'warehouse.sql': 'CREATE TABLE courses (\n  id TEXT PRIMARY KEY,\n  title TEXT NOT NULL,\n  difficulty TEXT NOT NULL\n);\n\nCREATE TABLE enrollments (\n  user_id TEXT NOT NULL,\n  course_id TEXT NOT NULL REFERENCES courses(id),\n  enrolled_at TEXT NOT NULL,\n  PRIMARY KEY (user_id, course_id)\n);\n\nSELECT c.title, COUNT(e.user_id) AS students\nFROM courses c\nLEFT JOIN enrollments e ON e.course_id = c.id\nGROUP BY c.id;\n',
      },
      deliverables: ['Normalized DDL schema', 'Verified reporting SQL queries'],
    },
    {
      id: 'ptpl_react_tracker',
      technologyId: 'tech_react',
      learningPathId: 'path_react_dev',
      courseId: 'crs_react',
      title: 'React Interactive Habit & Milestone Tracker',
      slug: 'react-habit-milestone-tracker',
      category: 'React Project',
      difficulty: 'Intermediate',
      hours: 10,
      summary: 'Architect an interactive single-page React tracker featuring category filters, derived progress percentages, keyboard accessibility, and clean component separation.',
      requirements: [
        'Derived progress statistics computed cleanly without redundant effects',
        'Interactive filter controls and item completion toggles',
        'Clean TypeScript interfaces for domain state',
      ],
      starterFiles: {
        'index.html': '<!DOCTYPE html>\n<html><body style="font-family:system-ui;background:#0b1220;color:#fff;padding:24px;"><h2>React Milestone Tracker Prototype</h2><div id="app"></div><script src="tracker.js"></script></body></html>',
        'tracker.js': 'const items = [{ id: 1, title: "Hooks State", done: true }, { id: 2, title: "Form Validation", done: false }];\nconst pct = Math.round((items.filter(i => i.done).length / items.length) * 100);\ndocument.getElementById("app").innerHTML = `<p>Progress: ${pct}% (${items.length} items)</p>`;',
      },
      deliverables: ['Working interactive prototype', 'Public Braincode Portfolio entry'],
    },
    {
      id: 'ptpl_js_taskboard',
      technologyId: 'tech_js',
      learningPathId: 'path_js_dev',
      courseId: 'crs_js',
      title: 'Event-Delegated JavaScript Engineering Task Board',
      slug: 'js-event-delegated-taskboard',
      category: 'Web Project',
      difficulty: 'Beginner to Intermediate',
      hours: 6,
      summary: 'Implement a zero-framework interactive task board powered by parent container event delegation, immutable array updates, and instant search filtering.',
      requirements: [
        'Single delegated click listener on the board container',
        'Pure `.filter()` and `.map()` rendering helpers',
        'Status breakdown summary updated live',
      ],
      starterFiles: {
        'index.html': '<!DOCTYPE html>\n<html><body style="font-family:system-ui;background:#0b1220;color:#fff;padding:24px;"><h2>Engineering Task Board</h2><ul id="board"></ul><script src="board.js"></script></body></html>',
        'board.js': 'const tasks = [{ id: "1", text: "Wire event delegation", done: false }, { id: "2", text: "Test filter pipeline", done: true }];\nconst board = document.getElementById("board");\nfunction render() { board.innerHTML = tasks.map(t => `<li><button data-id="${t.id}">${t.done ? "[x]" : "[ ]"} ${t.text}</button></li>`).join(""); }\nboard.addEventListener("click", (e) => { const btn = e.target.closest("button[data-id]"); if (!btn) return; const t = tasks.find(x => x.id === btn.dataset.id); if (t) { t.done = !t.done; render(); } });\nrender();',
      },
      deliverables: ['Working Coding Workspace project', 'Code review reflection notes'],
    },
  ];

  for (const pt of PROJECT_TEMPLATES) {
    insertProjectTpl.run(
      pt.id,
      pt.technologyId,
      pt.learningPathId,
      pt.courseId,
      pt.title,
      pt.slug,
      pt.category,
      pt.difficulty,
      pt.hours,
      pt.summary,
      JSON.stringify(pt.requirements),
      JSON.stringify(pt.starterFiles),
      JSON.stringify(pt.deliverables),
      now
    );
  }

  // 8. Phase 25: Audit & Enrich Beginner HTML Lessons 01 & 02 when legacy short stubs exist
  const html1 = db.prepare(`SELECT id, length(content_markdown) as md_len FROM lessons WHERE id = 'les_html_1'`).get() as
    | { id: string; md_len: number }
    | undefined;
  if (html1 && Number(html1.md_len || 0) < 500) {
    const html1Md = `## HTML Document Anatomy & Semantic Landmarks

### What is HTML?
**HTML (HyperText Markup Language)** is the standard markup language used to structure web pages. Every page in your browser starts with an HTML document made of nested elements such as headings, paragraphs, links, and structural landmarks.

### Anatomy of an HTML5 Document
Every complete HTML document begins with four core parts:
1. \`<!DOCTYPE html>\` tells the browser to render the page in modern HTML5 standards mode.
2. \`<html lang="en">\` is the root container wrapping the entire document and declaring its primary language.
3. \`<head>\` holds metadata that describes the page (such as character encoding \`<meta charset="UTF-8" />\` and the browser tab \`<title>\`).
4. \`<body>\` holds everything visible to the learner on screen.

### Why Semantic Landmarks Matter
Instead of wrapping every section inside generic \`<div>\` containers, HTML5 provides meaningful landmark tags:
- \`<header>\`: Top branding, intro banner, or site title area.
- \`<nav>\`: Primary navigation links so keyboard and screen-reader users can jump directly to menus.
- \`<main>\`: The unique primary content of the current page (only one visible \`<main>\` per page).
- \`<article>\`: A self-contained card, tutorial section, or blog entry that makes sense on its own.
- \`<footer>\`: Bottom copyright, author details, and secondary links.

### Step-by-Step Guide
1. Start the file with \`<!DOCTYPE html>\` on line 1.
2. Add \`<html lang="en">\`, a \`<head>\` with \`<title>\`, and a \`<body>\`.
3. Wrap your page intro in \`<header>\` and primary reading content in \`<main>\`.
4. Group standalone content inside \`<article>\` with one clear \`<h1>\` page heading and descriptive \`<p>\` paragraphs.`;

    db.prepare(
      `UPDATE lessons SET
        summary = ?,
        content_markdown = ?,
        code_example = ?,
        starter_code = ?,
        objectives_json = ?,
        visual_explanation_markdown = ?,
        common_mistakes_json = ?,
        best_practices_json = ?,
        next_step_guidance = ?,
        updated_at = ?
       WHERE id = 'les_html_1'`
    ).run(
      'Understand the essential anatomy of an HTML5 document (<!DOCTYPE html>, <head>, <body>) and organize pages clearly using semantic landmarks like <header>, <nav>, <main>, <article>, and <footer>.',
      html1Md,
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My First HTML5 Page</title>\n</head>\n<body>\n  <header>\n    <h1>Welcome to BrainCode Academy</h1>\n  </header>\n  <main>\n    <article>\n      <h2>Why Semantic HTML Matters</h2>\n      <p>Meaningful tags make pages clearer for learners, browsers, and screen readers.</p>\n    </article>\n  </main>\n  <footer>\n    <p>Learn. Build. Innovate. Grow.</p>\n  </footer>\n</body>\n</html>`,
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Practice HTML5 Page</title>\n</head>\n<body>\n  <main>\n    <article>\n      <h1>Hello HTML!</h1>\n      <p>Edit this heading and paragraph, then click Run Code to see your live preview.</p>\n    </article>\n  </main>\n</body>\n</html>`,
      JSON.stringify([
        'Write a valid HTML5 document skeleton with <!DOCTYPE html>, <html lang="en">, <head>, and <body>.',
        'Use <header>, <nav>, <main>, <article>, and <footer> instead of generic <div> wrappers.',
        'Maintain clear heading hierarchy starting with a single primary <h1> inside <main>.',
      ]),
      `<!DOCTYPE html>\n  └── <html lang="en">\n        ├── <head>  (Title & character encoding metadata)\n        └── <body>  (Visible page content)\n              ├── <header>  (Site title / intro)\n              ├── <nav>     (Navigation links)\n              ├── <main>    (Primary lesson or article)\n              └── <footer>  (Bottom links & attribution)`,
      JSON.stringify([
        'Forgetting <!DOCTYPE html> at the very top of the file, which can trigger browser quirks mode.',
        'Using generic <div> elements everywhere instead of <header>, <main>, <nav>, and <footer>.',
        'Skipping heading levels (for example jumping directly from <h1> to <h4>).',
      ]),
      JSON.stringify([
        'Keep one primary <main> landmark per HTML document.',
        'Always set lang="en" (or the matching page locale) on the <html> element.',
        'Close every non-void tag cleanly in proper nested order.',
      ]),
      'Click "Try It Yourself" on the example above to edit the heading and paragraph, then continue to Lesson 02 on Accessible Forms.',
      now
    );

    db.prepare(`DELETE FROM lesson_content_blocks WHERE lesson_id = 'les_html_1'`).run();
    const insertHtmlBlk = db.prepare(
      `INSERT OR REPLACE INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
       VALUES (?, 'les_html_1', ?, ?, ?, ?, ?)`
    );
    insertHtmlBlk.run(
      'blk_les_html_1_1',
      'paragraph',
      'What Is HTML & Document Anatomy?',
      'HTML (HyperText Markup Language) defines the structure and meaning of content on the web. Every HTML5 document starts with `<!DOCTYPE html>`, wraps content inside `<html lang="en">`, places browser metadata inside `<head>`, and renders visible content inside `<body>`.',
      JSON.stringify({}),
      1
    );
    insertHtmlBlk.run(
      'blk_les_html_1_table',
      'table',
      'Core HTML5 Semantic Landmarks',
      '| Element | Purpose | Accessibility Benefit |\n| --- | --- | --- |\n| `<header>` | Top page or article intro & branding | Announced as a banner landmark |\n| `<nav>` | Primary navigation links | Lets screen readers jump straight to menus |\n| `<main>` | Unique primary page content | Target for keyboard skip-to-content links |\n| `<article>` | Self-contained post, card, or lesson | Reusable standalone content unit |\n| `<footer>` | Bottom links & copyright notice | Clear landmark at end of document |',
      JSON.stringify({ format: 'markdown_table' }),
      2
    );
    insertHtmlBlk.run(
      'blk_les_html_1_3',
      'step_guide',
      'Step-by-Step: Build Your First Page',
      '1. Declare `<!DOCTYPE html>` and `<html lang="en">`.\n2. Include `<meta charset="UTF-8" />` and a descriptive `<title>` in `<head>`.\n3. Place your page heading inside `<main><article><h1>...</h1><p>...</p></article></main>`.\n4. Click **Try It Yourself** below to edit the markup and run a live preview.',
      JSON.stringify({}),
      3
    );
    insertHtmlBlk.run(
      'blk_les_html_1_4',
      'callout',
      'Note: Headings Are Structure, Not Just Font Size',
      'Use `<h1>` for the main page title, `<h2>` for major sections, and `<h3>` for subsections. Never pick `<h4>` simply because you want smaller text—use CSS for visual styling.',
      JSON.stringify({ variant: 'tip' }),
      4
    );

    db.prepare(
      `UPDATE code_examples SET title = ?, description = ?, code = ?, expected_output = ? WHERE id = 'cex_les_html_1_1'`
    ).run(
      'A Complete Beginner HTML5 Page',
      'This minimal HTML5 document pairs <head> metadata with semantic <header>, <main>, <article>, and <footer> landmarks.',
      `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My First HTML5 Page</title>\n</head>\n<body>\n  <header>\n    <h1>Welcome to HTML</h1>\n  </header>\n  <main>\n    <article>\n      <h2>My First Section</h2>\n      <p>HTML elements describe the structure of your web page.</p>\n    </article>\n  </main>\n</body>\n</html>`,
      'Displays a main "Welcome to HTML" heading followed by a structured article section and paragraph.'
    );

    insertExercise.run(
      'ex_html_intro_1',
      'crs_html',
      'mod_html_1',
      'les_html_1',
      'tech_html_std',
      'Identify the Primary Content Landmark',
      'multiple_choice',
      'Beginner',
      'Which semantic HTML5 element wraps the unique, central content of a web page (separate from global headers and footers)?',
      '',
      JSON.stringify(['<main>', '<head>', '<meta>', '<span>']),
      '<main>',
      JSON.stringify({ mode: 'exact_case_insensitive' }),
      'The `<main>` landmark encloses the dominant, unique content of the document body so browsers and assistive tools locate it immediately.',
      'Look for the landmark name that literally means the primary section of the page.',
      25,
      1,
      now
    );
  }

  const html2 = db.prepare(`SELECT id, length(content_markdown) as md_len FROM lessons WHERE id = 'les_html_2'`).get() as
    | { id: string; md_len: number }
    | undefined;
  if (html2 && Number(html2.md_len || 0) < 500) {
    const html2Md = `## Accessible Forms & Native Input Validation

### How HTML Forms Collect User Input
HTML forms let visitors sign in, search a catalog, or send messages. Every clean form connects three essential tags:
- \`<form>\`: Groups related inputs and handles submission.
- \`<label for="...">\`: Gives each input a visible name and clickable focus target.
- \`<input>\` & \`<button type="submit">\`: Captures typed data and submits when activated.

### Binding Labels Correctly
Always match the \`for\` attribute on \`<label>\` to the exact \`id\` attribute on its \`<input>\`:
\`\`\`html
<label for="email">Email Address</label>
<input id="email" name="email" type="email" required />
\`\`\`
When \`for="email"\` matches \`id="email"\`, clicking the label automatically focuses the text box, and screen readers announce "Email Address" when the learner tabs into the field.

### Built-In HTML5 Validation
Modern browsers validate common rules natively before any JavaScript runs:
- \`required\`: Prevents submitting an empty input.
- \`type="email"\`: Checks for a valid email pattern (\`name@domain\`).
- \`minlength="8"\`: Enforces a minimum character count (ideal for passwords or usernames).`;

    db.prepare(
      `UPDATE lessons SET
        summary = ?,
        content_markdown = ?,
        code_example = ?,
        objectives_json = ?,
        visual_explanation_markdown = ?,
        common_mistakes_json = ?,
        best_practices_json = ?,
        next_step_guidance = ?,
        updated_at = ?
       WHERE id = 'les_html_2'`
    ).run(
      'Build accessible HTML forms by pairing <label for="..."> with matching input IDs and enforcing required, type="email", and minlength validation natively.',
      html2Md,
      `<form>\n  <label for="email">Email Address</label>\n  <input id="email" name="email" type="email" placeholder="ada@example.com" required />\n  <button type="submit">Create Account</button>\n</form>`,
      JSON.stringify([
        'Connect every <label for="..."> explicitly to its matching <input id="...">.',
        'Choose semantic input types such as type="email" and type="password".',
        'Apply native browser validation attributes including required and minlength.',
      ]),
      `<form>\n  ├── <label for="email"> ─── matches ───> <input id="email" type="email" required />\n  └── <button type="submit">Submit</button>`,
      JSON.stringify([
        'Using placeholder text instead of a visible <label> (placeholders vanish as soon as a user types).',
        'Mismatched `for` and `id` values, which break click-to-focus and screen reader announcements.',
        'Omitting `type="button"` on non-submit buttons inside a `<form>`, causing accidental form submissions.',
      ]),
      JSON.stringify([
        'Pair every visible input with an explicit `<label for="...">` element.',
        'Include a descriptive `name` attribute so submitted form payloads have clear keys.',
        'Test keyboard navigation (`Tab` and `Enter`) across all form controls.',
      ]),
      'Test your understanding in the Accessibility Defect exercise below, or modify the registration snippet inside the Practice Editor.',
      now
    );

    db.prepare(`DELETE FROM lesson_content_blocks WHERE lesson_id = 'les_html_2'`).run();
    const insertHtml2Blk = db.prepare(
      `INSERT OR REPLACE INTO lesson_content_blocks (id, lesson_id, block_type, title, content_markdown, metadata_json, sort_order)
       VALUES (?, 'les_html_2', ?, ?, ?, ?, ?)`
    );
    insertHtml2Blk.run(
      'blk_les_html_2_1',
      'paragraph',
      'Labeling Every Input Control',
      'Always pair `<label for="email">` with `<input id="email" type="email" required />` so clicking the label focuses the input and assistive technologies read the field purpose clearly.',
      JSON.stringify({}),
      1
    );
    insertHtml2Blk.run(
      'blk_les_html_2_table',
      'table',
      'Common HTML5 Input Types & Validation Attributes',
      '| Attribute / Tag | Purpose | Example |\n| --- | --- | --- |\n| `<label for="x">` | Binds label text to `<input id="x">` | `<label for="u">Username</label>` |\n| `type="email"` | Triggers email validation & mobile `@` keyboard | `<input id="e" type="email" />` |\n| `required` | Disallows empty submission | `<input id="e" required />` |\n| `minlength="3"` | Requires at least N characters | `<input id="u" minlength="3" />` |',
      JSON.stringify({ format: 'markdown_table' }),
      2
    );
    insertHtml2Blk.run(
      'blk_les_html_2_3',
      'callout',
      'Note: Never Replace Labels with Placeholders',
      'Placeholder text disappears as soon as the user begins typing. Keep a real `<label>` above or beside every input, and use `placeholder` strictly for short formatting hints.',
      JSON.stringify({ variant: 'tip' }),
      3
    );
  }
}
