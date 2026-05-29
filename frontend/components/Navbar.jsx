'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bird, Swords, BrainCircuit, ClipboardList, ChevronDown,
  LogOut, User, Menu, X, Zap
} from 'lucide-react';
import { useAuth } from '../app/layout';

const FUTURE_ITEMS = [
  { label: 'Battles',        icon: Swords,        href: '#' },
  { label: 'Interview Prep', icon: BrainCircuit,   href: '#' },
  { label: 'Tests',          icon: ClipboardList,  href: '#' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth() || {};
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const handleLogout = () => {
    logout?.();
    router.push('/');
  };

  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#0d1117]/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] shadow-blue-900/20 px-6 py-2.5 flex items-center justify-between w-full max-w-4xl transition-all duration-300 hover:border-white/20 hover:bg-[#0d1117]/70">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg shadow-green-900/20 group-hover:scale-105 transition-transform">
            <Bird size={15} className="text-white" />
          </div>
          <span className="font-display font-700 text-lg tracking-tight text-white">
            Kode<span className="text-[#22c55e]">Chirp</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'text-white bg-[#21262d]'
                : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'
            }`}
          >
            Problems
          </Link>

          {/* Future feature buttons */}
          {FUTURE_ITEMS.map((item) => (
            <div key={item.label} className="relative">
              <button
                onMouseEnter={() => setTooltip(item.label)}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => setTooltip(item.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-[#484f58] hover:text-[#8b949e] transition-colors cursor-not-allowed"
              >
                <item.icon size={14} />
                {item.label}
                <span className="text-[10px] bg-[#21262d] text-[#484f58] px-1.5 py-0.5 rounded-full font-medium ml-0.5">
                  Soon
                </span>
              </button>
              {tooltip === item.label && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded-lg text-xs text-[#8b949e] whitespace-nowrap shadow-xl z-50 animate-fade-in">
                  <Zap size={10} className="inline mr-1 text-[#fbbf24]" />
                  Feature under development
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#21262d] border-l border-t border-[#30363d] rotate-45" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Auth / Profile */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-xs font-bold text-white">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="hidden sm:block">{user.username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-[#484f58] hover:text-[#f85149] hover:bg-[#21262d] transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/auth"
                className="px-3 py-1.5 rounded-md text-sm font-medium text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth?mode=signup"
                className="px-3 py-1.5 rounded-md text-sm font-medium bg-[#22c55e] text-white hover:bg-[#16a34a] transition-colors shadow-sm shadow-green-900/30"
              >
                Sign up
              </Link>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5 rounded-md text-[#8b949e] hover:text-white hover:bg-[#21262d]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#21262d] bg-[#0d1117] px-4 py-3 space-y-1 animate-fade-in">
          <Link href="/" className="block px-3 py-2 rounded-md text-sm text-[#8b949e] hover:text-white hover:bg-[#21262d]" onClick={() => setMobileOpen(false)}>
            Problems
          </Link>
          {FUTURE_ITEMS.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-3 py-2 text-sm text-[#484f58]">
              <item.icon size={14} />
              {item.label}
              <span className="text-[10px] bg-[#21262d] text-[#484f58] px-1.5 py-0.5 rounded-full">Soon</span>
            </div>
          ))}
        </div>
      )}
      </nav>
    </div>
  );
}
