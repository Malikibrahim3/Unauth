'use client';

import { useEffect, useRef, useState } from 'react';
import { DURATION } from '@/lib/design/motion';

/**
 * §7.2's one-shot changed-value wash: true for `DURATION.highlight` (700ms)
 * immediately after `value` changes from a previous render — never on first
 * mount, and never a count-up. Pair the returned boolean with the
 * `ua-value-wash` class in the replacement stylesheet on the element that
 * shows the value.
 */
export function useChangedValueHighlight(value: string | number | null | undefined): boolean {
  const previousRef = useRef(value);
  const isFirstRender = useRef(true);
  const [highlighting, setHighlighting] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousRef.current = value;
      return;
    }
    if (previousRef.current === value) return;
    previousRef.current = value;
    setHighlighting(true);
    const timer = setTimeout(() => setHighlighting(false), DURATION.highlight);
    return () => clearTimeout(timer);
  }, [value]);

  return highlighting;
}
