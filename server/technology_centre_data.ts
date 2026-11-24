export interface LearningCentreSectionDef {
  id: string;
  label: string;
  group: 'curriculum' | 'practice' | 'planning' | 'certification' | 'reference';
  order: number;
  summary: string;
}

export interface TopicItemSpec {
  id: string;
  title: string;
  subtopics: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  kind: 'lesson' | 'project' | 'api' | 'practice';
  matchKeywords?: string[];
  lessonId?: string | null;
  courseSlug?: string | null;
  status?: 'available' | 'in_development' | 'planned';
}

export interface TopicGroupSpec {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  order: number;
  topics: TopicItemSpec[];
}

export interface GuidedExampleSpec {
  id: string;
  title: string;
  topic: string;
  language: string;
  description: string;
  code: string;
  expectedOutput: string;
}

export interface ChallengeSpec {
  id: string;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  objective: string;
  prompt: string;
  starterCode: string;
  hint: string;
  xpReward: number;
}

export interface StudyPlanWeekSpec {
  week: number;
  title: string;
  focus: string;
  milestones: string[];
  estimatedHours: number;
}

export interface InterviewQuestionSpec {
  id: string;
  question: string;
  level: 'Junior' | 'Mid-Level' | 'Senior';
  keyPoints: string[];
  sampleAnswer: string;
}

export interface BestPracticeSpec {
  id: string;
  category: string;
  title: string;
  guidance: string;
  antiPattern: string;
}

export interface ReferenceRowSpec {
  symbol: string;
  syntax: string;
  description: string;
  supportNote?: string;
}

export interface ReferenceTableSpec {
  id: string;
  title: string;
  description: string;
  columns: [string, string, string];
  rows: ReferenceRowSpec[];
}

export interface CertificationBlueprintSpec {
  examTitle: string;
  passingScorePct: number;
  durationMinutes: number;
  questionCount: number;
  prerequisiteSummary: string;
  examSections: Array<{ domain: string; weightPct: number; topics: string[] }>;
  preparationTips: string[];
}

export interface WebsiteProjectSpec {
  title: string;
  summary: string;
  phases: Array<{ phase: string; title: string; deliverables: string[] }>;
}

export interface TechnologyCentreSeed {
  slug: string;
  interactiveTools: Array<'px_em_converter' | 'color_contrast' | 'sql_schema_viewer' | 'snippet_runner'>;
  sections: LearningCentreSectionDef[];
  topicGroups: TopicGroupSpec[];
  guidedExamples: GuidedExampleSpec[];
  challenges: ChallengeSpec[];
  websiteProject: WebsiteProjectSpec;
  syllabusSummary: Array<{ unit: string; title: string; outcomes: string[]; hours: number }>;
  studyPlan: StudyPlanWeekSpec[];
  interviewPrep: InterviewQuestionSpec[];
  summaryPoints: string[];
  bestPractices: BestPracticeSpec[];
  certification: CertificationBlueprintSpec;
  references: ReferenceTableSpec[];
}

