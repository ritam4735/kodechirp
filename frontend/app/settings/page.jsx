'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatedBackground } from '../../components/ui/AnimatedBackground';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile with settings tab active. 
    // In our Profile component, it defaults to profile, but we can manage state or just redirect to /profile
    router.replace('/profile');
  }, [router]);

  return (
    <div className="relative flex-1 overflow-hidden min-h-screen bg-[var(--kc-bg)]">
      <AnimatedBackground variant="particles" />
      <div className="flex items-center justify-center h-full pt-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--kc-border)] border-t-[var(--kc-accent)]"></div>
      </div>
    </div>
  );
}
