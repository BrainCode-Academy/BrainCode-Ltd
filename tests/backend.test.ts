import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import express from 'express';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcschools-test-'));
const tmpDbPath = path.join(tmpDir, 'bcschools-test.db');
process.env.BCSCHOOLS_DB_PATH = tmpDbPath;
process.env.PAYMENT_WEBHOOK_SECRET = 'test_webhook_secret_123';

let server: http.Server;
let baseUrl = '';

describe('Braincode Backend Security, Auth, Contact, Brand & Curriculum', () => {
  before(async () => {
    const { createApiRouter } = await import('../server/routes.ts');
    const app = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          (req as express.Request & { rawBody?: string }).rawBody = buf.toString('utf8');
        },
      })
    );
    app.use('/api', createApiRouter());

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}/api`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  let freeUserToken = '';
  let freeUserId = '';
  let adminToken = '';

  it('registers a free learner, enforces duplicate rejection, and verifies profile persistence', async () => {
    const email = `learner_${Date.now()}@example.com`;

    // Invalid email rejected
    const badEmailRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bad Email',
        email: 'not-an-email',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    assert.equal(badEmailRes.status, 400);

    // Valid registration
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ada Lovelace',
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    assert.equal(regRes.status, 201);
    const regData = (await regRes.json()) as any;
    assert.ok(regData.token);
    assert.equal(regData.user.role, 'learner');
    assert.equal(regData.user.theme_preference, 'dark');
    assert.equal(regData.entitlement.isPremium, false);
    freeUserToken = regData.token;
    freeUserId = regData.user.id;

    // Duplicate email rejected
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ada Clone',
        email,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    assert.equal(dupRes.status, 409);

    // Theme preference update & persistence
    const themeRes = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeUserToken}` },
      body: JSON.stringify({ themePreference: 'light' }),
    });
    assert.equal(themeRes.status, 200);
    const themeData = (await themeRes.json()) as any;
    assert.equal(themeData.user.theme_preference, 'light');
  });

  it('blocks free users from premium lessons, community creation, collab sessions, and admin endpoints', async () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // Find a premium lesson from catalog
    const catalogRes = await fetch(`${baseUrl}/catalog`, { headers: authHeaders });
    assert.equal(catalogRes.status, 200);
    const catalogData = (await catalogRes.json()) as any;
    assert.ok(catalogData.courses.length > 0, 'Expected seeded courses in catalog');

    const courseRes = await fetch(`${baseUrl}/courses/${catalogData.courses[0].slug}`, { headers: authHeaders });
    assert.equal(courseRes.status, 200);
    const courseData = (await courseRes.json()) as any;
    const premiumLesson = courseData.modules
      .flatMap((m: any) => m.lessons)
      .find((l: any) => l.access_tier === 'premium');
    assert.ok(premiumLesson, 'Expected seeded premium lesson');

    const lockedLessonRes = await fetch(`${baseUrl}/lessons/${premiumLesson.id}`, { headers: authHeaders });
    assert.equal(lockedLessonRes.status, 403);

    const commRes = await fetch(`${baseUrl}/communities`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Unauthorized Guild', description: 'Should fail on free tier' }),
    });
    assert.equal(commRes.status, 403);

    const collabRes = await fetch(`${baseUrl}/collab/sessions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: 'Locked Collab Room' }),
    });
    assert.equal(collabRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/admin/overview`, { headers: authHeaders });
    assert.equal(adminRes.status, 403);
  });

  it('keeps access locked on pending/failed payments and activates + revokes entitlements via verified webhook and refunds', async () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // 1. Create pending checkout -> still NOT premium
    const checkoutRes = await fetch(`${baseUrl}/billing/checkout`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ planSlug: 'pro-learner', billingCycle: 'monthly' }),
    });
    assert.equal(checkoutRes.status, 201);
    const checkout = (await checkoutRes.json()) as any;
    assert.ok(checkout.paymentId);

    const meBeforeVerify = (await (await fetch(`${baseUrl}/auth/me`, { headers: authHeaders })).json()) as any;
    assert.equal(meBeforeVerify.entitlement.isPremium, false);

    // 2. Invalid webhook signature rejected
    const webhookPayload = JSON.stringify({
      eventId: 'evt_test_001',
      type: 'payment.succeeded',
      paymentId: checkout.paymentId,
    });
    const badSigRes = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': 'bad_sig' },
      body: webhookPayload,
    });
    assert.equal(badSigRes.status, 401);

    // 3. Valid HMAC-signed webhook activates subscription + entitlements
    const validSig = crypto.createHmac('sha256', 'test_webhook_secret_123').update(webhookPayload).digest('hex');
    const okHookRes = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': validSig },
      body: webhookPayload,
    });
    assert.equal(okHookRes.status, 200);
    const okHookData = (await okHookRes.json()) as any;
    assert.equal(okHookData.deduplicated, false);

    // Duplicate webhook is idempotently deduplicated
    const dupHookRes = await fetch(`${baseUrl}/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-signature': validSig },
      body: webhookPayload,
    });
    const dupHookData = (await dupHookRes.json()) as any;
    assert.equal(dupHookData.deduplicated, true);

    // Now freeUser has active premium entitlement & can create a community
    const meAfterVerify = (await (await fetch(`${baseUrl}/auth/me`, { headers: authHeaders })).json()) as any;
    assert.equal(meAfterVerify.entitlement.isPremium, true);
    assert.equal(meAfterVerify.entitlement.limits.canCreateCommunity, true);

    // 4. Admin login & refund revokes entitlement
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mentor@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    assert.equal(adminLoginRes.status, 200);
    adminToken = ((await adminLoginRes.json()) as any).token;

    const refundRes = await fetch(`${baseUrl}/admin/payments/${checkout.paymentId}/refund`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(refundRes.status, 200);

    const meAfterRefund = (await (await fetch(`${baseUrl}/auth/me`, { headers: authHeaders })).json()) as any;
    assert.equal(meAfterRefund.entitlement.isPremium, false);
  });

  it('supports standalone admin scholarship entitlements independent of subscriptions and records audit logs', async () => {
    const grantRes = await fetch(`${baseUrl}/admin/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        userId: freeUserId,
        featureKey: 'premium_course_access',
        source: 'scholarship',
        durationDays: 14,
        notes: 'Cohort scholarship recipient',
      }),
    });
    assert.equal(grantRes.status, 201);

    const meWithScholarship = (await (
      await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${freeUserToken}` } })
    ).json()) as any;
    assert.equal(meWithScholarship.entitlement.isPremium, true);
    assert.equal(meWithScholarship.entitlement.limits.canAccessPremiumCourses, true);
    assert.equal(meWithScholarship.entitlement.limits.canCreateCommunity, false);

    const overviewRes = await fetch(`${baseUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const overview = (await overviewRes.json()) as any;
    assert.ok(overview.auditLogs.length >= 2);
  });

  it('serves 20 categories, 200+ unique technologies, directory pagination, alias search, and honest learning status', async () => {
    const catalogRes = await fetch(`${baseUrl}/catalog`);
    assert.equal(catalogRes.status, 200);
    const catalog = (await catalogRes.json()) as any;
    assert.ok(catalog.categories.length >= 20, `Expected >= 20 categories, got ${catalog.categories.length}`);
    assert.ok(catalog.technologies.length >= 200, `Expected >= 200 technologies, got ${catalog.technologies.length}`);
    assert.ok(catalog.learningPaths.length >= 12, `Expected >= 12 learning paths, got ${catalog.learningPaths.length}`);

    // Verify zero duplicate technology names or slugs across the full directory
    const fullDirRes = await fetch(`${baseUrl}/technologies?limit=300`);
    assert.equal(fullDirRes.status, 200);
    const fullDir = (await fullDirRes.json()) as any;
    assert.ok(fullDir.totalCount >= 200, `Expected >= 200 totalCount, got ${fullDir.totalCount}`);
    const seenNames = new Set<string>();
    const seenSlugs = new Set<string>();
    for (const tech of fullDir.technologies) {
      const nameKey = String(tech.name).trim().toLowerCase();
      assert.ok(!seenNames.has(nameKey), `Duplicate technology name found: ${tech.name}`);
      assert.ok(!seenSlugs.has(tech.slug), `Duplicate technology slug found: ${tech.slug}`);
      seenNames.add(nameKey);
      seenSlugs.add(tech.slug);
      // Honest learning_status check: available strictly means course_count > 0
      if (tech.learning_status === 'available') {
        assert.ok(Number(tech.course_count) > 0, `Expected courses > 0 for available tech ${tech.name}`);
      } else {
        assert.equal(Number(tech.course_count), 0, `Expected 0 courses for non-available tech ${tech.name}`);
      }
    }

    // Alias search ('k8s' -> Kubernetes, 'golang' -> Go)
    const k8sRes = await fetch(`${baseUrl}/technologies?q=k8s`);
    const k8sData = (await k8sRes.json()) as any;
    assert.ok(k8sData.technologies.some((t: any) => t.slug === 'kubernetes'), 'Expected k8s alias to match Kubernetes');

    const goRes = await fetch(`${baseUrl}/technologies?q=golang`);
    const goData = (await goRes.json()) as any;
    assert.ok(goData.technologies.some((t: any) => t.slug === 'go'), 'Expected golang alias to match Go');

    // Category filter chip + sorting + pagination
    const fwRes = await fetch(`${baseUrl}/technologies?category=frameworks-libraries&sort=alpha&limit=10&offset=0`);
    const fwData = (await fwRes.json()) as any;
    assert.ok(fwData.technologies.length > 0 && fwData.technologies.length <= 10);
    assert.ok(fwData.filteredCount >= 10);

    // Dedicated technology detail page (available + coming soon)
    const pyTechRes = await fetch(`${baseUrl}/technologies/python`);
    assert.equal(pyTechRes.status, 200);
    const pyTech = (await pyTechRes.json()) as any;
    assert.equal(pyTech.technology.name, 'Python');
    assert.equal(pyTech.technology.learning_status, 'available');
    assert.ok(pyTech.courses.length >= 1);
    assert.ok(pyTech.courses[0].modules.length >= 2);
    // Ensure premium lesson bodies are not exposed on public technology outline
    const allPyLessons = pyTech.courses[0].modules.flatMap((m: any) => m.lessons);
    assert.equal(allPyLessons[0].content_markdown, undefined);

    const rustTechRes = await fetch(`${baseUrl}/technologies/rust`);
    assert.equal(rustTechRes.status, 200);
    const rustTech = (await rustTechRes.json()) as any;
    assert.equal(rustTech.courses.length, 0);
    assert.notEqual(rustTech.technology.learning_status, 'available');
    assert.ok(Array.isArray(rustTech.relatedTechnologies) && rustTech.relatedTechnologies.length > 0);

    const searchRes = await fetch(`${baseUrl}/search?q=python&access=free`);
    assert.equal(searchRes.status, 200);
    const searchData = (await searchRes.json()) as any;
    assert.ok(searchData.technologies.some((t: any) => t.slug === 'python'));
    assert.ok(searchData.lessons.every((l: any) => l.access_tier === 'free' && l.content_markdown === undefined));
  });

  it('requires complete course progress before issuing a verifiable certificate', async () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };
    const htmlCourseRes = await fetch(`${baseUrl}/courses/html5-semantic-architecture`, { headers: authHeaders });
    assert.equal(htmlCourseRes.status, 200);
    const htmlCourse = (await htmlCourseRes.json()) as any;
    const courseId = htmlCourse.course.id;
    const lessons = htmlCourse.modules.flatMap((m: any) => m.lessons);

    // Incomplete claim rejected
    const prematureRes = await fetch(`${baseUrl}/certificates/claim/${courseId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(prematureRes.status, 400);

    // Complete all lessons (using admin scholarship grant or free lessons; HTML has free + premium, grant all_premium first)
    await fetch(`${baseUrl}/admin/entitlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ userId: freeUserId, featureKey: 'all_premium', source: 'admin_grant', durationDays: 7 }),
    });

    for (const les of lessons) {
      const cRes = await fetch(`${baseUrl}/lessons/${les.id}/complete`, {
        method: 'POST',
        headers: authHeaders,
      });
      assert.equal(cRes.status, 200);
    }

    const claimRes = await fetch(`${baseUrl}/certificates/claim/${courseId}`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(claimRes.status, 201);
    const claimed = (await claimRes.json()) as any;
    assert.ok(claimed.certificate.certificate_code.startsWith('CERT-BC-'));

    // Public verification check
    const verifyRes = await fetch(`${baseUrl}/certificates/verify/${claimed.certificate.certificate_code}`);
    assert.equal(verifyRes.status, 200);
    const verifyData = (await verifyRes.json()) as any;
    assert.equal(verifyData.valid, true);
    assert.equal(verifyData.certificate.course_title, htmlCourse.course.title);
  });

  it('supports admin technology CRUD with duplicate rejection and validated JSON/CSV curriculum import/export', async () => {
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    // Duplicate technology rejected with 409
    const dupTechRes = await fetch(`${baseUrl}/admin/technologies`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: 'Python', categoryId: 'cat_langs' }),
    });
    assert.equal(dupTechRes.status, 409);

    // Create + edit extended metadata + delete technology
    const createTechRes = await fetch(`${baseUrl}/admin/technologies`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        name: 'CarbonLang',
        categoryId: 'cat_langs',
        iconSymbol: 'CRB',
        brandColor: '#3B82F6',
        difficulty: 'Advanced',
        contentStatus: 'in_development',
        aliases: ['carbon-cpp', 'carbon'],
        sortOrder: 40,
      }),
    });
    assert.equal(createTechRes.status, 201);
    const createdTech = (await createTechRes.json()) as any;

    const patchTechRes = await fetch(`${baseUrl}/admin/technologies/${createdTech.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ sortOrder: 2, isPopular: true, contentStatus: 'coming_soon' }),
    });
    assert.equal(patchTechRes.status, 200);

    const delTechRes = await fetch(`${baseUrl}/admin/technologies/${createdTech.id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.equal(delTechRes.status, 200);

    // Reject malformed curriculum import cleanly
    const badImportRes = await fetch(`${baseUrl}/admin/curriculum/import`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ data: { courses: [{ title: 'Missing Slug Course' }] } }),
    });
    assert.equal(badImportRes.status, 400);

    // Valid CSV curriculum import as draft
    const csvImportRes = await fetch(`${baseUrl}/admin/curriculum/import`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        csv: 'course_title,module_title,lesson_title,access_tier,language\nZig Foundations,Module 1: Memory,Allocators Intro,free,zig',
        publishImmediately: false,
      }),
    });
    assert.equal(csvImportRes.status, 201);
    const csvImportData = (await csvImportRes.json()) as any;
    assert.equal(csvImportData.importedCourses, 1);
    assert.equal(csvImportData.importedLessons, 1);

    // Export JSON & CSV
    const exportJsonRes = await fetch(`${baseUrl}/admin/curriculum/export?format=json`, { headers: adminHeaders });
    assert.equal(exportJsonRes.status, 200);
    const exportJson = (await exportJsonRes.json()) as any;
    assert.ok(exportJson.courses.length >= 10);

    const exportCsvRes = await fetch(`${baseUrl}/admin/curriculum/export?format=csv`, { headers: adminHeaders });
    assert.equal(exportCsvRes.status, 200);
    const exportCsv = await exportCsvRes.text();
    assert.ok(exportCsv.includes('course_title,course_slug'));
  });

  it('serves Braincode branding, validates contact submissions, and manages social links & enquiries in admin', async () => {
    const publicRes = await fetch(`${baseUrl}/config/public`);
    assert.equal(publicRes.status, 200);
    const publicData = (await publicRes.json()) as any;
    assert.equal(publicData.brand.product_name, 'Braincode');
    assert.equal(publicData.brand.tagline, 'Learn. Build. Innovate. Grow.');
    assert.equal(publicData.brand.company_name, 'BrainCode Technology Limited');

    // Honeypot triggered -> 400
    const spamRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Spam Bot',
        email: 'bot@example.com',
        category: 'General Enquiry',
        subject: 'Buy links',
        message: 'Spam payload with website field filled.',
        website: 'https://spam.example.com',
      }),
    });
    assert.equal(spamRes.status, 400);

    // Invalid category -> 400
    const badCatRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Grace Hopper',
        email: 'grace@example.com',
        category: 'Unknown Category',
        subject: 'Compiler Question',
        message: 'Question about the compiler track curriculum.',
      }),
    });
    assert.equal(badCatRes.status, 400);

    // Valid contact enquiry persisted -> 201
    const okContactRes = await fetch(`${baseUrl}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Grace Hopper',
        email: 'grace@example.com',
        category: 'Institutional or School Training',
        subject: 'University Systems Cohort',
        message: 'We would like to onboard 40 students onto Braincode this semester.',
      }),
    });
    assert.equal(okContactRes.status, 201);
    const contactCreated = (await okContactRes.json()) as any;
    assert.ok(contactCreated.id);

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    // Admin lists & updates enquiry status
    const listInqRes = await fetch(`${baseUrl}/admin/contact-inquiries?status=pending`, { headers: adminHeaders });
    assert.equal(listInqRes.status, 200);
    const listInq = (await listInqRes.json()) as any;
    assert.ok(listInq.inquiries.some((i: any) => i.id === contactCreated.id));

    const resolveInqRes = await fetch(`${baseUrl}/admin/contact-inquiries/${contactCreated.id}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ status: 'resolved', adminNotes: 'Sent institutional onboarding deck.' }),
    });
    assert.equal(resolveInqRes.status, 200);

    // Reject javascript: social URLs
    const badBrandRes = await fetch(`${baseUrl}/admin/brand`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        social_links: { x: 'javascript:alert(1)' },
      }),
    });
    assert.equal(badBrandRes.status, 400);

    // Persist valid official contact & social links
    const goodBrandRes = await fetch(`${baseUrl}/admin/brand`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        official_contact_email: 'hello@braincode.dev',
        business_phone: '+234 800 123 4567',
        social_links: {
          linkedin: 'https://linkedin.com/company/braincode',
          github: 'https://github.com/braincode',
          youtube: 'https://youtube.com/@braincode',
          custom: [{ label: 'Community Forum', url: 'https://community.braincode.dev' }],
        },
      }),
    });
    assert.equal(goodBrandRes.status, 200);
    const updatedBrand = (await goodBrandRes.json()) as any;
    assert.equal(updatedBrand.brand.official_contact_email, 'hello@braincode.dev');
    assert.equal(updatedBrand.brand.social_links.linkedin, 'https://linkedin.com/company/braincode');
    assert.equal(updatedBrand.brand.social_links.custom[0].label, 'Community Forum');
  });

  it('powers enriched technology details, structured lessons, DB notes, 10-type exercises, assignments, and starter project templates', async () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // 1. Technology page returns projectTemplates & userProgress
    const pyTechRes = await fetch(`${baseUrl}/technologies/python`, { headers: authHeaders });
    assert.equal(pyTechRes.status, 200);
    const pyTech = (await pyTechRes.json()) as any;
    assert.ok(Array.isArray(pyTech.projectTemplates) && pyTech.projectTemplates.length > 0);
    assert.ok(pyTech.userProgress && typeof pyTech.userProgress.totalLessons === 'number');

    // 2. Lesson detail returns structured blocks, codeExamples, exercises, prev/next IDs & DB note
    const lesRes = await fetch(`${baseUrl}/lessons/les_py_1`, { headers: authHeaders });
    assert.equal(lesRes.status, 200);
    const lesData = (await lesRes.json()) as any;
    assert.ok(Array.isArray(lesData.blocks) && lesData.blocks.length > 0);
    assert.ok(Array.isArray(lesData.codeExamples) && lesData.codeExamples.length > 0);
    assert.ok(Array.isArray(lesData.exercises) && lesData.exercises.length > 0);

    // 3. Persist study note to DB & verify reload returns saved note
    const putNoteRes = await fetch(`${baseUrl}/lessons/les_py_1/note`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ noteText: 'Remember f-strings evaluate expressions inside {}.' }),
    });
    assert.equal(putNoteRes.status, 200);
    const lesReload = (await (await fetch(`${baseUrl}/lessons/les_py_1`, { headers: authHeaders })).json()) as any;
    assert.equal(lesReload.noteText, 'Remember f-strings evaluate expressions inside {}.');

    // 4. Solution endpoint blocks reveal before attempting
    const blockedSolRes = await fetch(`${baseUrl}/exercises/ex_py_mc_1/solution`, { headers: authHeaders });
    assert.equal(blockedSolRes.status, 403);

    // 5. Wrong then right exercise submission + solution reveal
    const wrongExRes = await fetch(`${baseUrl}/exercises/ex_py_mc_1/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ answerText: '"Enrolled in {track}"' }),
    });
    assert.equal(wrongExRes.status, 200);
    assert.equal(((await wrongExRes.json()) as any).isCorrect, false);

    const solRes = await fetch(`${baseUrl}/exercises/ex_py_mc_1/solution`, { headers: authHeaders });
    assert.equal(solRes.status, 200);
    const solData = (await solRes.json()) as any;
    assert.equal(solData.correctAnswer, 'f"Enrolled in {track}"');

    const okExRes = await fetch(`${baseUrl}/exercises/ex_py_mc_1/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ answerText: solData.correctAnswer }),
    });
    assert.equal(okExRes.status, 200);
    const okExData = (await okExRes.json()) as any;
    assert.equal(okExData.isCorrect, true);
    assert.ok(okExData.xpAwarded > 0);

    // 6. Write-code token validation
    const writeCodeRes = await fetch(`${baseUrl}/exercises/ex_js_write_1/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        codeSubmitted: 'const total = items.filter(c => c.published).reduce((a, b) => a + b.hours, 0);',
      }),
    });
    assert.equal(writeCodeRes.status, 200);
    assert.equal(((await writeCodeRes.json()) as any).isCorrect, true);

    // 7. Start starter project template into Workspace + Portfolio
    const startTplRes = await fetch(`${baseUrl}/projects/templates/ptpl_python_cli/start`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ createPortfolioEntry: true }),
    });
    assert.equal(startTplRes.status, 201);
    const tplStarted = (await startTplRes.json()) as any;
    assert.ok(tplStarted.workspace?.id);
    assert.ok(tplStarted.projectId);

    // 8. Submit course assignment
    const asnRes = await fetch(`${baseUrl}/assignments/asn_html_landing/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        submissionText: 'Implemented semantic header, main landmark, and responsive Grid pricing table.',
        workspaceId: tplStarted.workspace.id,
      }),
    });
    assert.equal(asnRes.status, 201);
    const asnData = (await asnRes.json()) as any;
    assert.ok(asnData.submission?.id);
  });

  it('enforces assessment-gated course certificates, verifies public codes, and rejects incomplete career path certificates', async () => {
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // freeUser already has active scholarship entitlement from earlier test so les_fs_3 (premium) is accessible
    for (const lid of ['les_fs_1', 'les_fs_2', 'les_fs_3']) {
      const comp = await fetch(`${baseUrl}/lessons/${lid}/complete`, {
        method: 'POST',
        headers: authHeaders,
      });
      assert.equal(comp.status, 200);
    }

    // Attempting to claim crs_fullstack certificate BEFORE passing asm_fs_quiz must fail
    const claimBlocked = await fetch(`${baseUrl}/certificates/claim/crs_fullstack`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(claimBlocked.status, 400);

    // Pass asm_fs_quiz
    const quizRes = await fetch(`${baseUrl}/assessments/asm_fs_quiz/submit`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        answers: {
          q1: 'Event delegation on the parent container using event.target.closest()',
          q2: 'False',
          q3: 'auto-fit',
          q4: 'Assignment operator (=) is used instead of strict equality (===), and isPremium should come from the database',
        },
      }),
    });
    assert.equal(quizRes.status, 200);
    const quizData = (await quizRes.json()) as any;
    assert.equal(quizData.passed, true);

    // Claim crs_fullstack certificate now succeeds
    const claimOk = await fetch(`${baseUrl}/certificates/claim/crs_fullstack`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(claimOk.status, 201);
    const certData = (await claimOk.json()) as any;
    assert.ok(certData.certificate.certificate_code);

    // Public verify endpoint validates certificate
    const verifyRes = await fetch(`${baseUrl}/certificates/verify/${certData.certificate.certificate_code}`);
    assert.equal(verifyRes.status, 200);
    const verifyData = (await verifyRes.json()) as any;
    assert.equal(verifyData.valid, true);

    // Incomplete career path certificate must be rejected
    const pathClaimFail = await fetch(`${baseUrl}/learning-paths/path_python_dev/certificate`, {
      method: 'POST',
      headers: authHeaders,
    });
    assert.equal(pathClaimFail.status, 400);
  });

  it('allows instructors to author curriculum, transition workflow states, preview imports, and grade submissions while blocking finance/user routes', async () => {
    const instLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    assert.equal(instLogin.status, 200);
    const instructorToken = ((await instLogin.json()) as any).token;
    const instHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${instructorToken}`,
    };

    // Instructor blocked from Admin-only finance and user management routes
    const planForbidden = await fetch(`${baseUrl}/admin/plans/plan_pro`, {
      method: 'PATCH',
      headers: instHeaders,
      body: JSON.stringify({ monthlyPriceCents: 100 }),
    });
    assert.equal(planForbidden.status, 403);

    const userForbidden = await fetch(`${baseUrl}/admin/users/${freeUserId}`, {
      method: 'PATCH',
      headers: instHeaders,
      body: JSON.stringify({ role: 'admin' }),
    });
    assert.equal(userForbidden.status, 403);

    // Learner blocked from CMS topic creation
    const learnerForbidden = await fetch(`${baseUrl}/admin/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${freeUserToken}` },
      body: JSON.stringify({ courseId: 'crs_python', moduleId: 'mod_py_1', title: 'Unauthorized Topic' }),
    });
    assert.equal(learnerForbidden.status, 403);

    // Instructor creates course topic, block, code example, exercise & assignment
    const topicRes = await fetch(`${baseUrl}/admin/topics`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        courseId: 'crs_python',
        moduleId: 'mod_py_1',
        title: 'Type Hints & Static Checking',
        summary: 'Using annotations for maintainable functions.',
      }),
    });
    assert.equal(topicRes.status, 201);

    const blockRes = await fetch(`${baseUrl}/admin/lessons/les_py_1/blocks`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        blockType: 'callout',
        title: 'PEP 8 Tip',
        contentMarkdown: 'Use 4 spaces per indentation level consistently.',
      }),
    });
    assert.equal(blockRes.status, 201);

    const exmRes = await fetch(`${baseUrl}/admin/lessons/les_py_1/examples`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        title: 'Quick List Summary',
        language: 'python',
        code: 'scores = [90, 95]\nprint(sum(scores))',
        expectedOutput: '185',
      }),
    });
    assert.equal(exmRes.status, 201);

    const createdCourseRes = await fetch(`${baseUrl}/admin/courses`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        title: 'Instructor Draft Lab',
        description: 'End-to-end testing workflow states.',
        categoryId: 'cat_langs',
        technologyId: 'tech_python',
        difficulty: 'Intermediate',
      }),
    });
    assert.equal(createdCourseRes.status, 201);
    const newCourse = (await createdCourseRes.json()) as any;

    // Editorial workflow transition: draft -> review -> approved -> published
    for (const wf of ['draft', 'review', 'approved', 'published']) {
      const wfRes = await fetch(`${baseUrl}/admin/courses/${newCourse.id}`, {
        method: 'PATCH',
        headers: instHeaders,
        body: JSON.stringify({ workflowStatus: wf }),
      });
      assert.equal(wfRes.status, 200);
      assert.equal(((await wfRes.json()) as any).workflowStatus, wf);
    }

    // Dry-run import preview
    const previewRes = await fetch(`${baseUrl}/admin/curriculum/import/preview`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        csv: 'course_title,module_title,lesson_title,access_tier,language\nGo Systems,Module 1,Goroutines,free,go',
      }),
    });
    assert.equal(previewRes.status, 200);
    const previewData = (await previewRes.json()) as any;
    assert.equal(previewData.valid, true);
    assert.equal(previewData.summary.lessons, 1);

    // Grade pending assignment submission from overview
    const overviewRes = await fetch(`${baseUrl}/admin/overview`, { headers: instHeaders });
    assert.equal(overviewRes.status, 200);
    const overview = (await overviewRes.json()) as any;
    assert.ok(overview.pendingAssignmentSubmissions.length > 0);
    const subId = overview.pendingAssignmentSubmissions[0].id;

    const gradeAsnRes = await fetch(`${baseUrl}/admin/assignments/submissions/${subId}`, {
      method: 'PATCH',
      headers: instHeaders,
      body: JSON.stringify({ status: 'approved', score: 96, instructorFeedback: 'Strong semantic layout!' }),
    });
    assert.equal(gradeAsnRes.status, 200);
  });

  it('computes real curriculum coverage across all 237 technologies, enforces QA gates, independent review, versioning rollback, and atomic package imports', async () => {
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };
    const instLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'elena@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    const instToken = ((await instLogin.json()) as any).token;
    const instHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${instToken}`,
    };

    // 1. Coverage Dashboard covers all 237 technologies with blueprints & strict non-inflated statuses
    const covRes = await fetch(`${baseUrl}/admin/curriculum/coverage?limit=250`, { headers: adminHeaders });
    assert.equal(covRes.status, 200);
    const covData = (await covRes.json()) as any;
    assert.equal(covData.summary.totalTechnologies, 237);
    assert.ok(covData.technologies.every((t: any) => t.hasBlueprint === true));

    // Verify 1-lesson Java course is NOT marked substantially_complete
    const javaRow = covData.technologies.find((t: any) => t.slug === 'java');
    assert.ok(javaRow);
    assert.notEqual(javaRow.calculatedStatus, 'substantially_complete');

    // Verify C++ draft course registers honestly as in_development (0 published courses)
    const cppRow = covData.technologies.find((t: any) => t.slug === 'cpp');
    assert.ok(cppRow);
    assert.equal(cppRow.publishedCourses, 0);
    assert.ok(cppRow.draftCourses >= 1);

    // Verify Rust blueprint has domain-specific modules (never generic JS copy)
    const rustBpRes = await fetch(`${baseUrl}/admin/curriculum/blueprints?technologyId=tech_rust`, { headers: adminHeaders });
    assert.equal(rustBpRes.status, 200);
    const rustBp = (await rustBpRes.json()) as any;
    assert.equal(rustBp.blueprints.length, 1);
    assert.ok(JSON.stringify(rustBp.blueprints[0].modules).includes('Ownership'));

    // 2. Completeness rule updates persist and recompute evaluations
    const updPolRes = await fetch(`${baseUrl}/admin/curriculum/completeness-rules`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        requireIndependentReview: true,
        aiDailyGenerationLimit: 60,
        config: { technologySubstantialThreshold: 75 },
      }),
    });
    assert.equal(updPolRes.status, 200);
    assert.equal(((await updPolRes.json()) as any).policy.requireIndependentReview, true);

    // 3. AI Studio saves strictly as DRAFT (never auto-published) & honors missing API key honestly
    const genRes = await fetch(`${baseUrl}/admin/curriculum/ai-studio/generate`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        technologyId: 'tech_rust',
        targetType: 'full_lesson',
        difficultyMode: 'Intermediate',
        lessonTitle: 'Borrow Checker Basics',
      }),
    });
    // Without live GEMINI_API_KEY in CI test environment, must fail honestly with 503 AI_NOT_CONFIGURED (never fake reply)
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      assert.equal(genRes.status, 503);
    }

    const saveDraftRes = await fetch(`${baseUrl}/admin/curriculum/ai-studio/save-draft`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        technologyId: 'tech_cpp',
        courseId: 'crs_cpp_draft',
        targetType: 'full_lesson',
        draft: {
          title: 'Move Semantics and Rvalue References',
          language: 'cpp',
          summary: 'Transfer ownership cleanly with std::move without unnecessary heap copies.',
          objectives: ['Understand lvalues vs rvalues', 'Implement move constructors safely'],
          concept_explanation:
            'Move semantics allow C++ types such as std::vector and std::unique_ptr to transfer internal heap buffers in O(1) time instead of deep copying memory.',
          code_examples: [
            {
              title: 'Move unique_ptr ownership',
              language: 'cpp',
              code: '#include <memory>\nint main() { auto a = std::make_unique<int>(5); auto b = std::move(a); return 0; }',
              expected_output: '0',
            },
          ],
          mini_exercise: {
            title: 'Identify moved-from state',
            prompt: 'Explain what state `a` holds after `auto b = std::move(a);` on a std::unique_ptr.',
            hint: 'Exclusive ownership transfers to b, leaving a null.',
          },
          key_takeaways: ['std::move casts an object to an rvalue reference'],
        },
      }),
    });
    assert.equal(saveDraftRes.status, 201);
    const savedDraft = (await saveDraftRes.json()) as any;
    assert.equal(savedDraft.saved.workflowStatus, 'draft');
    const draftLessonId = savedDraft.saved.entityId;

    // 4. Independent Review blocks self-approval by instructor Elena, while Admin approves & publishes cleanly
    const selfApproveBlocked = await fetch(`${baseUrl}/admin/curriculum/review/lesson/${draftLessonId}`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({ action: 'publish', comment: 'Trying self-publish' }),
    });
    assert.equal(selfApproveBlocked.status, 403);
    assert.equal(((await selfApproveBlocked.json()) as any).code, 'INDEPENDENT_REVIEW_REQUIRED');

    // Admin cannot publish a broken-syntax JS draft (QA Gate check!)
    const badLessonRes = await fetch(`${baseUrl}/admin/lessons`, {
      method: 'POST',
      headers: instHeaders,
      body: JSON.stringify({
        courseId: 'crs_js',
        moduleId: 'mod_js_1',
        title: 'Broken JS Syntax Draft',
        summary: 'Bad syntax example',
        contentMarkdown: 'Short.',
        codeExample: 'function broken( { return ; }',
        language: 'javascript',
        status: 'draft',
      }),
    });
    assert.equal(badLessonRes.status, 201);
    const badLessonId = ((await badLessonRes.json()) as any).id;

    const qaGateBlocked = await fetch(`${baseUrl}/admin/curriculum/review/lesson/${badLessonId}`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'publish' }),
    });
    assert.equal(qaGateBlocked.status, 400);
    assert.equal(((await qaGateBlocked.json()) as any).code, 'QA_GATE_FAILED');

    // Admin approves & publishes Elena's valid C++ draft lesson + creates revision snapshot
    const adminPublishRes = await fetch(`${baseUrl}/admin/curriculum/review/lesson/${draftLessonId}`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ action: 'publish', comment: 'Technical accuracy verified' }),
    });
    assert.equal(adminPublishRes.status, 200);
    assert.equal(((await adminPublishRes.json()) as any).workflowStatus, 'published');

    // Reset independent review policy back to default (false) so remaining platform workflows stay flexible
    await fetch(`${baseUrl}/admin/curriculum/completeness-rules`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ requireIndependentReview: false }),
    });

    // 5. Versioning & Rollback preserves existing learner progress while restoring prior lesson title/content
    const editRes = await fetch(`${baseUrl}/admin/lessons/${draftLessonId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Move Semantics Edited Title v2',
        changeSummary: 'Edited heading for clarity',
      }),
    });
    assert.equal(editRes.status, 200);

    const revsRes = await fetch(`${baseUrl}/admin/curriculum/revisions/lesson/${draftLessonId}`, { headers: adminHeaders });
    assert.equal(revsRes.status, 200);
    const revsData = (await revsRes.json()) as any;
    assert.ok(revsData.revisions.length >= 2);
    const originalSnap = revsData.revisions[revsData.revisions.length - 1];

    const restoreRes = await fetch(`${baseUrl}/admin/curriculum/revisions/${originalSnap.id}/restore`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(restoreRes.status, 200);
    const restoredLesson = (await (await fetch(`${baseUrl}/lessons/${draftLessonId}`, { headers: adminHeaders })).json()) as any;
    assert.equal(restoredLesson.lesson.title, 'Move Semantics and Rvalue References');

    // 6. Batch job persists queue items cleanly and rejects duplicate active jobs for same scope
    const batchRes = await fetch(`${baseUrl}/admin/curriculum/ai-jobs`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        technologyIds: ['tech_rust'],
        difficultyMode: 'Intermediate',
        maxLessonsPerTech: 2,
        startImmediately: false,
      }),
    });
    assert.equal(batchRes.status, 201);
    const batchData = (await batchRes.json()) as any;
    assert.equal(batchData.job.status, 'queued');
    assert.equal(batchData.items.length, 2);

    const dupBatchRes = await fetch(`${baseUrl}/admin/curriculum/ai-jobs`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        technologyIds: ['tech_rust'],
        difficultyMode: 'Intermediate',
        maxLessonsPerTech: 2,
        startImmediately: false,
      }),
    });
    assert.equal(dupBatchRes.status, 409);
    const dupData = (await dupBatchRes.json()) as any;
    assert.equal(dupData.code, 'DUPLICATE_BATCH_JOB');

    const cancelBatch12 = await fetch(`${baseUrl}/admin/curriculum/ai-jobs/${batchData.job.id}/cancel`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(cancelBatch12.status, 200);

    // 7. Structured package import rejects invalid FK and protects published courses from silent overwrite
    const badPkgPreview = await fetch(`${baseUrl}/admin/curriculum/package/preview`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        data: {
          courses: [
            {
              title: 'Invalid FK Course',
              slug: 'invalid-fk-course',
              category_id: 'cat_nonexistent',
              technology_id: 'tech_rust',
              modules: [],
            },
          ],
        },
      }),
    });
    assert.equal(badPkgPreview.status, 200);
    assert.equal(((await badPkgPreview.json()) as any).valid, false);

    // Protect published crs_html ('html5-semantic-architecture') from overwrite unless allowOverwritePublished=true
    const conflictPkgRes = await fetch(`${baseUrl}/admin/curriculum/package/import`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        confirm: true,
        allowOverwritePublished: false,
        data: {
          courses: [
            {
              title: 'Overwrite Attempt',
              slug: 'html5-semantic-architecture',
              category_id: 'cat_web_dev',
              technology_id: 'tech_html_std',
              modules: [],
            },
          ],
        },
      }),
    });
    assert.equal(conflictPkgRes.status, 400);

    // Valid atomic structured package import creates draft course, topics, blocks/examples & exercises cleanly
    const validPkgRes = await fetch(`${baseUrl}/admin/curriculum/package/import`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        confirm: true,
        publishImmediately: false,
        data: {
          courses: [
            {
              title: 'Rust Ownership & Lifetimes (Package Draft)',
              slug: 'rust-ownership-pkg-draft',
              category_id: 'cat_langs',
              technology_id: 'tech_rust',
              objectives: ['Understand move semantics and borrowing rules'],
              modules: [
                {
                  title: 'Module 1: Ownership',
                  topics: ['Stack vs Heap', 'Borrow Checker'],
                  lessons: [
                    {
                      title: 'Borrowing and Immutable References',
                      content_markdown: '### Borrowing Rules\n\nEither multiple immutable references OR one mutable reference may exist at a time.',
                      language: 'rust',
                      codeExamples: [
                        {
                          title: 'Borrow length helper',
                          code: 'fn len(s: &String) -> usize { s.len() }',
                          expected_output: 'usize',
                        },
                      ],
                      exercises: [
                        {
                          title: 'Borrow Checker Rule',
                          exercise_type: 'true_false',
                          prompt: 'Multiple simultaneous &mut T references to the same value are permitted in safe Rust.',
                          options: ['True', 'False'],
                          correct_answer: 'False',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    });
    assert.equal(validPkgRes.status, 201);
    const validPkgData = (await validPkgRes.json()) as any;
    assert.equal(validPkgData.status, 'draft');
    assert.equal(validPkgData.summary.exercises, 1);

    // 8. Reports export CSV works cleanly
    const repCsvRes = await fetch(`${baseUrl}/admin/curriculum/reports/export?format=csv`, { headers: adminHeaders });
    assert.equal(repCsvRes.status, 200);
    const repCsv = await repCsvRes.text();
    assert.ok(repCsv.includes('technology_id,name,category'));
  });

  it('verifies Phase 19 Priority 10 curriculum depth, learner draft-isolation, interactive grading, and queue Pause/Cancel/Retry controls', async () => {
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };
    const learnerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // 1. Coverage Dashboard reflects Phase 19 metrics & Priority 10 substantial tracks
    const covRes = await fetch(`${baseUrl}/admin/curriculum/coverage?limit=250`, { headers: adminHeaders });
    assert.equal(covRes.status, 200);
    const covData = (await covRes.json()) as any;
    assert.ok(typeof covData.summary.technologiesAwaitingContent === 'number');
    assert.ok(covData.summary.lessonsAwaitingReview >= 5);
    assert.ok(covData.summary.exerciseCoverageCount >= 10);
    assert.ok(covData.summary.assessmentCoverageCount >= 10);
    assert.ok(covData.summary.projectCoverageCount >= 9);
    assert.ok(Array.isArray(covData.incompleteCourses) && covData.incompleteCourses.length > 0);

    for (const tid of ['tech_html_std', 'tech_css_std', 'tech_js', 'tech_python', 'tech_react', 'tech_ts_std', 'tech_node', 'tech_sql']) {
      const row = covData.technologies.find((t: any) => t.technologyId === tid);
      assert.ok(row, `Expected row for ${tid}`);
      assert.equal(row.calculatedStatus, 'substantially_complete', `${tid} should be substantially_complete`);
      assert.ok(row.publishedLessons >= 5, `${tid} expected >= 5 published lessons`);
      assert.ok(row.exercisesCount >= 3, `${tid} expected >= 3 exercises`);
      assert.ok(row.quizzesCount >= 1, `${tid} expected >= 1 assessment`);
    }

    const javaCov = covData.technologies.find((t: any) => t.technologyId === 'tech_java');
    assert.ok(javaCov);
    assert.ok(javaCov.reviewLessons >= 5, 'Java newly authored units must remain in review queue');

    const cppCov = covData.technologies.find((t: any) => t.technologyId === 'tech_cpp');
    assert.ok(cppCov);
    assert.ok(cppCov.draftLessons >= 5, 'C++ newly authored units must remain in draft status');

    // 2. Learner visibility guard prevents draft/review lessons or unpublished draft courses from leaking to learners
    const javaCourseLearnerRes = await fetch(`${baseUrl}/courses/java-oop-collections`, { headers: learnerHeaders });
    assert.equal(javaCourseLearnerRes.status, 200);
    const javaCourseLearner = (await javaCourseLearnerRes.json()) as any;
    const learnerJavaLessons = javaCourseLearner.modules.flatMap((m: any) => m.lessons || []);
    assert.equal(learnerJavaLessons.length, 1);
    assert.equal(learnerJavaLessons[0].id, 'les_java_1');

    const reviewLessonBlocked = await fetch(`${baseUrl}/lessons/les_java_2`, { headers: learnerHeaders });
    assert.equal(reviewLessonBlocked.status, 403);
    const reviewLessonAdminOk = await fetch(`${baseUrl}/lessons/les_java_2`, { headers: adminHeaders });
    assert.equal(reviewLessonAdminOk.status, 200);

    const cppLearnerBlocked = await fetch(`${baseUrl}/courses/cpp-systems-raii-stl-draft`, { headers: learnerHeaders });
    assert.equal(cppLearnerBlocked.status, 404);
    const cppAdminOk = await fetch(`${baseUrl}/courses/cpp-systems-raii-stl-draft`, { headers: adminHeaders });
    assert.equal(cppAdminOk.status, 200);
    const cppAdminData = (await cppAdminOk.json()) as any;
    assert.ok(cppAdminData.modules.flatMap((m: any) => m.lessons || []).length >= 6);

    // 3. Verify substantive 16-element pedagogical structure, code examples, and assessment submission on new Batch 3 Node.js lesson
    const nodeLessonRes = await fetch(`${baseUrl}/lessons/les_node_2`, { headers: learnerHeaders });
    assert.equal(nodeLessonRes.status, 200);
    const nodeLesson = (await nodeLessonRes.json()) as any;
    assert.ok(nodeLesson.lesson.content_markdown.includes('### 1. Learning Objectives'));
    assert.ok(nodeLesson.lesson.content_markdown.includes('### 13. Further Learning Resources'));
    assert.ok(nodeLesson.blocks.length >= 6);
    assert.ok(nodeLesson.codeExamples.length >= 1 && nodeLesson.codeExamples[0].expected_output.length > 0);
    assert.ok(nodeLesson.exercises.length >= 1);

    const nodeQuizRes = await fetch(`${baseUrl}/assessments/asm_nodejs_quiz/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({
        answers: {
          nd_q1: '4: (err, req, res, next)',
          nd_q2: 'False',
          nd_q3: '409 Conflict',
        },
      }),
    });
    assert.equal(nodeQuizRes.status, 200);
    const nodeQuizData = (await nodeQuizRes.json()) as any;
    assert.equal(nodeQuizData.passed, true);

    // 4. AI Studio readiness status & batch queue Pause / Cancel / Retry lifecycle
    const quotaRes = await fetch(`${baseUrl}/admin/curriculum/ai-studio/quota`, { headers: adminHeaders });
    assert.equal(quotaRes.status, 200);
    const quotaData = (await quotaRes.json()) as any;
    assert.equal(typeof quotaData.aiConfigured, 'boolean');
    assert.ok(typeof quotaData.modelName === 'string' && quotaData.modelName.length > 0);

    const qCreateRes = await fetch(`${baseUrl}/admin/curriculum/ai-jobs`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        technologyIds: ['tech_rust'],
        difficultyMode: 'Intermediate',
        maxLessonsPerTech: 2,
        startImmediately: false,
      }),
    });
    assert.equal(qCreateRes.status, 201);
    const qCreated = (await qCreateRes.json()) as any;
    const jobId = qCreated.job.id;

    const pauseRes = await fetch(`${baseUrl}/admin/curriculum/ai-jobs/${jobId}/pause`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(pauseRes.status, 200);
    assert.equal(((await pauseRes.json()) as any).job.status, 'paused');

    const cancelRes = await fetch(`${baseUrl}/admin/curriculum/ai-jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(cancelRes.status, 200);
    const cancelledData = (await cancelRes.json()) as any;
    assert.equal(cancelledData.job.status, 'cancelled');
    assert.ok(cancelledData.items.every((it: any) => it.status === 'cancelled'));

    const retryRes = await fetch(`${baseUrl}/admin/curriculum/ai-jobs/${jobId}/retry`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ batchSliceSize: 1 }),
    });
    assert.equal(retryRes.status, 200);
    const retriedData = (await retryRes.json()) as any;
    assert.notEqual(retriedData.job.status, 'cancelled');
  });

  it('verifies Phase 20 readiness: AI error classification, draft isolation, mixed grading recalc, cert revocation, code audit & URL validation', async () => {
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };
    const learnerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // 1. AI error classification never wastes retries on non-retryable billing/auth/quota/model errors
    const { classifyAiError } = await import('../server/ai_errors.ts');
    const billingErr = classifyAiError(new Error('403 Billing account is required to access this API'));
    assert.equal(billingErr.code, 'AI_BILLING_REQUIRED');
    assert.equal(billingErr.retryable, false);
    assert.equal(billingErr.statusCode, 402);

    const authErr = classifyAiError(new Error('401 API_KEY_INVALID'));
    assert.equal(authErr.code, 'AI_AUTH_INVALID');
    assert.equal(authErr.retryable, false);

    const quotaErr = classifyAiError(new Error('429 RESOURCE_EXHAUSTED quota exceeded'));
    assert.equal(quotaErr.code, 'AI_UPSTREAM_QUOTA');
    assert.equal(quotaErr.retryable, false);

    const modelErr = classifyAiError(new Error('404 model not found'));
    assert.equal(modelErr.code, 'AI_MODEL_NOT_FOUND');
    assert.equal(modelErr.retryable, false);

    const transientErr = classifyAiError(new Error('503 Service Unavailable'));
    assert.equal(transientErr.code, 'AI_TRANSIENT_UNAVAILABLE');
    assert.equal(transientErr.retryable, true);

    const pubCfg = (await (await fetch(`${baseUrl}/config/public`)).json()) as any;
    assert.ok(pubCfg.capabilities?.aiStatus);

    const probeRes = await fetch(`${baseUrl}/admin/ai/health-check`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(probeRes.status, 200);
    const probeData = (await probeRes.json()) as any;
    assert.equal(typeof probeData.ok, 'boolean');
    assert.ok(probeData.health?.status);

    // 2. Strict draft/review isolation on enroll, complete, bookmark, note, and draft assessment endpoints
    assert.equal(
      (await fetch(`${baseUrl}/courses/crs_cpp_draft/enroll`, { method: 'POST', headers: learnerHeaders })).status,
      403
    );
    assert.equal(
      (await fetch(`${baseUrl}/lessons/les_java_2/complete`, { method: 'POST', headers: learnerHeaders })).status,
      403
    );
    assert.equal(
      (await fetch(`${baseUrl}/lessons/les_java_2/bookmark`, { method: 'POST', headers: learnerHeaders })).status,
      403
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/lessons/les_java_2/note`, {
          method: 'PUT',
          headers: learnerHeaders,
          body: JSON.stringify({ content: 'Should fail on review lesson' }),
        })
      ).status,
      403
    );
    assert.equal(
      (await fetch(`${baseUrl}/assessments/asm_cpp_draft_quiz`, { headers: learnerHeaders })).status,
      403
    );
    assert.equal(
      (
        await fetch(`${baseUrl}/assessments/asm_cpp_draft_quiz/submit`, {
          method: 'POST',
          headers: learnerHeaders,
          body: JSON.stringify({ answers: {} }),
        })
      ).status,
      403
    );

    // 3. Instructor grading recalculates percentage, passed flag, and XP on mixed practical assessments
    const algRes = await fetch(`${baseUrl}/assessments/asm_alg_challenge/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({
        answers: {
          alg_q1: 'heapq.heappush(heap, item)',
          alg_q2: ['Initialize distances to Infinity and source to 0', 'Pop minimum-distance node from priority queue', 'Relax outgoing edges and push updated distances'],
          alg_q3: 'function solve() { return true; }',
        },
      }),
    });
    assert.equal(algRes.status, 200);
    const algData = (await algRes.json()) as any;
    assert.equal(algData.maxScore, 3);
    assert.equal(algData.passed, false); // 2/3 = 67% < 70% before practical grading

    const gradeRes = await fetch(`${baseUrl}/admin/assessments/attempts/${algData.attemptId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ score: 3, instructorNotes: 'Clean greedy implementation.' }),
    });
    assert.equal(gradeRes.status, 200);
    const graded = (await gradeRes.json()) as any;
    assert.equal(graded.percentage, 100);
    assert.equal(graded.passed, true);

    // 4. Certificate revocation & reinstatement lifecycle
    const myCertsRes = await fetch(`${baseUrl}/certificates`, { headers: learnerHeaders });
    assert.equal(myCertsRes.status, 200);
    const myCerts = (await myCertsRes.json()) as any;
    const targetCert = myCerts.certificates.find((c: any) => c.course_id === 'crs_fullstack');
    assert.ok(targetCert);
    assert.equal(targetCert.status, 'active');

    const revokeRes = await fetch(`${baseUrl}/admin/certificates/${targetCert.id}/revoke`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ reason: 'Audit compliance check revocation test' }),
    });
    assert.equal(revokeRes.status, 200);
    const revokedCert = (await revokeRes.json()) as any;
    assert.equal(revokedCert.certificate.status, 'revoked');

    const verifyRevoked = (await (await fetch(`${baseUrl}/certificates/verify/${targetCert.certificate_code}`)).json()) as any;
    assert.equal(verifyRevoked.valid, false);
    assert.equal(verifyRevoked.revoked, true);
    assert.equal(verifyRevoked.status, 'revoked');

    const reclaimBlocked = await fetch(`${baseUrl}/certificates/claim/crs_fullstack`, {
      method: 'POST',
      headers: learnerHeaders,
    });
    assert.equal(reclaimBlocked.status, 403);
    assert.equal(((await reclaimBlocked.json()) as any).code, 'CERTIFICATE_REVOKED');

    const reinstateRes = await fetch(`${baseUrl}/admin/certificates/${targetCert.id}/reinstate`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(reinstateRes.status, 200);
    const verifyReinstated = (await (await fetch(`${baseUrl}/certificates/verify/${targetCert.certificate_code}`)).json()) as any;
    assert.equal(verifyReinstated.valid, true);
    assert.equal(verifyReinstated.revoked, false);

    // 5. Curriculum Code Example Validation Audit (real node:vm for JS + honest static_inspection for non-JS)
    const auditRes = await fetch(`${baseUrl}/admin/curriculum/code-examples/validate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(auditRes.status, 200);
    const auditData = (await auditRes.json()) as any;
    assert.equal(auditData.summary.publishedFailedCount, 0);
    assert.ok(auditData.failed.some((f: any) => f.lessonStatus === 'draft' && f.title === 'Broken JS Syntax Draft'));
    assert.ok(auditData.summary.vmExecutedCount > 0);
    assert.ok(auditData.summary.staticInspectionCount > 0);
    assert.equal(auditData.remoteSandboxConfigured, false);

    // 6. Instructor/Admin Student Progress Matrix & URL validation (blocks javascript: XSS URLs)
    const stuRes = await fetch(`${baseUrl}/admin/students/progress`, { headers: adminHeaders });
    assert.equal(stuRes.status, 200);
    const stuData = (await stuRes.json()) as any;
    const learnerRow = stuData.students.find((s: any) => s.id === freeUserId);
    assert.ok(learnerRow);
    assert.ok(learnerRow.completed_lessons >= 3);
    assert.ok(learnerRow.active_certificates >= 1);

    const xssProfile = await fetch(`${baseUrl}/profile`, {
      method: 'PUT',
      headers: learnerHeaders,
      body: JSON.stringify({ avatarUrl: 'javascript:alert(1)' }),
    });
    assert.equal(xssProfile.status, 400);

    const xssProject = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({ title: 'Bad Link', repoUrl: 'javascript:alert(1)' }),
    });
    assert.equal(xssProject.status, 400);

    const xssAsn = await fetch(`${baseUrl}/assignments/asn_html_landing/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({ liveUrl: 'javascript:alert(1)' }),
    });
    assert.equal(xssAsn.status, 400);
  });

  it('15. Phase 21/22 curriculum readiness, editorialStage, draft exercise isolation, enriched templates & resume state', async () => {
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    };

    const learnerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // 1. Coverage dashboard reports Priority 10 substantially_complete & distinct editorialStage values
    const covRes = await fetch(`${baseUrl}/admin/curriculum/coverage?limit=300`, { headers: adminHeaders });
    assert.equal(covRes.status, 200);
    const cov = (await covRes.json()) as any;
    const rows = cov.technologies as any[];
    assert.ok(rows.length >= 237, `Expected >= 237 technologies, got ${rows.length}`);

    const publishedPrioritySlugs = ['html', 'css', 'javascript', 'python', 'react', 'typescript', 'nodejs', 'sql'];
    for (const slug of publishedPrioritySlugs) {
      const row = rows.find((r) => r.slug === slug);
      assert.ok(row, `Expected priority technology row for ${slug}`);
      assert.ok(row.editorialStage, `Expected editorialStage on ${slug}`);
      assert.ok(
        ['substantially_complete', 'published'].includes(row.calculatedStatus),
        `Expected ${slug} calculatedStatus to be substantially_complete/published, got ${row.calculatedStatus}`
      );
    }
    const cppRow = rows.find((r) => r.slug === 'cpp');
    assert.ok(cppRow && cppRow.editorialStage === 'draft_content_available');
    const javaRow = rows.find((r) => r.slug === 'java');
    assert.ok(javaRow && Boolean(javaRow.editorialStage));

    const stages = new Set(rows.map((r) => r.editorialStage));
    assert.ok(stages.has('blueprint_available'));
    assert.ok(stages.has('draft_content_available'));
    assert.ok(stages.has('substantially_complete'));
    assert.ok(
      rows.every((r) =>
        [
          'planned',
          'blueprint_available',
          'course_in_development',
          'draft_content_available',
          'awaiting_review',
          'published',
          'substantially_complete',
          'needs_improvement',
        ].includes(r.editorialStage)
      )
    );

    // 2. Non-privileged exercise isolation blocks draft/review courses on GET /exercises and POST /exercises/:id/submit
    const allExRes = await fetch(`${baseUrl}/exercises`, { headers: learnerHeaders });
    assert.equal(allExRes.status, 200);
    const allEx = ((await allExRes.json()) as any).exercises as any[];
    assert.ok(!allEx.some((ex) => ex.course_id === 'crs_cpp_draft' || ex.course_id === 'crs_go_draft'));

    const draftCourseExRes = await fetch(`${baseUrl}/exercises?courseId=crs_go_draft`, { headers: learnerHeaders });
    assert.equal(draftCourseExRes.status, 200);
    assert.equal((((await draftCourseExRes.json()) as any).exercises as any[]).length, 0);

    const submitDraftEx = await fetch(`${baseUrl}/exercises/ex_go_mc_1/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({ answerText: 'fmt.Println("hi")' }),
    });
    assert.equal(submitDraftEx.status, 403);
    assert.equal(((await submitDraftEx.json()) as any).code, 'COURSE_NOT_PUBLISHED');

    // 3. Enriched project templates + persisted checklist/notes progress
    const tplRes = await fetch(`${baseUrl}/projects/templates`, { headers: learnerHeaders });
    assert.equal(tplRes.status, 200);
    const tpls = ((await tplRes.json()) as any).templates as any[];
    const htmlTpl = tpls.find((pt) => pt.id === 'ptpl_html_multipage_site');
    assert.ok(htmlTpl);
    assert.ok(Array.isArray(htmlTpl.checklist) && htmlTpl.checklist.length >= 2);
    assert.ok(Array.isArray(htmlTpl.rubric) && htmlTpl.rubric.length >= 2);
    assert.ok(Array.isArray(htmlTpl.learning_outcomes) && htmlTpl.learning_outcomes.length >= 2);

    const saveProg = await fetch(`${baseUrl}/projects/templates/ptpl_html_multipage_site/progress`, {
      method: 'PUT',
      headers: learnerHeaders,
      body: JSON.stringify({
        checkedItems: [htmlTpl.checklist[0]],
        notes: 'Completed semantic landmarks and responsive layout.',
      }),
    });
    assert.equal(saveProg.status, 200);
    const savedData = (await saveProg.json()) as any;
    assert.deepEqual(savedData.progress.checkedItems, [htmlTpl.checklist[0]]);

    // 4. Learning paths grouped query & course.last_lesson_id resume field
    const pathsRes = await fetch(`${baseUrl}/learning-paths`, { headers: learnerHeaders });
    assert.equal(pathsRes.status, 200);
    const pathsData = (await pathsRes.json()) as any;
    assert.ok(Array.isArray(pathsData.learningPaths) && pathsData.learningPaths.length >= 6);

    await fetch(`${baseUrl}/courses/crs_html/enroll`, { method: 'POST', headers: learnerHeaders });
    const htmlCourseInit = (await (await fetch(`${baseUrl}/courses/html5-semantic-architecture`, { headers: learnerHeaders })).json()) as any;
    const firstHtmlLessonId = htmlCourseInit.modules?.[0]?.lessons?.[0]?.id;
    assert.ok(firstHtmlLessonId);
    const openFirst = await fetch(`${baseUrl}/lessons/${firstHtmlLessonId}`, { headers: learnerHeaders });
    assert.equal(openFirst.status, 200);

    const htmlCourseRes = await fetch(`${baseUrl}/courses/html5-semantic-architecture`, { headers: learnerHeaders });
    assert.equal(htmlCourseRes.status, 200);
    const htmlCourseData = (await htmlCourseRes.json()) as any;
    assert.equal(htmlCourseData.course.last_lesson_id, firstHtmlLessonId);

    // 5. Published code examples still pass 100% validation
    const auditRes = await fetch(`${baseUrl}/admin/curriculum/code-examples/validate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(auditRes.status, 200);
    const audit = (await auditRes.json()) as any;
    assert.equal(audit.summary.publishedFailedCount, 0);
  });

  it('16. Phase 23 Technology Capability Registry, SQLite :memory: lab, and honest discipline validation', async () => {
    // 1. Public capabilities endpoint reflects SQL memory sandbox
    const pubRes = await fetch(`${baseUrl}/config/public`);
    assert.equal(pubRes.status, 200);
    const pubData = (await pubRes.json()) as any;
    assert.equal(pubData.capabilities.sandbox.sqlMemorySandboxEnabled, true);

    // 2. Centralized capability registry covers all 200+ published technologies cleanly
    const capListRes = await fetch(`${baseUrl}/technology-capabilities`);
    assert.equal(capListRes.status, 200);
    const capList = (await capListRes.json()) as any;
    assert.ok(capList.totalTechnologies >= 230);
    assert.ok(capList.summaryByEnvironment.web_dev_lab >= 1);
    assert.ok(capList.summaryByEnvironment.programming_lab >= 10);
    assert.ok(capList.summaryByEnvironment.database_sql_lab >= 10);
    assert.ok(capList.summaryByEnvironment.design_uiux_lab >= 5);
    assert.ok(capList.summaryByEnvironment.security_network_lab >= 5);

    // Single capability lookup & TechnologyDetailResponse embedding
    const figmaTechRes = await fetch(`${baseUrl}/technologies/figma`);
    assert.equal(figmaTechRes.status, 200);
    const figmaTechData = (await figmaTechRes.json()) as any;
    assert.equal(figmaTechData.capabilityProfile.environmentType, 'design_uiux_lab');
    assert.equal(figmaTechData.capabilityProfile.previewCapability, 'live_svg_tokens');

    // Extensibility check: adding a new DB technology dynamically inherits its category environment automatically
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mentor@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    const adminToken = ((await adminLogin.json()) as any).token;
    const addTechRes = await fetch(`${baseUrl}/admin/technologies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        categoryId: 'cat_db',
        name: 'SurrealDB',
        slug: 'surrealdb',
        description: 'Multi-model cloud database',
        difficulty: 'Intermediate',
      }),
    });
    assert.equal(addTechRes.status, 201);
    const surrealCapRes = await fetch(`${baseUrl}/technology-capabilities/surrealdb`);
    assert.equal(surrealCapRes.status, 200);
    const surrealCap = (await surrealCapRes.json()) as any;
    assert.equal(surrealCap.capability.environmentType, 'database_sql_lab');

    // 3. In-memory SQLite Lab executes real relational JOINs safely and rejects unsafe pragmas
    const sqlOkRes = await fetch(`${baseUrl}/labs/sql/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `SELECT d.name AS department, COUNT(e.id) AS staff_count FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id, d.name ORDER BY staff_count DESC;`,
      }),
    });
    assert.equal(sqlOkRes.status, 200);
    const sqlOk = (await sqlOkRes.json()) as any;
    assert.equal(sqlOk.ok, true);
    assert.equal(sqlOk.rowCount, 4);
    assert.deepEqual(sqlOk.columns, ['department', 'staff_count']);

    const sqlAttachBlocked = await fetch(`${baseUrl}/labs/sql/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `ATTACH DATABASE '/tmp/x.db' AS x;` }),
    });
    assert.equal(sqlAttachBlocked.status, 400);

    const sqlBadTable = await fetch(`${baseUrl}/labs/sql/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: `SELECT * FROM nonexistent_table;` }),
    });
    assert.equal(sqlBadTable.status, 400);
    assert.equal(((await sqlBadTable.json()) as any).ok, false);

    // 4. Honest validation across JavaScript (VM executed), Python (static + reasoning), Dockerfile & Kubernetes YAML
    const jsValRes = await fetch(`${baseUrl}/labs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technologySlug: 'javascript',
        language: 'javascript',
        code: `function calculateProgress(c, t) { return Math.round((c / t) * 100); }`,
        requiredTokens: ['function', 'return'],
        jsTestExpression: 'calculateProgress(3, 5)',
        jsExpectedResult: '60',
      }),
    });
    const jsVal = (await jsValRes.json()) as any;
    assert.equal(jsVal.valid, true);
    assert.equal(jsVal.passedTaskChecks, true);
    assert.equal(jsVal.validationMethod, 'vm_executed');

    const pyReasoningOkRes = await fetch(`${baseUrl}/labs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technologySlug: 'python',
        language: 'python',
        code: `def summarize_scores(scores):\n    return round(sum(scores) / len(scores), 2)`,
        requiredTokens: ['def ', 'return'],
        reasoningAnswer: '91.67',
        expectedReasoningAnswer: '91.67',
      }),
    });
    const pyReasoningOk = (await pyReasoningOkRes.json()) as any;
    assert.equal(pyReasoningOk.validationMethod, 'static_inspection');
    assert.equal(pyReasoningOk.passedTaskChecks, true);
    assert.ok(pyReasoningOk.inspectionNote.includes('CODE_SANDBOX_URL'));

    const pyReasoningWrongRes = await fetch(`${baseUrl}/labs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technologySlug: 'python',
        language: 'python',
        code: `def summarize_scores(scores):\n    return 0`,
        requiredTokens: ['def ', 'return'],
        reasoningAnswer: '0.0',
        expectedReasoningAnswer: '91.67',
      }),
    });
    const pyReasoningWrong = (await pyReasoningWrongRes.json()) as any;
    assert.equal(pyReasoningWrong.passedTaskChecks, false);
    assert.equal(pyReasoningWrong.reasoningCheck.correct, false);

    const k8sTabRes = await fetch(`${baseUrl}/labs/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        technologySlug: 'kubernetes',
        language: 'yaml',
        code: "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n\tname: bad-tab",
      }),
    });
    const k8sTab = (await k8sTabRes.json()) as any;
    assert.equal(k8sTab.valid, false);
    assert.ok(k8sTab.errors.some((e: string) => e.includes('Tab')));
  });

  it('17. Phase 24 Master Curriculum Audit, 100-pt Quality Engine, Sanitization, Multi-Type Exercises, SQL Grading, Weighted Assessments, Rubrics & Recommendations', async () => {
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mentor@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    assert.equal(adminLogin.status, 200);
    const phase24AdminToken = ((await adminLogin.json()) as any).token;
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${phase24AdminToken}`,
    };
    const learnerHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${freeUserToken}`,
    };

    // 1. Master Curriculum Audit returns genuine DB totals & actionable findings
    const auditRes = await fetch(`${baseUrl}/admin/curriculum/intelligence/audit`, { headers: adminHeaders });
    assert.equal(auditRes.status, 200);
    const audit = (await auditRes.json()) as any;
    assert.ok(audit.totals.technologies >= 237);
    assert.ok(audit.totals.courses >= 25);
    assert.ok(audit.totals.lessons >= 100);
    assert.ok(Array.isArray(audit.courseSummaries) && audit.courseSummaries.length >= 25);
    assert.ok(typeof audit.findings.coursesUnverifiedTechnical === 'number');
    assert.ok(typeof audit.coverage.averageCourseQualityScore === 'number');

    // 2. Evaluate single course (12 dimensions) & toggle independent technical verification
    const evalRes = await fetch(`${baseUrl}/admin/curriculum/intelligence/evaluate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ entityType: 'course', entityId: 'crs_sql' }),
    });
    assert.equal(evalRes.status, 200);
    const evalData = (await evalRes.json()) as any;
    assert.equal(evalData.evaluation.dimensions.length, 12);
    assert.equal(evalData.evaluation.maxScore, 100);

    const verifyRes = await fetch(`${baseUrl}/admin/curriculum/intelligence/technical-verify`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ entityType: 'course', entityId: 'crs_sql', verified: true, notes: 'SQL queries checked.' }),
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(((await verifyRes.json()) as any).evaluation.technicalVerified, true);

    // 3. Normalized Learning Objectives CRUD & Course Progression Settings
    const objCreateRes = await fetch(`${baseUrl}/admin/curriculum/objectives`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        entityType: 'course',
        entityId: 'crs_sql',
        objectiveCode: 'SQL-IDX-01',
        title: 'Design composite B-Tree indexes safely',
        masteryLevel: 'intermediate',
      }),
    });
    assert.equal(objCreateRes.status, 201);
    const createdObj = (await objCreateRes.json()) as any;
    assert.ok(createdObj.id);

    const objListRes = await fetch(`${baseUrl}/admin/curriculum/objectives?entityType=course&entityId=crs_sql`, {
      headers: adminHeaders,
    });
    assert.equal(objListRes.status, 200);
    assert.ok(((await objListRes.json()) as any).objectives.some((o: any) => o.id === createdObj.id));

    const objDelRes = await fetch(`${baseUrl}/admin/curriculum/objectives/${createdObj.id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert.equal(objDelRes.status, 200);

    // 4. Structured Lesson Editor sanitizes XSS scripts and rejects invalid media URLs
    const badMediaRes = await fetch(`${baseUrl}/admin/curriculum/intelligence/lessons/les_html_1`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        blocks: [
          {
            block_type: 'image',
            title: 'Unsafe Script Image',
            content_markdown: 'Diagram',
            metadata: { url: 'javascript:alert(1)' },
          },
        ],
      }),
    });
    assert.equal(badMediaRes.status, 400);

    const saveLessonRes = await fetch(`${baseUrl}/admin/curriculum/intelligence/lessons/les_html_1`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        contentMarkdown: '### Semantic Markup Rules<script>alert("xss")</script>\n\nUse semantic `<header>`, `<main>`, and `<nav>` landmarks so screen readers navigate cleanly.',
        visualExplanationMarkdown: '<header> -> <nav> -> <main> -> <footer>',
        commonMistakes: ['Using clickable <div> elements instead of <button>'],
        bestPractices: ['Provide a single top-level <main> landmark per page'],
        nextStepGuidance: 'Practice refactoring a div soup layout inside Practice Workspace.',
      }),
    });
    assert.equal(saveLessonRes.status, 200);
    const lessonAfterSave = (await (await fetch(`${baseUrl}/lessons/les_html_1`, { headers: learnerHeaders })).json()) as any;
    assert.ok(!String(lessonAfterSave.lesson.content_markdown).includes('<script>'));
    assert.deepEqual(lessonAfterSave.lesson.common_mistakes, ['Using clickable <div> elements instead of <button>']);

    // 5. Direct Multi-Type Exercise & Assessment Grading Engine validation (multi_select, ordering, matching, sql_write, weighted objectivePerformance)
    const {
      evaluateEnhancedExerciseAnswer,
      evaluateSqlAgainstReference,
      gradeAssessmentSubmission,
    } = await import('../server/curriculum_intelligence.ts');

    // SQL grader executes real SQLite :memory: queries cleanly
    const sqlPass = evaluateSqlAgainstReference(
      'SELECT d.name, COUNT(e.id) AS c FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id ORDER BY c DESC;',
      'SELECT d.name, COUNT(e.id) AS c FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id ORDER BY c DESC;'
    );
    assert.equal(sqlPass.executed, true);
    assert.equal(sqlPass.isCorrect, true);
    assert.equal(sqlPass.score, 100);

    const sqlFail = evaluateSqlAgainstReference(
      'SELECT name FROM non_existent_tbl;',
      'SELECT name FROM departments;'
    );
    assert.equal(sqlFail.isCorrect, false);

    // Multi-select partial credit (1 of 2 right + 0 wrong -> 50% partial credit)
    const msPartial = evaluateEnhancedExerciseAnswer(
      {
        exercise_type: 'multi_select',
        correct_answer: JSON.stringify(['<main>', '<nav>']),
        validation_rule_json: '{}',
        xp_reward: 10,
        allow_partial_credit: 1,
      },
      JSON.stringify(['<main>']),
      ''
    );
    assert.equal(msPartial.isCorrect, false);
    assert.equal(msPartial.partialCreditApplied, true);
    assert.equal(msPartial.score, 50);

    // Ordering & Matching partial credit
    const ordPartial = evaluateEnhancedExerciseAnswer(
      {
        exercise_type: 'ordering',
        correct_answer: JSON.stringify(['Parse HTML', 'Build DOM', 'Paint']),
        validation_rule_json: '{}',
        xp_reward: 10,
        allow_partial_credit: 1,
      },
      JSON.stringify(['Parse HTML', 'Paint', 'Build DOM']),
      ''
    );
    assert.equal(ordPartial.partialCreditApplied, true);
    assert.ok(ordPartial.score > 0 && ordPartial.score < 100);

    const matchPartial = evaluateEnhancedExerciseAnswer(
      {
        exercise_type: 'matching',
        correct_answer: JSON.stringify({ GET: 'Read', POST: 'Create' }),
        validation_rule_json: '{}',
        xp_reward: 10,
        allow_partial_credit: 1,
      },
      'GET->Read, POST->Delete',
      ''
    );
    assert.equal(matchPartial.partialCreditApplied, true);
    assert.equal(matchPartial.score, 50);

    // Weighted assessment with objectiveTags & subjective pending review (no fake auto full marks!)
    const weightedEval = gradeAssessmentSubmission({
      questions: [
        {
          id: 'w1',
          kind: 'multi_select',
          prompt: 'Select semantic elements',
          options: ['<main>', '<div>', '<article>'],
          correctAnswer: JSON.stringify(['<main>', '<article>']),
          marks: 4,
          objectiveTag: 'Semantic HTML',
          allowPartialCredit: true,
          explanation: 'Semantic containers.',
        },
        {
          id: 'w2',
          kind: 'sql_write',
          prompt: 'Count departments',
          correctAnswer: 'SELECT COUNT(*) AS total FROM departments;',
          marks: 4,
          objectiveTag: 'SQL Aggregations',
          explanation: 'Aggregate query.',
        },
        {
          id: 'w3',
          kind: 'practical',
          prompt: 'Describe index trade-offs',
          correctAnswer: 'Write amplification vs read speedup',
          marks: 2,
          objectiveTag: 'SQL Indexing',
          explanation: 'Requires mentor evaluation.',
        },
      ],
      submittedAnswers: {
        w1: JSON.stringify(['<main>']),
        w2: 'SELECT COUNT(*) AS total FROM departments;',
        w3: 'Indexes speed up reads while slowing down inserts.',
      },
      passingScorePct: 70,
      allowPartialCredit: true,
    });
    assert.equal(weightedEval.maxScore, 10);
    assert.equal(weightedEval.score, 6); // 2 (50% of 4 on w1) + 4 (w2) + 0 (pending practical w3)
    assert.equal(weightedEval.hasSubjectiveQuestions, true);
    assert.equal(weightedEval.status, 'pending_review');
    assert.ok(weightedEval.objectivePerformance.some((op) => op.objective === 'SQL Aggregations' && op.percentage === 100));

    // 6. Real DB exercise max_attempts & sql_write submission via API
    const { db } = await import('../server/db.ts');
    db.prepare(
      `INSERT OR REPLACE INTO exercises
       (id, course_id, module_id, lesson_id, technology_id, title, exercise_type, difficulty, prompt, starter_code, options_json, correct_answer, hint_text, explanation, xp_reward, marks, max_attempts, allow_partial_credit, validation_method, learning_objective, sort_order, created_at)
       VALUES (?, 'crs_sql', 'mod_sql_1', 'les_sql_1', 'tech_sql', ?, 'sql_write', 'Beginner', ?, 'SELECT COUNT(*) FROM employees;', '[]', 'SELECT COUNT(*) AS total FROM employees;', 'Use COUNT(*)', 'Counts all rows.', 20, 4, 2, 1, 'sqlite_memory', 'SQL Aggregations', 99, ?)`
    ).run(
      'ex_p24_sql_test',
      'Count Employees SQL Lab',
      'Write a SQL query counting total employees.',
      new Date().toISOString()
    );

    const exTry1 = await fetch(`${baseUrl}/exercises/ex_p24_sql_test/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({ codeSubmitted: 'SELECT COUNT(*) AS total FROM departments;' }),
    });
    assert.equal(exTry1.status, 200);
    assert.equal(((await exTry1.json()) as any).isCorrect, false);

    const exTry2 = await fetch(`${baseUrl}/exercises/ex_p24_sql_test/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({ codeSubmitted: 'SELECT COUNT(*) AS total FROM employees;' }),
    });
    assert.equal(exTry2.status, 200);
    assert.equal(((await exTry2.json()) as any).isCorrect, true);

    const exTry3Blocked = await fetch(`${baseUrl}/exercises/ex_p24_sql_test/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({ codeSubmitted: 'SELECT COUNT(*) AS total FROM employees;' }),
    });
    assert.equal(exTry3Blocked.status, 403);

    // 7. Weighted Assignment Rubric Grading & Course Competency Summary
    const subRow = db
      .prepare(`SELECT id FROM assignment_submissions WHERE assignment_id = 'asn_html_landing' LIMIT 1`)
      .get() as { id: string } | undefined;
    assert.ok(subRow);
    const rubricGradeRes = await fetch(`${baseUrl}/admin/assignments/submissions/${subRow.id}/rubric`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({
        status: 'approved',
        instructorFeedback: 'Excellent landmark structure and grid alignment.',
        criterionScores: [
          { criterion: 'Semantic Landmark Structure (40%)', awarded: 38 },
          { criterion: 'Label & Accessibility Binding (35%)', awarded: 32 },
          { criterion: 'Native Validation Completeness (25%)', awarded: 24 },
        ],
      }),
    });
    assert.equal(rubricGradeRes.status, 200);
    const rubricData = (await rubricGradeRes.json()) as any;
    assert.ok(rubricData.score >= 85);
    assert.ok(rubricData.rubricResult?.breakdown.length >= 2);

    const compRes = await fetch(`${baseUrl}/courses/crs_sql/competencies`, { headers: learnerHeaders });
    assert.equal(compRes.status, 200);
    const compSummary = (await compRes.json()) as any;
    assert.ok(compSummary.objectives.some((it: any) => (it.title === 'SQL Aggregations' || it.key === 'SQL Aggregations') && it.status === 'mastered'));

    // 8. Rule-Based Recommendation Engine works offline without AI key
    const recRes = await fetch(`${baseUrl}/curriculum/recommendations`, { headers: learnerHeaders });
    assert.equal(recRes.status, 200);
    const recData = (await recRes.json()) as any;
    assert.equal(recData.aiRequired, false);
    assert.equal(recData.engine, 'rule_based_explainable_v1');
    assert.ok(Array.isArray(recData.recommendations) && recData.recommendations.length > 0);

    // 9. Certificate threshold enforcement (min_certificate_score & require_practical_projects)
    const freshReg = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Threshold Learner',
        email: `thresh_${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    const freshToken = ((await freshReg.json()) as any).token;
    const freshHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${freshToken}` };

    await fetch(`${baseUrl}/admin/courses/crs_html/progression`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ minCertificateScore: 95, requirePracticalProjects: true }),
    });

    const htmlLessons = db.prepare(`SELECT id FROM lessons WHERE course_id = 'crs_html' AND status = 'published'`).all() as Array<{ id: string }>;
    for (const hl of htmlLessons) {
      await fetch(`${baseUrl}/lessons/${hl.id}/complete`, { method: 'POST', headers: freshHeaders });
    }
    const certGateBlocked = await fetch(`${baseUrl}/certificates/claim/crs_html`, {
      method: 'POST',
      headers: freshHeaders,
    });
    assert.equal(certGateBlocked.status, 400);

    // Reset threshold defaults on crs_html so existing E2E / catalog flows stay permissive
    await fetch(`${baseUrl}/admin/courses/crs_html/progression`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ minCertificateScore: 0, requirePracticalProjects: false }),
    });

    // 10. Intelligence suggestion endpoint returns rule-based plan cleanly without API key
    const suggestRes = await fetch(`${baseUrl}/admin/curriculum/ai-studio/intelligence-suggest`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ courseId: 'crs_sql', mode: 'plan' }),
    });
    assert.equal(suggestRes.status, 200);
    const suggestData = (await suggestRes.json()) as any;
    assert.equal(suggestData.aiUsed, false);
    assert.ok(Array.isArray(suggestData.suggestions));
  });

  it('18. Comprehensive Technology Learning Centres, Certification Exams & Discipline-Aware Endpoints', async () => {
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mentor@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    assert.equal(adminLogin.status, 200);
    const lcAdminToken = ((await adminLogin.json()) as any).token;
    const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${lcAdminToken}` };

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Learning Centre Tester',
        email: `lc_tester_${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    assert.equal(regRes.status, 201);
    const learnerToken = ((await regRes.json()) as any).token;
    const learnerHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerToken}` };

    // 1. Curated HTML Learning Centre includes 13 sections, mapped interactive topics, px_em_converter, and cert exam
    const htmlRes = await fetch(`${baseUrl}/technologies/html`);
    assert.equal(htmlRes.status, 200);
    const htmlData = (await htmlRes.json()) as any;
    assert.ok(htmlData.learningCentre);
    assert.equal(htmlData.learningCentre.source, 'curated_centre');
    assert.ok(htmlData.learningCentre.sections.length >= 13);
    assert.ok(htmlData.learningCentre.interactiveTools.includes('px_em_converter'));
    assert.ok(htmlData.learningCentre.metrics.availableInteractiveTopics >= 1);
    assert.ok(htmlData.learningCentre.certificationExams.some((e: any) => e.id === 'asm_exam_html_cert'));

    // 2. Curated SQL & Python Learning Centres omit HTML forms/web_apis/px_em_converter
    const sqlRes = await fetch(`${baseUrl}/technologies/sql/learning-centre`);
    assert.equal(sqlRes.status, 200);
    const sqlData = (await sqlRes.json()) as any;
    assert.equal(sqlData.ok, true);
    assert.ok(sqlData.learningCentre.interactiveTools.includes('sql_schema_viewer'));
    assert.equal(sqlData.learningCentre.interactiveTools.includes('px_em_converter'), false);
    assert.equal(sqlData.learningCentre.sections.some((s: any) => s.id === 'forms'), false);

    // 3. Non-web dynamic Learning Centre (Kubernetes & Figma) stays discipline-appropriate
    const k8sRes = await fetch(`${baseUrl}/technologies/kubernetes/learning-centre`);
    assert.equal(k8sRes.status, 200);
    const k8sData = (await k8sRes.json()) as any;
    assert.equal(k8sData.learningCentre.source, 'dynamic_blueprint');
    assert.equal(k8sData.learningCentre.interactiveTools.includes('px_em_converter'), false);
    assert.ok(k8sData.learningCentre.sections.length >= 8);

    // 4. Certification exam asm_exam_html_cert evaluates cleanly through assessment submission engine
    const examSubmitRes = await fetch(`${baseUrl}/assessments/asm_exam_html_cert/submit`, {
      method: 'POST',
      headers: learnerHeaders,
      body: JSON.stringify({
        answers: {
          hex1: 'scope="col"',
          hex2: ['<main>', '<nav>', '<aside>'],
          hex3: 'true',
          hex4: 'popover',
          hex5: 'defer',
        },
      }),
    });
    assert.equal(examSubmitRes.status, 200);
    const examSubmitData = (await examSubmitRes.json()) as any;
    assert.equal(examSubmitData.passed, true);
    assert.equal(examSubmitData.percentage, 100);

    // 5. Role guard + persistence on PUT /admin/technologies/:slug/learning-centre
    const learnerForbidden = await fetch(`${baseUrl}/admin/technologies/python/learning-centre`, {
      method: 'PUT',
      headers: learnerHeaders,
      body: JSON.stringify({ summaryPoints: ['Unauthorized edit attempt'] }),
    });
    assert.equal(learnerForbidden.status, 403);

    const pyBefore = (await (await fetch(`${baseUrl}/technologies/python/learning-centre`)).json()) as any;
    const origSummary = pyBefore.learningCentre.summaryPoints;

    const adminUpdate = await fetch(`${baseUrl}/admin/technologies/python/learning-centre`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        summaryPoints: [...origSummary, 'Type hints improve IDE diagnostics cleanly.'],
      }),
    });
    assert.equal(adminUpdate.status, 200);
    const pyAfter = (await (await fetch(`${baseUrl}/technologies/python/learning-centre`)).json()) as any;
    assert.ok(pyAfter.learningCentre.summaryPoints.includes('Type hints improve IDE diagnostics cleanly.'));

    // Restore original summary cleanly
    await fetch(`${baseUrl}/admin/technologies/python/learning-centre`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({ summaryPoints: origSummary }),
    });
  });

  it('19. Automated Curriculum Audit Script & Quality Report Detects Empty Modules, Missing Objectives & Missing Projects', async () => {
    const adminLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'mentor@bcschools.dev', password: 'BrainCode#2026!' }),
    });
    assert.equal(adminLogin.status, 200);
    const qcAdminToken = ((await adminLogin.json()) as any).token;
    const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${qcAdminToken}` };

    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Audit Guard Learner',
        email: `audit_guard_${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    const learnerToken = ((await regRes.json()) as any).token;
    const learnerHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${learnerToken}` };

    // Learners must be blocked from quality report routes
    const learnerBlocked = await fetch(`${baseUrl}/admin/curriculum/quality-report`, { headers: learnerHeaders });
    assert.equal(learnerBlocked.status, 403);

    // Seed temporary test gaps (course without objectives & project + empty module + lesson without objectives)
    const { db } = await import('../server/db.ts');
    const now = new Date().toISOString();
    const gapCourseId = `crs_audit_gap_${Date.now()}`;
    const gapModEmptyId = `mod_audit_empty_${Date.now()}`;
    const gapModWithLesId = `mod_audit_les_${Date.now()}`;
    const gapLessonId = `les_audit_no_obj_${Date.now()}`;

    db.prepare(
      `INSERT INTO courses (id, technology_id, category_id, instructor_id, title, slug, description, difficulty, estimated_hours, status, is_published, objectives_json, prerequisites_json, created_at, updated_at)
       VALUES (?, 'tech_html', 'cat_web_dev', 'usr_mentor_admin', 'Audit Gap Probe Course', ?, 'Probe course for automated curriculum audit.', 'Beginner', 4, 'draft', 0, '[]', '[]', ?, ?)`
    ).run(gapCourseId, `audit-gap-probe-${Date.now()}`, now, now);
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, 'Empty Probe Module', 'Empty', 1)`).run(
      gapModEmptyId,
      gapCourseId
    );
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, 'Populated Probe Module', 'Setup', 2)`).run(
      gapModWithLesId,
      gapCourseId
    );
    db.prepare(
      `INSERT INTO lessons (id, module_id, course_id, title, slug, summary, content_markdown, code_example, language, access_tier, status, sort_order, objectives_json)
       VALUES (?, ?, ?, 'Probe Lesson Without Objectives', ?, 'Short probe lesson', 'Short text.', '', 'html', 'free', 'draft', 1, '[]')`
    ).run(gapLessonId, gapModWithLesId, gapCourseId, `probe-les-${Date.now()}`);

    // Run audit via POST endpoint
    const runRes = await fetch(`${baseUrl}/admin/curriculum/quality-report/run`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({}),
    });
    assert.equal(runRes.status, 200);
    const runData = (await runRes.json()) as any;
    assert.equal(runData.ok, true);
    const report = runData.report;
    assert.equal(report.reportTitle, 'Curriculum Quality Report');
    assert.ok(report.summary.totalTechnologies >= 200);
    assert.ok(report.summary.emptyModules >= 1);
    assert.ok(report.summary.coursesWithoutProjects >= 1);
    assert.ok(report.summary.coursesMissingObjectives >= 1);
    assert.ok(report.summary.lessonsMissingObjectives >= 1);

    // Verify exact probe gaps surfaced
    assert.ok(report.emptyModules.some((m: any) => m.moduleId === gapModEmptyId));
    assert.ok(
      report.courseAudits.some(
        (c: any) => c.courseId === gapCourseId && c.missingProject === true && c.missingObjectives === true
      )
    );
    assert.ok(
      report.gaps.some((g: any) => g.gapType === 'missing_objective' && g.entityId === gapLessonId)
    );
    assert.ok(
      report.gaps.some((g: any) => g.gapType === 'empty_module' && g.entityId === gapModEmptyId)
    );
    assert.ok(
      report.gaps.some((g: any) => g.gapType === 'course_without_project' && g.entityId === gapCourseId)
    );

    // Verify GET filter + CSV export
    const filteredRes = await fetch(`${baseUrl}/admin/curriculum/quality-report?gapType=empty_module`, {
      headers: adminHeaders,
    });
    assert.equal(filteredRes.status, 200);
    const filteredData = (await filteredRes.json()) as any;
    assert.ok(filteredData.report.gaps.every((g: any) => g.gapType === 'empty_module'));

    const csvRes = await fetch(`${baseUrl}/admin/curriculum/quality-report/export?format=csv`, {
      headers: adminHeaders,
    });
    assert.equal(csvRes.status, 200);
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('GapType') && csvText.includes('Empty Probe Module'));

    // Cleanup temporary probe rows cleanly
    db.prepare(`DELETE FROM courses WHERE id = ?`).run(gapCourseId);
  });

  it('tracks not_started, in_progress, and completed progress states and supports non-sequential lesson jumping', async () => {
    const regEmail = `progress_state_${Date.now()}@example.com`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Progress State Learner',
        email: regEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        acceptedTerms: true,
      }),
    });
    assert.equal(regRes.status, 201);
    const { token } = (await regRes.json()) as any;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // Inspect HTML technology curriculum before opening any lesson
    const techBefore = (await (await fetch(`${baseUrl}/technologies/html`, { headers })).json()) as any;
    const htmlCourse = techBefore.courses?.[0];
    assert.ok(htmlCourse, 'Expected courses on /technologies/html');
    const flatLessons = htmlCourse.modules.flatMap((m: any) => m.lessons);
    assert.ok(flatLessons.length >= 3, 'Expected at least 3 HTML lessons');
    assert.equal(flatLessons[0].progress_status, 'not_started');

    // GET /lessons/:id must remain strictly read-only (status stays not_started)
    const targetLesson = flatLessons.find((l: any, i: number) => i >= 2 && l.access_tier === 'free') || flatLessons[2];
    const readRes = await fetch(`${baseUrl}/lessons/${targetLesson.id}`, { headers });
    assert.equal(readRes.status, 200);
    const readData = (await readRes.json()) as any;
    assert.equal(readData.progress.status, 'not_started');
    assert.equal(readData.progress.completed, false);

    // Explicit POST /lessons/:id/open transitions Lesson 3 to in_progress (no sequential lock)
    const openRes = await fetch(`${baseUrl}/lessons/${targetLesson.id}/open`, { method: 'POST', headers });
    assert.equal(openRes.status, 200);
    const openData = (await openRes.json()) as any;
    assert.equal(openData.ok, true);
    assert.equal(openData.progress.status, 'in_progress');
    assert.equal(openData.progress.completed, false);

    // Verify /technologies/html now reports Lesson 3 as in_progress while Lesson 1 remains not_started
    const techMid = (await (await fetch(`${baseUrl}/technologies/html`, { headers })).json()) as any;
    const midFlat = techMid.courses[0].modules.flatMap((m: any) => m.lessons);
    const midFirst = midFlat[0];
    const midTarget = midFlat.find((l: any) => l.id === targetLesson.id);
    assert.equal(midFirst.progress_status, 'not_started');
    assert.equal(midTarget.progress_status, 'in_progress');
    assert.equal(midTarget.completed, false);
    assert.ok(techMid.userProgress.inProgressLessons >= 1);

    // Explicitly mark target lesson complete
    const completeRes = await fetch(`${baseUrl}/lessons/${targetLesson.id}/complete`, { method: 'POST', headers });
    assert.equal(completeRes.status, 200);

    // Re-opening a completed lesson via POST /open must preserve completed state
    const reopenRes = await fetch(`${baseUrl}/lessons/${targetLesson.id}/open`, { method: 'POST', headers });
    assert.equal(reopenRes.status, 200);
    const reopenData = (await reopenRes.json()) as any;
    assert.equal(reopenData.progress.status, 'completed');
    assert.equal(reopenData.progress.completed, true);

    const techAfter = (await (await fetch(`${baseUrl}/technologies/html`, { headers })).json()) as any;
    const afterFlat = techAfter.courses[0].modules.flatMap((m: any) => m.lessons);
    const afterTarget = afterFlat.find((l: any) => l.id === targetLesson.id);
    assert.equal(afterTarget.progress_status, 'completed');
    assert.equal(afterTarget.completed, true);
  });
});


