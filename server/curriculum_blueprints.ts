import type { DatabaseSync } from 'node:sqlite';
import { TECHNOLOGIES_CATALOG, type TechCatalogSeed } from './technology_catalog_data.ts';

export interface BlueprintModuleSpec {
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  topics: string[];
}

export interface BlueprintDefinition {
  title: string;
  targetLevel: string;
  summary: string;
  modules: BlueprintModuleSpec[];
}

const PRIORITY_BLUEPRINTS: Record<string, BlueprintDefinition> = {
  html: {
    title: 'HTML5 Semantic Web & Accessibility Blueprint',
    targetLevel: 'Beginner to Intermediate',
    summary: 'Complete standards-based HTML5 progression from document structure and forms to ARIA landmarks and SEO metadata.',
    modules: [
      {
        title: 'Module 1: Document Architecture & Text Semantics',
        level: 'Beginner',
        summary: 'Core HTML5 document anatomy, semantic headings, text formatting, and link navigation.',
        topics: [
          'HTML Introduction, DOCTYPE & Document Tree',
          'Elements, Attributes & Global HTML Attributes',
          'Headings Hierarchy, Paragraphs & Formatting',
          'Hyperlinks, Anchor Targets & Relative URLs',
          'Lists, Descriptions & Navigation Menus',
        ],
      },
      {
        title: 'Module 2: Media, Tables & Semantic Landmarks',
        level: 'Beginner',
        summary: 'Accessible images, responsive media, structured data tables, and HTML5 page landmarks.',
        topics: [
          'Images, Picture Element & Alt Text Best Practices',
          'HTML Tables, Captions & Scope Attributes',
          'Block vs Inline Elements & Structural Containers',
          'Semantic Landmarks: header, nav, main, article, footer',
          'Audio, Video & Embedded Iframes Safely',
        ],
      },
      {
        title: 'Module 3: Forms, Validation & Accessibility (A11y)',
        level: 'Intermediate',
        summary: 'Interactive user input controls, constraint validation, SVG/Canvas hooks, and SEO head tags.',
        topics: [
          'Forms, Labels, Fieldsets & Input Types',
          'Native HTML5 Validation & Error Messaging',
          'ARIA Roles, States & Keyboard Navigation',
          'Head Metadata, Open Graph & SEO Tags',
          'HTML5 Graphics: Inline SVG & Canvas Basics',
        ],
      },
    ],
  },
  css: {
    title: 'Modern CSS3 Layouts, Design Tokens & Responsive UI Blueprint',
    targetLevel: 'Beginner to Advanced',
    summary: 'Structured stylesheet curriculum spanning cascade specificity, Flexbox, CSS Grid, custom properties, and motion.',
    modules: [
      {
        title: 'Module 1: Cascade, Box Model & Typography',
        level: 'Beginner',
        summary: 'Selectors, specificity math, box sizing, colors, and clean typographic scale.',
        topics: [
          'CSS Selectors, Combinators & Specificity',
          'Colors, Gradients & Custom Properties (Variables)',
          'The Box Model: Margin, Padding, Border & Box-Sizing',
          'Typography, Web Fonts, Line-Height & Clamp()',
          'Display Modes, Positioning & Stacking Contexts (z-index)',
        ],
      },
      {
        title: 'Module 2: Modern Layout Engines — Flexbox & Grid',
        level: 'Intermediate',
        summary: 'One-dimensional alignment with Flexbox and two-dimensional page grids.',
        topics: [
          'Flexbox Container Axes, Wrapping & Gap',
          'Flex Item Sizing: flex-grow, flex-shrink, flex-basis',
          'CSS Grid Tracks, fr Units, minmax() & Auto-Fit',
          'Named Grid Areas & Responsive Page Shells',
          'Responsive Breakpoints, Media & Container Queries',
        ],
      },
      {
        title: 'Module 3: Interactive States, Motion & Architecture',
        level: 'Advanced',
        summary: 'Pseudo-elements, transitions, keyframe animations, dark themes, and maintainable CSS.',
        topics: [
          'Pseudo-Classes (:hover, :focus-visible, :has) & Pseudo-Elements',
          'CSS Transitions, Transforms & 3D Perspective',
          'Keyframe Animations & Reduced-Motion Accessibility',
          'Light/Dark Theme Tokens with prefers-color-scheme',
          'Scalable CSS Architecture & Cascade Layers (@layer)',
        ],
      },
    ],
  },
  javascript: {
    title: 'JavaScript ES2025 Engineering Blueprint',
    targetLevel: 'Beginner to Advanced',
    summary: 'Deep practical JavaScript path covering core syntax, closures, DOM orchestration, async concurrency, and testing.',
    modules: [
      {
        title: 'Module 1: Language Core & Control Flow',
        level: 'Beginner',
        summary: 'Variables, primitive/reference types, operators, loops, and functions.',
        topics: [
          'Variables (let, const), Scope & Primitive Types',
          'Operators, Truthiness & Type Coercion Rules',
          'Control Flow: Conditions, Loops & Iteration',
          'Functions, Arrow Functions & Default Parameters',
          'Arrays, Higher-Order Methods (map, filter, reduce)',
        ],
      },
      {
        title: 'Module 2: Objects, Browser DOM & Modules',
        level: 'Intermediate',
        summary: 'Object manipulation, closures, event delegation, storage, and ES modules.',
        topics: [
          'Objects, Destructuring, Spread & JSON Serialization',
          'DOM Querying, Manipulation & Event Delegation',
          'Lexical Scope, Closures & Pure Helper Functions',
          'Prototypes, Classes & Error Handling (try/catch)',
          'ES Modules (import/export) & Browser Storage APIs',
        ],
      },
      {
        title: 'Module 3: Asynchronous JS, Fetch & Modern Patterns',
        level: 'Advanced',
        summary: 'Event loop mechanics, Promises, async/await, Fetch APIs, and clean code patterns.',
        topics: [
          'Event Loop, Call Stack & Microtask Queue',
          'Promises, Chaining & Promise.all / allSettled',
          'Async / Await & AbortController Cancellations',
          'Fetch API, HTTP Status Checks & Form Submission',
          'Debouncing, Throttling & Defensive Testing Basics',
        ],
      },
    ],
  },
  python: {
    title: 'Python 3 Core to Production Systems Blueprint',
    targetLevel: 'Beginner to Advanced',
    summary: 'Comprehensive Python progression from indentation and built-in data structures to OOP, files, APIs, and testing.',
    modules: [
      {
        title: 'Module 1: Python Syntax, Flow & Built-in Types',
        level: 'Beginner',
        summary: 'Foundational Python syntax, numbers, strings, loops, and functions.',
        topics: [
          'Python Syntax, Indentation & Interpreter Setup',
          'Variables, Numbers, Strings & f-String Formatting',
          'Booleans, Operators & Conditional Branching',
          'For/While Loops, Ranges & Comprehensions',
          'Functions, Arguments (*args/**kwargs) & Type Hints',
        ],
      },
      {
        title: 'Module 2: Collections, Files & Error Resilience',
        level: 'Intermediate',
        summary: 'Lists, tuples, sets, dictionaries, file context managers, and exception handling.',
        topics: [
          'Lists, Tuples & Slicing Semantics',
          'Dictionaries, Sets & Hashing Performance',
          'Strings, Regular Expressions & Pathlib File I/O',
          'Modules, Packages & Virtual Environments (venv/pip)',
          'Exception Handling (try/except/finally) & Custom Errors',
        ],
      },
      {
        title: 'Module 3: Object-Oriented Python, APIs & Testing',
        level: 'Advanced',
        summary: 'Classes, dataclasses, decorators, HTTP JSON handling, and pytest testing.',
        topics: [
          'Classes, Objects, Inheritance & Dataclasses',
          'Iterators, Generators & Decorators',
          'Working with JSON, CSV & SQLite in Python',
          'Automated Unit Testing with pytest & unittest',
          'Building Clean CLI & Data Automation Scripts',
        ],
      },
    ],
  },
  react: {
    title: 'Modern React 19 Component & State Architecture Blueprint',
    targetLevel: 'Intermediate to Advanced',
    summary: 'Component-driven frontend architecture covering JSX, state, effects, custom hooks, forms, routing, and performance.',
    modules: [
      {
        title: 'Module 1: Components, Props & Rendering',
        level: 'Beginner',
        summary: 'JSX rules, component composition, props contracts, lists, and conditional UI.',
        topics: [
          'React Rendering Model, JSX & Component Trees',
          'Props, Children & Composable UI Primitives',
          'Conditional Rendering & Keys in List Reconciliation',
          'Handling User Events & Controlled Form Inputs',
        ],
      },
      {
        title: 'Module 2: State, Effects & Reusable Hooks',
        level: 'Intermediate',
        summary: 'useState, derived state, useReducer, useEffect hygiene, Context, and custom hooks.',
        topics: [
          'useState, Immutability & Avoiding Redundant State',
          'useEffect Lifecycle, Cleanup & Race Condition Guards',
          'Lifting State, Context API & useReducer Patterns',
          'Authoring Custom Hooks for Data & Storage',
          'Data Fetching, Loading/Error States & Optimistic UI',
        ],
      },
      {
        title: 'Module 3: Routing, Performance & Architecture',
        level: 'Advanced',
        summary: 'Memoization, code splitting, error boundaries, accessibility, and React testing.',
        topics: [
          'Client Routing, Deep Links & Protected Views',
          'Refs, Imperative Handles & Portal Modals',
          'Performance Tuning: useMemo, useCallback & Lazy Routes',
          'Error Boundaries & Testing Components with Vitest',
          'Building Accessible Production Dashboards',
        ],
      },
    ],
  },
  typescript: {
    title: 'TypeScript Type System & Full-Stack Contracts Blueprint',
    targetLevel: 'Intermediate to Advanced',
    summary: 'Master strict structural typing, unions, generics, utility types, and end-to-end API type safety.',
    modules: [
      {
        title: 'Module 1: TypeScript Compiler & Structural Types',
        level: 'Beginner',
        summary: 'tsconfig strictness, primitives, arrays, tuples, enums, and interfaces vs types.',
        topics: [
          'Why TypeScript: Structural Typing & tsconfig Strict Mode',
          'Primitives, Arrays, Tuples & Literal Types',
          'Interfaces vs Type Aliases & Readonly Contracts',
          'Function Signatures, Optional Params & Void/Never',
        ],
      },
      {
        title: 'Module 2: Narrowing, Unions & Generics',
        level: 'Intermediate',
        summary: 'Discriminated unions, custom type guards, generics, and built-in utility types.',
        topics: [
          'Union & Intersection Types in Practice',
          'Discriminated Unions & Exhaustiveness Checking',
          'Type Narrowing, typeof, in & Custom Type Predicates',
          'Generics: Functions, Interfaces & Constraints (extends)',
          'Utility Types: Pick, Omit, Partial, Record & ReturnType',
        ],
      },
      {
        title: 'Module 3: Advanced Type Patterns & Real Apps',
        level: 'Advanced',
        summary: 'Mapped/conditional types, typing Express & React, declaration files, and runtime validation.',
        topics: [
          'keyof, Indexed Access & Mapped Types',
          'Conditional Types & Template Literal Types',
          'Typing React Props, Hooks & Event Handlers',
          'Sharing API Contracts Between Express & Frontend',
          'Runtime Boundary Validation with Type Guards',
        ],
      },
    ],
  },
  nodejs: {
    title: 'Node.js Backend Runtime & API Engineering Blueprint',
    targetLevel: 'Intermediate to Advanced',
    summary: 'Server-side JavaScript runtime internals, file/stream APIs, Express routing, authentication, and resilience.',
    modules: [
      {
        title: 'Module 1: Runtime Internals, Modules & File I/O',
        level: 'Beginner',
        summary: 'Node architecture, ESM vs CommonJS, npm scripts, fs/path APIs, and Buffers.',
        topics: [
          'Node.js V8 Event Loop & Non-Blocking I/O',
          'ESM vs CommonJS Modules & Package Management',
          'Environment Variables, Process Lifecycle & CLI Args',
          'Path, File System (fs/promises) & Buffers',
        ],
      },
      {
        title: 'Module 2: Streams, HTTP Servers & Express APIs',
        level: 'Intermediate',
        summary: 'Node HTTP primitives, readable/writable streams, Express routing, and validation.',
        topics: [
          'EventEmitter & Backpressure with Node Streams',
          'Native HTTP Server vs Express Middleware Pipeline',
          'REST Routing, Input Sanitization & Status Codes',
          'Centralized Error Handling & Structured Logging',
          'Connecting SQLite / PostgreSQL Safely in Node.js',
        ],
      },
      {
        title: 'Module 3: Security, Real-Time & Production Ops',
        level: 'Advanced',
        summary: 'Authentication, rate limiting, WebSockets, testing, and graceful shutdowns.',
        topics: [
          'Sessions, JWTs, Password Scrypt & RBAC Middleware',
          'Rate Limiting, CORS, Helmet & Webhook HMAC Verification',
          'Real-Time Communication with WebSockets',
          'API Integration Testing with Node Test Runner',
          'Graceful Shutdowns, Health Checks & Memory Profiling',
        ],
      },
    ],
  },
  sql: {
    title: 'Relational SQL Querying, Modeling & Optimization Blueprint',
    targetLevel: 'Beginner to Advanced',
    summary: 'Relational database mastery covering SELECT queries, joins, aggregations, normalization, constraints, and indexes.',
    modules: [
      {
        title: 'Module 1: Querying, Filtering & Aggregations',
        level: 'Beginner',
        summary: 'SELECT, WHERE, sorting, pagination, aggregate functions, and grouping.',
        topics: [
          'Relational Model: Tables, Rows, Keys & Schemas',
          'SELECT, WHERE, LIKE, IN & Null Semantics',
          'ORDER BY, LIMIT/OFFSET Pagination & DISTINCT',
          'Aggregations: COUNT, SUM, AVG, GROUP BY & HAVING',
        ],
      },
      {
        title: 'Module 2: Multi-Table Joins, Subqueries & DML',
        level: 'Intermediate',
        summary: 'INNER/LEFT/RIGHT joins, CTEs, subqueries, and safe INSERT/UPDATE/DELETE.',
        topics: [
          'INNER JOIN, LEFT JOIN & Multi-Table Relationships',
          'Subqueries, EXISTS & Common Table Expressions (CTEs)',
          'Window Functions: ROW_NUMBER, RANK & Running Totals',
          'INSERT, UPDATE, DELETE & Upsert (ON CONFLICT)',
          'Normalization (1NF–3NF) & Foreign Key Constraints',
        ],
      },
      {
        title: 'Module 3: Transactions, Indexing & Security',
        level: 'Advanced',
        summary: 'ACID transactions, B-tree indexes, EXPLAIN plans, and SQL injection prevention.',
        topics: [
          'ACID Transactions, Locks & Rollback Recovery',
          'Single & Composite Indexes & Query Plan Analysis (EXPLAIN)',
          'Views, Triggers & Schema Migration Patterns',
          'Preventing SQL Injection with Parameterized Queries',
          'Designing Multi-Tenant Production Schemas',
        ],
      },
    ],
  },
  java: {
    title: 'Java Object-Oriented Engineering & JVM Systems Blueprint',
    targetLevel: 'Beginner to Advanced',
    summary: 'Complete Java track covering JVM setup, OOP, interfaces, generics, collections, streams, concurrency, and testing.',
    modules: [
      {
        title: 'Module 1: Java Syntax, Types & Control Flow',
        level: 'Beginner',
        summary: 'JDK compilation, primitive/reference types, arrays, methods, and strings.',
        topics: [
          'JDK, JVM Architecture & First Java Program',
          'Variables, Primitive Types & String Handling',
          'Conditionals, Switch Expressions & Loops',
          'Methods, Overloading & Arrays',
        ],
      },
      {
        title: 'Module 2: Object-Oriented Design & Collections',
        level: 'Intermediate',
        summary: 'Classes, encapsulation, inheritance, interfaces, records, exceptions, and collections.',
        topics: [
          'Classes, Constructors, Encapsulation & Records',
          'Inheritance, Abstract Classes & Interfaces',
          'Packages, Access Modifiers & Polymorphism',
          'Java Collections: List, Set, Map & Iterators',
          'Generics, Bounds & Checked vs Unchecked Exceptions',
        ],
      },
      {
        title: 'Module 3: Streams, Concurrency & Modern Java Services',
        level: 'Advanced',
        summary: 'Lambdas, Stream API, File NIO, threads/executors, JDBC/REST, and JUnit.',
        topics: [
          'Lambdas, Functional Interfaces & Stream Pipelines',
          'Optional, Date/Time API & File NIO.2',
          'Multithreading, Executors & Concurrent Collections',
          'Unit Testing with JUnit 5 & Maven/Gradle Builds',
          'Building Clean REST Services on the JVM',
        ],
      },
    ],
  },
  cpp: {
    title: 'C++ Systems Programming, STL & Modern Memory Safety Blueprint',
    targetLevel: 'Intermediate to Advanced',
    summary: 'Systems-grade C++20 curriculum spanning compilation, pointers, RAII, OOP, templates, and Standard Template Library.',
    modules: [
      {
        title: 'Module 1: Compilation, Types & References',
        level: 'Beginner',
        summary: 'Compiler toolchain, types, control flow, functions, references, and pointers.',
        topics: [
          'C++ Compilation Pipeline, Headers & Namespaces',
          'Fundamental Types, const/constexpr & Control Flow',
          'Functions, Pass-by-Value vs Reference & Overloading',
          'Raw Pointers, Arrays & Stack vs Heap Allocation',
        ],
      },
      {
        title: 'Module 2: OOP, RAII & Smart Memory Management',
        level: 'Intermediate',
        summary: 'Classes, constructors/destructors, RAII, smart pointers, and move semantics.',
        topics: [
          'Classes, Structs, Constructors & Destructors',
          'RAII Pattern & Deterministic Resource Cleanup',
          'Smart Pointers: unique_ptr, shared_ptr & weak_ptr',
          'Inheritance, Virtual Dispatch & Polymorphism',
          'Operator Overloading & Exception Safety Guarantees',
        ],
      },
      {
        title: 'Module 3: STL Containers, Templates & Concurrency',
        level: 'Advanced',
        summary: 'Standard containers, iterators, algorithms, generic templates, and std::thread.',
        topics: [
          'STL Sequence & Associative Containers (vector, map, unordered_map)',
          'Iterators, Lambdas & Standard Algorithms (<algorithm>)',
          'Templates, Concepts & Compile-Time Programming',
          'Move Semantics, Rvalue References & Rule of Five',
          'Multithreading with std::thread, mutex & Atomics',
        ],
      },
    ],
  },
};

