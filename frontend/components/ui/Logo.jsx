'use client';

import Image from 'next/image';
import Link from 'next/link';

const SIZE_MAP = {
  xs: { height: 18, width: 28, textClass: 'text-sm' },
  sm: { height: 22, width: 35, textClass: 'text-base' },
  md: { height: 28, width: 44, textClass: 'text-[17px]' },
  lg: { height: 36, width: 57, textClass: 'text-xl' },
  xl: { height: 48, width: 76, textClass: 'text-2xl' },
};

export function Logo({
  variant = 'full', // 'full' | 'symbol' | 'wordmark'
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  theme = 'auto', // 'auto' | 'light' | 'dark'
  href = null,
  asLink = false,
  className = '',
  symbolClassName = '',
  textClassName = '',
  badge = null,
  priority = false,
  ariaLabel = 'KodeChirp',
}) {
  const sizeConfig = typeof size === 'number'
    ? { height: size, width: Math.round(size * (534 / 339)), textClass: 'text-base' }
    : SIZE_MAP[size] || SIZE_MAP.md;

  const innerContent = (
    <span className={`inline-flex items-center gap-2.5 select-none ${asLink || href ? '' : className}`}>
      {variant !== 'wordmark' && (
        <span
          className={`relative inline-flex items-center justify-center shrink-0 ${symbolClassName}`}
          style={{ width: sizeConfig.width, height: sizeConfig.height }}
        >
          {/* Light theme logo (official artwork with navy base) */}
          {(theme === 'auto' || theme === 'light') && (
            <Image
              src="/brand/kodechirp-logo.png"
              alt={variant === 'symbol' ? ariaLabel : ''}
              width={sizeConfig.width}
              height={sizeConfig.height}
              priority={priority}
              className={`${theme === 'auto' ? 'kc-logo-light' : ''} w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_8px_rgba(2,96,252,0.12)]`}
            />
          )}

          {/* Dark theme logo (dedicated artwork with lightened blue-white base) */}
          {(theme === 'auto' || theme === 'dark') && (
            <Image
              src="/brand/kodechirp-logo-dark.png"
              alt={variant === 'symbol' ? ariaLabel : ''}
              width={sizeConfig.width}
              height={sizeConfig.height}
              priority={priority}
              className={`${theme === 'auto' ? 'kc-logo-dark' : ''} w-full h-full object-contain pointer-events-none drop-shadow-[0_2px_8px_rgba(2,96,252,0.18)]`}
            />
          )}
        </span>
      )}

      {variant !== 'symbol' && (
        <span
          className={`font-bold font-sans tracking-tight text-[var(--kc-text-primary)] leading-none inline-flex items-center ${sizeConfig.textClass} ${textClassName}`}
        >
          <span>Kode</span>
          <span className="text-[var(--kc-accent)]">Chirp</span>
          {badge && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-[var(--kc-accent-subtle)] text-[var(--kc-accent-hover)] border border-[rgba(59,130,246,0.25)]">
              {badge}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (asLink || href) {
    return (
      <Link
        href={href || '/'}
        className={`inline-flex items-center no-underline hover:opacity-90 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kc-accent)] rounded ${className}`}
        aria-label={ariaLabel}
      >
        {innerContent}
      </Link>
    );
  }

  return innerContent;
}

export default Logo;
