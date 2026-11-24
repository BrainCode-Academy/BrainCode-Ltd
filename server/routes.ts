import { Router, type NextFunction, type Response } from 'express';
import { config } from './config.ts';
import {
  awardXpAndBadges,
  createNotification,
  db,
  getPublicBrandConfig,
  getUserEntitlement,
  grantUserEntitlements,
  recordAuditLog,
  revokeUserEntitlementsByRef,
  sanitizeUserPublic,
  type SocialLinksMap,
} from './db.ts';
import { getAiUsageSummary, runAiAssistant } from './ai.ts';
import { getAiHealthState, isGeminiKeyConfigured } from './ai_errors.ts';
import {
  checkCourseCertificateEligibility,
  formatProjectTemplateRow,
  registerExtendedLearningRoutes,
} from './learning_routes.ts';
import { registerCurriculumGovernanceRoutes } from './curriculum_cms_routes.ts';
import { registerCurriculumIntelligenceRoutes } from './curriculum_intelligence_routes.ts';
import { registerTechnologyCentreRoutes } from './technology_centre_routes.ts';
import { getTechnologyLearningCentre, type CourseOutlineForMapping } from './technology_learning_centre.ts';
import {
  getCourseCompetencySummary,
  getLearnerRecommendations,
  gradeAssessmentSubmission,
  recordLearnerCompetency,
  type AssessmentQuestionItem,
} from './curriculum_intelligence.ts';
import { createContentRevisionSnapshot } from './curriculum_qa_engine.ts';
import {
  executeInMemorySqlLab,
  getTechnologyCapabilityBySlug,
  listAllTechnologyCapabilities,
  SQL_SANDBOX_SCHEMA_SUMMARY,
  validateLabSubmission,
} from './practical_labs.ts';
import { resolveTechnologyCapability, type PracticalEnvironmentType } from '../shared/technologyCapabilities.ts';
import { pushMessageToUser, pushNotificationToUser } from './realtime.ts';
import {
  createRateLimiter,
  extractSessionToken,
  generateToken,
  hashPassword,
  parseJsonSafe,
  requireRole,
  verifyPassword,
  verifyWebhookSignature,
  type AuthenticatedRequest,
  type AuthUser,
} from './security.ts';

function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractSessionToken(req);
  if (!token) return next();

  const user = db
    .prepare(
      `SELECT u.* FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ? AND u.status = 'active'`
    )
    .get(token, new Date().toISOString()) as AuthUser | undefined;

  if (user) {
    req.user = user;
    req.sessionToken = token;
    req.entitlement = getUserEntitlement(user.id);
  }
  next();
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  return next();
}

function setSessionCookie(res: Response, token: string, rememberMe: boolean) {
  const maxAgeSec = rememberMe ? 30 * 86400 : 86400;
  res.setHeader(
    'Set-Cookie',
    `bc_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`
  );
}

function notifyWithRealtime(userId: string, type: string, title: string, body: string, link = '') {
  const n = createNotification(userId, type, title, body, link);
  pushNotificationToUser(userId, n);
  return n;
}

