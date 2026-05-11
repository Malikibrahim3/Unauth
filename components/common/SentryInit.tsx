'use client';

import { useEffect } from 'react';
import { initSentryClient } from '@/lib/sentry';

export default function SentryInit() {
  useEffect(() => {
    initSentryClient();
  }, []);

  return null;
}
