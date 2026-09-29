'use client';

import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { initTheme } from '../../lib/theme';

export function AppInitializer() {
  const { initAuth } = useAuth();

  useEffect(() => {
    initAuth();
    initTheme();
  }, [initAuth]);

  return null;
}