export const TECHNOLOGY_LEARNING_CENTRE_SEEDS: Record<string, TechnologyCentreSeed> = {
  html: {
    slug: 'html',
    interactiveTools: ['snippet_runner', 'px_em_converter'],
    sections: [
      { id: 'tutorial', label: 'HTML Tutorial', group: 'curriculum', order: 1, summary: 'Core document structure, text, links, media, tables, classes, IDs, semantics & charsets.' },
      { id: 'forms', label: 'HTML Forms', group: 'curriculum', order: 2, summary: 'Form controls, input types, attributes, labels and native HTML5 validation.' },
      { id: 'graphics', label: 'HTML Graphics', group: 'curriculum', order: 3, summary: 'Resolution-independent inline SVG vectors and programmatic HTML5 Canvas drawing.' },
      { id: 'media', label: 'HTML Media', group: 'curriculum', order: 4, summary: 'Responsive images, audio, video tracks, captions and safe external embeds.' },
      { id: 'web_apis', label: 'Web APIs', group: 'curriculum', order: 5, summary: 'Browser APIs pairing with HTML: Geolocation, Drag & Drop, Popover, Web Storage, Workers & SSE.' },
      { id: 'projects', label: 'HTML Projects & Website', group: 'practice', order: 6, summary: 'Progressive Projects I–VIII plus the multi-page accessible HTML Website capstone.' },
      { id: 'examples', label: 'Examples & Live Editor', group: 'practice', order: 7, summary: 'Guided live HTML/DOM examples runnable directly in the isolated browser sandbox.' },
      { id: 'challenges', label: 'Quiz, Exercises & Challenges', group: 'practice', order: 8, summary: 'Interactive skill checks, practical DOM validation tasks and timed challenges.' },
      { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 9, summary: 'Week-by-week study schedule, milestone progression and estimated study hours.' },
      { id: 'interview', label: 'Interview Preparation', group: 'planning', order: 10, summary: 'Real semantic HTML, accessibility, SEO and DOM interview scenarios.' },
      { id: 'best_practices', label: 'Summary & Accessibility', group: 'planning', order: 11, summary: 'WCAG 2.2 AA rules, semantic landmarks, style guide and concise chapter takeaways.' },
      { id: 'certification', label: 'HTML Certification', group: 'certification', order: 12, summary: 'HTML5 Certification Examination blueprint, readiness criteria and verified credentials.' },
      { id: 'references', label: 'HTML References & Tools', group: 'reference', order: 13, summary: 'Searchable tag list, global attributes, doctypes, HTTP status/methods & PX-to-EM converter.' },
    ],
    topicGroups: [
      {
        id: 'html_grp_foundations',
        sectionId: 'tutorial',
        title: '1. Document Foundations & Basic Text',
        description: 'Understand how browsers parse HTML5 documents from DOCTYPE through headings, paragraphs, formatting and comments.',
        order: 1,
        topics: [
          { id: 'ht_home', title: 'HTML Home, Introduction & Editors', subtopics: ['DOCTYPE declaration', 'Document tree root', 'VS Code & live preview setup'], difficulty: 'Beginner', estimatedMinutes: 15, kind: 'lesson', matchKeywords: ['anatomy', 'introduction', 'landmark'] },
          { id: 'ht_elem', title: 'HTML Basic, Elements & Attributes', subtopics: ['Start/end tags', 'Empty elements', 'href, src, alt, title attributes'], difficulty: 'Beginner', estimatedMinutes: 18, kind: 'lesson', matchKeywords: ['element', 'attribute', 'landmark'] },
          { id: 'ht_text', title: 'Headings, Paragraphs, Styles & Formatting', subtopics: ['h1–h6 document outline', 'strong vs b', 'em vs i', 'Quotations (blockquote, q, cite)', 'HTML comments'], difficulty: 'Beginner', estimatedMinutes: 16, kind: 'lesson', matchKeywords: ['heading', 'paragraph', 'formatting'] },
          { id: 'ht_colors_css', title: 'HTML Colors & Inline/Internal CSS Integration', subtopics: ['RGB, HEX & HSL colors', 'Connecting stylesheet <link>', 'Project I: Profile Bio Page'], difficulty: 'Beginner', estimatedMinutes: 18, kind: 'project', matchKeywords: ['color', 'css', 'landmark'] },
        ],
      },
      {
        id: 'html_grp_links_data',
        sectionId: 'tutorial',
        title: '2. Links, Images, Tables & Lists',
        description: 'Build multi-page navigation anchors, responsive artwork, favicons, structured data tables and ordered/unordered lists.',
        order: 2,
        topics: [
          { id: 'ht_links_img', title: 'Links, Bookmarks, Images & Favicon', subtopics: ['Absolute vs relative paths', 'Link bookmarks', '<picture> & srcset', 'Page Title & <link rel="icon">'], difficulty: 'Beginner', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['responsive media', 'table', 'favicon', 'image'] },
          { id: 'ht_tables', title: 'HTML Tables, Captions & Scope', subtopics: ['caption, thead, tbody, tfoot', 'colspan & rowspan', 'th scope="col" and "row"', 'Project II: Pricing Matrix'], difficulty: 'Beginner', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['table', 'caption', 'scope'] },
          { id: 'ht_lists', title: 'HTML Lists & Description Lists', subtopics: ['Ordered (<ol>)', 'Unordered (<ul>)', 'Description (<dl>, <dt>, <dd>)', 'Nested navigation lists', 'Project III: Knowledge Directory'], difficulty: 'Beginner', estimatedMinutes: 15, kind: 'lesson', matchKeywords: ['list', 'table'] },
        ],
      },
      {
        id: 'html_grp_layout',
        sectionId: 'tutorial',
        title: '3. Grouping, Identification, Layout & Semantics',
        description: 'Control block vs inline flow, CSS hooks with class/id, file paths, page head metadata and WCAG-friendly semantic landmarks.',
        order: 3,
        topics: [
          { id: 'ht_block_ids', title: 'Block & Inline, Div, Classes, Id & Buttons', subtopics: ['Block vs inline formatting', 'Grouping with <div> & <span>', 'Reusable .class selectors', 'Unique #id targets', 'Accessible <button> controls', 'Project IV: Interactive Card Deck'], difficulty: 'Beginner', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['block', 'class', 'id', 'landmark'] },
          { id: 'ht_iframes_js', title: 'Iframes, HTML + JavaScript & File Paths', subtopics: ['Sandboxed <iframe> embeds', 'Connecting <script defer>', 'Document-relative paths', 'Page <head>, viewport & SEO meta'], difficulty: 'Intermediate', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['metadata', 'open graph', 'seo', 'aria'] },
          { id: 'ht_layout_resp', title: 'HTML Layout, Responsive Markup & Semantics', subtopics: ['header, nav, main, section, article, aside, footer', 'Computercode (code, kbd, pre, samp)', 'Responsive viewport rules', 'Project V & VI: Editorial Layout'], difficulty: 'Intermediate', estimatedMinutes: 24, kind: 'lesson', matchKeywords: ['semantic', 'multi-page', 'aria', 'landmark'] },
          { id: 'ht_standards', title: 'Style Guide, Entities, Symbols, Emojis, Charsets & URL Encode', subtopics: ['Lowercase tag style guide', 'HTML entities (&lt;, &amp;, &copy;)', 'UTF-8 charsets', 'Percent URL encoding', 'HTML5 vs XHTML rules'], difficulty: 'Intermediate', estimatedMinutes: 18, kind: 'lesson', matchKeywords: ['metadata', 'audit', 'production'] },
        ],
      },
      {
        id: 'html_grp_forms',
        sectionId: 'forms',
        title: '4. HTML Forms & Native Constraint Validation',
        description: 'Design usable, keyboard-accessible forms using native validation constraints, grouped fieldsets and specialized input types.',
        order: 4,
        topics: [
          { id: 'ht_forms_core', title: 'HTML Forms, Form Attributes & Elements', subtopics: ['action, method, autocomplete, novalidate', 'label + for binding', 'fieldset & legend', 'select, optgroup, datalist, textarea'], difficulty: 'Beginner', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['form', 'validation', 'input'] },
          { id: 'ht_inputs', title: 'Input Types, Input Attributes & Form Overrides', subtopics: ['email, tel, url, date, range, number, file', 'required, pattern, minlength, step', 'formaction & formmethod overrides', 'Project VII: Registration Workflow'], difficulty: 'Intermediate', estimatedMinutes: 24, kind: 'lesson', matchKeywords: ['form', 'validation', 'input'] },
        ],
      },
      {
        id: 'html_grp_graphics',
        sectionId: 'graphics',
        title: '5. HTML Graphics — Inline SVG & HTML5 Canvas',
        description: 'Render crisp mathematical vector diagrams with inline SVG and pixel-buffer graphics on Canvas.',
        order: 5,
        topics: [
          { id: 'ht_canvas', title: 'HTML5 Canvas Basics', subtopics: ['Canvas coordinate grid', 'getContext("2d") drawing API', 'Paths, rectangles, arcs & text'], difficulty: 'Intermediate', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['canvas', 'svg', 'graphic'] },
          { id: 'ht_svg', title: 'Inline SVG Graphics & Accessibility', subtopics: ['viewBox scaling', 'circle, rect, path, polygon', 'title & aria-label for accessible icons'], difficulty: 'Intermediate', estimatedMinutes: 18, kind: 'lesson', matchKeywords: ['svg', 'graphic', 'media'] },
        ],
      },
      {
        id: 'html_grp_media',
        sectionId: 'media',
        title: '6. HTML Media — Audio, Video & Safe Embeds',
        description: 'Embed accessible video/audio players with captions, multiple codecs and privacy-aware external player containers.',
        order: 6,
        topics: [
          { id: 'ht_video_audio', title: 'HTML Media, Video, Audio & WebVTT Captions', subtopics: ['controls, muted, playsinline, preload', 'Multi-source fallback (<source>)', 'Accessible <track kind="captions">', 'Project VIII: Media Course Player'], difficulty: 'Intermediate', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['media', 'iframe', 'table'] },
        ],
      },
      {
        id: 'html_grp_apis',
        sectionId: 'web_apis',
        title: '7. Browser Web APIs Paired with HTML',
        description: 'Connect declarative HTML markup to native browser capabilities cleanly without third-party dependencies.',
        order: 7,
        topics: [
          { id: 'ht_api_geo_dnd', title: 'Geolocation, Drag & Drop & Popover APIs', subtopics: ['navigator.geolocation permissions', 'draggable="true" & DataTransfer events', 'Declarative HTML popover & popovertarget'], difficulty: 'Intermediate', estimatedMinutes: 22, kind: 'api', matchKeywords: ['api', 'interactive', 'semantic'] },
          { id: 'ht_api_storage_workers', title: 'Web Storage, Web Workers & Server-Sent Events', subtopics: ['localStorage vs sessionStorage', 'Off-thread Web Worker messaging', 'EventSource live streaming updates'], difficulty: 'Advanced', estimatedMinutes: 24, kind: 'api', matchKeywords: ['api', 'storage', 'audit'] },
        ],
      },
    ],
    guidedExamples: [
      {
        id: 'ex_html_semantic_page',
        title: 'Semantic Article Layout with Accessible Navigation',
        topic: 'HTML Semantics',
        language: 'html',
        description: 'Uses skip link, landmark hierarchy, figure caption and native button feedback.',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #0b1220; color: #f8fafc; }
    header, main, footer { border: 1px solid #263b5e; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
    nav a { color: #38bdf8; margin-right: 12px; text-decoration: none; }
    .skip { position: absolute; left: -999px; }
    .skip:focus { position: static; background: #0A84FF; color: #fff; padding: 6px 10px; border-radius: 6px; }
  </style>
</head>
<body>
  <a class="skip" href="#main-content">Skip to main content</a>
  <header>
    <h1>BrainCode Semantic Guide</h1>
    <nav aria-label="Primary">
      <a href="#intro">Intro</a>
      <a href="#forms">Forms</a>
      <a href="#a11y">A11y</a>
    </nav>
  </header>
  <main id="main-content">
    <article>
      <h2>Why Landmarks Matter</h2>
      <p>Screen readers jump directly between <code>&lt;header&gt;</code>, <code>&lt;main&gt;</code>, and <code>&lt;footer&gt;</code>.</p>
    </article>
  </main>
  <footer><small>BrainCode Academy HTML Learning Centre</small></footer>
</body>
</html>`,
        expectedOutput: 'Renders semantic landmark containers with skip-to-content navigation and accessible nav label.',
      },
      {
        id: 'ex_html_form_validation',
        title: 'HTML5 Form with Native Constraint Validation & Datalist',
        topic: 'HTML Forms',
        language: 'html',
        description: 'Demonstrates fieldset/legend, explicit labels, pattern hints, and datalist suggestions.',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b1220; color: #f8fafc; padding: 20px; }
    fieldset { border: 1px solid #334155; border-radius: 10px; padding: 16px; max-width: 420px; }
    label { display: block; font-size: 13px; margin: 10px 0 4px; }
    input, button { width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #475569; box-sizing: border-box; }
    button { margin-top: 14px; background: #0A84FF; color: #fff; border: 0; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <form onsubmit="event.preventDefault(); document.getElementById('msg').textContent = 'Form validated natively!';">
    <fieldset>
      <legend>Course Registration</legend>
      <label for="stu-email">Academic Email</label>
      <input id="stu-email" type="email" required placeholder="alex@domain.com" />
      <label for="stu-track">Preferred Track</label>
      <input id="stu-track" list="tracks" required placeholder="Select track..." />
      <datalist id="tracks">
        <option value="Semantic HTML5" />
        <option value="CSS Grid & Design Systems" />
        <option value="Full-Stack TypeScript" />
      </datalist>
      <button type="submit">Validate & Enroll</button>
      <p id="msg" aria-live="polite"></p>
    </fieldset>
  </form>
</body>
</html>`,
        expectedOutput: 'Validates email format and required fields using browser constraint API without custom regex.',
      },
      {
        id: 'ex_html_svg_popover',
        title: 'Declarative Popover API + Inline SVG Badge',
        topic: 'Web APIs & Graphics',
        language: 'html',
        description: 'Zero-JS modal/popover toggle combined with crisp inline SVG drawing.',
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b1220; color: #f8fafc; padding: 20px; }
    button { background: #0A84FF; color: #fff; border: 0; padding: 10px 14px; border-radius: 8px; cursor: pointer; }
    [popover] { border: 1px solid #38bdf8; border-radius: 10px; padding: 16px; background: #0f172a; color: #f8fafc; }
  </style>
</head>
<body>
  <svg width="42" height="42" viewBox="0 0 42 42" aria-label="Vector Shield Badge">
    <circle cx="21" cy="21" r="19" fill="#0A84FF" fill-opacity="0.2" stroke="#38bdf8" stroke-width="2" />
    <path d="M14 21l5 5 10-10" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" />
  </svg>
  <button popovertarget="api-tip">Toggle Native Popover</button>
  <div id="api-tip" popover>
    <strong>HTML Popover API</strong>
    <p>Light-dismiss and Escape key closing work declaratively in top-layer UI.</p>
  </div>
</body>
</html>`,
        expectedOutput: 'Renders inline SVG checkmark and toggles native HTML popover top-layer dialog.',
      },
    ],
    challenges: [
      {
        id: 'chg_html_1',
        title: 'Challenge I: Accessible Multi-Column Schedule Table',
        difficulty: 'Beginner',
        estimatedMinutes: 15,
        objective: 'Build a semantic table that announces headers clearly in screen readers.',
        prompt: 'Create a <table> with a <caption>, <thead>, <tbody>, and <th scope="col"> plus <th scope="row"> for 3 study sessions.',
        starterCode: `<table>\n  <!-- Add caption, thead with scope="col", and tbody rows -->\n</table>`,
        hint: 'Use <caption>Study Schedule</caption> and <th scope="col"> for each column heading.',
        xpReward: 40,
      },
      {
        id: 'chg_html_2',
        title: 'Challenge II: Accessible Checkout Form Audit',
        difficulty: 'Intermediate',
        estimatedMinutes: 20,
        objective: 'Bind explicit labels, fieldset grouping, and native HTML5 validation.',
        prompt: 'Construct a <form> with <fieldset><legend>Billing Details</legend>, required email, card pattern input, and a submit <button>.',
        starterCode: `<form>\n  <fieldset>\n    <legend>Billing Details</legend>\n  </fieldset>\n</form>`,
        hint: 'Pair every <label for="..."> with a matching id on the <input>.',
        xpReward: 50,
      },
    ],
    websiteProject: {
      title: 'Capstone: Multi-Page Accessible Documentation & Portfolio Website',
      summary: 'Assemble all HTML Projects I–VIII into a cohesive 3-page semantic site featuring landmark architecture, accessible data tables, responsive imagery, contact form validation and SEO Open Graph metadata.',
      phases: [
        { phase: 'Phase 1', title: 'Document Shell, Head Metadata & Navigation', deliverables: ['Valid HTML5 DOCTYPE & lang="en"', 'Meta description, favicon & Open Graph tags', 'Skip link + semantic <header>/<nav>/<main>/<footer>'] },
        { phase: 'Phase 2', title: 'Content, Data Tables & Responsive Media', deliverables: ['Accessible <table> with caption & scope', '<picture> + srcset responsive hero image with width/height', 'Inline SVG icon system'] },
        { phase: 'Phase 3', title: 'Forms, Accessibility Audit & Publication', deliverables: ['Validated contact & registration form', 'Zero duplicate IDs, keyboard tab order verified', 'WCAG contrast & landmark check passed'] },
      ],
    },
    syllabusSummary: [
      { unit: 'Unit 1', title: 'Document Tree, Text & Styling', outcomes: ['Author valid HTML5 boilerplate', 'Build logical h1–h6 outlines', 'Apply colors & external CSS links'], hours: 3 },
      { unit: 'Unit 2', title: 'Hyperlinks, Tables, Lists & Media', outcomes: ['Structure accessible tables with scope', 'Optimize responsive images with picture/srcset', 'Embed audio/video with WebVTT captions'], hours: 4 },
      { unit: 'Unit 3', title: 'Forms, Constraint Validation & Semantics', outcomes: ['Bind accessible labels & fieldsets', 'Apply native HTML5 validation constraints', 'Enforce header/main/nav/footer landmarks'], hours: 4 },
      { unit: 'Unit 4', title: 'SVG, Canvas, Web APIs & Certification Prep', outcomes: ['Draw SVG/Canvas visuals cleanly', 'Integrate Popover & Web Storage APIs', 'Complete multi-page HTML capstone & exam'], hours: 4 },
    ],
    studyPlan: [
      { week: 1, title: 'Week 1: Semantic Foundations & Navigation', focus: 'Elements, headings, paths, links, lists & Project I–III', milestones: ['Complete Lesson 01–02', 'Build accessible pricing table challenge'], estimatedHours: 4 },
      { week: 2, title: 'Week 2: Layouts, Media & Metadata', focus: 'Block vs inline, class/id, landmarks, responsive images & <head> SEO', milestones: ['Complete Lesson 03 & media lab', 'Audit landmark structure with zero skipped heading levels'], estimatedHours: 4 },
      { week: 3, title: 'Week 3: Forms, Graphics & Web APIs', focus: 'Input types, native validation, SVG/Canvas, Web Storage & Popover', milestones: ['Complete Challenge II', 'Pass HTML Quiz & form lab'], estimatedHours: 4 },
      { week: 4, title: 'Week 4: Website Capstone & HTML Certification Exam', focus: 'Accessibility audit, interview prep & timed certification exam', milestones: ['Submit multi-page HTML Website Capstone', 'Score >= 75% on HTML Certification Examination'], estimatedHours: 3 },
    ],
    interviewPrep: [
      {
        id: 'iq_html_1',
        question: 'Why are semantic landmarks (<main>, <nav>, <article>) preferred over generic <div> containers?',
        level: 'Junior',
        keyPoints: ['Screen reader landmark navigation', 'SEO crawler content weighting', 'Built-in browser reader-mode extraction'],
        sampleAnswer: 'Semantic landmarks expose an explicit accessibility tree so assistive technologies let users jump directly to navigation, main content, or footers, while helping search engines weight primary page content over boilerplate wrappers.',
      },
      {
        id: 'iq_html_2',
        question: 'What is the difference between defer and async on <script> tags in <head>?',
        level: 'Mid-Level',
        keyPoints: ['HTML parser blocking behavior', 'Execution order guarantees', 'DOMContentLoaded timing'],
        sampleAnswer: 'Both download in parallel without blocking HTML parsing, but async executes immediately once downloaded in arbitrary order, whereas defer waits until HTML parsing completes and executes scripts in document order right before DOMContentLoaded.',
      },
      {
        id: 'iq_html_3',
        question: 'How do you make a data table and a complex registration form accessible to keyboard and screen-reader users?',
        level: 'Mid-Level',
        keyPoints: ['<caption> and <th scope="col|row">', '<label for> explicit binding', '<fieldset>/<legend> grouping', 'aria-live feedback'],
        sampleAnswer: 'Bind every input with an explicit <label for>, group related choices inside <fieldset> + <legend>, announce validation status in an aria-live region, and give tables a <caption> plus <th scope="col|row"> headers.',
      },
    ],
    summaryPoints: [
      'Start every page with <!DOCTYPE html>, a clear lang attribute on <html>, UTF-8 charset, and responsive viewport metadata.',
      'Use exactly one logical document outline (h1 -> h2 -> h3) without skipping heading ranks for visual styling.',
      'Choose native interactive elements (<button>, <a href>, <label>, <details>) before adding custom ARIA.',
      'Always provide width, height, and meaningful alt attributes on <img> elements to eliminate layout shift and support screen readers.',
      'Leverage HTML5 form constraints (required, type="email", pattern, min/max) before adding custom JavaScript checks.',
    ],
    bestPractices: [
      { id: 'bp_html_1', category: 'Accessibility (WCAG 2.2 AA)', title: 'Native <button> for actions, <a href> for navigation', guidance: 'Use <button type="button|submit"> for UI triggers so Enter and Spacebar keys work automatically.', antiPattern: 'Using <div onclick="..."> or clickable <span> elements without keyboard roles.' },
      { id: 'bp_html_2', category: 'Performance & CLS', title: 'Declare explicit width & height on media', guidance: 'Include intrinsic aspect dimensions on <img> and <iframe> so browsers reserve layout space pre-download.', antiPattern: 'Omitting image dimensions and causing content jumps as assets load.' },
      { id: 'bp_html_3', category: 'Security & Privacy', title: 'Use sandbox and rel="noopener noreferrer"', guidance: 'Apply rel="noopener" on external target="_blank" links and sandbox attributes on third-party <iframe> embeds.', antiPattern: 'Embedding untrusted iframes with unrestricted top navigation or script execution.' },
    ],
    certification: {
      examTitle: 'BrainCode Academy Certified HTML5 Developer Exam',
      passingScorePct: 75,
      durationMinutes: 45,
      questionCount: 5,
      prerequisiteSummary: 'Complete core HTML modules or demonstrate practical mastery across semantic markup, accessible tables, forms, media and Web APIs.',
      examSections: [
        { domain: 'Document Structure, Semantics & Metadata', weightPct: 30, topics: ['DOCTYPE', 'Head meta', 'Landmarks', 'Heading hierarchy'] },
        { domain: 'Tables, Media, Graphics & Web APIs', weightPct: 30, topics: ['Table scope', 'Picture/srcset', 'SVG/Canvas', 'Web Storage/Popover'] },
        { domain: 'Accessible Forms & WCAG Standards', weightPct: 40, topics: ['Input constraints', 'Label/fieldset binding', 'Keyboard navigation', 'ARIA basics'] },
      ],
      preparationTips: [
        'Review all HTML Reference entries for global attributes and input validation attributes.',
        'Practice building an accessible form and data table inside the HTML Try-It Editor.',
        'Take the course assessment and verify every missed learning objective before sitting the exam.',
      ],
    },
    references: [
      {
        id: 'ref_html_tags',
        title: 'Essential HTML5 Elements & Landmarks Reference',
        description: 'Core structural, text, form, and embedded tags organized by semantic role.',
        columns: ['Tag / Element', 'Usage Syntax', 'Purpose & Semantic Role'],
        rows: [
          { symbol: '<main>', syntax: '<main id="content">...</main>', description: 'Primary unique page content landmark; at most one visible <main> per document.', supportNote: 'All modern browsers' },
          { symbol: '<header> / <nav>', syntax: '<nav aria-label="Primary">...</nav>', description: 'Introductory section or landmark group of major navigation links.', supportNote: 'All modern browsers' },
          { symbol: '<picture>', syntax: '<picture><source media="(min-width:800px)" srcset="lg.webp"><img src="sm.jpg" alt="..."></picture>', description: 'Art-directed and format-negotiated responsive image container.', supportNote: 'HTML5+' },
          { symbol: '<table> / <th scope>', syntax: '<table><caption>...</caption><thead><tr><th scope="col">...</th></tr></thead></table>', description: 'Accessible two-dimensional data table linking cells to header rows/columns.', supportNote: 'WCAG AA required' },
          { symbol: '<dialog> / popover', syntax: '<button popovertarget="tip">Info</button><div id="tip" popover>...</div>', description: 'Declarative top-layer modal/popover elements with built-in Escape dismiss.', supportNote: 'HTML Living Standard' },
        ],
      },
      {
        id: 'ref_html_attrs',
        title: 'HTML Global & Input Validation Attributes',
        description: 'Attributes shared across elements plus form constraint attributes.',
        columns: ['Attribute', 'Example', 'Behavior & Accessibility Impact'],
        rows: [
          { symbol: 'id / class', syntax: '<section id="faq" class="card">', description: 'Unique fragment/label target (#id) and reusable stylesheet hook (.class).' },
          { symbol: 'aria-label / aria-live', syntax: '<div role="status" aria-live="polite">', description: 'Exposes accessible name or dynamic announcements to assistive tech.' },
          { symbol: 'required / pattern', syntax: '<input type="text" required pattern="[A-Z]{3}">', description: 'Enforces browser constraint validation prior to form submission.' },
          { symbol: 'loading / decoding', syntax: '<img src="..." loading="lazy" width="800" height="450" alt="...">', description: 'Defers offscreen image fetching while preserving intrinsic aspect ratio.' },
        ],
      },
      {
        id: 'ref_http_status',
        title: 'HTTP Methods & Status Codes Reference (For Forms & APIs)',
        description: 'Essential HTTP verbs and response codes encountered with HTML forms, anchors, and Fetch APIs.',
        columns: ['Code / Method', 'Category', 'Meaning in Web Workflows'],
        rows: [
          { symbol: 'GET / POST', syntax: '<form method="POST" action="/api/enroll">', description: 'GET retrieves idempotent resources via query string; POST submits body payloads.' },
          { symbol: '200 / 201', syntax: '200 OK · 201 Created', description: 'Request succeeded cleanly; 201 indicates a new resource was persisted.' },
          { symbol: '301 / 302', syntax: 'Moved / Found Redirect', description: 'Browser redirects follow Location header (301 permanent, 302 temporary).' },
          { symbol: '400 / 401 / 403 / 404', syntax: 'Client Errors', description: 'Validation error (400), missing auth (401), forbidden role (403), missing route (404).' },
          { symbol: '500 / 503', syntax: 'Server Errors', description: 'Unhandled backend fault (500) or temporary upstream/service unavailability (503).' },
        ],
      },
      {
        id: 'ref_html_entities',
        title: 'Character Sets, Entities & Doctype Quick Reference',
        description: 'Document declaration, UTF-8 encoding, and commonly escaped entities.',
        columns: ['Entity / Token', 'Character / Code', 'Recommended Usage'],
        rows: [
          { symbol: '<!DOCTYPE html>', syntax: 'HTML5 Living Standard', description: 'Triggers standards layout mode in all browsers (required first line).' },
          { symbol: '&lt; / &gt;', syntax: '< and >', description: 'Displays literal HTML tags inside code documentation without parsing.' },
          { symbol: '&amp; / &quot;', syntax: '& and "', description: 'Safely escapes ampersands in text and double quotes inside HTML attributes.' },
          { symbol: '&nbsp; / &copy;', syntax: 'Non-breaking space / ©', description: 'Prevents awkward line breaks between units (e.g. 100&nbsp;px) or renders copyright symbol.' },
        ],
      },
    ],
  },

  css: {
    slug: 'css',
    interactiveTools: ['snippet_runner', 'px_em_converter'],
    sections: [
      { id: 'tutorial', label: 'CSS Tutorial', group: 'curriculum', order: 1, summary: 'Cascade specificity, selectors, box model, typography, colors and spacing systems.' },
      { id: 'layouts', label: 'Flexbox & CSS Grid', group: 'curriculum', order: 2, summary: '1D Flexbox alignment, 2D CSS Grid tracks, named areas and intrinsic auto-fit layouts.' },
      { id: 'responsive', label: 'Responsive & Modern CSS', group: 'curriculum', order: 3, summary: 'Media queries, container queries, clamp(), custom properties and dark mode tokens.' },
      { id: 'animations', label: 'Transitions & Keyframes', group: 'curriculum', order: 4, summary: 'GPU-composited hover transitions, transforms and prefers-reduced-motion safety.' },
      { id: 'projects', label: 'CSS Projects & Challenges', group: 'practice', order: 5, summary: 'Hands-on layout labs, responsive grid builds and specificity debugging tasks.' },
      { id: 'examples', label: 'Examples & Live Style Editor', group: 'practice', order: 6, summary: 'Editable live HTML+CSS cards rendered inside the browser sandbox.' },
      { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 7, summary: '4-week structured CSS progression roadmap and learning outcomes.' },
      { id: 'interview', label: 'Interview Prep & Best Practices', group: 'planning', order: 8, summary: 'Specificity battles, stacking contexts, CLS prevention and @layer architecture.' },
      { id: 'certification', label: 'CSS Certification', group: 'certification', order: 9, summary: 'CSS3 Architecture Certification exam details and passing criteria.' },
      { id: 'references', label: 'CSS Properties & PX/EM Tool', group: 'reference', order: 10, summary: 'Selector specificity table, Flexbox/Grid cheat sheet and interactive PX↔EM converter.' },
    ],
    topicGroups: [
      {
        id: 'css_grp_core',
        sectionId: 'tutorial',
        title: '1. Selectors, Cascade Specificity & The Box Model',
        description: 'Master selector scoring, inheritance, box-sizing: border-box and clean visual hierarchy.',
        order: 1,
        topics: [
          { id: 'css_t_cascade', title: 'Selectors, Combinators & Specificity Math', subtopics: ['ID vs Class vs Element weights', ':where() zero-specificity', '@layer cascade ordering'], difficulty: 'Beginner', estimatedMinutes: 18, kind: 'lesson', matchKeywords: ['specificity', 'cascade', 'selector'] },
          { id: 'css_t_box', title: 'Box Model, Margin Collapse & Visual Typography', subtopics: ['content, padding, border, margin', 'clamp() fluid type', 'tabular-nums for data UI'], difficulty: 'Beginner', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['box model', 'typography', 'clamp'] },
        ],
      },
      {
        id: 'css_grp_layout',
        sectionId: 'layouts',
        title: '2. Flexbox & Two-Dimensional CSS Grid',
        description: 'Architect resilient responsive navigation bars, card grids and dashboard shells cleanly.',
        order: 2,
        topics: [
          { id: 'css_t_flex', title: 'Flexbox Axes, Wrapping & Gap Control', subtopics: ['justify-content vs align-items', 'flex-grow / shrink / basis', 'Single-row header contracts'], difficulty: 'Beginner', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['flexbox', 'layout'] },
          { id: 'css_t_grid', title: 'CSS Grid, fr Units, minmax() & Named Areas', subtopics: ['repeat(auto-fit, minmax())', 'grid-template-areas', 'Subgrid alignment'], difficulty: 'Intermediate', estimatedMinutes: 24, kind: 'lesson', matchKeywords: ['grid', 'responsive'] },
        ],
      },
      {
        id: 'css_grp_modern',
        sectionId: 'responsive',
        title: '3. Design Tokens, Media/Container Queries & Motion',
        description: 'Build dark/light themes with custom properties and accessible motion curves.',
        order: 3,
        topics: [
          { id: 'css_t_tokens', title: 'Custom Properties, Dark Themes & @container Queries', subtopics: ['CSS variables (--accent)', 'Component-level container queries', 'prefers-color-scheme'], difficulty: 'Intermediate', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['token', 'layer', 'theme'] },
          { id: 'css_t_motion', title: 'Transitions, Transforms & prefers-reduced-motion', subtopics: ['Compositor-only transform/opacity', '@keyframes timing', 'Accessible focus-visible outlines'], difficulty: 'Advanced', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['motion', 'reduced motion', 'transition'] },
        ],
      },
    ],
    guidedExamples: [
      {
        id: 'ex_css_grid_cards',
        title: 'Responsive Auto-Fit CSS Grid + Custom Properties',
        topic: 'CSS Grid',
        language: 'html',
        description: 'Adapts cleanly from 1 column to multi-column without media queries using minmax().',
        code: `<!DOCTYPE html>
<html>
<head>
<style>
  :root { --bg: #070b14; --card: #111a2e; --accent: #0A84FF; }
  body { margin: 0; padding: 20px; font-family: system-ui; background: var(--bg); color: #f8fafc; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
  .tile { background: var(--card); border: 1px solid #243b6b; border-radius: 10px; padding: 16px; transition: transform 180ms ease; }
  .tile:hover { transform: translateY(-2px); border-color: var(--accent); }
</style>
</head>
<body>
  <div class="grid">
    <div class="tile"><h3>Tokens</h3><p>--accent</p></div>
    <div class="tile"><h3>Grid</h3><p>minmax(150px, 1fr)</p></div>
    <div class="tile"><h3>Motion</h3><p>transform only</p></div>
  </div>
</body>
</html>`,
        expectedOutput: 'Renders responsive 3-column grid that wraps automatically on narrow viewports.',
      },
    ],
    challenges: [
      {
        id: 'chg_css_1',
        title: 'Challenge I: Zero-Media-Query Card Grid',
        difficulty: 'Beginner',
        estimatedMinutes: 15,
        objective: 'Build a responsive grid with repeat(auto-fit, minmax(180px, 1fr)) and gap: 1rem.',
        prompt: 'Write CSS rules for `.cards` using Grid so cards never shrink below 180px and wrap cleanly.',
        starterCode: `<style>\n  .cards { display: grid; }\n</style>\n<div class="cards"><div>A</div><div>B</div><div>C</div></div>`,
        hint: 'Use grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));',
        xpReward: 40,
      },
    ],
    websiteProject: {
      title: 'Capstone: Responsive Design-Token UI Component Kit',
      summary: 'Design a dual-theme component system using CSS custom properties, Flexbox headers, CSS Grid card rails, focus-visible accessibility rings and reduced-motion guards.',
      phases: [
        { phase: 'Phase 1', title: 'Token Scale & Typography', deliverables: ['Define light & dark color tokens', 'Fluid clamp() type hierarchy'] },
        { phase: 'Phase 2', title: 'Flex & Grid Page Architecture', deliverables: ['Sticky 3-zone header', 'Responsive auto-fit card grid'] },
      ],
    },
    syllabusSummary: [
      { unit: 'Unit 1', title: 'Selectors & Box Model', outcomes: ['Calculate specificity cleanly', 'Apply border-box sizing'], hours: 3 },
      { unit: 'Unit 2', title: 'Flexbox & CSS Grid', outcomes: ['Build 1D toolbars & 2D dashboards'], hours: 5 },
      { unit: 'Unit 3', title: 'Responsive Architecture & Motion', outcomes: ['Use variables, container queries & reduced-motion'], hours: 4 },
    ],
    studyPlan: [
      { week: 1, title: 'Week 1: Cascade & Box Model', focus: 'Specificity, inheritance, rem/em & spacing rhythm', milestones: ['Finish Lesson 01–02'], estimatedHours: 3 },
      { week: 2, title: 'Week 2: Flexbox & Grid Mastery', focus: 'Axes alignment, fr tracks, responsive wrapping', milestones: ['Complete Challenge I'], estimatedHours: 4 },
      { week: 3, title: 'Week 3: Architecture, Motion & Certification', focus: '@layer, design tokens & CSS certification exam', milestones: ['Pass CSS Exam >= 75%'], estimatedHours: 4 },
    ],
    interviewPrep: [
      {
        id: 'iq_css_1',
        question: 'Explain CSS specificity hierarchy and how :where() and @layer change cascade resolution.',
        level: 'Mid-Level',
        keyPoints: ['Inline > ID > Class/Attribute/Pseudo-class > Type', ':where() adds 0 weight', '@layer establishes explicit layer precedence before specificity runs'],
        sampleAnswer: 'Selectors normally score (ID, Class, Element), so one ID outweighs any number of classes. Wrapping defaults inside :where() contributes zero specificity, while @layer groups styles into ordered precedence tiers where later layers beat earlier layers regardless of selector specificity.',
      },
    ],
    summaryPoints: [
      'Always set *, *::before, *::after { box-sizing: border-box; } for predictable width/padding math.',
      'Prefer Flexbox for single-axis navigation/toolbars and CSS Grid for two-dimensional page structures.',
      'Animate only compositor properties (transform, opacity) and wrap animations in @media (prefers-reduced-motion: reduce).',
    ],
    bestPractices: [
      { id: 'bp_css_1', category: 'Accessibility', title: 'Preserve clear :focus-visible rings', guidance: 'Always provide high-contrast :focus-visible outlines for keyboard tabbers.', antiPattern: 'Using outline: none globally without a replacement focus indicator.' },
      { id: 'bp_css_2', category: 'Performance', title: 'Animate transform & opacity, avoid layout thrashing', guidance: 'Keep hover and drawer transitions on transform/opacity for 60fps rendering.', antiPattern: 'Transitioning width, height, top, or left on interactive elements.' },
    ],
    certification: {
      examTitle: 'BrainCode Academy Certified CSS3 Specialist Exam',
      passingScorePct: 75,
      durationMinutes: 45,
      questionCount: 5,
      prerequisiteSummary: 'Complete core CSS modules covering specificity, Flexbox, CSS Grid, and accessible responsive themes.',
      examSections: [
        { domain: 'Cascade, Specificity & Box Model', weightPct: 30, topics: ['Specificity math', 'box-sizing', 'rem/em'] },
        { domain: 'Flexbox & Grid Systems', weightPct: 40, topics: ['Flex sizing', 'Grid fr/minmax', 'Alignment'] },
        { domain: 'Responsive Tokens & Accessibility', weightPct: 30, topics: ['Media/container queries', 'Dark mode', 'focus-visible'] },
      ],
      preparationTips: ['Test layout calculations with the PX ↔ EM Converter.', 'Practice auto-fit CSS Grids in the live preview editor.'],
    },
    references: [
      {
        id: 'ref_css_layout',
        title: 'CSS Flexbox & Grid Essential Properties',
        description: 'Most-used alignment and track sizing properties for modern responsive UI.',
        columns: ['Property', 'Key Values', 'Layout Effect'],
        rows: [
          { symbol: 'display: flex / grid', syntax: 'gap: 1rem;', description: 'Activates 1D flex container or 2D grid tracks with consistent spacing.' },
          { symbol: 'grid-template-columns', syntax: 'repeat(auto-fit, minmax(220px, 1fr))', description: 'Creates responsive wrapping columns without fixed breakpoints.' },
          { symbol: 'clamp()', syntax: 'font-size: clamp(1rem, 2.5vw, 1.5rem);', description: 'Scales typography smoothly between strict minimum and maximum bounds.' },
          { symbol: ':focus-visible', syntax: 'outline: 2px solid #0A84FF; outline-offset: 2px;', description: 'Displays focus ring for keyboard navigation without distracting mouse clicks.' },
        ],
      },
    ],
  },

  javascript: {
    slug: 'javascript',
    interactiveTools: ['snippet_runner'],
    sections: [
      { id: 'tutorial', label: 'JavaScript Tutorial', group: 'curriculum', order: 1, summary: 'Variables, scope, arrays, functions, objects, prototypes and ES2025 syntax.' },
      { id: 'dom_async', label: 'DOM, Events & Async JS', group: 'curriculum', order: 2, summary: 'Closures, event delegation, Promises, async/await, Fetch error handling & ES modules.' },
      { id: 'projects', label: 'JS Exercises & Challenges', group: 'practice', order: 3, summary: 'Algorithmic drills, DOM challenges and unit-testable function tasks.' },
      { id: 'examples', label: 'Examples & Live Runner', group: 'practice', order: 4, summary: 'Execute JavaScript snippets directly in browser sandbox with console output.' },
      { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 5, summary: 'Structured 4-week study roadmap from syntax fundamentals to async architecture.' },
      { id: 'interview', label: 'Interview Prep & Best Practices', group: 'planning', order: 6, summary: 'Closures, event loop microtasks, immutability and XSS prevention rules.' },
      { id: 'certification', label: 'JS Certification Exam', group: 'certification', order: 7, summary: 'JavaScript Engineering certification exam blueprint and readiness checklist.' },
      { id: 'references', label: 'JS Built-ins & Array/Promise Ref', group: 'reference', order: 8, summary: 'Standard methods reference across Array, Object, Promise, and DOM Event APIs.' },
    ],
    topicGroups: [
      {
        id: 'js_grp_core',
        sectionId: 'tutorial',
        title: '1. Language Core, Scope & Higher-Order Arrays',
        description: 'Master let/const, lexical scope, pure functions and array transformation pipelines.',
        order: 1,
        topics: [
          { id: 'js_t_scope', title: 'Variables, Scope, Closures & Pure Functions', subtopics: ['Block vs function scope', 'Lexical closure memory', 'Arrow vs regular functions'], difficulty: 'Beginner', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['closure', 'scope', 'variables'] },
          { id: 'js_t_arrays', title: 'Arrays, Destructuring & Immutable Pipelines', subtopics: ['map, filter, reduce, find, some', 'Spread & rest syntax', 'Map & Set collections'], difficulty: 'Beginner', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['array', 'method', 'map'] },
        ],
      },
      {
        id: 'js_grp_async',
        sectionId: 'dom_async',
        title: '2. DOM Delegation, Event Loop & Async Fetch Architecture',
        description: 'Coordinate non-blocking network requests, try/catch boundaries and responsive DOM updates.',
        order: 2,
        topics: [
          { id: 'js_t_dom', title: 'DOM Queries & Event Delegation', subtopics: ['querySelector & closest()', 'Event bubbling & delegation', 'Debouncing expensive listeners'], difficulty: 'Intermediate', estimatedMinutes: 20, kind: 'lesson', matchKeywords: ['dom', 'event', 'delegation'] },
          { id: 'js_t_async', title: 'Promises, async/await & Defensive Fetch', subtopics: ['Microtask queue vs timer queue', 'Checking response.ok explicitly', 'Promise.all vs allSettled'], difficulty: 'Intermediate', estimatedMinutes: 25, kind: 'lesson', matchKeywords: ['async', 'promise', 'fetch'] },
        ],
      },
    ],
    guidedExamples: [
      {
        id: 'ex_js_pipeline',
        title: 'Array Transformation & Error-Safe Async Helper',
        topic: 'Arrays & Async JS',
        language: 'javascript',
        description: 'Transforms curriculum stats cleanly with reduce/filter and handles Promise rejection safely.',
        code: `const modules = [
  { name: 'Closures', minutes: 20, done: true },
  { name: 'Event Loop', minutes: 25, done: true },
  { name: 'Fetch API', minutes: 30, done: false }
];
const doneMinutes = modules.filter(m => m.done).reduce((sum, m) => sum + m.minutes, 0);
console.log('Completed study minutes:', doneMinutes);`,
        expectedOutput: 'Completed study minutes: 45',
      },
    ],
    challenges: [
      {
        id: 'chg_js_1',
        title: 'Challenge I: Group Items by Category Using reduce()',
        difficulty: 'Intermediate',
        estimatedMinutes: 15,
        objective: 'Transform an array of course objects into a grouped lookup map without mutating inputs.',
        prompt: 'Write `groupByTrack(items)` returning an object mapping each `track` string to an array of titles.',
        starterCode: `function groupByTrack(items) {\n  return items.reduce((acc, item) => {\n    // implement grouping\n    return acc;\n  }, {});\n}`,
        hint: 'Initialize acc[item.track] = acc[item.track] || []; then push item.title.',
        xpReward: 45,
      },
    ],
    websiteProject: {
      title: 'Capstone: Interactive Task & API Explorer Widget',
      summary: 'Build a state-driven browser application featuring event delegation, debounced filtering, localStorage persistence and AbortController-safe async fetches.',
      phases: [
        { phase: 'Phase 1', title: 'Pure State & Array Utilities', deliverables: ['Unit-tested filter/sort helpers', 'Immutable state updates'] },
        { phase: 'Phase 2', title: 'DOM Delegation & Async Fetch', deliverables: ['Single parent click handler', 'Loading/error UI state & retry'] },
      ],
    },
    syllabusSummary: [
      { unit: 'Unit 1', title: 'Syntax, Scope & Closures', outcomes: ['Avoid var hoisting bugs', 'Explain lexical closures'], hours: 4 },
      { unit: 'Unit 2', title: 'Collections & Functional Methods', outcomes: ['Compose map/filter/reduce cleanly'], hours: 4 },
      { unit: 'Unit 3', title: 'Event Loop, Promises & Testing', outcomes: ['Write race-safe async/await code'], hours: 6 },
    ],
    studyPlan: [
      { week: 1, title: 'Week 1: Core JS & Functions', focus: 'Types, strict equality ===, scope & higher-order functions', milestones: ['Complete JS Lesson 01–02'], estimatedHours: 4 },
      { week: 2, title: 'Week 2: Closures & DOM Architecture', focus: 'Event delegation, debouncing & state modules', milestones: ['Solve JS Challenge I'], estimatedHours: 5 },
      { week: 3, title: 'Week 3: Async Concurrency & Certification', focus: 'Event loop, Promise combinators & Certification Exam', milestones: ['Pass JS Certification Exam'], estimatedHours: 5 },
    ],
    interviewPrep: [
      {
        id: 'iq_js_1',
        question: 'Explain the JavaScript Event Loop: why do Promise .then() callbacks run before setTimeout(..., 0)?',
        level: 'Mid-Level',
        keyPoints: ['Call stack execution', 'Microtask queue (Promises, queueMicrotask) drains completely after each turn', 'Macrotask queue (setTimeout, I/O) runs one task per loop tick'],
        sampleAnswer: 'Once the synchronous call stack empties, the JS runtime drains the entire Microtask queue (resolved Promise callbacks) before taking the next task from the Macrotask queue (such as setTimeout(..., 0)).',
      },
    ],
    summaryPoints: [
      'Default to const and use let only for rebindings; compare values strictly with ===.',
      'Note that fetch() only rejects on network failures—always check response.ok for HTTP 4xx/5xx responses.',
      'Prefer textContent over innerHTML when inserting untrusted user text to prevent XSS injection.',
    ],
    bestPractices: [
      { id: 'bp_js_1', category: 'Security (XSS)', title: 'Never inject untrusted strings via innerHTML', guidance: 'Render user-supplied text via textContent or safe framework bindings.', antiPattern: 'Concatenating user input inside innerHTML or eval().' },
      { id: 'bp_js_2', category: 'Async Reliability', title: 'Always check response.ok and handle rejections', guidance: 'Wrap async calls in try/catch and surface recoverable UI states.', antiPattern: 'Leaving floating Promises unhandled or assuming 404/500 throws in fetch().' },
    ],
    certification: {
      examTitle: 'BrainCode Academy Certified JavaScript Developer Exam',
      passingScorePct: 75,
      durationMinutes: 50,
      questionCount: 5,
      prerequisiteSummary: 'Complete core JavaScript modules covering closures, array methods, DOM events and async concurrency.',
      examSections: [
        { domain: 'Scope, Closures & Data Pipelines', weightPct: 35, topics: ['Lexical scope', 'Higher-order arrays', 'Equality rules'] },
        { domain: 'DOM Architecture & Event Delegation', weightPct: 30, topics: ['Bubbling', 'textContent safety', 'Debouncing'] },
        { domain: 'Asynchronous JS & Modules', weightPct: 35, topics: ['Microtasks vs timers', 'async/await', 'Fetch validation'] },
      ],
      preparationTips: ['Trace microtask execution order carefully.', 'Verify strict truthiness & destructuring edge cases.'],
    },
    references: [
      {
        id: 'ref_js_builtins',
        title: 'JavaScript Array, Promise & DOM Essential APIs',
        description: 'High-frequency standard methods used in modern application engineering.',
        columns: ['Method / API', 'Return Value', 'Primary Use Case'],
        rows: [
          { symbol: 'Array.prototype.map / filter', syntax: 'items.filter(x => x.active).map(x => x.id)', description: 'Creates a new transformed array without mutating the source array.' },
          { symbol: 'Array.prototype.reduce', syntax: 'nums.reduce((sum, n) => sum + n, 0)', description: 'Accumulates an array into a single sum, object map, or summary structure.' },
          { symbol: 'Promise.allSettled', syntax: 'await Promise.allSettled([reqA, reqB])', description: 'Waits for all promises regardless of individual failure and returns status objects.' },
          { symbol: 'Element.closest', syntax: 'event.target.closest("button[data-id]")', description: 'Walks upward from the clicked node cleanly for event delegation.' },
        ],
      },
    ],
  },

  python: {
    slug: 'python',
    interactiveTools: ['snippet_runner'],
    sections: [
      { id: 'tutorial', label: 'Python Tutorial', group: 'curriculum', order: 1, summary: 'Variables, control flow, lists, dicts, comprehensions, functions and OOP classes.' },
      { id: 'stdlib', label: 'File I/O, Exceptions & Stdlib', group: 'curriculum', order: 2, summary: 'Context managers (with open), try/except/else, pathlib, JSON and virtual environments.' },
      { id: 'projects', label: 'Python Exercises & Challenges', group: 'practice', order: 3, summary: 'Algorithmic exercises, trace-output reasoning and CLI automation briefs.' },
      { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 4, summary: '4-week roadmap from Python syntax to structured testing and CLI engineering.' },
      { id: 'interview', label: 'Interview Prep & PEP 8', group: 'planning', order: 5, summary: 'Mutable defaults, generators vs lists, GIL concepts and clean PEP 8 style.' },
      { id: 'certification', label: 'Python Certification Exam', group: 'certification', order: 6, summary: 'Python Engineering examination structure and certification verification.' },
      { id: 'references', label: 'Python Built-ins & Stdlib Reference', group: 'reference', order: 7, summary: 'Built-in functions, collection methods and standard library modules cheat sheet.' },
    ],
    topicGroups: [
      {
        id: 'py_grp_core',
        sectionId: 'tutorial',
        title: '1. Python Fundamentals, Collections & Comprehensions',
        description: 'Write clean, readable Python using lists, dictionaries, sets, tuples and comprehensions.',
        order: 1,
        topics: [
          { id: 'py_t_basics', title: 'Syntax, Types, F-Strings & Control Flow', subtopics: ['Dynamic typing & type hints', 'F-strings formatting', 'Truthy/falsy containers'], difficulty: 'Beginner', estimatedMinutes: 18, kind: 'lesson', matchKeywords: ['python', 'foundation', 'variable'] },
          { id: 'py_t_collections', title: 'Lists, Dicts, Sets & Comprehensions', subtopics: ['Dict .get() safety', 'List/dict comprehensions', 'Tuple unpacking'], difficulty: 'Beginner', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['list', 'dictionary', 'comprehension'] },
        ],
      },
      {
        id: 'py_grp_stdlib',
        sectionId: 'stdlib',
        title: '2. Functions, Error Handling, OOP & File Automation',
        description: 'Manage resources safely with context managers, custom classes and standard-library tools.',
        order: 2,
        topics: [
          { id: 'py_t_files', title: 'Exceptions (try/except) & Context Managers (with)', subtopics: ['FileNotFoundError recovery', 'pathlib.Path', 'JSON load/dump'], difficulty: 'Intermediate', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['exception', 'file', 'pathlib'] },
          { id: 'py_t_oop', title: 'Classes, Dataclasses & Unit Testing (pytest/unittest)', subtopics: ['@dataclass patterns', 'Dunder methods (__repr__)', 'Virtual environments (venv)'], difficulty: 'Intermediate', estimatedMinutes: 24, kind: 'lesson', matchKeywords: ['class', 'oop', 'test'] },
        ],
      },
    ],
    guidedExamples: [
      {
        id: 'ex_py_comprehension',
        title: 'Safe Dictionary Lookup & List Comprehension',
        topic: 'Data Structures',
        language: 'python',
        description: 'Filters and summarizes student scores concisely with explicit type annotations.',
        code: `scores: dict[str, list[int]] = {
    "Ada": [88, 94, 91],
    "Linus": [76, 82, 79]
}
averages = {name: round(sum(vals) / len(vals), 1) for name, vals in scores.items() if vals}
print(averages)`,
        expectedOutput: "{'Ada': 91.0, 'Linus': 79.0}",
      },
    ],
    challenges: [
      {
        id: 'chg_py_1',
        title: 'Challenge I: Word Frequency Counter Without KeyErrors',
        difficulty: 'Beginner',
        estimatedMinutes: 15,
        objective: 'Count normalized token frequencies cleanly using dict.get() or collections.Counter.',
        prompt: 'Write `count_words(text: str) -> dict[str, int]` lowercasing words and ignoring empty splits.',
        starterCode: `def count_words(text: str) -> dict[str, int]:\n    counts: dict[str, int] = {}\n    for word in text.lower().split():\n        counts[word] = counts.get(word, 0) + 1\n    return counts`,
        hint: 'Using .get(word, 0) avoids KeyError on the first occurrence of each word.',
        xpReward: 40,
      },
    ],
    websiteProject: {
      title: 'Capstone: Automated Cohort Analytics CLI Tool',
      summary: 'Create a Python CLI utility reading CSV/JSON learner records with pathlib, summarizing metrics into structured reports and handling missing files cleanly.',
      phases: [
        { phase: 'Phase 1', title: 'Data Parsing & Error Recovery', deliverables: ['Safe file reader with pathlib', 'Graceful FileNotFoundError handling'] },
        { phase: 'Phase 2', title: 'Aggregation & Unit Verification', deliverables: ['Dataclass summary models', 'Automated assertion tests'] },
      ],
    },
    syllabusSummary: [
      { unit: 'Unit 1', title: 'Python Syntax & Built-in Containers', outcomes: ['Write PEP 8 compliant functions', 'Transform lists/dicts cleanly'], hours: 4 },
      { unit: 'Unit 2', title: 'Exceptions, Files & Standard Library', outcomes: ['Process JSON/CSV safely with with open()'], hours: 5 },
      { unit: 'Unit 3', title: 'Classes, Typing & Testing', outcomes: ['Model domains with dataclasses & tests'], hours: 5 },
    ],
    studyPlan: [
      { week: 1, title: 'Week 1: Syntax & Collections', focus: 'Functions, slicing, dict/list comprehensions', milestones: ['Complete Python Lesson 01–02'], estimatedHours: 4 },
      { week: 2, title: 'Week 2: Error Safety & File Automation', focus: 'try/except, pathlib, context managers', milestones: ['Complete Challenge I & Gradebook brief'], estimatedHours: 5 },
      { week: 3, title: 'Week 3: OOP, Testing & Certification', focus: 'Dataclasses, unittest & Python Exam', milestones: ['Pass Python Certification Exam >= 75%'], estimatedHours: 5 },
    ],
    interviewPrep: [
      {
        id: 'iq_py_1',
        question: 'Why should mutable objects like [] or {} never be used as default function parameters in Python?',
        level: 'Mid-Level',
        keyPoints: ['Default arguments evaluate once at function definition time', 'Shared state mutates across calls', 'Pattern: default to None and initialize inside function body'],
        sampleAnswer: 'Python evaluates default parameter expressions once when `def` executes, not per call. A default `items=[]` leaks mutations across invocations; instead declare `items: list[str] | None = None` and set `items = [] if items is None else items`.',
      },
    ],
    summaryPoints: [
      'Always open files with `with open(..., encoding="utf-8") as f:` so handles close even on exceptions.',
      'Prefer `dict.get(key, default)` or `collections.Counter` to prevent KeyError crashes.',
      'Use `pathlib.Path` over brittle string concatenation for cross-platform filesystem paths.',
    ],
    bestPractices: [
      { id: 'bp_py_1', category: 'Resource Safety', title: 'Use context managers (with) for files and connections', guidance: 'Context managers guarantee deterministic cleanup on return or error.', antiPattern: 'Calling open() without with and risking leaked file descriptors.' },
      { id: 'bp_py_2', category: 'Exception Hygiene', title: 'Catch specific exception classes', guidance: 'Catch ValueError or FileNotFoundError explicitly rather than bare except:', antiPattern: 'Using bare `except:` which hides KeyboardInterrupt and bugs.' },
    ],
    certification: {
      examTitle: 'BrainCode Academy Certified Python Developer Exam',
      passingScorePct: 75,
      durationMinutes: 50,
      questionCount: 5,
      prerequisiteSummary: 'Complete Python fundamentals, collections, file/error handling and unit testing units.',
      examSections: [
        { domain: 'Core Syntax & Data Structures', weightPct: 40, topics: ['Comprehensions', 'Mutable defaults', 'Dict/Set lookup'] },
        { domain: 'Exceptions, File I/O & Stdlib', weightPct: 35, topics: ['Context managers', 'pathlib', 'JSON handling'] },
        { domain: 'OOP & Engineering Quality', weightPct: 25, topics: ['Dataclasses', 'Type hints', 'Unit tests'] },
      ],
      preparationTips: ['Trace mutable default parameter behavior.', 'Review context manager teardown order.'],
    },
    references: [
      {
        id: 'ref_py_builtins',
        title: 'Python Built-in Functions & Standard Library Reference',
        description: 'Essential built-ins and standard library utilities every Python engineer uses daily.',
        columns: ['Symbol / Module', 'Example', 'Behavior & Complexity'],
        rows: [
          { symbol: 'enumerate(seq, start=0)', syntax: 'for idx, val in enumerate(items, 1):', description: 'Yields index-value pairs cleanly without manual counter variables.' },
          { symbol: 'zip(a, b)', syntax: 'for name, score in zip(names, scores):', description: 'Pairs elements from multiple iterables safely until the shortest ends.' },
          { symbol: 'pathlib.Path', syntax: 'Path("data/report.json").read_text(encoding="utf-8")', description: 'Object-oriented cross-platform path operations and I/O.' },
          { symbol: 'collections.Counter', syntax: 'Counter(tokens).most_common(5)', description: 'Fast O(n) hash-map frequency counting for iterables.' },
        ],
      },
    ],
  },

  sql: {
    slug: 'sql',
    interactiveTools: ['sql_schema_viewer', 'snippet_runner'],
    sections: [
      { id: 'tutorial', label: 'SQL Query Tutorial', group: 'curriculum', order: 1, summary: 'SELECT, WHERE, ORDER BY, aggregations, GROUP BY/HAVING and relational joins.' },
      { id: 'advanced_sql', label: 'CTEs, Normalization & Indexing', group: 'curriculum', order: 2, summary: 'Subqueries, CTEs (WITH), 1NF–3NF schema design, B-Tree indexes and ACID transactions.' },
      { id: 'projects', label: 'SQL Sandbox & Challenges', group: 'practice', order: 3, summary: 'Write real queries evaluated live against BrainCode in-memory SQLite (:memory:).' },
      { id: 'syllabus', label: 'Syllabus & Study Plan', group: 'planning', order: 4, summary: 'Structured 4-week SQL progression from querying to query-plan optimization.' },
      { id: 'interview', label: 'Interview Prep & Safety', group: 'planning', order: 5, summary: 'LEFT vs INNER JOIN edge cases, NULL semantics, parameterized queries & indexing.' },
      { id: 'certification', label: 'SQL Certification Exam', group: 'certification', order: 6, summary: 'Relational Database & SQL Exam executed & graded with live query verification.' },
      { id: 'references', label: 'SQL Clauses & Aggregates Reference', group: 'reference', order: 7, summary: 'Order of execution, Join matrix, Aggregate functions and SQLite data types.' },
    ],
    topicGroups: [
      {
        id: 'sql_grp_query',
        sectionId: 'tutorial',
        title: '1. Querying, Filtering & Aggregate Grouping',
        description: 'Extract metrics reliably across normalized tables using SELECT, WHERE, GROUP BY and HAVING.',
        order: 1,
        topics: [
          { id: 'sql_t_select', title: 'SELECT, WHERE, ORDER BY & NULL Logic', subtopics: ['IS NULL vs = NULL', 'DISTINCT & LIMIT', 'Deterministic sorting'], difficulty: 'Beginner', estimatedMinutes: 18, kind: 'lesson', matchKeywords: ['select', 'where', 'filter'] },
          { id: 'sql_t_agg', title: 'COUNT, SUM, AVG, GROUP BY & HAVING', subtopics: ['WHERE before grouping vs HAVING after grouping', 'LEFT JOIN preserving zero counts'], difficulty: 'Beginner', estimatedMinutes: 22, kind: 'lesson', matchKeywords: ['aggregate', 'group', 'join'] },
        ],
      },
      {
        id: 'sql_grp_schema',
        sectionId: 'advanced_sql',
        title: '2. Multi-Table Joins, CTEs, Indexing & ACID Transactions',
        description: 'Design foreign-key integrity, composite indexes and atomic multi-statement commits.',
        order: 2,
        topics: [
          { id: 'sql_t_cte', title: 'Subqueries, CTEs (WITH) & Window Functions', subtopics: ['Readable CTE pipelines', 'RANK() / ROW_NUMBER() OVER (...)'], difficulty: 'Intermediate', estimatedMinutes: 24, kind: 'lesson', matchKeywords: ['cte', 'window', 'subquery'] },
          { id: 'sql_t_index', title: 'Primary/Foreign Keys, Indexes & Transactions', subtopics: ['BEGIN / COMMIT / ROLLBACK', 'Composite B-Tree index ordering', 'Injection prevention via ? bindings'], difficulty: 'Intermediate', estimatedMinutes: 24, kind: 'lesson', matchKeywords: ['index', 'transaction', 'normalization'] },
        ],
      },
    ],
    guidedExamples: [
      {
        id: 'ex_sql_dept_count',
        title: 'Department Headcount with LEFT JOIN & GROUP BY',
        topic: 'Aggregations & Joins',
        language: 'sql',
        description: 'Runs live against the sandboxed SQLite database (departments + employees tables).',
        code: `SELECT d.name AS department, COUNT(e.id) AS staff_count
FROM departments d
LEFT JOIN employees e ON e.department_id = d.id
GROUP BY d.id
ORDER BY staff_count DESC;`,
        expectedOutput: 'Returns all 4 departments ordered by headcount, keeping 0-member departments visible.',
      },
    ],
    challenges: [
      {
        id: 'chg_sql_1',
        title: 'Challenge I: Filter Active Enrollments Above Average Score',
        difficulty: 'Intermediate',
        estimatedMinutes: 15,
        objective: 'Write a live SQLite query using a subquery or HAVING filter cleanly.',
        prompt: 'Query department names and average salary from `departments` & `employees` where headcount >= 1.',
        starterCode: `SELECT d.name, AVG(e.salary) AS avg_salary\nFROM departments d\nJOIN employees e ON e.department_id = d.id\nGROUP BY d.id;`,
        hint: 'Use HAVING COUNT(e.id) >= 1 after GROUP BY.',
        xpReward: 50,
      },
    ],
    websiteProject: {
      title: 'Capstone: Normalized Multi-Tenant Analytics Schema & Report Queries',
      summary: 'Design 3NF relational tables with foreign keys, composite indexes, analytic views and safe transaction rollbacks.',
      phases: [
        { phase: 'Phase 1', title: 'Schema & Referential Integrity', deliverables: ['Primary/foreign key constraints', 'NOT NULL and CHECK rules'] },
        { phase: 'Phase 2', title: 'Analytics & Index Verification', deliverables: ['Multi-table LEFT JOIN reports', 'EXPLAIN QUERY PLAN index verification'] },
      ],
    },
    syllabusSummary: [
      { unit: 'Unit 1', title: 'Relational Filtering & Aggregations', outcomes: ['Query and group datasets accurately'], hours: 4 },
      { unit: 'Unit 2', title: 'Joins, CTEs & Window Analytics', outcomes: ['Combine multiple normalized tables cleanly'], hours: 5 },
      { unit: 'Unit 3', title: 'Schema Integrity, Indexing & ACID', outcomes: ['Prevent SQL injection & tune indexes'], hours: 5 },
    ],
    studyPlan: [
      { week: 1, title: 'Week 1: Core Querying & Joins', focus: 'SELECT, JOINs, NULL rules & GROUP BY', milestones: ['Run 3 queries inside SQLite Sandbox'], estimatedHours: 4 },
      { week: 2, title: 'Week 2: Subqueries, CTEs & Analytics', focus: 'HAVING filters, CTEs & schema normalization', milestones: ['Pass SQL Challenge I'], estimatedHours: 5 },
      { week: 3, title: 'Week 3: Indexing, Transactions & Exam', focus: 'Parameterized queries, ACID & SQL Certification', milestones: ['Pass SQL Exam including live sql_write tasks'], estimatedHours: 5 },
    ],
    interviewPrep: [
      {
        id: 'iq_sql_1',
        question: 'What is the difference between WHERE and HAVING in SQL query execution?',
        level: 'Junior',
        keyPoints: ['Execution order: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY', 'WHERE filters raw rows before aggregation', 'HAVING filters grouped buckets after aggregation'],
        sampleAnswer: 'WHERE runs before GROUP BY on individual table rows and cannot reference aggregate functions like COUNT(*). HAVING executes after GROUP BY to filter aggregated groups.',
      },
    ],
    summaryPoints: [
      'SQL logical evaluation runs: FROM/JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> ORDER BY -> LIMIT.',
      'Always use LEFT JOIN when preserving parent records that may have 0 matching child rows.',
      'Never interpolate user input strings into SQL; always bind parameters (`?` / `$1`).',
    ],
    bestPractices: [
      { id: 'bp_sql_1', category: 'Security', title: 'Parameterized prepared statements everywhere', guidance: 'Pass dynamic values only via bound placeholders (`db.prepare(...).all(val)`).', antiPattern: 'Concatenating request inputs directly into SQL template literals.' },
      { id: 'bp_sql_2', category: 'Performance', title: 'Index foreign keys and selective filter columns', guidance: 'Create composite indexes matching leading WHERE + ORDER BY predicates.', antiPattern: 'Running full table scans on unindexed join columns.' },
    ],
    certification: {
      examTitle: 'BrainCode Academy Certified SQL & Relational Design Exam',
      passingScorePct: 75,
      durationMinutes: 50,
      questionCount: 5,
      prerequisiteSummary: 'Complete SQL querying, multi-table joins, schema normalization, and live SQLite sandbox labs.',
      examSections: [
        { domain: 'Querying, Joins & Aggregations', weightPct: 45, topics: ['LEFT vs INNER JOIN', 'GROUP BY/HAVING', 'Live sql_write'] },
        { domain: 'Schema Design & Normalization', weightPct: 30, topics: ['1NF–3NF', 'Foreign keys', 'Constraints'] },
        { domain: 'Indexing, ACID & Security', weightPct: 25, topics: ['Parameterized SQL', 'Transactions', 'B-Tree indexes'] },
      ],
      preparationTips: ['Practice live queries inside the SQLite Sandbox before starting the exam.', 'Double check NULL comparisons (`IS NULL`).'],
    },
    references: [
      {
        id: 'ref_sql_clauses',
        title: 'SQL Logical Evaluation Order & Join Semantics',
        description: 'Quick reference for query clause precedence and aggregate functions.',
        columns: ['Clause / Function', 'Execution Stage', 'Purpose & Notes'],
        rows: [
          { symbol: 'FROM / JOIN', syntax: 'FROM a LEFT JOIN b ON b.a_id = a.id', description: 'Stage 1: Combines source relations cleanly before filtering.' },
          { symbol: 'WHERE', syntax: 'WHERE status = ? AND deleted_at IS NULL', description: 'Stage 2: Filters individual rows before grouping (cannot use COUNT).' },
          { symbol: 'GROUP BY / HAVING', syntax: 'GROUP BY dept_id HAVING COUNT(*) >= 3', description: 'Stages 3–4: Aggregates rows and filters resulting groups.' },
          { symbol: 'BEGIN / COMMIT / ROLLBACK', syntax: 'BEGIN IMMEDIATE; ... COMMIT;', description: 'Guarantees atomic all-or-nothing persistence across updates.' },
        ],
      },
    ],
  },
};

export interface CertificationExamSeed {
  id: string;
  courseId: string;
  title: string;
  passingScorePct: number;
  timeLimitSec: number;
  xpReward: number;
  objectiveTags: string[];
  questions: Array<{
    id: string;
    kind: 'multiple_choice' | 'multi_select' | 'true_false' | 'sql_write' | 'fill_blank';
    prompt: string;
    options?: string[];
    correctAnswer: string;
    marks: number;
    objectiveTag: string;
    allowPartialCredit?: boolean;
    explanation: string;
  }>;
}

export const CERTIFICATION_EXAM_SEEDS: CertificationExamSeed[] = [
  {
    id: 'asm_exam_html_cert',
    courseId: 'crs_html',
    title: 'HTML5 Certification Examination',
    passingScorePct: 75,
    timeLimitSec: 2700,
    xpReward: 200,
    objectiveTags: ['Semantic Landmarks', 'Accessible Forms & Tables', 'Web APIs & Performance'],
    questions: [
      {
        id: 'hex1',
        kind: 'multiple_choice',
        prompt: 'Which attribute on <th> explicitly links a column header cell to data cells below it for screen readers?',
        options: ['scope="col"', 'role="cell"', 'target="column"', 'headers-all'],
        correctAnswer: 'scope="col"',
        marks: 2,
        objectiveTag: 'Accessible Forms & Tables',
        explanation: '<th scope="col"> binds column headers deterministically in assistive technology.',
      },
      {
        id: 'hex2',
        kind: 'multi_select',
        prompt: 'Select ALL semantic landmark elements recognized natively by screen readers for major page navigation:',
        options: ['<main>', '<div>', '<nav>', '<aside>', '<span>'],
        correctAnswer: JSON.stringify(['<main>', '<nav>', '<aside>']),
        marks: 3,
        objectiveTag: 'Semantic Landmarks',
        allowPartialCredit: true,
        explanation: '<main>, <nav>, and <aside> expose structural landmarks; <div> and <span> are semantically neutral.',
      },
      {
        id: 'hex3',
        kind: 'true_false',
        prompt: 'Adding explicit width and height attributes to <img> tags allows browsers to reserve aspect-ratio space before image download finishes.',
        options: ['true', 'false'],
        correctAnswer: 'true',
        marks: 2,
        objectiveTag: 'Web APIs & Performance',
        explanation: 'Explicit width and height prevent Cumulative Layout Shift (CLS).',
      },
      {
        id: 'hex4',
        kind: 'fill_blank',
        prompt: 'What attribute enables declarative top-layer toggle panels in HTML without requiring custom modal JavaScript?',
        correctAnswer: 'popover',
        marks: 2,
        objectiveTag: 'Web APIs & Performance',
        explanation: 'The HTML `popover` attribute works paired with `popovertarget` to provide native top-layer toggle and Escape dismiss.',
      },
      {
        id: 'hex5',
        kind: 'multiple_choice',
        prompt: 'Which <script> attribute downloads scripts asynchronously while waiting until HTML parsing finishes before executing in document order?',
        options: ['defer', 'async', 'module-sync', 'blocking'],
        correctAnswer: 'defer',
        marks: 2,
        objectiveTag: 'Web APIs & Performance',
        explanation: '`defer` preserves document order and executes right before DOMContentLoaded without blocking parsing.',
      },
    ],
  },
  {
    id: 'asm_exam_css_cert',
    courseId: 'crs_css',
    title: 'CSS3 Architecture Certification Examination',
    passingScorePct: 75,
    timeLimitSec: 2700,
    xpReward: 200,
    objectiveTags: ['Cascade & Specificity', 'Flexbox & Grid', 'Accessibility & Motion'],
    questions: [
      {
        id: 'cex1',
        kind: 'multiple_choice',
        prompt: 'Which CSS Grid expression creates responsive wrapping columns at least 220px wide without media queries?',
        options: [
          'repeat(auto-fit, minmax(220px, 1fr))',
          'flex-wrap(220px, auto)',
          'grid-auto-columns(220px)',
          'repeat(3, 220px)',
        ],
        correctAnswer: 'repeat(auto-fit, minmax(220px, 1fr))',
        marks: 3,
        objectiveTag: 'Flexbox & Grid',
        explanation: 'repeat(auto-fit, minmax(220px, 1fr)) automatically packs and stretches available columns cleanly.',
      },
      {
        id: 'cex2',
        kind: 'multi_select',
        prompt: 'Select ALL compositor-friendly CSS properties safe to animate without triggering expensive layout reflow:',
        options: ['transform', 'opacity', 'width', 'margin-left'],
        correctAnswer: JSON.stringify(['transform', 'opacity']),
        marks: 3,
        objectiveTag: 'Accessibility & Motion',
        allowPartialCredit: true,
        explanation: 'transform and opacity execute on the GPU compositor without recalculating geometry.',
      },
      {
        id: 'cex3',
        kind: 'true_false',
        prompt: 'The CSS :where() pseudo-class contributes zero specificity weight to the selector.',
        options: ['true', 'false'],
        correctAnswer: 'true',
        marks: 2,
        objectiveTag: 'Cascade & Specificity',
        explanation: ':where() always has 0 specificity, making base resets trivial to override.',
      },
    ],
  },
  {
    id: 'asm_exam_js_cert',
    courseId: 'crs_js',
    title: 'JavaScript Engineering Certification Examination',
    passingScorePct: 75,
    timeLimitSec: 3000,
    xpReward: 220,
    objectiveTags: ['Scope & Closures', 'Async Concurrency', 'DOM & Security'],
    questions: [
      {
        id: 'jex1',
        kind: 'true_false',
        prompt: 'Calling fetch() automatically rejects its Promise when the server returns an HTTP 404 or 500 status code.',
        options: ['true', 'false'],
        correctAnswer: 'false',
        marks: 2,
        objectiveTag: 'Async Concurrency',
        explanation: 'fetch() only rejects on network failures; HTTP 4xx/5xx responses resolve with response.ok === false.',
      },
      {
        id: 'jex2',
        kind: 'multi_select',
        prompt: 'Select ALL valid reasons to assign event listeners on a shared parent element (Event Delegation):',
        options: [
          'Reduces memory footprint across large dynamic lists',
          'Automatically handles newly appended child buttons',
          'Disables event bubbling globally',
        ],
        correctAnswer: JSON.stringify([
          'Reduces memory footprint across large dynamic lists',
          'Automatically handles newly appended child buttons',
        ]),
        marks: 3,
        objectiveTag: 'DOM & Security',
        allowPartialCredit: true,
        explanation: 'Event delegation leverages bubbling so a single listener handles both existing and future child nodes.',
      },
      {
        id: 'jex3',
        kind: 'multiple_choice',
        prompt: 'Which queue runs completely to empty immediately after the synchronous call stack clears, before timers like setTimeout(..., 0)?',
        options: ['Microtask queue', 'Macrotask queue', 'Render paint queue', 'WebWorker pool'],
        correctAnswer: 'Microtask queue',
        marks: 3,
        objectiveTag: 'Async Concurrency',
        explanation: 'Promise callbacks live in the Microtask queue, which drains prior to the next macrotask.',
      },
    ],
  },
  {
    id: 'asm_exam_py_cert',
    courseId: 'crs_python',
    title: 'Python Developer Certification Examination',
    passingScorePct: 75,
    timeLimitSec: 3000,
    xpReward: 220,
    objectiveTags: ['Data Structures', 'Resource Safety & Stdlib', 'Functions & OOP'],
    questions: [
      {
        id: 'pex1',
        kind: 'multiple_choice',
        prompt: 'Which lookup safely returns 0 when key "score" is missing from dictionary `stats` without raising KeyError?',
        options: ['stats.get("score", 0)', 'stats["score" || 0]', 'stats.find("score")', 'stats.pop("score")'],
        correctAnswer: 'stats.get("score", 0)',
        marks: 2,
        objectiveTag: 'Data Structures',
        explanation: 'dict.get(key, default) returns the default safely when key is absent.',
      },
      {
        id: 'pex2',
        kind: 'true_false',
        prompt: 'Using `with open("file.txt", encoding="utf-8") as f:` guarantees the file descriptor closes even if an exception is raised inside the block.',
        options: ['true', 'false'],
        correctAnswer: 'true',
        marks: 2,
        objectiveTag: 'Resource Safety & Stdlib',
        explanation: 'Python context managers execute __exit__ automatically when leaving the `with` block.',
      },
      {
        id: 'pex3',
        kind: 'multiple_choice',
        prompt: 'Why should `def add_item(x, items=None):` be preferred over `items=[]`?',
        options: [
          'Default values evaluate once at function definition, so `[]` would persist across separate calls.',
          '`None` runs faster bytecode than list literals.',
          'Lists cannot be type-hinted as parameters.',
        ],
        correctAnswer: 'Default values evaluate once at function definition, so `[]` would persist across separate calls.',
        marks: 3,
        objectiveTag: 'Functions & OOP',
        explanation: 'Avoiding mutable default arguments prevents shared-state bugs across calls.',
      },
    ],
  },
  {
    id: 'asm_exam_sql_cert',
    courseId: 'crs_sql',
    title: 'SQL & Relational Database Certification Examination',
    passingScorePct: 75,
    timeLimitSec: 3000,
    xpReward: 240,
    objectiveTags: ['SQL Querying & Joins', 'SQL Aggregations', 'Indexing & Security'],
    questions: [
      {
        id: 'sex1',
        kind: 'sql_write',
        prompt: 'Write a SQL query returning total employees count aliased as `total` from the `employees` table.',
        correctAnswer: 'SELECT COUNT(*) AS total FROM employees;',
        marks: 4,
        objectiveTag: 'SQL Aggregations',
        explanation: 'Aggregates all employee rows via COUNT(*) against the sandboxed SQLite database.',
      },
      {
        id: 'sex2',
        kind: 'multiple_choice',
        prompt: 'Which JOIN preserves all rows from the left table even when no matching row exists in the right table?',
        options: ['LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'INTERSECT'],
        correctAnswer: 'LEFT JOIN',
        marks: 2,
        objectiveTag: 'SQL Querying & Joins',
        explanation: 'LEFT JOIN keeps unmatched left rows and fills right columns with NULL.',
      },
      {
        id: 'sex3',
        kind: 'true_false',
        prompt: 'HAVING filters aggregated groups after GROUP BY, whereas WHERE filters individual rows prior to grouping.',
        options: ['true', 'false'],
        correctAnswer: 'true',
        marks: 2,
        objectiveTag: 'SQL Querying & Joins',
        explanation: 'WHERE evaluates row-by-row before aggregation; HAVING evaluates group results afterward.',
      },
    ],
  },
];
