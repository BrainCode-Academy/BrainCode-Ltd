import { GoogleGenAI } from '@google/genai';
import { config } from './config.ts';

export type AiIssueCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_AUTH_INVALID'
  | 'AI_BILLING_REQUIRED'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_UPSTREAM_QUOTA'
  | 'AI_MODEL_NOT_FOUND'
  | 'AI_EMPTY_RESPONSE'
  | 'AI_TRANSIENT_UNAVAILABLE'
  | 'AI_ERROR';

export interface ClassifiedAiError {
  code: AiIssueCode;
  statusCode: number;
  retryable: boolean;
  message: string;
}

export interface AiHealthState {
  status: 'healthy' | 'unconfigured' | 'degraded';
  configured: boolean;
  lastErrorCode: AiIssueCode | 'OK' | null;
  lastErrorMessage: string | null;
  lastCheckedAt: string | null;
  modelName: string;
}

export function getConfiguredGeminiKey(): string {
  const key = (process.env.GEMINI_API_KEY || config.geminiApiKey || '').trim();
  if (!key || key === 'MY_GEMINI_API_KEY') return '';
  return key;
}

export function isGeminiKeyConfigured(): boolean {
  return Boolean(getConfiguredGeminiKey());
}

let lastAiHealthState: AiHealthState = {
  status: isGeminiKeyConfigured() ? 'healthy' : 'unconfigured',
  configured: isGeminiKeyConfigured(),
  lastErrorCode: isGeminiKeyConfigured() ? null : 'AI_NOT_CONFIGURED',
  lastErrorMessage: isGeminiKeyConfigured()
    ? null
    : 'GEMINI_API_KEY is not configured in the server environment.',
  lastCheckedAt: null,
  modelName: config.aiModel || 'gemini-4-hydrogen',
};

export function createAiError(input: {
  code: AiIssueCode;
  statusCode: number;
  retryable?: boolean;
  message?: string;
  userMessage?: string;
  detail?: string;
}): Error & { code: AiIssueCode; statusCode: number; retryable: boolean } {
  const text = input.userMessage || input.message || 'AI service error.';
  const err = new Error(text) as Error & { code: AiIssueCode; statusCode: number; retryable: boolean; detail?: string };
  err.code = input.code;
  err.statusCode = input.statusCode;
  err.retryable = Boolean(input.retryable);
  if (input.detail) err.detail = input.detail;
  return err;
}

export function classifyAiError(err: unknown): ClassifiedAiError {
  const raw = err as {
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
    cause?: { code?: string; message?: string };
  };
  const existingCode = String(raw?.code || '');
  const httpStatus = Number(raw?.status || raw?.statusCode || 0);
  const rawMessage = String(raw?.message || raw?.cause?.message || 'AI service error.');
  const msg = rawMessage.toLowerCase();

  if (existingCode === 'AI_NOT_CONFIGURED' || msg.includes('gemini_api_key is not configured')) {
    return {
      code: 'AI_NOT_CONFIGURED',
      statusCode: 503,
      retryable: false,
      message: 'GEMINI_API_KEY is not configured on the server. Add a valid key in environment secrets to enable AI features.',
    };
  }

  if (existingCode === 'AI_QUOTA_EXCEEDED') {
    return {
      code: 'AI_QUOTA_EXCEEDED',
      statusCode: 429,
      retryable: false,
      message: rawMessage,
    };
  }

  // Billing / payment-required detection (NEVER retry!)
  if (
    httpStatus === 402 ||
    msg.includes('billing') ||
    msg.includes('account_not_enabled') ||
    msg.includes('billing_disabled') ||
    msg.includes('enable billing') ||
    msg.includes('payment required') ||
    msg.includes('credit card')
  ) {
    return {
      code: 'AI_BILLING_REQUIRED',
      statusCode: 402,
      retryable: false,
      message:
        'Gemini API billing is not enabled or requires an active billing account on the linked Google Cloud project. Non-AI learning features remain fully available.',
    };
  }

  // Invalid / revoked API key or permission errors (NEVER retry!)
  if (
    httpStatus === 401 ||
    (httpStatus === 403 && !msg.includes('rate')) ||
    msg.includes('api key not valid') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid api key') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated')
  ) {
    return {
      code: 'AI_AUTH_INVALID',
      statusCode: 503,
      retryable: false,
      message: 'Gemini API authentication failed. Verify that GEMINI_API_KEY is valid and permitted for this model.',
    };
  }

  // Upstream quota / free-tier / resource exhaustion (do NOT loop retries!)
  if (
    httpStatus === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('free_tier') ||
    msg.includes('quota')
  ) {
    return {
      code: 'AI_UPSTREAM_QUOTA',
      statusCode: 429,
      retryable: false,
      message:
        'Gemini API quota limit exceeded on the upstream project. Please wait for quota reset or verify project billing/quota settings before retrying.',
    };
  }

  // Unsupported or retired model ID (NEVER retry!)
  if (
    httpStatus === 404 ||
    (msg.includes('model') && (msg.includes('not found') || msg.includes('not supported') || msg.includes('deprecated')))
  ) {
    return {
      code: 'AI_MODEL_NOT_FOUND',
      statusCode: 400,
      retryable: false,
      message: 'Configured Gemini model is unavailable or unsupported for this API key.',
    };
  }

  // Transient upstream network / overload failures (bounded retry permitted)
  const netCode = String(raw?.cause?.code || raw?.code || '');
  if (
    httpStatus === 502 ||
    httpStatus === 503 ||
    httpStatus === 504 ||
    netCode === 'ECONNRESET' ||
    netCode === 'ETIMEDOUT' ||
    netCode === 'ENOTFOUND' ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('overloaded') ||
    msg.includes('fetch failed')
  ) {
    return {
      code: 'AI_TRANSIENT_UNAVAILABLE',
      statusCode: 503,
      retryable: true,
      message: 'Gemini API is temporarily unreachable or overloaded. Please try again shortly.',
    };
  }

  return {
    code: 'AI_ERROR',
    statusCode: httpStatus >= 400 && httpStatus < 600 ? httpStatus : 500,
    retryable: false,
    message: rawMessage.replace(/AIza[0-9A-Za-z_-]{15,}/g, '[REDACTED_KEY]'),
  };
}

