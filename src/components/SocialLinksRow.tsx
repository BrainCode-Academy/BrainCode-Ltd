import React from 'react';
import { Globe } from 'lucide-react';
import type { SocialLinksConfig } from '../types';

interface SocialLinksRowProps {
  socialLinks?: SocialLinksConfig;
  whatsappUrl?: string;
  compact?: boolean;
  emptyFallbackText?: string;
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

function SocialPlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
          <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.6V4.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1V11H7.6v3h2.7v8h3.2z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-none stroke-current" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
          <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.9 4.7 12 4.7 12 4.7s-5.9 0-7.6.5a2.8 2.8 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.4 4.8a2.8 2.8 0 0 0 2 2c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.8 2.8 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.2V8.8l5.5 3.2-5.5 3.2z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
          <path d="M16.6 5.8A4.3 4.3 0 0 0 19.5 7v2.7a7 7 0 0 1-2.9-.8v6.2a5.5 5.5 0 1 1-4.8-5.5v2.8a2.8 2.8 0 1 0 2 2.7V3h2.8a4.3 4.3 0 0 0 0 2.8z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
          <path d="M6.5 8.5a1.8 1.8 0 1 1 0-3.6 1.8 1.8 0 0 1 0 3.6zM5 10h3v9H5v-9zm5 0h2.9v1.3h.1c.4-.8 1.4-1.6 2.9-1.6 3.1 0 3.7 2 3.7 4.7V19h-3v-4.1c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2V19h-3v-9z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
          <path d="M18.2 3h3l-6.6 7.5L22.4 21h-6.1l-4.8-6.3L6 21H3l7.1-8.1L2.6 3h6.3l4.3 5.7L18.2 3zm-1.1 16.2h1.7L7.9 4.7H6.1l11 14.5z" />
        </svg>
      );
    case 'whatsapp_community':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current">
          <path d="M12 2a9.9 9.9 0 0 0-8.5 15l-1.3 4.8 4.9-1.3A9.9 9.9 0 1 0 12 2zm5.6 13.8c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.7-3-1.3-4.9-4.3-5.1-4.5-.2-.2-1.2-1.6-1.2-3 0-1.4.7-2.1 1-2.4.3-.3.6-.4.8-.4h.6c.2 0 .5-.1.7.5.2.6.8 2 .9 2.2.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.4-.5.6-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.1.5.1.7-.1.2-.2.9-1 1.1-1.4.2-.4.5-.3.8-.2.3.1 2 .9 2.3 1.1.3.2.5.3.6.4.1.2.1.9-.1 1.6z" />
        </svg>
      );
    default:
      return <Globe className="w-4 h-4" />;
  }
}

export function SocialLinksRow({
  socialLinks,
  whatsappUrl,
  compact = false,
  emptyFallbackText,
}: SocialLinksRowProps) {
  const configured: Array<{ key: string; label: string; url: string }> = [];

  const standardPlatforms: Array<{ key: keyof Omit<SocialLinksConfig, 'custom'>; label: string }> = [
    { key: 'facebook', label: 'Facebook' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'x', label: 'X' },
    { key: 'whatsapp_community', label: 'WhatsApp Community' },
  ];

  for (const item of standardPlatforms) {
    const raw =
      item.key === 'whatsapp_community'
        ? socialLinks?.whatsapp_community || whatsappUrl
        : socialLinks?.[item.key];
    if (isSafeHttpUrl(raw)) {
      configured.push({ key: item.key, label: item.label, url: raw.trim() });
    }
  }

  if (Array.isArray(socialLinks?.custom)) {
    socialLinks.custom.forEach((entry, idx) => {
      if (entry?.label && isSafeHttpUrl(entry.url)) {
        configured.push({ key: `custom_${idx}`, label: entry.label.trim(), url: entry.url.trim() });
      }
    });
  }

  if (configured.length === 0) {
    if (!emptyFallbackText) return null;
    return <p className="text-xs text-slate-500 dark:text-white/50">{emptyFallbackText}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {configured.map((item) => (
        <a
          key={item.key}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow Braincode on ${item.label}`}
          title={item.label}
          className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0B0F17] text-slate-700 dark:text-white/80 hover:border-[#0A84FF] hover:text-[#0A84FF] dark:hover:text-[#00D4FF] transition-colors ${
            compact ? 'h-8 px-2.5 text-[11px] font-medium' : 'h-9 px-3 text-xs font-semibold'
          }`}
        >
          <SocialPlatformIcon platform={item.key} />
          <span>{item.label}</span>
        </a>
      ))}
    </div>
  );
}
