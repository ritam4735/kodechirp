'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CompeteArenaPage from '../compete/page';

/**
 * Backward compatibility wrapper:
 * Seamlessly routes legacy `/assessments` URLs to `/compete`
 * while rendering the unified Compete Arena interface.
 */
export default function AssessmentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/compete');
  }, [router]);

  return <CompeteArenaPage />;
}
