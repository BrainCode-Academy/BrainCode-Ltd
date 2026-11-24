import React, { useEffect, useState } from 'react';
import { Check, CreditCard, ShieldCheck, XCircle } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { SubscriptionPlan } from '../types';

export function PricingBillingView() {
  const { entitlement, refreshSession } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [billingInfo, setBillingInfo] = useState<{
    subscription: any;
    payments: any[];
    paymentProvider: string;
    stripeConfigured: boolean;
  } | null>(null);

  const [pendingCheckout, setPendingCheckout] = useState<{
    paymentId: string;
    reference: string;
    amountCents: number;
    currency: string;
    planName: string;
    billingCycle: string;
    message: string;
  } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    const [pRes, bRes] = await Promise.all([
      api.get<{ plans: SubscriptionPlan[] }>('/plans'),
      api.get<any>('/billing/me'),
    ]);
    setPlans(pRes.plans);
    setBillingInfo(bRes);
  };

  useEffect(() => {
    loadData().catch(() => {});
  }, []);

  const formatMoney = (cents: number, currency = 'USD') => {
    if (cents === 0) return '$0';
    return `${currency === 'USD' ? '$' : `${currency} `}${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
  };

  const startCheckout = async (planSlug: string) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      const res = await api.post<any>('/billing/checkout', { planSlug, billingCycle });
      setPendingCheckout(res);
      loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Checkout initiation failed.');
    } finally {
      setBusy(false);
    }
  };

  const resolveSandboxPayment = async (outcome: 'succeeded' | 'failed') => {
    if (!pendingCheckout) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setBusy(true);
    try {
      await api.post('/billing/verify-sandbox', {
        paymentId: pendingCheckout.paymentId,
        outcome,
      });
      setStatusMsg(`Payment ${pendingCheckout.reference} verified. Your ${pendingCheckout.planName} entitlement is now active.`);
      setPendingCheckout(null);
      await refreshSession();
      await loadData();
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Payment failed.');
      setPendingCheckout(null);
      await loadData();
    } finally {
      setBusy(false);
    }
  };

  const cancelRenewal = async () => {
    await api.post('/billing/cancel');
    setStatusMsg('Subscription renewal canceled. Access remains active until period end.');
    await loadData();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Subscriptions, Pricing &amp; Billing</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Server-verified entitlements. Current plan:{' '}
            <span className="font-semibold text-[var(--accent-text)]">{entitlement?.planName}</span>
            {billingInfo && !billingInfo.stripeConfigured && ' · Payment mode: Development Sandbox'}
          </p>
        </div>

        <div className="inline-flex p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)]">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success-soft)] px-4 py-3 text-xs text-[var(--status-success)]">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg border border-[var(--status-danger)]/30 bg-[var(--status-danger-soft)] px-4 py-3 text-xs text-[var(--status-danger)]">
          {errorMsg}
        </div>
      )}

      {/* Pending Development Sandbox Verification Step */}
      {pendingCheckout && (
        <div className="bc-panel p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[var(--accent-text)]">
                Pending Payment Verification ({pendingCheckout.reference})
              </p>
              <h2 className="text-lg font-bold mt-1 text-[var(--text-primary)]">
                {pendingCheckout.planName} ({pendingCheckout.billingCycle}) —{' '}
                <span className="tabular-nums">{formatMoney(pendingCheckout.amountCents, pendingCheckout.currency)}</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{pendingCheckout.message}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => resolveSandboxPayment('succeeded')}
              className="bc-btn-primary !bg-[var(--status-success)] hover:!opacity-90"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Confirm Sandbox Payment (Activate Plan)</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => resolveSandboxPayment('failed')}
              className="bc-btn-danger"
            >
              <XCircle className="w-4 h-4" />
              <span>Test Declined Payment</span>
            </button>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === 'yearly' ? plan.yearly_price_cents : plan.monthly_price_cents;
          const isCurrent = entitlement?.planSlug === plan.slug;
          return (
            <div
              key={plan.id}
              className={`bc-panel p-6 flex flex-col justify-between ${
                plan.slug === 'pro-learner' ? 'border-[var(--accent-primary)]' : ''
              }`}
            >
              <div>
                <p className="text-xs font-medium text-[var(--accent-text)]">{plan.audience_label}</p>
                <h2 className="text-xl font-bold mt-1 text-[var(--text-primary)]">{plan.name}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-1 text-[var(--text-primary)]">
                  <span className="text-3xl font-bold tabular-nums">{formatMoney(price, plan.currency)}</span>
                  <span className="text-xs text-[var(--text-muted)]">/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
                </div>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={busy || isCurrent || plan.slug === 'starter-free'}
                onClick={() => startCheckout(plan.slug)}
                className={`mt-6 w-full ${
                  isCurrent
                    ? 'bc-btn-secondary !border-[var(--status-success)]/35 !text-[var(--status-success)] !bg-[var(--status-success-soft)]'
                    : plan.slug === 'starter-free'
                    ? 'bc-btn-secondary !text-[var(--text-muted)]'
                    : 'bc-btn-primary'
                }`}
              >
                {isCurrent ? 'Current Active Plan' : plan.slug === 'starter-free' ? 'Base Free Tier' : `Select ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Subscription & Payment Ledger */}
      {billingInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bc-panel p-6 space-y-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <CreditCard className="w-4 h-4 text-[var(--accent-primary)]" />
              <span>Subscription Status</span>
            </h3>
            {billingInfo.subscription ? (
              <div className="text-xs space-y-2 text-[var(--text-secondary)]">
                <p>
                  Plan: <span className="font-semibold text-[var(--text-primary)]">{billingInfo.subscription.plan_name}</span>
                </p>
                <p>
                  Cycle: <span className="capitalize">{billingInfo.subscription.billing_cycle}</span> · Status:{' '}
                  <span className="capitalize font-semibold text-[var(--text-primary)]">{billingInfo.subscription.status}</span>
                </p>
                <p className="tabular-nums">
                  Current period ends: {String(billingInfo.subscription.current_period_end).slice(0, 10)}
                </p>
                {billingInfo.subscription.status === 'active' && !billingInfo.subscription.cancel_at_period_end && (
                  <button
                    type="button"
                    onClick={cancelRenewal}
                    className="bc-btn-danger !h-8 !px-3.5 mt-2"
                  >
                    Cancel Auto-Renewal
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">You are currently on the Starter Free tier with no active paid billing cycle.</p>
            )}
          </div>

          <div className="lg:col-span-7 bc-panel p-6 space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Payment History</h3>
            {billingInfo.payments.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No payment transactions recorded yet.</p>
            ) : (
              <div className="bc-table-wrap">
                <table className="bc-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingInfo.payments.map((pay) => (
                      <tr key={pay.id}>
                        <td className="font-mono text-[var(--text-primary)]">{pay.reference}</td>
                        <td className="text-[var(--text-secondary)]">{pay.description}</td>
                        <td className="capitalize text-[var(--text-secondary)]">{pay.status}</td>
                        <td className="text-right font-mono tabular-nums text-[var(--text-primary)]">
                          {formatMoney(pay.amount_cents, pay.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
