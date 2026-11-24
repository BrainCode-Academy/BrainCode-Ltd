import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';
import { SocialLinksRow } from './SocialLinksRow';

export const CONTACT_CATEGORIES = [
  'General Enquiry',
  'Course or Learning Support',
  'Technical Issue',
  'Account or Billing Support',
  'Partnership or Sponsorship',
  'Institutional or School Training',
  'Feedback & Suggestions',
  'Report an Issue',
] as const;

interface ContactPageSectionProps {
  isStandalonePage?: boolean;
  onBackHome?: () => void;
  onOpenFullContact?: () => void;
}

function isSafeHttpUrl(url?: string): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ContactPageSection({
  isStandalonePage = false,
  onBackHome,
  onOpenFullContact,
}: ContactPageSectionProps) {
  const { brand, user } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [category, setCategory] = useState<string>(CONTACT_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string; reference?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2) {
      setStatus({ ok: false, text: 'Please enter your full name (at least 2 characters).' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setStatus({ ok: false, text: 'Please enter a valid email address.' });
      return;
    }
    if (trimmedSubject.length < 2) {
      setStatus({ ok: false, text: 'Please provide a brief subject for your enquiry.' });
      return;
    }
    if (trimmedMessage.length < 10) {
      setStatus({ ok: false, text: 'Please write a message of at least 10 characters.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<{ ok: boolean; message: string; reference?: string; id?: string }>('/contact', {
        fullName: trimmedName,
        email: trimmedEmail,
        category,
        subject: trimmedSubject,
        message: trimmedMessage,
        website,
      });
      setStatus({
        ok: true,
        text: res.message,
        reference: res.reference || res.id,
      });
      setSubject('');
      setMessage('');
    } catch (err) {
      setStatus({
        ok: false,
        text: err instanceof ApiError ? err.message : 'Unable to send your enquiry. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hasOfficialEmail = Boolean(brand.official_contact_email?.trim());
  const hasSupportEmail = Boolean(brand.support_email?.trim());
  const hasPhone = Boolean(brand.business_phone?.trim());
  const hasWhatsapp = isSafeHttpUrl(brand.whatsapp_url);
  const hasAddress = Boolean(brand.business_address?.trim());
  const hasHours = Boolean(brand.office_hours?.trim());

  return (
    <section
      id="contact"
      className={
        isStandalonePage
          ? 'max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8'
          : 'border-t border-[var(--border-default)] bg-[var(--bg-canvas)] py-14 sm:py-16'
      }
    >
      <div className={isStandalonePage ? 'space-y-8' : 'max-w-7xl mx-auto px-4 sm:px-6 space-y-8'}>
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            {isStandalonePage && onBackHome && (
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A84FF] hover:underline mb-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to {brand.product_name} Home</span>
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-[#0A84FF] dark:text-[#38BDF8]">
              Contact {brand.product_name}
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
              Let&apos;s Talk. We&apos;re Here to Help.
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              {brand.contact_intro?.trim() ||
                `Have a question about learning, technology, partnerships or ${brand.product_name}? Get in touch with our team.`}
            </p>
          </div>

          {!isStandalonePage && onOpenFullContact && (
            <button
              type="button"
              onClick={onOpenFullContact}
              className="bc-btn-secondary h-9 px-3.5 text-xs whitespace-nowrap shrink-0 self-start"
            >
              <span>Open Dedicated Contact Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Form + Unified Official Contact Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Contact Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-7 p-5 sm:p-7 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] space-y-4 shadow-[var(--shadow-sm)]"
          >
            <div className="space-y-1">
              <h2 className="text-lg font-bold">Send an Enquiry</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Every enquiry is logged directly into the {brand.product_name} support queue operated by{' '}
                {brand.company_name}.
              </p>
            </div>

            {status && (
              <div
                role="status"
                className={`p-3.5 rounded-lg text-xs leading-relaxed border ${
                  status.ok
                    ? 'bg-[var(--status-success-soft)] text-[var(--status-success)] border-emerald-500/25'
                    : 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-red-500/25'
                }`}
              >
                <p className="font-semibold">{status.text}</p>
                {status.reference && (
                  <p className="mt-1 font-mono text-[11px] opacity-90">Reference ID: {status.reference}</p>
                )}
              </div>
            )}

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="hidden"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-fullname" className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                  Full name
                </label>
                <input
                  id="contact-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="bc-input w-full"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                  Email address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bc-input w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="contact-category" className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                  Inquiry category
                </label>
                <select
                  id="contact-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bc-select w-full"
                >
                  {CONTACT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. University training cohort"
                  className="bc-input w-full"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contact-message" className="block text-xs font-semibold mb-1.5 text-[var(--text-secondary)]">
                Message
              </label>
              <textarea
                id="contact-message"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell our team how we can help..."
                className="bc-textarea w-full"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bc-btn-primary w-full sm:w-auto h-10 px-5 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending Enquiry...' : 'Submit Enquiry'}</span>
            </button>
          </form>

          {/* Unified Official Contact Channels & Follow Braincode Panel */}
          <div className="lg:col-span-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 sm:p-6 divide-y divide-[var(--border-default)] space-y-5">
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold">Official Contact Details</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Operated by {brand.company_name}
                </p>
              </div>

              <dl className="space-y-3 text-xs">
                {hasOfficialEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <dt className="text-[var(--text-muted)] font-medium">Official Contact Email</dt>
                      <dd className="font-semibold mt-0.5">
                        <a
                          href={`mailto:${brand.official_contact_email!.trim()}`}
                          className="hover:text-[#0A84FF] break-all"
                        >
                          {brand.official_contact_email!.trim()}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {hasSupportEmail && brand.support_email.trim() !== brand.official_contact_email?.trim() && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <dt className="text-[var(--text-muted)] font-medium">Support Email</dt>
                      <dd className="font-semibold mt-0.5">
                        <a href={`mailto:${brand.support_email.trim()}`} className="hover:text-[#0A84FF] break-all">
                          {brand.support_email.trim()}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {hasPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-[var(--text-muted)] font-medium">Business / Support Phone</dt>
                      <dd className="font-semibold mt-0.5 tabular-nums">
                        <a href={`tel:${brand.business_phone!.trim()}`} className="hover:text-[#0A84FF]">
                          {brand.business_phone!.trim()}
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {hasWhatsapp && (
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-[var(--text-muted)] font-medium">Official WhatsApp Support</dt>
                      <dd className="font-semibold mt-0.5">
                        <a
                          href={brand.whatsapp_url!.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#0A84FF] hover:underline"
                        >
                          <span>Message Support on WhatsApp</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </dd>
                    </div>
                  </div>
                )}

                {hasAddress && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-[var(--text-muted)] font-medium">Office Address</dt>
                      <dd className="font-medium mt-0.5 whitespace-pre-line text-[var(--text-secondary)]">
                        {brand.business_address!.trim()}
                      </dd>
                    </div>
                  </div>
                )}

                {hasHours && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#0A84FF] shrink-0 mt-0.5" />
                    <div>
                      <dt className="text-[var(--text-muted)] font-medium">Office Hours</dt>
                      <dd className="font-medium mt-0.5 text-[var(--text-secondary)]">
                        {brand.office_hours!.trim()}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>
            </div>

            <div className="pt-5 space-y-3">
              <div>
                <h2 className="text-base font-bold">Follow {brand.product_name}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Stay connected for new language tracks, coding tutorials, and developer community updates.
                </p>
              </div>
              <SocialLinksRow
                socialLinks={brand.social_links}
                whatsappUrl={brand.whatsapp_url}
                emptyFallbackText={`Official social media channels for ${brand.product_name} can be configured by platform administrators and will appear here automatically.`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
