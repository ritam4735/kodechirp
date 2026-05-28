import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export const Navbar = () => {
  const { user, isAuthenticated, handleLogout } = useAuth();

  return (
    <header className="border-b border-[#21262d] bg-[#0d1117] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded bg-[#22c55e]/10 flex items-center justify-center group-hover:bg-[#22c55e]/20 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#22c55e]">
            <path d="m18 16 4-4-4-4" />
            <path d="m6 8-4 4 4 4" />
            <path d="m14.5 4-5 16" />
          </svg>
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-[#22c55e] transition-colors">
          Kode<span className="text-[#22c55e]">Chirp</span>
        </span>
      </Link>
      
      <nav className="flex items-center gap-4">
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-sm font-medium text-[#e6edf3] hover:text-[#22c55e] transition-colors">
              {user?.name || 'Profile'}
            </Link>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-[#f85149] hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <Link href="/auth" className="text-sm font-medium bg-[#22c55e] text-[#0d1117] px-4 py-2 rounded hover:bg-[#1ea950] transition-colors">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
};
