import type { PriorityBatchBundle } from './curriculum_priority10_types.ts';

export const PRIORITY_BATCH_3_SYSTEMS_DATA: PriorityBatchBundle = {
  modules: [
    // Node.js (expands mod_node_1)
    {
      id: 'mod_node_2',
      courseId: 'crs_nodejs',
      title: 'Module 2: Express Middleware Pipelines, Validation & Error Trust Boundaries',
      topic: 'Routing, Auth Guards & Centralized Error Handlers',
      sortOrder: 2,
    },
    {
      id: 'mod_node_3',
      courseId: 'crs_nodejs',
      title: 'Module 3: Node Streams, File I/O & Parameterized SQLite APIs',
      topic: 'Backpressure Streams, fs/promises & Database Endpoints',
      sortOrder: 3,
    },
    {
      id: 'mod_node_4',
      courseId: 'crs_nodejs',
      title: 'Module 4: API Integration Testing, Security Headers & Graceful Shutdown',
      topic: 'Node Test Runner, SIGTERM Lifecycle & Production REST APIs',
      sortOrder: 4,
    },

    // SQL (expands mod_sql_1)
    {
      id: 'mod_sql_2',
      courseId: 'crs_sql',
      title: 'Module 2: Normalized Schemas, Constraints & Referential Integrity',
      topic: '1NF–3NF Normalization, Foreign Keys, CHECK & UNIQUE Rules',
      sortOrder: 2,
    },
    {
      id: 'mod_sql_3',
      courseId: 'crs_sql',
      title: 'Module 3: Subqueries, CTEs (`WITH`) & Analytical Window Functions',
      topic: 'Common Table Expressions, ROW_NUMBER, RANK & Cohort Rollups',
      sortOrder: 3,
    },
    {
      id: 'mod_sql_4',
      courseId: 'crs_sql',
      title: 'Module 4: Composite Indexing, Transactions (ACID) & EXPLAIN QUERY PLAN',
      topic: 'B-Tree Indexes, Atomicity & Relational Warehouse Optimization',
      sortOrder: 4,
    },

    // Java (expands mod_java_1 — newly authored units enter 'review' queue cleanly)
    {
      id: 'mod_java_2',
      courseId: 'crs_java',
      title: 'Module 2: Inheritance, Interfaces, Polymorphism & Encapsulation',
      topic: 'Abstract Contracts, Immutability & Strategy Patterns',
      sortOrder: 2,
    },
    {
      id: 'mod_java_3',
      courseId: 'crs_java',
      title: 'Module 3: Generics, Java Collections (`List`, `Map`, `Set`) & Streams',
      topic: 'Type-Safe Collections, HashMap Lookups & Stream Pipelines',
      sortOrder: 3,
    },
    {
      id: 'mod_java_4',
      courseId: 'crs_java',
      title: 'Module 4: Exception Safety, `try-with-resources`, NIO File I/O & JUnit',
      topic: 'Checked vs Unchecked Exceptions, Path I/O & Applied OOP Manager',
      sortOrder: 4,
    },

    // C++ (expands mod_cpp_1 & mod_cpp_2 inside crs_cpp_draft — stays draft)
    {
      id: 'mod_cpp_3',
      courseId: 'crs_cpp_draft',
      title: 'Module 3: Modern C++ Templates, Concepts & Algorithmic Complexity',
      topic: 'Generic Functions, C++20 Concepts & Span Views',
      sortOrder: 3,
    },
    {
      id: 'mod_cpp_4',
      courseId: 'crs_cpp_draft',
      title: 'Module 4: File Streams, Exception Safety & Console Data Manager',
      topic: 'RAII File Persistence, Input Validation & CLI Ledger Build',
      sortOrder: 4,
    },
  ],

  lessons: [
    // ======================= NODE.JS =======================
    {
      id: 'les_node_2',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_2',
      title: 'Express Middleware Pipelines, Auth Guards & Centralized Error Handlers',
      slug: 'nodejs-express-middleware-error-boundaries',
      topicName: 'Middleware & Trust Boundaries',
      summary: 'Build composable Express middleware chains, verify HMAC/Bearer tokens server-side, and route async failures into structured JSON error handlers.',
      language: 'javascript',
      accessTier: 'free',
      durationMinutes: 24,
      sortOrder: 2,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Trace request flow through ordered middleware (`req -> res -> next()`).',
        'Enforce authentication (`401`) and role authorization (`403`) guards before database mutations.',
        'Catch errors cleanly in a 4-argument Express error handler `(err, req, res, next)` without leaking stack traces.',
      ],
      prerequisites: ['Async Request Handlers & Input Validation (Lesson 1)'],
      detailedExplanation:
        'An Express route handler should focus strictly on domain coordination, while cross-cutting concerns—logging, JSON body limits, bearer token verification, and role checks—live in focused **middleware** functions.\n\nNotice how middleware ordering matters: `express.json({ limit: "1mb" })` must execute *before* route handlers read `req.body`, and the 4-parameter error handler `(err, req, res, _next)` must be registered **last** after all routes so unexpected rejections always yield structured JSON instead of crashing the Node.js process.',
      conceptsAndTerminology: [
        { term: 'Middleware Chain', definition: 'Ordered pipeline executing functions sequentially via `next()` until a response is sent.' },
        { term: '401 vs 403 Status', definition: '`401` means unauthenticated identity; `403` means authenticated user lacks required role/entitlement.' },
      ],
      stepByStepTeaching: [
        'Parse bounded JSON payloads via `app.use(express.json({ limit: "1mb" }))`.',
        'Attach `requireAuth` and `requireRole("admin", "instructor")` middleware to protected routes.',
        'Terminate with a 4-arg error handler returning safe `{ error }` JSON and HTTP `500` on unexpected errors.',
      ],
      syntaxAndUsage: [
        'Remember to `return res.status(400).json(...)` so execution never continues past an error branch.',
      ],
      practicalExampleNarrative:
        'Composable role-checking middleware and centralized JSON error boundary.',
      codeExamples: [
        {
          title: 'Role Guard Factory & Safe Error Handler',
          description: 'Enforces HTTP 401/403 separation cleanly without exposing internal stack traces.',
          language: 'javascript',
          code: `export function requireRole(...allowedRoles) {\n  return (req, res, next) => {\n    if (!req.user) {\n      return res.status(401).json({ error: 'Authentication required.' });\n    }\n    if (!allowedRoles.includes(req.user.role)) {\n      return res.status(403).json({ error: 'Insufficient permissions.' });\n    }\n    return next();\n  };\n}\n\nexport function apiErrorHandler(err, _req, res, _next) {\n  const status = err.statusCode || 500;\n  res.status(status).json({ error: status >= 500 ? 'Internal server error.' : err.message });\n}`,
          expectedOutput: 'Returns 401 when req.user is missing, 403 on wrong role, and hides 500 internals.',
          explanation: 'Early `return` on `401`/`403` guarantees `next()` is never invoked for unauthorized callers.',
        },
      ],
      commonMistakes: [
        'Calling `res.status(401).json(...)` *without* `return`, allowing `next()` below to run anyway ("Cannot set headers after they are sent").',
        'Registering the error handler `(err, req, res, next)` before routes.',
      ],
      bestPractices: [
        'Always validate and sanitize every `req.body` and `req.params` field on the server—never trust client checks alone.',
      ],
      practicalActivity:
        'Write an Express middleware `requireJsonBody` rejecting non-object `req.body` requests with HTTP `400`.',
      starterCode: `function requireJsonBody(req, res, next) { /* verify plain object body */ }`,
      solutionHint: 'Check `if (!req.body || typeof req.body !== "object" || Array.isArray(req.body))`.',
      knowledgeChecks: [
        'How many parameters must an Express error-handling middleware accept to be recognized as an error handler?',
        'What is the difference between HTTP 401 and HTTP 403?',
      ],
      summaryPoints: [
        'Middleware chains isolate authentication, authorization, and error boundaries cleanly.',
      ],
      furtherResources: ['Express 5 / Node.js Routing & Error Handling Guide'],
    },
    {
      id: 'les_node_3',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_3',
      title: 'Node.js Event Loop, Async File I/O (`fs/promises`) & Streams',
      slug: 'nodejs-async-fs-streams',
      topicName: 'fs/promises & Streams',
      summary: 'Keep the Node.js event loop responsive using non-blocking `node:fs/promises`, process multi-megabyte exports smoothly with `stream.pipeline`, and never block workers with sync I/O.',
      language: 'javascript',
      accessTier: 'free',
      durationMinutes: 22,
      sortOrder: 3,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Avoid `fs.readFileSync` inside HTTP request handlers to prevent blocking concurrent users.',
        'Use `node:fs/promises` cleanly for bounded configuration/export files.',
        'Connect readable, transform, and writable streams safely with `stream/promises` `pipeline()` so backpressure never spikes memory.',
      ],
      prerequisites: ['Lesson 2'],
      detailedExplanation:
        'Node.js handles thousands of concurrent sockets on a single event loop by offloading disk and network waits to asynchronous OS/libuv workers. Calling `fs.readFileSync()` inside a live API route stalls *every* connected user until disk reads finish!\n\nFor larger files (like CSV curriculum exports or log archives), loading a whole 500MB file into memory crashes with Out-Of-Memory errors. Node.js **Streams** combined with `pipeline()` read and transform chunks incrementally—respecting consumer **backpressure** automatically so RAM usage remains flat.',
      conceptsAndTerminology: [
        { term: 'Backpressure', definition: 'Flow-control signal slowing a fast readable stream when a slower writable target buffer is full.' },
        { term: 'pipeline()', definition: 'Stream composition helper that cleans up descriptors and forwards errors automatically.' },
      ],
      stepByStepTeaching: [
        'Import `{ readFile, writeFile } from "node:fs/promises"` for small async file tasks.',
        'Import `{ pipeline } from "node:stream/promises"` when transforming or piping large payloads.',
        'Normalize untrusted file names with `path.basename()` to block directory traversal (`../../etc/passwd`).',
      ],
      syntaxAndUsage: [
        'Never concatenate raw user strings into `fs.readFile(path.join(BASE, userInput))` without validating `resolved.startsWith(BASE)`.',
      ],
      practicalExampleNarrative:
        'A Transform stream formatting records safely paired with path traversal protection.',
      codeExamples: [
        {
          title: 'Safe Path Resolution & Async JSON File Helper',
          description: 'Prevents directory traversal while reading bounded files asynchronously.',
          language: 'javascript',
          code: `import path from 'node:path';\nimport { readFile } from 'node:fs/promises';\n\nexport function resolveSafeSubpath(baseDir, userFilename) {\n  const cleanName = path.basename(String(userFilename || ''));\n  const target = path.resolve(baseDir, cleanName);\n  if (!target.startsWith(path.resolve(baseDir) + path.sep)) {\n    throw new Error('Invalid file path');\n  }\n  return target;\n}\n\nconsole.log(path.basename(resolveSafeSubpath('/tmp/exports', '../../report.csv')));`,
          expectedOutput: `report.csv`,
          explanation: '`path.basename()` strips any `../` segments before `path.resolve` verifies the root prefix.',
        },
      ],
      commonMistakes: [
        'Calling `*Sync` filesystem APIs inside high-traffic Express routes.',
        'Chaining `.pipe()` without error listeners (uncaught stream errors crash Node—use `stream/promises` `pipeline`).',
      ],
      bestPractices: [
        'Use `node:` protocol specifiers (`import fs from "node:fs/promises"`) for explicit built-in clarity.',
      ],
      practicalActivity:
        'Implement an async helper using `node:fs/promises` that ensures an export directory exists (`mkdir(..., { recursive: true })`) and writes JSON safely.',
      starterCode: `import { mkdir, writeFile } from 'node:fs/promises';`,
      solutionHint: 'Call `await mkdir(dir, { recursive: true });` before `await writeFile(...)`.',
      knowledgeChecks: [
        'Why should `fs.readFileSync()` be reserved only for one-time server startup scripts?',
        'What security vulnerability does `path.basename()` + root prefix verification mitigate?',
      ],
      summaryPoints: [
        'Async `fs/promises` and `pipeline()` streams keep Node.js servers responsive and bounded in memory.',
      ],
      furtherResources: ['Node.js Docs — File System & Stream Promises API'],
    },
    {
      id: 'les_node_4',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_3',
      title: 'Building Relational SQLite REST Endpoints in Node.js',
      slug: 'nodejs-sqlite-rest-endpoints',
      topicName: 'Node.js SQLite REST APIs',
      summary: 'Connect Express routes to `node:sqlite` prepared statements, wrap multi-table writes in atomic SQL transactions, and enforce unique constraints with HTTP `409`.',
      language: 'javascript',
      accessTier: 'free',
      durationMinutes: 24,
      sortOrder: 4,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Use prepared statements (`db.prepare(...).get/all/run`) to prevent SQL injection.',
        'Map database uniqueness conflicts cleanly to HTTP `409 Conflict` and missing IDs to `404`.',
        'Execute multi-statement mutations atomically with `BEGIN` / `COMMIT` / `ROLLBACK`.',
      ],
      prerequisites: ['Lesson 3'],
      detailedExplanation:
        'REST APIs are only as reliable as their database invariants. Relying on `SELECT` followed by `INSERT` without database `UNIQUE` constraints creates race conditions under concurrent requests. Define `UNIQUE` constraints on natural keys (like `slug` or `email`), execute parameterized prepared statements, wrap multi-table operations inside `BEGIN ... COMMIT` transactions with `ROLLBACK` inside `catch`, and return proper REST codes (`201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict`).',
      conceptsAndTerminology: [
        { term: 'Atomic Transaction', definition: 'Ensures either all statements in a batch commit together or none apply on failure.' },
        { term: 'HTTP 409 Conflict', definition: 'Standard status code when creating a resource duplicates an existing unique key.' },
      ],
      stepByStepTeaching: [
        'Pre-check duplicate slugs and back it up with a SQLite `UNIQUE` constraint.',
        'Wrap dependent inserts inside `db.exec("BEGIN"); ... db.exec("COMMIT");` with `ROLLBACK` on error.',
        'Set `PRAGMA foreign_keys = ON;` on SQLite startup.',
      ],
      syntaxAndUsage: [
        'Return `{ id, ... }` with HTTP `201` on `POST` creation and `200` on `GET`/`PATCH`/`DELETE`.',
      ],
      practicalExampleNarrative:
        'An atomic resource creation handler using prepared statements and conflict detection.',
      codeExamples: [
        {
          title: 'Parameterized Resource Endpoint with 409 Conflict Guard',
          description: 'Prevents duplicates and commits atomically.',
          language: 'javascript',
          code: `function createCourseTag(db, slug, name) {\n  const existing = db.prepare('SELECT id FROM tags WHERE slug = ?').get(slug);\n  if (existing) {\n    const err = new Error('Tag slug already exists.');\n    err.statusCode = 409;\n    throw err;\n  }\n  const id = 'tag_' + Date.now();\n  db.prepare('INSERT INTO tags (id, slug, name) VALUES (?, ?, ?)').run(id, slug, name);\n  return { id, slug, name };\n}`,
          expectedOutput: 'Inserts a clean tag row or throws structured 409 Conflict on duplicate slug.',
          explanation: 'Separating validation and HTTP status errors keeps service helpers clean and unit-testable.',
        },
      ],
      commonMistakes: [
        'Forgetting `db.exec("ROLLBACK")` inside `catch`—leaving SQLite stuck with an open transaction!',
      ],
      bestPractices: [
        'Always paginate collection endpoints (`LIMIT` + `OFFSET`) instead of returning unbounded tables.',
      ],
      practicalActivity:
        'Implement a `PATCH /api/tasks/:id` Express handler checking ownership (`user_id = req.user.id`) before updating SQLite.',
      starterCode: `app.patch('/api/tasks/:id', requireAuth, (req, res) => { /* verify owner then update */ });`,
      solutionHint: 'Check both `id` existence (`404`) and `task.user_id === req.user.id` (`403`).',
      knowledgeChecks: [
        'Why is `db.exec("ROLLBACK")` critical inside `catch` after `db.exec("BEGIN")`?',
      ],
      summaryPoints: [
        'Prepared statements, SQLite transactions, and proper 4xx status codes form the backbone of trustworthy Node.js APIs.',
      ],
      furtherResources: ['Node.js Docs — node:sqlite Module'],
    },
    {
      id: 'les_node_5',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_4',
      title: 'Automated API Testing (`node:test`) & Graceful Process Shutdown',
      slug: 'nodejs-testing-graceful-shutdown',
      topicName: 'API Testing & Graceful Shutdown',
      summary: 'Test live Express HTTP servers on ephemeral ports (`listen(0)`) with `node:test`, and drain active connections cleanly on `SIGINT`/`SIGTERM`.',
      language: 'javascript',
      accessTier: 'premium',
      durationMinutes: 20,
      sortOrder: 5,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Boot isolated HTTP test servers on ephemeral port `0` with temporary SQLite files.',
        'Verify HTTP status codes, JSON error contracts, and RBAC rejections end-to-end.',
        'Close HTTP servers and database handles gracefully on `SIGTERM` / `SIGINT`.',
      ],
      prerequisites: ['Lesson 4'],
      detailedExplanation:
        'Mocking database queries in backend tests often hides broken SQL syntax, missing foreign keys, or Express route precedence bugs! Using Node’s built-in `node:test` and `node:assert/strict`, you can spin up your real Express app on `app.listen(0)` (an OS-assigned free port) backed by a fresh temporary SQLite file and fire genuine `fetch()` requests—catching real auth, routing, and constraint bugs before deployment.',
      conceptsAndTerminology: [
        { term: 'Ephemeral Port (`listen(0)`)', definition: 'Lets the OS choose an unused port automatically so tests never clash on port 3000.' },
        { term: 'Graceful Shutdown', definition: 'Stopping new connections and flushing open DB handles cleanly when `SIGTERM` arrives.' },
      ],
      stepByStepTeaching: [
        'Bind `const server = app.listen(0)` inside a `before()` test hook.',
        'Extract `const { port } = server.address()` for `fetch("http://127.0.0.1:" + port + ...)`.',
        'Call `server.close()` and clean up temp DB files inside `after()`.',
      ],
      syntaxAndUsage: [
        'Set `process.on("SIGTERM", () => server.close(() => process.exit(0)))` in `server.ts`.',
      ],
      practicalExampleNarrative:
        'Minimal ephemeral `node:test` API verification skeleton.',
      codeExamples: [
        {
          title: 'Real Ephemeral-Port API Test Pattern',
          description: 'Tests live Express + SQLite endpoints cleanly without port collisions.',
          language: 'javascript',
          code: `import assert from 'node:assert/strict';\nimport http from 'node:http';\n\nconst srv = http.createServer((_req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ ok: true }));\n});\n\nsrv.listen(0, async () => {\n  const { port } = srv.address();\n  const res = await fetch(\`http://127.0.0.1:\${port}/health\`);\n  assert.equal(res.status, 200);\n  srv.close();\n});`,
          expectedOutput: 'Asserts real HTTP 200 JSON response on an ephemeral OS port and closes cleanly.',
          explanation: 'Zero external test-runner packages required; real sockets and JSON serialization execute end-to-end.',
        },
      ],
      commonMistakes: [
        'Hardcoding port `3000` inside automated tests—failing whenever the dev server is already running.',
      ],
      bestPractices: [
        'Always test unauthorized (`401`/`403`) paths alongside happy paths (`200`/`201`).',
      ],
      practicalActivity:
        'Write a `node:test` case testing `POST -> GET -> DELETE` lifecycle against an ephemeral server.',
      starterCode: `import { describe, it } from 'node:test';\nimport assert from 'node:assert/strict';`,
      solutionHint: 'Use `listen(0)` in `before()` and `srv.close()` in `after()`.',
      knowledgeChecks: [
        'Why is `app.listen(0)` preferred over `app.listen(3000)` in automated test suites?',
      ],
      summaryPoints: [
        'Real end-to-end HTTP + SQLite integration tests catch route ordering and RBAC gaps reliably.',
      ],
      furtherResources: ['Node.js Docs — Test Runner (node:test)'],
    },

    // ======================= SQL =======================
    {
      id: 'les_sql_2',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_2',
      title: 'Relational Schema Design, Normalization (1NF–3NF) & Constraints',
      slug: 'sql-schema-normalization-constraints',
      topicName: 'Normalization & Constraints',
      summary: 'Design anomaly-free relational tables using primary keys, foreign keys, `ON DELETE CASCADE`, `UNIQUE`, and `CHECK` constraints.',
      language: 'sql',
      accessTier: 'free',
      durationMinutes: 22,
      sortOrder: 2,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Eliminate repeating comma-separated columns (1NF) and transitive dependencies (3NF).',
        'Enforce referential integrity using `FOREIGN KEY ... REFERENCES ...`.',
        'Guard valid domain values at the database boundary using `CHECK` and composite `PRIMARY KEY`s.',
      ],
      prerequisites: ['SELECT Filtering, Joins & Aggregations (Lesson 1)'],
      detailedExplanation:
        'Storing comma-separated course IDs inside one `enrolled_courses = "1,4,9"` column breaks indexing, foreign keys, and clean `JOIN` reporting. **First Normal Form (1NF)** demands atomic cell values—moving enrollments into a dedicated join table `(user_id, course_id)` with a composite primary key.\n\nMoving to **Third Normal Form (3NF)** ensures every non-key column describes *the key, the whole key, and nothing but the key*—so updating an instructor’s display name happens in *one* row on `users`, not across 400 duplicated `courses` rows.',
      conceptsAndTerminology: [
        { term: 'Composite Primary Key', definition: 'Multi-column unique row identifier, e.g. `PRIMARY KEY (user_id, course_id)` preventing duplicate enrollments.' },
        { term: 'Referential Integrity', definition: 'Database guarantee that child `course_id` values always point to an existing parent `courses(id)` row.' },
        { term: 'CHECK Constraint', definition: 'Enforces boolean conditions directly in storage (`CHECK (rating BETWEEN 1 AND 5)`).' },
      ],
      stepByStepTeaching: [
        'Separate many-to-many relationships into explicit junction tables (`enrollments`).',
        'Declare `NOT NULL`, `UNIQUE`, and `FOREIGN KEY` constraints at table creation.',
        'Use `CHECK` constraints for fixed status enums or bounded numeric scores.',
      ],
      syntaxAndUsage: [
        'In SQLite, always enable enforcement per connection: `PRAGMA foreign_keys = ON;`.',
      ],
      practicalExampleNarrative:
        'A normalized 3-table schema enforcing composite keys and bounded review ratings.',
      codeExamples: [
        {
          title: 'Normalized Course & Review Schema with Constraints',
          description: 'Enforces rating bounds, uniqueness per user/course, and cascading deletes.',
          language: 'sql',
          code: `CREATE TABLE courses (\n  id TEXT PRIMARY KEY,\n  slug TEXT UNIQUE NOT NULL,\n  title TEXT NOT NULL\n);\n\nCREATE TABLE course_reviews (\n  id TEXT PRIMARY KEY,\n  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,\n  user_id TEXT NOT NULL,\n  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),\n  UNIQUE (user_id, course_id)\n);`,
          expectedOutput: 'Blocks invalid ratings (0 or 6), duplicate reviews by the same user, and orphan course references.',
          explanation: 'Database constraints guarantee data integrity regardless of which service or admin tool writes a row.',
        },
      ],
      commonMistakes: [
        'Storing JSON arrays of foreign IDs where structured queries/joins or cascade deletes are required.',
        'Omitting `UNIQUE` constraints and hoping application code never hits a double-click race condition.',
      ],
      bestPractices: [
        'Name tables consistently in plural snake_case and enforce foreign keys in storage.',
      ],
      practicalActivity:
        'Model a normalized `modules` and `lessons` pair where deleting a module cascades cleanly and `(course_id, slug)` is unique.',
      starterCode: `CREATE TABLE modules (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL);`,
      solutionHint: 'Add `REFERENCES modules(id) ON DELETE CASCADE` and `UNIQUE (course_id, slug)` on `lessons`.',
      knowledgeChecks: [
        'What anomaly occurs if a table stores `"HTML, CSS, JS"` inside a single `skills` text column?',
        'How does `UNIQUE (user_id, course_id)` prevent duplicate enrollments under simultaneous requests?',
      ],
      summaryPoints: [
        'Normalized tables + foreign key/check constraints stop data corruption at the database layer.',
      ],
      furtherResources: ['SQLite Docs — Foreign Key Support & Constraints'],
    },
    {
      id: 'les_sql_3',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_3',
      title: 'Subqueries, CTEs (`WITH`) & Analytical Window Functions',
      slug: 'sql-ctes-window-functions',
      topicName: 'CTEs & Window Functions',
      summary: 'Break complex analytical queries into readable Common Table Expressions (`WITH`) and compute cohort rankings/running totals with `OVER (PARTITION BY ...)`.',
      language: 'sql',
      accessTier: 'free',
      durationMinutes: 25,
      sortOrder: 3,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Refactor deeply nested subqueries into top-to-bottom readable `WITH cte_name AS (...)` blocks.',
        'Compare row-collapsing `GROUP BY` against row-preserving window functions (`RANK() OVER (...)`).',
        'Calculate per-category course ranks and running totals cleanly in pure SQL.',
      ],
      prerequisites: ['Lesson 1 & Lesson 2'],
      detailedExplanation:
        '`GROUP BY` collapses 100 individual rows into 5 category summary rows—losing per-item columns in the process. **Window functions** (`OVER (PARTITION BY category_id ORDER BY score DESC)`) calculate rankings, moving averages, or cohort shares *alongside* each individual row without discarding detail!\n\nWrapping multi-step calculations inside **Common Table Expressions (`WITH`)** turns intimidating nested `SELECT` pyramids into clear, step-by-step data pipelines.',
      conceptsAndTerminology: [
        { term: 'CTE (`WITH`)', definition: 'Named temporary result set scoped strictly to a single SQL query for clarity.' },
        { term: 'Window Function (`OVER`)', definition: 'Aggregates/ranks across a partition of rows while keeping every detail row intact.' },
      ],
      stepByStepTeaching: [
        'Compute per-course enrollment totals inside a first CTE (`WITH course_stats AS (...)`).',
        'Rank courses inside each category using `DENSE_RANK() OVER (PARTITION BY category_id ORDER BY enrollments DESC)`.',
        'Filter the outer query cleanly (`WHERE cat_rank <= 3`) for top-3 per category.',
      ],
      syntaxAndUsage: [
        'Use `DENSE_RANK()` instead of `ROW_NUMBER()` when tied scores should share identical rank numbers.',
      ],
      practicalExampleNarrative:
        'Finding top courses per category using a CTE and `DENSE_RANK() OVER`.',
      codeExamples: [
        {
          title: 'CTE + Partitioned Top-N Course Ranking Query',
          description: 'Ranks courses within every technology category cleanly.',
          language: 'sql',
          code: `WITH course_counts AS (\n  SELECT c.id, c.category_id, c.title, COUNT(e.user_id) AS students\n  FROM courses c\n  LEFT JOIN enrollments e ON e.course_id = c.id\n  GROUP BY c.id\n),\nranked AS (\n  SELECT *,\n         DENSE_RANK() OVER (PARTITION BY category_id ORDER BY students DESC, title ASC) AS category_rank\n  FROM course_counts\n)\nSELECT id, title, students, category_rank\nFROM ranked\nWHERE category_rank <= 3;`,
          expectedOutput: 'Returns up to the top 3 highest-enrolled courses for each category without multiple round-trip queries.',
          explanation: 'The first CTE aggregates counts; the second CTE partitions by `category_id` to rank without collapsing rows.',
        },
      ],
      commonMistakes: [
        'Trying to filter a window function inside the same `WHERE` clause (`WHERE RANK() OVER (...) <= 3` is illegal in SQL—wrap it in a CTE first).',
      ],
      bestPractices: [
        'Use descriptive CTE names (`active_learners`, `daily_totals`) so queries read like documentation.',
      ],
      practicalActivity:
        'Write a CTE calculating each learner’s completed lesson count and running XP rank across the platform.',
      starterCode: `WITH learner_totals AS (\n  SELECT user_id, COUNT(*) AS completed FROM lesson_progress WHERE completed = 1 GROUP BY user_id\n)\n-- Rank learners by completed lessons`,
      solutionHint: 'Select `*, DENSE_RANK() OVER (ORDER BY completed DESC) AS rnk FROM learner_totals`.',
      knowledgeChecks: [
        'How does `OVER (PARTITION BY ...)` differ from `GROUP BY`?',
        'Why must `WHERE category_rank <= 3` be placed outside the CTE that defines `category_rank`?',
      ],
      summaryPoints: [
        'CTEs structure multi-stage SQL cleanly; window functions add per-partition rankings without collapsing detail rows.',
      ],
      furtherResources: ['SQLite Window Functions Documentation'],
    },
    {
      id: 'les_sql_4',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_4',
      title: 'Composite B-Tree Indexes, ACID Transactions & `EXPLAIN QUERY PLAN`',
      slug: 'sql-indexes-transactions-query-plan',
      topicName: 'Indexing, ACID & Query Plans',
      summary: 'Speed up multi-column `WHERE`/`ORDER BY` lookups using leftmost-prefix composite indexes, inspect `EXPLAIN QUERY PLAN`, and guarantee atomic transfers with transactions.',
      language: 'sql',
      accessTier: 'premium',
      durationMinutes: 24,
      sortOrder: 4,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Distinguish slow `SCAN TABLE` sweeps from fast `SEARCH TABLE USING INDEX` lookups.',
        'Order composite index columns cleanly `(equality_col, range_or_sort_col)`.',
        'Protect multi-step financial or entitlement updates with `BEGIN TRANSACTION ... COMMIT`.',
      ],
      prerequisites: ['Lesson 2 & Lesson 3'],
      detailedExplanation:
        'Adding an index speeds up reads dramatically, yet adding the *wrong* column order makes the index useless for certain filters! A composite B-tree index `ON messages(recipient_id, read_at, created_at)` follows the **leftmost prefix rule**: it accelerates queries filtering `recipient_id`, or `(recipient_id, read_at)`, yet cannot jump straight to `created_at` alone without `recipient_id`.\n\nUse `EXPLAIN QUERY PLAN` to verify empirically whether SQLite performs an index search instead of scanning millions of rows.',
      conceptsAndTerminology: [
        { term: 'Leftmost Prefix Rule', definition: 'Composite index `(A, B, C)` accelerates `(A)`, `(A, B)`, and `(A, B, C)`, not standalone `(B)`.' },
        { term: 'EXPLAIN QUERY PLAN', definition: 'Diagnostic command showing whether SQL executes full table `SCAN` vs index `SEARCH`.' },
      ],
      stepByStepTeaching: [
        'Identify high-frequency `WHERE` + `ORDER BY` query shapes.',
        'Create composite index matching equality filters first, sort columns last.',
        'Verify with `EXPLAIN QUERY PLAN SELECT ...`.',
      ],
      syntaxAndUsage: [
        'Avoid wrapping indexed columns in functions inside `WHERE` (e.g., `LOWER(email) = ?` misses plain `INDEX(email)` unless indexed on expression or stored normalized).',
      ],
      practicalExampleNarrative:
        'Indexing inbox message reads and verifying index search plans.',
      codeExamples: [
        {
          title: 'Composite Inbox Index & Query Plan Audit',
          description: 'Accelerates unread message queries sorted chronologically.',
          language: 'sql',
          code: `CREATE INDEX IF NOT EXISTS idx_inbox_unread\n  ON messages(recipient_id, read_at, created_at DESC);\n\nEXPLAIN QUERY PLAN\nSELECT id, sender_id, content\nFROM messages\nWHERE recipient_id = 'usr_1' AND read_at = ''\nORDER BY created_at DESC\nLIMIT 20;`,
          expectedOutput: `SEARCH messages USING INDEX idx_inbox_unread (recipient_id=? AND read_at=?)`,
          explanation: 'Matching both equality predicates cleanly lets SQLite walk rows already pre-sorted by `created_at DESC`.',
        },
      ],
      commonMistakes: [
        'Indexing every individual column blindly—slowing down `INSERT`/`UPDATE` writes without helping multi-column queries.',
        'Putting range filters before equality filters in composite indexes.',
      ],
      bestPractices: [
        'Run `EXPLAIN QUERY PLAN` on slow endpoints before adding speculative indexes.',
      ],
      practicalActivity:
        'Design an index for `SELECT * FROM enrollments WHERE course_id = ? ORDER BY enrolled_at DESC` and inspect its query plan.',
      starterCode: `CREATE INDEX IF NOT EXISTS idx_enroll_course ON enrollments(course_id, enrolled_at DESC);`,
      solutionHint: 'Put equality filter `course_id` before sort key `enrolled_at DESC`.',
      knowledgeChecks: [
        'Does `CREATE INDEX idx_ab ON tbl(a, b)` speed up `WHERE b = 5` without `a`?',
        'In `EXPLAIN QUERY PLAN`, which keyword signals a full table scan vs an index lookup?',
      ],
      summaryPoints: [
        'Ordered composite indexes + `EXPLAIN QUERY PLAN` keep dashboard queries fast at scale.',
      ],
      furtherResources: ['SQLite Query Planning & Indexing Overview'],
    },
    {
      id: 'les_sql_5',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_4',
      title: 'Database Views, Safe Migrations & Analytical Reporting Lab',
      slug: 'sql-views-migrations-reporting',
      topicName: 'Views & Reporting Pipelines',
      summary: 'Encapsulate reusable aggregate reports inside SQL `VIEW`s and apply non-destructive additive schema migrations cleanly.',
      language: 'sql',
      accessTier: 'free',
      durationMinutes: 18,
      sortOrder: 5,
      status: 'published',
      workflowStatus: 'published',
      objectives: [
        'Create read-only reusable reporting `VIEW`s over normalized joins.',
        'Upgrade existing production schemas non-destructively using additive columns and `CREATE TABLE IF NOT EXISTS`.',
      ],
      prerequisites: ['Lesson 4'],
      detailedExplanation:
        'When dashboards across multiple endpoints need identical course completion summaries, duplicating complex 4-table `JOIN` logic invites drift. A **SQL `VIEW`** gives every caller a consistent virtual table backed by live storage while preserving normalized underlying tables.',
      conceptsAndTerminology: [
        { term: 'SQL VIEW', definition: 'Saved named `SELECT` query queryable like a read-only table.' },
      ],
      stepByStepTeaching: [
        'Define `CREATE VIEW IF NOT EXISTS v_course_coverage AS ...`.',
        'Query `SELECT * FROM v_course_coverage WHERE published_lessons > 0;`.',
      ],
      syntaxAndUsage: [
        'Use `COALESCE(expr, 0)` in aggregate views so `LEFT JOIN` empty metrics report `0` instead of `NULL`.',
      ],
      practicalExampleNarrative:
        'Reusable `v_course_coverage` summary view.',
      codeExamples: [
        {
          title: 'Reusable Course Coverage Summary View',
          description: 'Combines course metadata, published lesson counts, and exercises cleanly.',
          language: 'sql',
          code: `CREATE VIEW IF NOT EXISTS v_course_coverage AS\nSELECT\n  c.id AS course_id,\n  c.title,\n  COALESCE(COUNT(DISTINCT CASE WHEN l.status = 'published' THEN l.id END), 0) AS published_lessons,\n  COALESCE(COUNT(DISTINCT e.id), 0) AS exercises_count\nFROM courses c\nLEFT JOIN lessons l ON l.course_id = c.id\nLEFT JOIN exercises e ON e.course_id = c.id\nGROUP BY c.id;`,
          expectedOutput: 'Creates `v_course_coverage` returning clean non-null counts per course.',
          explanation: '`COUNT(DISTINCT ...)` prevents join multiplication from inflating lesson vs exercise counts.',
        },
      ],
      commonMistakes: [
        'Using `COUNT(*)` across multiple 1-to-many `LEFT JOIN`s simultaneously—causing Cartesian count inflation! Always use `COUNT(DISTINCT id)` or subqueries.',
      ],
      bestPractices: [
        'Guard multi-join aggregates with `COUNT(DISTINCT ...)` to prevent silent metric inflation.',
      ],
      practicalActivity:
        'Extend `v_course_coverage` to include `assessments_count` using `COUNT(DISTINCT a.id)`.',
      starterCode: `SELECT c.id, COUNT(DISTINCT l.id) AS lessons FROM courses c LEFT JOIN lessons l ON l.course_id = c.id GROUP BY c.id;`,
      solutionHint: 'Notice why `COUNT(DISTINCT ...)` stops two joined tables from multiplying counts.',
      knowledgeChecks: [
        'Why does joining both `lessons` and `exercises` in one query inflate plain `COUNT(l.id)` unless `DISTINCT` is used?',
      ],
      summaryPoints: [
        'SQL `VIEW`s + `COUNT(DISTINCT ...)` deliver clean, bug-free analytics.',
      ],
      furtherResources: ['SQLite CREATE VIEW Reference'],
    },

    // ======================= JAVA (status='draft', workflowStatus='review' — awaiting review) =======================
    {
      id: 'les_java_2',
      courseId: 'crs_java',
      moduleId: 'mod_java_2',
      title: 'Encapsulation, Inheritance, Abstract Classes & Interfaces in Java',
      slug: 'java-encapsulation-inheritance-interfaces',
      topicName: 'OOP Encapsulation & Interfaces',
      summary: 'Design maintainable Java domain models using private encapsulated fields, constructors, `sealed` / `abstract` bases, and behavioral `interface` contracts.',
      language: 'java',
      accessTier: 'free',
      durationMinutes: 24,
      sortOrder: 2,
      status: 'draft',
      workflowStatus: 'review',
      objectives: [
        'Protect class invariants using `private final` fields and validation inside constructors.',
        'Prefer composition and `interface` contracts over deep fragile inheritance trees.',
        'Override `equals`, `hashCode`, and `toString` cleanly (or leverage Java `record`s for value objects).',
      ],
      prerequisites: ['Classes, Records & Interface Contracts in Java (Lesson 1)'],
      detailedExplanation:
        'Object-oriented Java shines when classes protect their invariants at boundaries. Exposing public mutable fields (`student.gpa = -5.0;`) lets callers corrupt state silently. Making fields `private` and validating mutations inside constructors or explicit methods guarantees objects stay valid throughout their lifetime.\n\nWhen sharing behavior across unrelated domain types (`Course`, `Workshop`), define a Java `interface` (`Gradable`, `Publishable`) instead of forcing artificial single-inheritance hierarchies.',
      conceptsAndTerminology: [
        { term: 'Encapsulation', definition: 'Hiding internal representation behind `private` fields and validated public methods.' },
        { term: 'Polymorphism', definition: 'Invoking common `interface` behavior uniformly across distinct concrete implementations.' },
      ],
      stepByStepTeaching: [
        'Validate constructor parameters upfront and throw `IllegalArgumentException` on invalid state.',
        'Define clean capability interfaces (`interface Gradable { int maxScore(); }`).',
        'Annotate overridden methods with `@Override` so typos fail compilation cleanly.',
      ],
      syntaxAndUsage: [
        'Always pair `@Override` on interface/superclass implementations to prevent accidental overload bugs.',
      ],
      practicalExampleNarrative:
        'An encapsulated `EnrollmentAccount` paired with a polymorphic `Assessable` grading interface.',
      codeExamples: [
        {
          title: 'Encapsulated Course Item Implementing Polymorphic Interface',
          description: 'Validates inputs in constructor and demonstrates `@Override` interface contract.',
          language: 'java',
          code: `interface Gradable {\n    double percentageScore();\n}\n\npublic final class QuizSubmission implements Gradable {\n    private final int earned;\n    private final int total;\n\n    public QuizSubmission(int earned, int total) {\n        if (total <= 0 || earned < 0 || earned > total) {\n            throw new IllegalArgumentException("Invalid quiz bounds");\n        }\n        this.earned = earned;\n        this.total = total;\n    }\n\n    @Override\n    public double percentageScore() {\n        return (earned * 100.0) / total;\n    }\n\n    public static void main(String[] args) {\n        Gradable sub = new QuizSubmission(18, 20);\n        System.out.println("Score: " + sub.percentageScore() + "%");\n    }\n}`,
          expectedOutput: `Score: 90.0%`,
          explanation: 'No caller can mutate `earned` or `total` after validation, preventing invalid divide-by-zero or >100% scores.',
        },
      ],
      commonMistakes: [
        'Exposing mutable internal `List` references directly from getters (`return this.scores;` instead of `List.copyOf(this.scores)`).',
        'Overriding `equals()` without overriding `hashCode()`—breaking `HashMap` and `HashSet` lookups!',
      ],
      bestPractices: [
        'Return defensive unmodifiable views (`List.copyOf(...)`) from getters.',
      ],
      practicalActivity:
        'Create a `Gradable` implementation for `ProjectSubmission` combining rubric weights cleanly.',
      starterCode: `public final class ProjectSubmission implements Gradable { /* validate rubric weights */ }`,
      solutionHint: 'Throw `IllegalArgumentException` if any weight is negative.',
      knowledgeChecks: [
        'Why must `hashCode()` always match `equals()` when overriding equality in Java?',
      ],
      summaryPoints: [
        'Encapsulation + defensive copies + interface contracts create reliable Java domain layers.',
      ],
      furtherResources: ['Oracle Java Tutorials — Interfaces & Inheritance'],
    },
    {
      id: 'les_java_3',
      courseId: 'crs_java',
      moduleId: 'mod_java_3',
      title: 'Java Generics, Collections (`List`, `Map`, `Set`) & Streams API',
      slug: 'java-generics-collections-streams',
      topicName: 'Java Collections & Streams',
      summary: 'Store and index objects efficiently with typed `ArrayList`, `HashMap`, and `HashSet`, and aggregate collections declaratively via `java.util.stream`.',
      language: 'java',
      accessTier: 'free',
      durationMinutes: 25,
      sortOrder: 3,
      status: 'draft',
      workflowStatus: 'review',
      objectives: [
        'Pick the optimal collection (`List` order, `Set` uniqueness, `Map` O(1) lookup).',
        'Avoid `NullPointerException` via `Map.getOrDefault` and `Optional`.',
        'Transform, filter, and group collections using Java Streams (`filter`, `map`, `Collectors.groupingBy`).',
      ],
      prerequisites: ['Lesson 2'],
      detailedExplanation:
        'Scanning an `ArrayList` linearly with `.contains()` or loops slows down quadratically on thousands of items. Using a `HashMap<String, Student>` delivers O(1) amortized lookups by ID, while `HashSet` deduplicates unique tags automatically.\n\nJava’s **Streams API** (`list.stream().filter(...).map(...).toList()`) expresses data pipelines cleanly without mutating the source collection.',
      conceptsAndTerminology: [
        { term: 'Generics (`List<Student>`)', definition: 'Compile-time element type enforcement eliminating unsafe runtime casts.' },
        { term: 'Stream Pipeline', definition: 'Lazy sequence of `filter`/`map` steps evaluated when a terminal collector (`.toList()`, `.sum()`) runs.' },
      ],
      stepByStepTeaching: [
        'Declare collection variables against interfaces (`Map<String, Integer> counts = new HashMap<>();`).',
        'Increment frequency counts cleanly with `counts.merge(key, 1, Integer::sum)`.',
        'Convert collections to immutable lists via `.stream()...toList()` (Java 16+).',
      ],
      syntaxAndUsage: [
        'Use `Optional<Student>` return types for lookup methods rather than returning raw `null`.',
      ],
      practicalExampleNarrative:
        'Aggregating course enrollments by track using `HashMap` and filtering honor-roll learners with Streams.',
      codeExamples: [
        {
          title: 'Typed Streams Filter & Map Frequency Counter',
          description: 'Computes honor-roll names cleanly without mutating source data.',
          language: 'java',
          code: `import java.util.*;\n\npublic class CohortStats {\n    record Student(String name, int score) {}\n\n    public static void main(String[] args) {\n        List<Student> roster = List.of(\n            new Student("Ada", 96),\n            new Student("Grace", 92),\n            new Student("Lin", 68)\n        );\n        List<String> top = roster.stream()\n            .filter(s -> s.score() >= 90)\n            .map(Student::name)\n            .toList();\n        System.out.println("Top learners: " + top);\n    }\n}`,
          expectedOutput: `Top learners: [Ada, Grace]`,
          explanation: 'Using a `record` + `.stream().filter().map().toList()` builds a clean unmodifiable result list in 4 lines.',
        },
      ],
      commonMistakes: [
        'Removing items from an `ArrayList` inside an enhanced `for (var item : list)` loop (`ConcurrentModificationException`!). Use `removeIf(...)` instead.',
      ],
      bestPractices: [
        'Program to interfaces (`List`, `Map`, `Set`) in method parameters and return types.',
      ],
      practicalActivity:
        'Use `Map.merge` and `stream().mapToInt(...).average()` to summarize cohort averages by track.',
      starterCode: `Map<String, Integer> enrollments = new HashMap<>();`,
      solutionHint: '`enrollments.merge(track, 1, Integer::sum);` handles absent keys automatically.',
      knowledgeChecks: [
        'What exception occurs if you remove elements inside a Java `for-each` loop without `Iterator` or `removeIf`?',
      ],
      summaryPoints: [
        'Typed Java Collections and Streams replace fragile manual loops with fast, readable pipelines.',
      ],
      furtherResources: ['Oracle Java Docs — Collections Framework & Streams'],
    },
    {
      id: 'les_java_4',
      courseId: 'crs_java',
      moduleId: 'mod_java_4',
      title: 'Java Exceptions, `try-with-resources`, File NIO & Unit Testing',
      slug: 'java-exceptions-nio-testing',
      topicName: 'Exceptions, NIO & JUnit',
      summary: 'Handle checked vs unchecked exceptions intentionally, close file streams automatically via `try-with-resources`, and write JUnit 5 assertions.',
      language: 'java',
      accessTier: 'premium',
      durationMinutes: 24,
      sortOrder: 4,
      status: 'draft',
      workflowStatus: 'review',
      objectives: [
        'Distinguish recoverable checked exceptions (`IOException`) from programming/domain invariant errors (`IllegalArgumentException`).',
        'Guarantee deterministic file/stream closure using `try (BufferedReader br = Files.newBufferedReader(path))`.',
      ],
      prerequisites: ['Lesson 3'],
      detailedExplanation:
        'Swallowing exceptions with empty `catch (Exception e) {}` blocks hides disk permission bugs and corrupts downstream data silently. In Java, always close OS resources (`InputStream`, `BufferedWriter`, JDBC `Connection`) inside a **`try-with-resources`** header (`AutoCloseable`), guaranteeing cleanup even when early returns or exceptions occur.',
      conceptsAndTerminology: [
        { term: 'try-with-resources', definition: 'Syntax automatically invoking `.close()` on declared `AutoCloseable` resources on block exit.' },
        { term: 'Files (java.nio.file)', definition: 'Modern UTF-8 safe file reading/writing utilities paired with `Path.of(...)`.' },
      ],
      stepByStepTeaching: [
        'Use `Path.of(...)` and `Files.writeString` / `Files.readString` with explicit `StandardCharsets.UTF_8`.',
        'Never catch broad `Exception` or `Throwable` and ignore it silently.',
      ],
      syntaxAndUsage: [
        'In JUnit 5 tests, verify domain guards with `assertThrows(IllegalArgumentException.class, () -> ...)`.',
      ],
      practicalExampleNarrative:
        'Resource-safe UTF-8 file persistence and exception boundary handling.',
      codeExamples: [
        {
          title: 'AutoCloseable File Reading with java.nio.file',
          description: 'Reads lines deterministically and converts missing-file failures cleanly.',
          language: 'java',
          code: `import java.io.*;\nimport java.nio.charset.StandardCharsets;\nimport java.nio.file.*;\n\npublic class RosterReader {\n    public static int countLines(Path path) throws IOException {\n        int count = 0;\n        try (BufferedReader reader = Files.newBufferedReader(path, StandardCharsets.UTF_8)) {\n            while (reader.readLine() != null) count++;\n        }\n        return count;\n    }\n}`,
          expectedOutput: 'Returns total non-null line count and guarantees file descriptor closure regardless of exceptions.',
          explanation: 'The `try (...)` declaration replaces error-prone `finally { if (reader != null) reader.close(); }` boilerplate.',
        },
      ],
      commonMistakes: [
        'Using platform-default charset encodings instead of `StandardCharsets.UTF_8`.',
        'Catching `NullPointerException` for control flow instead of checking `Objects.requireNonNull` / `Optional`.',
      ],
      bestPractices: [
        'Use `java.nio.file.Path` and `try-with-resources` consistently for I/O.',
      ],
      practicalActivity:
        'Write a JUnit-style validation check asserting invalid student score bounds throw `IllegalArgumentException`.',
      starterCode: `if (score < 0 || score > 100) throw new IllegalArgumentException("Out of range");`,
      solutionHint: 'Test both lower (`-1`) and upper (`101`) boundary cases.',
      knowledgeChecks: [
        'Which Java interface must a resource implement to be usable inside `try (var r = ...)`?',
      ],
      summaryPoints: [
        '`try-with-resources`, `java.nio.file`, and explicit exceptions build dependable enterprise Java code.',
      ],
      furtherResources: ['Oracle Java Docs — Exceptions & NIO.2 File Operations'],
    },
    {
      id: 'les_java_5',
      courseId: 'crs_java',
      moduleId: 'mod_java_4',
      title: 'Java OOP Architecture: Service Layers, Repositories & CLI Apps',
      slug: 'java-oop-service-repository-architecture',
      topicName: 'OOP Service & Repository Pattern',
      summary: 'Separate domain entities, repository interfaces, and business service rules for clean testable management applications.',
      language: 'java',
      accessTier: 'free',
      durationMinutes: 20,
      sortOrder: 5,
      status: 'draft',
      workflowStatus: 'review',
      objectives: [
        'Decouple business validation logic (`CourseService`) from persistence (`CourseRepository` interface).',
        'Inject repository implementations cleanly via constructor dependency injection.',
      ],
      prerequisites: ['Lesson 4'],
      detailedExplanation:
        'Putting `Scanner` console prompts, business math, and file persistence inside one giant `main()` method makes testing impossible. Defining a `Repository` interface (`save`, `findById`, `findAll`) and passing it into your `Service` constructor allows unit tests to plug in a fast in-memory `HashMap` implementation while production plugs in file or SQL storage.',
      conceptsAndTerminology: [
        { term: 'Constructor Injection', definition: 'Passing dependencies (`Repository`) into a service constructor rather than hardcoding `new FileRepo()`.' },
      ],
      stepByStepTeaching: [
        'Define `interface StudentRepository` with `save`, `findById`, `listAll`.',
        'Inject `StudentRepository` into `StudentManagementService`.',
      ],
      syntaxAndUsage: [
        'Mark injected dependencies `private final` inside the service class.',
      ],
      practicalExampleNarrative:
        'Constructor-injected Java service decoupling management logic from storage.',
      codeExamples: [
        {
          title: 'Service-Repository Decoupling in Java',
          description: 'Allows switching seamlessly between in-memory testing and file persistence.',
          language: 'java',
          code: `import java.util.*;\n\ninterface ItemRepo {\n    void save(String id, String name);\n    Optional<String> find(String id);\n}\n\nclass InventoryService {\n    private final ItemRepo repo;\n    public InventoryService(ItemRepo repo) { this.repo = repo; }\n    public void register(String id, String name) {\n        if (id == null || id.isBlank()) throw new IllegalArgumentException("ID required");\n        repo.save(id.trim(), name.trim());\n    }\n}`,
          expectedOutput: 'Validates inputs before delegating persistence cleanly to any `ItemRepo` implementation.',
          explanation: 'Any storage backend implementing `ItemRepo` satisfies `InventoryService` without altering business validation.',
        },
      ],
      commonMistakes: [
        'Mixing `System.out.println` UI menus inside domain entity classes.',
      ],
      bestPractices: [
        'Keep console I/O in a thin entrypoint class and domain rules in pure services.',
      ],
      practicalActivity:
        'Implement an in-memory `HashMap`-backed `ItemRepo` and unit-verify duplicate ID handling.',
      starterCode: `class InMemoryItemRepo implements ItemRepo { private final Map<String, String> store = new HashMap<>(); }`,
      solutionHint: 'Implement `save` and `find` returning `Optional.ofNullable(store.get(id))`.',
      knowledgeChecks: [
        'How does constructor dependency injection improve unit testing of Java services?',
      ],
      summaryPoints: [
        'Service + Repository layering keeps OOP Java projects modular and testable.',
      ],
      furtherResources: ['Clean Architecture Patterns in Java'],
    },
    {
      id: 'les_java_6',
      courseId: 'crs_java',
      moduleId: 'mod_java_4',
      title: 'Concurrency Safety Basics: Immutability & `ConcurrentHashMap`',
      slug: 'java-concurrency-immutability',
      topicName: 'Java Concurrency Basics',
      summary: 'Prevent shared-memory race conditions by favoring immutable `record`s and thread-safe `ConcurrentHashMap` structures over unsynchronized mutable maps.',
      language: 'java',
      accessTier: 'premium',
      durationMinutes: 18,
      sortOrder: 6,
      status: 'draft',
      workflowStatus: 'review',
      objectives: [
        'Explain why plain `HashMap` breaks under concurrent writes from multiple threads.',
        'Use immutable value objects (`record`) and atomic `ConcurrentHashMap.compute` operations safely.',
      ],
      prerequisites: ['Lesson 5'],
      detailedExplanation:
        'Two threads updating a regular `HashMap` simultaneously can corrupt internal bucket chains or lose increments (`map.put(k, map.get(k) + 1)`). Immutable Java `record`s are inherently thread-safe, and `ConcurrentHashMap.compute()` performs read-modify-write atomically per bucket.',
      conceptsAndTerminology: [
        { term: 'Immutable Record', definition: 'Read-only carrier whose fields cannot change after construction, eliminating race conditions.' },
      ],
      stepByStepTeaching: [
        'Use `ConcurrentHashMap` when multiple worker threads share a lookup cache.',
        'Replace separate `get` + `put` pairs with atomic `map.merge(key, 1, Integer::sum)`.',
      ],
      syntaxAndUsage: [
        '`ConcurrentHashMap` forbids `null` keys and `null` values by design.',
      ],
      practicalExampleNarrative:
        'Atomic counter updates on `ConcurrentHashMap`.',
      codeExamples: [
        {
          title: 'Thread-Safe Frequency Counter with ConcurrentHashMap',
          description: 'Avoids lost-update race conditions via atomic `.merge()`.',
          language: 'java',
          code: `import java.util.concurrent.*;\n\npublic class SafeHits {\n    public static void main(String[] args) {\n        ConcurrentHashMap<String, Integer> hits = new ConcurrentHashMap<>();\n        hits.merge("/courses", 1, Integer::sum);\n        hits.merge("/courses", 1, Integer::sum);\n        System.out.println("Hits: " + hits.get("/courses"));\n    }\n}`,
          expectedOutput: `Hits: 2`,
          explanation: '`merge` executes atomically within `ConcurrentHashMap` even across parallel streams or executor threads.',
        },
      ],
      commonMistakes: [
        'Assuming `if (!map.containsKey(k)) map.put(k, v)` is thread-safe without `putIfAbsent` or `computeIfAbsent`.',
      ],
      bestPractices: [
        'Prefer immutable objects + atomic `ConcurrentHashMap` methods instead of broad coarse locking.',
      ],
      practicalActivity:
        'Replace a non-atomic `get`+`put` increment with `ConcurrentHashMap.merge`.',
      starterCode: `ConcurrentHashMap<String, Long> totals = new ConcurrentHashMap<>();`,
      solutionHint: 'Use `totals.merge(key, 1L, Long::sum)`.',
      knowledgeChecks: [
        'Why is `map.put(k, map.get(k) + 1)` unsafe across two concurrent threads even on `ConcurrentHashMap`?',
      ],
      summaryPoints: [
        'Immutability + atomic concurrent collection methods eliminate subtle race bugs.',
      ],
      furtherResources: ['Java `java.util.concurrent` Package Summary'],
    },

    // ======================= C++ (draft curriculum inside crs_cpp_draft) =======================
    {
      id: 'les_cpp_3',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_2',
      title: 'STL Containers (`std::vector`, `std::unordered_map`) & Algorithms',
      slug: 'cpp-stl-containers-algorithms',
      topicName: 'STL Containers & Algorithms',
      summary: 'Leverage contiguous `std::vector`, O(1) hash maps, structured bindings, and `<algorithm>` utilities (`std::sort`, `std::ranges`) in idiomatic C++20.',
      language: 'cpp',
      accessTier: 'free',
      durationMinutes: 24,
      sortOrder: 3,
      status: 'draft',
      workflowStatus: 'draft',
      objectives: [
        'Prefer `std::vector` and `.reserve()` for cache-friendly contiguous storage.',
        'Avoid accidental default-insertion traps with `unordered_map::operator[]` vs `.find()` / `.contains()`.',
        'Sort and filter records cleanly using `<algorithm>` and C++20 ranges.',
      ],
      prerequisites: ['References, Const Correctness & Smart Pointers (Lesson 2)'],
      detailedExplanation:
        'C++ Standard Template Library (STL) containers combine zero-overhead abstraction with deterministic memory layout. `std::vector<T>` stores elements contiguously in RAM for maximum CPU cache speed; calling `vec.reserve(n)` upfront eliminates repeated heap reallocations.\n\nWatch out when reading `std::unordered_map`: writing `if (scores["Ada"] > 0)` silently inserts a zero-initialized `"Ada"` key if missing! Use C++20 `.contains()` or `.find()` for read-only lookups.',
      conceptsAndTerminology: [
        { term: 'Iterator Invalidation', definition: 'Pointers/references to `vector` elements break if `push_back` triggers reallocation.' },
        { term: 'Structured Bindings', definition: '`for (const auto& [key, val] : map)` binds pair components cleanly by const reference.' },
      ],
      stepByStepTeaching: [
        'Pre-allocate known sizes with `items.reserve(count);`.',
        'Iterate read-only maps using `for (const auto& [k, v] : counts)`.',
        'Check key presence via `.contains(key)` or `.find(key) != end()`.',
      ],
      syntaxAndUsage: [
        'Pass `std::string_view` instead of `const std::string&` for non-owning read-only string parameters.',
      ],
      practicalExampleNarrative:
        'Pre-reserved `std::vector` sorting and non-mutating map lookup.',
      codeExamples: [
        {
          title: 'Cache-Friendly Vector Sort & Safe Map Lookup',
          description: 'Sorts student scores descending without unnecessary copies.',
          language: 'cpp',
          code: `#include <algorithm>\n#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <vector>\n\nint main() {\n    std::unordered_map<std::string, int> grades{{"Ada", 97}, {"Alan", 92}};\n    if (auto it = grades.find("Ada"); it != grades.end()) {\n        std::cout << it->first << ": " << it->second << "\\n";\n    }\n    std::vector<int> vals{72, 95, 84};\n    std::sort(vals.begin(), vals.end(), std::greater<int>{});\n    std::cout << "Top score: " << vals.front() << "\\n";\n    return 0;\n}`,
          expectedOutput: `Ada: 97\nTop score: 95`,
          explanation: '`grades.find("Ada")` avoids mutating the map, and `std::sort` operates in-place in O(N log N) time.',
        },
      ],
      commonMistakes: [
        'Using `map[key]` in a `const` lookup function (fails to compile because `operator[]` can insert!).',
        'Copying large `std::string` keys inside range loops (`for (auto entry : map)` instead of `const auto&`).',
      ],
      bestPractices: [
        'Use `const auto&` inside read-only range loops over non-trivial types.',
      ],
      practicalActivity:
        'Store 5 records in `std::vector`, sort by descending score with a lambda comparator, and print the top 3.',
      starterCode: `#include <algorithm>\n#include <vector>\n// Sort structs by .score descending`,
      solutionHint: 'Use `[](const auto& a, const auto& b) { return a.score > b.score; }`.',
      knowledgeChecks: [
        'Why does `unordered_map::operator[]` fail inside a `const` method?',
      ],
      summaryPoints: [
        '`std::vector`, `.find()`/`.contains()`, and `const auto&` deliver high performance with clarity.',
      ],
      furtherResources: ['cppreference.com — Containers & Algorithms'],
    },
    {
      id: 'les_cpp_4',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_3',
      title: 'C++20 Templates, `std::span` & Type Concepts',
      slug: 'cpp-templates-span-concepts',
      topicName: 'Templates, Span & Concepts',
      summary: 'Write generic zero-overhead utilities constrained cleanly by C++20 Concepts and accept any contiguous slice via `std::span<const T>`.',
      language: 'cpp',
      accessTier: 'free',
      durationMinutes: 22,
      sortOrder: 4,
      status: 'draft',
      workflowStatus: 'draft',
      objectives: [
        'Replace raw `(const T* ptr, size_t len)` pairs with bounds-aware `std::span<const T>`.',
        'Constrain function templates cleanly using `requires` / `<concepts>` so errors pinpoint caller mismatches immediately.',
      ],
      prerequisites: ['Lesson 3'],
      detailedExplanation:
        'Before C++20, writing a generic function over arrays or vectors forced callers to pass raw `(data, length)` pointers—inviting buffer overruns—while template errors spat pages of cryptic diagnostics. `std::span<const T>` provides a lightweight non-owning view wrapping both `std::vector`, `std::array`, and C arrays cleanly, while C++20 **Concepts** (`std::integral`, `std::floating_point`) constrain template parameters declaratively.',
      conceptsAndTerminology: [
        { term: 'std::span<const T>', definition: 'Two-word non-owning view `{pointer, size}` over contiguous elements.' },
        { term: 'Concept', definition: 'Compile-time predicate constraining what operations a template type `T` must support.' },
      ],
      stepByStepTeaching: [
        'Include `<concepts>` and `<span>` (`-std=c++20`).',
        'Accept `std::span<const T>` by value for read-only numeric slices.',
      ],
      syntaxAndUsage: [
        '`template <std::integral T> T sumSlice(std::span<const T> items)`',
      ],
      practicalExampleNarrative:
        'A concept-constrained `meanOf` utility accepting `std::span<const T>`.',
      codeExamples: [
        {
          title: 'C++20 Concept + std::span Average Utility',
          description: 'Works uniformly across `std::vector` and `std::array` without copying.',
          language: 'cpp',
          code: `#include <array>\n#include <concepts>\n#include <iostream>\n#include <span>\n#include <vector>\n\ntemplate <typename T>\nrequires std::integral<T> || std::floating_point<T>\ndouble computeMean(std::span<const T> values) {\n    if (values.empty()) return 0.0;\n    double total = 0.0;\n    for (T v : values) total += static_cast<double>(v);\n    return total / static_cast<double>(values.size());\n}\n\nint main() {\n    std::vector<int> vec{80, 90, 100};\n    std::array<double, 2> arr{85.5, 94.5};\n    std::cout << computeMean<int>(vec) << " | " << computeMean<double>(arr) << "\\n";\n    return 0;\n}`,
          expectedOutput: `90 | 90`,
          explanation: 'Passing `std::string` triggers an immediate clear concept constraint failure instead of unreadable template tracebacks.',
        },
      ],
      commonMistakes: [
        'Accepting raw `(const int* arr, int len)` pointers without bounds packaging.',
      ],
      bestPractices: [
        'Constrain public template headers with C++20 `<concepts>` for crisp diagnostics.',
      ],
      practicalActivity:
        'Write a `maxElement` template constrained by `std::totally_ordered<T>` taking `std::span<const T>`.',
      starterCode: `#include <concepts>\n#include <span>`,
      solutionHint: 'Return `std::optional<T>` when `span.empty()` is true.',
      knowledgeChecks: [
        'What advantage does `std::span<const T>` offer over passing `const std::vector<T>&`?',
      ],
      summaryPoints: [
        '`std::span` and C++20 Concepts make generic C++ expressive and safe.',
      ],
      furtherResources: ['cppreference.com — std::span & C++20 Concepts'],
    },
    {
      id: 'les_cpp_5',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_4',
      title: 'RAII File Streams (`std::ifstream` / `std::ofstream`) & Error Safety',
      slug: 'cpp-raii-file-streams-exceptions',
      topicName: 'File Streams & Error Handling',
      summary: 'Persist structured records safely using `std::ifstream` / `std::ofstream` RAII guards, explicit `std::optional` / error checks, and `std::getline` parsing.',
      language: 'cpp',
      accessTier: 'premium',
      durationMinutes: 22,
      sortOrder: 5,
      status: 'draft',
      workflowStatus: 'draft',
      objectives: [
        'Explain why RAII file streams eliminate leaked file handles even on early return.',
        'Read line-delimited records safely with `std::getline` instead of fragile `while (!file.eof())`.',
      ],
      prerequisites: ['Lesson 4'],
      detailedExplanation:
        'Because `std::ifstream` and `std::ofstream` close underlying OS file descriptors inside their destructors, file management in C++ requires zero manual `fclose()` calls. Always test `while (std::getline(in, line))` directly in the loop condition—never `while (!in.eof())`, which reads one extra duplicate empty line after EOF!',
      conceptsAndTerminology: [
        { term: 'Stream Extraction Idiom', definition: 'Checking stream truthiness (`if (!out)` / `while (std::getline(...))`) after read/write operations.' },
      ],
      stepByStepTeaching: [
        'Construct `std::ifstream file(path); if (!file.is_open()) { ... }`.',
        'Parse lines using `while (std::getline(file, line))`.',
      ],
      syntaxAndUsage: [
        'Avoid `std::endl` inside tight file write loops because it forces expensive OS buffer flushes on every line; use `\\n`.',
      ],
      practicalExampleNarrative:
        'Safe stream parsing using `std::istringstream` and `std::getline`.',
      codeExamples: [
        {
          title: 'Safe Stream Parsing Without EOF Loop Pitfall',
          description: 'Parses structured ledger lines safely via `std::istringstream`.',
          language: 'cpp',
          code: `#include <iostream>\n#include <sstream>\n#include <string>\n\nint main() {\n    std::istringstream input("Ada,96\\nAlan,91\\n");\n    std::string line;\n    while (std::getline(input, line)) {\n        if (line.empty()) continue;\n        auto comma = line.find(',');\n        if (comma == std::string::npos) continue;\n        std::cout << line.substr(0, comma) << " -> " << line.substr(comma + 1) << "\\n";\n    }\n    return 0;\n}`,
          expectedOutput: `Ada -> 96\nAlan -> 91`,
          explanation: 'Checking `std::getline` directly in the `while` header terminates cleanly at EOF with zero phantom duplicate reads.',
        },
      ],
      commonMistakes: [
        'Writing `while (!file.eof())`—the #1 classic C++ stream bug causing duplicate trailing iteration.',
        'Flushing streams every line with `std::endl` inside large outputs.',
      ],
      bestPractices: [
        'Use `\\n` instead of `std::endl` for normal line breaks and test stream state immediately after reads.',
      ],
      practicalActivity:
        'Parse comma-delimited ledger entries using `std::getline` and `std::stoi` wrapped in `try/catch (const std::exception&)`.',
      starterCode: `#include <sstream>\n#include <string>`,
      solutionHint: 'Guard `std::stoi` against malformed non-numeric text.',
      knowledgeChecks: [
        'Why is `while (!file.eof())` a bug in C++ file reading loops?',
      ],
      summaryPoints: [
        'RAII streams + `while (std::getline(...))` make C++ file I/O clean and leak-free.',
      ],
      furtherResources: ['cppreference.com — Input/Output Stream Library'],
    },
    {
      id: 'les_cpp_6',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_4',
      title: 'Console Data Management Architecture: Separating State, I/O & Tests',
      slug: 'cpp-console-data-manager-architecture',
      topicName: 'C++ Console App Architecture',
      summary: 'Design a clean multi-component C++20 console ledger separating `LedgerStore` business logic from `std::cin` menu prompts for unit testability.',
      language: 'cpp',
      accessTier: 'free',
      durationMinutes: 20,
      sortOrder: 6,
      status: 'draft',
      workflowStatus: 'draft',
      objectives: [
        'Separate pure domain containers (`LedgerStore`) from terminal `std::cin` / `std::cout` I/O.',
        'Recover cleanly from malformed numeric `std::cin` inputs (`cin.clear()` + `cin.ignore(...)`).',
      ],
      prerequisites: ['Lesson 5'],
      detailedExplanation:
        'If a user types `"abc"` when `std::cin >> choice;` expects an integer, `std::cin` enters a `fail` state and loops infinitely unless reset! Always clear stream flags (`std::cin.clear()`) and discard the bad line (`std::cin.ignore(std::numeric_limits<std::streamsize>::max(), \'\\n\')`). Keeping business classes (`LedgerStore`) decoupled from `std::cin` also lets `assert()` unit tests exercise inserts, updates, and averages directly.',
      conceptsAndTerminology: [
        { term: 'Stream Error Recovery', definition: 'Resetting `cin.clear()` and discarding bad buffer tokens after failed formatted input.' },
      ],
      stepByStepTeaching: [
        'Encapsulate records inside a `LedgerStore` class exposing `add`, `find`, and `summary`.',
        'Verify `LedgerStore` operations with `cassert` checks before wiring the interactive CLI loop.',
      ],
      syntaxAndUsage: [
        'Use `std::optional<Record>` return types for `findById` instead of returning nullable raw pointers.',
      ],
      practicalExampleNarrative:
        'A decoupled `LedgerStore` class tested directly with `<cassert>`.',
      codeExamples: [
        {
          title: 'Testable C++ LedgerStore Returning std::optional',
          description: 'Avoids raw nullable pointers while validating duplicate IDs.',
          language: 'cpp',
          code: `#include <cassert>\n#include <iostream>\n#include <optional>\n#include <string>\n#include <unordered_map>\n\nstruct Record { std::string id; std::string name; int score; };\n\nclass LedgerStore {\n    std::unordered_map<std::string, Record> rows_;\npublic:\n    bool add(Record r) { return rows_.emplace(r.id, std::move(r)).second; }\n    std::optional<Record> find(const std::string& id) const {\n        auto it = rows_.find(id);\n        return it == rows_.end() ? std::nullopt : std::optional<Record>{it->second};\n    }\n};\n\nint main() {\n    LedgerStore store;\n    assert(store.add({"101", "Ada", 98}));\n    assert(!store.add({"101", "Duplicate", 50}));\n    assert(store.find("101")->score == 98);\n    std::cout << "LedgerStore tests passed\\n";\n}`,
          expectedOutput: `LedgerStore tests passed`,
          explanation: '`emplace().second` rejects duplicate IDs atomically in one hash lookup, and `std::optional` makes missing records explicit.',
        },
      ],
      commonMistakes: [
        'Returning raw `Record*` pointers into `unordered_map` values that could dangle if mutated.',
      ],
      bestPractices: [
        'Compile with `-Wall -Wextra -Werror` during development and test core classes independent of CLI menus.',
      ],
      practicalActivity:
        'Extend `LedgerStore` with a `remove(const std::string& id)` boolean method and add `assert` unit checks.',
      starterCode: `bool remove(const std::string& id) { return rows_.erase(id) > 0; }`,
      solutionHint: '`unordered_map::erase(key)` returns number of erased elements (`0` or `1`).',
      knowledgeChecks: [
        'Why should `std::cin.clear()` + `std::cin.ignore(...)` be called after failed numeric terminal extraction?',
      ],
      summaryPoints: [
        'Decoupled `LedgerStore` classes + `std::optional` make console C++ apps testable and bug-resistant.',
      ],
      furtherResources: ['C++ Core Guidelines — Resource Management & Error Handling'],
    },
  ],

  exercises: [
    // Node.js Exercises
    {
      id: 'ex_node_mc_1',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_2',
      lessonId: 'les_node_2',
      technologyId: 'tech_node',
      title: 'HTTP Status Code for Missing Role Permission',
      exerciseType: 'multiple_choice',
      difficulty: 'Beginner',
      prompt: 'An authenticated learner tries to call `POST /api/admin/curriculum/coverage`. Which HTTP status code should the server return?',
      starterCode: '',
      options: ['403 Forbidden', '401 Unauthorized', '404 Not Found', '200 OK'],
      correctAnswer: '403 Forbidden',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'The user IS authenticated (so not `401`), but lacks the admin/instructor role required (`403 Forbidden`).',
      hintText: 'Distinguish unauthenticated (`401`) from authenticated-but-unauthorized (`403`).',
      xpReward: 25,
      sortOrder: 1,
    },
    {
      id: 'ex_node_err_2',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_3',
      lessonId: 'les_node_3',
      technologyId: 'tech_node',
      title: 'Fix Event Loop Blocking Filesystem Call',
      exerciseType: 'find_error',
      difficulty: 'Intermediate',
      prompt: 'A Node.js export route stalls all concurrent API requests while reading large logs via `fs.readFileSync(logPath)`. What is the clean fix?',
      starterCode: 'import { readFile } from "node:fs/promises";\n// Or createReadStream + pipeline()',
      options: [
        'Replace `readFileSync` with async `fs/promises` (`readFile`) or `createReadStream` + `pipeline()`',
        'Increase Express port number to 8080',
        'Wrap `readFileSync` inside `Promise.resolve()`',
        'Convert JSON to XML first',
      ],
      correctAnswer: 'Replace `readFileSync` with async `fs/promises` (`readFile`) or `createReadStream` + `pipeline()`',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'Wrapping `readFileSync` in `Promise.resolve()` STILL executes synchronously on the main thread; true async `fs/promises` or streams yield to the event loop.',
      hintText: 'Avoid synchronous I/O inside request handlers.',
      xpReward: 30,
      sortOrder: 2,
    },
    {
      id: 'ex_node_write_3',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_4',
      lessonId: 'les_node_4',
      technologyId: 'tech_node',
      title: 'Write Atomic SQLite Transaction Guard',
      exerciseType: 'write_code',
      difficulty: 'Intermediate',
      prompt: 'Complete the SQLite transaction pattern calling `BEGIN`, `COMMIT`, and `ROLLBACK` inside `try/catch`.',
      starterCode: 'try {\n  db.exec("BEGIN");\n  // perform writes\n  db.exec("COMMIT");\n} catch (err) {\n  db.exec("ROLLBACK");\n  throw err;\n}',
      options: [],
      correctAnswer: 'db.exec("BEGIN"); db.exec("COMMIT"); db.exec("ROLLBACK");',
      validationRule: { mode: 'contains_tokens', tokens: ['BEGIN', 'COMMIT', 'ROLLBACK'] },
      explanation: 'Pairing `BEGIN` and `COMMIT` with `ROLLBACK` in `catch` leaves the database consistent if any statement throws.',
      hintText: 'Include `BEGIN`, `COMMIT`, and `ROLLBACK`.',
      xpReward: 35,
      sortOrder: 3,
    },

    // SQL Exercises
    {
      id: 'ex_sql_tf_2',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_4',
      lessonId: 'les_sql_4',
      technologyId: 'tech_sql',
      title: 'Leftmost Prefix Composite Index Check',
      exerciseType: 'true_false',
      difficulty: 'Intermediate',
      prompt: 'True or False: Creating `CREATE INDEX idx_enroll ON enrollments(user_id, course_id)` accelerates a lookup filtering strictly by `WHERE course_id = ?` without `user_id`.',
      starterCode: '',
      options: ['True', 'False'],
      correctAnswer: 'False',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'By the leftmost prefix rule, `(user_id, course_id)` helps `(user_id)` or `(user_id, course_id)` filters, NOT standalone `course_id`.',
      hintText: 'Think about how B-tree dictionaries sort first by the leftmost column (`user_id`).',
      xpReward: 25,
      sortOrder: 2,
    },
    {
      id: 'ex_sql_comp_3',
      courseId: 'crs_sql',
      moduleId: 'mod_sql_3',
      lessonId: 'les_sql_3',
      technologyId: 'tech_sql',
      title: 'Complete Window Partition Ranking Query',
      exerciseType: 'code_completion',
      difficulty: 'Intermediate',
      prompt: 'Complete the window clause to rank courses independently within each `category_id`:\n`DENSE_RANK() OVER (______ BY category_id ORDER BY students DESC)`',
      starterCode: 'SELECT title, DENSE_RANK() OVER (______ BY category_id ORDER BY students DESC) FROM stats;',
      options: ['PARTITION', 'GROUP', 'SPLIT', 'WHERE'],
      correctAnswer: 'PARTITION',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`PARTITION BY` splits rows into logical buckets for window computation without collapsing rows like `GROUP BY`.',
      hintText: 'Keyword paired with `BY` inside `OVER (...)`.',
      xpReward: 30,
      sortOrder: 3,
    },

    // Java Exercises
    {
      id: 'ex_java_mc_1',
      courseId: 'crs_java',
      moduleId: 'mod_java_3',
      lessonId: 'les_java_3',
      technologyId: 'tech_java',
      title: 'Safe Collection Removal During Iteration',
      exerciseType: 'multiple_choice',
      difficulty: 'Intermediate',
      prompt: 'Removing matching entries from an `ArrayList<String>` inside a standard `for (String s : list)` loop throws `ConcurrentModificationException`. Which method removes safely?',
      starterCode: '',
      options: [
        'list.removeIf(s -> s.isBlank())',
        'list.remove(s) inside for-each',
        'Set list = null mid-loop',
        'Call System.gc()',
      ],
      correctAnswer: 'list.removeIf(s -> s.isBlank())',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`Collection.removeIf()` (or explicit `Iterator.remove()`) updates internal modCount safely during traversal.',
      hintText: 'Java 8 Collection helper accepting a `Predicate`.',
      xpReward: 25,
      sortOrder: 1,
    },
    {
      id: 'ex_java_comp_2',
      courseId: 'crs_java',
      moduleId: 'mod_java_4',
      lessonId: 'les_java_4',
      technologyId: 'tech_java',
      title: 'Automatic Resource Closure Block',
      exerciseType: 'code_completion',
      difficulty: 'Beginner',
      prompt: 'Which Java interface enables a stream or reader class to auto-close inside `try (var r = ...)`?',
      starterCode: 'public class SafeHandle implements ______ { @Override public void close() {} }',
      options: ['AutoCloseable', 'Serializable', 'Comparable', 'Cloneable'],
      correctAnswer: 'AutoCloseable',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`try-with-resources` accepts any object implementing `java.lang.AutoCloseable` (including `Closeable` I/O streams).',
      hintText: 'Interface exposing a single `close()` method.',
      xpReward: 25,
      sortOrder: 2,
    },

    // C++ Exercises (inside crs_cpp_draft)
    {
      id: 'ex_cpp_err_2',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_4',
      lessonId: 'les_cpp_5',
      technologyId: 'tech_cpp',
      title: 'Fix Classic `while (!file.eof())` Stream Loop',
      exerciseType: 'find_error',
      difficulty: 'Intermediate',
      prompt: 'A C++ file reader written as `while (!in.eof()) { std::getline(in, line); process(line); }` repeats the last line or runs an extra empty cycle. How do you fix it?',
      starterCode: 'while (std::getline(in, line)) {\n  process(line);\n}',
      options: [
        'Check `while (std::getline(in, line))` directly in the loop condition instead of `!in.eof()`',
        'Add `std::endl` after every line',
        'Open the file in binary mode',
        'Replace `std::string` with `char*`',
      ],
      correctAnswer: 'Check `while (std::getline(in, line))` directly in the loop condition instead of `!in.eof()`',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: 'EOF flag is only set *after* a read attempts to read past the end; testing `std::getline` directly prevents trailing phantom iterations.',
      hintText: 'Evaluate the stream read result itself as the loop condition.',
      xpReward: 30,
      sortOrder: 2,
    },
    {
      id: 'ex_cpp_mc_3',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_2',
      lessonId: 'les_cpp_3',
      technologyId: 'tech_cpp',
      title: 'Non-Mutating Hash Map Lookup in C++20',
      exerciseType: 'multiple_choice',
      difficulty: 'Beginner',
      prompt: 'Inside a `const` method querying `std::unordered_map<std::string, int>`, why does `scores["Ada"]` fail to compile?',
      starterCode: '',
      options: [
        '`operator[]` inserts a default `0` entry if `"Ada"` is missing, so it cannot be called on a `const` map—use `.find()` or `.contains()`',
        '`unordered_map` does not support string keys',
        'C++ requires integer keys only',
        'Missing header `#include <vector>`',
      ],
      correctAnswer: '`operator[]` inserts a default `0` entry if `"Ada"` is missing, so it cannot be called on a `const` map—use `.find()` or `.contains()`',
      validationRule: { mode: 'exact_case_insensitive' },
      explanation: '`operator[]` is non-const because missing keys mutate the container by default-inserting a value.',
      hintText: 'Think about what `map[missing_key]` does in C++.',
      xpReward: 25,
      sortOrder: 3,
    },
  ],

  assessments: [
    {
      id: 'asm_nodejs_quiz',
      courseId: 'crs_nodejs',
      lessonId: 'les_node_2',
      title: 'Node.js Middleware, Async Streams & SQLite API Assessment',
      xpReward: 120,
      questions: [
        {
          id: 'nd_q1',
          kind: 'multiple_choice',
          prompt: 'How many arguments must an Express error-handling middleware function declare so Express routes `next(err)` to it?',
          options: ['4: (err, req, res, next)', '2: (err, res)', '3: (req, res, next)', '1: (err)'],
          correctAnswer: '4: (err, req, res, next)',
          explanation: 'Express identifies error middleware explicitly via `fn.length === 4`.',
        },
        {
          id: 'nd_q2',
          kind: 'true_false',
          prompt: 'True or False: Wrapping `fs.readFileSync()` inside an `async` Express handler makes disk reading non-blocking for other users.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Sync filesystem APIs still block the single JS event loop thread regardless of `async` keywords.',
        },
        {
          id: 'nd_q3',
          kind: 'multiple_choice',
          prompt: 'Which HTTP status code appropriately signals a duplicate unique slug/email conflict on `POST` creation?',
          options: ['409 Conflict', '200 OK', '401 Unauthorized', '502 Bad Gateway'],
          correctAnswer: '409 Conflict',
          explanation: '`409 Conflict` accurately describes uniqueness constraint collisions cleanly.',
        },
      ],
    },
    {
      id: 'asm_sql_adv_quiz',
      courseId: 'crs_sql',
      lessonId: 'les_sql_3',
      title: 'SQL Normalization, Window Functions & Query Plans Assessment',
      xpReward: 120,
      questions: [
        {
          id: 'sql_a1',
          kind: 'multiple_choice',
          prompt: 'Which SQL feature computes per-category ranks while keeping every individual course row in the result set?',
          options: ['Window function (`DENSE_RANK() OVER (PARTITION BY ...)`)', 'Plain `GROUP BY`', 'TRUNCATE TABLE', 'CROSS JOIN'],
          correctAnswer: 'Window function (`DENSE_RANK() OVER (PARTITION BY ...)`)',
          explanation: 'Window functions compute aggregates across partitions without collapsing individual rows.',
        },
        {
          id: 'sql_a2',
          kind: 'true_false',
          prompt: 'True or False: Joining two independent child tables (`lessons` AND `exercises`) in one query with `COUNT(l.id)` accurately counts distinct lessons without `DISTINCT` or subqueries.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Joining two 1-to-many tables multiplies row counts (`L * E`); always use `COUNT(DISTINCT id)` or separate scalar subqueries.',
        },
      ],
    },
    {
      id: 'asm_java_quiz',
      courseId: 'crs_java',
      lessonId: 'les_java_2',
      title: 'Java OOP, Collections & Exception Safety Assessment',
      xpReward: 120,
      questions: [
        {
          id: 'jv_q1',
          kind: 'multiple_choice',
          prompt: 'Which Java collection provides O(1) average-time lookup by unique key without preserving insertion order guarantees?',
          options: ['HashMap<K, V>', 'ArrayList<E>', 'LinkedList<E>', 'PriorityQueue<E>'],
          correctAnswer: 'HashMap<K, V>',
          explanation: '`HashMap` hashes keys for O(1) amortized retrieval.',
        },
        {
          id: 'jv_q2',
          kind: 'true_false',
          prompt: 'True or False: Streams opened in `try (BufferedReader br = Files.newBufferedReader(path))` require an explicit `finally { br.close(); }` block.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: '`try-with-resources` guarantees automatic `.close()` invocation on `AutoCloseable` declarations.',
        },
        {
          id: 'jv_q3',
          kind: 'multiple_choice',
          prompt: 'Which Java construct generates immutable value classes with automatic `equals`, `hashCode`, `toString`, and accessors?',
          options: ['record', 'abstract void', 'volatile', 'transient'],
          correctAnswer: 'record',
          explanation: 'Java `record`s model immutable transparent data carriers cleanly.',
        },
      ],
    },
  ],

  assignments: [
    {
      id: 'asn_nodejs_api_endpoints',
      courseId: 'crs_nodejs',
      moduleId: 'mod_node_4',
      technologyId: 'tech_node',
      title: 'Validated Express + SQLite Tasks Endpoint & node:test Integration Check',
      description: 'Build a role-guarded CRUD endpoint with parameterized SQLite queries, 409 uniqueness check, and an ephemeral `node:test` verification script.',
      instructionsMarkdown:
        '### Assignment Brief\n\nImplement `POST /api/projects` and `GET /api/projects` using parameterized `node:sqlite` statements, return `400` on missing fields, `409` on duplicate slug, and verify via `app.listen(0)`.',
      requirements: [
        'Use `node:sqlite` parameterized `?` statements exclusively.',
        'Include an explicit 4-arg Express error boundary.',
        'Verify creation, duplicate `409`, and listing in `node:test`.',
      ],
      starterFiles: {
        'routes.ts': 'export function registerTaskRoutes(app, db) {\n  // Implement POST & GET with prepared statements\n}\n',
      },
      rubric: ['Trust Boundary & Validation (35%)', 'SQLite Safety & Transactions (35%)', 'Real HTTP Integration Test (30%)'],
      difficulty: 'Intermediate',
      xpReward: 160,
    },
    {
      id: 'asn_java_oop_service',
      courseId: 'crs_java',
      moduleId: 'mod_java_4',
      technologyId: 'tech_java',
      title: 'Decoupled Java Student Course Registry Service',
      description: 'Implement immutable domain `record`s, a `CourseRepository` interface, a validated service layer, and `try-with-resources` CSV export.',
      instructionsMarkdown:
        '### Assignment Brief\n\nBuild `CourseRecord`, `CourseRepository`, and `CourseRegistryService` separating storage from business validation, plus NIO UTF-8 export.',
      requirements: [
        'Protect invariants in constructor (`IllegalArgumentException` on empty ID/title).',
        'Inject repository interface via constructor.',
        'Use `Files.newBufferedWriter` inside `try-with-resources`.',
      ],
      starterFiles: {
        'CourseRegistry.java': 'public record CourseRecord(String id, String title, int hours) {}\n',
      },
      rubric: ['OOP Encapsulation & Contracts (40%)', 'Collections & Streams Usage (30%)', 'Exception & NIO Safety (30%)'],
      difficulty: 'Intermediate to Advanced',
      xpReward: 160,
    },
    {
      id: 'asn_cpp_ledger_refactor',
      courseId: 'crs_cpp_draft',
      moduleId: 'mod_cpp_4',
      technologyId: 'tech_cpp',
      title: 'RAII & std::span Ledger Persistence Module',
      description: 'Refactor raw pointer loops into `std::vector`, `std::span<const Record>`, and `std::ifstream` RAII stream parsing.',
      instructionsMarkdown:
        '### Assignment Brief\n\nImplement a C++20 data manager reading/writing CSV rows via RAII streams without `while (!in.eof())` bugs or raw `new`/`delete`.',
      requirements: [
        'Zero raw `new`/`delete` calls.',
        'Use `while (std::getline(...))` cleanly.',
        'Include `cassert` boundary checks.',
      ],
      starterFiles: {
        'ledger.hpp': '#pragma once\n#include <span>\n#include <string>\n#include <vector>\n',
      },
      rubric: ['RAII & Zero Leaks (40%)', 'STL & C++20 Usage (30%)', 'Stream Parsing Safety (30%)'],
      difficulty: 'Intermediate',
      xpReward: 150,
    },
  ],

  projects: [
    {
      id: 'ptpl_nodejs_rest_api',
      technologyId: 'tech_node',
      learningPathId: 'path_backend',
      courseId: 'crs_nodejs',
      title: 'Node.js: Validated Task & Learning API Service (REST + SQLite)',
      slug: 'nodejs-validated-rest-api-service',
      category: 'Backend Project',
      difficulty: 'Intermediate to Advanced',
      estimatedHours: 10,
      summary:
        'Build a production-structured Express + SQLite REST API featuring RBAC middleware, parameterized SQL transactions, bounded JSON payloads, centralized 4-arg error handling, and `node:test` integration checks.',
      requirements: [
        'Milestone 1: Express app with `express.json({ limit: "1mb" })`, `requireAuth`/`requireRole` guards, and 4-arg error handler.',
        'Milestone 2: SQLite schema with foreign keys + unique slugs + transactional `POST`/`PATCH`/`DELETE` handlers returning 400/404/409 appropriately.',
        'Milestone 3: Paginated `GET` endpoint + CSV export via safe stream/async I/O + ephemeral-port `node:test` suite.',
        'Acceptance Criteria: Zero SQL string concatenation; all RBAC 401/403 assertions pass cleanly.',
        'Submission & Rubric: Submit server source + passing test output; graded on Security/RBAC Boundaries (35%), SQLite Atomicity (35%), Automated API Tests (30%).',
      ],
      starterFiles: {
        'README.md':
          '# Project: Node.js REST API\n\n## Milestones\n1. Build auth & role guards + error boundary.\n2. Wire parameterized SQLite CRUD + 409 duplicate protection.\n3. Verify endpoints end-to-end on `listen(0)` with `node:test`.',
        'server.mjs':
          'import express from "express";\nconst app = express();\napp.use(express.json({ limit: "1mb" }));\napp.get("/api/health", (_req, res) => res.json({ status: "ok" }));\nexport default app;\n',
      },
      deliverables: ['Express REST API module', '`node:test` integration test suite', 'API contract summary'],
    },
    {
      id: 'ptpl_java_oop_app',
      technologyId: 'tech_java',
      learningPathId: 'path_core_swe',
      courseId: 'crs_java',
      title: 'Java: Object-Oriented Course & Student Management Application',
      slug: 'java-oop-management-application',
      category: 'Java Project',
      difficulty: 'Intermediate to Advanced',
      estimatedHours: 12,
      summary:
        'Architect a clean multi-class Java management system using immutable `record`s, `Repository` interfaces, Streams analytics, `try-with-resources` file storage, and constructor dependency injection.',
      requirements: [
        'Milestone 1: Domain model (`Student`, `Course`, `Enrollment`) with constructor invariant validation and `Gradable` interface.',
        'Milestone 2: `Repository` interface + `InMemory` & `NioFileRepository` implementations using `try-with-resources` UTF-8 streams.',
        'Milestone 3: `ManagementService` supporting enrollment deduplication, Streams honor-roll filtering, and exception-tested unit assertions.',
        'Acceptance Criteria: Zero public mutable collection leaks; compiles cleanly on Java 17+ with full invariant tests.',
        'Submission & Rubric: Submit `.java` sources + test results; graded on OOP Design & Encapsulation (35%), Streams & Collections (35%), NIO/Exception Safety (30%).',
      ],
      starterFiles: {
        'README.md':
          '# Project: Java OOP Management Application\n\n## Milestones\n1. Encapsulated domain entities & Gradable contracts.\n2. Repository interface + NIO UTF-8 storage.\n3. Service layer + Streams reports + boundary unit tests.',
        'Main.java':
          'import java.util.*;\npublic class Main {\n  public record Student(String id, String name, int score) {}\n  public static void main(String[] args) {\n    System.out.println("Java OOP Management System initialized");\n  }\n}\n',
      },
      deliverables: ['Domain, Repository & Service `.java` classes', 'Passing unit validation suite'],
    },
  ],
};