export function createApiRouter() {
  const router = Router();
  router.use(attachUser);

  const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 40, keyPrefix: 'auth' });
  const aiLimiter = createRateLimiter({ windowMs: 5 * 60 * 1000, max: 35, keyPrefix: 'ai' });
  const checkoutLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 25, keyPrefix: 'checkout' });
  const contactLimiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 8, keyPrefix: 'contact' });

  const ALLOWED_CONTACT_CATEGORIES = new Set([
    'General Enquiry',
    'Course or Learning Support',
    'Technical Issue',
    'Account or Billing Support',
    'Partnership or Sponsorship',
    'Institutional or School Training',
    'Feedback & Suggestions',
    'Report an Issue',
  ]);

  function isValidExternalHttpUrl(raw: string): boolean {
    if (!raw) return true;
    try {
      const parsed = new URL(raw);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isValidAssetOrHttpUrl(raw: string): boolean {
    if (!raw) return true;
    if (raw.startsWith('/')) return true;
    return isValidExternalHttpUrl(raw);
  }

  // =========================================================
  // PUBLIC BRAND & CAPABILITY CONFIG
  // =========================================================
  router.get('/config/public', (_req, res) => {
    const brand = getPublicBrandConfig();
    res.json({
      brand,
      capabilities: {
        oauth: {
          googleEnabled: config.oauth.googleEnabled,
          appleEnabled: config.oauth.appleEnabled,
        },
        payments: {
          provider: config.payments.provider,
          stripeConfigured: config.payments.stripeConfigured,
        },
        sandbox: {
          ...config.sandbox,
          sqlMemorySandboxEnabled: true,
        },
        aiConfigured: isGeminiKeyConfigured(),
        aiStatus: getAiHealthState(),
        emailDeliveryConfigured: Boolean(config.smtp.host && config.smtp.user),
      },
    });
  });

  // =========================================================
  // TECHNOLOGY CAPABILITY REGISTRY & PRACTICAL LAB RUNTIME
  // =========================================================
  router.get('/technology-capabilities', (req, res) => {
    const slug = String(req.query.slug || '').trim();
    const category = String(req.query.category || 'all').trim();
    const environmentType = String(req.query.environmentType || '').trim() as PracticalEnvironmentType | '';
    res.json(listAllTechnologyCapabilities({ slug, category, environmentType }));
  });

  router.get('/technology-capabilities/:slug', (req, res) => {
    const profile = getTechnologyCapabilityBySlug(String(req.params.slug || ''));
    if (!profile) {
      return res.status(404).json({ error: 'Technology capability profile not found.' });
    }
    res.json({ capability: profile });
  });

  router.get('/labs/sql/schema', (_req, res) => {
    res.json({ tables: SQL_SANDBOX_SCHEMA_SUMMARY });
  });

  router.post('/labs/sql/execute', (req, res) => {
    const query = String(req.body?.query ?? req.body?.sql ?? '');
    const result = executeInMemorySqlLab(query);
    if (!result.ok) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  router.post('/labs/validate', (req, res) => {
    const result = validateLabSubmission({
      technologySlug: req.body?.technologySlug ? String(req.body.technologySlug) : undefined,
      language: String(req.body?.language || 'javascript'),
      code: String(req.body?.code || ''),
      requiredTokens: Array.isArray(req.body?.requiredTokens) ? req.body.requiredTokens.map(String) : undefined,
      reasoningAnswer: req.body?.reasoningAnswer !== undefined ? String(req.body.reasoningAnswer) : undefined,
      expectedReasoningAnswer:
        req.body?.expectedReasoningAnswer !== undefined ? String(req.body.expectedReasoningAnswer) : undefined,
      jsTestExpression: req.body?.jsTestExpression ? String(req.body.jsTestExpression) : undefined,
      jsExpectedResult: req.body?.jsExpectedResult !== undefined ? String(req.body.jsExpectedResult) : undefined,
    });
    res.json(result);
  });

  // =========================================================
  // AUTHENTICATION
  // =========================================================
  router.post('/auth/register', authLimiter, (req: AuthenticatedRequest, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');
    const acceptedTerms = Boolean(req.body?.acceptedTerms);

    if (fullName.length < 2 || fullName.length > 80) {
      return res.status(400).json({ error: 'Full name must be between 2 and 80 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include at least 1 uppercase letter and 1 number.',
      });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }
    if (!acceptedTerms) {
      return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy.' });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const baseUsername =
      email
        .split('@')[0]
        .replace(/[^a-z0-9_]/gi, '_')
        .toLowerCase()
        .slice(0, 18) || 'learner';
    let username = baseUsername;
    let suffix = 1;
    while (db.prepare(`SELECT 1 FROM users WHERE username = ?`).get(username)) {
      username = `${baseUsername}_${suffix++}`;
    }

    const userId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const verificationToken = generateToken(16);
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, username, role, status, email_verified, verification_token, onboarding_completed, created_at)
       VALUES (?, ?, ?, ?, ?, 'learner', 'active', 0, ?, 0, ?)`
    ).run(userId, email, passwordHash, fullName, username, verificationToken, now);

    db.prepare(`INSERT OR IGNORE INTO notification_prefs (user_id) VALUES (?)`).run(userId);

    const sessionToken = generateToken(32);
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    db.prepare(`INSERT INTO sessions (token, user_id, remember_me, expires_at, created_at) VALUES (?, ?, 1, ?, ?)`).run(
      sessionToken,
      userId,
      expiresAt,
      now
    );

    setSessionCookie(res, sessionToken, true);
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId) as unknown as AuthUser;

    notifyWithRealtime(
      userId,
      'welcome',
      'Verify Your Email & Complete Onboarding',
      'Finish setting your learning interests and verify your email address to unlock full platform interactions.',
      '/onboarding'
    );

    return res.status(201).json({
      token: sessionToken,
      user: sanitizeUserPublic(user),
      entitlement: getUserEntitlement(userId),
      verificationNotice: {
        emailSent: false,
        devVerificationToken: verificationToken,
        message: 'SMTP email delivery is not configured in this environment. Use the verification token below to verify your email.',
      },
    });
  });

  router.post('/auth/login', authLimiter, (req: AuthenticatedRequest, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const rememberMe = Boolean(req.body?.rememberMe);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email address and password are required.' });
    }

    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as
      | (AuthUser & { password_hash: string })
      | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account is suspended. Contact support for assistance.' });
    }

    const sessionToken = generateToken(32);
    const ttlMs = rememberMe ? 30 * 86400000 : 86400000;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    db.prepare(`INSERT INTO sessions (token, user_id, remember_me, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      sessionToken,
      user.id,
      rememberMe ? 1 : 0,
      expiresAt,
      new Date().toISOString()
    );

    setSessionCookie(res, sessionToken, rememberMe);

    return res.json({
      token: sessionToken,
      user: sanitizeUserPublic(user),
      entitlement: getUserEntitlement(user.id),
    });
  });

  router.post('/auth/logout', (req: AuthenticatedRequest, res) => {
    if (req.sessionToken) {
      db.prepare(`DELETE FROM sessions WHERE token = ?`).run(req.sessionToken);
    }
    res.setHeader('Set-Cookie', 'bc_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    res.json({ ok: true });
  });

  router.get('/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    const unreadNotifs = (
      db.prepare(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at = ''`).get(req.user.id) as {
        c: number;
      }
    ).c;
    const unreadMessages = (
      db.prepare(`SELECT COUNT(*) as c FROM messages WHERE recipient_id = ? AND read_at = ''`).get(req.user.id) as {
        c: number;
      }
    ).c;

    return res.json({
      user: sanitizeUserPublic(req.user),
      entitlement: req.entitlement,
      unreadNotifications: unreadNotifs,
      unreadMessages,
    });
  });

  router.post('/auth/verify-email', (req: AuthenticatedRequest, res) => {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }
    const user = db.prepare(`SELECT id FROM users WHERE verification_token = ?`).get(token) as
      | { id: string }
      | undefined;
    if (!user) {
      return res.status(400).json({ error: 'Invalid or already used verification token.' });
    }
    db.prepare(`UPDATE users SET email_verified = 1, verification_token = '' WHERE id = ?`).run(user.id);
    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(user.id) as unknown as AuthUser;
    return res.json({ ok: true, user: sanitizeUserPublic(updated) });
  });

  router.post('/auth/forgot-password', authLimiter, (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    const user = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email) as { id: string } | undefined;
    if (!user) {
      return res.json({
        ok: true,
        message: 'If an account matches that email, a reset token has been generated.',
      });
    }
    const resetToken = generateToken(16);
    const expires = new Date(Date.now() + 3600000).toISOString();
    db.prepare(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?`).run(
      resetToken,
      expires,
      user.id
    );
    return res.json({
      ok: true,
      message: 'SMTP is not configured in this environment. Use the generated reset token below to complete your reset.',
      devResetToken: resetToken,
    });
  });

  router.post('/auth/reset-password', (req, res) => {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!token) return res.status(400).json({ error: 'Reset token is required.' });
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters with 1 uppercase letter and 1 number.',
      });
    }
    const user = db
      .prepare(`SELECT id, reset_expires FROM users WHERE reset_token = ?`)
      .get(token) as { id: string; reset_expires: string } | undefined;
    if (!user || !user.reset_expires || user.reset_expires < new Date().toISOString()) {
      return res.status(400).json({ error: 'Reset token is invalid or expired.' });
    }
    db.prepare(`UPDATE users SET password_hash = ?, reset_token = '', reset_expires = '' WHERE id = ?`).run(
      hashPassword(newPassword),
      user.id
    );
    return res.json({ ok: true, message: 'Password updated successfully. You can now sign in.' });
  });

  router.get('/auth/oauth/:provider', (req, res) => {
    const provider = req.params.provider;
    if (provider === 'google' && !config.oauth.googleEnabled) {
      return res.status(501).json({
        configured: false,
        provider: 'Google',
        error: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables to enable Google sign-in.',
      });
    }
    if (provider === 'apple' && !config.oauth.appleEnabled) {
      return res.status(501).json({
        configured: false,
        provider: 'Apple',
        error: 'Apple Sign-In is not configured. Set APPLE_CLIENT_ID in environment variables to enable Apple sign-in.',
      });
    }
    if (provider === 'google') {
      const redirectUri = `${config.appUrl}/api/auth/oauth/google/callback`;
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        config.oauth.googleClientId
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile`;
      return res.json({ configured: true, redirectUrl: url });
    }
    return res.status(404).json({ error: 'Unsupported OAuth provider.' });
  });

  // =========================================================
  // PROFILE & ONBOARDING & DIRECTORY
  // =========================================================
  router.put('/profile/onboarding', requireAuth, (req: AuthenticatedRequest, res) => {
    const fullName = String(req.body?.fullName || req.user!.full_name).trim();
    const rawUsername = String(req.body?.username || req.user!.username)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    const skillLevel = String(req.body?.skillLevel || 'beginner');
    const interests = Array.isArray(req.body?.interests) ? req.body.interests.slice(0, 12) : [];
    const goals = Array.isArray(req.body?.goals) ? req.body.goals.slice(0, 10) : [];
    const preferredTechs = Array.isArray(req.body?.preferredTechs) ? req.body.preferredTechs.slice(0, 12) : [];
    const bio = String(req.body?.bio || '').trim().slice(0, 500);

    if (rawUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters.' });
    }
    const conflict = db
      .prepare(`SELECT id FROM users WHERE username = ? AND id != ?`)
      .get(rawUsername, req.user!.id);
    if (conflict) {
      return res.status(409).json({ error: 'That username is already taken.' });
    }

    db.prepare(
      `UPDATE users SET full_name = ?, username = ?, skill_level = ?, interests_json = ?, goals_json = ?, preferred_techs_json = ?, bio = ?, onboarding_completed = 1 WHERE id = ?`
    ).run(
      fullName,
      rawUsername,
      skillLevel,
      JSON.stringify(interests),
      JSON.stringify(goals),
      JSON.stringify(preferredTechs),
      bio,
      req.user!.id
    );

    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as unknown as AuthUser;
    return res.json({ user: sanitizeUserPublic(updated) });
  });

  router.put('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
    const fullName = String(req.body?.fullName || req.user!.full_name).trim();
    const bio = String(req.body?.bio ?? req.user!.bio).trim().slice(0, 600);
    const avatarUrl = String(req.body?.avatarUrl ?? req.user!.avatar_url).trim().slice(0, 300);
    if (!isValidAssetOrHttpUrl(avatarUrl)) {
      return res.status(400).json({ error: 'Avatar URL must be a relative path or valid http/https URL.' });
    }
    const skillLevel = String(req.body?.skillLevel || req.user!.skill_level);
    const interests = Array.isArray(req.body?.interests)
      ? req.body.interests
      : parseJsonSafe(req.user!.interests_json, []);
    const goals = Array.isArray(req.body?.goals) ? req.body.goals : parseJsonSafe(req.user!.goals_json, []);
    const preferredTechs = Array.isArray(req.body?.preferredTechs)
      ? req.body.preferredTechs
      : parseJsonSafe(req.user!.preferred_techs_json, []);
    const publicProfile = req.body?.publicProfile !== undefined ? (req.body.publicProfile ? 1 : 0) : req.user!.public_profile;
    const showActivity = req.body?.showActivity !== undefined ? (req.body.showActivity ? 1 : 0) : req.user!.show_activity;
    const allowMessages = req.body?.allowMessages !== undefined ? (req.body.allowMessages ? 1 : 0) : req.user!.allow_messages;
    const rawTheme = req.body?.themePreference ?? req.body?.theme_preference;
    if (rawTheme !== undefined && rawTheme !== 'light' && rawTheme !== 'dark') {
      return res.status(400).json({ error: 'Invalid theme preference. Expected "light" or "dark".' });
    }
    const themePreference: 'dark' | 'light' =
      rawTheme === 'light' || rawTheme === 'dark'
        ? rawTheme
        : req.user!.theme_preference === 'light'
          ? 'light'
          : 'dark';
    const rawGoal = req.body?.dailyGoalMinutes ?? req.body?.daily_goal_minutes;
    const dailyGoalMinutes =
      rawGoal !== undefined && Number.isFinite(Number(rawGoal))
        ? Math.min(480, Math.max(10, Math.round(Number(rawGoal))))
        : Number((req.user as AuthUser & { daily_goal_minutes?: number }).daily_goal_minutes || 30);

    db.prepare(
      `UPDATE users SET full_name = ?, bio = ?, avatar_url = ?, skill_level = ?, interests_json = ?, goals_json = ?, preferred_techs_json = ?, public_profile = ?, show_activity = ?, allow_messages = ?, theme_preference = ?, daily_goal_minutes = ? WHERE id = ?`
    ).run(
      fullName,
      bio,
      avatarUrl,
      skillLevel,
      JSON.stringify(interests),
      JSON.stringify(goals),
      JSON.stringify(preferredTechs),
      publicProfile,
      showActivity,
      allowMessages,
      themePreference,
      dailyGoalMinutes,
      req.user!.id
    );

    const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as unknown as AuthUser;
    return res.json({ user: sanitizeUserPublic(updated) });
  });

  router.get('/users', requireAuth, (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `SELECT id, full_name, username, avatar_url, bio, role, skill_level, preferred_techs_json, xp, level, public_profile, allow_messages
         FROM users
         WHERE status = 'active' AND id != ? AND (public_profile = 1 OR ? = 'admin')
           AND (? = '' OR LOWER(full_name) LIKE ? OR LOWER(username) LIKE ? OR LOWER(preferred_techs_json) LIKE ?)
         ORDER BY xp DESC
         LIMIT ? OFFSET ?`
      )
      .all(req.user!.id, req.user!.role, q, `%${q}%`, `%${q}%`, `%${q}%`, limit, offset) as Array<Record<string, unknown>>;

    res.json({
      users: rows.map((r) => ({
        ...r,
        preferred_techs: parseJsonSafe<string[]>(String(r.preferred_techs_json || '[]'), []),
      })),
      page,
    });
  });

  router.get('/users/:username', (req: AuthenticatedRequest, res) => {
    const target = db.prepare(`SELECT * FROM users WHERE username = ? AND status = 'active'`).get(req.params.username) as
      | AuthUser
      | undefined;
    if (!target) {
      return res.status(404).json({ error: 'Developer profile not found.' });
    }
    const isSelf = req.user?.id === target.id;
    if (!target.public_profile && !isSelf && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'This developer portfolio is set to private.' });
    }

    const projects = db
      .prepare(
        `SELECT * FROM projects WHERE owner_id = ? AND (visibility = 'public' OR ? = 1) ORDER BY updated_at DESC`
      )
      .all(target.id, isSelf ? 1 : 0) as Array<Record<string, unknown>>;

    const badges = db
      .prepare(
        `SELECT b.title, b.description, ub.awarded_at FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = ?`
      )
      .all(target.id);

    const completedCourses = db
      .prepare(
        `SELECT c.id, c.title, c.slug, c.difficulty,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons,
                (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE lp.course_id = c.id AND lp.user_id = ? AND lp.completed = 1 AND l.status = 'published') as completed_lessons
         FROM enrollments e JOIN courses c ON c.id = e.course_id
         WHERE e.user_id = ? AND c.is_published = 1`
      )
      .all(target.id, target.id);

    const communities = db
      .prepare(
        `SELECT cm.role, c.id, c.name, c.slug, c.category
         FROM community_members cm JOIN communities c ON c.id = cm.community_id
         WHERE cm.user_id = ? AND cm.status = 'active'`
      )
      .all(target.id);

    res.json({
      profile: sanitizeUserPublic(target),
      projects: projects.map((p) => ({
        ...p,
        tags: parseJsonSafe<string[]>(String(p.tags_json || '[]'), []),
        screenshots: parseJsonSafe<string[]>(String(p.screenshots_json || '[]'), []),
        contributors: parseJsonSafe<string[]>(String(p.contributors_json || '[]'), []),
      })),
      badges,
      completedCourses,
      communities,
    });
  });

  // =========================================================
  // DASHBOARD AGGREGATION (REAL USER DATA)
  // =========================================================
  router.get('/dashboard', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const enrollments = db
      .prepare(
        `SELECT c.id, c.title, c.slug, c.difficulty, c.estimated_hours, c.thumbnail_url, e.enrolled_at, e.last_lesson_id,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons,
                (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE lp.course_id = c.id AND lp.user_id = ? AND lp.completed = 1 AND l.status = 'published') as completed_lessons
         FROM enrollments e
         JOIN courses c ON c.id = e.course_id
         WHERE e.user_id = ? AND c.is_published = 1
         ORDER BY e.enrolled_at DESC`
      )
      .all(userId, userId);

    const preferredTechs = parseJsonSafe<string[]>(req.user!.preferred_techs_json, []);
    const recommendedCourses = db
      .prepare(
        `SELECT c.id, c.title, c.slug, c.description, c.difficulty, c.estimated_hours, c.thumbnail_url, t.name as technology_name
         FROM courses c
         JOIN technologies t ON t.id = c.technology_id
         WHERE c.is_published = 1 AND c.status = 'published'
           AND c.id NOT IN (SELECT course_id FROM enrollments WHERE user_id = ?)
         ORDER BY c.created_at DESC LIMIT 6`
      )
      .all(userId) as Array<Record<string, unknown>>;

    recommendedCourses.sort((a, b) => {
      const aMatch = preferredTechs.some((pt) => String(a.technology_name).toLowerCase().includes(pt.toLowerCase())) ? 1 : 0;
      const bMatch = preferredTechs.some((pt) => String(b.technology_name).toLowerCase().includes(pt.toLowerCase())) ? 1 : 0;
      return bMatch - aMatch;
    });

    const recentProjects = db
      .prepare(`SELECT id, title, visibility, updated_at, tags_json FROM projects WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 4`)
      .all(userId) as Array<Record<string, unknown>>;

    const badges = db
      .prepare(
        `SELECT b.id, b.title, b.description, ub.awarded_at
         FROM user_badges ub JOIN badges b ON b.id = ub.badge_id WHERE ub.user_id = ?`
      )
      .all(userId);

    const upcomingAssessments = db
      .prepare(
        `SELECT a.id, a.title, a.type, a.mode, a.xp_reward, c.title as course_title, c.slug as course_slug,
                (SELECT MAX(aa.score) FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.user_id = ?) as best_score,
                (SELECT MAX(aa.max_score) FROM assessment_attempts aa WHERE aa.assessment_id = a.id AND aa.user_id = ?) as max_score
         FROM assessments a
         JOIN courses c ON c.id = a.course_id
         WHERE c.is_published = 1 AND c.status = 'published'
         ORDER BY a.created_at DESC LIMIT 6`
      )
      .all(userId, userId);

    const notifications = db
      .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 6`)
      .all(userId);

    const leaderboard = db
      .prepare(
        `SELECT id, full_name, username, xp, level, streak_days FROM users WHERE status = 'active' AND public_profile = 1 ORDER BY xp DESC LIMIT 8`
      )
      .all();

    const bookmarkedLessons = db
      .prepare(
        `SELECT l.id, l.title, l.slug, l.duration_minutes, c.id as course_id, c.title as course_title, c.slug as course_slug, t.name as technology_name
         FROM lesson_progress lp
         JOIN lessons l ON l.id = lp.lesson_id
         JOIN courses c ON c.id = lp.course_id
         LEFT JOIN technologies t ON t.id = c.technology_id
         WHERE lp.user_id = ? AND lp.bookmarked = 1
         ORDER BY l.sort_order ASC LIMIT 10`
      )
      .all(userId);

    const allPaths = db.prepare(`SELECT * FROM learning_paths WHERE is_published = 1`).all() as Array<Record<string, unknown>>;
    const enrolledIds = new Set((enrollments as Array<{ id: string }>).map((e) => e.id));
    const learningPathsProgress = allPaths
      .map((p) => {
        const courseIds = parseJsonSafe<string[]>(String(p.course_ids_json || '[]'), []);
        const totalLessons = courseIds.length
          ? (
              db
                .prepare(`SELECT COUNT(*) as c FROM lessons WHERE status = 'published' AND course_id IN (${courseIds.map(() => '?').join(',')})`)
                .get(...courseIds) as { c: number }
            ).c
          : 0;
        const completedLessons = courseIds.length
          ? (
              db
                .prepare(
                  `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
                   WHERE lp.user_id = ? AND lp.completed = 1 AND l.status = 'published' AND lp.course_id IN (${courseIds.map(() => '?').join(',')})`
                )
                .get(userId, ...courseIds) as { c: number }
            ).c
          : 0;
        const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
        const touchesEnrolled = courseIds.some((cid) => enrolledIds.has(cid));
        return {
          id: String(p.id),
          title: String(p.title),
          slug: String(p.slug),
          target_role: String(p.target_role || ''),
          difficulty: String(p.difficulty || ''),
          estimated_hours: Number(p.estimated_hours || 0),
          course_ids: courseIds,
          totalLessons,
          completedLessons,
          percentage: pct,
          touchesEnrolled,
        };
      })
      .filter((p) => p.touchesEnrolled || p.completedLessons > 0)
      .slice(0, 5);

    const todayPrefix = new Date().toISOString().slice(0, 10);
    const todayCompletedRow = db
      .prepare(
        `SELECT COALESCE(SUM(l.duration_minutes), 0) as mins, COUNT(*) as cnt
         FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
         WHERE lp.user_id = ? AND lp.completed = 1 AND lp.completed_at LIKE ?`
      )
      .get(userId, `${todayPrefix}%`) as { mins: number; cnt: number };

    const goalMinutes = Number((req.user as AuthUser & { daily_goal_minutes?: number }).daily_goal_minutes || 30);
    const exerciseStats = db
      .prepare(
        `SELECT COUNT(DISTINCT CASE WHEN is_correct = 1 THEN exercise_id END) as solved_count,
                COUNT(*) as total_attempts
         FROM exercise_submissions WHERE user_id = ?`
      )
      .get(userId) as { solved_count: number; total_attempts: number };

    const certificatesCount = (
      db.prepare(`SELECT COUNT(*) as c FROM certificates WHERE user_id = ? AND status = 'active'`).get(userId) as { c: number }
    ).c;
    const pathCertificates = db
      .prepare(`SELECT * FROM path_certificates WHERE user_id = ? ORDER BY issued_at DESC`)
      .all(userId);
    const assignmentSubmissions = db
      .prepare(
        `SELECT asub.*, a.title as assignment_title, c.title as course_title, c.slug as course_slug
         FROM assignment_submissions asub
         JOIN assignments a ON a.id = asub.assignment_id
         JOIN courses c ON c.id = a.course_id
         WHERE asub.user_id = ? ORDER BY asub.updated_at DESC LIMIT 6`
      )
      .all(userId);

    const canAccessPremium = Boolean(
      req.entitlement?.limits.canAccessPremiumCourses ||
        req.user?.role === 'admin' ||
        req.user?.role === 'instructor'
    );
    const recommendations = getLearnerRecommendations({
      userId,
      canAccessPremium,
    });

    res.json({
      enrollments,
      recommendedCourses,
      recommendations,
      recentProjects: recentProjects.map((p) => ({
        ...p,
        tags: parseJsonSafe<string[]>(String(p.tags_json || '[]'), []),
      })),
      badges,
      upcomingAssessments,
      notifications,
      leaderboard,
      bookmarkedLessons,
      learningPathsProgress,
      dailyGoal: {
        goalMinutes,
        todayMinutes: Number(todayCompletedRow.mins || 0),
        completedToday: Number(todayCompletedRow.cnt || 0),
      },
      exerciseStats: {
        solvedCount: Number(exerciseStats?.solved_count || 0),
        totalAttempts: Number(exerciseStats?.total_attempts || 0),
      },
      certificatesCount,
      pathCertificates,
      assignmentSubmissions,
      aiUsage: getAiUsageSummary(userId),
    });
  });

  function mapCategoryFilterSlugs(categoryParam: string): {
    slugs: string[];
    extraTechSlugs: string[];
  } {
    const clean = categoryParam.trim().toLowerCase();
    if (!clean) return { slugs: [], extraTechSlugs: [] };
    switch (clean) {
      case 'programming-languages':
        return { slugs: ['programming-languages'], extraTechSlugs: ['html', 'css', 'javascript', 'typescript', 'sql', 'php', 'swift', 'kotlin', 'dart', 'r-language', 'matlab', 'julia', 'bash', 'powershell', 'assembly'] };
      case 'frontend-development':
        return { slugs: ['frontend-development', 'web-development'], extraTechSlugs: ['nextjs', 'nuxt', 'astro', 'gatsby', 'remix', 'redux', 'zustand', 'mobx', 'tanstack-query'] };
      case 'backend-development':
        return { slugs: ['backend-development'], extraTechSlugs: ['express', 'nestjs', 'fastify', 'django', 'flask', 'fastapi', 'laravel', 'symfony', 'spring-boot', 'aspnet-core', 'ruby-on-rails', 'phoenix', 'gin', 'fiber', 'actix-web', 'axum', 'koa', 'hono'] };
      case 'frameworks-libraries':
        return { slugs: ['frameworks-libraries'], extraTechSlugs: ['react', 'angular', 'vuejs', 'svelte', 'bootstrap', 'tailwind-css', 'material-ui', 'chakra-ui', 'ant-design', 'shadcn-ui', 'alpinejs', 'lit', 'threejs', 'flutter', 'react-native', 'jetpack-compose', 'swiftui'] };
      case 'databases':
        return { slugs: ['database-management'], extraTechSlugs: [] };
      case 'mobile-development':
        return { slugs: ['mobile-app-development'], extraTechSlugs: [] };
      case 'artificial-intelligence':
        return { slugs: ['ai-machine-learning'], extraTechSlugs: [] };
      case 'data-science':
        return { slugs: ['data-science-analytics'], extraTechSlugs: ['sql', 'postgresql', 'duckdb', 'snowflake'] };
      case 'cloud-devops':
        return { slugs: ['cloud-computing', 'devops-software-engineering'], extraTechSlugs: ['linux', 'nginx', 'apache-http'] };
      case 'developer-tools':
        return { slugs: ['software-tools-productivity'], extraTechSlugs: [] };
      case 'ui-ux-design':
        return { slugs: ['ui-ux-product-design', 'graphics-digital-design'], extraTechSlugs: ['wordpress', 'elementor', 'tailwind-css'] };
      case 'cybersecurity':
        return { slugs: ['cybersecurity', 'networking'], extraTechSlugs: [] };
      case 'computer-fundamentals':
        return { slugs: ['computer-fundamentals'], extraTechSlugs: ['c', 'cpp'] };
      default:
        return { slugs: [clean], extraTechSlugs: [] };
    }
  }

  function formatTechRow(row: Record<string, unknown>): Record<string, unknown> & {
    aliases: string[];
    course_count: number;
    learning_status: string;
  } {
    const courseCount = Number(row.course_count || 0);
    const storedStatus = String(row.content_status || 'coming_soon');
    const learningStatus =
      courseCount > 0 ? 'available' : storedStatus === 'in_development' ? 'in_development' : 'coming_soon';
    return {
      ...row,
      aliases: parseJsonSafe<string[]>(String(row.aliases_json || '[]'), []),
      course_count: courseCount,
      learning_status: learningStatus,
    };
  }

  // Paginated, searchable & filterable Technology Directory (200+ technologies)
  router.get('/technologies', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const categoryParam = String(req.query.category || '').trim().toLowerCase();
    const difficulty = String(req.query.difficulty || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || 'all').trim().toLowerCase();
    const sort = String(req.query.sort || 'popular').trim().toLowerCase();
    const limit = Math.min(300, Math.max(1, Number(req.query.limit || 40)));
    const offset = Math.max(0, Number(req.query.offset || 0));

    const rawRows = db
      .prepare(
        `SELECT t.*, c.name as category_name, c.slug as category_slug,
                (SELECT COUNT(*) FROM courses crs WHERE crs.technology_id = t.id AND crs.is_published = 1 AND crs.status = 'published') as course_count
         FROM technologies t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.is_published = 1`
      )
      .all() as Array<Record<string, unknown>>;

    const allPublished = rawRows.map(formatTechRow) as unknown as Array<Record<string, unknown> & {
      name: string;
      slug: string;
      description: string;
      category_name: string;
      category_slug: string;
      difficulty: string;
      aliases: string[];
      learning_status: string;
      is_popular: number;
      featured_order: number;
      sort_order: number;
      created_at: string;
    }>;

    const statusCounts = {
      available: allPublished.filter((t) => t.learning_status === 'available').length,
      in_development: allPublished.filter((t) => t.learning_status === 'in_development').length,
      coming_soon: allPublished.filter((t) => t.learning_status === 'coming_soon').length,
    };

    const { slugs, extraTechSlugs } = mapCategoryFilterSlugs(categoryParam);

    let filtered = allPublished.filter((t) => {
      if (categoryParam && categoryParam !== 'all') {
        const matchesCat = slugs.includes(String(t.category_slug || '').toLowerCase());
        const matchesExtra = extraTechSlugs.includes(String(t.slug || '').toLowerCase());
        if (!matchesCat && !matchesExtra) return false;
      }
      if (difficulty && difficulty !== 'all' && String(t.difficulty || '').toLowerCase() !== difficulty) {
        return false;
      }
      if (statusFilter !== 'all' && t.learning_status !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = [
          t.name,
          t.slug,
          t.description,
          t.category_name,
          ...t.aliases,
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'alpha') {
      filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'recent') {
      filtered = [...filtered].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    } else {
      filtered = [...filtered].sort((a, b) => {
        if (Number(b.is_popular || 0) !== Number(a.is_popular || 0)) {
          return Number(b.is_popular || 0) - Number(a.is_popular || 0);
        }
        const fa = Number(a.featured_order || 9999);
        const fb = Number(b.featured_order || 9999);
        if (fa !== fb) return fa - fb;
        const sa = Number(a.sort_order || 9999);
        const sb = Number(b.sort_order || 9999);
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name);
      });
    }

    const featured = allPublished
      .filter((t) => Number(t.is_popular) === 1)
      .sort((a, b) => (Number(a.featured_order || 999) - Number(b.featured_order || 999)) || (Number(a.sort_order) - Number(b.sort_order)))
      .slice(0, 18);

    res.json({
      technologies: filtered.slice(offset, offset + limit),
      totalCount: allPublished.length,
      filteredCount: filtered.length,
      statusCounts,
      featured,
    });
  });

  // =========================================================
  // CATALOG, TECHNOLOGIES, SEARCH, COURSES & LESSONS
  // =========================================================
  router.get('/catalog', (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const categorySlug = String(req.query.category || '').trim();
    const techSlug = String(req.query.tech || '').trim();
    const difficulty = String(req.query.difficulty || '').trim().toLowerCase();
    const access = String(req.query.access || 'all').trim().toLowerCase();

    const categories = db.prepare(`SELECT * FROM categories ORDER BY sort_order ASC, name ASC`).all();
    const rawTechnologies = db
      .prepare(
        `SELECT t.*, c.name as category_name, c.slug as category_slug,
                (SELECT COUNT(*) FROM courses crs WHERE crs.technology_id = t.id AND crs.is_published = 1 AND crs.status = 'published') as course_count
         FROM technologies t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE t.is_published = 1
         ORDER BY t.sort_order ASC, t.name ASC`
      )
      .all() as Array<Record<string, unknown>>;
    const technologies = rawTechnologies.map(formatTechRow);
    const paths = db.prepare(`SELECT * FROM learning_paths`).all() as Array<Record<string, unknown>>;

    let courses = db
      .prepare(
        `SELECT c.*, cat.name as category_name, cat.slug as category_slug,
                tech.name as technology_name, tech.slug as technology_slug,
                u.full_name as instructor_name, u.username as instructor_username, u.avatar_url as instructor_avatar,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published' AND l.access_tier = 'free') as free_lessons
         FROM courses c
         JOIN categories cat ON cat.id = c.category_id
         JOIN technologies tech ON tech.id = c.technology_id
         JOIN users u ON u.id = c.instructor_id
         WHERE c.is_published = 1 AND c.status = 'published'
           AND (? = '' OR cat.slug = ?)
           AND (? = '' OR tech.slug = ?)
           AND (? = '' OR LOWER(c.difficulty) = ?)
           AND (? = '' OR LOWER(c.title) LIKE ? OR LOWER(c.description) LIKE ? OR LOWER(tech.name) LIKE ?)
         ORDER BY c.created_at ASC`
      )
      .all(
        categorySlug,
        categorySlug,
        techSlug,
        techSlug,
        difficulty,
        difficulty,
        q,
        `%${q}%`,
        `%${q}%`,
        `%${q}%`
      ) as Array<Record<string, unknown>>;

    if (access === 'free') {
      courses = courses.filter((c) => Number(c.free_lessons || 0) > 0);
    } else if (access === 'premium') {
      courses = courses.filter((c) => Number(c.total_lessons || 0) > Number(c.free_lessons || 0));
    }

    const enrolledSet = new Set<string>();
    if (req.user) {
      const enr = db.prepare(`SELECT course_id FROM enrollments WHERE user_id = ?`).all(req.user.id) as Array<{
        course_id: string;
      }>;
      enr.forEach((e) => enrolledSet.add(e.course_id));
    }

    res.json({
      categories,
      technologies,
      learningPaths: paths.map((p) => ({
        ...p,
        course_ids: parseJsonSafe<string[]>(String(p.course_ids_json || '[]'), []),
        prerequisites: parseJsonSafe<string[]>(String(p.prerequisites_json || '[]'), []),
        objectives: parseJsonSafe<string[]>(String(p.objectives_json || '[]'), []),
        milestones: parseJsonSafe<Array<{ step: number; title: string; summary: string }>>(String(p.milestones_json || '[]'), []),
        project_template_ids: parseJsonSafe<string[]>(String(p.project_template_ids_json || '[]'), []),
      })),
      courses: courses.map((c) => ({
        ...c,
        objectives: parseJsonSafe<string[]>(String(c.objectives_json || '[]'), []),
        prerequisites: parseJsonSafe<string[]>(String(c.prerequisites_json || '[]'), []),
        enrolled: enrolledSet.has(String(c.id)),
      })),
    });
  });

  // Dedicated Technology Learning Page Endpoint (public metadata + free sample code only; premium bodies stay locked)
  router.get('/technologies/:slug', (req: AuthenticatedRequest, res) => {
    const techRaw = db
      .prepare(
        `SELECT t.*, cat.name as category_name, cat.slug as category_slug,
                (SELECT COUNT(*) FROM courses crs WHERE crs.technology_id = t.id AND crs.is_published = 1 AND crs.status = 'published') as course_count
         FROM technologies t
         JOIN categories cat ON cat.id = t.category_id
         WHERE t.slug = ? AND t.is_published = 1`
      )
      .get(req.params.slug) as (Record<string, unknown> & { id: string; category_id: string; name: string; slug: string }) | undefined;

    if (!techRaw) {
      return res.status(404).json({ error: 'Technology not found.' });
    }
    const tech = formatTechRow(techRaw) as unknown as Record<string, unknown> & { id: string; category_id: string; name: string; slug: string };

    const courses = db
      .prepare(
        `SELECT c.*, cat.name as category_name, cat.slug as category_slug,
                tech.name as technology_name, tech.slug as technology_slug,
                u.full_name as instructor_name, u.username as instructor_username,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published' AND l.access_tier = 'free') as free_lessons
         FROM courses c
         JOIN categories cat ON cat.id = c.category_id
         JOIN technologies tech ON tech.id = c.technology_id
         JOIN users u ON u.id = c.instructor_id
         WHERE c.technology_id = ? AND c.is_published = 1 AND c.status = 'published'
         ORDER BY c.created_at ASC`
      )
      .all(tech.id) as Array<Record<string, unknown>>;

    const courseIds = courses.map((c) => String(c.id));
    const coursesWithOutline = courses.map((c) => {
      const modules = db
        .prepare(`SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC`)
        .all(String(c.id)) as Array<Record<string, unknown>>;
      const topics = db
        .prepare(`SELECT * FROM course_topics WHERE course_id = ? ORDER BY sort_order ASC`)
        .all(String(c.id)) as Array<Record<string, unknown>>;
      const lessons = db
        .prepare(
          `SELECT id, module_id, topic_id, course_id, title, slug, topic_name, summary, access_tier, duration_minutes, language, sort_order
           FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order ASC`
        )
        .all(String(c.id)) as Array<Record<string, unknown>>;
      const assessments = db
        .prepare(`SELECT id, title, type, mode, time_limit_sec, xp_reward, passing_score_pct FROM assessments WHERE course_id = ?`)
        .all(String(c.id));
      return {
        ...c,
        objectives: parseJsonSafe<string[]>(String(c.objectives_json || '[]'), []),
        prerequisites: parseJsonSafe<string[]>(String(c.prerequisites_json || '[]'), []),
        modules: modules.map((m) => ({
          ...m,
          topics: topics.filter((tp) => tp.module_id === m.id),
          lessons: lessons.filter((l) => l.module_id === m.id),
        })),
        assessments,
      };
    });

    const allPaths = db.prepare(`SELECT * FROM learning_paths`).all() as Array<Record<string, unknown>>;
    const relatedPaths = allPaths
      .map((p) => ({
        ...p,
        title: String(p.title || ''),
        description: String(p.description || ''),
        course_ids: parseJsonSafe<string[]>(String(p.course_ids_json || '[]'), []),
        prerequisites: parseJsonSafe<string[]>(String(p.prerequisites_json || '[]'), []),
        objectives: parseJsonSafe<string[]>(String(p.objectives_json || '[]'), []),
        milestones: parseJsonSafe<Array<{ step: number; title: string; summary: string }>>(String(p.milestones_json || '[]'), []),
        project_template_ids: parseJsonSafe<string[]>(String(p.project_template_ids_json || '[]'), []),
      }))
      .filter(
        (p) =>
          p.course_ids.some((cid) => courseIds.includes(cid)) ||
          p.title.toLowerCase().includes(tech.name.toLowerCase()) ||
          p.description.toLowerCase().includes(tech.name.toLowerCase())
      );

    const resources = db
      .prepare(
        `SELECT * FROM resources
         WHERE LOWER(technology) = LOWER(?) OR LOWER(title) LIKE ?
         ORDER BY created_at DESC LIMIT 8`
      )
      .all(tech.name, `%${tech.name.toLowerCase()}%`);

    const projectTemplates = (
      db
        .prepare(
          `SELECT * FROM project_templates
           WHERE technology_id = ? ${courseIds.length ? `OR course_id IN (${courseIds.map(() => '?').join(',')})` : ''}
           ORDER BY created_at ASC`
        )
        .all(tech.id, ...courseIds) as Array<Record<string, unknown>>
    ).map((pt) => formatProjectTemplateRow(pt));

    const exerciseCount = courseIds.length
      ? (
          db
            .prepare(`SELECT COUNT(*) as c FROM exercises WHERE technology_id = ? OR course_id IN (${courseIds.map(() => '?').join(',')})`)
            .get(tech.id, ...courseIds) as { c: number }
        ).c
      : 0;
    const assignmentCount = courseIds.length
      ? (
          db
            .prepare(`SELECT COUNT(*) as c FROM assignments WHERE technology_id = ? OR course_id IN (${courseIds.map(() => '?').join(',')})`)
            .get(tech.id, ...courseIds) as { c: number }
        ).c
      : 0;

    const lessonProgressMap = new Map<string, { completed: boolean; bookmarked: boolean; progress_status: string }>();
    let userProgress = null;
    if (req.user && courseIds.length > 0) {
      const lpRows = db
        .prepare(
          `SELECT lp.lesson_id, lp.completed, lp.bookmarked, lp.status as progress_status
           FROM lesson_progress lp
           WHERE lp.user_id = ? AND lp.course_id IN (${courseIds.map(() => '?').join(',')})`
        )
        .all(req.user.id, ...courseIds) as Array<{
        lesson_id: string;
        completed: number;
        bookmarked: number;
        progress_status?: string;
      }>;
      for (const r of lpRows) {
        const st = r.completed ? 'completed' : r.progress_status === 'in_progress' ? 'in_progress' : 'not_started';
        lessonProgressMap.set(r.lesson_id, {
          completed: Boolean(r.completed),
          bookmarked: Boolean(r.bookmarked),
          progress_status: st,
        });
      }

      const totalLessons = coursesWithOutline.reduce((acc, c) => acc + Number((c as Record<string, unknown>).total_lessons || 0), 0);
      const completedLessons = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
             WHERE lp.user_id = ? AND lp.completed = 1 AND l.status = 'published' AND lp.course_id IN (${courseIds.map(() => '?').join(',')})`
          )
          .get(req.user.id, ...courseIds) as { c: number }
      ).c;
      const inProgressLessons = (
        db
          .prepare(
            `SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id
             WHERE lp.user_id = ? AND lp.completed = 0 AND lp.status = 'in_progress' AND l.status = 'published' AND lp.course_id IN (${courseIds.map(() => '?').join(',')})`
          )
          .get(req.user.id, ...courseIds) as { c: number }
      ).c;
      const completedExercises = (
        db
          .prepare(
            `SELECT COUNT(DISTINCT es.exercise_id) as c FROM exercise_submissions es
             JOIN exercises e ON e.id = es.exercise_id
             WHERE es.user_id = ? AND es.is_correct = 1 AND e.course_id IN (${courseIds.map(() => '?').join(',')})`
          )
          .get(req.user.id, ...courseIds) as { c: number }
      ).c;
      const enrolledCourseIds = (
        db
          .prepare(`SELECT course_id FROM enrollments WHERE user_id = ? AND course_id IN (${courseIds.map(() => '?').join(',')})`)
          .all(req.user.id, ...courseIds) as Array<{ course_id: string }>
      ).map((r) => r.course_id);
      userProgress = {
        completedLessons,
        inProgressLessons,
        totalLessons,
        completedExercises,
        percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        enrolledCourseIds,
      };
    }

    const hydratedCourses = coursesWithOutline.map((c) => ({
      ...c,
      modules: (c.modules as Array<Record<string, unknown>>).map((m) => ({
        ...m,
        lessons: (m.lessons as Array<Record<string, unknown>>).map((l) => {
          const lp = lessonProgressMap.get(String(l.id));
          return {
            ...l,
            completed: lp?.completed || false,
            bookmarked: lp?.bookmarked || false,
            progress_status: lp?.progress_status || 'not_started',
          };
        }),
      })),
    }));

    const objectives = Array.from(
      new Set(coursesWithOutline.flatMap((c) => ((c as Record<string, unknown>).objectives as string[]) || []))
    ).slice(0, 6);
    const prerequisites = Array.from(
      new Set(coursesWithOutline.flatMap((c) => ((c as Record<string, unknown>).prerequisites as string[]) || []))
    ).slice(0, 4);

    const relatedTechnologies = (
      db
        .prepare(
          `SELECT t.*, cat.name as category_name, cat.slug as category_slug,
                  (SELECT COUNT(*) FROM courses crs WHERE crs.technology_id = t.id AND crs.is_published = 1 AND crs.status = 'published') as course_count
           FROM technologies t
           JOIN categories cat ON cat.id = t.category_id
           WHERE t.category_id = ? AND t.id != ? AND t.is_published = 1
           ORDER BY t.is_popular DESC, t.sort_order ASC LIMIT 6`
        )
        .all(tech.category_id, tech.id) as Array<Record<string, unknown>>
    ).map(formatTechRow);

    const freeSample =
      courseIds.length > 0
        ? (db
            .prepare(
              `SELECT l.id, l.title, l.language, l.code_example, l.starter_code, l.exercise_prompt
               FROM lessons l
               WHERE l.course_id = ? AND l.status = 'published' AND l.access_tier = 'free' AND l.code_example != ''
               ORDER BY l.sort_order ASC LIMIT 1`
            )
            .get(courseIds[0]) as Record<string, unknown> | undefined)
        : undefined;

    const capabilityProfile = resolveTechnologyCapability({
      id: tech.id,
      slug: tech.slug,
      name: tech.name,
      categoryId: String(tech.category_id || ''),
      categorySlug: String(tech.category_slug || ''),
      categoryName: String(tech.category_name || ''),
    });

    const learningCentre = getTechnologyLearningCentre({
      slug: tech.slug,
      userId: req.user?.id,
      tech: {
        id: tech.id,
        slug: tech.slug,
        name: tech.name,
        description: String(tech.description || ''),
        difficulty: String(tech.difficulty || 'Beginner'),
        category_id: String(tech.category_id || ''),
        category_slug: String(tech.category_slug || ''),
        category_name: String(tech.category_name || ''),
      },
      capability: capabilityProfile,
      courses: coursesWithOutline as unknown as CourseOutlineForMapping[],
      resources: resources as Array<{ id?: string; title: string; type?: string; summary?: string; code_snippet?: string }>,
      projectTemplates: projectTemplates as unknown as Array<{ id: string; title: string; summary?: string; difficulty?: string; estimated_hours?: number }>,
    });

    res.json({
      technology: tech,
      capabilityProfile,
      courses: hydratedCourses,
      learningPaths: relatedPaths,
      resources,
      relatedTechnologies,
      projectTemplates,
      prerequisites,
      objectives,
      exerciseCount,
      assignmentCount,
      userProgress,
      freeSample: freeSample || null,
      learningCentre,
    });
  });

  // Global Database-Driven Learning Search & Autocomplete (strictly metadata only; never exposes premium bodies)
  router.get('/search', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const categorySlug = String(req.query.category || '').trim();
    const difficulty = String(req.query.difficulty || '').trim().toLowerCase();
    const access = String(req.query.access || 'all').trim().toLowerCase();
    const like = `%${q}%`;

    const technologies = (
      db
        .prepare(
          `SELECT t.*, cat.name as category_name, cat.slug as category_slug,
                  (SELECT COUNT(*) FROM courses crs WHERE crs.technology_id = t.id AND crs.is_published = 1 AND crs.status = 'published') as course_count
           FROM technologies t
           JOIN categories cat ON cat.id = t.category_id
           WHERE t.is_published = 1
             AND (? = '' OR cat.slug = ?)
             AND (? = '' OR LOWER(t.difficulty) = ?)
             AND (? = '' OR LOWER(t.name) LIKE ? OR LOWER(t.description) LIKE ? OR LOWER(t.aliases_json) LIKE ? OR LOWER(cat.name) LIKE ?)
           ORDER BY t.is_popular DESC, t.sort_order ASC LIMIT 24`
        )
        .all(categorySlug, categorySlug, difficulty, difficulty, q, like, like, like, like) as Array<Record<string, unknown>>
    ).map(formatTechRow);

    const learningPaths = db
      .prepare(
        `SELECT id, title, slug, description, difficulty, estimated_hours, target_role, course_ids_json
         FROM learning_paths
         WHERE (? = '' OR LOWER(difficulty) LIKE ?)
           AND (? = '' OR LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(target_role) LIKE ?)
         LIMIT 8`
      )
      .all(difficulty, `%${difficulty}%`, q, like, like, like)
      .map((p: Record<string, unknown>) => ({
        ...p,
        course_ids: parseJsonSafe<string[]>(String(p.course_ids_json || '[]'), []),
      }));

    let courses = db
      .prepare(
        `SELECT c.id, c.title, c.slug, c.description, c.difficulty, c.estimated_hours,
                cat.name as category_name, cat.slug as category_slug,
                tech.name as technology_name, tech.slug as technology_slug,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published' AND l.access_tier = 'free') as free_lessons
         FROM courses c
         JOIN categories cat ON cat.id = c.category_id
         JOIN technologies tech ON tech.id = c.technology_id
         WHERE c.is_published = 1 AND c.status = 'published'
           AND (? = '' OR cat.slug = ?)
           AND (? = '' OR LOWER(c.difficulty) = ?)
           AND (? = '' OR LOWER(c.title) LIKE ? OR LOWER(c.description) LIKE ? OR LOWER(tech.name) LIKE ?)
         ORDER BY c.created_at DESC LIMIT 12`
      )
      .all(categorySlug, categorySlug, difficulty, difficulty, q, like, like, like) as Array<Record<string, unknown>>;

    if (access === 'free') {
      courses = courses.filter((c) => Number(c.free_lessons || 0) > 0);
    } else if (access === 'premium') {
      courses = courses.filter((c) => Number(c.total_lessons || 0) > Number(c.free_lessons || 0));
    }

    const lessons = db
      .prepare(
        `SELECT l.id, l.title, l.slug, l.topic_name, l.summary, l.access_tier, l.duration_minutes,
                c.id as course_id, c.title as course_title, c.slug as course_slug, c.difficulty,
                cat.name as category_name, cat.slug as category_slug,
                tech.name as technology_name, tech.slug as technology_slug
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         JOIN categories cat ON cat.id = c.category_id
         JOIN technologies tech ON tech.id = c.technology_id
         WHERE l.status = 'published' AND c.is_published = 1 AND c.status = 'published'
           AND (? = '' OR cat.slug = ?)
           AND (? = '' OR LOWER(c.difficulty) = ?)
           AND (? = 'all' OR l.access_tier = ?)
           AND (? = '' OR LOWER(l.title) LIKE ? OR LOWER(l.topic_name) LIKE ? OR LOWER(l.summary) LIKE ? OR LOWER(tech.name) LIKE ?)
         ORDER BY l.sort_order ASC LIMIT 16`
      )
      .all(
        categorySlug,
        categorySlug,
        difficulty,
        difficulty,
        access === 'free' || access === 'premium' ? access : 'all',
        access === 'free' || access === 'premium' ? access : 'all',
        q,
        like,
        like,
        like,
        like
      );

    const modules = db
      .prepare(
        `SELECT m.id, m.course_id, m.title, m.topic, c.title as course_title, c.slug as course_slug
         FROM modules m
         JOIN courses c ON c.id = m.course_id
         WHERE c.is_published = 1 AND c.status = 'published'
           AND (? = '' OR LOWER(m.title) LIKE ? OR LOWER(m.topic) LIKE ?)
         ORDER BY m.sort_order ASC LIMIT 10`
      )
      .all(q, like, like);

    const exercises = db
      .prepare(
        `SELECT e.id, e.course_id, e.lesson_id, e.title, e.exercise_type, e.difficulty, c.title as course_title, c.slug as course_slug
         FROM exercises e
         JOIN courses c ON c.id = e.course_id
         WHERE c.is_published = 1 AND c.status = 'published'
           AND (? = '' OR LOWER(e.title) LIKE ? OR LOWER(e.exercise_type) LIKE ?)
         ORDER BY e.sort_order ASC LIMIT 10`
      )
      .all(q, like, like);

    const projectTemplates = (
      db
        .prepare(
          `SELECT pt.id, pt.title, pt.slug, pt.category, pt.difficulty, pt.estimated_hours, pt.summary, t.name as technology_name
           FROM project_templates pt
           LEFT JOIN technologies t ON t.id = pt.technology_id
           WHERE (? = '' OR LOWER(pt.title) LIKE ? OR LOWER(pt.summary) LIKE ? OR LOWER(pt.category) LIKE ?)
           LIMIT 8`
        )
        .all(q, like, like, like) as Array<Record<string, unknown>>
    );

    const resources = db
      .prepare(
        `SELECT id, title, category, technology, type, summary
         FROM resources
         WHERE (? = '' OR LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(technology) LIKE ?)
         ORDER BY created_at DESC LIMIT 8`
      )
      .all(q, like, like, like);

    res.json({
      query: q,
      technologies,
      learningPaths,
      courses,
      modules,
      lessons,
      exercises,
      projectTemplates,
      resources,
    });
  });

  // Public Contact / Support Submission (validated, categorized, rate-limited, honeypot-protected)
  router.post('/contact', contactLimiter, (req, res) => {
    const honeypot = String(req.body?.website || '').trim();
    if (honeypot.length > 0) {
      return res.status(400).json({ error: 'Spam check triggered. Submission rejected.' });
    }

    const fullName = String(req.body?.fullName ?? req.body?.name ?? '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const rawCategory = String(req.body?.category || 'General Enquiry').trim();
    const category = ALLOWED_CONTACT_CATEGORIES.has(rawCategory) ? rawCategory : '';
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();

    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ error: 'Please enter your full name (2–100 characters).' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!category) {
      return res.status(400).json({ error: 'Please choose a valid inquiry category.' });
    }
    if (subject.length < 2 || subject.length > 160) {
      return res.status(400).json({ error: 'Please enter a clear subject (2–160 characters).' });
    }
    if (message.length < 10 || message.length > 4000) {
      return res.status(400).json({ error: 'Please enter a message of at least 10 characters (max 4,000).' });
    }

    const id = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO contact_inquiries (id, name, email, category, subject, message, status, admin_notes, responded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', '', '', ?, ?)`
    ).run(id, fullName, email, category, subject, message, now, now);

    const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin' AND status = 'active' LIMIT 5`).all() as Array<{
      id: string;
    }>;
    for (const admin of admins) {
      notifyWithRealtime(
        admin.id,
        'support',
        `New Contact Enquiry (${category})`,
        `${fullName} (${email}): ${subject}`,
        '/admin'
      );
    }

    res.status(201).json({
      ok: true,
      id,
      reference: id,
      emailNotificationSent: false,
      message:
        'Thank you for contacting Braincode (BrainCode Technology Limited). Your enquiry has been recorded in our support queue for review.',
    });
  });

  // Course outline is ALWAYS viewable without payment
  router.get('/courses/:slug', (req: AuthenticatedRequest, res) => {
    const course = db
      .prepare(
        `SELECT c.*, cat.name as category_name, tech.name as technology_name, tech.slug as technology_slug,
                u.full_name as instructor_name, u.username as instructor_username, u.bio as instructor_bio, u.avatar_url as instructor_avatar
         FROM courses c
         JOIN categories cat ON cat.id = c.category_id
         JOIN technologies tech ON tech.id = c.technology_id
         JOIN users u ON u.id = c.instructor_id
         WHERE c.slug = ?`
      )
      .get(req.params.slug) as Record<string, unknown> | undefined;

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'instructor';
    if (!isPrivileged && (Number(course.is_published) !== 1 || String(course.status) !== 'published')) {
      return res.status(404).json({ error: 'Course is currently in development and not yet published.' });
    }

    const modules = db
      .prepare(`SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order ASC`)
      .all(String(course.id)) as Array<Record<string, unknown>>;

    const topics = db
      .prepare(`SELECT * FROM course_topics WHERE course_id = ? ORDER BY sort_order ASC`)
      .all(String(course.id)) as Array<Record<string, unknown>>;

    // Only expose published lesson outlines to learners (admin/instructors can inspect drafts)
    const lessons = db
      .prepare(
        isPrivileged
          ? `SELECT id, module_id, topic_id, course_id, title, slug, topic_name, summary, access_tier, duration_minutes, status, workflow_status, sort_order
             FROM lessons WHERE course_id = ? AND status != 'archived' ORDER BY sort_order ASC`
          : `SELECT id, module_id, topic_id, course_id, title, slug, topic_name, summary, access_tier, duration_minutes, status, workflow_status, sort_order
             FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order ASC`
      )
      .all(String(course.id)) as Array<Record<string, unknown>>;

    const progressMap = new Map<string, { completed: boolean; bookmarked: boolean; progress_status: string }>();
    let enrolled = false;
    let lastLessonId = '';
    const solvedExerciseSet = new Set<string>();
    const assignmentSubMap = new Map<string, Record<string, unknown>>();
    const templateProgMap = new Map<string, { checkedItems: string[]; notes: string; updatedAt: string }>();
    if (req.user) {
      const enrRow = db
        .prepare(`SELECT last_lesson_id FROM enrollments WHERE user_id = ? AND course_id = ?`)
        .get(req.user.id, String(course.id)) as { last_lesson_id?: string } | undefined;
      enrolled = Boolean(enrRow);
      lastLessonId = String(enrRow?.last_lesson_id || '');
      const lp = db
        .prepare(`SELECT lesson_id, completed, bookmarked, status FROM lesson_progress WHERE user_id = ? AND course_id = ?`)
        .all(req.user.id, String(course.id)) as Array<{ lesson_id: string; completed: number; bookmarked: number; status?: string }>;
      lp.forEach((r) =>
        progressMap.set(r.lesson_id, {
          completed: Boolean(r.completed),
          bookmarked: Boolean(r.bookmarked),
          progress_status: r.completed ? 'completed' : r.status === 'in_progress' ? 'in_progress' : 'not_started',
        })
      );

      const solved = db
        .prepare(`SELECT DISTINCT exercise_id FROM exercise_submissions WHERE user_id = ? AND is_correct = 1`)
        .all(req.user.id) as Array<{ exercise_id: string }>;
      solved.forEach((s) => solvedExerciseSet.add(s.exercise_id));

      const asubs = db
        .prepare(`SELECT * FROM assignment_submissions WHERE user_id = ? ORDER BY updated_at DESC`)
        .all(req.user.id) as Array<Record<string, unknown>>;
      asubs.forEach((s) => {
        const aid = String(s.assignment_id);
        if (!assignmentSubMap.has(aid)) assignmentSubMap.set(aid, s);
      });

      const pRows = db
        .prepare(`SELECT template_id, checked_items_json, notes, updated_at FROM project_template_progress WHERE user_id = ?`)
        .all(req.user.id) as Array<{ template_id: string; checked_items_json: string; notes: string; updated_at: string }>;
      for (const r of pRows) {
        templateProgMap.set(r.template_id, {
          checkedItems: parseJsonSafe<string[]>(r.checked_items_json, []),
          notes: r.notes || '',
          updatedAt: r.updated_at,
        });
      }
    }

    const assessments = db
      .prepare(`SELECT id, title, type, mode, time_limit_sec, xp_reward, passing_score_pct, max_attempts FROM assessments WHERE course_id = ?`)
      .all(String(course.id));

    const exercises = (
      db
        .prepare(
          `SELECT id, module_id, lesson_id, title, exercise_type, difficulty, xp_reward, sort_order
           FROM exercises WHERE course_id = ? ORDER BY sort_order ASC`
        )
        .all(String(course.id)) as Array<Record<string, unknown>>
    ).map((ex) => ({
      ...ex,
      solved: solvedExerciseSet.has(String(ex.id)),
    }));

    const assignments = (
      db.prepare(`SELECT * FROM assignments WHERE course_id = ? ORDER BY created_at ASC`).all(String(course.id)) as Array<
        Record<string, unknown>
      >
    ).map((a) => ({
      ...a,
      requirements: parseJsonSafe<string[]>(String(a.requirements_json || '[]'), []),
      starter_files: parseJsonSafe<Record<string, string>>(String(a.starter_files_json || '{}'), {}),
      rubric: parseJsonSafe<Array<{ criterion: string; points: number }>>(String(a.rubric_json || '[]'), []),
      mySubmission: assignmentSubMap.get(String(a.id)) || null,
    }));

    const projectTemplates = (
      db.prepare(`SELECT * FROM project_templates WHERE course_id = ? ORDER BY created_at ASC`).all(String(course.id)) as Array<
        Record<string, unknown>
      >
    ).map((pt) => formatProjectTemplateRow(pt, templateProgMap));

    const reviews = db
      .prepare(
        `SELECT r.*, u.full_name, u.username FROM course_reviews r JOIN users u ON u.id = r.user_id WHERE r.course_id = ? ORDER BY r.updated_at DESC LIMIT 20`
      )
      .all(String(course.id));

    const certificateEligibility = req.user ? checkCourseCertificateEligibility(String(course.id), req.user.id) : null;
    const competencySummary = getCourseCompetencySummary(String(course.id), req.user?.id);
    const courseRecommendations = req.user
      ? getLearnerRecommendations({
          userId: req.user.id,
          canAccessPremium: Boolean(req.entitlement?.limits.canAccessPremiumCourses || isPrivileged),
          courseId: String(course.id),
        })
      : [];

    res.json({
      course: {
        ...course,
        objectives: parseJsonSafe<string[]>(String(course.objectives_json || '[]'), []),
        learning_outcomes: parseJsonSafe<string[]>(String(course.learning_outcomes_json || '[]'), []),
        prerequisites: parseJsonSafe<string[]>(String(course.prerequisites_json || '[]'), []),
        enrolled,
        last_lesson_id: lastLessonId,
      },
      modules: modules.map((m) => ({
        ...m,
        prerequisites: parseJsonSafe<string[]>(String(m.prerequisites_json || '[]'), []),
        topics: topics.filter((tp) => tp.module_id === m.id),
        lessons: lessons
          .filter((l) => l.module_id === m.id)
          .map((l) => ({
            ...l,
            completed: progressMap.get(String(l.id))?.completed || false,
            bookmarked: progressMap.get(String(l.id))?.bookmarked || false,
            progress_status: progressMap.get(String(l.id))?.progress_status || 'not_started',
          })),
      })),
      assessments,
      exercises,
      assignments,
      projectTemplates,
      reviews,
      certificateEligibility,
      competencySummary,
      recommendations: courseRecommendations,
    });
  });

  router.post('/courses/:id/enroll', requireAuth, (req: AuthenticatedRequest, res) => {
    const course = db
      .prepare(`SELECT id, title, is_published, status FROM courses WHERE id = ?`)
      .get(req.params.id) as { id: string; title: string; is_published: number; status: string } | undefined;
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (!isPrivileged && (Number(course.is_published) !== 1 || String(course.status) !== 'published')) {
      return res.status(403).json({
        code: 'COURSE_NOT_PUBLISHED',
        error: 'This course is currently in development or review and cannot be enrolled in yet.',
      });
    }

    const firstLesson = db
      .prepare(`SELECT id FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order ASC LIMIT 1`)
      .get(course.id) as { id: string } | undefined;

    db.prepare(
      `INSERT OR IGNORE INTO enrollments (user_id, course_id, enrolled_at, last_lesson_id) VALUES (?, ?, ?, ?)`
    ).run(req.user!.id, course.id, new Date().toISOString(), firstLesson?.id || '');

    return res.json({ ok: true, enrolled: true });
  });

  router.get('/lessons/:id', (req: AuthenticatedRequest, res) => {
    const lesson = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(req.params.id) as
      | (Record<string, unknown> & { id: string; course_id: string; access_tier: string; status?: string })
      | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const isPrivilegedRole = req.user?.role === 'admin' || req.user?.role === 'instructor';
    if (!isPrivilegedRole && String(lesson.status || 'published') !== 'published') {
      return res.status(403).json({
        code: 'LESSON_NOT_PUBLISHED',
        error: 'This lesson is currently in review or draft and is not yet available to learners.',
      });
    }

    if (lesson.access_tier === 'premium') {
      if (!req.user) {
        return res.status(401).json({
          code: 'AUTH_REQUIRED',
          error: 'Sign in and subscribe to Pro Learner to unlock this premium lesson.',
        });
      }
      if (!req.entitlement?.limits.canAccessPremiumCourses) {
        return res.status(403).json({
          code: 'PREMIUM_REQUIRED',
          error: 'This lesson requires an active Pro Learner or Team & Studio subscription.',
          lessonSummary: { id: lesson.id, title: lesson.title, summary: lesson.summary, access_tier: lesson.access_tier },
        });
      }
    }

    let progress: { completed: boolean; bookmarked: boolean; status: 'not_started' | 'in_progress' | 'completed' } = {
      completed: false,
      bookmarked: false,
      status: 'not_started',
    };
    let noteText = '';
    const subMap = new Map<string, Array<Record<string, unknown>>>();
    if (req.user) {
      const lp = db
        .prepare(`SELECT completed, bookmarked, status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?`)
        .get(req.user.id, lesson.id) as { completed: number; bookmarked: number; status?: string } | undefined;
      if (lp) {
        progress = {
          completed: Boolean(lp.completed),
          bookmarked: Boolean(lp.bookmarked),
          status: lp.completed ? 'completed' : lp.status === 'in_progress' ? 'in_progress' : 'not_started',
        };
      }

      const noteRow = db
        .prepare(`SELECT note_text FROM learning_notes WHERE user_id = ? AND lesson_id = ?`)
        .get(req.user.id, lesson.id) as { note_text: string } | undefined;
      noteText = noteRow?.note_text || '';

      const subs = db
        .prepare(`SELECT * FROM exercise_submissions WHERE user_id = ? ORDER BY attempt_number DESC`)
        .all(req.user.id) as Array<Record<string, unknown>>;
      for (const s of subs) {
        const eid = String(s.exercise_id);
        if (!subMap.has(eid)) subMap.set(eid, []);
        subMap.get(eid)!.push(s);
      }
    }

    const blocks = (
      db.prepare(`SELECT * FROM lesson_content_blocks WHERE lesson_id = ? ORDER BY sort_order ASC`).all(lesson.id) as Array<
        Record<string, unknown>
      >
    ).map((b) => ({
      ...b,
      metadata: parseJsonSafe<Record<string, unknown>>(String(b.metadata_json || '{}'), {}),
    }));

    const codeExamples = db
      .prepare(`SELECT * FROM code_examples WHERE lesson_id = ? ORDER BY sort_order ASC`)
      .all(lesson.id);

    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'instructor';
    const exercises = (
      db.prepare(`SELECT * FROM exercises WHERE lesson_id = ? ORDER BY sort_order ASC`).all(lesson.id) as Array<
        Record<string, unknown>
      >
    ).map((ex) => {
      const mySubs = subMap.get(String(ex.id)) || [];
      const solved = mySubs.some((s) => Number(s.is_correct) === 1);
      return {
        id: ex.id,
        course_id: ex.course_id,
        module_id: ex.module_id,
        lesson_id: ex.lesson_id,
        technology_id: ex.technology_id,
        title: ex.title,
        exercise_type: ex.exercise_type,
        difficulty: ex.difficulty,
        prompt: ex.prompt,
        starter_code: ex.starter_code,
        options: parseJsonSafe<string[]>(String(ex.options_json || '[]'), []),
        hint_text: ex.hint_text,
        explanation: solved || isPrivileged ? ex.explanation : undefined,
        correct_answer: solved || isPrivileged ? ex.correct_answer : undefined,
        xp_reward: ex.xp_reward,
        marks: Number(ex.marks || 10),
        max_attempts: Number(ex.max_attempts || 0),
        allow_partial_credit: Boolean(ex.allow_partial_credit ?? 1),
        learning_objective: String(ex.learning_objective || ''),
        sort_order: ex.sort_order,
        solved,
        submissions: mySubs,
      };
    });

    const orderedCourseLessons = db
      .prepare(`SELECT id FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order ASC`)
      .all(lesson.course_id) as Array<{ id: string }>;
    const idx = orderedCourseLessons.findIndex((l) => l.id === lesson.id);
    const prevLessonId = idx > 0 ? orderedCourseLessons[idx - 1].id : null;
    const nextLessonId = idx >= 0 && idx < orderedCourseLessons.length - 1 ? orderedCourseLessons[idx + 1].id : null;

    const assessments = db
      .prepare(`SELECT id, title, type, mode, time_limit_sec, xp_reward, passing_score_pct, allow_partial_credit FROM assessments WHERE lesson_id = ?`)
      .all(lesson.id);

    return res.json({
      lesson: {
        ...lesson,
        prerequisites: parseJsonSafe<string[]>(String(lesson.prerequisites_json || '[]'), []),
        objectives: parseJsonSafe<string[]>(String(lesson.objectives_json || '[]'), []),
        common_mistakes: parseJsonSafe<string[]>(String(lesson.common_mistakes_json || '[]'), []),
        best_practices: parseJsonSafe<string[]>(String(lesson.best_practices_json || '[]'), []),
        further_practice: parseJsonSafe<string[]>(String(lesson.further_practice_json || '[]'), []),
      },
      blocks,
      codeExamples,
      exercises,
      noteText,
      prevLessonId,
      nextLessonId,
      progress,
      assessments,
    });
  });

  router.post('/lessons/:id/open', requireAuth, (req: AuthenticatedRequest, res) => {
    const lesson = db
      .prepare(
        `SELECT l.id, l.course_id, l.access_tier, l.status as lesson_status, c.is_published, c.status as course_status
         FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`
      )
      .get(req.params.id) as
      | {
          id: string;
          course_id: string;
          access_tier: string;
          lesson_status?: string;
          is_published?: number;
          course_status?: string;
        }
      | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (
      !isPrivileged &&
      (String(lesson.lesson_status || 'published') !== 'published' ||
        Number(lesson.is_published) !== 1 ||
        String(lesson.course_status || 'published') !== 'published')
    ) {
      return res.status(403).json({
        code: 'LESSON_NOT_PUBLISHED',
        error: 'Draft or review lessons cannot be opened by learners before publication.',
      });
    }

    if (lesson.access_tier === 'premium' && !req.entitlement?.limits.canAccessPremiumCourses) {
      return res.status(403).json({ code: 'PREMIUM_REQUIRED', error: 'Active premium subscription required.' });
    }

    db.prepare(`UPDATE enrollments SET last_lesson_id = ? WHERE user_id = ? AND course_id = ?`).run(
      lesson.id,
      req.user!.id,
      lesson.course_id
    );

    const openedAt = new Date().toISOString();
    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, bookmarked, status, last_opened_at)
       VALUES (?, ?, ?, 0, 0, 'in_progress', ?)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET
         last_opened_at = excluded.last_opened_at,
         status = CASE WHEN lesson_progress.completed = 1 THEN 'completed' ELSE 'in_progress' END`
    ).run(req.user!.id, lesson.id, lesson.course_id, openedAt);

    const lp = db
      .prepare(`SELECT completed, bookmarked, status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?`)
      .get(req.user!.id, lesson.id) as { completed: number; bookmarked: number; status?: string } | undefined;

    return res.json({
      ok: true,
      progress: {
        completed: Boolean(lp?.completed),
        bookmarked: Boolean(lp?.bookmarked),
        status: lp?.completed ? 'completed' : 'in_progress',
      },
    });
  });

  router.post('/lessons/:id/complete', requireAuth, (req: AuthenticatedRequest, res) => {
    const lesson = db
      .prepare(
        `SELECT l.id, l.course_id, l.access_tier, l.title, l.status as lesson_status, c.is_published, c.status as course_status
         FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`
      )
      .get(req.params.id) as
      | {
          id: string;
          course_id: string;
          access_tier: string;
          title: string;
          lesson_status?: string;
          is_published?: number;
          course_status?: string;
        }
      | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (
      !isPrivileged &&
      (String(lesson.lesson_status || 'published') !== 'published' ||
        Number(lesson.is_published) !== 1 ||
        String(lesson.course_status || 'published') !== 'published')
    ) {
      return res.status(403).json({
        code: 'LESSON_NOT_PUBLISHED',
        error: 'Draft or review lessons cannot be completed by learners before publication.',
      });
    }

    if (lesson.access_tier === 'premium' && !req.entitlement?.limits.canAccessPremiumCourses) {
      return res.status(403).json({ code: 'PREMIUM_REQUIRED', error: 'Active premium subscription required.' });
    }

    const existing = db
      .prepare(`SELECT completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?`)
      .get(req.user!.id, lesson.id) as { completed: number } | undefined;

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, bookmarked, status, last_opened_at, completed_at)
       VALUES (?, ?, ?, 1, 0, 'completed', ?, ?)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, status = 'completed', last_opened_at = ?, completed_at = ?`
    ).run(req.user!.id, lesson.id, lesson.course_id, now, now, now, now);

    // Prevent XP farming: only award XP the first time a lesson is completed
    let xpAwarded = 0;
    if (!existing || !existing.completed) {
      xpAwarded = 50;
      awardXpAndBadges(req.user!.id, xpAwarded);
    }

    const lessonFull = db.prepare(`SELECT objectives_json, title FROM lessons WHERE id = ?`).get(lesson.id) as
      | { objectives_json?: string; title?: string }
      | undefined;
    const lessonObjs = parseJsonSafe<string[]>(String(lessonFull?.objectives_json || '[]'), []);
    if (lessonObjs.length > 0) {
      lessonObjs.slice(0, 3).forEach((objTitle, idx) => {
        recordLearnerCompetency({
          userId: req.user!.id,
          courseId: lesson.course_id,
          objectiveKey: `lesson_${lesson.id}_obj_${idx + 1}`,
          objectiveTitle: objTitle,
          scoreDeltaPct: 80,
          evidenceType: 'lesson',
          evidenceId: lesson.id,
        });
      });
    } else {
      recordLearnerCompetency({
        userId: req.user!.id,
        courseId: lesson.course_id,
        objectiveKey: `lesson_${lesson.id}`,
        objectiveTitle: lesson.title,
        scoreDeltaPct: 80,
        evidenceType: 'lesson',
        evidenceId: lesson.id,
      });
    }

    const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as unknown as AuthUser;
    return res.json({ ok: true, xpAwarded, user: sanitizeUserPublic(updatedUser) });
  });

  router.post('/lessons/:id/bookmark', requireAuth, (req: AuthenticatedRequest, res) => {
    const lesson = db
      .prepare(
        `SELECT l.id, l.course_id, l.status as lesson_status, c.is_published, c.status as course_status
         FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = ?`
      )
      .get(req.params.id) as
      | { id: string; course_id: string; lesson_status?: string; is_published?: number; course_status?: string }
      | undefined;
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (
      !isPrivileged &&
      (String(lesson.lesson_status || 'published') !== 'published' ||
        Number(lesson.is_published) !== 1 ||
        String(lesson.course_status || 'published') !== 'published')
    ) {
      return res.status(403).json({
        code: 'LESSON_NOT_PUBLISHED',
        error: 'Draft or review lessons cannot be bookmarked before publication.',
      });
    }

    const existing = db
      .prepare(`SELECT bookmarked FROM lesson_progress WHERE user_id = ? AND lesson_id = ?`)
      .get(req.user!.id, lesson.id) as { bookmarked: number } | undefined;

    const next = existing?.bookmarked ? 0 : 1;
    db.prepare(
      `INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, bookmarked)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET bookmarked = ?`
    ).run(req.user!.id, lesson.id, lesson.course_id, next, next);

    return res.json({ ok: true, bookmarked: Boolean(next) });
  });

  // =========================================================
  // ASSESSMENTS, QUIZZES & GAMIFICATION
  // =========================================================
  router.get('/assessments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const asm = db
      .prepare(
        `SELECT a.*, c.is_published as course_is_published, c.status as course_status
         FROM assessments a JOIN courses c ON c.id = a.course_id WHERE a.id = ?`
      )
      .get(req.params.id) as
      | (Record<string, unknown> & {
          id: string;
          questions_json: string;
          randomize_questions?: number;
          course_is_published?: number;
          course_status?: string;
        })
      | undefined;
    if (!asm) return res.status(404).json({ error: 'Assessment not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (!isPrivileged && (Number(asm.course_is_published) !== 1 || String(asm.course_status) !== 'published')) {
      return res.status(403).json({
        code: 'COURSE_NOT_PUBLISHED',
        error: 'This assessment belongs to a course that is not yet published.',
      });
    }

    let questions = parseJsonSafe<Array<Record<string, unknown>>>(asm.questions_json, []).map((q) => ({
      id: q.id,
      kind: q.kind,
      prompt: q.prompt,
      options: q.options || [],
      marks: Number(q.marks || 1),
      objectiveTag: String(q.objectiveTag || ''),
      allowPartialCredit: q.allowPartialCredit !== undefined ? Boolean(q.allowPartialCredit) : Boolean(asm.allow_partial_credit),
    }));
    if (Number(asm.randomize_questions || 0) === 1) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    const attempts = db
      .prepare(`SELECT id, score, max_score, percentage, passed, status, instructor_notes, created_at FROM assessment_attempts WHERE assessment_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 10`)
      .all(asm.id, req.user!.id);

    res.json({
      assessment: {
        id: asm.id,
        course_id: asm.course_id,
        lesson_id: asm.lesson_id,
        title: asm.title,
        type: asm.type,
        mode: asm.mode,
        time_limit_sec: asm.time_limit_sec,
        xp_reward: asm.xp_reward,
        passing_score_pct: Number(asm.passing_score_pct || 70),
        max_attempts: Number(asm.max_attempts || 0),
        allow_partial_credit: Boolean(asm.allow_partial_credit),
        objective_tags: parseJsonSafe<string[]>(String(asm.objective_tags_json || '[]'), []),
        grading_policy: parseJsonSafe<Record<string, unknown>>(String(asm.grading_policy_json || '{}'), {}),
        questions,
      },
      attempts,
    });
  });

  router.post('/assessments/:id/submit', requireAuth, (req: AuthenticatedRequest, res) => {
    const asm = db
      .prepare(
        `SELECT a.*, c.is_published as course_is_published, c.status as course_status
         FROM assessments a JOIN courses c ON c.id = a.course_id WHERE a.id = ?`
      )
      .get(req.params.id) as
      | {
          id: string;
          course_id: string;
          title: string;
          xp_reward: number;
          questions_json: string;
          passing_score_pct?: number;
          max_attempts?: number;
          allow_partial_credit?: number;
          course_is_published?: number;
          course_status?: string;
        }
      | undefined;
    if (!asm) return res.status(404).json({ error: 'Assessment not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (!isPrivileged && (Number(asm.course_is_published) !== 1 || String(asm.course_status) !== 'published')) {
      return res.status(403).json({
        code: 'COURSE_NOT_PUBLISHED',
        error: 'Assessments for unpublished courses cannot be submitted.',
      });
    }

    const attemptCount = (
      db
        .prepare(`SELECT COUNT(*) as c FROM assessment_attempts WHERE assessment_id = ? AND user_id = ?`)
        .get(asm.id, req.user!.id) as { c: number }
    ).c;
    if (Number(asm.max_attempts || 0) > 0 && attemptCount >= Number(asm.max_attempts)) {
      return res.status(403).json({ error: `Maximum attempt limit (${asm.max_attempts}) reached for this assessment.` });
    }

    const submitted = (req.body?.answers || {}) as Record<string, unknown>;
    const questions = parseJsonSafe<AssessmentQuestionItem[]>(asm.questions_json, []);
    const passingThreshold = Number(asm.passing_score_pct || 70);
    const graded = gradeAssessmentSubmission({
      questions,
      submittedAnswers: submitted,
      passingScorePct: passingThreshold,
      allowPartialCredit: Boolean(asm.allow_partial_credit ?? 1),
    });

    const priorBest = db
      .prepare(`SELECT MAX(score) as best FROM assessment_attempts WHERE assessment_id = ? AND user_id = ?`)
      .get(asm.id, req.user!.id) as { best: number | null };

    const attemptId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(
      `INSERT INTO assessment_attempts (id, assessment_id, user_id, score, max_score, percentage, passed, answers_json, feedback_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      attemptId,
      asm.id,
      req.user!.id,
      graded.score,
      graded.maxScore,
      graded.percentage,
      graded.passed ? 1 : 0,
      JSON.stringify(submitted),
      JSON.stringify(graded.feedback),
      graded.status,
      new Date().toISOString()
    );

    for (const objStat of graded.objectivePerformance) {
      recordLearnerCompetency({
        userId: req.user!.id,
        courseId: asm.course_id,
        objectiveKey: objStat.objective,
        objectiveTitle: objStat.objective,
        scoreDeltaPct: objStat.percentage,
        evidenceType: 'assessment',
        evidenceId: asm.id,
      });
    }

    let xpAwarded = 0;
    if (priorBest.best === null && graded.score > 0) {
      xpAwarded = Math.round((graded.score / graded.maxScore) * asm.xp_reward);
      awardXpAndBadges(req.user!.id, xpAwarded);
    }

    const recommendations = !graded.passed
      ? getLearnerRecommendations({
          userId: req.user!.id,
          canAccessPremium: Boolean(req.entitlement?.limits.canAccessPremiumCourses || isPrivileged),
          courseId: asm.course_id,
        }).slice(0, 3)
      : [];

    const updatedUser = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user!.id) as unknown as AuthUser;
    res.json({
      attemptId,
      score: graded.score,
      maxScore: graded.maxScore,
      percentage: graded.percentage,
      passingScorePct: passingThreshold,
      passed: graded.passed,
      status: graded.status,
      feedback: graded.feedback,
      objectivePerformance: graded.objectivePerformance,
      recommendations,
      xpAwarded,
      user: sanitizeUserPublic(updatedUser),
    });
  });

  // =========================================================
  // PERSONAL & COLLABORATIVE CODING WORKSPACES
  // =========================================================
  router.get('/workspaces', requireAuth, (req: AuthenticatedRequest, res) => {
    const owned = db
      .prepare(`SELECT * FROM workspaces WHERE owner_id = ? ORDER BY updated_at DESC`)
      .all(req.user!.id) as Array<Record<string, unknown>>;

    res.json({
      workspaces: owned.map((w) => ({
        ...w,
        files: parseJsonSafe<Record<string, string>>(String(w.files_json || '{}'), {}),
      })),
      maxWorkspaces: req.entitlement?.limits.maxWorkspaces || 5,
    });
  });

  router.post('/workspaces', requireAuth, (req: AuthenticatedRequest, res) => {
    const count = (
      db.prepare(`SELECT COUNT(*) as c FROM workspaces WHERE owner_id = ?`).get(req.user!.id) as { c: number }
    ).c;
    const maxAllowed = req.entitlement?.limits.maxWorkspaces || 5;
    if (count >= maxAllowed) {
      return res.status(403).json({
        code: 'PREMIUM_REQUIRED',
        error: `Workspace limit (${maxAllowed}) reached on your current plan.`,
      });
    }

    const name = String(req.body?.name || 'Untitled Workspace').trim().slice(0, 80);
    const language = String(req.body?.language || 'html').trim();
    const lessonId = String(req.body?.lessonId || '');
    const files =
      req.body?.files && typeof req.body.files === 'object'
        ? req.body.files
        : {
            'index.html': `<!DOCTYPE html>\n<html>\n<head>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <main class="card">\n    <h1>${name}</h1>\n    <p>Edit code on the left and run it safely in the sandboxed preview.</p>\n    <button id="demoBtn">Run Interaction</button>\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>`,
            'styles.css': `body { font-family: system-ui, sans-serif; background: #0b1220; color: #f8fafc; padding: 24px; }\n.card { background: #131d31; border: 1px solid #243656; border-radius: 12px; padding: 20px; }\nbutton { background: #0A84FF; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }`,
            'app.js': `document.getElementById('demoBtn')?.addEventListener('click', () => {\n  console.log('Button clicked at', new Date().toLocaleTimeString());\n});`,
          };

    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO workspaces (id, owner_id, name, description, language, files_json, lesson_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.user!.id, name, String(req.body?.description || ''), language, JSON.stringify(files), lessonId, now, now);

    res.status(201).json({
      workspace: { id, owner_id: req.user!.id, name, language, files, lesson_id: lessonId, created_at: now, updated_at: now },
    });
  });

  router.put('/workspaces/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const wsRow = db.prepare(`SELECT * FROM workspaces WHERE id = ?`).get(req.params.id) as
      | { id: string; owner_id: string }
      | undefined;
    if (!wsRow) return res.status(404).json({ error: 'Workspace not found.' });
    if (wsRow.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the workspace owner can update this workspace directly.' });
    }

    const name = String(req.body?.name || '').trim().slice(0, 80);
    const files = req.body?.files;
    const now = new Date().toISOString();

    if (name) {
      db.prepare(`UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?`).run(name, now, wsRow.id);
    }
    if (files && typeof files === 'object') {
      db.prepare(`UPDATE workspaces SET files_json = ?, updated_at = ? WHERE id = ?`).run(
        JSON.stringify(files),
        now,
        wsRow.id
      );
    }
    res.json({ ok: true, updated_at: now });
  });

  router.post('/workspaces/:id/duplicate', requireAuth, (req: AuthenticatedRequest, res) => {
    const src = db.prepare(`SELECT * FROM workspaces WHERE id = ? AND owner_id = ?`).get(req.params.id, req.user!.id) as
      | { name: string; description: string; language: string; files_json: string }
      | undefined;
    if (!src) return res.status(404).json({ error: 'Workspace not found.' });

    const id = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const copyName = `${src.name} (Copy)`;
    db.prepare(
      `INSERT INTO workspaces (id, owner_id, name, description, language, files_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.user!.id, copyName, src.description, src.language, src.files_json, now, now);

    res.status(201).json({
      workspace: {
        id,
        owner_id: req.user!.id,
        name: copyName,
        language: src.language,
        files: parseJsonSafe(src.files_json, {}),
        updated_at: now,
      },
    });
  });

  router.delete('/workspaces/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const result = db.prepare(`DELETE FROM workspaces WHERE id = ? AND owner_id = ?`).run(req.params.id, req.user!.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Workspace not found.' });
    res.json({ ok: true });
  });

  // Collaborative Coding Sessions (Backend Entitlement Enforced)
  router.get('/collab/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
    const sessions = db
      .prepare(
        `SELECT cs.*, w.name as workspace_name, w.language, u.full_name as owner_name, u.username as owner_username,
                cp.role as my_role,
                (SELECT COUNT(*) FROM collab_participants cp2 WHERE cp2.session_id = cs.id) as participant_count
         FROM collab_sessions cs
         JOIN workspaces w ON w.id = cs.workspace_id
         JOIN users u ON u.id = cs.owner_id
         LEFT JOIN collab_participants cp ON cp.session_id = cs.id AND cp.user_id = ?
         WHERE cs.owner_id = ? OR cp.user_id = ?
         ORDER BY cs.created_at DESC`
      )
      .all(req.user!.id, req.user!.id, req.user!.id);
    res.json({ sessions, entitlement: req.entitlement });
  });

  router.post('/collab/sessions', requireAuth, (req: AuthenticatedRequest, res) => {
    if (!req.entitlement?.limits.canUseCollabWorkspace) {
      return res.status(403).json({
        code: 'PREMIUM_REQUIRED',
        error: 'Creating live collaborative coding sessions requires an active Pro Learner or Team & Studio subscription.',
      });
    }

    const workspaceId = String(req.body?.workspaceId || '');
    const title = String(req.body?.title || 'Live Pair Session').trim().slice(0, 80);
    const wsRow = db
      .prepare(`SELECT id FROM workspaces WHERE id = ? AND owner_id = ?`)
      .get(workspaceId, req.user!.id);
    if (!wsRow) {
      return res.status(404).json({ error: 'Select one of your owned workspaces to host a session.' });
    }

    const id = `col_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const inviteCode = `BC-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;
    const maxParticipants = req.entitlement.limits.maxCollabParticipants || 8;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO collab_sessions (id, workspace_id, owner_id, title, invite_code, max_participants, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
    ).run(id, workspaceId, req.user!.id, title, inviteCode, maxParticipants, now);

    db.prepare(
      `INSERT INTO collab_participants (session_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)`
    ).run(id, req.user!.id, now);

    res.status(201).json({ id, inviteCode, maxParticipants, title });
  });

  router.post('/collab/sessions/join', requireAuth, (req: AuthenticatedRequest, res) => {
    const inviteCode = String(req.body?.inviteCode || '').trim().toUpperCase();
    const session = db
      .prepare(`SELECT * FROM collab_sessions WHERE invite_code = ? AND status = 'active'`)
      .get(inviteCode) as
      | { id: string; max_participants: number; title: string; owner_id: string }
      | undefined;

    if (!session) {
      return res.status(404).json({ error: 'Active collaboration session with that invite code was not found.' });
    }

    const existing = db
      .prepare(`SELECT role FROM collab_participants WHERE session_id = ? AND user_id = ?`)
      .get(session.id, req.user!.id);

    if (!existing) {
      const count = (
        db.prepare(`SELECT COUNT(*) as c FROM collab_participants WHERE session_id = ?`).get(session.id) as { c: number }
      ).c;
      if (count >= session.max_participants) {
        return res.status(403).json({
          error: `Session capacity (${session.max_participants} participants) has been reached.`,
        });
      }
      db.prepare(
        `INSERT INTO collab_participants (session_id, user_id, role, joined_at) VALUES (?, ?, 'editor', ?)`
      ).run(session.id, req.user!.id, new Date().toISOString());

      notifyWithRealtime(
        session.owner_id,
        'collab',
        'Collaborator Joined Session',
        `${req.user!.full_name} joined "${session.title}".`,
        '/collab'
      );
    }

    res.json({ ok: true, sessionId: session.id });
  });

  router.get('/collab/sessions/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = db
      .prepare(
        `SELECT cs.*, w.name as workspace_name, w.language, w.files_json
         FROM collab_sessions cs JOIN workspaces w ON w.id = cs.workspace_id
         WHERE cs.id = ?`
      )
      .get(req.params.id) as (Record<string, unknown> & { id: string; owner_id: string; files_json: string }) | undefined;

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    const participant = db
      .prepare(`SELECT role FROM collab_participants WHERE session_id = ? AND user_id = ?`)
      .get(session.id, req.user!.id) as { role: string } | undefined;

    if (!participant && session.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'You do not have access to this session.' });
    }

    const participants = db
      .prepare(
        `SELECT cp.user_id, cp.role, cp.joined_at, u.full_name, u.username
         FROM collab_participants cp JOIN users u ON u.id = cp.user_id
         WHERE cp.session_id = ?`
      )
      .all(session.id);

    res.json({
      session: {
        ...session,
        files: parseJsonSafe<Record<string, string>>(session.files_json, {}),
      },
      myRole: session.owner_id === req.user!.id ? 'owner' : participant?.role || 'viewer',
      participants,
    });
  });

  router.patch('/collab/sessions/:id/participants/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = db
      .prepare(`SELECT owner_id FROM collab_sessions WHERE id = ?`)
      .get(req.params.id) as { owner_id: string } | undefined;
    if (!session || session.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the session owner can manage participant roles.' });
    }
    const role = String(req.body?.role || '');
    if (req.body?.remove) {
      db.prepare(`DELETE FROM collab_participants WHERE session_id = ? AND user_id = ? AND user_id != ?`).run(
        req.params.id,
        req.params.userId,
        session.owner_id
      );
      return res.json({ ok: true });
    }
    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be editor or viewer.' });
    }
    db.prepare(`UPDATE collab_participants SET role = ? WHERE session_id = ? AND user_id = ?`).run(
      role,
      req.params.id,
      req.params.userId
    );
    res.json({ ok: true });
  });

  router.post('/collab/sessions/:id/save-project', requireAuth, (req: AuthenticatedRequest, res) => {
    const session = db
      .prepare(`SELECT cs.*, w.files_json FROM collab_sessions cs JOIN workspaces w ON w.id = cs.workspace_id WHERE cs.id = ?`)
      .get(req.params.id) as { id: string; workspace_id: string; owner_id: string; title: string } | undefined;
    if (!session || session.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the session owner can publish shared output as a project.' });
    }

    const contributors = db
      .prepare(`SELECT u.username FROM collab_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.session_id = ?`)
      .all(session.id)
      .map((r) => (r as { username: string }).username);

    const projectId = `prj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO projects (id, owner_id, workspace_id, title, description, tags_json, visibility, contributors_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '["Collaborative"]', 'private', ?, ?, ?)`
    ).run(
      projectId,
      req.user!.id,
      session.workspace_id,
      String(req.body?.title || session.title),
      String(req.body?.description || 'Saved from a collaborative coding session on Braincode.'),
      JSON.stringify(contributors),
      now,
      now
    );

    res.status(201).json({ ok: true, projectId, contributors });
  });

  router.post('/collab/sessions/:id/close', requireAuth, (req: AuthenticatedRequest, res) => {
    const result = db
      .prepare(`UPDATE collab_sessions SET status = 'closed' WHERE id = ? AND owner_id = ?`)
      .run(req.params.id, req.user!.id);
    if (result.changes === 0) return res.status(403).json({ error: 'Only the owner can close this session.' });
    res.json({ ok: true });
  });

  // =========================================================
  // PROJECTS & PORTFOLIO
  // =========================================================
  router.get('/projects', (req: AuthenticatedRequest, res) => {
    const scope = String(req.query.scope || 'mine');
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = 12;
    const offset = (page - 1) * limit;

    let rows: Array<Record<string, unknown>> = [];
    if (scope === 'mine' && req.user) {
      rows = db
        .prepare(
          `SELECT p.*, u.full_name as owner_name, u.username as owner_username
           FROM projects p JOIN users u ON u.id = p.owner_id
           WHERE p.owner_id = ? ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`
        )
        .all(req.user.id, limit, offset) as Array<Record<string, unknown>>;
    } else {
      rows = db
        .prepare(
          `SELECT p.*, u.full_name as owner_name, u.username as owner_username
           FROM projects p JOIN users u ON u.id = p.owner_id
           WHERE p.visibility = 'public' ORDER BY p.updated_at DESC LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as Array<Record<string, unknown>>;
    }

    res.json({
      projects: rows.map((p) => ({
        ...p,
        tags: parseJsonSafe<string[]>(String(p.tags_json || '[]'), []),
        screenshots: parseJsonSafe<string[]>(String(p.screenshots_json || '[]'), []),
        contributors: parseJsonSafe<string[]>(String(p.contributors_json || '[]'), []),
      })),
      page,
    });
  });

  router.post('/projects', requireAuth, (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    if (title.length < 3 || description.length < 10) {
      return res.status(400).json({ error: 'Project title (min 3 chars) and description (min 10 chars) are required.' });
    }
    const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
    const tags = Array.isArray(req.body?.tags) ? req.body.tags.slice(0, 8) : [];
    const screenshots = Array.isArray(req.body?.screenshots) ? req.body.screenshots.slice(0, 6) : [];
    const repoUrl = String(req.body?.repoUrl || '').trim();
    const liveUrl = String(req.body?.liveUrl || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    if (!isValidExternalHttpUrl(repoUrl) || !isValidExternalHttpUrl(liveUrl) || !isValidAssetOrHttpUrl(imageUrl)) {
      return res.status(400).json({ error: 'Project repository, live, and image URLs must use http://, https://, or a safe relative path.' });
    }
    const id = `prj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO projects (id, owner_id, workspace_id, title, description, tags_json, repo_url, live_url, image_url, screenshots_json, visibility, contributors_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      req.user!.id,
      String(req.body?.workspaceId || ''),
      title,
      description,
      JSON.stringify(tags),
      repoUrl,
      liveUrl,
      imageUrl,
      JSON.stringify(screenshots),
      visibility,
      JSON.stringify([req.user!.username]),
      now,
      now
    );

    res.status(201).json({ ok: true, id });
  });

  router.put('/projects/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT owner_id FROM projects WHERE id = ?`).get(req.params.id) as
      | { owner_id: string }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Project not found.' });
    if (existing.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'You can only edit your own projects.' });
    }

    const repoUrl = String(req.body?.repoUrl || '').trim();
    const liveUrl = String(req.body?.liveUrl || '').trim();
    const imageUrl = String(req.body?.imageUrl || '').trim();
    if (!isValidExternalHttpUrl(repoUrl) || !isValidExternalHttpUrl(liveUrl) || !isValidAssetOrHttpUrl(imageUrl)) {
      return res.status(400).json({ error: 'Project repository, live, and image URLs must use http://, https://, or a safe relative path.' });
    }

    const visibility = req.body?.visibility === 'public' ? 'public' : 'private';
    db.prepare(
      `UPDATE projects SET title = ?, description = ?, tags_json = ?, repo_url = ?, live_url = ?, image_url = ?, visibility = ?, updated_at = ? WHERE id = ?`
    ).run(
      String(req.body?.title || '').trim(),
      String(req.body?.description || '').trim(),
      JSON.stringify(Array.isArray(req.body?.tags) ? req.body.tags : []),
      repoUrl,
      liveUrl,
      imageUrl,
      visibility,
      new Date().toISOString(),
      req.params.id
    );
    res.json({ ok: true });
  });

  router.delete('/projects/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const result = db.prepare(`DELETE FROM projects WHERE id = ? AND owner_id = ?`).run(req.params.id, req.user!.id);
    if (result.changes === 0) return res.status(403).json({ error: 'Project not found or unauthorized.' });
    res.json({ ok: true });
  });

  // =========================================================
  // COMMUNITIES & MODERATION
  // =========================================================
  router.get('/communities', (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const rows = db
      .prepare(
        `SELECT c.*, u.full_name as owner_name, u.username as owner_username,
                (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id = c.id AND cm.status = 'active') as member_count,
                (SELECT COUNT(*) FROM community_posts cp WHERE cp.community_id = c.id AND cp.status = 'active') as post_count
         FROM communities c
         JOIN users u ON u.id = c.owner_id
         WHERE (? = '' OR c.category = ?)
           AND (? = '' OR LOWER(c.name) LIKE ? OR LOWER(c.description) LIKE ?)
         ORDER BY member_count DESC, c.created_at DESC`
      )
      .all(category, category, q, `%${q}%`, `%${q}%`) as Array<Record<string, unknown>>;

    const memberships = new Map<string, { role: string; status: string }>();
    if (req.user) {
      const mRows = db
        .prepare(`SELECT community_id, role, status FROM community_members WHERE user_id = ?`)
        .all(req.user.id) as Array<{ community_id: string; role: string; status: string }>;
      mRows.forEach((m) => memberships.set(m.community_id, { role: m.role, status: m.status }));
    }

    res.json({
      communities: rows.map((c) => ({
        ...c,
        rules: parseJsonSafe<string[]>(String(c.rules_json || '[]'), []),
        myMembership: memberships.get(String(c.id)) || null,
      })),
    });
  });

  // STRICT BACKEND ENTITLEMENT CHECK: Creating a community requires active premium plan
  router.post('/communities', requireAuth, (req: AuthenticatedRequest, res) => {
    if (!req.entitlement?.limits.canCreateCommunity) {
      return res.status(403).json({
        code: 'PREMIUM_REQUIRED',
        error: 'Creating a new developer community requires an active Pro Learner or Team & Studio subscription.',
      });
    }

    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const category = String(req.body?.category || 'Full-Stack Engineering').trim();
    const privacy = ['public', 'private', 'approval'].includes(String(req.body?.privacy))
      ? String(req.body.privacy)
      : 'public';
    const rules = Array.isArray(req.body?.rules) ? req.body.rules.filter(Boolean).slice(0, 10) : [];

    if (name.length < 3 || description.length < 10) {
      return res.status(400).json({ error: 'Community name (min 3 chars) and description (min 10 chars) are required.' });
    }

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'community';
    let slug = slugBase;
    let i = 1;
    while (db.prepare(`SELECT 1 FROM communities WHERE slug = ?`).get(slug)) {
      slug = `${slugBase}-${i++}`;
    }

    const id = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO communities (id, name, slug, description, category, privacy, rules_json, owner_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, slug, description, category, privacy, JSON.stringify(rules), req.user!.id, now);

    db.prepare(
      `INSERT INTO community_members (community_id, user_id, role, status, joined_at) VALUES (?, ?, 'owner', 'active', ?)`
    ).run(id, req.user!.id, now);

    res.status(201).json({ ok: true, id, slug });
  });

  router.post('/communities/:id/join', requireAuth, (req: AuthenticatedRequest, res) => {
    const comm = db.prepare(`SELECT id, name, privacy, owner_id FROM communities WHERE id = ?`).get(req.params.id) as
      | { id: string; name: string; privacy: string; owner_id: string }
      | undefined;
    if (!comm) return res.status(404).json({ error: 'Community not found.' });

    const existing = db
      .prepare(`SELECT status FROM community_members WHERE community_id = ? AND user_id = ?`)
      .get(comm.id, req.user!.id) as { status: string } | undefined;
    if (existing?.status === 'banned') {
      return res.status(403).json({ error: 'You cannot join this community.' });
    }
    if (existing) {
      return res.json({ ok: true, status: existing.status });
    }

    const status = comm.privacy === 'public' ? 'active' : 'pending';
    db.prepare(
      `INSERT INTO community_members (community_id, user_id, role, status, joined_at) VALUES (?, ?, 'member', ?, ?)`
    ).run(comm.id, req.user!.id, status, new Date().toISOString());

    if (status === 'pending') {
      notifyWithRealtime(
        comm.owner_id,
        'community',
        'Community Membership Request',
        `${req.user!.full_name} requested to join ${comm.name}.`,
        '/communities'
      );
    }

    res.json({ ok: true, status });
  });

  router.post('/communities/:id/leave', requireAuth, (req: AuthenticatedRequest, res) => {
    const comm = db.prepare(`SELECT owner_id FROM communities WHERE id = ?`).get(req.params.id) as
      | { owner_id: string }
      | undefined;
    if (comm?.owner_id === req.user!.id) {
      return res.status(400).json({ error: 'Community owners cannot leave without transferring ownership.' });
    }
    db.prepare(`DELETE FROM community_members WHERE community_id = ? AND user_id = ?`).run(req.params.id, req.user!.id);
    res.json({ ok: true });
  });

  router.get('/communities/:id', (req: AuthenticatedRequest, res) => {
    const comm = db.prepare(`SELECT * FROM communities WHERE id = ?`).get(req.params.id) as
      | (Record<string, unknown> & { id: string; privacy: string })
      | undefined;
    if (!comm) return res.status(404).json({ error: 'Community not found.' });

    const membership = req.user
      ? (db
          .prepare(`SELECT role, status FROM community_members WHERE community_id = ? AND user_id = ?`)
          .get(comm.id, req.user.id) as { role: string; status: string } | undefined)
      : undefined;

    if (comm.privacy === 'private' && membership?.status !== 'active' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'This is a private community. Join and await approval to view posts.' });
    }

    const posts = db
      .prepare(
        `SELECT cp.*, u.full_name as author_name, u.username as author_username, u.avatar_url as author_avatar
         FROM community_posts cp JOIN users u ON u.id = cp.author_id
         WHERE cp.community_id = ? AND cp.status = 'active'
         ORDER BY cp.created_at DESC LIMIT 30`
      )
      .all(comm.id) as Array<Record<string, unknown>>;

    const comments = db
      .prepare(
        `SELECT cc.*, u.full_name as author_name, u.username as author_username
         FROM community_comments cc JOIN users u ON u.id = cc.author_id
         WHERE cc.post_id IN (SELECT id FROM community_posts WHERE community_id = ?)
         ORDER BY cc.created_at ASC`
      )
      .all(comm.id) as Array<Record<string, unknown>>;

    const members = db
      .prepare(
        `SELECT cm.user_id, cm.role, cm.status, u.full_name, u.username
         FROM community_members cm JOIN users u ON u.id = cm.user_id
         WHERE cm.community_id = ? ORDER BY cm.joined_at ASC`
      )
      .all(comm.id);

    res.json({
      community: {
        ...comm,
        rules: parseJsonSafe<string[]>(String(comm.rules_json || '[]'), []),
        myMembership: membership || null,
      },
      posts: posts.map((p) => ({
        ...p,
        likes: parseJsonSafe<string[]>(String(p.likes_json || '[]'), []),
        comments: comments.filter((c) => c.post_id === p.id),
      })),
      members,
    });
  });

  router.post('/communities/:id/posts', requireAuth, (req: AuthenticatedRequest, res) => {
    const member = db
      .prepare(`SELECT status FROM community_members WHERE community_id = ? AND user_id = ?`)
      .get(req.params.id, req.user!.id) as { status: string } | undefined;
    if (member?.status !== 'active') {
      return res.status(403).json({ error: 'Join this community as an active member before posting.' });
    }

    const title = String(req.body?.title || '').trim();
    const content = String(req.body?.content || '').trim();
    const resourceUrl = String(req.body?.resourceUrl || '').trim();
    if (title.length < 3 || content.length < 5) {
      return res.status(400).json({ error: 'Post title and content are required.' });
    }
    if (!isValidExternalHttpUrl(resourceUrl)) {
      return res.status(400).json({ error: 'Resource URL must start with http:// or https://.' });
    }

    const id = `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(
      `INSERT INTO community_posts (id, community_id, author_id, title, content, resource_url, likes_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', 'active', ?)`
    ).run(id, req.params.id, req.user!.id, title, content, resourceUrl, new Date().toISOString());

    res.status(201).json({ ok: true, id });
  });

  router.post('/posts/:id/react', requireAuth, (req: AuthenticatedRequest, res) => {
    const post = db.prepare(`SELECT likes_json FROM community_posts WHERE id = ? AND status = 'active'`).get(req.params.id) as
      | { likes_json: string }
      | undefined;
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    const likes = new Set(parseJsonSafe<string[]>(post.likes_json, []));
    if (likes.has(req.user!.id)) likes.delete(req.user!.id);
    else likes.add(req.user!.id);
    db.prepare(`UPDATE community_posts SET likes_json = ? WHERE id = ?`).run(
      JSON.stringify(Array.from(likes)),
      req.params.id
    );
    res.json({ ok: true, likes: Array.from(likes) });
  });

  router.post('/posts/:id/comments', requireAuth, (req: AuthenticatedRequest, res) => {
    const content = String(req.body?.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Comment text cannot be empty.' });
    const post = db.prepare(`SELECT id, author_id, title FROM community_posts WHERE id = ?`).get(req.params.id) as
      | { id: string; author_id: string; title: string }
      | undefined;
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`INSERT INTO community_comments (id, post_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)`).run(
      id,
      post.id,
      req.user!.id,
      content,
      new Date().toISOString()
    );

    if (post.author_id !== req.user!.id) {
      notifyWithRealtime(
        post.author_id,
        'community',
        'New Comment on Your Post',
        `${req.user!.full_name} commented on "${post.title}".`,
        '/communities'
      );
    }
    res.status(201).json({ ok: true, id });
  });

  router.delete('/posts/:id', requireAuth, (req: AuthenticatedRequest, res) => {
    const post = db
      .prepare(`SELECT id, community_id, author_id FROM community_posts WHERE id = ?`)
      .get(req.params.id) as { id: string; community_id: string; author_id: string } | undefined;
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const membership = db
      .prepare(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ?`)
      .get(post.community_id, req.user!.id) as { role: string } | undefined;

    const canModerate =
      post.author_id === req.user!.id ||
      membership?.role === 'owner' ||
      membership?.role === 'moderator' ||
      req.user!.role === 'admin' ||
      req.user!.role === 'moderator';

    if (!canModerate) return res.status(403).json({ error: 'Insufficient moderation permissions.' });
    db.prepare(`UPDATE community_posts SET status = 'removed' WHERE id = ?`).run(post.id);
    res.json({ ok: true });
  });

  router.post('/communities/:id/members/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    const myMem = db
      .prepare(`SELECT role FROM community_members WHERE community_id = ? AND user_id = ?`)
      .get(req.params.id, req.user!.id) as { role: string } | undefined;
    if (!myMem || !['owner', 'moderator'].includes(myMem.role)) {
      return res.status(403).json({ error: 'Owner or moderator permissions required.' });
    }
    const action = String(req.body?.action || '');
    if (action === 'approve') {
      db.prepare(`UPDATE community_members SET status = 'active' WHERE community_id = ? AND user_id = ?`).run(
        req.params.id,
        req.params.userId
      );
    } else if (action === 'promote_moderator' && myMem.role === 'owner') {
      db.prepare(`UPDATE community_members SET role = 'moderator' WHERE community_id = ? AND user_id = ?`).run(
        req.params.id,
        req.params.userId
      );
    } else if (action === 'ban') {
      db.prepare(`UPDATE community_members SET status = 'banned' WHERE community_id = ? AND user_id = ?`).run(
        req.params.id,
        req.params.userId
      );
    }
    res.json({ ok: true });
  });

  router.post('/reports', requireAuth, (req: AuthenticatedRequest, res) => {
    const targetType = String(req.body?.targetType || 'post');
    const targetId = String(req.body?.targetId || '');
    const reason = String(req.body?.reason || '').trim();
    if (!targetId || reason.length < 5) {
      return res.status(400).json({ error: 'Provide a clear reason for this report.' });
    }
    const id = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(
      `INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`
    ).run(id, req.user!.id, targetType, targetId, reason, new Date().toISOString());
    res.status(201).json({ ok: true, id });
  });

  // =========================================================
  // CONNECTIONS, MESSAGING & NOTIFICATIONS
  // =========================================================
  router.get('/connections', requireAuth, (req: AuthenticatedRequest, res) => {
    const rows = db
      .prepare(
        `SELECT c.id, c.requester_id, c.recipient_id, c.status, c.created_at,
                u1.full_name as requester_name, u1.username as requester_username,
                u2.full_name as recipient_name, u2.username as recipient_username
         FROM connections c
         JOIN users u1 ON u1.id = c.requester_id
         JOIN users u2 ON u2.id = c.recipient_id
         WHERE c.requester_id = ? OR c.recipient_id = ?
         ORDER BY c.created_at DESC`
      )
      .all(req.user!.id, req.user!.id);
    res.json({ connections: rows });
  });

  router.post('/connections/request', requireAuth, (req: AuthenticatedRequest, res) => {
    const recipientId = String(req.body?.recipientId || '');
    if (!recipientId || recipientId === req.user!.id) {
      return res.status(400).json({ error: 'Invalid recipient user.' });
    }
    const existing = db
      .prepare(
        `SELECT id, status FROM connections WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)`
      )
      .get(req.user!.id, recipientId, recipientId, req.user!.id) as { id: string; status: string } | undefined;

    if (existing) {
      return res.json({ ok: true, status: existing.status, id: existing.id });
    }

    const id = `con_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(
      `INSERT INTO connections (id, requester_id, recipient_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)`
    ).run(id, req.user!.id, recipientId, new Date().toISOString());

    notifyWithRealtime(
      recipientId,
      'connection',
      'New Connection Request',
      `${req.user!.full_name} sent you a peer connection request.`,
      '/communities'
    );

    res.status(201).json({ ok: true, id, status: 'pending' });
  });

  router.post('/connections/:id/respond', requireAuth, (req: AuthenticatedRequest, res) => {
    const decision = req.body?.decision === 'accepted' ? 'accepted' : 'rejected';
    const conn = db
      .prepare(`SELECT * FROM connections WHERE id = ? AND recipient_id = ?`)
      .get(req.params.id, req.user!.id) as { id: string; requester_id: string } | undefined;
    if (!conn) return res.status(404).json({ error: 'Connection request not found.' });

    db.prepare(`UPDATE connections SET status = ? WHERE id = ?`).run(decision, conn.id);
    if (decision === 'accepted') {
      notifyWithRealtime(
        conn.requester_id,
        'connection',
        'Connection Accepted',
        `${req.user!.full_name} accepted your connection request.`,
        '/messages'
      );
    }
    res.json({ ok: true, status: decision });
  });

  router.post('/connections/block', requireAuth, (req: AuthenticatedRequest, res) => {
    const targetId = String(req.body?.userId || '');
    if (!targetId) return res.status(400).json({ error: 'Target user required.' });
    db.prepare(
      `DELETE FROM connections WHERE (requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?)`
    ).run(req.user!.id, targetId, targetId, req.user!.id);
    db.prepare(
      `INSERT INTO connections (id, requester_id, recipient_id, status, created_at) VALUES (?, ?, ?, 'blocked', ?)`
    ).run(`blk_${Date.now()}`, req.user!.id, targetId, new Date().toISOString());
    res.json({ ok: true });
  });

  router.get('/messages/conversations', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.id;
    const peers = db
      .prepare(
        `SELECT u.id, u.full_name, u.username, u.avatar_url, u.role,
                (SELECT content FROM messages m
                 WHERE (m.sender_id = u.id AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = u.id)
                 ORDER BY m.created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages m
                 WHERE (m.sender_id = u.id AND m.recipient_id = ?) OR (m.sender_id = ? AND m.recipient_id = u.id)
                 ORDER BY m.created_at DESC LIMIT 1) as last_message_at,
                (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id AND m.recipient_id = ? AND m.read_at = '') as unread_count
         FROM users u
         WHERE u.id != ? AND u.status = 'active'
           AND (u.id IN (SELECT sender_id FROM messages WHERE recipient_id = ?)
                OR u.id IN (SELECT recipient_id FROM messages WHERE sender_id = ?)
                OR u.id IN (SELECT requester_id FROM connections WHERE recipient_id = ? AND status = 'accepted')
                OR u.id IN (SELECT recipient_id FROM connections WHERE requester_id = ? AND status = 'accepted'))
         ORDER BY last_message_at DESC`
      )
      .all(userId, userId, userId, userId, userId, userId, userId, userId, userId, userId);

    res.json({ conversations: peers });
  });

  router.get('/messages/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    const peerId = req.params.userId;
    const now = new Date().toISOString();
    db.prepare(`UPDATE messages SET read_at = ? WHERE sender_id = ? AND recipient_id = ? AND read_at = ''`).run(
      now,
      peerId,
      req.user!.id
    );
    const history = db
      .prepare(
        `SELECT * FROM messages
         WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
         ORDER BY created_at ASC LIMIT 200`
      )
      .all(req.user!.id, peerId, peerId, req.user!.id);
    const peer = db
      .prepare(`SELECT id, full_name, username, role, avatar_url, allow_messages FROM users WHERE id = ?`)
      .get(peerId);
    res.json({ messages: history, peer });
  });

  router.post('/messages/:userId', requireAuth, (req: AuthenticatedRequest, res) => {
    const recipientId = req.params.userId;
    const content = String(req.body?.content || '').trim();
    const attachmentName = String(req.body?.attachmentName || '').trim().slice(0, 120);
    if (!content) return res.status(400).json({ error: 'Message cannot be empty.' });

    const blocked = db
      .prepare(
        `SELECT 1 FROM connections WHERE status = 'blocked' AND ((requester_id = ? AND recipient_id = ?) OR (requester_id = ? AND recipient_id = ?))`
      )
      .get(req.user!.id, recipientId, recipientId, req.user!.id);
    if (blocked) return res.status(403).json({ error: 'Messaging is blocked between these accounts.' });

    const recipient = db.prepare(`SELECT id, allow_messages FROM users WHERE id = ?`).get(recipientId) as
      | { id: string; allow_messages: number }
      | undefined;
    if (!recipient) return res.status(404).json({ error: 'Recipient not found.' });
    if (!recipient.allow_messages) {
      return res.status(403).json({ error: 'This user has disabled incoming direct messages.' });
    }

    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sender_id: req.user!.id,
      recipient_id: recipientId,
      content,
      attachment_name: attachmentName,
      read_at: '',
      created_at: new Date().toISOString(),
    };
    db.prepare(
      `INSERT INTO messages (id, sender_id, recipient_id, content, attachment_name, read_at, created_at)
       VALUES (?, ?, ?, ?, ?, '', ?)`
    ).run(msg.id, msg.sender_id, msg.recipient_id, msg.content, msg.attachment_name, msg.created_at);

    pushMessageToUser(recipientId, msg);
    notifyWithRealtime(
      recipientId,
      'message',
      `Message from ${req.user!.full_name}`,
      content.slice(0, 90),
      '/messages'
    );

    res.status(201).json({ message: msg });
  });

  router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const notifications = db
      .prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40`)
      .all(req.user!.id);
    const prefs =
      db.prepare(`SELECT * FROM notification_prefs WHERE user_id = ?`).get(req.user!.id) || {
        email_messages: 1,
        email_courses: 1,
        email_billing: 1,
        in_app_community: 1,
        in_app_assignments: 1,
      };
    res.json({ notifications, prefs });
  });

  router.post('/notifications/read', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = String(req.body?.id || '');
    const now = new Date().toISOString();
    if (id === 'all') {
      db.prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at = ''`).run(now, req.user!.id);
    } else if (id) {
      db.prepare(`UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?`).run(now, id, req.user!.id);
    }
    res.json({ ok: true });
  });

  router.put('/notifications/prefs', requireAuth, (req: AuthenticatedRequest, res) => {
    const b = req.body || {};
    db.prepare(
      `INSERT INTO notification_prefs (user_id, email_messages, email_courses, email_billing, in_app_community, in_app_assignments)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email_messages = excluded.email_messages,
         email_courses = excluded.email_courses,
         email_billing = excluded.email_billing,
         in_app_community = excluded.in_app_community,
         in_app_assignments = excluded.in_app_assignments`
    ).run(
      req.user!.id,
      b.email_messages ? 1 : 0,
      b.email_courses ? 1 : 0,
      b.email_billing ? 1 : 0,
      b.in_app_community ? 1 : 0,
      b.in_app_assignments ? 1 : 0
    );
    res.json({ ok: true });
  });

  // =========================================================
  // TECHNICAL RESOURCES & PLATFORM TUTORIALS
  // =========================================================
  router.get('/resources', (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const type = String(req.query.type || '').trim();
    const rows = db
      .prepare(
        `SELECT * FROM resources
         WHERE (? = '' OR type = ?)
           AND (? = '' OR LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(technology) LIKE ?)
         ORDER BY created_at DESC`
      )
      .all(type, type, q, `%${q}%`, `%${q}%`, `%${q}%`);
    res.json({ resources: rows });
  });

  // =========================================================
  // AI LEARNING ASSISTANT
  // =========================================================
  router.get('/ai/usage', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ usage: getAiUsageSummary(req.user!.id) });
  });

  router.post('/ai/assist', requireAuth, aiLimiter, async (req: AuthenticatedRequest, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim();
      const mode = String(req.body?.mode || 'explain_concept') as Parameters<typeof runAiAssistant>[0]['mode'];
      if (!prompt) {
        return res.status(400).json({ error: 'Please enter a question or request for the AI assistant.' });
      }
      const result = await runAiAssistant({
        user: req.user!,
        prompt,
        mode,
        lessonId: req.body?.lessonId ? String(req.body.lessonId) : undefined,
        courseId: req.body?.courseId ? String(req.body.courseId) : undefined,
        exerciseId: req.body?.exerciseId ? String(req.body.exerciseId) : undefined,
        assessmentId: req.body?.assessmentId ? String(req.body.assessmentId) : undefined,
        codeSnippet: req.body?.codeSnippet ? String(req.body.codeSnippet) : undefined,
        errorText: req.body?.errorText ? String(req.body.errorText) : undefined,
      });
      return res.json(result);
    } catch (err) {
      const e = err as Error & { statusCode?: number; code?: string };
      return res.status(e.statusCode || 500).json({
        error: e.message || 'AI Learning Assistant failed to respond.',
        code: e.code || 'AI_ERROR',
      });
    }
  });

  // =========================================================
  // SUBSCRIPTIONS, PRICING & PAYMENT PROCESSING
  // =========================================================
  router.get('/plans', (_req, res) => {
    const plans = db
      .prepare(`SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC`)
      .all() as Array<Record<string, unknown>>;
    res.json({
      plans: plans.map((p) => ({
        ...p,
        features: parseJsonSafe<string[]>(String(p.features_json || '[]'), []),
        limits: parseJsonSafe<Record<string, unknown>>(String(p.limits_json || '{}'), {}),
      })),
      paymentProvider: config.payments.provider,
      stripeConfigured: config.payments.stripeConfigured,
    });
  });

  router.get('/billing/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const subscription = db
      .prepare(
        `SELECT s.*, p.name as plan_name, p.slug as plan_slug
         FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
         WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 1`
      )
      .get(req.user!.id);

    const payments = db
      .prepare(`SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`)
      .all(req.user!.id);

    res.json({
      entitlement: req.entitlement,
      subscription: subscription || null,
      payments,
      paymentProvider: config.payments.provider,
      stripeConfigured: config.payments.stripeConfigured,
    });
  });

  router.post('/billing/checkout', requireAuth, checkoutLimiter, (req: AuthenticatedRequest, res) => {
    const planSlug = String(req.body?.planSlug || '');
    const billingCycle = req.body?.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const plan = db
      .prepare(`SELECT * FROM subscription_plans WHERE slug = ? AND is_active = 1`)
      .get(planSlug) as
      | {
          id: string;
          slug: string;
          name: string;
          monthly_price_cents: number;
          yearly_price_cents: number;
          currency: string;
        }
      | undefined;

    if (!plan) return res.status(404).json({ error: 'Subscription plan not found.' });
    if (plan.slug === 'starter-free') {
      return res.status(400).json({ error: 'Starter Free does not require checkout.' });
    }

    const amountCents = billingCycle === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents;
    const reference = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    if (config.payments.stripeConfigured) {
      return res.status(501).json({
        error: 'Stripe secret key detected. Connect your live Stripe Checkout session URL handler and webhook endpoint.',
      });
    }

    // Create a genuine PENDING payment record first (never grants access before explicit verification)
    db.prepare(
      `INSERT INTO payments (id, user_id, plan_id, billing_cycle, amount_cents, currency, status, provider, reference, description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 'sandbox', ?, ?, ?)`
    ).run(
      paymentId,
      req.user!.id,
      plan.id,
      billingCycle,
      amountCents,
      plan.currency,
      reference,
      `${plan.name} (${billingCycle})`,
      now
    );

    res.status(201).json({
      mode: 'development_sandbox',
      paymentId,
      reference,
      amountCents,
      currency: plan.currency,
      planName: plan.name,
      billingCycle,
      message: 'Pending checkout created in Development Sandbox mode. Complete or fail the sandbox verification step to test webhook entitlement activation.',
    });
  });

  router.post('/billing/verify-sandbox', requireAuth, (req: AuthenticatedRequest, res) => {
    if (config.payments.stripeConfigured) {
      return res.status(403).json({ error: 'Sandbox verification is disabled when Stripe is configured.' });
    }
    const paymentId = String(req.body?.paymentId || '');
    const outcome = req.body?.outcome === 'failed' ? 'failed' : 'succeeded';

    const payment = db
      .prepare(`SELECT * FROM payments WHERE id = ? AND user_id = ? AND status = 'pending'`)
      .get(paymentId, req.user!.id) as
      | { id: string; plan_id: string; billing_cycle: string; amount_cents: number; description: string }
      | undefined;

    if (!payment) {
      return res.status(404).json({ error: 'Pending payment record not found.' });
    }

    if (outcome === 'failed') {
      db.prepare(`UPDATE payments SET status = 'failed' WHERE id = ?`).run(payment.id);
      notifyWithRealtime(
        req.user!.id,
        'billing',
        'Payment Failed',
        `Your payment for ${payment.description} could not be completed.`,
        '/pricing'
      );
      return res.status(402).json({
        ok: false,
        status: 'failed',
        error: 'Sandbox payment declined. Entitlement was not activated.',
      });
    }

    const now = new Date();
    const periodEnd = new Date(
      now.getTime() + (payment.billing_cycle === 'yearly' ? 365 : 30) * 86400000
    ).toISOString();

    db.prepare(`UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`).run(req.user!.id);

    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(
      `INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, status, provider, provider_ref, current_period_start, current_period_end, cancel_at_period_end, created_at)
       VALUES (?, ?, ?, ?, 'active', 'sandbox', ?, ?, ?, 0, ?)`
    ).run(subId, req.user!.id, payment.plan_id, payment.billing_cycle, payment.id, now.toISOString(), periodEnd, now.toISOString());

    db.prepare(`UPDATE payments SET status = 'succeeded', subscription_id = ? WHERE id = ?`).run(subId, payment.id);

    grantUserEntitlements(
      req.user!.id,
      ['premium_course_access', 'premium_lesson_access', 'community_create', 'collaborative_workspace_access'],
      'subscription',
      subId,
      periodEnd,
      'system',
      `Sandbox checkout verification (${payment.id})`
    );
    recordAuditLog(req.user!.id, 'billing.sandbox_verified', 'subscription', subId, {
      paymentId: payment.id,
      amountCents: payment.amount_cents,
    });

    notifyWithRealtime(
      req.user!.id,
      'billing',
      'Subscription Activated',
      `${payment.description} is now active until ${periodEnd.slice(0, 10)}.`,
      '/pricing'
    );

    return res.json({
      ok: true,
      status: 'succeeded',
      entitlement: getUserEntitlement(req.user!.id),
    });
  });

  router.post('/billing/webhook', (req, res) => {
    const rawBody = (req as typeof req & { rawBody?: string }).rawBody || JSON.stringify(req.body || {});
    const sigHeader =
      (req.headers['x-webhook-signature'] as string | undefined) ||
      (req.headers['stripe-signature'] as string | undefined);

    if (!verifyWebhookSignature(rawBody, sigHeader, config.payments.stripeWebhookSecret)) {
      return res.status(401).json({ error: 'Invalid webhook signature.' });
    }

    const eventId = String(req.body?.eventId || req.body?.id || '').trim();
    const eventType = String(req.body?.type || '').trim();
    const paymentId = String(req.body?.paymentId || req.body?.data?.paymentId || '').trim();
    const provider = String(req.body?.provider || config.payments.provider);

    if (!eventId || !eventType) {
      return res.status(400).json({ error: 'Webhook eventId and type are required.' });
    }

    const existingEvent = db.prepare(`SELECT id FROM webhook_events WHERE event_id = ?`).get(eventId);
    if (existingEvent) {
      return res.json({ ok: true, deduplicated: true });
    }

    const now = new Date();
    const nowIso = now.toISOString();

    if (paymentId) {
      const payment = db
        .prepare(`SELECT * FROM payments WHERE id = ?`)
        .get(paymentId) as
        | {
            id: string;
            user_id: string;
            subscription_id: string | null;
            plan_id: string;
            billing_cycle: string;
            amount_cents: number;
            currency: string;
            description: string;
            status: string;
          }
        | undefined;

      if (!payment) {
        return res.status(404).json({ error: 'Referenced payment record not found.' });
      }

      if (eventType === 'payment.succeeded' && payment.status !== 'succeeded') {
        const periodEnd = new Date(
          now.getTime() + (payment.billing_cycle === 'yearly' ? 365 : 30) * 86400000
        ).toISOString();

        db.prepare(`UPDATE subscriptions SET status = 'expired' WHERE user_id = ? AND status = 'active'`).run(
          payment.user_id
        );
        const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        db.prepare(
          `INSERT INTO subscriptions (id, user_id, plan_id, billing_cycle, status, provider, provider_ref, current_period_start, current_period_end, cancel_at_period_end, created_at)
           VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, 0, ?)`
        ).run(subId, payment.user_id, payment.plan_id, payment.billing_cycle, provider, payment.id, nowIso, periodEnd, nowIso);

        db.prepare(`UPDATE payments SET status = 'succeeded', subscription_id = ? WHERE id = ?`).run(subId, payment.id);
        grantUserEntitlements(
          payment.user_id,
          ['premium_course_access', 'premium_lesson_access', 'community_create', 'collaborative_workspace_access'],
          'subscription',
          subId,
          periodEnd,
          'webhook',
          `Verified webhook ${eventId}`
        );
        recordAuditLog('webhook', 'billing.webhook_succeeded', 'payment', payment.id, { eventId, subId });
        notifyWithRealtime(
          payment.user_id,
          'billing',
          'Payment Verified',
          `${payment.description} is active until ${periodEnd.slice(0, 10)}.`,
          '/pricing'
        );
      } else if (eventType === 'payment.failed') {
        db.prepare(`UPDATE payments SET status = 'failed' WHERE id = ?`).run(payment.id);
        recordAuditLog('webhook', 'billing.webhook_failed', 'payment', payment.id, { eventId });
      } else if (eventType === 'payment.refunded' || eventType === 'subscription.expired') {
        if (eventType === 'payment.refunded') {
          db.prepare(`UPDATE payments SET status = 'refunded' WHERE id = ?`).run(payment.id);
        }
        if (payment.subscription_id) {
          db.prepare(`UPDATE subscriptions SET status = 'expired' WHERE id = ?`).run(payment.subscription_id);
          revokeUserEntitlementsByRef(payment.subscription_id);
        }
        recordAuditLog('webhook', `billing.${eventType}`, 'payment', payment.id, { eventId });
        notifyWithRealtime(
          payment.user_id,
          'billing',
          eventType === 'payment.refunded' ? 'Payment Refunded' : 'Subscription Expired',
          `Access linked to ${payment.description} has been updated.`,
          '/pricing'
        );
      }
    }

    db.prepare(
      `INSERT INTO webhook_events (id, provider, event_id, event_type, payload_json, status, processed_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'processed', ?, ?)`
    ).run(`wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, provider, eventId, eventType, rawBody, nowIso, nowIso);

    return res.json({ ok: true, deduplicated: false });
  });

  router.post('/billing/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
    db.prepare(`UPDATE subscriptions SET cancel_at_period_end = 1 WHERE user_id = ? AND status = 'active'`).run(
      req.user!.id
    );
    recordAuditLog(req.user!.id, 'billing.cancel_requested', 'user', req.user!.id);
    notifyWithRealtime(
      req.user!.id,
      'billing',
      'Subscription Renewal Canceled',
      'Your subscription will remain active until the end of the current billing period.',
      '/pricing'
    );
    res.json({ ok: true });
  });

  // =========================================================
  // ADMIN, FINANCE & INSTRUCTOR CMS PORTAL
  // =========================================================
  router.get('/admin/overview', requireAuth, requireRole('admin', 'instructor', 'moderator'), (_req, res) => {
    const revenueRow = db
      .prepare(`SELECT COALESCE(SUM(amount_cents), 0) as total FROM payments WHERE status = 'succeeded'`)
      .get() as { total: number };

    const metrics = {
      users: (db.prepare(`SELECT COUNT(*) as c FROM users`).get() as { c: number }).c,
      courses: (db.prepare(`SELECT COUNT(*) as c FROM courses`).get() as { c: number }).c,
      enrollments: (db.prepare(`SELECT COUNT(*) as c FROM enrollments`).get() as { c: number }).c,
      activeSubscriptions: (
        db.prepare(`SELECT COUNT(*) as c FROM subscriptions WHERE status = 'active'`).get() as { c: number }
      ).c,
      openReports: (db.prepare(`SELECT COUNT(*) as c FROM reports WHERE status = 'open'`).get() as { c: number }).c,
      pendingInquiries: (
        db.prepare(`SELECT COUNT(*) as c FROM contact_inquiries WHERE status = 'pending'`).get() as { c: number }
      ).c,
      aiRequestsToday: (
        db
          .prepare(`SELECT COUNT(*) as c FROM ai_usage_logs WHERE created_at LIKE ?`)
          .get(`${new Date().toISOString().slice(0, 10)}%`) as { c: number }
      ).c,
      revenueCents: revenueRow.total,
    };

    const users = db
      .prepare(`SELECT id, email, full_name, username, role, status, email_verified, xp, created_at FROM users ORDER BY created_at DESC LIMIT 50`)
      .all();
    const reports = db
      .prepare(
        `SELECT r.*, u.username as reporter_username FROM reports r JOIN users u ON u.id = r.reporter_id ORDER BY r.created_at DESC LIMIT 30`
      )
      .all();
    const contactInquiries = db
      .prepare(`SELECT * FROM contact_inquiries ORDER BY created_at DESC LIMIT 60`)
      .all();
    const plans = db.prepare(`SELECT * FROM subscription_plans ORDER BY sort_order ASC`).all();
    const brand = getPublicBrandConfig();
    const aiConfig = db.prepare(`SELECT * FROM ai_config WHERE id = 1`).get();
    const pendingAttempts = db
      .prepare(
        `SELECT aa.*, a.title as assessment_title, u.full_name, u.username
         FROM assessment_attempts aa
         JOIN assessments a ON a.id = aa.assessment_id
         JOIN users u ON u.id = aa.user_id
         WHERE aa.status = 'pending_review'
         ORDER BY aa.created_at DESC LIMIT 20`
      )
      .all();
    const payments = db
      .prepare(
        `SELECT p.*, u.email as user_email, u.full_name as user_name
         FROM payments p JOIN users u ON u.id = p.user_id
         ORDER BY p.created_at DESC LIMIT 40`
      )
      .all();
    const entitlementGrants = db
      .prepare(
        `SELECT e.*, u.email as user_email, u.full_name as user_name
         FROM entitlements e JOIN users u ON u.id = e.user_id
         ORDER BY e.created_at DESC LIMIT 40`
      )
      .all();
    const auditLogs = db
      .prepare(
        `SELECT a.*, u.email as actor_email
         FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_id
         ORDER BY a.created_at DESC LIMIT 50`
      )
      .all();
    const categories = db.prepare(`SELECT * FROM categories ORDER BY sort_order ASC, name ASC`).all();
    const technologies = (
      db
        .prepare(
          `SELECT t.*, cat.name as category_name,
                  (SELECT COUNT(*) FROM courses c WHERE c.technology_id = t.id) as course_count
           FROM technologies t
           LEFT JOIN categories cat ON cat.id = t.category_id
           ORDER BY t.sort_order ASC, t.name ASC`
        )
        .all() as Array<Record<string, unknown>>
    ).map(formatTechRow);
    const technologiesByCategory = db
      .prepare(
        `SELECT cat.name as category_name, COUNT(t.id) as count
         FROM categories cat
         LEFT JOIN technologies t ON t.category_id = cat.id
         GROUP BY cat.id
         ORDER BY count DESC`
      )
      .all();
    const nameCounts = new Map<string, number>();
    for (const t of technologies) {
      const key = String(t.name || '').trim().toLowerCase();
      nameCounts.set(key, (nameCounts.get(key) || 0) + 1);
    }
    const duplicateTechNames = Array.from(nameCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([name]) => name);

    const learningPaths = (db.prepare(`SELECT * FROM learning_paths`).all() as Array<Record<string, unknown>>).map((p) => ({
      ...p,
      course_ids: parseJsonSafe<string[]>(String(p.course_ids_json || '[]'), []),
    }));
    const courses = db
      .prepare(
        `SELECT c.id, c.title, c.slug, c.description, c.difficulty, c.estimated_hours, c.is_published, c.status, c.workflow_status, c.completion_rule,
                c.category_id, c.technology_id, cat.name as category_name, t.name as technology_name,
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrollment_count,
                (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) as lesson_count,
                (SELECT COUNT(*) FROM certificates cert WHERE cert.course_id = c.id) as certificates_issued
         FROM courses c
         LEFT JOIN categories cat ON cat.id = c.category_id
         LEFT JOIN technologies t ON t.id = c.technology_id
         ORDER BY c.created_at DESC LIMIT 100`
      )
      .all();
    const modules = db
      .prepare(
        `SELECT m.*, c.title as course_title FROM modules m JOIN courses c ON c.id = m.course_id ORDER BY c.title ASC, m.sort_order ASC LIMIT 120`
      )
      .all();
    const courseTopics = db
      .prepare(`SELECT tp.*, c.title as course_title, m.title as module_title FROM course_topics tp JOIN courses c ON c.id = tp.course_id JOIN modules m ON m.id = tp.module_id ORDER BY tp.sort_order ASC LIMIT 150`)
      .all();
    const lessons = db
      .prepare(
        `SELECT l.id, l.module_id, l.topic_id, l.course_id, l.title, l.slug, l.topic_name, l.summary, l.content_markdown, l.code_example,
                l.language, l.access_tier, l.duration_minutes, l.exercise_prompt, l.starter_code, l.status, l.workflow_status, l.version, l.sort_order,
                c.title as course_title, m.title as module_title
         FROM lessons l
         JOIN courses c ON c.id = l.course_id
         JOIN modules m ON m.id = l.module_id
         ORDER BY c.created_at DESC, l.sort_order ASC LIMIT 120`
      )
      .all();
    const exercises = db
      .prepare(
        `SELECT e.id, e.course_id, e.lesson_id, e.title, e.exercise_type, e.difficulty, e.xp_reward, c.title as course_title
         FROM exercises e JOIN courses c ON c.id = e.course_id ORDER BY e.created_at DESC LIMIT 100`
      )
      .all();
    const assignments = db
      .prepare(
        `SELECT a.id, a.course_id, a.title, a.difficulty, a.xp_reward, a.due_days, c.title as course_title
         FROM assignments a JOIN courses c ON c.id = a.course_id ORDER BY a.created_at DESC LIMIT 60`
      )
      .all();
    const projectTemplates = db
      .prepare(`SELECT pt.*, t.name as technology_name FROM project_templates pt LEFT JOIN technologies t ON t.id = pt.technology_id ORDER BY pt.created_at DESC LIMIT 60`)
      .all();
    const pendingExerciseSubmissions = db
      .prepare(
        `SELECT es.*, ex.title as exercise_title, u.full_name, u.username
         FROM exercise_submissions es
         JOIN exercises ex ON ex.id = es.exercise_id
         JOIN users u ON u.id = es.user_id
         WHERE es.status = 'pending_review' ORDER BY es.created_at DESC LIMIT 30`
      )
      .all();
    const pendingAssignmentSubmissions = db
      .prepare(
        `SELECT asub.*, a.title as assignment_title, a.rubric_json as rubric_json, u.full_name, u.username
         FROM assignment_submissions asub
         JOIN assignments a ON a.id = asub.assignment_id
         JOIN users u ON u.id = asub.user_id
         ORDER BY asub.updated_at DESC LIMIT 30`
      )
      .all();
    const submittedProjects = db
      .prepare(
        `SELECT p.id, p.title, p.status, p.visibility, p.instructor_feedback, p.rubric_scores_json, pt.rubric_json as template_rubric_json, p.updated_at, u.full_name as owner_name, u.username as owner_username
         FROM projects p
         JOIN users u ON u.id = p.owner_id
         LEFT JOIN project_templates pt ON pt.id = p.template_id
         ORDER BY p.updated_at DESC LIMIT 30`
      )
      .all();

    res.json({
      metrics: {
        ...metrics,
        totalTechnologies: technologies.length,
        publishedTechnologies: technologies.filter((t) => Number(t.is_published) === 1).length,
        draftTechnologies: technologies.filter((t) => Number(t.is_published) === 0).length,
        technologiesWithoutContent: technologies.filter((t) => Number(t.course_count || 0) === 0).length,
        technologiesAvailable: technologies.filter((t) => Number(t.course_count || 0) > 0).length,
        duplicateTechNames,
        technologiesByCategory,
      },
      users,
      reports,
      contactInquiries,
      plans,
      brand,
      aiConfig,
      pendingAttempts,
      payments,
      entitlementGrants,
      auditLogs,
      categories,
      technologies,
      learningPaths,
      courses,
      modules,
      courseTopics,
      lessons,
      exercises,
      assignments,
      projectTemplates,
      pendingExerciseSubmissions,
      pendingAssignmentSubmissions,
      submittedProjects,
    });
  });

  router.patch('/admin/users/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const role = req.body?.role;
    const status = req.body?.status;
    if (role && ['learner', 'instructor', 'moderator', 'admin'].includes(role)) {
      db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(role, req.params.id);
      recordAuditLog(req.user!.id, 'admin.user_role_updated', 'user', String(req.params.id), { role });
    }
    if (status && ['active', 'suspended'].includes(status)) {
      db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run(status, req.params.id);
      recordAuditLog(req.user!.id, 'admin.user_status_updated', 'user', String(req.params.id), { status });
    }
    res.json({ ok: true });
  });

  router.patch('/admin/plans/:id', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const monthly = Number(req.body?.monthlyPriceCents);
    const yearly = Number(req.body?.yearlyPriceCents);
    if (!Number.isFinite(monthly) || monthly < 0 || !Number.isFinite(yearly) || yearly < 0) {
      return res.status(400).json({ error: 'Prices must be non-negative integer cents.' });
    }
    db.prepare(`UPDATE subscription_plans SET monthly_price_cents = ?, yearly_price_cents = ? WHERE id = ?`).run(
      Math.round(monthly),
      Math.round(yearly),
      req.params.id
    );
    recordAuditLog(req.user!.id, 'admin.plan_pricing_updated', 'subscription_plan', String(req.params.id), {
      monthlyPriceCents: Math.round(monthly),
      yearlyPriceCents: Math.round(yearly),
    });
    res.json({ ok: true });
  });

  router.post('/admin/payments/:id/refund', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const payment = db
      .prepare(`SELECT * FROM payments WHERE id = ?`)
      .get(req.params.id) as
      | { id: string; user_id: string; subscription_id: string | null; status: string; description: string }
      | undefined;

    if (!payment) return res.status(404).json({ error: 'Payment not found.' });
    if (payment.status !== 'succeeded') {
      return res.status(400).json({ error: 'Only succeeded payments can be refunded.' });
    }

    db.prepare(`UPDATE payments SET status = 'refunded' WHERE id = ?`).run(payment.id);
    if (payment.subscription_id) {
      db.prepare(`UPDATE subscriptions SET status = 'expired' WHERE id = ?`).run(payment.subscription_id);
      revokeUserEntitlementsByRef(payment.subscription_id);
    }

    recordAuditLog(req.user!.id, 'finance.payment_refunded', 'payment', payment.id, {
      subscriptionId: payment.subscription_id,
    });
    notifyWithRealtime(
      payment.user_id,
      'billing',
      'Payment Refunded',
      `Your payment for ${payment.description} has been refunded and linked entitlements were revoked.`,
      '/pricing'
    );
    res.json({ ok: true });
  });

  router.post('/admin/entitlements', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const userId = String(req.body?.userId || '').trim();
    const featureKey = String(req.body?.featureKey || 'all_premium').trim();
    const source = String(req.body?.source || 'admin_grant').trim();
    const durationDays = Number(req.body?.durationDays || 30);
    const notes = String(req.body?.notes || '').trim();

    if (!userId) return res.status(400).json({ error: 'User ID is required.' });
    const targetUser = db.prepare(`SELECT id FROM users WHERE id = ?`).get(userId);
    if (!targetUser) return res.status(404).json({ error: 'Target user not found.' });

    const validFeatures = [
      'all_premium',
      'premium_course_access',
      'premium_lesson_access',
      'community_create',
      'collaborative_workspace_access',
    ];
    if (!validFeatures.includes(featureKey)) {
      return res.status(400).json({ error: 'Unsupported feature key.' });
    }

    const endsAt =
      Number.isFinite(durationDays) && durationDays > 0
        ? new Date(Date.now() + durationDays * 86400000).toISOString()
        : '';
    const grantRef = `grant_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    grantUserEntitlements(userId, [featureKey], source, grantRef, endsAt, req.user!.id, notes);
    recordAuditLog(req.user!.id, 'admin.entitlement_granted', 'entitlement', grantRef, {
      userId,
      featureKey,
      source,
      endsAt,
    });
    notifyWithRealtime(
      userId,
      'billing',
      'Access Entitlement Granted',
      `An administrator granted ${featureKey} (${source}) to your account.`,
      '/pricing'
    );

    res.status(201).json({ ok: true, grantRef });
  });

  router.patch('/admin/entitlements/:id/revoke', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const ent = db.prepare(`SELECT id, user_id, feature_key FROM entitlements WHERE id = ?`).get(req.params.id) as
      | { id: string; user_id: string; feature_key: string }
      | undefined;
    if (!ent) return res.status(404).json({ error: 'Entitlement record not found.' });

    db.prepare(`UPDATE entitlements SET status = 'revoked' WHERE id = ?`).run(ent.id);
    recordAuditLog(req.user!.id, 'admin.entitlement_revoked', 'entitlement', ent.id, {
      userId: ent.user_id,
      featureKey: ent.feature_key,
    });
    res.json({ ok: true });
  });

  router.patch('/admin/brand', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const b = req.body || {};
    const existing = getPublicBrandConfig() as Record<string, unknown>;

    const productName = String(b.product_name ?? existing.product_name ?? 'Braincode').trim();
    const companyName = String(b.company_name ?? existing.company_name ?? 'BrainCode Technology Limited').trim();
    const tagline = String(b.tagline ?? existing.tagline ?? 'Learn. Build. Innovate. Grow.').trim();
    const supportEmail = String(b.support_email ?? existing.support_email ?? 'support@braincode.dev').trim();
    const officialContactEmail = String(b.official_contact_email ?? existing.official_contact_email ?? '').trim();
    const businessPhone = String(b.business_phone ?? existing.business_phone ?? '').trim();
    const whatsappUrl = String(b.whatsapp_url ?? existing.whatsapp_url ?? '').trim();
    const businessAddress = String(b.business_address ?? existing.business_address ?? '').trim();
    const officeHours = String(b.office_hours ?? existing.office_hours ?? '').trim();
    const contactIntro = String(b.contact_intro ?? existing.contact_intro ?? '').trim();
    const aboutHeadline = String(b.about_headline ?? existing.about_headline ?? '').trim();
    const aboutDescription = String(b.about_description ?? existing.about_description ?? '').trim();
    const footerAboutText = String(b.footer_about_text ?? existing.footer_about_text ?? '').trim();
    const logoUrl = String(b.logo_url ?? existing.logo_url ?? '').trim();
    const faviconUrl = String(b.favicon_url ?? existing.favicon_url ?? '').trim();
    const heroHeadline = String(b.hero_headline ?? existing.hero_headline ?? '').trim();
    const heroSubheadline = String(b.hero_subheadline ?? existing.hero_subheadline ?? '').trim();

    if (productName.length < 2 || companyName.length < 2) {
      return res.status(400).json({ error: 'Product name and company name are required.' });
    }
    if (supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
      return res.status(400).json({ error: 'Support email must be a valid email address.' });
    }
    if (officialContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialContactEmail)) {
      return res.status(400).json({ error: 'Official contact email must be a valid email address.' });
    }
    if (!isValidAssetOrHttpUrl(logoUrl)) {
      return res.status(400).json({ error: 'Logo URL must start with https://, http://, or /.' });
    }
    if (!isValidAssetOrHttpUrl(faviconUrl)) {
      return res.status(400).json({ error: 'Favicon URL must start with https://, http://, or /.' });
    }
    if (!isValidExternalHttpUrl(whatsappUrl)) {
      return res.status(400).json({ error: 'WhatsApp link must be a valid https:// or http:// URL.' });
    }

    const rawSocial = (b.social_links && typeof b.social_links === 'object' ? b.social_links : existing.social_links || {}) as SocialLinksMap;
    const socialKeys: Array<keyof Omit<SocialLinksMap, 'custom'>> = [
      'facebook',
      'instagram',
      'youtube',
      'tiktok',
      'linkedin',
      'x',
      'whatsapp_community',
    ];
    const cleanSocial: SocialLinksMap = {};
    for (const key of socialKeys) {
      const val = String(rawSocial[key] || '').trim();
      if (val && !isValidExternalHttpUrl(val)) {
        return res.status(400).json({ error: `Invalid ${key} URL. Must begin with https:// or http://.` });
      }
      if (val) cleanSocial[key] = val;
    }
    if (Array.isArray(rawSocial.custom)) {
      cleanSocial.custom = [];
      for (const item of rawSocial.custom.slice(0, 6)) {
        const label = String(item?.label || '').trim();
        const url = String(item?.url || '').trim();
        if (!label && !url) continue;
        if (!label || !isValidExternalHttpUrl(url) || !url) {
          return res.status(400).json({ error: 'Custom social links require both a label and valid https:// URL.' });
        }
        cleanSocial.custom.push({ label, url });
      }
    }

    db.prepare(
      `UPDATE brand_config
       SET product_name = ?, company_name = ?, tagline = ?, support_email = ?,
           official_contact_email = ?, business_phone = ?, whatsapp_url = ?, business_address = ?, office_hours = ?,
           contact_intro = ?, about_headline = ?, about_description = ?, footer_about_text = ?,
           logo_url = ?, favicon_url = ?, social_links_json = ?,
           hero_headline = ?, hero_subheadline = ?, updated_at = ?
       WHERE id = 1`
    ).run(
      productName,
      companyName,
      tagline,
      supportEmail,
      officialContactEmail,
      businessPhone,
      whatsappUrl,
      businessAddress,
      officeHours,
      contactIntro,
      aboutHeadline,
      aboutDescription,
      footerAboutText,
      logoUrl,
      faviconUrl,
      JSON.stringify(cleanSocial),
      heroHeadline,
      heroSubheadline,
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'admin.brand_updated', 'brand_config', '1', {
      product_name: productName,
      company_name: companyName,
    });
    res.json({ ok: true, brand: getPublicBrandConfig() });
  });

  router.get('/admin/contact-inquiries', requireAuth, requireRole('admin', 'moderator'), (req, res) => {
    const statusFilter = String(req.query.status || '').trim().toLowerCase();
    const rows =
      statusFilter && ['pending', 'reviewed', 'resolved'].includes(statusFilter)
        ? db.prepare(`SELECT * FROM contact_inquiries WHERE status = ? ORDER BY created_at DESC LIMIT 100`).all(statusFilter)
        : db.prepare(`SELECT * FROM contact_inquiries ORDER BY created_at DESC LIMIT 100`).all();
    res.json({ inquiries: rows });
  });

  router.patch('/admin/contact-inquiries/:id', requireAuth, requireRole('admin', 'moderator'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT id, status FROM contact_inquiries WHERE id = ?`).get(req.params.id) as
      | { id: string; status: string }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Contact enquiry not found.' });

    const nextStatus = ['pending', 'reviewed', 'resolved'].includes(String(req.body?.status))
      ? String(req.body.status)
      : existing.status;
    const adminNotes = String(req.body?.adminNotes ?? '').trim().slice(0, 2000);
    const now = new Date().toISOString();
    const respondedAt = nextStatus === 'resolved' ? now : '';

    db.prepare(
      `UPDATE contact_inquiries SET status = ?, admin_notes = ?, responded_at = CASE WHEN ? != '' THEN ? ELSE responded_at END, updated_at = ? WHERE id = ?`
    ).run(nextStatus, adminNotes, respondedAt, respondedAt, now, existing.id);

    recordAuditLog(req.user!.id, 'support.inquiry_updated', 'contact_inquiry', existing.id, { status: nextStatus });
    res.json({ ok: true });
  });

  router.patch('/admin/ai-config', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const b = req.body || {};
    const freeLimit = Math.max(1, Number(b.daily_free_limit || 15));
    const premiumLimit = Math.max(1, Number(b.daily_premium_limit || 250));
    db.prepare(
      `UPDATE ai_config SET daily_free_limit = ?, daily_premium_limit = ?, system_guardrail = ?, updated_at = ? WHERE id = 1`
    ).run(freeLimit, premiumLimit, String(b.system_guardrail || ''), new Date().toISOString());
    recordAuditLog(req.user!.id, 'admin.ai_config_updated', 'ai_config', '1', { freeLimit, premiumLimit });
    res.json({ ok: true });
  });

  router.patch('/admin/reports/:id', requireAuth, requireRole('admin', 'moderator'), (req: AuthenticatedRequest, res) => {
    const status = ['resolved', 'dismissed'].includes(String(req.body?.status)) ? String(req.body.status) : 'resolved';
    db.prepare(`UPDATE reports SET status = ?, reviewed_by = ?, resolution_note = ? WHERE id = ?`).run(
      status,
      req.user!.id,
      String(req.body?.resolutionNote || ''),
      req.params.id
    );
    recordAuditLog(req.user!.id, 'moderation.report_updated', 'report', String(req.params.id), { status });
    res.json({ ok: true });
  });

  router.post('/admin/categories', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    const sortOrder = Number(req.body?.sortOrder || 99);
    if (name.length < 2) return res.status(400).json({ error: 'Category name is required.' });
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-3)}`;
    const id = `cat_${Date.now()}`;
    db.prepare(`INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      id,
      name,
      slug,
      description || `${name} engineering track`,
      Number.isFinite(sortOrder) ? sortOrder : 99
    );
    recordAuditLog(req.user!.id, 'cms.category_created', 'category', id, { name });
    res.status(201).json({ ok: true, id, slug });
  });

  router.patch('/admin/categories/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT * FROM categories WHERE id = ?`).get(req.params.id) as
      | { id: string; name: string; description: string; sort_order: number }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Category not found.' });
    const name = String(req.body?.name ?? existing.name).trim();
    const description = String(req.body?.description ?? existing.description).trim();
    const sortOrder = req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) : existing.sort_order;
    db.prepare(`UPDATE categories SET name = ?, description = ?, sort_order = ? WHERE id = ?`).run(
      name,
      description,
      Number.isFinite(sortOrder) ? sortOrder : existing.sort_order,
      existing.id
    );
    recordAuditLog(req.user!.id, 'cms.category_updated', 'category', existing.id, { name });
    res.json({ ok: true });
  });

  router.post('/admin/technologies', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const name = String(req.body?.name || '').trim();
    const categoryId = String(req.body?.categoryId || 'cat_web_dev').trim();
    const description = String(req.body?.description || '').trim();
    const iconSymbol = String(req.body?.iconSymbol || name.slice(0, 3).toUpperCase()).trim().slice(0, 6);
    const sortOrder = Number(req.body?.sortOrder ?? 50);
    const featuredOrder = Number(req.body?.featuredOrder ?? 0);
    const isPopular = req.body?.isPopular ? 1 : 0;
    const isPublished = req.body?.isPublished === false ? 0 : 1;
    const difficulty = ['Beginner', 'Intermediate', 'Advanced'].includes(String(req.body?.difficulty))
      ? String(req.body.difficulty)
      : 'Beginner';
    const brandColor = /^#[0-9A-Fa-f]{6}$/.test(String(req.body?.brandColor || '')) ? String(req.body.brandColor) : '#0A84FF';
    const contentStatus = ['available', 'in_development', 'coming_soon'].includes(String(req.body?.contentStatus))
      ? String(req.body.contentStatus)
      : 'coming_soon';
    const aliases = Array.isArray(req.body?.aliases)
      ? req.body.aliases.map((x: unknown) => String(x).trim()).filter(Boolean)
      : String(req.body?.aliases || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean);
    const overviewMarkdown = String(req.body?.overviewMarkdown || '').trim();
    if (name.length < 1) return res.status(400).json({ error: 'Technology name is required.' });

    const dupName = db.prepare(`SELECT id FROM technologies WHERE LOWER(name) = LOWER(?)`).get(name);
    if (dupName) {
      return res.status(409).json({ error: `A technology named "${name}" already exists in the catalog.` });
    }

    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tech';
    let slug = slugBase;
    if (db.prepare(`SELECT 1 FROM technologies WHERE slug = ?`).get(slug)) {
      slug = `${slugBase}-${Date.now().toString().slice(-3)}`;
    }
    const id = `tech_${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO technologies (id, category_id, name, slug, description, icon_symbol, sort_order, is_published, overview_markdown, is_popular, aliases_json, difficulty, brand_color, content_status, featured_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      categoryId,
      name,
      slug,
      description || `${name} structured tutorials, references, and exercises.`,
      iconSymbol || '</>',
      Number.isFinite(sortOrder) ? sortOrder : 50,
      isPublished,
      overviewMarkdown || description || `${name} core engineering curriculum.`,
      isPopular,
      JSON.stringify(aliases),
      difficulty,
      brandColor,
      contentStatus,
      Number.isFinite(featuredOrder) ? featuredOrder : 0,
      now
    );
    recordAuditLog(req.user!.id, 'cms.technology_created', 'technology', id, { name, categoryId, contentStatus });
    res.status(201).json({ ok: true, id, slug });
  });

  router.patch('/admin/technologies/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT * FROM technologies WHERE id = ?`).get(req.params.id) as
      | (Record<string, unknown> & { id: string })
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Technology not found.' });

    const name = String(req.body?.name ?? existing.name).trim();
    const dupOther = db.prepare(`SELECT id FROM technologies WHERE LOWER(name) = LOWER(?) AND id != ?`).get(name, existing.id);
    if (dupOther) {
      return res.status(409).json({ error: `Another technology named "${name}" already exists.` });
    }
    const categoryId = String(req.body?.categoryId ?? existing.category_id).trim();
    const description = String(req.body?.description ?? existing.description).trim();
    const iconSymbol = String(req.body?.iconSymbol ?? existing.icon_symbol).trim().slice(0, 6);
    const sortOrder = req.body?.sortOrder !== undefined ? Number(req.body.sortOrder) : Number(existing.sort_order || 0);
    const featuredOrder = req.body?.featuredOrder !== undefined ? Number(req.body.featuredOrder) : Number(existing.featured_order || 0);
    const isPublished = req.body?.isPublished !== undefined ? (req.body.isPublished ? 1 : 0) : Number(existing.is_published ?? 1);
    const isPopular = req.body?.isPopular !== undefined ? (req.body.isPopular ? 1 : 0) : Number(existing.is_popular ?? 0);
    const difficulty = ['Beginner', 'Intermediate', 'Advanced'].includes(String(req.body?.difficulty))
      ? String(req.body.difficulty)
      : String(existing.difficulty || 'Beginner');
    const brandColor = /^#[0-9A-Fa-f]{6}$/.test(String(req.body?.brandColor || ''))
      ? String(req.body.brandColor)
      : String(existing.brand_color || '#0A84FF');
    const contentStatus = ['available', 'in_development', 'coming_soon'].includes(String(req.body?.contentStatus))
      ? String(req.body.contentStatus)
      : String(existing.content_status || 'coming_soon');
    const aliasesJson =
      req.body?.aliases !== undefined
        ? JSON.stringify(
            Array.isArray(req.body.aliases)
              ? req.body.aliases.map((x: unknown) => String(x).trim()).filter(Boolean)
              : String(req.body.aliases || '')
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean)
          )
        : String(existing.aliases_json || '[]');
    const overviewMarkdown = String(req.body?.overviewMarkdown ?? existing.overview_markdown ?? '').trim();

    db.prepare(
      `UPDATE technologies
       SET category_id = ?, name = ?, description = ?, icon_symbol = ?, sort_order = ?, is_published = ?, overview_markdown = ?, is_popular = ?, aliases_json = ?, difficulty = ?, brand_color = ?, content_status = ?, featured_order = ?
       WHERE id = ?`
    ).run(
      categoryId,
      name,
      description,
      iconSymbol || '</>',
      Number.isFinite(sortOrder) ? sortOrder : 0,
      isPublished,
      overviewMarkdown,
      isPopular,
      aliasesJson,
      difficulty,
      brandColor,
      contentStatus,
      Number.isFinite(featuredOrder) ? featuredOrder : 0,
      existing.id
    );
    recordAuditLog(req.user!.id, 'cms.technology_updated', 'technology', existing.id, { name, isPublished, sortOrder, contentStatus });
    res.json({ ok: true });
  });

  router.delete('/admin/technologies/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const linked = (
      db.prepare(`SELECT COUNT(*) as c FROM courses WHERE technology_id = ?`).get(req.params.id) as { c: number }
    ).c;
    if (linked > 0) {
      return res.status(409).json({
        error: `Cannot delete technology while ${linked} course(s) reference it. Reassign or unpublish instead.`,
      });
    }
    const result = db.prepare(`DELETE FROM technologies WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Technology not found.' });
    recordAuditLog(req.user!.id, 'cms.technology_deleted', 'technology', String(req.params.id));
    res.json({ ok: true });
  });

  router.post('/admin/learning-paths', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const difficulty = String(req.body?.difficulty || 'Beginner').trim();
    const estimatedHours = Math.max(1, Number(req.body?.estimatedHours || 12));
    const targetRole = String(req.body?.targetRole || '').trim();
    const courseIds = Array.isArray(req.body?.courseIds) ? req.body.courseIds.map(String) : [];
    if (title.length < 3 || description.length < 8) {
      return res.status(400).json({ error: 'Path title and description are required.' });
    }
    const id = `path_${Date.now()}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-3)}`;
    db.prepare(
      `INSERT INTO learning_paths (id, title, slug, description, difficulty, estimated_hours, target_role, course_ids_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, title, slug, description, difficulty, estimatedHours, targetRole, JSON.stringify(courseIds));
    recordAuditLog(req.user!.id, 'cms.learning_path_created', 'learning_path', id, { title });
    res.status(201).json({ ok: true, id, slug });
  });

  router.post('/admin/courses', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const categoryId = String(req.body?.categoryId || 'cat_web');
    const technologyId = String(req.body?.technologyId || 'tech_ts');
    const difficulty = String(req.body?.difficulty || 'Intermediate');
    const estimatedHours = Math.max(1, Number(req.body?.estimatedHours || 8));
    const status = ['draft', 'published', 'archived'].includes(String(req.body?.status)) ? String(req.body.status) : 'published';
    const isPublished = status === 'published' ? 1 : 0;

    if (title.length < 4 || description.length < 10) {
      return res.status(400).json({ error: 'Course title and description are required.' });
    }
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-4)}`;
    const id = `crs_${Date.now()}`;
    const modId = `mod_${Date.now()}`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '["Complete practical module exercises"]', ?, ?, ?, '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', ?, ?, ?)`
    ).run(id, categoryId, technologyId, title, slug, description, difficulty, estimatedHours, req.user!.id, isPublished, status, now);

    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, 'Module 1: Core Concepts', 'Getting Started', 1)`).run(
      modId,
      id
    );
    db.prepare(
      `INSERT INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, access_tier, duration_minutes, status, version, sort_order)
       VALUES (?, ?, ?, 'Introduction & Setup', 'intro-setup', 'Getting Started', ?, ?, 'free', 15, ?, 1, 1)`
    ).run(`les_${Date.now()}`, modId, id, 'Overview of course goals and environment setup.', `### Welcome to ${title}\n\n${description}`, status);

    recordAuditLog(req.user!.id, 'cms.course_created', 'course', id, { title, status });
    res.status(201).json({ ok: true, id, slug, moduleId: modId });
  });

  router.patch('/admin/courses/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT * FROM courses WHERE id = ?`).get(req.params.id) as
      | (Record<string, unknown> & { id: string })
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Course not found.' });

    const title = String(req.body?.title ?? existing.title).trim();
    const description = String(req.body?.description ?? existing.description).trim();
    const categoryId = String(req.body?.categoryId ?? existing.category_id);
    const technologyId = String(req.body?.technologyId ?? existing.technology_id);
    const difficulty = String(req.body?.difficulty ?? existing.difficulty);
    const estimatedHours = req.body?.estimatedHours !== undefined ? Math.max(1, Number(req.body.estimatedHours)) : Number(existing.estimated_hours);
    const validWorkflow = ['draft', 'review', 'approved', 'published', 'archived'];
    const rawWorkflow = req.body?.workflowStatus ? String(req.body.workflowStatus) : '';
    const rawStatus = req.body?.status ? String(req.body.status) : '';
    const workflowStatus = validWorkflow.includes(rawWorkflow)
      ? rawWorkflow
      : validWorkflow.includes(rawStatus)
        ? rawStatus
        : String(existing.workflow_status || existing.status || 'published');
    const status = workflowStatus === 'published' ? 'published' : workflowStatus === 'archived' ? 'archived' : 'draft';
    const isPublished = workflowStatus === 'published' ? 1 : 0;
    const completionRule = ['all_lessons', 'lessons_and_assessments', 'all_requirements'].includes(String(req.body?.completionRule))
      ? String(req.body.completionRule)
      : String(existing.completion_rule || 'all_lessons');

    if (String(existing.status) === 'published' || Number(existing.is_published) === 1) {
      createContentRevisionSnapshot('course', existing.id, req.user!.id, 'Auto-snapshot before course update');
    }

    db.prepare(
      `UPDATE courses SET title = ?, description = ?, category_id = ?, technology_id = ?, difficulty = ?, estimated_hours = ?, status = ?, workflow_status = ?, is_published = ?, completion_rule = ?, updated_at = ? WHERE id = ?`
    ).run(title, description, categoryId, technologyId, difficulty, estimatedHours, status, workflowStatus, isPublished, completionRule, new Date().toISOString(), existing.id);

    recordAuditLog(req.user!.id, 'cms.course_updated', 'course', existing.id, { title, status, workflowStatus, completionRule });
    res.json({ ok: true, workflowStatus, status });
  });

  router.post('/admin/courses/:id/modules', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const course = db.prepare(`SELECT id FROM courses WHERE id = ?`).get(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found.' });
    const title = String(req.body?.title || '').trim();
    const topic = String(req.body?.topic || '').trim();
    if (title.length < 3) return res.status(400).json({ error: 'Module title is required.' });
    const maxSort = (
      db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM modules WHERE course_id = ?`).get(req.params.id) as { m: number }
    ).m;
    const id = `mod_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
      id,
      req.params.id,
      title,
      topic || title,
      maxSort + 1
    );
    recordAuditLog(req.user!.id, 'cms.module_created', 'module', id, { courseId: req.params.id, title });
    res.status(201).json({ ok: true, id });
  });

  router.post('/admin/lessons', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const courseId = String(req.body?.courseId || '').trim();
    const moduleId = String(req.body?.moduleId || '').trim();
    const title = String(req.body?.title || '').trim();
    const topicName = String(req.body?.topicName || title).trim();
    const summary = String(req.body?.summary || '').trim();
    const contentMarkdown = String(req.body?.contentMarkdown || '').trim();
    const codeExample = String(req.body?.codeExample || '');
    const language = String(req.body?.language || 'javascript');
    const accessTier = req.body?.accessTier === 'premium' ? 'premium' : 'free';
    const durationMinutes = Math.max(3, Number(req.body?.durationMinutes || 15));
    const exercisePrompt = String(req.body?.exercisePrompt || '');
    const starterCode = String(req.body?.starterCode || '');
    const solutionHint = String(req.body?.solutionHint || '');
    const status = ['draft', 'published', 'archived'].includes(String(req.body?.status)) ? String(req.body.status) : 'published';

    if (!courseId || !moduleId || title.length < 3 || !contentMarkdown) {
      return res.status(400).json({ error: 'Course, module, title, and lesson content markdown are required.' });
    }
    const maxSort = (
      db.prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM lessons WHERE module_id = ?`).get(moduleId) as { m: number }
    ).m;
    const id = `les_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString().slice(-3)}`;

    db.prepare(
      `INSERT INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, code_example, language, access_tier, duration_minutes, exercise_prompt, starter_code, solution_hint, status, workflow_status, author_id, version, sort_order, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
    ).run(
      id,
      moduleId,
      courseId,
      title,
      slug,
      topicName,
      summary || title,
      contentMarkdown,
      codeExample,
      language,
      accessTier,
      durationMinutes,
      exercisePrompt,
      starterCode,
      solutionHint,
      status,
      status,
      req.user!.id,
      maxSort + 1,
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'cms.lesson_created', 'lesson', id, { courseId, title, status });
    res.status(201).json({ ok: true, id, slug });
  });

  router.patch('/admin/lessons/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const existing = db.prepare(`SELECT * FROM lessons WHERE id = ?`).get(req.params.id) as
      | (Record<string, unknown> & { id: string })
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Lesson not found.' });

    const title = String(req.body?.title ?? existing.title).trim();
    const topicName = String(req.body?.topicName ?? existing.topic_name ?? '').trim();
    const summary = String(req.body?.summary ?? existing.summary).trim();
    const contentMarkdown = String(req.body?.contentMarkdown ?? existing.content_markdown);
    const codeExample = String(req.body?.codeExample ?? existing.code_example ?? '');
    const language = String(req.body?.language ?? existing.language ?? 'javascript');
    const accessTier = req.body?.accessTier === 'premium' || req.body?.accessTier === 'free' ? req.body.accessTier : existing.access_tier;
    const durationMinutes =
      req.body?.durationMinutes !== undefined ? Math.max(3, Number(req.body.durationMinutes)) : Number(existing.duration_minutes || 15);
    const exercisePrompt = String(req.body?.exercisePrompt ?? existing.exercise_prompt ?? '');
    const starterCode = String(req.body?.starterCode ?? existing.starter_code ?? '');
    const validWorkflow = ['draft', 'review', 'approved', 'published', 'archived'];
    const rawWorkflow = req.body?.workflowStatus ? String(req.body.workflowStatus) : '';
    const rawStatus = req.body?.status ? String(req.body.status) : '';
    const workflowStatus = validWorkflow.includes(rawWorkflow)
      ? rawWorkflow
      : validWorkflow.includes(rawStatus)
        ? rawStatus
        : String(existing.workflow_status || existing.status || 'published');
    const status = workflowStatus === 'published' ? 'published' : workflowStatus === 'archived' ? 'archived' : 'draft';

    createContentRevisionSnapshot(
      'lesson',
      existing.id,
      req.user!.id,
      String(req.body?.changeSummary || `Auto-snapshot before lesson edit (${workflowStatus})`)
    );

    db.prepare(
      `UPDATE lessons SET title = ?, topic_name = ?, summary = ?, content_markdown = ?, code_example = ?, language = ?, access_tier = ?, duration_minutes = ?, exercise_prompt = ?, starter_code = ?, status = ?, workflow_status = ?, version = version + 1, updated_at = ? WHERE id = ?`
    ).run(
      title,
      topicName,
      summary,
      contentMarkdown,
      codeExample,
      language,
      accessTier,
      durationMinutes,
      exercisePrompt,
      starterCode,
      status,
      workflowStatus,
      new Date().toISOString(),
      existing.id
    );
    recordAuditLog(req.user!.id, 'cms.lesson_updated', 'lesson', existing.id, { title, status, workflowStatus });
    res.json({ ok: true, status, workflowStatus });
  });

  // Bulk Curriculum Export (JSON or CSV)
  router.get('/admin/curriculum/export', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const format = String(req.query.format || 'json').toLowerCase();
    const categories = db.prepare(`SELECT * FROM categories ORDER BY sort_order ASC`).all();
    const technologies = db.prepare(`SELECT * FROM technologies ORDER BY sort_order ASC, name ASC`).all();
    const learningPaths = db.prepare(`SELECT * FROM learning_paths`).all();
    const courses = db.prepare(`SELECT * FROM courses ORDER BY created_at ASC`).all() as Array<Record<string, unknown>>;
    const modules = db.prepare(`SELECT * FROM modules ORDER BY sort_order ASC`).all() as Array<Record<string, unknown>>;
    const lessons = db.prepare(`SELECT * FROM lessons ORDER BY sort_order ASC`).all() as Array<Record<string, unknown>>;

    if (format === 'csv') {
      const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const header = ['course_id', 'course_title', 'course_slug', 'difficulty', 'module_title', 'lesson_id', 'lesson_title', 'topic_name', 'access_tier', 'language', 'status'].join(',');
      const lines = lessons.map((l) => {
        const course = courses.find((c) => c.id === l.course_id) || {};
        const mod = modules.find((m) => m.id === l.module_id) || {};
        return [
          esc(course.id),
          esc(course.title),
          esc(course.slug),
          esc(course.difficulty),
          esc(mod.title),
          esc(l.id),
          esc(l.title),
          esc(l.topic_name),
          esc(l.access_tier),
          esc(l.language),
          esc(l.status),
        ].join(',');
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="braincode-curriculum-export.csv"');
      return res.send([header, ...lines].join('\n'));
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      categories,
      technologies,
      learningPaths,
      courses: courses.map((c) => ({
        ...c,
        modules: modules
          .filter((m) => m.course_id === c.id)
          .map((m) => ({
            ...m,
            lessons: lessons.filter((l) => l.module_id === m.id),
          })),
      })),
    });
  });

  // Bulk Validated Curriculum Import (JSON structure or CSV rows)
  router.post('/admin/curriculum/import', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const mode = req.body?.publishImmediately ? 'published' : 'draft';
    const rawJson = req.body?.data;
    const csvText = typeof req.body?.csv === 'string' ? req.body.csv.trim() : '';

    if (!rawJson && !csvText) {
      return res.status(400).json({ error: 'Provide either a structured JSON `data` object or a `csv` string to import.' });
    }

    const now = new Date().toISOString();
    let importedCategories = 0;
    let importedTechnologies = 0;
    let importedCourses = 0;
    let importedLessons = 0;

    if (csvText) {
      const rows = csvText.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
      if (rows.length < 2) {
        return res.status(400).json({ error: 'CSV import must contain a header row and at least one lesson row.' });
      }
      const headers = rows[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      if (!headers.includes('course_title') || !headers.includes('lesson_title')) {
        return res.status(400).json({ error: 'CSV header must include at least `course_title` and `lesson_title` columns.' });
      }

      const defaultCat = (db.prepare(`SELECT id FROM categories LIMIT 1`).get() as { id: string } | undefined)?.id || 'cat_web_dev';
      const defaultTech = (db.prepare(`SELECT id FROM technologies LIMIT 1`).get() as { id: string } | undefined)?.id || 'tech_python';

      try {
        db.exec('BEGIN');
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map((c: string) => c.trim().replace(/^"|"$/g, ''));
          const getCol = (name: string) => {
            const idx = headers.indexOf(name);
            return idx >= 0 ? cols[idx] || '' : '';
          };
          const courseTitle = getCol('course_title');
          const lessonTitle = getCol('lesson_title');
          if (!courseTitle || !lessonTitle) {
            throw new Error(`Row ${i + 1} is missing required course_title or lesson_title.`);
          }
          const courseSlug = (getCol('course_slug') || courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');
          let courseRow = db.prepare(`SELECT id FROM courses WHERE slug = ?`).get(courseSlug) as { id: string } | undefined;
          if (!courseRow) {
            const cid = `crs_imp_${Date.now()}_${i}`;
            db.prepare(
              `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, '["Imported curriculum unit"]', ?, 6, ?, '/src/assets/images/course_fullstack_architecture_1794920076647.jpg', ?, ?, ?)`
            ).run(
              cid,
              defaultCat,
              defaultTech,
              courseTitle,
              courseSlug,
              `${courseTitle} imported curriculum track.`,
              getCol('difficulty') || 'Beginner',
              req.user!.id,
              mode === 'published' ? 1 : 0,
              mode,
              now
            );
            courseRow = { id: cid };
            importedCourses += 1;
          }

          const modTitle = getCol('module_title') || 'Module 1: Imported Unit';
          let modRow = db.prepare(`SELECT id FROM modules WHERE course_id = ? AND title = ?`).get(courseRow.id, modTitle) as
            | { id: string }
            | undefined;
          if (!modRow) {
            const mid = `mod_imp_${Date.now()}_${i}`;
            db.prepare(`INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)`).run(
              mid,
              courseRow.id,
              modTitle,
              modTitle,
              i
            );
            modRow = { id: mid };
          }

          const lid = getCol('lesson_id') || `les_imp_${Date.now()}_${i}`;
          const lslug = `${lessonTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`;
          db.prepare(
            `INSERT INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, language, access_tier, duration_minutes, status, version, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?, 1, ?)
             ON CONFLICT(id) DO UPDATE SET title = excluded.title, topic_name = excluded.topic_name, status = excluded.status, version = lessons.version + 1`
          ).run(
            lid,
            modRow.id,
            courseRow.id,
            lessonTitle,
            lslug,
            getCol('topic_name') || lessonTitle,
            `${lessonTitle} overview.`,
            `### ${lessonTitle}\n\nImported curriculum lesson content.`,
            getCol('language') || 'javascript',
            getCol('access_tier') === 'premium' ? 'premium' : 'free',
            mode,
            i
          );
          importedLessons += 1;
        }
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        return res.status(400).json({ error: (err as Error).message || 'Invalid CSV curriculum payload.' });
      }

      recordAuditLog(req.user!.id, 'cms.curriculum_imported_csv', 'curriculum', 'bulk', {
        importedCourses,
        importedLessons,
        mode,
      });
      return res.status(201).json({ ok: true, importedCategories, importedTechnologies, importedCourses, importedLessons, mode });
    }

    // Structured JSON import
    if (typeof rawJson !== 'object' || rawJson === null) {
      return res.status(400).json({ error: 'JSON import payload must be an object containing categories, technologies, or courses.' });
    }
    const payload = rawJson as {
      categories?: Array<Record<string, unknown>>;
      technologies?: Array<Record<string, unknown>>;
      courses?: Array<Record<string, unknown>>;
    };

    try {
      db.exec('BEGIN');
      if (Array.isArray(payload.categories)) {
        for (const cat of payload.categories) {
          const name = String(cat.name || '').trim();
          const slug = String(cat.slug || '').trim();
          if (!name || !slug) throw new Error('Every imported category requires both `name` and `slug`.');
          db.prepare(
            `INSERT INTO categories (id, name, slug, description, sort_order) VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description`
          ).run(
            String(cat.id || `cat_imp_${slug}`),
            name,
            slug,
            String(cat.description || `${name} track`),
            Number(cat.sort_order ?? 50)
          );
          importedCategories += 1;
        }
      }

      if (Array.isArray(payload.technologies)) {
        for (const tech of payload.technologies) {
          const name = String(tech.name || '').trim();
          const slug = String(tech.slug || '').trim();
          const catId = String(tech.category_id || tech.categoryId || 'cat_web_dev');
          if (!name || !slug) throw new Error('Every imported technology requires both `name` and `slug`.');
          db.prepare(
            `INSERT INTO technologies (id, category_id, name, slug, description, icon_symbol, sort_order, is_published, overview_markdown, is_popular)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(slug) DO UPDATE SET name = excluded.name, description = excluded.description, overview_markdown = excluded.overview_markdown`
          ).run(
            String(tech.id || `tech_imp_${slug}`),
            catId,
            name,
            slug,
            String(tech.description || `${name} learning track`),
            String(tech.icon_symbol || name.slice(0, 3).toUpperCase()),
            Number(tech.sort_order ?? 50),
            mode === 'published' ? 1 : 0,
            String(tech.overview_markdown || tech.description || ''),
            tech.is_popular ? 1 : 0
          );
          importedTechnologies += 1;
        }
      }

      if (Array.isArray(payload.courses)) {
        for (const course of payload.courses) {
          const title = String(course.title || '').trim();
          const slug = String(course.slug || '').trim();
          if (!title || !slug) throw new Error('Every imported course requires both `title` and `slug`.');
          const courseId = String(course.id || `crs_imp_${slug}`);
          const categoryId = String(course.category_id || course.categoryId || 'cat_web_dev');
          const technologyId = String(course.technology_id || course.technologyId || 'tech_python');

          db.prepare(
            `INSERT INTO courses (id, category_id, technology_id, title, slug, description, objectives_json, difficulty, estimated_hours, instructor_id, thumbnail_url, is_published, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(slug) DO UPDATE SET title = excluded.title, description = excluded.description, status = excluded.status, is_published = excluded.is_published`
          ).run(
            courseId,
            categoryId,
            technologyId,
            title,
            slug,
            String(course.description || `${title} structured course.`),
            JSON.stringify(Array.isArray(course.objectives) ? course.objectives : ['Complete core modules and assessments.']),
            String(course.difficulty || 'Beginner'),
            Math.max(1, Number(course.estimated_hours ?? 8)),
            req.user!.id,
            String(course.thumbnail_url || '/src/assets/images/course_fullstack_architecture_1794920076647.jpg'),
            mode === 'published' ? 1 : 0,
            mode,
            now
          );
          importedCourses += 1;

          const mods = Array.isArray(course.modules) ? (course.modules as Array<Record<string, unknown>>) : [];
          mods.forEach((mod, mIdx) => {
            const modTitle = String(mod.title || '').trim();
            if (!modTitle) throw new Error(`Course "${title}" has a module missing a title.`);
            const modId = String(mod.id || `mod_imp_${courseId}_${mIdx}`);
            db.prepare(
              `INSERT INTO modules (id, course_id, title, topic, sort_order) VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET title = excluded.title, topic = excluded.topic`
            ).run(modId, courseId, modTitle, String(mod.topic || modTitle), Number(mod.sort_order ?? mIdx + 1));

            const less = Array.isArray(mod.lessons) ? (mod.lessons as Array<Record<string, unknown>>) : [];
            less.forEach((les, lIdx) => {
              const lesTitle = String(les.title || '').trim();
              if (!lesTitle) throw new Error(`Module "${modTitle}" has a lesson missing a title.`);
              const lesId = String(les.id || `les_imp_${modId}_${lIdx}`);
              db.prepare(
                `INSERT INTO lessons (id, module_id, course_id, title, slug, topic_name, summary, content_markdown, code_example, language, access_tier, duration_minutes, exercise_prompt, starter_code, solution_hint, status, version, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                 ON CONFLICT(id) DO UPDATE SET title = excluded.title, content_markdown = excluded.content_markdown, status = excluded.status, version = lessons.version + 1`
              ).run(
                lesId,
                modId,
                courseId,
                lesTitle,
                String(les.slug || `${lesTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${lIdx}`),
                String(les.topic_name || lesTitle),
                String(les.summary || lesTitle),
                String(les.content_markdown || `### ${lesTitle}`),
                String(les.code_example || ''),
                String(les.language || 'javascript'),
                les.access_tier === 'premium' ? 'premium' : 'free',
                Math.max(3, Number(les.duration_minutes ?? 15)),
                String(les.exercise_prompt || ''),
                String(les.starter_code || ''),
                String(les.solution_hint || ''),
                mode,
                Number(les.sort_order ?? lIdx + 1)
              );
              importedLessons += 1;
            });
          });
        }
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: (err as Error).message || 'Invalid JSON curriculum structure.' });
    }

    recordAuditLog(req.user!.id, 'cms.curriculum_imported_json', 'curriculum', 'bulk', {
      importedCategories,
      importedTechnologies,
      importedCourses,
      importedLessons,
      mode,
    });
    return res.status(201).json({
      ok: true,
      importedCategories,
      importedTechnologies,
      importedCourses,
      importedLessons,
      mode,
    });
  });

  // Certificates Endpoints (Verified Completion Required)
  router.get('/certificates', requireAuth, (req: AuthenticatedRequest, res) => {
    const certificates = db
      .prepare(
        `SELECT cert.*, c.slug as course_slug, cat.name as category_name, t.name as technology_name
         FROM certificates cert
         JOIN courses c ON c.id = cert.course_id
         LEFT JOIN categories cat ON cat.id = c.category_id
         LEFT JOIN technologies t ON t.id = c.technology_id
         WHERE cert.user_id = ?
         ORDER BY cert.issued_at DESC`
      )
      .all(req.user!.id);

    const pathCertificates = db
      .prepare(`SELECT * FROM path_certificates WHERE user_id = ? ORDER BY issued_at DESC`)
      .all(req.user!.id);

    const eligibleCourses = (
      db
        .prepare(
          `SELECT c.id, c.title, c.slug, c.difficulty, c.completion_rule,
                  (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id AND l.status = 'published') as total_lessons,
                  (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE lp.course_id = c.id AND lp.user_id = ? AND lp.completed = 1 AND l.status = 'published') as completed_lessons
           FROM enrollments e
           JOIN courses c ON c.id = e.course_id
           WHERE e.user_id = ?`
        )
        .all(req.user!.id, req.user!.id) as Array<Record<string, unknown>>
    ).map((c) => ({
      ...c,
      eligibility: checkCourseCertificateEligibility(String(c.id), req.user!.id),
    }));

    res.json({ certificates, pathCertificates, eligibleCourses });
  });

  router.post('/certificates/claim/:courseId', requireAuth, (req: AuthenticatedRequest, res) => {
    const course = db
      .prepare(`SELECT id, title, slug, is_published, status FROM courses WHERE id = ?`)
      .get(req.params.courseId) as { id: string; title: string; slug: string; is_published: number; status: string } | undefined;
    if (!course) return res.status(404).json({ error: 'Course not found.' });

    const isPrivileged = req.user!.role === 'admin' || req.user!.role === 'instructor';
    if (!isPrivileged && (Number(course.is_published) !== 1 || String(course.status) !== 'published')) {
      return res.status(403).json({
        code: 'COURSE_NOT_PUBLISHED',
        error: 'Certificates cannot be claimed for unpublished courses.',
      });
    }

    const existing = db
      .prepare(`SELECT * FROM certificates WHERE user_id = ? AND course_id = ?`)
      .get(req.user!.id, course.id) as (Record<string, unknown> & { status?: string }) | undefined;
    if (existing) {
      if (String(existing.status || 'active') === 'revoked') {
        return res.status(403).json({
          code: 'CERTIFICATE_REVOKED',
          error: 'This certificate was revoked by an administrator. Contact support for reinstatement.',
          certificate: existing,
        });
      }
      return res.json({ ok: true, alreadyIssued: true, certificate: existing });
    }

    const eligibility = checkCourseCertificateEligibility(course.id, req.user!.id);
    if (!eligibility.eligible) {
      return res.status(400).json({
        error: eligibility.reason,
        eligibility,
      });
    }

    const certId = `cert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const code = `CERT-BC-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const issuedAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO certificates (id, user_id, course_id, course_title, learner_name, certificate_code, issued_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`
    ).run(certId, req.user!.id, course.id, course.title, req.user!.full_name, code, issuedAt);

    awardXpAndBadges(req.user!.id, 100);
    recordAuditLog(req.user!.id, 'certificate.issued', 'certificate', certId, { courseId: course.id, code });
    notifyWithRealtime(
      req.user!.id,
      'achievement',
      'Course Certificate Issued',
      `Your verified Braincode certificate for ${course.title} (${code}) is ready.`,
      '/courses'
    );

    const created = db.prepare(`SELECT * FROM certificates WHERE id = ?`).get(certId);
    return res.status(201).json({ ok: true, alreadyIssued: false, certificate: created });
  });

  router.get('/certificates/verify/:code', (req, res) => {
    const cert = db
      .prepare(
        `SELECT certificate_code, learner_name, course_title, issued_at, status, revoked_at, revocation_reason
         FROM certificates WHERE certificate_code = ?`
      )
      .get(req.params.code) as (Record<string, unknown> & { status?: string; revoked_at?: string; revocation_reason?: string }) | undefined;
    if (cert) {
      const isRevoked = String(cert.status || 'active') === 'revoked';
      return res.json({
        valid: !isRevoked,
        revoked: isRevoked,
        status: isRevoked ? 'revoked' : 'active',
        message: isRevoked
          ? `This certificate was revoked on ${(cert.revoked_at || '').slice(0, 10)}${cert.revocation_reason ? `: ${cert.revocation_reason}` : '.'}`
          : 'Verified authentic Braincode completion certificate.',
        type: 'course',
        certificate: cert,
      });
    }
    const pcert = db
      .prepare(
        `SELECT certificate_code, learner_name, path_title as course_title, issued_at, status, revoked_at, revocation_reason
         FROM path_certificates WHERE certificate_code = ?`
      )
      .get(req.params.code) as (Record<string, unknown> & { status?: string; revoked_at?: string; revocation_reason?: string }) | undefined;
    if (pcert) {
      const isRevoked = String(pcert.status || 'active') === 'revoked';
      return res.json({
        valid: !isRevoked,
        revoked: isRevoked,
        status: isRevoked ? 'revoked' : 'active',
        message: isRevoked
          ? `This learning path certificate was revoked on ${(pcert.revoked_at || '').slice(0, 10)}${pcert.revocation_reason ? `: ${pcert.revocation_reason}` : '.'}`
          : 'Verified authentic Braincode learning path certificate.',
        type: 'learning_path',
        certificate: pcert,
      });
    }
    return res.status(404).json({ valid: false, revoked: false, error: 'Certificate verification code not found.' });
  });

  router.post('/admin/resources', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const title = String(req.body?.title || '').trim();
    const summary = String(req.body?.summary || '').trim();
    const contentMarkdown = String(req.body?.contentMarkdown || '').trim();
    const type = String(req.body?.type || 'guide');
    const category = String(req.body?.category || 'Guides');
    const technology = String(req.body?.technology || 'Braincode');
    if (!title || !contentMarkdown) {
      return res.status(400).json({ error: 'Resource title and markdown content are required.' });
    }
    const id = `res_${Date.now()}`;
    db.prepare(
      `INSERT INTO resources (id, title, category, technology, type, summary, content_markdown, code_snippet, video_url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      title,
      category,
      technology,
      type,
      summary,
      contentMarkdown,
      String(req.body?.codeSnippet || ''),
      String(req.body?.videoUrl || ''),
      new Date().toISOString()
    );
    recordAuditLog(req.user!.id, 'cms.resource_created', 'resource', id, { title });
    res.status(201).json({ ok: true, id });
  });

  router.patch('/admin/assessments/attempts/:id', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const score = Number(req.body?.score);
    const notes = String(req.body?.instructorNotes || '');
    const attempt = db
      .prepare(
        `SELECT aa.user_id, aa.score as prev_score, aa.max_score, aa.passed as prev_passed, aa.assessment_id,
                a.passing_score_pct, a.xp_reward
         FROM assessment_attempts aa
         JOIN assessments a ON a.id = aa.assessment_id
         WHERE aa.id = ?`
      )
      .get(req.params.id) as
      | {
          user_id: string;
          prev_score: number;
          max_score: number;
          prev_passed: number;
          assessment_id: string;
          passing_score_pct?: number;
          xp_reward?: number;
        }
      | undefined;
    if (!attempt) return res.status(404).json({ error: 'Attempt not found.' });

    const safeMax = Math.max(1, Number(attempt.max_score || 1));
    const boundedScore = Math.min(safeMax, Math.max(0, Number.isFinite(score) ? Math.round(score) : 0));
    const percentage = Math.round((boundedScore / safeMax) * 100);
    const passingThreshold = Number(attempt.passing_score_pct || 70);
    const passed = percentage >= passingThreshold ? 1 : 0;

    db.prepare(
      `UPDATE assessment_attempts SET score = ?, percentage = ?, passed = ?, status = 'graded', instructor_notes = ? WHERE id = ?`
    ).run(boundedScore, percentage, passed, notes, req.params.id);

    // Award XP delta when grading increases score or brings learner across pass threshold
    let xpAwarded = 0;
    const rewardPool = Number(attempt.xp_reward || 0);
    if (rewardPool > 0 && boundedScore > attempt.prev_score) {
      const prevXpEst = Math.round((Math.max(0, attempt.prev_score) / safeMax) * rewardPool);
      const newXpEst = Math.round((boundedScore / safeMax) * rewardPool);
      xpAwarded = Math.max(0, newXpEst - prevXpEst);
      if (xpAwarded > 0) {
        awardXpAndBadges(attempt.user_id, xpAwarded);
      }
    }

    recordAuditLog(req.user!.id, 'instructor.attempt_graded', 'assessment_attempt', String(req.params.id), {
      score: boundedScore,
      percentage,
      passed: Boolean(passed),
      xpAwarded,
    });
    notifyWithRealtime(
      attempt.user_id,
      'assignment',
      'Assessment Graded',
      `An instructor reviewed your assessment submission (${percentage}% — ${passed ? 'Passed' : 'Needs Review'}): ${notes || 'Score updated.'}`,
      '/dashboard'
    );
    res.json({ ok: true, score: boundedScore, maxScore: safeMax, percentage, passed: Boolean(passed), xpAwarded });
  });

  // =========================================================
  // ADMIN CERTIFICATES MANAGEMENT & STUDENT PROGRESS REPORTING
  // =========================================================
  router.get('/admin/certificates', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const statusFilter = String(req.query.status || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();

    const courseCerts = (
      db
        .prepare(
          `SELECT cert.*, 'course' as certificate_type, u.email as learner_email, u.username as learner_username
           FROM certificates cert
           JOIN users u ON u.id = cert.user_id
           ORDER BY cert.issued_at DESC`
        )
        .all() as Array<Record<string, unknown>>
    );

    const pathCerts = (
      db
        .prepare(
          `SELECT pc.id, pc.user_id, pc.learning_path_id as course_id, pc.path_title as course_title,
                  pc.learner_name, pc.certificate_code, pc.issued_at, pc.status, pc.revoked_at,
                  pc.revoked_by, pc.revocation_reason, 'learning_path' as certificate_type,
                  u.email as learner_email, u.username as learner_username
           FROM path_certificates pc
           JOIN users u ON u.id = pc.user_id
           ORDER BY pc.issued_at DESC`
        )
        .all() as Array<Record<string, unknown>>
    );

    const allCerts = [...courseCerts, ...pathCerts].filter((c) => {
      const st = String(c.status || 'active').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (q) {
        const hay = `${c.certificate_code} ${c.learner_name} ${c.learner_email} ${c.course_title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    res.json({ certificates: allCerts, totalCount: allCerts.length });
  });

  router.patch('/admin/certificates/:id/revoke', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    const reason = String(req.body?.reason || '').trim().slice(0, 400);
    if (reason.length < 3) {
      return res.status(400).json({ error: 'Provide a brief revocation reason (at least 3 characters).' });
    }
    const now = new Date().toISOString();

    let cert = db.prepare(`SELECT id, user_id, course_title, certificate_code, status FROM certificates WHERE id = ?`).get(id) as
      | { id: string; user_id: string; course_title: string; certificate_code: string; status: string }
      | undefined;
    let table: 'certificates' | 'path_certificates' = 'certificates';
    let title = cert?.course_title || '';

    if (!cert) {
      const pcert = db
        .prepare(`SELECT id, user_id, path_title, certificate_code, status FROM path_certificates WHERE id = ?`)
        .get(id) as
        | { id: string; user_id: string; path_title: string; certificate_code: string; status: string }
        | undefined;
      if (!pcert) return res.status(404).json({ error: 'Certificate not found.' });
      table = 'path_certificates';
      title = pcert.path_title;
      cert = {
        id: pcert.id,
        user_id: pcert.user_id,
        course_title: pcert.path_title,
        certificate_code: pcert.certificate_code,
        status: pcert.status,
      };
    }

    db.prepare(
      `UPDATE ${table} SET status = 'revoked', revoked_at = ?, revoked_by = ?, revocation_reason = ? WHERE id = ?`
    ).run(now, req.user!.id, reason, id);

    recordAuditLog(req.user!.id, 'admin.certificate_revoked', table === 'certificates' ? 'certificate' : 'path_certificate', id, {
      code: cert.certificate_code,
      reason,
    });
    notifyWithRealtime(
      cert.user_id,
      'achievement',
      'Certificate Revoked',
      `Your certificate ${cert.certificate_code} for "${title}" was revoked: ${reason}`,
      '/courses'
    );

    const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.json({ ok: true, certificate: updated });
  });

  router.patch('/admin/certificates/:id/reinstate', requireAuth, requireRole('admin'), (req: AuthenticatedRequest, res) => {
    const id = String(req.params.id);
    let cert = db.prepare(`SELECT id, user_id, course_title, certificate_code FROM certificates WHERE id = ?`).get(id) as
      | { id: string; user_id: string; course_title: string; certificate_code: string }
      | undefined;
    let table: 'certificates' | 'path_certificates' = 'certificates';

    if (!cert) {
      const pcert = db
        .prepare(`SELECT id, user_id, path_title as course_title, certificate_code FROM path_certificates WHERE id = ?`)
        .get(id) as { id: string; user_id: string; course_title: string; certificate_code: string } | undefined;
      if (!pcert) return res.status(404).json({ error: 'Certificate not found.' });
      table = 'path_certificates';
      cert = pcert;
    }

    db.prepare(
      `UPDATE ${table} SET status = 'active', revoked_at = '', revoked_by = '', revocation_reason = '' WHERE id = ?`
    ).run(id);

    recordAuditLog(req.user!.id, 'admin.certificate_reinstated', table === 'certificates' ? 'certificate' : 'path_certificate', id, {
      code: cert.certificate_code,
    });
    notifyWithRealtime(
      cert.user_id,
      'achievement',
      'Certificate Reinstated',
      `Your certificate ${cert.certificate_code} for "${cert.course_title}" is active and verified again.`,
      '/courses'
    );

    const updated = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    res.json({ ok: true, certificate: updated });
  });

  router.get('/admin/students/progress', requireAuth, requireRole('admin', 'instructor'), (req: AuthenticatedRequest, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(200, Math.max(10, Number(req.query.limit || 80)));

    const students = (
      db
        .prepare(
          `SELECT u.id, u.full_name, u.username, u.email, u.role, u.status, u.xp, u.level, u.streak_days, u.created_at,
                  (SELECT COUNT(*) FROM enrollments e JOIN courses c ON c.id = e.course_id WHERE e.user_id = u.id AND c.is_published = 1) as enrolled_courses,
                  (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id = lp.lesson_id WHERE lp.user_id = u.id AND lp.completed = 1 AND l.status = 'published') as completed_lessons,
                  (SELECT COUNT(DISTINCT l.id) FROM enrollments e JOIN lessons l ON l.course_id = e.course_id WHERE e.user_id = u.id AND l.status = 'published') as enrolled_lessons_total,
                  (SELECT COUNT(DISTINCT assessment_id) FROM assessment_attempts aa WHERE aa.user_id = u.id AND aa.passed = 1) as assessments_passed,
                  (SELECT COUNT(DISTINCT exercise_id) FROM exercise_submissions es WHERE es.user_id = u.id AND es.is_correct = 1) as exercises_solved,
                  (SELECT COUNT(*) FROM certificates cert WHERE cert.user_id = u.id AND cert.status = 'active') as active_certificates,
                  (SELECT MAX(lp.completed_at) FROM lesson_progress lp WHERE lp.user_id = u.id) as last_lesson_at
           FROM users u
           WHERE u.role = 'learner'
           ORDER BY u.xp DESC, u.created_at DESC
           LIMIT ?`
        )
        .all(limit) as Array<Record<string, unknown>>
    ).filter((s) => {
      if (!q) return true;
      return `${s.full_name} ${s.username} ${s.email}`.toLowerCase().includes(q);
    });

    res.json({ students, totalCount: students.length });
  });

  registerExtendedLearningRoutes(router, { requireAuth, notifyWithRealtime });
  registerCurriculumGovernanceRoutes(router, { requireAuth, notifyWithRealtime });
  registerCurriculumIntelligenceRoutes(router, { requireAuth, notifyWithRealtime });
  registerTechnologyCentreRoutes(router, { requireAuth });

  return router;
}
