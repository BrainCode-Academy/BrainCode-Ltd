export interface TechCatalogSeed {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  iconSymbol: string;
  brandColor: string;
  aliases: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  contentStatus: 'available' | 'in_development' | 'coming_soon';
  sortOrder: number;
  isPopular: number;
  featuredOrder: number;
  overviewMarkdown: string;
}

type RawEntry = [
  id: string,
  categoryId: string,
  name: string,
  slug: string,
  iconSymbol: string,
  brandColor: string,
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced',
  contentStatus: 'available' | 'in_development' | 'coming_soon',
  isPopular: number,
  featuredOrder: number,
  aliases: string[],
  description: string,
  overview?: string
];

const RAW_ENTRIES: RawEntry[] = [
  // =========================================================
  // A. PROGRAMMING LANGUAGES & WEB CORE (38)
  // =========================================================
  ['tech_html_std', 'cat_web_dev', 'HTML', 'html', 'HTML', '#E34F26', 'Beginner', 'available', 1, 1, ['html5', 'markup', 'dom', 'web structure', 'tags'], 'Semantic document structure, accessible landmarks, forms, media, and web standards.'],
  ['tech_css_std', 'cat_web_dev', 'CSS', 'css', 'CSS', '#1572B6', 'Beginner', 'available', 1, 2, ['css3', 'flexbox', 'grid', 'stylesheets', 'responsive'], 'Cascading stylesheets, Flexbox, CSS Grid, custom properties, and responsive layouts.'],
  ['tech_js', 'cat_web_dev', 'JavaScript', 'javascript', 'JS', '#D97706', 'Beginner', 'available', 1, 3, ['js', 'es6', 'ecmascript', 'dom scripting', 'async'], 'Dynamic browser and server scripting, DOM APIs, closures, and async programming.'],
  ['tech_ts_std', 'cat_frontend', 'TypeScript', 'typescript', 'TS', '#3178C6', 'Intermediate', 'available', 1, 4, ['ts', 'typed javascript', 'interfaces', 'generics'], 'Static type safety, discriminated unions, generics, and scalable application architecture.'],
  ['tech_python', 'cat_langs', 'Python', 'python', 'PY', '#3776AB', 'Beginner', 'available', 1, 5, ['py', 'python3', 'pip', 'scripting', 'automation'], 'Readable general-purpose programming for backend services, automation, data, and AI.'],
  ['tech_java', 'cat_langs', 'Java', 'java', 'JV', '#EA2D2E', 'Intermediate', 'available', 1, 6, ['jvm', 'jdk', 'oop', 'enterprise java'], 'Object-oriented JVM engineering, strong typing, concurrency, and enterprise APIs.'],
  ['tech_php', 'cat_backend', 'PHP', 'php', 'PHP', '#777BB4', 'Beginner', 'available', 0, 0, ['php8', 'pdo', 'composer', 'server scripting'], 'Server-side web scripting, PDO database queries, routing, and backend APIs.'],
  ['tech_c', 'cat_langs', 'C', 'c', 'C', '#5C6BC0', 'Intermediate', 'in_development', 0, 0, ['ansi c', 'pointers', 'systems programming', 'gcc'], 'Systems programming, pointers, manual memory management, and low-level execution.'],
  ['tech_cpp', 'cat_langs', 'C++', 'cpp', 'C++', '#00599C', 'Intermediate', 'in_development', 0, 0, ['cplusplus', 'stl', 'raii', 'cpp20'], 'High-performance software, RAII resource safety, STL containers, and engines.'],
  ['tech_csharp', 'cat_langs', 'C#', 'csharp', 'C#', '#512BD4', 'Intermediate', 'in_development', 0, 0, ['dotnet', 'cs', 'linq', 'microsoft'], '.NET application development, LINQ, async tasks, and cross-platform services.'],
  ['tech_sql', 'cat_db', 'SQL', 'sql', 'SQL', '#0284C7', 'Beginner', 'available', 1, 7, ['structured query language', 'joins', 'queries', 'rdbms'], 'Declarative relational queries, joins, aggregations, constraints, and indexing.'],
  ['tech_ruby', 'cat_langs', 'Ruby', 'ruby', 'RB', '#CC342D', 'Beginner', 'coming_soon', 0, 0, ['irb', 'gems', 'ruby scripting'], 'Expressive object-oriented scripting language known for clean developer ergonomics.'],
  ['tech_go', 'cat_langs', 'Go', 'go', 'GO', '#00ADD8', 'Intermediate', 'in_development', 1, 14, ['golang', 'goroutines', 'channels', 'cloud native'], 'Statically typed compiled language built for concurrent microservices and CLI tools.'],
  ['tech_rust', 'cat_langs', 'Rust', 'rust', 'RS', '#DE3423', 'Advanced', 'in_development', 1, 15, ['cargo', 'borrow checker', 'wasm', 'memory safety'], 'Memory-safe systems programming with zero-cost abstractions and fearless concurrency.'],
  ['tech_swift', 'cat_mobile', 'Swift', 'swift', 'SW', '#F05138', 'Intermediate', 'in_development', 0, 0, ['ios', 'apple', 'swift6', 'macos'], 'Native Apple ecosystem language with type safety and structured concurrency.'],
  ['tech_kotlin', 'cat_mobile', 'Kotlin', 'kotlin', 'KT', '#7F52FF', 'Intermediate', 'in_development', 0, 0, ['android', 'jvm', 'coroutines', 'multiplatform'], 'Modern statically typed language for Android development, backends, and coroutines.'],
  ['tech_dart', 'cat_mobile', 'Dart', 'dart', 'DT', '#0175C2', 'Beginner', 'coming_soon', 0, 0, ['flutter language', 'null safety', 'aot'], 'Sound null-safe language powering Flutter reactive mobile, web, and desktop apps.'],
  ['tech_r', 'cat_ds', 'R', 'r-language', 'R', '#276DC3', 'Intermediate', 'coming_soon', 0, 0, ['rstudio', 'tidyverse', 'ggplot2', 'statistics'], 'Statistical computing and graphics environment for academic research and data modeling.'],
  ['tech_matlab', 'cat_ds', 'MATLAB', 'matlab', 'MAT', '#E16737', 'Intermediate', 'coming_soon', 0, 0, ['matrix', 'simulink', 'numerical computing'], 'Matrix-based numerical computing environment for engineering math and signal modeling.'],
  ['tech_scala', 'cat_langs', 'Scala', 'scala', 'SC', '#DC322F', 'Advanced', 'coming_soon', 0, 0, ['jvm functional', 'spark', 'akka'], 'Functional and object-oriented JVM language used in distributed data pipelines.'],
  ['tech_perl', 'cat_langs', 'Perl', 'perl', 'PL', '#39457E', 'Intermediate', 'coming_soon', 0, 0, ['regex', 'text processing', 'cpan'], 'Battle-tested text processing, regex, and Unix system automation language.'],
  ['tech_lua', 'cat_langs', 'Lua', 'lua', 'LUA', '#2C2D72', 'Beginner', 'coming_soon', 0, 0, ['embedded scripting', 'neovim', 'luajit', 'game scripting'], 'Lightweight embeddable scripting language for game engines, proxies, and editors.'],
  ['tech_elixir', 'cat_langs', 'Elixir', 'elixir', 'EX', '#6E4A7E', 'Intermediate', 'coming_soon', 0, 0, ['beam', 'otp', 'functional concurrent'], 'Functional concurrent language on the Erlang VM for fault-tolerant distributed apps.'],
  ['tech_erlang', 'cat_langs', 'Erlang', 'erlang', 'ERL', '#A90533', 'Advanced', 'coming_soon', 0, 0, ['beam vm', 'otp', 'telecom systems'], 'Actor-model concurrency runtime engineered for always-on distributed systems.'],
  ['tech_haskell', 'cat_langs', 'Haskell', 'haskell', 'HS', '#5D4F85', 'Advanced', 'coming_soon', 0, 0, ['pure functional', 'monads', 'ghc', 'type classes'], 'Purely functional statically typed language with lazy evaluation and type classes.'],
  ['tech_clojure', 'cat_langs', 'Clojure', 'clojure', 'CLJ', '#5881D8', 'Advanced', 'coming_soon', 0, 0, ['lisp', 'jvm', 'immutable data'], 'Modern Lisp dialect running on the JVM with persistent immutable data structures.'],
  ['tech_fsharp', 'cat_langs', 'F#', 'fsharp', 'F#', '#378BBA', 'Intermediate', 'coming_soon', 0, 0, ['functional dotnet', 'pattern matching'], 'Functional-first .NET programming language with strong type inference.'],
  ['tech_objc', 'cat_mobile', 'Objective-C', 'objective-c', 'OBJC', '#438EFF', 'Intermediate', 'coming_soon', 0, 0, ['cocoa', 'apple legacy', 'xcode'], 'Message-passing object-oriented C superset behind foundational Apple frameworks.'],
  ['tech_assembly', 'cat_cs', 'Assembly', 'assembly', 'ASM', '#475569', 'Advanced', 'coming_soon', 0, 0, ['x86', 'arm64', 'nasm', 'registers', 'low level'], 'Low-level CPU instruction architecture, registers, stack frames, and machine code.'],
  ['tech_solidity', 'cat_langs', 'Solidity', 'solidity', 'SOL', '#6366F1', 'Intermediate', 'coming_soon', 0, 0, ['smart contracts', 'evm', 'blockchain'], 'Contract-oriented statically typed language for EVM smart contract systems.'],
  ['tech_julia', 'cat_ds', 'Julia', 'julia', 'JL', '#9558B2', 'Intermediate', 'coming_soon', 0, 0, ['scientific computing', 'jit', 'linear algebra'], 'High-performance scientific and numerical computing language with JIT compilation.'],
  ['tech_fortran', 'cat_langs', 'Fortran', 'fortran', 'F90', '#734F96', 'Intermediate', 'coming_soon', 0, 0, ['hpc', 'numerical simulation', 'scientific'], 'Compiled numerical computing standard for physics simulations and high-performance math.'],
  ['tech_cobol', 'cat_langs', 'COBOL', 'cobol', 'CBL', '#0F4C81', 'Intermediate', 'coming_soon', 0, 0, ['mainframe', 'enterprise batch', 'banking'], 'Structured business data processing language powering financial core mainframes.'],
  ['tech_vb', 'cat_langs', 'Visual Basic', 'visual-basic', 'VB', '#00539C', 'Beginner', 'coming_soon', 0, 0, ['vbnet', 'vba', 'dotnet'], 'Readable event-driven .NET and office automation programming language.'],
  ['tech_bash', 'cat_devops', 'Bash', 'bash', 'SH', '#4EAA25', 'Beginner', 'coming_soon', 0, 0, ['shell scripting', 'zsh', 'cli', 'posix'], 'Unix command shell and scripting language for automation pipelines and servers.'],
  ['tech_powershell', 'cat_devops', 'PowerShell', 'powershell', 'PS1', '#5391FE', 'Beginner', 'coming_soon', 0, 0, ['pwsh', 'windows admin', 'automation'], 'Cross-platform task automation shell built around structured .NET objects.'],
  ['tech_zig', 'cat_langs', 'Zig', 'zig', 'ZIG', '#F7A41D', 'Advanced', 'coming_soon', 0, 0, ['systems', 'c interop', 'comptime'], 'Low-level systems language featuring explicit memory allocators and C interop.'],
  ['tech_nim', 'cat_langs', 'Nim', 'nim', 'NIM', '#FFE953', 'Intermediate', 'coming_soon', 0, 0, ['compiled pythonic', 'systems'], 'Statically typed compiled language combining expressive syntax with C-level speed.'],

  // =========================================================
  // B. FRONTEND FRAMEWORKS, LIBRARIES & UI SYSTEMS (26)
  // =========================================================
  ['tech_react', 'cat_frontend', 'React', 'react', 'RX', '#0EA5E9', 'Intermediate', 'available', 1, 8, ['reactjs', 'hooks', 'jsx', 'tsx', 'components'], 'Declarative UI components, hooks, unidirectional data flow, and state architecture.'],
  ['tech_angular', 'cat_frontend', 'Angular', 'angular', 'NG', '#DD0031', 'Intermediate', 'in_development', 0, 0, ['ng', 'rxjs', 'typescript framework', 'signals'], 'Full-featured TypeScript frontend platform with dependency injection and RxJS.'],
  ['tech_vue', 'cat_frontend', 'Vue.js', 'vuejs', 'VUE', '#42B883', 'Beginner', 'in_development', 1, 16, ['vue', 'vue3', 'composition api', 'pinia'], 'Progressive JavaScript UI framework with intuitive single-file components and reactivity.'],
  ['tech_svelte', 'cat_frontend', 'Svelte', 'svelte', 'SV', '#FF3E00', 'Beginner', 'in_development', 0, 0, ['sveltekit', 'compiler ui', 'runes'], 'Compile-time reactive frontend framework shipping compact zero-overhead UI updates.'],
  ['tech_nextjs', 'cat_frameworks', 'Next.js', 'nextjs', 'NX', '#334155', 'Intermediate', 'in_development', 1, 9, ['next', 'app router', 'ssr', 'react fullstack'], 'Full-stack React framework with server rendering, file routing, and API handlers.'],
  ['tech_nuxt', 'cat_frameworks', 'Nuxt', 'nuxt', 'NUX', '#00DC82', 'Intermediate', 'coming_soon', 0, 0, ['nuxtjs', 'vue ssr', 'nitro'], 'Full-stack Vue framework for universal SSR, static generation, and server routes.'],
  ['tech_astro', 'cat_frameworks', 'Astro', 'astro', 'AST', '#BC52EE', 'Beginner', 'coming_soon', 0, 0, ['islands architecture', 'static site', 'content'], 'Content-focused web framework delivering fast HTML pages with interactive UI islands.'],
  ['tech_gatsby', 'cat_frameworks', 'Gatsby', 'gatsby', 'GBY', '#663399', 'Intermediate', 'coming_soon', 0, 0, ['react static', 'graphql site'], 'React-based static and hybrid web framework backed by a GraphQL data layer.'],
  ['tech_remix', 'cat_frameworks', 'Remix', 'remix', 'RMX', '#3B82F6', 'Intermediate', 'coming_soon', 0, 0, ['react router', 'web standards', 'loaders'], 'Full-stack React framework centered on web fetch standards and nested routes.'],
  ['tech_solidjs', 'cat_frontend', 'SolidJS', 'solidjs', 'SLD', '#2C4F7C', 'Intermediate', 'coming_soon', 0, 0, ['fine grained reactivity', 'signals'], 'Fine-grained reactive JSX UI library without virtual DOM diffing overhead.'],
  ['tech_qwik', 'cat_frontend', 'Qwik', 'qwik', 'QWK', '#18B6F6', 'Intermediate', 'coming_soon', 0, 0, ['resumability', 'lazy execution'], 'Resumable web framework hydrating event handlers on interaction with minimal JS.'],
  ['tech_preact', 'cat_frontend', 'Preact', 'preact', 'PRX', '#673AB8', 'Intermediate', 'coming_soon', 0, 0, ['lightweight react', 'signals'], 'Fast 3kB React-compatible UI library tailored for compact frontend bundles.'],
  ['tech_jquery', 'cat_frontend', 'jQuery', 'jquery', 'JQ', '#0769AD', 'Beginner', 'coming_soon', 0, 0, ['dom selector', 'legacy js', 'ajax'], 'Classic cross-browser DOM traversal, event handling, and AJAX helper library.'],
  ['tech_redux', 'cat_frameworks', 'Redux', 'redux', 'RDX', '#764ABC', 'Intermediate', 'coming_soon', 0, 0, ['redux toolkit', 'rtk', 'store'], 'Predictable centralized state container and Redux Toolkit slice architecture.'],
  ['tech_zustand', 'cat_frameworks', 'Zustand', 'zustand', 'ZST', '#443E38', 'Beginner', 'coming_soon', 0, 0, ['react state', 'hooks store'], 'Minimalist hook-based client state store for React applications.'],
  ['tech_mobx', 'cat_frameworks', 'MobX', 'mobx', 'MBX', '#FF9955', 'Intermediate', 'coming_soon', 0, 0, ['observable state', 'reactive'], 'Transparent functional reactive state management using observables and actions.'],
  ['tech_tanstack_query', 'cat_frameworks', 'TanStack Query', 'tanstack-query', 'TQ', '#FF4154', 'Intermediate', 'coming_soon', 0, 0, ['react query', 'server state', 'caching'], 'Asynchronous server-state fetching, cache invalidation, and background sync library.'],
  ['tech_bootstrap', 'cat_frontend', 'Bootstrap', 'bootstrap', 'BS', '#7952B3', 'Beginner', 'coming_soon', 0, 0, ['bootstrap5', 'grid system', 'css framework'], 'Responsive grid utilities and accessible component patterns for rapid interfaces.'],
  ['tech_tailwind', 'cat_frontend', 'Tailwind CSS', 'tailwind-css', 'TW', '#06B6D4', 'Beginner', 'in_development', 1, 10, ['tailwindcss', 'utility css', 'design tokens'], 'Utility-first CSS framework for composable responsive layouts and theme tokens.'],
  ['tech_mui', 'cat_frontend', 'Material UI', 'material-ui', 'MUI', '#007FFF', 'Intermediate', 'coming_soon', 0, 0, ['mui', 'material design', 'react ui'], 'Comprehensive Material Design React component suite with custom theme providers.'],
  ['tech_chakra', 'cat_frontend', 'Chakra UI', 'chakra-ui', 'CHK', '#319795', 'Beginner', 'coming_soon', 0, 0, ['accessible components', 'react ui'], 'Accessible modular React component library powered by style props.'],
  ['tech_antd', 'cat_frontend', 'Ant Design', 'ant-design', 'ANT', '#1677FF', 'Intermediate', 'coming_soon', 0, 0, ['antd', 'enterprise ui', 'data tables'], 'Enterprise React UI design system with complex forms, tables, and layouts.'],
  ['tech_shadcn', 'cat_frontend', 'shadcn/ui', 'shadcn-ui', 'SHD', '#18181B', 'Intermediate', 'coming_soon', 0, 0, ['radix', 'tailwind components', 'copy paste ui'], 'Accessible Radix-based React UI primitives styled cleanly with Tailwind CSS.'],
  ['tech_alpinejs', 'cat_frontend', 'Alpine.js', 'alpinejs', 'ALP', '#77C1D2', 'Beginner', 'coming_soon', 0, 0, ['declarative html', 'lightweight js'], 'Lightweight declarative reactivity sprinkled directly inside server-rendered HTML.'],
  ['tech_lit', 'cat_frontend', 'Lit', 'lit', 'LIT', '#324FFF', 'Intermediate', 'coming_soon', 0, 0, ['web components', 'shadow dom'], 'Standards-based library for fast, interoperable Web Components.'],
  ['tech_threejs', 'cat_frontend', 'Three.js', 'threejs', '3D', '#049EF4', 'Advanced', 'coming_soon', 0, 0, ['webgl', 'webgpu', '3d graphics', 'shaders'], 'JavaScript 3D graphics library for WebGL scenes, cameras, lighting, and shaders.'],

  // =========================================================
  // C. BACKEND FRAMEWORKS & RUNTIMES (22)
  // =========================================================
  ['tech_node', 'cat_backend', 'Node.js', 'nodejs', 'ND', '#339933', 'Intermediate', 'available', 1, 11, ['node', 'npm runtime', 'v8', 'server js'], 'Event-driven JavaScript runtime for network servers, CLIs, and real-time APIs.'],
  ['tech_express', 'cat_frameworks', 'Express', 'express', 'EX', '#475569', 'Beginner', 'in_development', 1, 17, ['expressjs', 'rest api', 'middleware'], 'Minimalist Node.js HTTP framework for routing, middleware pipelines, and APIs.'],
  ['tech_nestjs', 'cat_frameworks', 'NestJS', 'nestjs', 'NST', '#E0234E', 'Intermediate', 'coming_soon', 0, 0, ['typescript backend', 'di', 'decorators'], 'Modular TypeScript Node.js framework with dependency injection and strict structure.'],
  ['tech_fastify', 'cat_frameworks', 'Fastify', 'fastify', 'FST', '#1E293B', 'Intermediate', 'coming_soon', 0, 0, ['node api', 'json schema', 'high throughput'], 'Low-overhead Node.js web framework with schema-based validation and serialization.'],
  ['tech_django', 'cat_frameworks', 'Django', 'django', 'DJ', '#092E20', 'Intermediate', 'coming_soon', 0, 0, ['python web', 'orm', 'batteries included'], 'High-level Python web framework featuring built-in ORM, auth, and admin CMS.'],
  ['tech_flask', 'cat_frameworks', 'Flask', 'flask', 'FLK', '#475569', 'Beginner', 'coming_soon', 0, 0, ['python microframework', 'wsgi', 'jinja'], 'Lightweight Python micro-framework for composable APIs and web services.'],
  ['tech_fastapi', 'cat_frameworks', 'FastAPI', 'fastapi', 'FAPI', '#009688', 'Intermediate', 'coming_soon', 0, 0, ['python async', 'pydantic', 'openapi'], 'Modern Python async API framework generating OpenAPI schemas from type hints.'],
  ['tech_laravel', 'cat_frameworks', 'Laravel', 'laravel', 'LRV', '#FF2D20', 'Intermediate', 'coming_soon', 0, 0, ['php framework', 'eloquent', 'artisan'], 'Expressive PHP web application framework with Eloquent ORM, queues, and routing.'],
  ['tech_symfony', 'cat_frameworks', 'Symfony', 'symfony', 'SYM', '#1E293B', 'Intermediate', 'coming_soon', 0, 0, ['php enterprise', 'components', 'doctrine'], 'Modular PHP enterprise framework and reusable HTTP/console component library.'],
  ['tech_springboot', 'cat_frameworks', 'Spring Boot', 'spring-boot', 'SB', '#6DB33F', 'Intermediate', 'coming_soon', 0, 0, ['spring', 'java backend', 'microservices'], 'Convention-over-configuration Java framework for production microservices and APIs.'],
  ['tech_aspnet', 'cat_frameworks', 'ASP.NET Core', 'aspnet-core', 'NET', '#512BD4', 'Intermediate', 'coming_soon', 0, 0, ['dotnet web', 'razor', 'minimal apis'], 'Cross-platform high-performance .NET web framework for cloud APIs and web apps.'],
  ['tech_rails', 'cat_frameworks', 'Ruby on Rails', 'ruby-on-rails', 'ROR', '#D30001', 'Intermediate', 'coming_soon', 0, 0, ['rails', 'activerecord', 'mvc'], 'Full-stack Ruby MVC framework built around convention over configuration.'],
  ['tech_phoenix', 'cat_frameworks', 'Phoenix', 'phoenix', 'PHX', '#FD4F00', 'Intermediate', 'coming_soon', 0, 0, ['elixir web', 'liveview', 'channels'], 'Real-time Elixir web framework delivering LiveView interfaces and WebSocket channels.'],
  ['tech_gin', 'cat_frameworks', 'Gin', 'gin', 'GIN', '#00ADD8', 'Intermediate', 'coming_soon', 0, 0, ['go web', 'golang api', 'httprouter'], 'High-throughput Go HTTP web framework with middleware support and fast routing.'],
  ['tech_fiber', 'cat_frameworks', 'Fiber', 'fiber', 'FBR', '#00ACD7', 'Intermediate', 'coming_soon', 0, 0, ['go express', 'fasthttp'], 'Express-inspired Go web framework engineered atop the fasthttp engine.'],
  ['tech_actix', 'cat_frameworks', 'Actix Web', 'actix-web', 'ACT', '#DE3423', 'Advanced', 'coming_soon', 0, 0, ['rust api', 'actors', 'tokio'], 'Type-safe, ultra-fast Rust web framework powered by async actor primitives.'],
  ['tech_axum', 'cat_frameworks', 'Axum', 'axum', 'AXM', '#B7410E', 'Advanced', 'coming_soon', 0, 0, ['rust tower', 'hyper', 'tokio'], 'Ergonomic Rust web framework built natively on Tokio and Tower middleware.'],
  ['tech_koa', 'cat_frameworks', 'Koa', 'koa', 'KOA', '#33333D', 'Intermediate', 'coming_soon', 0, 0, ['node middleware', 'async generators'], 'Expressive middleware-focused Node.js framework designed by Express creators.'],
  ['tech_hono', 'cat_frameworks', 'Hono', 'hono', 'HNO', '#E36002', 'Beginner', 'coming_soon', 0, 0, ['edge router', 'cloudflare workers', 'fetch api'], 'Ultrafast Web Standard router running seamlessly on Node, Bun, Deno, and edge workers.'],
  ['tech_deno', 'cat_backend', 'Deno', 'deno', 'DNO', '#1D4ED8', 'Intermediate', 'coming_soon', 0, 0, ['typescript runtime', 'sandboxed', 'permissions'], 'Secure-by-default JavaScript and TypeScript runtime with built-in tooling.'],
  ['tech_bun', 'cat_backend', 'Bun', 'bun', 'BUN', '#F59E0B', 'Intermediate', 'coming_soon', 0, 0, ['fast js runtime', 'bundler', 'test runner'], 'All-in-one fast JavaScript runtime, package manager, bundler, and test runner.'],
  ['tech_graphql', 'cat_backend', 'GraphQL', 'graphql', 'GQL', '#E10098', 'Intermediate', 'coming_soon', 0, 0, ['schema api', 'apollo', 'resolvers', 'queries'], 'Strongly typed API query language letting clients request exact nested fields.'],

  // =========================================================
  // D. DATABASES & DATA TECHNOLOGIES (23)
  // =========================================================
  ['tech_mysql', 'cat_db', 'MySQL', 'mysql', 'MY', '#4479A1', 'Beginner', 'in_development', 0, 0, ['innodb', 'rdbms', 'mariadb'], 'Production relational database administration, InnoDB indexing, and transactions.'],
  ['tech_postgres', 'cat_db', 'PostgreSQL', 'postgresql', 'PG', '#336791', 'Intermediate', 'in_development', 1, 12, ['postgres', 'psql', 'jsonb', 'cte'], 'Advanced SQL, JSONB documents, window functions, and relational performance tuning.'],
  ['tech_sqlite', 'cat_db', 'SQLite', 'sqlite', 'SQ3', '#0F80CC', 'Beginner', 'coming_soon', 0, 0, ['embedded sql', 'wal mode', 'local db'], 'Zero-configuration embedded relational database ideal for edge, mobile, and apps.'],
  ['tech_mongo', 'cat_db', 'MongoDB', 'mongodb', 'MG', '#47A248', 'Beginner', 'in_development', 1, 13, ['nosql', 'bson', 'document db', 'mongoose'], 'Document-oriented database with flexible schemas and aggregation pipelines.'],
  ['tech_redis', 'cat_db', 'Redis', 'redis', 'RDS', '#DC382D', 'Intermediate', 'coming_soon', 0, 0, ['in memory cache', 'pub sub', 'streams'], 'In-memory key-value store powering caching, rate limiters, queues, and pub/sub.'],
  ['tech_mariadb', 'cat_db', 'MariaDB', 'mariadb', 'MDB', '#003545', 'Beginner', 'coming_soon', 0, 0, ['mysql fork', 'relational'], 'Community-developed open-source relational database compatible with MySQL.'],
  ['tech_mssql', 'cat_db', 'Microsoft SQL Server', 'sql-server', 'MSSQL', '#CC2927', 'Intermediate', 'coming_soon', 0, 0, ['t-sql', 'azure sql', 'enterprise db'], 'Enterprise relational database platform featuring T-SQL and BI integrations.'],
  ['tech_oracle', 'cat_db', 'Oracle Database', 'oracle-database', 'ORA', '#F80000', 'Advanced', 'coming_soon', 0, 0, ['plsql', 'enterprise rdbms'], 'Multi-model enterprise database engine built for mission-critical workloads.'],
  ['tech_firebase', 'cat_db', 'Firebase', 'firebase', 'FB', '#FFCA28', 'Beginner', 'coming_soon', 0, 0, ['firestore', 'realtime db', 'auth'], 'Managed Google app backend offering Firestore NoSQL, authentication, and hosting.'],
  ['tech_supabase', 'cat_db', 'Supabase', 'supabase', 'SB', '#3ECF8E', 'Beginner', 'coming_soon', 0, 0, ['postgres baas', 'row level security', 'realtime'], 'Open-source Postgres developer platform with Auth, Row-Level Security, and storage.'],
  ['tech_cassandra', 'cat_db', 'Apache Cassandra', 'cassandra', 'CAS', '#1287B1', 'Advanced', 'coming_soon', 0, 0, ['wide column', 'distributed nosql'], 'Masterless distributed wide-column NoSQL store built for linear write scalability.'],
  ['tech_couchdb', 'cat_db', 'CouchDB', 'couchdb', 'CDB', '#E42528', 'Intermediate', 'coming_soon', 0, 0, ['offline sync', 'json documents', 'http api'], 'Document database featuring HTTP REST APIs and multi-master offline replication.'],
  ['tech_dynamodb', 'cat_db', 'Amazon DynamoDB', 'dynamodb', 'DDB', '#4053D6', 'Intermediate', 'coming_soon', 0, 0, ['aws nosql', 'single table design'], 'Serverless AWS key-value and document database delivering single-digit ms latency.'],
  ['tech_elasticsearch', 'cat_db', 'Elasticsearch', 'elasticsearch', 'ES', '#005571', 'Intermediate', 'coming_soon', 0, 0, ['full text search', 'lucene', 'kibana'], 'Distributed full-text search and analytics engine built atop Apache Lucene.'],
  ['tech_neo4j', 'cat_db', 'Neo4j', 'neo4j', 'NEO', '#018BFF', 'Intermediate', 'coming_soon', 0, 0, ['graph database', 'cypher', 'knowledge graph'], 'Native graph database for connected relationships, recommendations, and Cypher queries.'],
  ['tech_influxdb', 'cat_db', 'InfluxDB', 'influxdb', 'INF', '#22ADF6', 'Intermediate', 'coming_soon', 0, 0, ['time series', 'iot telemetry', 'metrics'], 'Time-series database purpose-built for sensor telemetry, DevOps metrics, and logs.'],
  ['tech_clickhouse', 'cat_db', 'ClickHouse', 'clickhouse', 'CH', '#D97706', 'Advanced', 'coming_soon', 0, 0, ['olap', 'columnar analytics', 'fast sql'], 'Column-oriented OLAP database executing analytical aggregations over billions of rows.'],
  ['tech_cockroachdb', 'cat_db', 'CockroachDB', 'cockroachdb', 'CRDB', '#6933FF', 'Advanced', 'coming_soon', 0, 0, ['distributed sql', 'raft', 'resilient'], 'Geo-distributed transactional SQL database surviving region outages cleanly.'],
  ['tech_planetscale', 'cat_db', 'PlanetScale', 'planetscale', 'PSC', '#1E293B', 'Intermediate', 'coming_soon', 0, 0, ['vitess', 'mysql branching', 'serverless sql'], 'Vitess-powered MySQL database platform with non-blocking schema branching.'],
  ['tech_prisma', 'cat_db', 'Prisma', 'prisma', 'PRS', '#2D3748', 'Beginner', 'coming_soon', 0, 0, ['typescript orm', 'migrations', 'schema'], 'Type-safe TypeScript and Node.js ORM with declarative schemas and migrations.'],
  ['tech_drizzle', 'cat_db', 'Drizzle ORM', 'drizzle-orm', 'DRZ', '#65A30D', 'Intermediate', 'coming_soon', 0, 0, ['sql builder', 'typescript orm'], 'Lightweight headless TypeScript SQL query builder and relational ORM.'],
  ['tech_duckdb', 'cat_db', 'DuckDB', 'duckdb', 'DCK', '#EAB308', 'Intermediate', 'coming_soon', 0, 0, ['embedded olap', 'parquet', 'analytics'], 'In-process analytical SQL database processing Parquet and CSV datasets rapidly.'],
  ['tech_snowflake', 'cat_db', 'Snowflake', 'snowflake', 'SNW', '#29B5E8', 'Intermediate', 'coming_soon', 0, 0, ['cloud data warehouse', 'analytics sql'], 'Elastic cloud data warehouse separating storage from multi-cluster SQL compute.'],

  // =========================================================
  // E. MOBILE DEVELOPMENT (13)
  // =========================================================
  ['tech_flutter', 'cat_mobile', 'Flutter', 'flutter', 'FL', '#02569B', 'Beginner', 'in_development', 0, 0, ['cross platform', 'widgets', 'dart ui'], 'Cross-platform mobile, web, and desktop UI toolkit compiled to native ARM code.'],
  ['tech_react_native', 'cat_mobile', 'React Native', 'react-native', 'RN', '#0EA5E9', 'Intermediate', 'coming_soon', 0, 0, ['ios android js', 'native modules'], 'Build native iOS and Android apps using React components and JavaScript/TypeScript.'],
  ['tech_android_sdk', 'cat_mobile', 'Android SDK', 'android-sdk', 'AND', '#3DDC84', 'Intermediate', 'coming_soon', 0, 0, ['android studio', 'gradle', 'activities'], 'Official Android platform APIs, lifecycle components, Gradle builds, and tooling.'],
  ['tech_jetpack_compose', 'cat_mobile', 'Jetpack Compose', 'jetpack-compose', 'JPC', '#4285F4', 'Intermediate', 'coming_soon', 0, 0, ['kotlin ui', 'declarative android'], 'Modern declarative UI toolkit for building native Android screens in Kotlin.'],
  ['tech_swiftui', 'cat_mobile', 'SwiftUI', 'swiftui', 'SWUI', '#007AFF', 'Beginner', 'coming_soon', 0, 0, ['apple ui', 'declarative ios', 'macos'], 'Declarative Apple UI framework building apps across iOS, iPadOS, and macOS.'],
  ['tech_ionic', 'cat_mobile', 'Ionic', 'ionic', 'ION', '#3880FF', 'Beginner', 'coming_soon', 0, 0, ['hybrid mobile', 'web components'], 'Web-standard mobile UI toolkit targeting iOS, Android, and PWAs from one codebase.'],
  ['tech_capacitor', 'cat_mobile', 'Capacitor', 'capacitor', 'CAP', '#119EFF', 'Intermediate', 'coming_soon', 0, 0, ['native bridge', 'pwa to native'], 'Cross-platform native runtime bridging web apps to device camera, storage, and APIs.'],
  ['tech_nativescript', 'cat_mobile', 'NativeScript', 'nativescript', 'NS', '#65ADF1', 'Intermediate', 'coming_soon', 0, 0, ['native api js', 'mobile'], 'Direct native iOS and Android API access from JavaScript or TypeScript.'],
  ['tech_xamarin', 'cat_mobile', 'Xamarin', 'xamarin', 'XAM', '#3498DB', 'Intermediate', 'coming_soon', 0, 0, ['csharp mobile', 'legacy dotnet'], 'Classic C#/.NET framework for shared cross-platform mobile business logic.'],
  ['tech_maui', 'cat_mobile', '.NET MAUI', 'dotnet-maui', 'MAUI', '#512BD4', 'Intermediate', 'coming_soon', 0, 0, ['multi platform app ui', 'csharp mobile'], 'Modern .NET Multi-platform App UI framework unifying iOS, Android, Windows, and macOS.'],
  ['tech_expo', 'cat_mobile', 'Expo', 'expo', 'EXP', '#1E293B', 'Beginner', 'coming_soon', 0, 0, ['react native platform', 'eas build'], 'Universal React Native development framework simplifying builds, routing, and OTA updates.'],
  ['tech_kmp', 'cat_mobile', 'Kotlin Multiplatform', 'kotlin-multiplatform', 'KMP', '#7F52FF', 'Advanced', 'coming_soon', 0, 0, ['kmm', 'shared mobile logic'], 'Share business, networking, and persistence code in Kotlin across iOS and Android.'],
  ['tech_xcode', 'cat_mobile', 'Xcode', 'xcode', 'XC', '#147EFB', 'Beginner', 'coming_soon', 0, 0, ['apple ide', 'simulator', 'instruments'], 'Apple IDE, iOS simulator, Swift debugger, and performance profiler.'],

  // =========================================================
  // F. ARTIFICIAL INTELLIGENCE & DATA SCIENCE (25)
  // =========================================================
  ['tech_ai', 'cat_ai', 'Artificial Intelligence', 'artificial-intelligence', 'AI', '#0A84FF', 'Beginner', 'in_development', 1, 18, ['genai', 'llm', 'prompt engineering', 'agents'], 'Server-side LLM orchestration, prompt guardrails, structured schemas, and workflows.'],
  ['tech_ml', 'cat_ai', 'Machine Learning', 'machine-learning', 'ML', '#2563EB', 'Intermediate', 'coming_soon', 0, 0, ['supervised learning', 'regression', 'classification'], 'Feature engineering, regression, classification, and model validation metrics.'],
  ['tech_tensorflow', 'cat_ai', 'TensorFlow', 'tensorflow', 'TF', '#FF6F00', 'Intermediate', 'in_development', 0, 0, ['tf', 'neural networks', 'deep learning'], 'End-to-end machine learning framework for training and deploying neural models.'],
  ['tech_pytorch', 'cat_ai', 'PyTorch', 'pytorch', 'PT', '#EE4C2C', 'Intermediate', 'in_development', 1, 19, ['torch', 'tensors', 'autograd', 'transformers'], 'Dynamic computation-graph deep learning framework widely used in AI research.'],
  ['tech_keras', 'cat_ai', 'Keras', 'keras', 'KRS', '#D00000', 'Beginner', 'coming_soon', 0, 0, ['high level neural nets', 'layers'], 'Clean high-level neural network API supporting PyTorch, JAX, and TensorFlow.'],
  ['tech_sklearn', 'cat_ai', 'Scikit-learn', 'scikit-learn', 'SKL', '#F7931E', 'Beginner', 'coming_soon', 0, 0, ['sklearn', 'random forest', 'pipelines'], 'Essential Python machine learning toolkit for preprocessing, clustering, and trees.'],
  ['tech_huggingface', 'cat_ai', 'Hugging Face', 'hugging-face', 'HF', '#EAB308', 'Intermediate', 'coming_soon', 0, 0, ['transformers', 'tokenizers', 'open weights'], 'Model hub, Transformers library, tokenizers, and fine-tuning ecosystems.'],
  ['tech_langchain', 'cat_ai', 'LangChain', 'langchain', 'LC', '#0F766E', 'Intermediate', 'coming_soon', 0, 0, ['rag', 'chains', 'agents', 'llm orchestration'], 'Orchestration framework for tool-using LLM chains, memory, and retrieval apps.'],
  ['tech_llamaindex', 'cat_ai', 'LlamaIndex', 'llamaindex', 'LI', '#7C3AED', 'Intermediate', 'coming_soon', 0, 0, ['rag indexing', 'vector retrieval'], 'Data framework connecting private documents and vector stores to LLM applications.'],
  ['tech_opencv', 'cat_ai', 'OpenCV', 'opencv', 'CV', '#5C3EE8', 'Intermediate', 'coming_soon', 0, 0, ['computer vision', 'image processing'], 'Open-source computer vision library for image filtering, tracking, and detection.'],
  ['tech_pandas', 'cat_ds', 'Pandas', 'pandas', 'PD', '#150458', 'Beginner', 'coming_soon', 0, 0, ['dataframe', 'csv cleaning', 'tabular python'], 'Python DataFrame library for cleaning, merging, pivoting, and analyzing tabular data.'],
  ['tech_numpy', 'cat_ds', 'NumPy', 'numpy', 'NP', '#013243', 'Beginner', 'coming_soon', 0, 0, ['ndarray', 'vectorization', 'python math'], 'Foundational N-dimensional array computing package powering Python data science.'],
  ['tech_jupyter', 'cat_ds', 'Jupyter', 'jupyter', 'JPY', '#F37626', 'Beginner', 'coming_soon', 0, 0, ['notebooks', 'ipython', 'jupyterlab'], 'Interactive computational notebooks blending live code, equations, and plots.'],
  ['tech_spark', 'cat_ds', 'Apache Spark', 'apache-spark', 'SPK', '#E25A1C', 'Advanced', 'coming_soon', 0, 0, ['pyspark', 'distributed dataframes'], 'Unified distributed analytics engine processing large-scale batch and streaming data.'],
  ['tech_mlflow', 'cat_ai', 'MLflow', 'mlflow', 'MLF', '#0194E2', 'Intermediate', 'coming_soon', 0, 0, ['experiment tracking', 'model registry'], 'Open-source MLOps lifecycle platform for tracking metrics, runs, and model versions.'],
  ['tech_scipy', 'cat_ds', 'SciPy', 'scipy', 'SCI', '#8CAAE6', 'Intermediate', 'coming_soon', 0, 0, ['optimization', 'statistics', 'integrals'], 'Scientific Python algorithms for optimization, linear algebra, and signal processing.'],
  ['tech_matplotlib', 'cat_ds', 'Matplotlib', 'matplotlib', 'PLT', '#11557C', 'Beginner', 'coming_soon', 0, 0, ['python charts', 'plotting', 'figures'], 'Versatile Python plotting library for static, publication-grade visualizations.'],
  ['tech_seaborn', 'cat_ds', 'Seaborn', 'seaborn', 'SNS', '#4C72B0', 'Beginner', 'coming_soon', 0, 0, ['statistical plots', 'heatmaps'], 'High-level statistical data visualization library built atop Matplotlib.'],
  ['tech_plotly', 'cat_ds', 'Plotly', 'plotly', 'PLY', '#3F4F75', 'Beginner', 'coming_soon', 0, 0, ['interactive charts', 'dash'], 'Interactive browser-based graphing library for Python, R, and JavaScript dashboards.'],
  ['tech_xgboost', 'cat_ai', 'XGBoost', 'xgboost', 'XGB', '#0284C7', 'Intermediate', 'coming_soon', 0, 0, ['gradient boosting', 'tabular ml'], 'Optimized gradient-boosted decision tree library dominating tabular ML tasks.'],
  ['tech_lightgbm', 'cat_ai', 'LightGBM', 'lightgbm', 'LGB', '#10B981', 'Intermediate', 'coming_soon', 0, 0, ['fast boosting', 'leaf wise'], 'Fast histogram-based gradient boosting framework designed for large datasets.'],
  ['tech_onnx', 'cat_ai', 'ONNX', 'onnx', 'ONX', '#005CED', 'Advanced', 'coming_soon', 0, 0, ['model portability', 'inference runtime'], 'Open neural network interchange format enabling cross-runtime model inference.'],
  ['tech_ollama', 'cat_ai', 'Ollama', 'ollama', 'OLM', '#1E293B', 'Beginner', 'coming_soon', 0, 0, ['local llm', 'gguf', 'self hosted ai'], 'Local open-weight language model runner for private developer workflows.'],
  ['tech_airflow', 'cat_ds', 'Apache Airflow', 'apache-airflow', 'AFW', '#017CEE', 'Intermediate', 'coming_soon', 0, 0, ['dags', 'etl pipelines', 'scheduling'], 'Python-defined DAG workflow orchestrator for scheduled data and ETL pipelines.'],
  ['tech_dbt', 'cat_ds', 'dbt', 'dbt', 'DBT', '#FF694B', 'Intermediate', 'coming_soon', 0, 0, ['analytics engineering', 'sql models'], 'Transform raw warehouse tables into tested, documented SQL models cleanly.'],

  // =========================================================
  // G. CLOUD, DEVOPS & INFRASTRUCTURE (25)
  // =========================================================
  ['tech_aws', 'cat_cloud', 'AWS', 'aws', 'AWS', '#FF9900', 'Intermediate', 'in_development', 1, 20, ['amazon web services', 's3', 'ec2', 'iam', 'lambda'], 'Cloud compute, object storage, IAM boundaries, and managed infrastructure.'],
  ['tech_azure', 'cat_cloud', 'Microsoft Azure', 'azure', 'AZ', '#0078D4', 'Intermediate', 'in_development', 0, 0, ['azure cloud', 'entra id', 'aks'], 'Enterprise cloud workloads, container apps, identity, and DevOps pipelines.'],
  ['tech_gcp', 'cat_cloud', 'Google Cloud', 'google-cloud', 'GCP', '#4285F4', 'Intermediate', 'coming_soon', 0, 0, ['cloud run', 'gke', 'bigquery'], 'Managed serverless containers, Cloud SQL, Kubernetes, and BigQuery analytics.'],
  ['tech_docker', 'cat_devops', 'Docker', 'docker', 'DK', '#2496ED', 'Beginner', 'available', 1, 21, ['containers', 'dockerfile', 'compose'], 'Deterministic container images, multi-stage builds, and local compose stacks.'],
  ['tech_kubernetes', 'cat_devops', 'Kubernetes', 'kubernetes', 'K8S', '#326CE5', 'Advanced', 'in_development', 1, 22, ['k8s', 'pods', 'deployments', 'orchestration'], 'Automated container scheduling, service discovery, rolling updates, and scaling.'],
  ['tech_terraform', 'cat_devops', 'Terraform', 'terraform', 'TFM', '#7B42BC', 'Intermediate', 'coming_soon', 0, 0, ['iac', 'hcl', 'infrastructure as code'], 'Declarative infrastructure-as-code provisioning across AWS, GCP, Azure, and DNS.'],
  ['tech_ansible', 'cat_devops', 'Ansible', 'ansible', 'ANS', '#EE0000', 'Intermediate', 'coming_soon', 0, 0, ['playbooks', 'configuration management', 'ssh'], 'Agentless YAML automation for server configuration and application deployments.'],
  ['tech_jenkins', 'cat_devops', 'Jenkins', 'jenkins', 'JNK', '#D24939', 'Intermediate', 'coming_soon', 0, 0, ['ci cd', 'jenkinsfile', 'pipelines'], 'Extensible open-source automation server for build, test, and deployment stages.'],
  ['tech_gh_actions', 'cat_devops', 'GitHub Actions', 'github-actions', 'GHA', '#2088FF', 'Beginner', 'coming_soon', 0, 0, ['workflows', 'yaml ci', 'runners'], 'Event-driven CI/CD pipelines running automated tests directly inside GitHub repos.'],
  ['tech_gitlab_ci', 'cat_devops', 'GitLab CI', 'gitlab-ci', 'GLCI', '#FC6D26', 'Intermediate', 'coming_soon', 0, 0, ['gitlab runners', 'ci yaml'], 'Integrated GitLab build, security scanning, and container deployment pipelines.'],
  ['tech_nginx', 'cat_devops', 'Nginx', 'nginx', 'NGX', '#009639', 'Intermediate', 'coming_soon', 0, 0, ['reverse proxy', 'load balancer', 'tls'], 'High-performance HTTP server, reverse proxy, TLS terminator, and load balancer.'],
  ['tech_apache_http', 'cat_devops', 'Apache HTTP Server', 'apache-http', 'APA', '#D22128', 'Intermediate', 'coming_soon', 0, 0, ['httpd', 'htaccess', 'virtual hosts'], 'Modular cross-platform HTTP web server supporting virtual hosts and modules.'],
  ['tech_linux', 'cat_devops', 'Linux', 'linux', 'LX', '#D97706', 'Beginner', 'in_development', 1, 23, ['ubuntu', 'debian', 'kernel', 'posix', 'systemd'], 'Shell workflows, file permissions, systemd services, and server administration.'],
  ['tech_vercel', 'cat_cloud', 'Vercel', 'vercel', 'VRC', '#18181B', 'Beginner', 'coming_soon', 0, 0, ['edge deploy', 'preview urls', 'serverless'], 'Frontend cloud platform offering Git-triggered preview builds and edge hosting.'],
  ['tech_netlify', 'cat_cloud', 'Netlify', 'netlify', 'NTL', '#00C7B7', 'Beginner', 'coming_soon', 0, 0, ['jamstack', 'edge functions', 'static deploy'], 'Automated web hosting platform with serverless functions and instant rollbacks.'],
  ['tech_cloudflare', 'cat_cloud', 'Cloudflare', 'cloudflare', 'CF', '#F38020', 'Intermediate', 'coming_soon', 0, 0, ['cdn', 'workers', 'waf', 'dns'], 'Global edge network providing DNS, CDN caching, WAF protection, and Workers.'],
  ['tech_prometheus', 'cat_devops', 'Prometheus', 'prometheus', 'PRM', '#E6522C', 'Intermediate', 'coming_soon', 0, 0, ['promql', 'metrics scraping', 'alerting'], 'Pull-based time-series monitoring system and PromQL alerting engine.'],
  ['tech_grafana', 'cat_devops', 'Grafana', 'grafana', 'GRF', '#F46800', 'Beginner', 'coming_soon', 0, 0, ['dashboards', 'observability', 'logs'], 'Unified observability dashboards visualizing metrics, traces, and alert states.'],
  ['tech_helm', 'cat_devops', 'Helm', 'helm', 'HLM', '#0F1689', 'Intermediate', 'coming_soon', 0, 0, ['kubernetes charts', 'package manager'], 'Package manager templating versioned Kubernetes deployments via Charts.'],
  ['tech_argocd', 'cat_devops', 'Argo CD', 'argo-cd', 'ARGO', '#EF7B4D', 'Advanced', 'coming_soon', 0, 0, ['gitops', 'kubernetes continuous delivery'], 'Declarative GitOps continuous delivery controller syncing cluster manifests.'],
  ['tech_vagrant', 'cat_devops', 'Vagrant', 'vagrant', 'VAG', '#1868F2', 'Beginner', 'coming_soon', 0, 0, ['virtualbox', 'reproducible vm'], 'Command-line workflow managing portable virtualized development machines.'],
  ['tech_vault', 'cat_devops', 'HashiCorp Vault', 'hashicorp-vault', 'VLT', '#4B5563', 'Advanced', 'coming_soon', 0, 0, ['secrets management', 'pki', 'dynamic creds'], 'Centralized secrets engine, encryption-as-a-service, and dynamic lease manager.'],
  ['tech_pulumi', 'cat_devops', 'Pulumi', 'pulumi', 'PLM', '#8A3391', 'Intermediate', 'coming_soon', 0, 0, ['typescript iac', 'python cloud'], 'Infrastructure as code written in familiar languages like TypeScript and Python.'],
  ['tech_caddy', 'cat_devops', 'Caddy', 'caddy', 'CDY', '#1F88C9', 'Beginner', 'coming_soon', 0, 0, ['auto https', 'reverse proxy'], 'Modern HTTP/3 web server featuring automatic Let’s Encrypt TLS certificates.'],
  ['tech_kafka', 'cat_cloud', 'Apache Kafka', 'apache-kafka', 'KFK', '#231F20', 'Advanced', 'coming_soon', 0, 0, ['event streaming', 'topics', 'partitions'], 'Distributed fault-tolerant event streaming log for high-volume microservices.'],

  // =========================================================
  // H. CYBERSECURITY, NETWORKING & CS FUNDAMENTALS (21)
  // =========================================================
  ['tech_cybersec', 'cat_sec', 'Cybersecurity', 'cybersecurity', 'SEC', '#EF4444', 'Beginner', 'available', 1, 24, ['appsec', 'infosec', 'hashing', 'rbac'], 'Threat modeling, OWASP defenses, salted hashing, and application hardening.'],
  ['tech_wireshark', 'cat_sec', 'Wireshark', 'wireshark', 'WS', '#1679A7', 'Intermediate', 'coming_soon', 0, 0, ['packet capture', 'pcap', 'tcp inspection'], 'Network protocol analyzer for inspecting live packets, DNS, TLS, and TCP streams.'],
  ['tech_nmap', 'cat_sec', 'Nmap', 'nmap', 'NMP', '#3B82F6', 'Intermediate', 'coming_soon', 0, 0, ['port scanner', 'network discovery'], 'Network discovery and defensive port auditing tool for service verification.'],
  ['tech_metasploit', 'cat_sec', 'Metasploit', 'metasploit', 'MSF', '#2596BE', 'Advanced', 'coming_soon', 0, 0, ['penetration testing', 'authorized audit'], 'Authorized security assessment framework for validating patch remediation.'],
  ['tech_burpsuite', 'cat_sec', 'Burp Suite', 'burp-suite', 'BRP', '#FF6633', 'Intermediate', 'coming_soon', 0, 0, ['http proxy', 'web app security'], 'Intercepting web security proxy for testing HTTP headers, cookies, and auth flows.'],
  ['tech_owasp', 'cat_sec', 'OWASP', 'owasp', 'OWSP', '#1E293B', 'Beginner', 'coming_soon', 0, 0, ['top 10', 'xss', 'csrf', 'sqli'], 'Industry security standards covering injection prevention, access control, and XSS.'],
  ['tech_kali', 'cat_sec', 'Kali Linux', 'kali-linux', 'KLI', '#268BEE', 'Intermediate', 'coming_soon', 0, 0, ['security distro', 'defensive lab'], 'Debian-based security auditing distribution pre-packaged with diagnostic utilities.'],
  ['tech_cisco', 'cat_net', 'Cisco Networking', 'cisco-networking', 'CSC', '#049FD9', 'Intermediate', 'coming_soon', 0, 0, ['ccna', 'routing', 'vlans', 'switching'], 'Enterprise routing, VLAN segmentation, switching, and IOS configuration basics.'],
  ['tech_linux_sec', 'cat_sec', 'Linux Security', 'linux-security', 'LSEC', '#DC2626', 'Intermediate', 'coming_soon', 0, 0, ['ufw', 'ssh hardening', 'selinux', 'sudo'], 'SSH key hardening, UFW/nftables firewalls, least-privilege sudoers, and auditing.'],
  ['tech_crypto', 'cat_sec', 'Cryptography', 'cryptography', 'CRP', '#7C3AED', 'Intermediate', 'coming_soon', 0, 0, ['aes', 'rsa', 'sha256', 'hmac', 'tls'], 'Symmetric ciphers, public-key signatures, key derivation, and TLS handshakes.'],
  ['tech_network_fund', 'cat_net', 'Network Fundamentals', 'network-fundamentals', 'NET', '#0EA5E9', 'Beginner', 'coming_soon', 0, 0, ['tcp ip', 'dns', 'http', 'subnetting', 'osi'], 'IPv4/IPv6 subnetting, DNS resolution, HTTP/2 semantics, and TCP congestion control.'],
  ['tech_openssl', 'cat_sec', 'OpenSSL', 'openssl', 'SSL', '#721412', 'Intermediate', 'coming_soon', 0, 0, ['x509', 'certificates', 'tls'], 'Command-line cryptography toolkit for inspecting TLS handshakes and X.509 certs.'],
  ['tech_wireshark_tcp', 'cat_net', 'DNS & Routing', 'dns-routing', 'DNS', '#0284C7', 'Intermediate', 'coming_soon', 0, 0, ['bgp', 'cname', 'mx', 'spf'], 'Authoritative DNS records, TTL propagation, BGP routing, and load balancing.'],
  ['tech_dsa', 'cat_cs', 'Data Structures', 'data-structures', 'DS', '#0A84FF', 'Intermediate', 'coming_soon', 0, 0, ['arrays', 'linked lists', 'trees', 'heaps'], 'Arrays, hash tables, stacks, queues, trees, heaps, and graph representations.'],
  ['tech_os_concepts', 'cat_cs', 'Operating Systems', 'operating-systems', 'OS', '#475569', 'Intermediate', 'coming_soon', 0, 0, ['threads', 'virtual memory', 'syscalls', 'scheduling'], 'Processes, threads, mutexes, CPU scheduling, virtual memory, and file descriptors.'],
  ['tech_comp_arch', 'cat_cs', 'Computer Architecture', 'computer-architecture', 'CPU', '#64748B', 'Intermediate', 'coming_soon', 0, 0, ['cpu cache', 'alu', 'pipelining', 'logic gates'], 'Boolean logic gates, binary arithmetic, CPU caches, and instruction pipelines.'],
  ['tech_sys_design', 'cat_cs', 'System Design', 'system-design', 'SYS', '#0D9488', 'Advanced', 'coming_soon', 0, 0, ['sharding', 'caching', 'rate limiting', 'cap'], 'Load balancing, database sharding, queues, rate limiters, and fault tolerance.'],
  ['tech_discrete_math', 'cat_cs', 'Discrete Mathematics', 'discrete-mathematics', 'MTH', '#4F46E5', 'Intermediate', 'coming_soon', 0, 0, ['logic', 'sets', 'combinatorics', 'graphs'], 'Propositional logic, proofs, modular arithmetic, combinatorics, and graph theory.'],
  ['tech_compilers', 'cat_cs', 'Compilers & Parsers', 'compilers-parsers', 'AST', '#9333EA', 'Advanced', 'coming_soon', 0, 0, ['lexer', 'ast', 'bytecode', 'llvm'], 'Lexical scanning, recursive-descent parsing, ASTs, and code generation basics.'],
  ['tech_snort', 'cat_sec', 'Snort', 'snort', 'SNT', '#E11D48', 'Advanced', 'coming_soon', 0, 0, ['ids', 'ips', 'packet rules'], 'Open-source network intrusion detection and traffic rule signature engine.'],
  ['tech_zeek', 'cat_sec', 'Zeek', 'zeek', 'ZEEK', '#0369A1', 'Advanced', 'coming_soon', 0, 0, ['network monitor', 'conn log'], 'Passive network security monitor transforming traffic into structured logs.'],

  // =========================================================
  // I. DESIGN, GRAPHICS & CONTENT PLATFORMS (15)
  // =========================================================
  ['tech_figma', 'cat_uiux', 'Figma', 'figma', 'FIG', '#F24E1E', 'Beginner', 'in_development', 1, 25, ['prototyping', 'auto layout', 'design systems'], 'Collaborative browser UI/UX design, Auto Layout, components, and prototyping.'],
  ['tech_photoshop', 'cat_design', 'Adobe Photoshop', 'adobe-photoshop', 'PS', '#31A8FF', 'Beginner', 'coming_soon', 0, 0, ['raster editing', 'retouching', 'layers'], 'Industry raster image compositing, color grading, masking, and asset export.'],
  ['tech_illustrator', 'cat_design', 'Adobe Illustrator', 'adobe-illustrator', 'AI*', '#FF9A00', 'Intermediate', 'coming_soon', 0, 0, ['vector art', 'bezier', 'svg', 'logos'], 'Precision vector graphics, typography, icon grids, and brand identity systems.'],
  ['tech_coreldraw', 'cat_design', 'CorelDRAW', 'coreldraw', 'CDR', '#45A248', 'Beginner', 'coming_soon', 0, 0, ['print vector', 'page layout'], 'Vector illustration, typography, and print-ready layout production software.'],
  ['tech_canva', 'cat_design', 'Canva', 'canva', 'CNV', '#00C4CC', 'Beginner', 'coming_soon', 0, 0, ['social graphics', 'presentations'], 'Accessible visual communication studio for brand kits, slides, and graphics.'],
  ['tech_blender', 'cat_design', 'Blender', 'blender', 'BLD', '#F5792A', 'Intermediate', 'coming_soon', 0, 0, ['3d modeling', 'cycles', 'eevee', 'animation'], 'Open-source 3D modeling, sculpting, PBR shading, rigging, and rendering suite.'],
  ['tech_framer', 'cat_uiux', 'Framer', 'framer', 'FRM', '#0055FF', 'Beginner', 'coming_soon', 0, 0, ['interactive prototype', 'web design'], 'Interactive design and publishing canvas for responsive visual web experiences.'],
  ['tech_webflow', 'cat_uiux', 'Webflow', 'webflow', 'WF', '#146EF5', 'Beginner', 'coming_soon', 0, 0, ['visual css', 'cms', 'responsive'], 'Visual CSS box-model and CMS builder exporting clean semantic HTML/CSS.'],
  ['tech_wordpress', 'cat_web', 'WordPress', 'wordpress', 'WP', '#21759B', 'Beginner', 'coming_soon', 0, 0, ['gutenberg', 'themes', 'plugins', 'php cms'], 'Extensible open-source CMS powering custom themes, blocks, and web publishing.'],
  ['tech_elementor', 'cat_web', 'Elementor', 'elementor', 'ELM', '#92003B', 'Beginner', 'coming_soon', 0, 0, ['wordpress builder', 'responsive layouts'], 'Visual drag-and-drop page architecture and theme builder for WordPress sites.'],
  ['tech_adobe_xd', 'cat_uiux', 'Adobe XD', 'adobe-xd', 'XD', '#FF61F6', 'Beginner', 'coming_soon', 0, 0, ['wireframes', 'ui prototypes'], 'Vector wireframing, interactive flows, and UI specification tooling.'],
  ['tech_sketch', 'cat_uiux', 'Sketch', 'sketch', 'SKT', '#FDB300', 'Beginner', 'coming_soon', 0, 0, ['mac ui design', 'symbols'], 'macOS native vector interface design platform with nested symbols and libraries.'],
  ['tech_inkscape', 'cat_design', 'Inkscape', 'inkscape', 'INK', '#1E293B', 'Beginner', 'coming_soon', 0, 0, ['open source svg', 'vector editor'], 'Free open-source SVG vector graphics editor for clean icons and diagrams.'],
  ['tech_gimp', 'cat_design', 'GIMP', 'gimp', 'GMP', '#5C5543', 'Beginner', 'coming_soon', 0, 0, ['open source raster', 'photo editor'], 'Cross-platform open-source raster image editing, color correction, and export.'],
  ['tech_design_systems', 'cat_uiux', 'Design Systems', 'design-systems', 'DSY', '#6366F1', 'Intermediate', 'coming_soon', 0, 0, ['tokens', 'accessibility', 'wcag', 'typography'], 'Token hierarchies, accessible contrast ratios, spacing scales, and UI governance.'],

  // =========================================================
  // J. DEVELOPER TOOLS, TESTING, GAME DEV & ROBOTICS (25)
  // =========================================================
  ['tech_git', 'cat_tools', 'Git', 'git', 'GIT', '#F05032', 'Beginner', 'available', 1, 26, ['version control', 'commit', 'rebase', 'branching'], 'Distributed version control, branching, rebasing, and commit history auditing.'],
  ['tech_github', 'cat_tools', 'GitHub', 'github', 'GH', '#1F2937', 'Beginner', 'coming_soon', 0, 0, ['pull requests', 'code review', 'issues'], 'Pull requests, code reviews, repository hosting, and open-source collaboration.'],
  ['tech_gitlab', 'cat_tools', 'GitLab', 'gitlab', 'GL', '#FC6D26', 'Beginner', 'coming_soon', 0, 0, ['merge requests', 'devops platform'], 'Single-application Git hosting, merge reviews, registries, and issue boards.'],
  ['tech_vscode', 'cat_tools', 'VS Code', 'vscode', 'VSC', '#007ACC', 'Beginner', 'coming_soon', 0, 0, ['visual studio code', 'extensions', 'debugger'], 'Extensible code editor with integrated terminal, Git lens, and LSP diagnostics.'],
  ['tech_visualstudio', 'cat_tools', 'Visual Studio', 'visual-studio', 'VS', '#5C2D91', 'Intermediate', 'coming_soon', 0, 0, ['ide', 'msbuild', 'dotnet debugger'], 'Full-featured Windows/Mac IDE for .NET, C++, profiling, and enterprise apps.'],
  ['tech_intellij', 'cat_tools', 'IntelliJ IDEA', 'intellij-idea', 'IJ', '#FE315D', 'Intermediate', 'coming_soon', 0, 0, ['jetbrains', 'java ide', 'refactoring'], 'Intelligent JVM IDE for refactoring, debugging, Maven/Gradle, and Spring Boot.'],
  ['tech_postman', 'cat_tools', 'Postman', 'postman', 'PM', '#FF6C37', 'Beginner', 'coming_soon', 0, 0, ['api testing', 'collections', 'rest client'], 'API collaboration client for building requests, environment vars, and contract tests.'],
  ['tech_insomnia', 'cat_tools', 'Insomnia', 'insomnia', 'INS', '#5849BE', 'Beginner', 'coming_soon', 0, 0, ['rest graphql client', 'openapi'], 'Clean open-source HTTP, GraphQL, and gRPC API debugging workspace.'],
  ['tech_npm', 'cat_tools', 'npm', 'npm', 'NPM', '#CB3837', 'Beginner', 'coming_soon', 0, 0, ['node packages', 'package.json', 'scripts'], 'Default Node.js package registry, lockfile manager, and project script runner.'],
  ['tech_pnpm', 'cat_tools', 'pnpm', 'pnpm', 'PNPM', '#F69220', 'Beginner', 'coming_soon', 0, 0, ['content addressable store', 'workspaces'], 'Fast disk-efficient JavaScript package manager with strict node_modules isolation.'],
  ['tech_yarn', 'cat_tools', 'Yarn', 'yarn', 'YRN', '#2C8EBB', 'Beginner', 'coming_soon', 0, 0, ['berry', 'workspaces', 'js packages'], 'Reliable JavaScript package manager supporting workspaces and plug-and-play builds.'],
  ['tech_vite', 'cat_tools', 'Vite', 'vite', 'VT', '#646CFF', 'Beginner', 'coming_soon', 0, 0, ['esm bundler', 'dev server', 'rollup'], 'Next-generation frontend build tool with instant ESM dev startup and bundling.'],
  ['tech_webpack', 'cat_tools', 'Webpack', 'webpack', 'WPK', '#8DD6F9', 'Intermediate', 'coming_soon', 0, 0, ['module bundler', 'loaders', 'code splitting'], 'Configurable static module bundler with loaders, plugins, and chunk splitting.'],
  ['tech_eslint', 'cat_tools', 'ESLint', 'eslint', 'ESL', '#4B32C3', 'Beginner', 'coming_soon', 0, 0, ['linting', 'static analysis', 'js rules'], 'Pluggable static linter catching syntax mistakes and code-quality issues early.'],
  ['tech_prettier', 'cat_tools', 'Prettier', 'prettier', 'PRT', '#F7B93E', 'Beginner', 'coming_soon', 0, 0, ['code formatter', 'ast formatting'], 'Opinionated automated code formatter enforcing consistent style across teams.'],
  ['tech_storybook', 'cat_tools', 'Storybook', 'storybook', 'SBK', '#FF4785', 'Intermediate', 'coming_soon', 0, 0, ['ui workshop', 'component docs', 'visual test'], 'Isolated frontend workshop for developing, documenting, and testing UI states.'],
  ['tech_jest', 'cat_tools', 'Jest', 'jest', 'JST', '#C21325', 'Beginner', 'coming_soon', 0, 0, ['unit testing', 'mocking', 'snapshots'], 'Zero-config JavaScript and TypeScript testing framework with built-in assertions.'],
  ['tech_vitest', 'cat_tools', 'Vitest', 'vitest', 'VST', '#729B1B', 'Beginner', 'coming_soon', 0, 0, ['vite test runner', 'unit tests'], 'Blazing-fast Vite-native unit testing framework with Jest-compatible assertions.'],
  ['tech_playwright', 'cat_tools', 'Playwright', 'playwright', 'PW', '#2EAD33', 'Intermediate', 'coming_soon', 0, 0, ['e2e testing', 'browser automation', 'chromium'], 'Reliable cross-browser end-to-end test framework with auto-waiting locators.'],
  ['tech_cypress', 'cat_tools', 'Cypress', 'cypress', 'CYP', '#17202C', 'Intermediate', 'coming_soon', 0, 0, ['frontend e2e', 'component testing'], 'Interactive browser test runner for debugging frontend end-to-end user journeys.'],
  ['tech_unity', 'cat_game', 'Unity', 'unity', 'UNT', '#1F2937', 'Intermediate', 'coming_soon', 0, 0, ['csharp game dev', '3d 2d engine'], 'Cross-platform 2D and 3D game development engine scripted in C#.'],
  ['tech_unreal', 'cat_game', 'Unreal Engine', 'unreal-engine', 'UE', '#0E1128', 'Advanced', 'coming_soon', 0, 0, ['cpp game engine', 'blueprints', 'lumen'], 'Real-time 3D creation and game engine combining C++ and visual Blueprints.'],
  ['tech_godot', 'cat_game', 'Godot', 'godot', 'GDT', '#478CBF', 'Beginner', 'coming_soon', 0, 0, ['gdscript', 'open source engine', '2d 3d'], 'Lightweight open-source 2D/3D game engine featuring GDScript and scene nodes.'],
  ['tech_arduino', 'cat_robotics', 'Arduino', 'arduino', 'ARD', '#00979D', 'Beginner', 'coming_soon', 0, 0, ['microcontroller', 'gpio', 'sensors', 'iot'], 'Open microcontroller hardware and C++ IDE for sensors, actuators, and robotics.'],
  ['tech_raspberry_pi', 'cat_robotics', 'Raspberry Pi', 'raspberry-pi', 'RPI', '#A22846', 'Beginner', 'coming_soon', 0, 0, ['sbc', 'arm linux', 'gpio python'], 'Credit-card Linux single-board computer for edge computing, IoT, and homelabs.'],
];