const SPECIALTY_BLUEPRINTS: Record<string, BlueprintDefinition> = {
  angular: buildTechSpecificBlueprint('Angular', 'Intermediate', [
    'Angular CLI, Standalone Components & Signals',
    'Templates, Control Flow (@if/@for) & Data Binding',
    'Services, Dependency Injection & Hierarchical Providers',
    'RxJS Observables, Pipes & Reactive Streams',
    'Angular Router, Lazy Routes & Route Guards',
    'Reactive Forms, Validators & Custom Controls',
    'HttpClient, Interceptors & State Architecture',
    'Unit Testing Angular Components & Performance',
  ]),
  vuejs: buildTechSpecificBlueprint('Vue.js', 'Beginner to Intermediate', [
    'Vue 3 Reactivity & Single-File Components (SFC)',
    'Template Syntax, Directives & Event Modifiers',
    'Composition API: ref, reactive, computed & watch',
    'Props, Emits, Slots & Provide/Inject',
    'Vue Router Navigation & Dynamic Routes',
    'Pinia Centralized State Management',
    'Composables & Async API Integration',
    'Production Builds, Accessibility & Testing',
  ]),
  svelte: buildTechSpecificBlueprint('Svelte', 'Beginner to Intermediate', [
    'Svelte Compiler Philosophy & Component Anatomy',
    'Runes & Fine-Grained Reactive State ($state, $derived)',
    'Control Blocks, Event Handling & Bindings',
    'Component Composition, Snippets & Context',
    'Transitions, Motion & Custom Actions',
    'SvelteKit Routing, Loaders & Form Actions',
    'Server Endpoints & Progressive Enhancement',
    'Deployment & Testing Svelte Components',
  ]),
  nextjs: buildTechSpecificBlueprint('Next.js', 'Intermediate to Advanced', [
    'App Router Architecture, Layouts & Nested Routes',
    'Server Components vs Client Components Boundary',
    'Data Fetching, Caching & Revalidation Strategies',
    'Route Handlers, Server Actions & Form Validation',
    'Authentication Middleware & Session Security',
    'Metadata API, Dynamic Open Graph & SEO',
    'Image/Font Optimization & Streaming Suspense',
    'Production Deployment & Performance Profiling',
  ]),
  'tailwind-css': buildTechSpecificBlueprint('Tailwind CSS', 'Beginner to Intermediate', [
    'Utility-First Design Philosophy & CSS Tokens',
    'Spacing, Typography & Color Scale System',
    'Responsive Flexbox & Grid Utility Layouts',
    'Hover, Focus-Visible, Peer & Group Variants',
    'Dark Mode Tokens & Custom Theme Extensions',
    'Accessible Forms, Tables & Component Extraction',
    'Purging Unused CSS & Production Bundle Size',
    'Building Design Systems with Tailwind v4',
  ]),
  express: buildTechSpecificBlueprint('Express', 'Beginner to Intermediate', [
    'Express App Setup, HTTP Methods & Routing',
    'Middleware Pipeline, Execution Order & Custom Middleware',
    'Request Params, Query Parsing & JSON Validation',
    'Modular Express Routers & Controller Separation',
    'Error-Handling Middleware & Async Safety',
    'Authentication, Cookies, CORS & Rate Limiting',
    'Connecting SQLite / PostgreSQL & File Uploads',
    'Testing Express Endpoints with Supertest / Fetch',
  ]),
  django: buildTechSpecificBlueprint('Django', 'Intermediate', [
    'Django Project vs Apps & MVT Architecture',
    'URL Routing, Views & Template Inheritance',
    'Django Models, Migrations & Admin Customization',
    'ORM Queries, Relations & Aggregation',
    'Django Forms, Validation & CSRF Protection',
    'Authentication, Permissions & User Profiles',
    'Django REST Framework Serializers & ViewSets',
    'Testing, Settings Security & Deployment',
  ]),
  fastapi: buildTechSpecificBlueprint('FastAPI', 'Intermediate', [
    'FastAPI Async Routing & OpenAPI Docs Generation',
    'Path, Query & Request Body Validation with Pydantic',
    'Response Models, Status Codes & Error Handlers',
    'Dependency Injection System (Depends)',
    'Async SQLAlchemy / SQLite Persistence',
    'OAuth2, JWT Tokens & Role Authorization',
    'Background Tasks & WebSocket Endpoints',
    'Testing FastAPI Apps with TestClient & Pytest',
  ]),
  'spring-boot': buildTechSpecificBlueprint('Spring Boot', 'Intermediate to Advanced', [
    'Spring Boot Starters, Auto-Configuration & IoC Container',
    'REST Controllers, RequestMapping & Validation',
    'Dependency Injection & Service Layer Architecture',
    'Spring Data JPA, Entities & Repository Queries',
    'Exception Handling (@ControllerAdvice) & DTOs',
    'Spring Security, JWT Filters & Method Authorization',
    'Configuration Profiles, Actuator & Observability',
    'Integration Testing with MockMvc & Testcontainers',
  ]),
  postgresql: buildTechSpecificBlueprint('PostgreSQL', 'Intermediate to Advanced', [
    'PostgreSQL Architecture, psql CLI & Data Types',
    'Constraints, Serial/Identity & Schema Design',
    'Complex Joins, CTEs & Window Functions',
    'JSONB Storage, Indexing & Operators',
    'B-Tree, GIN & Partial Index Optimization',
    'MVCC Concurrency, Transactions & Isolation Levels',
    'EXPLAIN ANALYZE Query Tuning & Vacuuming',
    'Backups, Logical Replication & Row-Level Security',
  ]),
  mongodb: buildTechSpecificBlueprint('MongoDB', 'Beginner to Intermediate', [
    'Document Model, BSON Types & Collections',
    'CRUD Operations & Query Filter Operators',
    'Embedding vs Referencing Data Modeling',
    'Indexing Strategies & Compound Index Rules',
    'Aggregation Pipeline ($match, $group, $lookup)',
    'Schema Validation & Mongoose / Driver Patterns',
    'Transactions & Change Streams',
    'Atlas Security, Backups & Performance Tuning',
  ]),
  redis: buildTechSpecificBlueprint('Redis', 'Intermediate', [
    'In-Memory Data Model & Key Expiration (TTL)',
    'Strings, Hashes, Lists, Sets & Sorted Sets',
    'Cache-Aside Patterns & Cache Stampede Defense',
    'Distributed Rate Limiting & Session Stores',
    'Pub/Sub Messaging & Redis Streams',
    'Atomic Operations, Lua Scripts & Transactions',
    'Persistence: RDB Snapshots vs AOF Logs',
    'Eviction Policies & Cluster High Availability',
  ]),
  docker: buildTechSpecificBlueprint('Docker', 'Beginner to Intermediate', [
    'Containers vs Virtual Machines & Image Layers',
    'Writing Clean Dockerfiles & .dockerignore',
    'Multi-Stage Builds & Minimal Runtime Images',
    'Managing Container Networking & Port Mapping',
    'Persistent Volumes & Bind Mount Workflows',
    'Multi-Service Stacks with Docker Compose',
    'Non-Root Containers, Secrets & Security Scanning',
    'Debugging Logs, Healthchecks & Registry Push',
  ]),
  kubernetes: buildTechSpecificBlueprint('Kubernetes', 'Advanced', [
    'Control Plane, Worker Nodes & Cluster Architecture',
    'Pods, ReplicaSets & Declarative Deployments',
    'Services, ClusterIP, NodePort & Ingress Routing',
    'ConfigMaps, Secrets & Environment Injection',
    'PersistentVolumes, Claims & StatefulSets',
    'Liveness/Readiness Probes & Resource Quotas',
    'Rolling Updates, Horizontal Pod Autoscaling & RBAC',
    'Debugging Clusters & Packaging with Helm',
  ]),
  aws: buildTechSpecificBlueprint('AWS', 'Intermediate', [
    'AWS Global Infrastructure, Regions & Shared Responsibility',
    'IAM Users, Roles, Policies & Least-Privilege Access',
    'VPC Subnets, Route Tables & Security Groups',
    'EC2 Compute, Auto Scaling & Load Balancers',
    'S3 Object Storage, Versioning & Bucket Policies',
    'RDS Relational Databases & DynamoDB Essentials',
    'Serverless Compute with AWS Lambda & API Gateway',
    'CloudWatch Monitoring, Cost Alerts & Infrastructure IaC',
  ]),
  linux: buildTechSpecificBlueprint('Linux', 'Beginner to Intermediate', [
    'Linux Filesystem Hierarchy & Essential Shell Commands',
    'Users, Groups, File Permissions (chmod/chown) & Sudo',
    'Text Processing: grep, sed, awk, Pipes & Redirection',
    'Process Management (ps, top, kill) & Job Control',
    'Package Management, Networking Tools & SSH Keys',
    'Writing Reliable Bash Automation Scripts',
    'Systemd Services, Logs (journalctl) & Cron Jobs',
    'Disk Management, Firewalls (ufw) & Hardening',
  ]),
  git: buildTechSpecificBlueprint('Git', 'Beginner to Intermediate', [
    'Initializing Repositories, Staging Area & Commit Graph',
    'Inspecting History: git log, diff, status & blame',
    'Branching, Switching & Merging Strategies',
    'Resolving Merge Conflicts Cleanly',
    'Remote Workflows: fetch, pull, push & Pull Requests',
    'Interactive Rebase, Cherry-Pick & Stashing Work',
    'Undoing Mistakes Safely: restore, reset & reflog',
    'Git Hooks, Bisect Debugging & Team Conventions',
  ]),
  flutter: buildTechSpecificBlueprint('Flutter', 'Beginner to Intermediate', [
    'Dart Null Safety & Flutter Widget Tree Fundamentals',
    'Stateless vs Stateful Widgets & BuildContext',
    'Responsive Layouts: Row, Column, Flex & Stack',
    'Navigation, Routes & Passing Screen Arguments',
    'Forms, Validation & Theme Design Tokens',
    'State Management Patterns (Provider / Riverpod)',
    'Async Networking, JSON Parsing & Local Persistence',
    'Animations, Testing Widgets & Multi-Platform Builds',
  ]),
  'react-native': buildTechSpecificBlueprint('React Native', 'Intermediate', [
    'Native Bridge / Fabric Architecture & Core Components',
    'Flexbox Mobile Styling & Platform-Specific UI',
    'FlatList Performance & Scroll Interactions',
    'Stack & Tab Navigation Patterns',
    'Device Permissions, Storage & Network Requests',
    'Gesture Handling & Smooth Animations',
    'Debugging Native Errors & Profiling FPS',
    'Building & Distributing iOS/Android Releases',
  ]),
  swift: buildTechSpecificBlueprint('Swift', 'Intermediate', [
    'Swift Syntax, Optionals & Safe Unwrapping',
    'Value Types (Structs/Enums) vs Classes',
    'Protocols, Extensions & Protocol-Oriented Design',
    'Closures, Higher-Order Functions & Error Handling',
    'Generics & Associated Types',
    'Structured Concurrency: async/await & Actors',
    'Memory Management with ARC & Weak References',
    'Testing with XCTest / Swift Testing',
  ]),
  kotlin: buildTechSpecificBlueprint('Kotlin', 'Intermediate', [
    'Kotlin Null Safety, Val/Var & Smart Casts',
    'Functions, Lambdas & Scope Functions (let, apply)',
    'Data Classes, Sealed Hierarchies & Object Singletons',
    'Collections, Sequences & Extension Functions',
    'Generics & Variance (in/out)',
    'Coroutines, Dispatchers & Structured Concurrency',
    'Kotlin Flow & Reactive Data Streams',
    'Multiplatform & JVM Interoperability',
  ]),
  go: buildTechSpecificBlueprint('Go', 'Intermediate', [
    'Go Workspace, Packages & Static Types',
    'Slices, Maps, Structs & Pointers in Go',
    'Interfaces, Composition & Explicit Error Returns',
    'Testing, Benchmarking & Table-Driven Tests',
    'Goroutines, Channels & Select Statements',
    'Context Cancellation & Sync Primitives',
    'Building Concurrent HTTP Services with net/http',
    'Profiling, Modules & Single-Binary Deployment',
  ]),
  rust: buildTechSpecificBlueprint('Rust', 'Advanced', [
    'Cargo Toolchain, Variables, Mutability & Types',
    'Ownership, Borrowing & Lifetimes Rules',
    'Structs, Enums, Pattern Matching & Option/Result',
    'Error Propagation (?) & Custom Error Types',
    'Traits, Generics & Zero-Cost Abstractions',
    'Smart Pointers (Box, Rc, Arc) & Interior Mutability',
    'Fearless Concurrency & Async Tokio Basics',
    'Testing, Crates Ecosystem & Unsafe Boundaries',
  ]),
  tensorflow: buildTechSpecificBlueprint('TensorFlow', 'Intermediate to Advanced', [
    'Tensors, Shapes, Dtypes & Graph Execution',
    'Automatic Differentiation with GradientTape',
    'Building Neural Networks with tf.keras Sequential & Functional API',
    'tf.data Input Pipelines & Preprocessing Layers',
    'Loss Functions, Optimizers & Training Loops',
    'CNNs, Transfer Learning & NLP Embeddings',
    'Callbacks, TensorBoard Visualization & Overfitting Control',
    'Exporting SavedModel & Serving Inference',
  ]),
  pytorch: buildTechSpecificBlueprint('PyTorch', 'Intermediate to Advanced', [
    'PyTorch Tensors, Broadcasting & GPU Acceleration',
    'Autograd Computation Graphs & Backpropagation',
    'Custom Datasets, DataLoaders & Transforms',
    'Designing Architectures with nn.Module',
    'Training, Validation Loops & Gradient Clipping',
    'CNNs, RNNs & Transformer Attention Building Blocks',
    'Mixed Precision Training & Checkpointing',
    'Model Evaluation, Export & TorchScript / ONNX',
  ]),
  pandas: buildTechSpecificBlueprint('Pandas', 'Beginner to Intermediate', [
    'Series & DataFrame Anatomy, Index Alignment',
    'Loading & Exporting CSV, JSON & Parquet Files',
    'Selecting, Filtering (.loc/.iloc) & Boolean Masks',
    'Handling Missing Data, Duplicates & Type Casting',
    'String, Datetime & Vectorized Column Operations',
    'GroupBy Aggregations, Pivot Tables & Merging',
    'Reshaping Data (melt, stack) & Window Rolling Stats',
    'Memory Optimization & Clean Data Pipelines',
  ]),
  figma: buildTechSpecificBlueprint('Figma', 'Beginner to Intermediate', [
    'Frames, Grids, Constraints & Responsive Artboards',
    'Typography Scales, Color Styles & Design Variables',
    'Auto Layout Mastery for Adaptive UI Cards & Navbars',
    'Reusable Components, Variants & Component Properties',
    'Prototyping Flows, Smart Animate & Overlays',
    'Accessibility Contrast Checking & UX Critique',
    'Team Libraries, Branching & Design Systems',
    'Developer Handoff, Dev Mode & CSS/Token Inspection',
  ]),
  threejs: buildTechSpecificBlueprint('Three.js', 'Advanced', [
    'Scene, PerspectiveCamera, Renderer & Render Loop',
    'Geometries, Materials (PBR) & Lighting Systems',
    'Coordinate Transforms, Quaternions & OrbitControls',
    'Textures, Environment Maps & Shadow Mapping',
    'Raycasting & Interactive 3D Object Selection',
    'Loading glTF Models & Skeletal Animations',
    'Custom GLSL Vertex/Fragment Shaders',
    'Instancing, Dispose Lifecycle & Frame Budget Tuning',
  ]),
  unity: buildTechSpecificBlueprint('Unity', 'Intermediate', [
    'Unity Editor, GameObjects, Components & Prefabs',
    'C# MonoBehaviour Lifecycle (Awake, Start, Update)',
    '2D/3D Physics, Colliders, Triggers & Raycasts',
    'Input System & Character Movement Controllers',
    'UI Toolkit / Canvas, Audio & Scene Management',
    'ScriptableObjects for Data-Driven Game Design',
    'Lighting, Shaders, Particles & Animator State Machines',
    'Profiling Frame Time & Multi-Platform Build Pipeline',
  ]),
  arduino: buildTechSpecificBlueprint('Arduino', 'Beginner to Intermediate', [
    'Microcontroller Architecture, Pins & Breadboarding',
    'C++ Sketch Structure: setup(), loop() & Serial Monitor',
    'Digital I/O: LEDs, Buttons & Debouncing',
    'Analog Input (ADC), PWM & Voltage Dividers',
    'Interfacing Sensors via I2C, SPI & UART',
    'Non-Blocking Timing with millis() State Machines',
    'Controlling Motors, Servos & Relays Safely',
    'Power Budgeting & Sensor Telemetry Projects',
  ]),
};

