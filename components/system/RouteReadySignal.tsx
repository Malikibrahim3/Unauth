'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { pendingResourceCount, subscribeToPendingResources } from '@/lib/react/useFetchJson';
import { transientOverlayCount } from '@/lib/design/transientOverlayRegistry';

declare global {
  var __UNAUTH_CAPTURE_PENDING_RESOURCES__: number | undefined;
}

export const ROUTE_READY_ATTRIBUTE = 'data-route-ready';
export const ROUTE_STATE_ATTRIBUTE = 'data-route-state';
/**
 * §7.7, capture-only. Appears after route-ready, a `ready` (never
 * `degraded`) route state, fonts, image decode, no pending resource, no
 * transient overlay, validated shared frozen clock, and two
 * animation-frame-stable checks in a row.
 */
export const CAPTURE_READY_ATTRIBUTE = 'data-capture-ready';

/**
 * How long a route may spend resolving its shared client resources before it
 * reports `degraded` instead of hanging. RUN-10 requires a bounded wait: an
 * unbounded one is how "Loading case context…" became a permanent state.
 */
const READY_TIMEOUT_MS = 8_000;
/** Cascading fetches settle in waves; require a brief quiet period. */
const QUIET_PERIOD_MS = 120;
/** Poll interval while a capture-readiness condition is not yet met. */
const CAPTURE_POLL_MS = 60;
/** Consecutive stable animation frames required before claiming capture readiness. */
const CAPTURE_STABLE_FRAMES = 2;
/** Deadline for fonts/image-decode/condition-stability so one hung resource can't block capture readiness forever. */
const CAPTURE_PRECONDITION_TIMEOUT_MS = 8_000;

async function decodeVisibleImages(): Promise<void> {
  // `image.src` resolves an *empty* `src` attribute to the document's own
  // URL (per the HTML spec), which reads as truthy and never completes or
  // errors — checking the attribute directly avoids waiting on those forever.
  // A hidden theme-swap variant (e.g. a dark-mode logo under `display:none`)
  // and a lazy image below the viewport may never be decoded by the browser.
  // Capture readiness governs the visible viewport, so exclude both.
  const images = Array.from(document.images).filter(
    (image) => {
      if (!image.getAttribute('src') || image.offsetParent === null) return false;
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
    },
  );
  await Promise.all(
    images.map((image) => {
      if (image.complete) {
        if (image.naturalWidth === 0) throw new Error(`Image did not decode: ${image.currentSrc || image.src}`);
        return Promise.resolve();
      }
      return (
        image.decode?.() ??
        new Promise<void>((resolve, reject) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener(
            'error',
            () => reject(new Error(`Image did not load: ${image.currentSrc || image.src}`)),
            { once: true },
          );
        })
      );
    }),
  );
}

/**
 * `requestAnimationFrame` never fires for a hidden/backgrounded document, so
 * this falls back to a short timer rather than hanging forever — a hidden
 * capture-mode tab still has to resolve the promise chain, even though real
 * capture tooling keeps its page visible during a shot.
 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(finish);
    setTimeout(finish, 100);
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** A hung/failed prerequisite fails capture readiness instead of being waved through. */
function withDeadline(promise: Promise<unknown>, ms: number): Promise<boolean> {
  return Promise.race([
    promise.then(() => true).catch(() => false),
    wait(ms).then(() => false),
  ]);
}

function hasValidatedCaptureClock(root: HTMLElement): boolean {
  const iso = root.getAttribute('data-capture-now');
  const browserNow = globalThis.__UNAUTH_CAPTURE_NOW__;
  if (root.getAttribute('data-capture-clock') !== 'frozen' || !iso) return false;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) && parsed === browserNow;
}

function activeAnimationCount(): number {
  if (typeof document.getAnimations !== 'function') return 0;
  return document
    .getAnimations()
    .filter((animation) => animation.playState !== 'finished' && animation.playState !== 'idle')
    .length;
}

function browserPendingResourceCount(): number {
  const count = globalThis.__UNAUTH_CAPTURE_PENDING_RESOURCES__;
  return typeof count === 'number' && Number.isFinite(count) ? count : 0;
}

function stableFrameFingerprint(root: HTMLElement): string {
  const body = document.body;
  return [
    root.scrollWidth,
    root.scrollHeight,
    body?.scrollWidth ?? 0,
    body?.scrollHeight ?? 0,
    pendingResourceCount(),
    browserPendingResourceCount(),
    transientOverlayCount(),
    activeAnimationCount(),
    document.images.length,
  ].join(':');
}

/**
 * §7.7's capture-readiness sequence. Only runs for a route that has already
 * settled `ready` (never `degraded`) while capture mode is active.
 */
