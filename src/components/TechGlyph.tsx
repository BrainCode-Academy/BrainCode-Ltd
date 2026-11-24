import React from 'react';

interface TechGlyphProps {
  slug: string;
  name: string;
  symbol?: string;
  brandColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TechGlyph({
  slug,
  name,
  symbol = '</>',
  brandColor = '#0A84FF',
  size = 'md',
}: TechGlyphProps) {
  const dims =
    size === 'sm' ? 'w-8 h-8 text-[11px] rounded-lg' : size === 'lg' ? 'w-12 h-12 text-sm rounded-xl' : 'w-10 h-10 text-xs rounded-xl';
  const iconDims = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const cleanColor = /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#0A84FF';

  const renderSvg = () => {
    switch (slug) {
      case 'html':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 3h16l-1.5 15L12 21l-6.5-3L4 3z" />
            <path d="M9 9l-2.5 3L9 15M15 9l2.5 3L15 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'css':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 3h16l-1.5 15L12 21l-6.5-3L4 3z" />
            <path d="M8 8.5h8l-1 4.5-3 1-3-1-.3-1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'react':
      case 'react-native':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(120 12 12)" />
          </svg>
        );
      case 'python':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M12 3c-3 0-4.5 1.2-4.5 3.2V9h5v1.2H6.2C4.2 10.2 3 11.7 3 14.5S4.2 18.8 6.5 18.8H8v-2.3c0-1.9 1.4-3.3 3.5-3.3h4c1.6 0 2.5-1 2.5-2.5V6.2C18 4.2 16 3 12 3z" />
            <circle cx="9.8" cy="6" r="0.8" fill="currentColor" />
            <path d="M16 10.2h1.5c2 0 3.5 1.4 3.5 4.3s-1.5 4.5-3.5 4.5h-1v2c0 1-1.5 1-4.5 1s-4.5-1-4.5-3" />
          </svg>
        );
      case 'nodejs':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <polygon points="12 2 20.5 7 20.5 17 12 22 3.5 17 3.5 7 12 2" strokeLinejoin="round" />
            <path d="M9.5 15V9l5 6V9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'sql':
      case 'postgresql':
      case 'mysql':
      case 'sqlite':
      case 'mongodb':
      case 'redis':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
            <path d="M5 5.5v6.5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V5.5" />
            <path d="M5 12v6.5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V12" />
          </svg>
        );
      case 'git':
      case 'github':
      case 'gitlab':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="6" cy="6" r="2.2" />
            <circle cx="6" cy="18" r="2.2" />
            <circle cx="18" cy="9" r="2.2" />
            <path d="M6 8.2v7.6M8.2 6h4.6a3 3 0 0 1 3 3v0" strokeLinecap="round" />
          </svg>
        );
      case 'docker':
      case 'kubernetes':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="4" y="9" width="4" height="3.5" rx="0.5" />
            <rect x="9" y="9" width="4" height="3.5" rx="0.5" />
            <rect x="14" y="9" width="4" height="3.5" rx="0.5" />
            <rect x="9" y="4.5" width="4" height="3.5" rx="0.5" />
            <path d="M2.5 14.5h18c-.7 3.8-3.5 5.5-8.5 5.5-5.5 0-8.8-2-9.5-5.5z" strokeLinejoin="round" />
          </svg>
        );
      case 'vuejs':
      case 'nuxt':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 4l9 16L21 4h-3.8L12 13.2 6.8 4H3z" strokeLinejoin="round" />
            <path d="M8.5 4L12 10l3.5-6" strokeLinejoin="round" />
          </svg>
        );
      case 'angular':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M12 2.5l8.5 3-1.4 11.2L12 21.5l-7.1-4.8L3.5 5.5 12 2.5z" strokeLinejoin="round" />
            <path d="M8.5 15.5L12 7l3.5 8.5M9.7 13h4.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'figma':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M9 3h3v6H9a3 3 0 0 1 0-6zM12 3h3a3 3 0 0 1 0 6h-3V3zM9 9h3v6H9a3 3 0 0 1 0-6zM9 15h3v3a3 3 0 1 1-3-3z" />
            <circle cx="15" cy="12" r="3" />
          </svg>
        );
      case 'cybersecurity':
      case 'owasp':
      case 'linux-security':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M12 3l7.5 3v5.5c0 4.8-3.2 8.7-7.5 9.8-4.3-1.1-7.5-5-7.5-9.8V6L12 3z" strokeLinejoin="round" />
            <path d="M9.5 12l1.8 1.8 3.6-3.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'aws':
      case 'azure':
      case 'google-cloud':
      case 'cloudflare':
        return (
          <svg viewBox="0 0 24 24" className={iconDims} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M7 18h10.5a4 4 0 0 0 .8-7.9A5.5 5.5 0 0 0 7.7 8.5 4.2 4.2 0 0 0 7 18z" strokeLinejoin="round" />
          </svg>
        );
      default:
        return (
          <span className="font-mono font-bold tracking-tight leading-none select-none">
            {(symbol || name.slice(0, 3)).slice(0, 4)}
          </span>
        );
    }
  };

  return (
    <div
      className={`${dims} inline-flex items-center justify-center shrink-0 border transition-transform duration-150`}
      style={{
        backgroundColor: `${cleanColor}18`,
        borderColor: `${cleanColor}40`,
        color: cleanColor,
      }}
      aria-label={`${name} icon`}
    >
      {renderSvg()}
    </div>
  );
}