export function recordAiHealthSuccess(modelName: string): void {
  lastAiHealthState = {
    status: 'healthy',
    configured: true,
    lastErrorCode: 'OK',
    lastErrorMessage: null,
    lastCheckedAt: new Date().toISOString(),
    modelName,
  };
}

export function recordAiHealthFailure(
  errOrClassified: unknown,
  modelName = config.aiModel || 'gemini-4-hydrogen'
): ClassifiedAiError {
  const maybe = errOrClassified as Partial<ClassifiedAiError> | null;
  const classified: ClassifiedAiError =
    maybe &&
    typeof maybe.code === 'string' &&
    typeof maybe.statusCode === 'number' &&
    typeof maybe.retryable === 'boolean' &&
    typeof maybe.message === 'string'
      ? (maybe as ClassifiedAiError)
      : classifyAiError(errOrClassified);

  lastAiHealthState = {
    status: classified.code === 'AI_NOT_CONFIGURED' ? 'unconfigured' : 'degraded',
    configured: classified.code !== 'AI_NOT_CONFIGURED' && isGeminiKeyConfigured(),
    lastErrorCode: classified.code,
    lastErrorMessage: classified.message,
    lastCheckedAt: new Date().toISOString(),
    modelName,
  };
  return classified;
}

export function getAiHealthState(): AiHealthState {
  if (!isGeminiKeyConfigured()) {
    return {
      status: 'unconfigured',
      configured: false,
      lastErrorCode: 'AI_NOT_CONFIGURED',
      lastErrorMessage: 'GEMINI_API_KEY is not configured in the server environment.',
      lastCheckedAt: lastAiHealthState.lastCheckedAt,
      modelName: lastAiHealthState.modelName || config.aiModel || 'gemini-4-hydrogen',
    };
  }
  return {
    ...lastAiHealthState,
    configured: true,
  };
}

/**
 * Single non-retrying health check explicitly triggered by an admin.
 * Does NOT retry on quota, billing, or auth errors.
 */
export async function probeGeminiHealthOnce(
  modelName: string
): Promise<{ ok: boolean; configured: boolean; health: AiHealthState }> {
  const key = getConfiguredGeminiKey();
  if (!key) {
    lastAiHealthState = {
      status: 'unconfigured',
      configured: false,
      lastErrorCode: 'AI_NOT_CONFIGURED',
      lastErrorMessage: 'GEMINI_API_KEY is not configured in the server environment.',
      lastCheckedAt: new Date().toISOString(),
      modelName,
    };
    return { ok: false, configured: false, health: lastAiHealthState };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
    const res = await ai.models.generateContent({
      model: modelName,
      contents: 'Respond with exactly: OK',
    });
    if ((res.text || '').trim()) {
      recordAiHealthSuccess(modelName);
      return { ok: true, configured: true, health: lastAiHealthState };
    }
    lastAiHealthState = {
      status: 'degraded',
      configured: true,
      lastErrorCode: 'AI_EMPTY_RESPONSE',
      lastErrorMessage: 'Gemini responded with empty output during probe.',
      lastCheckedAt: new Date().toISOString(),
      modelName,
    };
  } catch (err) {
    const classified = classifyAiError(err);
    recordAiHealthFailure(classified, modelName);
  }
  return { ok: false, configured: true, health: lastAiHealthState };
}
