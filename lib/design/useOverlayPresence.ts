"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { DURATION } from "@/lib/design/motion";
import { useMotionAllowed } from "@/lib/design/useMotionAllowed";
import { markTransientOverlayOpen } from "@/lib/design/transientOverlayRegistry";
import { acquireModalEnvironment, registerEscapeOverlay } from "@/lib/design/overlayStack";

export type PresencePhase = "entering" | "open" | "exiting";

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

type Options = {
  open: boolean;
  onClose?: () => void;
  onExited?: () => void;
  exitDurationMs?: number;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  lockBodyScroll?: boolean;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  transient?: boolean;
};

type Result = {
  mounted: boolean;
  phase: PresencePhase | null;
  containerRef: RefObject<HTMLElement | null>;
  motionAllowed: boolean;
};

/** Shared entering/open/exiting, focus, Escape, and scroll-lock contract. */
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
}: Options): Result {
  const motionAllowed = useMotionAllowed();
  const [phase, setPhase] = useState<PresencePhase | null>(open ? "open" : null);
  const wasOpenRef = useRef(open);
  const containerRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const mounted = phase !== null;

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      setPhase("entering");
      const frame = requestAnimationFrame(() => setPhase("open"));
      return () => cancelAnimationFrame(frame);
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
    setPhase("exiting");
    const timer = window.setTimeout(() => {
      setPhase(null);
      onExited?.();
    }, motionAllowed ? exitDurationMs : 0);
    return () => window.clearTimeout(timer);
  }, [open, motionAllowed, exitDurationMs, onExited]);

  useEffect(() => (transient && mounted ? markTransientOverlayOpen() : undefined), [transient, mounted]);
  useEffect(() => (lockBodyScroll && mounted ? acquireModalEnvironment() : undefined), [lockBodyScroll, mounted]);
  useEffect(() => (closeOnEscape && mounted ? registerEscapeOverlay(() => onClose?.()) : undefined), [closeOnEscape, mounted, onClose]);

  useEffect(() => {
    if (!closeOnOutsideClick || !mounted) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onClose?.();
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [closeOnOutsideClick, mounted, onClose]);

  useEffect(() => {
    if (!restoreFocus || !mounted) return;
    if (!returnFocusRef.current) {
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    return () => {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      // Parents may deliberately remount a form overlay to clear its draft
      // state. Restore from cleanup so abrupt unmounts retain the same focus
      // contract as animated closes. One frame lets the shell lose `inert`.
      requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    };
  }, [restoreFocus, mounted]);

  useEffect(() => {
    if (!trapFocus || !mounted) return;
    const focusable = () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    const focusIntoOverlay = () => {
      const container = containerRef.current;
      if (!container) return false;
      if (!(document.activeElement instanceof HTMLElement) || !container.contains(document.activeElement)) {
        (focusable()[0] ?? container).focus();
      }
      return true;
    };
    let frame = requestAnimationFrame(function focusWhenReady() {
      if (!focusIntoOverlay()) frame = requestAnimationFrame(focusWhenReady);
    });
    const handleTab = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (event.key !== "Tab" || !container) return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleTab);
    };
  }, [trapFocus, mounted]);

  return { mounted, phase, containerRef, motionAllowed };
}