function buildTechSpecificBlueprint(
  techName: string,
  targetLevel: string,
  topics: string[]
): BlueprintDefinition {
  const third = Math.ceil(topics.length / 3);
  const modules: BlueprintModuleSpec[] = [
    {
      title: `Module 1: ${techName} Foundations & Core Mechanics`,
      level: 'Beginner',
      summary: `Core mental model, environment setup, and primary abstractions of ${techName}.`,
      topics: topics.slice(0, third),
    },
    {
      title: `Module 2: ${techName} Applied Workflows & Composition`,
      level: 'Intermediate',
      summary: `Building structured, maintainable real-world modules and integrations in ${techName}.`,
      topics: topics.slice(third, third * 2),
    },
    {
      title: `Module 3: ${techName} Production Patterns, Testing & Scale`,
      level: 'Advanced',
      summary: `Performance, security boundaries, debugging, and capstone engineering with ${techName}.`,
      topics: topics.slice(third * 2),
    },
  ];
  return {
    title: `${techName} Structured Curriculum Blueprint`,
    targetLevel,
    summary: `Domain-authentic learning track for ${techName}, progressing from foundational architecture to practical engineering workflows.`,
    modules: modules.filter((m) => m.topics.length > 0),
  };
}

function buildCategoryBlueprint(tech: TechCatalogSeed): BlueprintDefinition {
  const n = tech.name;
  const desc = tech.description || `${n} workflows`;
  switch (tech.categoryId) {
    case 'cat_web_dev':
    case 'cat_frontend':
    case 'cat_frameworks':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Architecture, Setup & Core Primitives (${desc.split(',')[0]})`,
        `Component / Template Structure & Declarative Binding in ${n}`,
        `State Management, Lifecycle & Side-Effect Boundaries in ${n}`,
        `Routing, Navigation & Form Validation Patterns with ${n}`,
        `Styling Integration, Responsive UI & Accessibility in ${n}`,
        `Data Fetching, Caching & Error Handling in ${n}`,
        `Testing, Bundle Optimization & Debugging ${n} Apps`,
        `Production Deployment & End-to-End Capstone with ${n}`,
      ]);
    case 'cat_backend':
    case 'cat_web':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Runtime Architecture, Project Structure & Tooling`,
        `Routing, Controllers & Request Lifecycle in ${n}`,
        `Middleware, Schema Validation & Error Contracts in ${n}`,
        `Database Persistence, Migrations & Transactions with ${n}`,
        `Authentication, Sessions & Role-Based Access Control`,
        `Caching, Background Tasks & Real-Time Events in ${n}`,
        `Automated Integration Testing & Security Hardening`,
        `Observability, Packaging & Production Deployment for ${n}`,
      ]);
    case 'cat_db':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Storage Engine, Data Model & Connection Setup`,
        `Schema Design, Constraints & Data Types in ${n}`,
        `Query Syntax, Filtering, Sorting & Aggregations in ${n}`,
        `Relationships, Joins / Pipelines & Transactions in ${n}`,
        `Indexing Strategies & Query Execution Plan Analysis`,
        `Backup, Restore, Replication & High Availability in ${n}`,
        `Access Control, Encryption & Injection Defense`,
        `Monitoring, Scaling & Production Tuning for ${n}`,
      ]);
    case 'cat_mobile':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Workspace Setup, Emulator & App Lifecycle`,
        `UI Components, Layout Constraints & Adaptive Screens`,
        `Navigation Stacks, Deep Links & Passing State`,
        `State Architecture, Persistence & Offline Storage in ${n}`,
        `REST/GraphQL Networking & Background Sync`,
        `Device Capabilities: Camera, Sensors & Permissions`,
        `UI Testing, Frame Profiling & Crash Diagnostics`,
        `Signing, App Store Compliance & Release Automation`,
      ]);
    case 'cat_ai':
    case 'cat_ds':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Concepts, Environment Setup & Data Representations`,
        `Data Ingestion, Cleaning & Feature Preparation with ${n}`,
        `Core Algorithms, Architectures & Modeling Workflows in ${n}`,
        `Training / Prompting, Validation & Hyperparameter Tuning`,
        `Evaluation Metrics, Error Analysis & Bias Checks`,
        `Structured Pipelines, Serialization & Reproducibility`,
        `Latency Optimization, Guardrails & Inference Deployment`,
        `Applied Capstone Project & Monitoring in Production`,
      ]);
    case 'cat_cloud':
    case 'cat_devops':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Architecture, CLI Tooling & Core Concepts`,
        `Declarative Configuration & Environment Management in ${n}`,
        `Networking, Permissions & Identity Boundaries`,
        `Automation Pipelines, Builds & Rollout Strategies`,
        `Secrets Management, Compliance & Hardening`,
        `Observability: Logs, Metrics, Alerts & Health Checks`,
        `Failure Recovery, Scaling & Cost Control in ${n}`,
        `Production Infrastructure Capstone with ${n}`,
      ]);
    case 'cat_sec':
    case 'cat_net':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Protocol / Threat Foundations & Defensive Scope`,
        `Installation, Safe Lab Setup & Packet / Target Inspection`,
        `Core Diagnostic Workflows & Traffic / Vulnerability Analysis`,
        `Authentication, Cryptography & Boundary Verification`,
        `Detecting Anomalies, Misconfigurations & Common Exploits`,
        `Writing Actionable Remediation & Hardening Rules`,
        `Logging, Alert Correlation & Incident Response Playbooks`,
        `Compliance Auditing & Defensive Architecture Capstone`,
      ]);
    case 'cat_uiux':
    case 'cat_design':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Workspace, Canvas Controls & File Organization`,
        `Visual Hierarchy, Typography & Color Theory in ${n}`,
        `Grids, Spacing Systems & Responsive Composition`,
        `Reusable Components, Styles & Asset Libraries in ${n}`,
        `Interactive Prototyping / Non-Destructive Editing Workflows`,
        `Accessibility, Contrast Standards & Usability Testing`,
        `Export Pipelines, Developer Handoff & Asset Optimization`,
        `Portfolio-Ready Design System Project in ${n}`,
      ]);
    case 'cat_game':
    case 'cat_robotics':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Hardware / Engine Setup & Execution Loop`,
        `Coordinate Math / Signals, Inputs & State Machines`,
        `Physics / Sensor Reading, Collision & Feedback Loops`,
        `Asset / Driver Integration & Modular Architecture`,
        `Real-Time Performance Budgets & Debugging`,
        `Audio / Telemetry & Interactive User Controls`,
        `Safety Boundaries, Packaging & Hardware/Target Testing`,
        `Playable / Working Prototype Capstone in ${n}`,
      ]);
    case 'cat_cs':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `Formal Foundations & Mental Models of ${n}`,
        `Core Abstractions, Notation & Invariants`,
        `Canonical Implementations & Edge-Case Reasoning`,
        `Time, Space & Resource Trade-Off Analysis`,
        `Concurrency, Failure Modes & Bottleneck Identification`,
        `Applied Systems & Architecture Case Studies`,
        `Diagnostic Exercises & Algorithmic Problem Solving`,
        `Comprehensive Engineering Design Assessment`,
      ]);
    case 'cat_tools':
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Installation, Configuration & Workspace Ergonomics`,
        `Daily Commands, Shortcuts & Core Team Workflows`,
        `Project Configuration Files, Plugins & Extensions`,
        `Debugging, Diagnostics & Output Inspection in ${n}`,
        `Integrating ${n} with CI Pipelines & Monorepos`,
        `Troubleshooting Common Errors & Version Conflicts`,
        `Team Conventions, Automation & Performance Tuning`,
        `End-to-End Developer Productivity Workflow`,
      ]);
    default: // cat_langs and others
      return buildTechSpecificBlueprint(n, tech.difficulty, [
        `${n} Toolchain, Syntax & Program Structure`,
        `Types, Variables, Operators & Control Flow in ${n}`,
        `Functions, Scoping & Modular Package Organization`,
        `Collections, Pattern Matching & Data Modeling in ${n}`,
        `Memory / Resource Model, Errors & Concurrency Basics`,
        `Standard Library, File I/O & JSON/HTTP Interop`,
        `Testing Frameworks, Linting & Debugging in ${n}`,
        `Applied Real-World CLI / Service Project in ${n}`,
      ]);
  }
}

