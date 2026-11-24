import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer as createViteServer, type ViteDevServer } from 'vite';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcschools-e2e-'));
const tmpDbPath = path.join(tmpDir, 'bcschools-e2e.db');
process.env.BCSCHOOLS_DB_PATH = tmpDbPath;
process.env.PAYMENT_WEBHOOK_SECRET = 'e2e_webhook_secret';
process.env.DISABLE_HMR = 'true';

async function main() {
  const { createApiRouter } = await import('../server/routes.ts');
  const { db } = await import('../server/db.ts');

  const app = express();
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
      },
    })
  );
  app.use('/api', createApiRouter());

  const distDir = path.resolve(process.cwd(), 'dist');
  let vite: ViteDevServer | null = null;
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  let baseUrl = '';
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  const pageErrors: string[] = [];
  const server500s: string[] = [];
  let browser: Browser | null = null;

  try {
    // Seed an isolated E2E learner user with onboarding completed
    const learnerEmail = `e2e_learner_${Date.now()}@example.com`;
    const learnerPassword = 'Password123!';
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'E2E Learner',
        email: learnerEmail,
        password: learnerPassword,
        confirmPassword: learnerPassword,
        acceptedTerms: true,
      }),
    });
    assert.equal(regRes.status, 201);
    const regData = (await regRes.json()) as any;
    const onbRes = await fetch(`${baseUrl}/api/profile/onboarding`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${regData.token}`,
      },
      body: JSON.stringify({
        skillLevel: 'Beginner',
        interests: ['Web Development'],
        goals: ['Master HTML & CSS'],
        preferredTechs: ['html', 'css', 'javascript'],
      }),
    });
    assert.equal(onbRes.status, 200);

    const preinstalledChrome = '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell';
    browser = await chromium.launch({
      headless: true,
      executablePath: fs.existsSync(preinstalledChrome) ? preinstalledChrome : undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page: Page = await context.newPage();

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });
    page.on('response', (res) => {
      if (res.status() >= 500 && res.url().includes('/api/')) {
        server500s.push(`${res.status()} ${res.url()}`);
      }
    });

    // Step 1: Load public homepage, verify Phase 25 typography & beginner Start Learning HTML shortcut, then sign in
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    const homeFonts = await page.evaluate(() => ({
      bodyFont: getComputedStyle(document.body).fontFamily,
      h1Font: document.querySelector('h1') ? getComputedStyle(document.querySelector('h1')!).fontFamily : '',
    }));
    assert.ok(homeFonts.bodyFont.includes('Inter'), `Expected Inter on document.body, got: ${homeFonts.bodyFont}`);
    assert.ok(homeFonts.h1Font.includes('Manrope'), `Expected Manrope on hero h1, got: ${homeFonts.h1Font}`);

    await page.getByTestId('hero-start-html-btn').click();
    await page.getByTestId('tutorial-lesson-article').waitFor({ state: 'visible', timeout: 15000 });
    const htmlLesson1Text = await page.getByTestId('tutorial-lesson-article').innerText();
    assert.ok(
      htmlLesson1Text.includes('HTML Document Anatomy') &&
        htmlLesson1Text.includes('What Is HTML & Document Anatomy?') &&
        htmlLesson1Text.includes('Core HTML5 Semantic Landmarks'),
      `Expected enriched HTML Lesson 01 content, got: ${htmlLesson1Text.slice(0, 220)}`
    );
    await page.getByTestId('studio-more-menu-btn').click();
    await page.getByTestId('studio-more-menu-popover').waitFor({ state: 'visible', timeout: 5000 });
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Sign In$/i }).first().click();
    await page.locator('input[type="email"]').fill(learnerEmail);
    await page.locator('input[type="password"]').fill(learnerPassword);
    await page.getByRole('button', { name: /^Sign In$/i }).last().click();

    await page.getByRole('button', { name: /Explore Courses/i }).waitFor({ state: 'visible', timeout: 15000 });
    // Navigate to Courses from AppShell sidebar
    await page.getByRole('button', { name: /Explore Courses/i }).click();
    await page.waitForSelector('text=Explore Courses, Technologies & Certificates', { timeout: 15000 });

    // Step 2: Open HTML5 Semantic Markup course directly into Lesson 01
    const htmlCard = page.locator('article', { hasText: 'HTML5 Semantic Markup' });
    await htmlCard.waitFor({ state: 'visible', timeout: 10000 });
    await htmlCard.getByRole('button', { name: /Start Learning|Continue Learning/i }).click();

    // Verify beginner-friendly guided mentor prompt & Lesson 01 auto-opened
    await page.waitForSelector('[data-testid="guided-mentor-prompt"]', { timeout: 10000 });
    const activeLessonBtn = page.locator('[data-active-lesson="true"]').first();
    await activeLessonBtn.waitFor({ state: 'visible', timeout: 10000 });
    const activeLessonText = await activeLessonBtn.innerText();
    assert.ok(activeLessonText.includes('01.'), `Expected numbered lesson 01. in outline, got: ${activeLessonText}`);

    // Verify rectangular active border is applied (2px) vs inactive row
    const borderWidth = await activeLessonBtn.evaluate((el) => getComputedStyle(el).borderWidth);
    assert.equal(borderWidth, '2px', 'Expected 2px rectangular border on active outline lesson');
    const inactiveLessonStatus = await page.locator('[data-lesson-id]').nth(2).getAttribute('data-progress-status');
    assert.equal(inactiveLessonStatus, 'not_started', 'Expected Lesson 03 initial progress status to be not_started');

    // Verify 3-area layout geometry (Top Header + Left Curriculum Sidebar + Main Content Area)
    const threeAreaCourseGeometry = await page.evaluate(() => {
      const header = document.querySelector('[data-testid="course-top-header"]')?.getBoundingClientRect();
      const sidebar = document.querySelector('[data-testid="curriculum-sidebar"]')?.getBoundingClientRect();
      const main = document.querySelector('[data-testid="main-content-area"]')?.getBoundingClientRect();
      const tree = document.querySelector('[data-testid="curriculum-tree-scroll"]') as HTMLElement | null;
      const beforeWinY = window.scrollY;
      if (tree) tree.scrollTop = 100;
      const afterTreeScroll = tree ? tree.scrollTop : -1;
      const afterWinY = window.scrollY;
      if (tree) tree.scrollTop = 0;
      return {
        headerBottom: header?.bottom ?? 0,
        sidebarTop: sidebar?.top ?? 0,
        sidebarRight: sidebar?.right ?? 0,
        mainLeft: main?.left ?? 0,
        treeOverflowY: tree ? getComputedStyle(tree).overflowY : '',
        treeScrollable: tree ? tree.scrollHeight > tree.clientHeight : false,
        afterTreeScroll,
        windowStayedStill: beforeWinY === afterWinY,
      };
    });
    assert.ok(
      threeAreaCourseGeometry.sidebarTop >= threeAreaCourseGeometry.headerBottom - 2,
      `Expected left sidebar below top course header, got ${JSON.stringify(threeAreaCourseGeometry)}`
    );
    assert.ok(
      threeAreaCourseGeometry.sidebarRight <= threeAreaCourseGeometry.mainLeft + 2,
      `Expected left sidebar left of main content area, got ${JSON.stringify(threeAreaCourseGeometry)}`
    );
    assert.ok(
      ['auto', 'scroll'].includes(threeAreaCourseGeometry.treeOverflowY) &&
        threeAreaCourseGeometry.treeScrollable &&
        threeAreaCourseGeometry.afterTreeScroll > 0 &&
        threeAreaCourseGeometry.windowStayedStill,
      `Expected independently scrollable curriculum sidebar, got ${JSON.stringify(threeAreaCourseGeometry)}`
    );

    // Verify desktop sidebar collapse/expand toggle in CoursesView
    await page.getByTestId('toggle-outline-sidebar-btn').click();
    assert.equal(await page.getByTestId('toggle-outline-sidebar-btn').getAttribute('aria-expanded'), 'false');
    await page.getByTestId('toggle-outline-sidebar-btn').click();
    assert.equal(await page.getByTestId('toggle-outline-sidebar-btn').getAttribute('aria-expanded'), 'true');

    // Verify numbered topic tree & Expand/Collapse All toggle
    const topicNodesCount = await page.locator('[data-topic-id]').count();
    assert.ok(topicNodesCount >= 1, 'Expected numbered topic nodes inside curriculum tree');
    await page.getByTestId('curriculum-expand-toggle').click();
    assert.equal(await page.locator('[data-lesson-id]').count(), 0, 'Expected Collapse all to hide tree lessons');
    await page.getByTestId('curriculum-expand-toggle').click();
    assert.ok((await page.locator('[data-lesson-id]').count()) >= 3, 'Expected Expand all to restore tree lessons');

    // Verify Web Development Lab capability context strip & multi-file tabs
    await page.getByTestId('practice-lab-context').waitFor({ state: 'visible', timeout: 5000 });
    const labCtxText = await page.getByTestId('practice-lab-context').innerText();
    assert.ok(labCtxText.includes('Web Development Lab'), `Expected Web Development Lab context, got: ${labCtxText}`);
    await page.getByTestId('practice-file-tab-styles.css').waitFor({ state: 'visible', timeout: 5000 });

    // Step 3: Click "Try It Yourself" inside lesson and run customized HTML in Practice Workspace
    const tryBtn = page.getByRole('button', { name: 'Try It Yourself' }).first();
    await tryBtn.click();

    const editor = page.getByTestId('practice-code-editor');
    await editor.waitFor({ state: 'visible', timeout: 5000 });
    const editorFont = await editor.evaluate((el) => getComputedStyle(el).fontFamily);
    assert.ok(editorFont.includes('JetBrains Mono'), `Expected JetBrains Mono on practice editor, got: ${editorFont}`);
    const htmlLangOptions = await page
      .locator('select[aria-label="Practice language"] option')
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    assert.ok(
      htmlLangOptions.includes('html') && htmlLangOptions.includes('css') && !htmlLangOptions.includes('rust'),
      `Expected HTML workspace language dropdown to stay focused on web languages, got: ${htmlLangOptions.join(',')}`
    );
    const customHtml =
      '<!DOCTYPE html><html><body><main><header><h1>E2E Guided Workspace</h1></header><footer>Ready</footer></main><script>console.log("E2E_HTML_OK");</script></body></html>';
    await editor.fill(customHtml);

    await page.getByTestId('lab-validate-task-btn').click();
    await page.getByTestId('lab-validation-feedback').waitFor({ state: 'visible', timeout: 5000 });
    const valFeedback = await page.getByTestId('lab-validation-feedback').innerText();
    assert.ok(valFeedback.includes('Task validation checks passed'), `Expected semantic HTML task pass, got: ${valFeedback}`);

    await page.getByTestId('practice-run-btn').click();
    await page.getByTestId('practice-preview-iframe').waitFor({ state: 'visible', timeout: 5000 });
    const consoleText = await page.getByTestId('practice-console-output').innerText();
    assert.ok(consoleText.includes('E2E_HTML_OK'), `Expected console capture to contain E2E_HTML_OK, got: ${consoleText}`);

    // Step 4: Switch to WHITEBOARD tab, draw a stroke, switch away & back and verify strokes persist
    await page.getByTestId('practice-tab-whiteboard').click();
    const canvas = page.getByTestId('whiteboard-canvas');
    await canvas.waitFor({ state: 'visible', timeout: 5000 });
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    assert.ok(box && box.width > 100 && box.height > 100, 'Expected measurable whiteboard canvas');
    await page.mouse.move(box.x + 40, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, box.y + 110, { steps: 6 });
    await page.mouse.up();
    await page.waitForSelector('text=(1 strokes saved)', { timeout: 5000 });

    await page.getByTestId('practice-tab-code').click();
    assert.equal(await editor.inputValue(), customHtml, 'Expected code edit to survive whiteboard tab switch');

    // Step 5: Mark Lesson 01 complete explicitly & continue to Lesson 02
    await page.getByTestId('mark-lesson-complete-btn').click();
    await page.getByTestId('lesson-completion-banner').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('continue-next-lesson-btn').click();

    await page.waitForFunction(() => {
      const el = document.querySelector('[data-active-lesson="true"]');
      return el && el.textContent?.includes('02.');
    });
    const lesson1Status = await page.locator('[data-lesson-id]').nth(0).getAttribute('data-progress-status');
    const lesson2Status = await page.locator('[data-lesson-id]').nth(1).getAttribute('data-progress-status');
    assert.equal(lesson1Status, 'completed', 'Expected Lesson 01 status to remain completed');
    assert.equal(lesson2Status, 'in_progress', 'Expected Lesson 02 status to transition to in_progress');
    assert.equal(await editor.inputValue(), customHtml, 'Expected practice editor edits to survive 01 -> 02 lesson switch');

    await page.getByTestId('practice-tab-whiteboard').click();
    await page.waitForSelector('text=(1 strokes saved)', { timeout: 5000 });

    // Step 6: Reload browser and confirm completion & persisted local practice state survive reload
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Dashboard$/i }).first().click();
    await page.getByRole('button', { name: /Explore Courses/i }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: /Explore Courses/i }).click();
    const htmlCardReloaded = page.locator('article', { hasText: 'HTML5 Semantic Markup' });
    await htmlCardReloaded.waitFor({ state: 'visible', timeout: 10000 });
    await htmlCardReloaded.getByRole('button', { name: /Start Learning|Continue Learning/i }).click();
    await page.waitForSelector('[data-active-lesson="true"]', { timeout: 10000 });
    assert.equal(
      await page.getByTestId('practice-code-editor').inputValue(),
      customHtml,
      'Expected customized code draft to persist after reload'
    );

    // Step 7: Honest Python syntax check fallback & Expected-Output Reasoning (no fabricated output)
    await page.getByRole('button', { name: /^All Courses$/i }).click();
    const pyCard = page.locator('article', { hasText: /Python/i }).first();
    await pyCard.waitFor({ state: 'visible', timeout: 10000 });
    await pyCard.getByRole('button', { name: /Start Learning|Continue Learning/i }).click();
    await page.waitForSelector('[data-testid="practice-code-editor"]', { timeout: 10000 });
    await page.locator('select[aria-label="Practice language"]').selectOption('python');
    await page.getByTestId('practice-code-editor').fill('def broken_fn(\n    print("oops")');
    await page.getByTestId('practice-run-btn').click();
    const pyConsole = await page.getByTestId('practice-console-output').innerText();
    assert.ok(
      pyConsole.includes('CODE_SANDBOX_URL') && pyConsole.includes('Unclosed'),
      `Expected honest syntax & sandbox notice, got: ${pyConsole}`
    );

    // Step 8: SQL Course Live In-Memory SQLite Query Lab
    await page.getByRole('button', { name: /^All Courses$/i }).click();
    const sqlCard = page.locator('article', { hasText: /\bSQL\b/i }).first();
    await sqlCard.waitFor({ state: 'visible', timeout: 10000 });
    await sqlCard.getByRole('button', { name: /Start Learning|Continue Learning/i }).click();
    await page.waitForSelector('[data-testid="practice-lab-context"]', { timeout: 10000 });
    const sqlCtx = await page.getByTestId('practice-lab-context').innerText();
    assert.ok(sqlCtx.includes('Database & SQL Query Lab'), `Expected SQL lab banner, got: ${sqlCtx}`);
    await page.locator('select[aria-label="Practice language"]').selectOption('sql');
    await page
      .getByTestId('practice-code-editor')
      .fill('SELECT d.name AS department, COUNT(e.id) AS staff FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id ORDER BY staff DESC;');
    await page.getByTestId('practice-run-btn').click();
    await page.getByTestId('sql-lab-result-grid').waitFor({ state: 'visible', timeout: 10000 });
    const sqlGridText = await page.getByTestId('sql-lab-result-grid').innerText();
    assert.ok(sqlGridText.includes('4 row(s) returned') && sqlGridText.includes('Curriculum Engineering'), `Expected SQLite rows in grid, got: ${sqlGridText}`);

    // Step 9: Responsive layout checks — Desktop (1280x800), Tablet (768x1024), Mobile (390x844)
    const desktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(desktopOverflow, false, 'Expected zero horizontal overflow at 1280x800 desktop');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForSelector('[data-testid="mobile-tab-lesson"]', { timeout: 5000 });
    const tabletOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(tabletOverflow, false, 'Expected zero horizontal overflow at 768x1024 tablet');

    await page.setViewportSize({ width: 390, height: 844 });
    const tabHeight = await page
      .getByTestId('mobile-tab-code')
      .evaluate((el) => el.getBoundingClientRect().height);
    assert.ok(tabHeight >= 44, `Expected >=44px mobile touch target height, got ${tabHeight}px`);

    await page.getByTestId('mobile-tab-code').click();
    await page.getByTestId('practice-code-editor').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('mobile-tab-whiteboard').click();
    await page.getByTestId('whiteboard-canvas').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('mobile-tab-lesson').click();

    await page.locator('button:visible', { hasText: 'Outline' }).first().click();
    await page.locator('[aria-label="Mobile course syllabus navigation"]').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('[aria-label="Mobile course syllabus navigation"] [aria-label="Close course outline"]').click();

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(mobileOverflow, false, 'Expected zero horizontal overflow at 390x844 mobile');

    // Step 9B: Phase 24 Dashboard Rule-Based Recommended Next Steps Card
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole('button', { name: /^Dashboard$/i }).first().click();
    await page.getByTestId('recommended-next-steps').waitFor({ state: 'visible', timeout: 10000 });
    const recText = await page.getByTestId('recommended-next-steps').innerText();
    assert.ok(recText.includes('Recommended Next Steps'), `Expected Recommended Next Steps heading, got: ${recText}`);

    // Step 10: Admin Curriculum Governance + Phase 24 Intelligence & Audit Tab
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Sign In$/i }).first().click();
    await page.locator('input[type="email"]').fill('mentor@bcschools.dev');
    await page.locator('input[type="password"]').fill('BrainCode#2026!');
    await page.getByRole('button', { name: /^Sign In$/i }).last().click();
    await page.getByRole('button', { name: /Admin & CMS/i }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByRole('button', { name: /Admin & CMS/i }).click();
    await page.getByRole('button', { name: /Curriculum & Grading/i }).click();
    await page.waitForSelector('text=Stage:', { timeout: 15000 });
    await page.waitForSelector('text=Web Development Lab', { timeout: 10000 });

    // Open Phase 24 Intelligence & Audit sub-tab + Curriculum Quality Report
    await page.getByRole('button', { name: /Intelligence & Audit/i }).click();
    await page.getByTestId('curriculum-intelligence-tab').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('curriculum-quality-report-panel').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: /Run Automated Audit/i }).click();
    await page.waitForSelector('text=Curriculum Quality Report generated', { timeout: 10000 });
    await page.getByRole('button', { name: /^All Technologies \(/i }).click();
    await page.waitForSelector('text=HTML', { timeout: 5000 });
    await page.getByRole('button', { name: /^Empty Modules & Missing Projects/i }).click();
    await page.getByRole('button', { name: /^Gap Explorer/i }).click();

    await page.waitForSelector('text=Course Quality Matrix', { timeout: 10000 });
    await page.locator('[data-testid="curriculum-intelligence-tab"] button', { hasText: /^Inspect$/ }).first().click();
    await page.waitForSelector('text=Progression & Certificate Policy', { timeout: 10000 });

    // Step 11: Unified 3-Area Tutorial Studio (/learn/html, sql, python, kubernetes, figma, cybersecurity) + Mobile
    await page.goto(`${baseUrl}/learn/html`, { waitUntil: 'networkidle' });
    await page.getByTestId('unified-tutorial-studio').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('tutorial-lesson-article').waitFor({ state: 'visible', timeout: 15000 });

    // Verify 3-area layout geometry, independent sidebar scrollability, active border & topic toggle on /learn/html
    const studioThreeArea = await page.evaluate(() => {
      const header = document.querySelector('[data-testid="studio-top-header"]')?.getBoundingClientRect();
      const sidebar = document.querySelector('[data-testid="curriculum-sidebar"]')?.getBoundingClientRect();
      const main = document.querySelector('[data-testid="main-content-area"]')?.getBoundingClientRect();
      const active = document.querySelector('[data-active-lesson="true"]') as HTMLElement | null;
      const tree = document.querySelector('[data-testid="curriculum-tree-scroll"]') as HTMLElement | null;
      const beforeWinY = window.scrollY;
      if (tree) tree.scrollTop = 100;
      const afterTreeScroll = tree ? tree.scrollTop : -1;
      const afterWinY = window.scrollY;
      if (tree) tree.scrollTop = 0;
      return {
        headerBottom: header?.bottom ?? 0,
        sidebarTop: sidebar?.top ?? 0,
        sidebarRight: sidebar?.right ?? 0,
        mainLeft: main?.left ?? 0,
        activeBorderWidth: active ? getComputedStyle(active).borderWidth : '',
        treeOverflowY: tree ? getComputedStyle(tree).overflowY : '',
        treeScrollable: tree ? tree.scrollHeight > tree.clientHeight : false,
        afterTreeScroll,
        windowStayedStill: beforeWinY === afterWinY,
      };
    });
    assert.ok(
      studioThreeArea.sidebarTop >= studioThreeArea.headerBottom - 2 &&
        studioThreeArea.sidebarRight <= studioThreeArea.mainLeft + 2,
      `Expected clean 3-area geometry on /learn/html, got ${JSON.stringify(studioThreeArea)}`
    );
    assert.equal(studioThreeArea.activeBorderWidth, '2px', 'Expected 2px active lesson highlight on /learn/html');
    assert.ok(
      ['auto', 'scroll'].includes(studioThreeArea.treeOverflowY) &&
        studioThreeArea.treeScrollable &&
        studioThreeArea.afterTreeScroll > 0 &&
        studioThreeArea.windowStayedStill,
      `Expected independently scrollable curriculum sidebar on /learn/html, got ${JSON.stringify(studioThreeArea)}`
    );
    const firstTopicToggle = page.locator('[data-topic-id]').first();
    const firstTopicText = await firstTopicToggle.innerText();
    assert.ok(firstTopicText.includes('1.1'), `Expected numbered topic header 1.1, got: ${firstTopicText}`);
    const firstTopicPanelId = await firstTopicToggle.getAttribute('aria-controls');
    assert.ok(firstTopicPanelId, 'Expected aria-controls on numbered topic header');
    assert.equal(await firstTopicToggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator(`#${firstTopicPanelId}`).count(), 1, 'Expected topic lesson group visible when expanded');

    // Scroll main content viewport, then verify sidebar scroll + topic toggle do NOT disturb main viewport scrollY
    const mainScrollBefore = await page.evaluate(() => {
      window.scrollTo(0, 240);
      return window.scrollY;
    });
    assert.ok(mainScrollBefore >= 200, `Expected main content viewport to scroll, got ${mainScrollBefore}`);
    await firstTopicToggle.click();
    assert.equal(await firstTopicToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.locator(`#${firstTopicPanelId}`).count(), 0, 'Expected topic lesson group hidden when collapsed');
    await firstTopicToggle.click();
    assert.equal(await firstTopicToggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await page.locator(`#${firstTopicPanelId}`).count(), 1, 'Expected topic lesson group restored when expanded');

    const viewportAfterSidebarOps = await page.evaluate(() => {
      const tree = document.querySelector('[data-testid="curriculum-tree-scroll"]') as HTMLElement | null;
      if (tree) tree.scrollTop = 120;
      const treeTop = tree ? tree.scrollTop : 0;
      if (tree) tree.scrollTop = 0;
      const winY = window.scrollY;
      window.scrollTo(0, 0);
      return { treeTop, winY };
    });
    assert.ok(viewportAfterSidebarOps.treeTop > 0, 'Expected sidebar scrollTop to advance independently');
    assert.equal(
      viewportAfterSidebarOps.winY,
      mainScrollBefore,
      'Expected sidebar scrolling and topic toggles not to affect main content viewport scrollY'
    );

    await page.getByTestId('toggle-outline-sidebar-btn').click();
    assert.equal(await page.getByTestId('toggle-outline-sidebar-btn').getAttribute('aria-expanded'), 'false');
    await page.getByTestId('toggle-outline-sidebar-btn').click();
    assert.equal(await page.getByTestId('toggle-outline-sidebar-btn').getAttribute('aria-expanded'), 'true');

    // Non-sequential lesson jump: click Lesson 03 directly without completing Lesson 01
    const lessonThreeBtn = page.locator('[data-lesson-id]').nth(2);
    await lessonThreeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await lessonThreeBtn.click();
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-active-lesson="true"]');
      return el && el.textContent?.includes('03.');
    });

    // Top Previous button navigates back without sequential gates
    await page.getByTestId('lesson-prev-top-btn').click();
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-active-lesson="true"]');
      return el && el.textContent?.includes('02.');
    });

    // Try It Yourself loads snippet into Practice Workspace + executes live HTML preview
    await page.getByRole('button', { name: 'Try It Yourself' }).first().click();
    await page.getByTestId('practice-run-btn').click();
    await page.getByTestId('practice-preview-iframe').waitFor({ state: 'visible', timeout: 10000 });

    // Organized Secondary Resources Drawer: Quick Reference, PX/EM Converter, Certification
    await page.getByTestId('open-resources-drawer-btn').click();
    await page.getByTestId('technology-resources-drawer').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('px-em-converter').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByLabel('Pixels value').fill('32');
    const emVal = await page.getByLabel('EM value').inputValue();
    assert.equal(emVal, '2', `Expected 32px at 16px base to compute 2em, got ${emVal}`);
    await page.getByLabel('Search HTML reference tables').fill('header');
    await page.getByTestId('technology-resources-drawer').locator('td', { hasText: '<header>' }).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('resources-tab-challenges').click();
    await page.getByTestId('technology-resources-drawer').getByText('Certified HTML5 Developer Exam').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'Close resources drawer' }).click();

    // Verify /learn/sql runs live SQLite queries & opens SQL Schema Explorer inside Resources
    await page.goto(`${baseUrl}/learn/sql`, { waitUntil: 'networkidle' });
    await page.getByTestId('tutorial-lesson-article').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('practice-run-btn').click();
    await page.getByTestId('sql-lab-result-grid').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('open-resources-drawer-btn').click();
    await page.getByTestId('sql-sandbox-schema-viewer').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await page.getByTestId('px-em-converter').count(), 0, 'SQL must not show HTML PX/EM converter');
    await page.getByRole('button', { name: 'Close resources drawer' }).click();

    // Verify /learn/python honest syntax notice, /learn/kubernetes honest in-development roadmap, /learn/figma & /learn/cybersecurity
    await page.goto(`${baseUrl}/learn/python`, { waitUntil: 'networkidle' });
    await page.getByTestId('tutorial-lesson-article').waitFor({ state: 'visible', timeout: 15000 });
    await page.getByTestId('practice-run-btn').click();
    const pyLabOut = await page.getByTestId('practice-console-output').innerText();
    assert.ok(pyLabOut.includes('CODE_SANDBOX_URL'), `Expected honest Python sandbox notice, got: ${pyLabOut}`);

    await page.goto(`${baseUrl}/learn/kubernetes`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Course Content In Preparation', { timeout: 15000 });

    await page.goto(`${baseUrl}/learn/cybersecurity`, { waitUntil: 'networkidle' });
    await page.getByTestId('practice-tab-preview').click();
    await page.getByTestId('security-network-toolkit').waitFor({ state: 'visible', timeout: 10000 });

    await page.goto(`${baseUrl}/learn/figma`, { waitUntil: 'networkidle' });
    await page.getByTestId('practice-tab-preview').click();
    await page.getByTestId('design-wcag-inspector').waitFor({ state: 'visible', timeout: 10000 });

    // Mobile responsiveness check on unified /learn/html Tutorial Studio
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}/learn/html`, { waitUntil: 'networkidle' });
    await page.getByTestId('mobile-tab-lesson').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('mobile-tab-code').click();
    await page.getByTestId('practice-code-editor').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByTestId('mobile-tab-lesson').click();
    const lcMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    assert.equal(lcMobileOverflow, false, 'Expected zero horizontal overflow on /learn/html mobile view');

    assert.deepEqual(pageErrors, [], `Unexpected page errors: ${pageErrors.join(' | ')}`);
    assert.deepEqual(server500s, [], `Unexpected API 5xx errors: ${server500s.join(' | ')}`);
    console.log('E2E_BROWSER_SUITE_PASSED: All unified tutorial studio, discipline lab, and mobile assertions passed cleanly.');
  } finally {
    if (browser) await browser.close();
    if (vite) await vite.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      db.close();
    } catch {
      // ignore if already closed
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('E2E_BROWSER_SUITE_FAILED:', err);
  process.exit(1);
});
