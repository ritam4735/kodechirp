'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Bird, ChevronDown, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const pathname = usePathname();

  // For the problem page, we might not want the floating pill to interfere with the editor layout, 
  // but let's keep it global and floating for the magical feel, just adjusted.
  // The prompt asks for "floating glassmorphism navbar, rounded pill-shaped container"
  
  return (
    <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <nav className="pointer-events-auto bg-[#0d1117]/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-6 py-2.5 flex items-center justify-between w-full max-w-4xl transition-all duration-500 hover:border-white/20 hover:bg-[#0d1117]/60">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group mr-8">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center shadow-[0_0_15px_rgba(88,166,255,0.4)] group-hover:shadow-[0_0_25px_rgba(163,113,247,0.6)] transition-all duration-300 group-hover:scale-105">
            <Bird size={16} className="text-white drop-shadow-md" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white drop-shadow-md">
            Kode<span className="text-[#58a6ff] group-hover:text-[#a371f7] transition-colors duration-300">Chirp</span>
          </span>
        </Link>
        
        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {[
            { label: 'Home', href: '/' },
            { label: 'Chirps', href: '/problems' },
            { label: 'Flights', href: '#' },
            { label: 'Flocks', href: '#' },
            { label: 'Nest', href: '#' },
          ].map((item) => (
            <Link 
              key={item.label}
              href={item.href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                pathname === item.href 
                  ? 'text-white bg-white/10 shadow-[inset_0_1px_4px_rgba(255,255,255,0.1)]' 
                  : 'text-[#8b949e] hover:text-white hover:bg-white/5'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        
        {/* Auth / Profile */}
        <div className="flex items-center gap-3 ml-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-sm font-medium text-white group">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center text-xs shadow-inner">
                  <Bird size={12} className="text-white" />
                </div>
                <span>{user?.name || 'Profile'}</span>
                <ChevronDown size={14} className="text-[#8b949e] group-hover:text-white transition-colors" />
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-full text-[#8b949e] hover:text-[#f85149] hover:bg-red-500/10 transition-all"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link href="/auth" className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#58a6ff] to-[#a371f7] text-white px-5 py-2 rounded-full shadow-[0_0_15px_rgba(163,113,247,0.3)] hover:shadow-[0_0_25px_rgba(163,113,247,0.6)] hover:scale-105 transition-all duration-300">
              <Bird size={14} fill="currentColor" />
              Join Flock
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};