export const TECHNOLOGIES_CATALOG: TechCatalogSeed[] = RAW_ENTRIES.map(
  ([
    id,
    categoryId,
    name,
    slug,
    iconSymbol,
    brandColor,
    difficulty,
    contentStatus,
    isPopular,
    featuredOrder,
    aliases,
    description,
    overview,
  ], idx) => ({
    id,
    categoryId,
    name,
    slug,
    description,
    iconSymbol,
    brandColor,
    aliases,
    difficulty,
    contentStatus,
    sortOrder: idx + 1,
    isPopular,
    featuredOrder,
    overviewMarkdown:
      overview ||
      `${name} is a core capability in modern software engineering. Explore its ecosystem overview, syntax examples, recommended learning pathways, and structured curriculum on Braincode.`,
  })
);

// Runtime uniqueness verification so zero duplicate names or slugs ever ship
const seenSlugs = new Set<string>();
const seenNames = new Set<string>();
for (const entry of TECHNOLOGIES_CATALOG) {
  if (seenSlugs.has(entry.slug)) {
    throw new Error(`Duplicate technology slug detected in catalog seed: ${entry.slug}`);
  }
  if (seenNames.has(entry.name.toLowerCase())) {
    throw new Error(`Duplicate technology name detected in catalog seed: ${entry.name}`);
  }
  seenSlugs.add(entry.slug);
  seenNames.add(entry.name.toLowerCase());
}
