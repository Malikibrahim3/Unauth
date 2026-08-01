/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { render, waitFor } from '@testing-library/react';
import {
  CAPTURE_READY_ATTRIBUTE,
  CaptureReadySignal,
} from '@/components/system/RouteReadySignal';
import { preservedRedirectTarget } from '@/lib/navigation/preservedRedirect';
import { isClockPinned, nowMs, resetClock } from '@/lib/time/clock';

describe('Phase 28 deterministic release gate', () => {
  afterEach(() => {
    resetClock();
    delete globalThis.__UNAUTH_CAPTURE_NOW__;
    document.documentElement.removeAttribute(CAPTURE_READY_ATTRIBUTE);
    document.documentElement.removeAttribute('data-capture-clock');
    document.documentElement.removeAttribute('data-capture-now');
  });

  it('uses the pre-hydration browser clock as the shared client time boundary', () => {
    const frozen = Date.parse('2026-07-26T12:00:00.000Z');
    globalThis.__UNAUTH_CAPTURE_NOW__ = frozen;

    expect(isClockPinned()).toBe(true);
    expect(nowMs()).toBe(frozen);
  });

  it('claims capture readiness only after the validated clock and two stable frames', async () => {
    const root = document.documentElement;
    const frozenIso = '2026-07-26T12:00:00.000Z';
    globalThis.__UNAUTH_CAPTURE_NOW__ = Date.parse(frozenIso);
    root.setAttribute('data-capture-clock', 'frozen');
    root.setAttribute('data-capture-now', frozenIso);
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: Promise.resolve() },
    });
    Object.defineProperty(document, 'getAnimations', {
      configurable: true,
      value: () => [],
    });
    const originalAnimationFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 0);

    const { unmount } = render(<CaptureReadySignal routeKey="/claims?capture=1" />);

    await waitFor(() => {
      expect(root).toHaveAttribute(CAPTURE_READY_ATTRIBUTE, 'true');
    });

    unmount();
    expect(root).not.toHaveAttribute(CAPTURE_READY_ATTRIBUTE);
    globalThis.requestAnimationFrame = originalAnimationFrame;
  });

  it('preserves repeated context while consuming or forcing route-control keys', () => {
    expect(
      preservedRedirectTarget(
        '/claims/case-1',
        { claimId: 'case-1', source: ['queue', 'email'], capture: '1' },
        { consume: ['claimId'] },
      ),
    ).toBe('/claims/case-1?source=queue&source=email&capture=1');

    expect(
      preservedRedirectTarget(
        '/work',
        { source: 'legacy', view: 'old' },
        { force: { view: 'integration-exceptions' }, hash: 'queue' },
      ),
    ).toBe('/work?source=legacy&view=integration-exceptions#queue');
  });
});
