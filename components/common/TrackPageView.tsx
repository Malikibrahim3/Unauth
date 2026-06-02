'use client';

import { useEffect } from 'react';
import { track, type AnalyticsEvent } from '@/lib/analytics/amplitude';

interface Props {
  event: AnalyticsEvent;
  properties?: Record<string, string | number | boolean | null>;
}

export default function TrackPageView({ event, properties }: Props) {
  useEffect(() => {
    track(event, properties);
  }, [event, properties]);

  return null;
}
