'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProfilePage() {
  const { user, isAuthenticated, handleLogout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-10">
      <h1 className="text-3xl font-bold text-[#e6edf3] mb-8">Profile</h1>
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 flex flex-col items-center">
        <div className="w-24 h-24 bg-[#58a6ff]/20 text-[#58a6ff] rounded-full flex items-center justify-center text-4xl font-bold mb-4">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <h2 className="text-xl font-semibold text-[#e6edf3]">{user?.name}</h2>
        <p className="text-[#8b949e] mb-6">{user?.email}</p>
        
        <button
          onClick={() => {
            handleLogout();
            router.push('/');
          }}
          className="bg-[#21262d] hover:bg-[#30363d] text-[#f85149] px-6 py-2 rounded font-medium transition-colors border border-[#30363d]"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
