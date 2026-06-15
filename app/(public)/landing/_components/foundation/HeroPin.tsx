'use client';

import { useEffect, useRef } from 'react';

/**
 * Pins the hero under the page curtain (lg+ only; mobile keeps normal flow
 * because the stacked hero is taller than the viewport). Once the curtain
 * fully covers the hero, the wrapper is made inert so keyboard users don't
 * tab into invisible links and trigger scroll jumps.
 */
export default function HeroPin({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onScroll = () => {
      const covered = window.scrollY > Math.max(node.offsetHeight, window.innerHeight);
      if (covered) {
        node.setAttribute('inert', '');
        node.style.visibility = 'hidden';
      } else {
        node.removeAttribute('inert');
        node.style.visibility = 'visible';
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={ref} data-hero-pin className="z-0 lg:sticky lg:top-0">
      {children}
    </div>
  );
}
