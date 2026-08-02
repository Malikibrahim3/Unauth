'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { DURATION } from '@/lib/design/motion';
import { useMotionAllowed } from '@/lib/design/useMotionAllowed';
import { markTransientOverlayOpen } from '@/lib/design/transientOverlayRegistry';
import { acquireModalEnvironment, registerEscapeOverlay } from '@/lib/design/overlayStack';

/** §7.3: the one shared enter/open/exit state machine for every overlay. */
export type PresencePhase = 'entering' | 'open' | 'exiting';

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

interface UseOverlayPresenceOptions {
  open: boolean;
  onClose?: () => void;
  /** Called once the exit phase finishes and the node is about to unmount. */
  onExited?: () => void;
  /** Milliseconds the node stays mounted after `open` becomes false. */
  exitDurationMs?: number;
  /** Move focus into the container on open and trap Tab within it (dialogs, drawers). */
  trapFocus?: boolean;
  /** Restore focus to the trigger exactly once after close completes. Defaults to `trapFocus`. */
  restoreFocus?: boolean;
  /** Lock body scroll while mounted (dialogs, drawers). */
  lockBodyScroll?: boolean;
  /** Close on Escape. Defaults to true whenever `onClose` is supplied. */
  closeOnEscape?: boolean;
  /** Close when a pointer-down lands outside `containerRef` (menus, popovers). */
  closeOnOutsideClick?: boolean;
  /**
   * Count this overlay as "transient UI" for §7.7 capture readiness — toasts,
   * tooltips, and menus. Dialogs and drawers are deliberate, addressed states,
   * not transient noise, so they leave this `false`.
   */
  transient?: boolean;
}

interface UseOverlayPresenceResult {
  /** Whether the node should render at all (true from `entering` through `exiting`). */
  mounted: boolean;
  /** `null` while unmounted. Consumers key their enter/exit styling off this. */
  phase: PresencePhase | null;
  /** Attach to the overlay's outermost focusable container. */
  containerRef: RefObject<HTMLElement | null>;
  /** §7.7 motion allowance — consumers use this to pick an instant vs. eased transition. */
  motionAllowed: boolean;
}

/**
 * §7.3's shared overlay presence primitive. One `entering → open → exiting`
 * state machine, focus trap, Escape handling, return-focus, body-scroll lock,
 * and transient-overlay accounting — so dialogs, drawers, menus, and toasts
 * stop each hand-rolling their own copy (and stop each hand-rolling a
 * *different* copy) of this behavior. Exiting nodes stay mounted only long
 * enough to run their exit transition; callers make them pointer-inert and
 * `aria-hidden` while `phase === 'exiting'`.
 */
export function useOverlayPresence({
  open,
  onClose,
  onExited,
  exitDurationMs = DURATION.base,
  trapFocus = false,
  restoreFocus = trapFocus,
  lockBodyScroll = false,
  closeOnEscape = Boolean(onClose),
  closeOnOutsideClick = false,
  transient = false,
}: UseOverlayPresenceOptions): UseOverlayPresenceResult {
  const motionAllowed = useMotionAllowed();
  const [phase, setPhase] = useState<PresencePhase | null>(open ? 'open' : null);
  const wasOpenRef = useRef(open);
  const containerRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const mounted = phase !== null;

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setPhase('entering');
      const frame = requestAnimationFrame(() => setPhase('open'));
      return () => cancelAnimationFrame(frame);
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    setPhase('exiting');
    const timer = setTimeout(() => {
      setPhase(null);
      onExited?.();
    }, motionAllowed ? exitDurationMs : 0);
    return () => clearTimeout(timer);
  }, [open, motionAllowed, exitDurationMs, onExited]);

  useEffect(() => {
    if (!transient || !mounted) return;
    return markTransientOverlayOpen();
  }, [transient, mounted]);

  useEffect(() => {
    if (!lockBodyScroll || !mounted) return;
    return acquireModalEnvironment();
  }, [lockBodyScroll, mounted]);

  useEffect(() => {
    if (!closeOnEscape || !mounted) return;
    return registerEscapeOverlay(() => onClose?.());
  }, [closeOnEscape, mounted, onClose]);

  useEffect(() => {
    if (!closeOnOutsideClick || !mounted) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose?.();
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [closeOnOutsideClick, mounted, onClose]);

  useEffect(() => {
    if (!restoreFocus || !mounted) return;
    // Captured once per open — a later focus move inside the overlay must not overwrite it.
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [restoreFocus, mounted]);

  useEffect(() => {
    if (!trapFocus || !mounted) return;
    const getFocusable = () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    const focusIntoOverlay = () => {
      const container = containerRef.current;
      if (!container) return;
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && container.contains(activeElement)) return;
      (getFocusable()[0] ?? container).focus();
    };

    // OverlayPortal mounts its host in an effect, so the focus container can
    // be absent during the first pass of this effect. Retry against the ref
    // instead of capturing null and leaving keyboard users on the page.
    let animationFrame = requestAnimationFrame(function focusWhenReady() {
      if (!containerRef.current) {
        animationFrame = requestAnimationFrame(focusWhenReady);
        return;
      }
      focusIntoOverlay();
    });

    const handleTab = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (event.key !== 'Tab' || !container) return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleTab);
    };
  }, [trapFocus, mounted]);

  useEffect(() => {
    if (!restoreFocus || mounted) return;
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    target?.focus({ preventScroll: true });
  }, [restoreFocus, mounted]);

  return { mounted, phase, containerRef, motionAllowed };
}