async function waitForCaptureReady(root: HTMLElement, isStillActive: () => boolean): Promise<void> {
  root.removeAttribute(CAPTURE_READY_ATTRIBUTE);

  const conditionsMet = () =>
    pendingResourceCount() === 0 &&
    browserPendingResourceCount() === 0 &&
    transientOverlayCount() === 0 &&
    activeAnimationCount() === 0 &&
    hasValidatedCaptureClock(root);

  if (document.fonts?.ready && !(await withDeadline(document.fonts.ready, CAPTURE_PRECONDITION_TIMEOUT_MS))) return;
  if (!isStillActive()) return;

  if (!(await withDeadline(decodeVisibleImages(), CAPTURE_PRECONDITION_TIMEOUT_MS))) return;
  if (!isStillActive()) return;

  let stableFrames = 0;
  let pollAttempts = 0;
  let previousFingerprint: string | null = null;
  while (isStillActive() && stableFrames < CAPTURE_STABLE_FRAMES) {
    if (!conditionsMet()) {
      stableFrames = 0;
      previousFingerprint = null;
      pollAttempts += 1;
      if (pollAttempts * CAPTURE_POLL_MS > CAPTURE_PRECONDITION_TIMEOUT_MS) break;
      await wait(CAPTURE_POLL_MS);
      continue;
    }
    await nextFrame();
    const fingerprint = stableFrameFingerprint(root);
    stableFrames = fingerprint === previousFingerprint ? stableFrames + 1 : 1;
    previousFingerprint = fingerprint;
  }

  if (isStillActive() && conditionsMet()) {
    root.setAttribute(CAPTURE_READY_ATTRIBUTE, 'true');
  }
}

/**
 * The capture-only half of route readiness. Keeping this as a named component
 * makes the stricter release contract impossible to confuse with ordinary
 * route-ready (which may legitimately settle as degraded).
 */
export function CaptureReadySignal({ routeKey }: { routeKey: string | null }) {
  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute(CAPTURE_READY_ATTRIBUTE);
    if (!routeKey) return;

    let cancelled = false;
    void waitForCaptureReady(root, () => !cancelled);
    return () => {
      cancelled = true;
      root.removeAttribute(CAPTURE_READY_ATTRIBUTE);
    };
  }, [routeKey]);

  return null;
}

/**
 * RUN-10: a named, observable point at which a route has finished resolving.
 *
 * Without one, "the page looks loaded" is the only available signal, which is
 * exactly how a screenshot of a half-resolved workspace gets taken. The
 * attribute is set only after hydration has run and the browser has painted
 * twice, so a route that is still swapping skeletons for content has not yet
 * claimed readiness.
 *
 * The attribute is cleared on every navigation, so a stale `true` from the
 * previous route can never be mistaken for the current one.
 */
export function RouteReadySignal() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRouteKey = `${pathname}?${searchParams.toString()}`;
  const captureMode = searchParams.get('capture') === '1';
  const [settledRouteKey, setSettledRouteKey] = useState<string | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (captureMode) root.setAttribute('data-capture-mode', 'true');
    else root.removeAttribute('data-capture-mode');
    root.removeAttribute(ROUTE_READY_ATTRIBUTE);
    root.removeAttribute(ROUTE_STATE_ATTRIBUTE);
    root.removeAttribute(CAPTURE_READY_ATTRIBUTE);

    let cancelled = false;
    let secondFrame = 0;
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    const settle = (state: 'ready' | 'degraded') => {
      if (cancelled) return;
      root.setAttribute(ROUTE_STATE_ATTRIBUTE, state);
      root.setAttribute(ROUTE_READY_ATTRIBUTE, 'true');
      setSettledRouteKey(state === 'ready' ? currentRouteKey : null);
    };

    const deadline = setTimeout(() => settle('degraded'), READY_TIMEOUT_MS);

    const evaluate = () => {
      if (cancelled) return;
      if (quietTimer) clearTimeout(quietTimer);
      if (pendingResourceCount() > 0) return;
      quietTimer = setTimeout(() => {
        if (pendingResourceCount() > 0) return;
        clearTimeout(deadline);
        settle('ready');
      }, QUIET_PERIOD_MS);
    };

    const unsubscribe = subscribeToPendingResources(evaluate);

    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(evaluate);
    });

    return () => {
      cancelled = true;
      if (captureMode) root.removeAttribute('data-capture-mode');
      root.removeAttribute(CAPTURE_READY_ATTRIBUTE);
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      if (quietTimer) clearTimeout(quietTimer);
      clearTimeout(deadline);
      unsubscribe();
    };
  }, [captureMode, currentRouteKey, pathname, searchParams]);

  return (
    <CaptureReadySignal
      routeKey={
        captureMode && settledRouteKey === currentRouteKey
          ? settledRouteKey
          : null
      }
    />
  );
}
