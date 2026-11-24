import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [k, ...rest] = part.trim().split('=');
      if (k === 'bc_session') {
        return decodeURIComponent(rest.join('='));
      }
    }
  }
  return null;
}

export function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  username: string;
  avatar_url: string;
  bio: string;
  role: 'learner' | 'instructor' | 'moderator' | 'admin';
  status: 'active' | 'suspended';
  email_verified: number;
  onboarding_completed: number;
  skill_level: string;
  interests_json: string;
  goals_json: string;
  preferred_techs_json: string;
  xp: number;
  level: number;
  streak_days: number;
  public_profile: number;
  show_activity: number;
  allow_messages: number;
  theme_preference: 'dark' | 'light';
  created_at: string;
}

export interface UserEntitlement {
  planSlug: string;
  planName: string;
  isPremium: boolean;
  status: string;
  currentPeriodEnd: string | null;
  limits: {
    aiDailyLimit: number;
    maxWorkspaces: number;
    maxCollabParticipants: number;
    canAccessPremiumCourses: boolean;
    canCreateCommunity: boolean;
    canUseCollabWorkspace: boolean;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  entitlement?: UserEntitlement;
  sessionToken?: string;
}

export function requireRole(...roles: Array<AuthUser['role']>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions for this action.' });
    }
    return next();
  };
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!secret) return true; // Only enforced when a webhook secret is configured
  if (!signatureHeader) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = signatureHeader.replace(/^sha256=/i, '').trim();
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(normalized, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  const hits = new Map<string, number[]>();
  const { windowMs, max, keyPrefix } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const recent = (hits.get(key) || []).filter((ts) => now - ts < windowMs);

    if (recent.length >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: `Too many requests. Please try again in ${retryAfterSec} seconds.`,
      });
    }

    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, list] of hits.entries()) {
        if (list.every((ts) => now - ts >= windowMs)) hits.delete(k);
      }
    }
    return next();
  };
}