export function getBlueprintForTechnology(tech: {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  difficulty: string;
}): BlueprintDefinition {
  const bySlug = PRIORITY_BLUEPRINTS[tech.slug] || SPECIALTY_BLUEPRINTS[tech.slug];
  if (bySlug) return bySlug;
  return buildCategoryBlueprint(tech as TechCatalogSeed);
}

export function seedCurriculumBlueprintsAndStarterDrafts(db: DatabaseSync) {
  const now = new Date().toISOString();

  // 1. Seed default configurable completeness rules & governance policy
  const ruleCount = (db.prepare(`SELECT COUNT(*) as c FROM completeness_rules`).get() as { c: number }).c;
  if (ruleCount === 0) {
    const defaultRules = {
      courseWeights: {
        hasDescription: 8,
        hasObjectives: 8,
        hasPrerequisites: 5,
        minModules: 10,
        minTopics: 8,
        minPublishedLessons: 20,
        minCodeExamples: 12,
        minExercises: 12,
        minQuizQuestions: 10,
        minAssignments: 7,
        minProjects: 8,
      },
      courseThresholds: {
        minModules: 2,
        minTopics: 4,
        minPublishedLessons: 5,
        minCodeExamples: 4,
        minExercises: 3,
        minQuizQuestions: 3,
        minAssignments: 1,
        minProjects: 1,
        minLessonWordCount: 45,
      },
      learningPathWeights: {
        hasDescription: 15,
        hasPrerequisites: 15,
        minOrderedCourses: 25,
        hasMilestones: 20,
        hasProjects: 15,
        hasCompletionRule: 10,
      },
      learningPathThresholds: {
        minOrderedCourses: 2,
        minMilestones: 2,
        minProjects: 1,
      },
      technologySubstantialThreshold: 75,
    };
    db.prepare(
      `INSERT INTO completeness_rules (id, config_json, require_independent_review, ai_daily_generation_limit, updated_by, updated_at)
       VALUES (1, ?, 0, 80, 'system_seed', ?)`
    ).run(JSON.stringify(defaultRules), now);
  }

  // 2. Seed authentic blueprints for all 237 technologies in DB idempotently
  const insertBp = db.prepare(
    `INSERT INTO curriculum_blueprints (id, technology_id, category_id, title, slug, target_level, summary, module_outline_json, is_system, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'usr_mentor_admin', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       target_level = excluded.target_level,
       summary = excluded.summary,
       module_outline_json = excluded.module_outline_json,
       updated_at = excluded.updated_at`
  );

  const catalogById = new Map<string, TechCatalogSeed>(TECHNOLOGIES_CATALOG.map((t) => [t.id, t]));
  const dbTechs = db
    .prepare(`SELECT id, name, slug, category_id, difficulty FROM technologies`)
    .all() as Array<{ id: string; name: string; slug: string; category_id: string; difficulty: string }>;

  const seenIds = new Set<string>();
  for (const row of dbTechs) {
    seenIds.add(row.id);
    const seed = catalogById.get(row.id) || {
      id: row.id,
      name: row.name,
      slug: row.slug,
      categoryId: row.category_id,
      difficulty: (row.difficulty as TechCatalogSeed['difficulty']) || 'Intermediate',
    };
    const bp = getBlueprintForTechnology(seed);
    const bpId = `bp_${row.id}`;
    insertBp.run(
      bpId,
      row.id,
      row.category_id,
      bp.title,
      `${row.slug}-blueprint`,
      bp.targetLevel,
      bp.summary,
      JSON.stringify(bp.modules),
      now,
      now
    );
  }
  for (const tech of TECHNOLOGIES_CATALOG) {
    if (seenIds.has(tech.id)) continue;
    const bp = getBlueprintForTechnology(tech);
    const bpId = `bp_${tech.id}`;
    insertBp.run(
      bpId,
      tech.id,
      tech.categoryId,
      bp.title,
      `${tech.slug}-blueprint`,
      bp.targetLevel,
      bp.summary,
      JSON.stringify(bp.modules),
      now,
      now
    );
  }

  // 3. Ensure C++ priority starter course exists explicitly in DRAFT workflow (honest non-published draft)
  //    so Phase 11 covers all 10 priorities with real DB curriculum structures without fake published counts!
  const cppCourseExists = db.prepare(`SELECT 1 FROM courses WHERE id = 'crs_cpp_draft'`).get();
  if (!cppCourseExists) {
    db.prepare(
      `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, prerequisites_json, difficulty, estimated_hours, instructor_id, assigned_instructor_id, thumbnail_url, is_published, status, workflow_status, completion_rule, is_ai_generated, qa_status, created_at, updated_at)
       VALUES (?, 'cat_langs', 'tech_cpp', ?, 'cpp-systems-raii-stl-draft', ?, ?, ?, 'Intermediate', 20, 'usr_instructor_elena', 'usr_instructor_elena', '/src/assets/images/course_systems_algorithms_1794920076843.jpg', 0, 'draft', 'draft', 'all_requirements', 0, 'pending', ?, ?)`
    ).run(
      'crs_cpp_draft',
      'C++20 Systems Programming, RAII & STL',
      'Draft curriculum covering compilation, references, smart pointers, RAII, templates, and Standard Template Library containers.',
      JSON.stringify([
        'Understand references, pointers, stack vs heap lifetimes, and RAII cleanup.',
        'Use std::unique_ptr, std::vector, and STL algorithms cleanly in C++20.',
      ]),
      JSON.stringify(['Basic programming familiarity in any language']),
      now,
      now
    );

    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, 'crs_cpp_draft', ?, ?, 1)`).run(
      'mod_cpp_1',
      'Module 1: C++20 Compilation, References & RAII',
      'Toolchain, References & Resource Safety'
    );
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, 'crs_cpp_draft', ?, ?, 2)`).run(
      'mod_cpp_2',
      'Module 2: STL Containers, Algorithms & Smart Pointers',
      'Containers, Iterators & Memory Ownership'
    );

    const insTopic = db.prepare(
      `INSERT OR IGNORE INTO course_topics (id, course_id, module_id, title, slug, summary, sort_order, created_at) VALUES (?, 'crs_cpp_draft', ?, ?, ?, ?, ?, ?)`
    );
    insTopic.run('top_cpp_1', 'mod_cpp_1', 'C++ Compilation Pipeline & Namespaces', 'cpp-compilation-namespaces', 'Preprocess, compile, link stages and namespaces.', 1, now);
    insTopic.run('top_cpp_2', 'mod_cpp_1', 'References vs Raw Pointers', 'cpp-references-pointers', 'Pass-by-const-reference and avoiding dangling pointers.', 2, now);
    insTopic.run('top_cpp_3', 'mod_cpp_2', 'RAII & std::unique_ptr', 'cpp-raii-unique-ptr', 'Scope-bound deterministic cleanup with smart pointers.', 3, now);

    const insLesson = db.prepare(
      `INSERT OR IGNORE INTO lessons (id, module_id, topic_id, course_id, title, slug, topic_name, summary, content_markdown, code_example, language, access_tier, duration_minutes, exercise_prompt, starter_code, solution_hint, status, workflow_status, qa_status, author_id, version, objectives_json, prerequisites_json, sort_order, updated_at)
       VALUES (?, ?, ?, 'crs_cpp_draft', ?, ?, ?, ?, ?, ?, 'cpp', 'free', 18, ?, ?, ?, 'draft', 'draft', 'pending', 'usr_instructor_elena', 1, ?, ?, ?, ?)`
    );

    insLesson.run(
      'les_cpp_1',
      'mod_cpp_1',
      'top_cpp_1',
      'C++20 Compilation Pipeline, Types & Output',
      'cpp-compilation-types',
      'C++ Compilation & Types',
      'Understand translation units, headers, const correctness, and standard stream output in modern C++.',
      `### Concept Explanation\n\nC++ compiles each \`.cpp\` translation unit to object code before linking into a native binary. Prefer \`const\` and \`constexpr\` by default.\n\n### Practical Guidance\n\nAlways compile with \`-Wall -Wextra -std=c++20\` to catch narrowing conversions early.\n\n### Best Practices\n\nInclude only required headers and avoid \`using namespace std;\` in header files.`,
      `#include <iostream>\n#include <string>\n\nint main() {\n    const std::string track = "Braincode C++20";\n    std::cout << "Starting " << track << "\\n";\n    return 0;\n}`,
      'Explain why putting `using namespace std;` in a public header file can break downstream callers.',
      '',
      'Think about name collisions across multiple included headers.',
      JSON.stringify(['Trace the C++ preprocessing, compilation, and linking phases.', 'Use const variables and iostream safely.']),
      JSON.stringify(['Basic command-line familiarity']),
      1,
      now
    );

    insLesson.run(
      'les_cpp_2',
      'mod_cpp_1',
      'top_cpp_2',
      'References, Const Correctness & Smart Pointers',
      'cpp-references-smart-pointers',
      'References & RAII',
      'Pass large containers by const reference and manage heap allocations deterministically via std::unique_ptr.',
      `### Why Prefer References & Smart Pointers\n\nA C++ reference (\`const std::vector<int>&\`) cannot be null and avoids copying heap buffers. For single ownership on the heap, \`std::make_unique<T>()\` guarantees deletion when the owner leaves scope.\n\n### Common Mistake\n\nManual \`new\` / \`delete\` pairs leak memory whenever an early return or exception occurs.`,
      `#include <memory>\n#include <iostream>\n\nstruct LessonUnit {\n    int minutes;\n};\n\nint main() {\n    auto unit = std::make_unique<LessonUnit>(LessonUnit{20});\n    std::cout << "Duration: " << unit->minutes << "m\\n";\n}`,
      'Identify the safer alternative to raw `new` / `delete` for exclusive ownership in C++.',
      '',
      'Look at `<memory>` smart pointer factories.',
      JSON.stringify(['Distinguish pass-by-value from pass-by-const-reference.', 'Replace raw new/delete with std::make_unique.']),
      JSON.stringify(['Lesson 1: C++20 Compilation Pipeline']),
      2,
      now
    );

    db.prepare(
      `INSERT OR IGNORE INTO exercises (id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty, prompt, starter_code, options_json, correct_answer, validation_rule_json, explanation, hint_text, xp_reward, sort_order, created_at)
       VALUES ('ex_cpp_1', 'crs_cpp_draft', 'mod_cpp_1', 'les_cpp_2', 'tech_cpp', 'Select Exclusive Ownership Smart Pointer', 'multiple_choice', 'Intermediate', 'Which C++ standard library smart pointer enforces exclusive single ownership with zero reference-counting overhead?', '', ?, 'std::unique_ptr', '{"mode":"exact_case_insensitive"}', 'std::unique_ptr is move-only and destroys its managed object automatically when leaving scope.', 'Look for the non-shared smart pointer in <memory>.', 30, 1, ?)`
    ).run(JSON.stringify(['std::unique_ptr', 'std::shared_ptr', 'std::auto_ptr', 'void*']), now);

    db.prepare(
      `INSERT OR IGNORE INTO assessments (id, course_id, lesson_id, title, type, mode, time_limit_sec, xp_reward, questions_json, passing_score_pct, created_at)
       VALUES ('asm_cpp_draft_quiz', 'crs_cpp_draft', 'les_cpp_1', 'C++20 Memory & RAII Readiness Check', 'quiz', 'untimed', 0, 90, ?, 70, ?)`
    ).run(
      JSON.stringify([
        {
          id: 'cpp_q1',
          kind: 'multiple_choice',
          prompt: 'What does RAII stand for in C++ resource management?',
          options: [
            'Resource Acquisition Is Initialization',
            'Runtime Allocation Index Inheritance',
            'Reference Assignment In Interfaces',
            'Recursive Array Inline Iteration',
          ],
          correctAnswer: 'Resource Acquisition Is Initialization',
          explanation: 'RAII ties resource lifetime (memory, file handles, mutexes) directly to object scope.',
        },
        {
          id: 'cpp_q2',
          kind: 'true_false',
          prompt: 'True or False: Passing a large std::vector by `const std::vector<int>&` copies every element.',
          options: ['True', 'False'],
          correctAnswer: 'False',
          explanation: 'Const references bind directly to the existing vector without copying elements.',
        },
      ]),
      now
    );

    db.prepare(
      `INSERT OR IGNORE INTO project_templates (id, technology_id, learning_path_id, course_id, title, slug, category, difficulty, estimated_hours, summary, requirements_json, starter_files_json, deliverables_json, created_at)
       VALUES ('ptpl_cpp_cli', 'tech_cpp', '', 'crs_cpp_draft', 'C++20 Task Ledger CLI', 'cpp20-task-ledger-cli', 'Systems Programming', 'Intermediate', 6, 'Build a clean CLI task ledger utilizing std::vector, const references, and RAII file streams.', ?, ?, ?, ?)`
    ).run(
      JSON.stringify(['Read and persist tasks via std::ifstream / std::ofstream RAII wrappers', 'Avoid raw new/delete across the codebase']),
      JSON.stringify({ 'main.cpp': '#include <iostream>\n#include <vector>\n\nint main() {\n    std::cout << "C++ Task Ledger ready\\n";\n    return 0;\n}' }),
      JSON.stringify(['main.cpp', 'README.md']),
      now
    );
  }
}
