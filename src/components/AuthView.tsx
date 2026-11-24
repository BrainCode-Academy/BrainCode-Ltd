import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { UserEntitlement, UserProfile } from '../types';

type AuthMode = 'login' | 'signup' | 'forgot' | 'verify';

interface AuthViewProps {
  initialMode?: AuthMode;
  onBackHome: () => void;
  onSuccessRedirect: (user: UserProfile) => void;
}

export function AuthView({ initialMode = 'login', onBackHome, onSuccessRedirect }: AuthViewProps) {
  const { loginSuccess, capabilities, brand, refreshSession } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Verification / Reset fields
  const [tokenInput, setTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devHelperToken, setDevHelperToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setError(null);
    setSuccessMsg(null);
    setDevHelperToken(null);
    setMode(next);
  };

  const passwordStrength = useMemo(() => {
    const val = mode === 'forgot' ? newPassword : password;
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const labels = ['Too short', 'Weak', 'Fair', 'Strong', 'Very strong'];
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-amber-400', 'bg-[#0A84FF]', 'bg-emerald-500'];
    return { score, label: val ? labels[score] : 'Min 8 chars, 1 uppercase, 1 number', color: colors[score] };
  }, [password, newPassword, mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: UserProfile; entitlement: UserEntitlement }>(
        '/auth/login',
        { email: email.trim(), password, rememberMe }
      );
      loginSuccess(res.token, res.user, res.entitlement, rememberMe);
      onSuccessRedirect(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and contain 1 uppercase letter and 1 number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{
        token: string;
        user: UserProfile;
        entitlement: UserEntitlement;
        verificationNotice?: { devVerificationToken?: string; message?: string };
      }>('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        acceptedTerms,
      });
      loginSuccess(res.token, res.user, res.entitlement, true);
      if (res.verificationNotice?.devVerificationToken) {
        setDevHelperToken(res.verificationNotice.devVerificationToken);
        setTokenInput(res.verificationNotice.devVerificationToken);
        setSuccessMsg('Account created. Verify your email below or proceed directly to onboarding.');
        setMode('verify');
      } else {
        onSuccessRedirect(res.user);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Account creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ ok: boolean; user: UserProfile }>('/auth/verify-email', {
        token: tokenInput.trim(),
      });
      await refreshSession();
      setSuccessMsg('Email verified successfully.');
      onSuccessRedirect(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string; devResetToken?: string }>('/auth/forgot-password', {
        email: email.trim(),
      });
      setSuccessMsg(res.message);
      if (res.devResetToken) {
        setDevHelperToken(res.devResetToken);
        setTokenInput(res.devResetToken);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', {
        token: tokenInput.trim(),
        newPassword,
      });
      setSuccessMsg(res.message);
      setPassword('');
      setNewPassword('');
      setMode('login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    try {
      const res = await api.get<{ configured: boolean; redirectUrl?: string }>(`/auth/oauth/${provider}`);
      if (res.configured && res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `${provider === 'google' ? 'Google' : 'Apple'} sign-in is currently unavailable.`
      );
    }
  };

  const monogram = (brand.product_name || 'B').trim().charAt(0).toUpperCase() || 'B';
  const inputBase =
    'w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] focus:bg-[var(--bg-surface)] transition-colors';

  return (
    <div className="min-h-screen w-full bg-[var(--bg-canvas)] text-[var(--text-primary)] flex flex-col justify-between px-4 py-6 sm:py-10">
      <div className="w-full max-w-[420px] mx-auto">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer py-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {brand.product_name}</span>
        </button>
      </div>

      <div className="w-full max-w-[420px] mx-auto my-auto py-6">
        <div className="flex items-center gap-3 mb-6">
          {brand.logo_url ? (
            <img
              src={brand.logo_url}
              alt={brand.product_name}
              className="w-9 h-9 rounded-lg object-cover border border-[var(--border-default)] shrink-0"
            />
          ) : (
            <span className="w-9 h-9 rounded-lg bg-[#0A84FF] text-white font-heading text-sm font-bold flex items-center justify-center shrink-0">
              {monogram}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] leading-tight truncate">
              {brand.product_name}
            </h1>
            <p className="text-xs text-[var(--text-muted)] truncate">{brand.company_name}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--shadow-md)]"
            >
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Sign in to your account</h2>
                <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                  Continue your lessons, saved code sandboxes, and certificates.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg bg-[var(--status-danger-soft)] border border-red-500/25 px-3.5 py-2.5 text-xs text-[var(--status-danger)]"
                >
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-lg bg-[var(--status-success-soft)] border border-emerald-500/25 px-3.5 py-2.5 text-xs text-[var(--status-success)]">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="login-email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={`${inputBase} pl-9 pr-3.5`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="login-password">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className={`${inputBase} pl-9 pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-0.5">
                  <label className="inline-flex items-center gap-2 text-[var(--text-secondary)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[var(--border-strong)] text-[#0A84FF] focus:ring-[#0A84FF]"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[var(--accent-text)] hover:underline font-medium cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>

                <button type="submit" disabled={loading} className="bc-btn-primary w-full h-10 text-sm">
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-default)]" />
                <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">or continue with</span>
                <div className="h-px flex-1 bg-[var(--border-default)]" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  title={capabilities?.oauth.googleEnabled ? 'Continue with Google' : 'Google OAuth requires configuration'}
                  className="bc-btn-secondary h-10 text-xs"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.1-1.7.4-2.5L1.6 7C.6 8.9 0 11.1 0 13.3s.6 4.4 1.6 6.3l3.7-2.8z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.4 7.4 23 12 23z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuth('apple')}
                  title={capabilities?.oauth.appleEnabled ? 'Continue with Apple' : 'Apple Sign-In requires configuration'}
                  className="bc-btn-secondary h-10 text-xs"
                >
                  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
                  </svg>
                  <span>Apple</span>
                </button>
              </div>

              <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-[var(--accent-text)] font-semibold hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </p>
            </motion.div>
          )}

          {mode === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--shadow-md)]"
            >
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Create your account</h2>
                <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                  Start learning, coding, and building your portfolio on {brand.product_name}.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg bg-[var(--status-danger-soft)] border border-red-500/25 px-3.5 py-2.5 text-xs text-[var(--status-danger)]"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="signup-name">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className={`${inputBase} pl-9 pr-3.5`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="signup-email">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={`${inputBase} pl-9 pr-3.5`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="signup-pass">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-pass"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className={`${inputBase} px-3.5 pr-9`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label="Toggle password visibility"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="signup-confirm">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="signup-confirm"
                        type={showConfirm ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm"
                        className={`${inputBase} px-3.5 pr-9`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((s) => !s)}
                        aria-label="Toggle confirm password visibility"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password strength indicator */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-sm transition-colors ${
                          passwordStrength.score >= idx ? passwordStrength.color : 'bg-[var(--bg-muted)]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">{passwordStrength.label}</p>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--border-strong)] text-[#0A84FF]"
                  />
                  <span>I agree to the Terms of Service and Privacy Policy</span>
                </label>

                <button type="submit" disabled={loading} className="bc-btn-primary w-full h-10 text-sm mt-2">
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-[var(--accent-text)] font-semibold hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </motion.div>
          )}

          {mode === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--shadow-md)]"
            >
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Reset password</h2>
                <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                  Request a password reset token and set a new password.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg bg-[var(--status-danger-soft)] border border-red-500/25 px-3.5 py-2.5 text-xs text-[var(--status-danger)]"
                >
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-lg bg-[var(--accent-soft)] border border-[#0A84FF]/25 px-3.5 py-2.5 text-xs text-[var(--text-primary)]">
                  <p>{successMsg}</p>
                  {devHelperToken && (
                    <p className="mt-1 font-mono text-[11px] text-[var(--accent-text)] break-all">
                      Token: {devHelperToken}
                    </p>
                  )}
                </div>
              )}

              {!devHelperToken ? (
                <form onSubmit={handleRequestReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="reset-email">
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className={`${inputBase} px-3.5`}
                    />
                  </div>
                  <button type="submit" disabled={loading} className="bc-btn-primary w-full h-10 text-sm">
                    <KeyRound className="w-4 h-4" />
                    <span>{loading ? 'Generating Token...' : 'Request Reset Token'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCompleteReset} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="reset-token">
                      Reset token
                    </label>
                    <input
                      id="reset-token"
                      type="text"
                      required
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className={`${inputBase} px-3.5 font-mono text-xs`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="reset-new-pass">
                      New password
                    </label>
                    <input
                      id="reset-new-pass"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      className={`${inputBase} px-3.5`}
                    />
                  </div>
                  <button type="submit" disabled={loading} className="bc-btn-primary w-full h-10 text-sm">
                    <span>{loading ? 'Updating...' : 'Save New Password'}</span>
                  </button>
                </form>
              )}

              <p className="mt-5 text-center text-xs text-[var(--text-secondary)]">
                Remembered your password?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-[var(--accent-text)] font-semibold hover:underline cursor-pointer"
                >
                  Back to Sign in
                </button>
              </p>
            </motion.div>
          )}

          {mode === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-7 shadow-[var(--shadow-md)]"
            >
              <div className="mb-5">
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] border border-[#0A84FF]/25 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#0A84FF]" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Verify your email</h2>
                <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                  Confirm your email address using the verification token issued on registration.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg bg-[var(--status-danger-soft)] border border-red-500/25 px-3.5 py-2.5 text-xs text-[var(--status-danger)]"
                >
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mb-4 rounded-lg bg-[var(--status-success-soft)] border border-emerald-500/25 px-3.5 py-2.5 text-xs text-[var(--status-success)]">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5" htmlFor="verify-token">
                    Verification token
                  </label>
                  <input
                    id="verify-token"
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className={`${inputBase} px-3.5 font-mono text-xs`}
                  />
                </div>
                <button type="submit" disabled={loading} className="bc-btn-primary w-full h-10 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => refreshSession().then(() => onSuccessRedirect({ onboarding_completed: false } as UserProfile))}
                  className="bc-btn-ghost w-full h-9 text-xs"
                >
                  Skip verification for now &amp; proceed to onboarding
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-[420px] mx-auto text-center text-[11px] text-[var(--text-muted)]">
        {brand.product_name} · {brand.tagline}
      </div>
    </div>
  );
}
