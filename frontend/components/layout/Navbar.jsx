'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Bird, ChevronDown, LogOut, Code2 } from 'lucide-react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Home',      href: '/' },
  { label: 'Questions', href: '/questions' },
  { label: 'Chirps',    href: '/coming-soon/chirps' },
  { label: 'Flights',   href: '/coming-soon/flights' },
  { label: 'Flocks',    href: '/coming-soon/flocks' },
  { label: 'Nest',      href: '/coming-soon/nest' },
];

export const Navbar = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    /* Outer wrapper: sticky, takes space in flow, centers the pill */
    <div className="sticky top-0 z-50 w-full px-4 pt-5 pb-3 flex justify-center shrink-0 bg-transparent">
      <nav
        aria-label="Main navigation"
        className="
          w-full max-w-5xl
          flex items-center justify-between
          px-4 py-2
          rounded-full
          border border-white/10
          bg-[#07090f]/70
          backdrop-blur-2xl
          shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_40px_rgba(0,0,0,0.6),0_0_60px_rgba(88,166,255,0.06)]
          transition-[border-color,background-color] duration-500
          hover:border-white/[0.15]
          hover:bg-[#07090f]/80
        "
      >
        {/* ── Logo ────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2 group shrink-0 mr-4">
          <div className="
            w-8 h-8 rounded-full flex items-center justify-center
            bg-gradient-to-br from-[#58a6ff] to-[#a371f7]
            shadow-[0_0_14px_rgba(88,166,255,0.45)]
            group-hover:shadow-[0_0_22px_rgba(163,113,247,0.65)]
            group-hover:scale-105
            transition-all duration-300
          ">
            <Code2 size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-[17px] tracking-tight text-white">
            Kode<span className="text-[#58a6ff] group-hover:text-[#a371f7] transition-colors duration-300">Chirp</span>
          </span>
        </Link>

        {/* ── Nav Links (desktop) ──────────────────────── */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`
                  relative px-3.5 py-1.5 rounded-full text-[13px] font-medium
                  transition-all duration-200
                  ${active
                    ? 'text-white bg-white/10 shadow-[inset_0_1px_6px_rgba(255,255,255,0.08)]'
                    : 'text-[#8b949e] hover:text-white hover:bg-white/[0.06]'}
                `}
              >
                {item.label}
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#58a6ff] shadow-[0_0_6px_#58a6ff]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Auth / Profile ───────────────────────────── */}
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {isAuthenticated ? (
            <>
              <Link
                href="/profile"
                className="
                  flex items-center gap-2 px-3 py-1.5
                  rounded-full text-sm font-medium text-white
                  bg-white/[0.05] border border-white/[0.08]
                  hover:bg-white/[0.10] hover:border-white/[0.15]
                  transition-all duration-200 group
                "
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center shadow-[0_0_8px_rgba(88,166,255,0.5)]">
                  <Bird size={11} className="text-white" />
                </div>
                <span className="hidden sm:block max-w-[100px] truncate">
                  {user?.username || user?.name || 'Profile'}
                </span>
                <ChevronDown size={12} className="text-[#8b949e] group-hover:text-white transition-colors" />
              </Link>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-2 rounded-full text-[#8b949e] hover:text-[#f85149] hover:bg-red-500/10 transition-all duration-200"
              >
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="
                flex items-center gap-1.5
                px-4 py-1.5 rounded-full
                text-[13px] font-semibold text-white
                bg-gradient-to-r from-[#58a6ff] to-[#a371f7]
                shadow-[0_0_16px_rgba(163,113,247,0.35)]
                hover:shadow-[0_0_28px_rgba(163,113,247,0.6)]
                hover:scale-[1.04]
                transition-all duration-300
              "
            >
              <Bird size={13} fill="currentColor" />
              Join Flock
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
