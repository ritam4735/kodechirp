'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { initTheme } from '../../lib/theme';
import { api } from '../../lib/api';

export function AppInitializer() {
  const { initAuth, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const lastCheckRef = useRef(0);

  useEffect(() => {
    initAuth();
    initTheme();
  }, [initAuth]);

  // Active Assessment Route Protection:
  // If student has an active assessment attempt in progress, prevent navigating to other platform routes (Home, Questions, Chirps, Compete, etc.)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!pathname) return;

    // Allow take and result pages
    if (pathname.startsWith('/assessments/take/') || pathname.startsWith('/assessments/result/')) {
      return;
    }

    // Rate-limit checks on navigation
    const now = Date.now();
    if (now - lastCheckRef.current < 2500) return;
    lastCheckRef.current = now;

    let isCancelled = false;
    api.getActiveAssessmentAttempt()
      .then((data) => {
        if (isCancelled) return;
        if (data?.hasActiveAttempt && data?.attempt?.id) {
          console.warn('[Security] Candidate has an active in-progress assessment attempt. Redirecting to assessment arena.');
          router.replace(`/assessments/take/${data.attempt.id}`);
        }
      })
      .catch((err) => {
        // Non-fatal if offline or network error
      });

    return () => {
      isCancelled = true;
    };
  }, [pathname, isAuthenticated, router]);

  return null;
}

