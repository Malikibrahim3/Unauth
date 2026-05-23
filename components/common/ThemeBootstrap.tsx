'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'unauth.theme';

export default function ThemeBootstrap() {
  useEffect(() => {
    try {
      const theme = localStorage.getItem(STORAGE_KEY);
      if (theme === 'dark' || theme === 'light') {
        document.documentElement.dataset.theme = theme;
      }
    } catch {
      // Ignore storage failures in restricted browser contexts.
    }
  }, []);

  return null;
}
