"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DURATION, TOAST_TIMEOUT } from "@/lib/design/motion";
import { useOverlayPresence } from "@/lib/design/useOverlayPresence";
import { IconButton } from "@/components/ui/IconButton";

/**
 * Global toast (WS4.4, §7.3). Every mutation answers back. Success/info/danger
 * tones, tone-based auto-dismiss (danger persists until dismissed), paused
 * while hovered/focused/backgrounded, and the shared overlay presence
 * primitive for enter/exit — one 8px + opacity transition, 160ms in / 100ms
 * out, that collapses to instant under reduced motion.
 */
export type ToastTone = "success" | "info" | "danger";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  closing: boolean;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<ToastTone, { icon: ReactNode; surface: string }> = {
  success: { icon: <CheckCircle2 className="h-4 w-4" style={{ color: "var(--uo-route-success)" }} />, surface: "var(--uo-route-success-bg)" },
  info: { icon: <Info className="h-4 w-4" style={{ color: "var(--uo-route-info)" }} />, surface: "var(--uo-route-info-bg)" },
  danger: { icon: <TriangleAlert className="h-4 w-4" style={{ color: "var(--uo-route-risk-critical)" }} />, surface: "var(--uo-route-risk-critical-bg)" },
};

/** §7.3 tone-based lifetime for one toast, in ms. `null` means "persistent until dismissed". */
function toastLifetimeMs(tone: ToastTone, hasDescription: boolean): number | null {
  if (tone === "danger") return TOAST_TIMEOUT.danger;
  return hasDescription ? TOAST_TIMEOUT.withDescription : TOAST_TIMEOUT.titleOnly;
}

function ToastItemView({ item, onRequestClose, onExited }: {
  item: ToastItem;
  onRequestClose: () => void;
  onExited: () => void;
}) {
  const { phase, motionAllowed } = useOverlayPresence({
    open: !item.closing,
    onClose: onRequestClose,
    onExited,
    exitDurationMs: DURATION.fast,
    transient: true,
  });

  const lifetimeMs = toastLifetimeMs(item.tone, Boolean(item.description));
  const remainingRef = useRef(lifetimeMs ?? 0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (lifetimeMs === null || item.closing) return;
    clearTimer();
    startedAtRef.current = Date.now();
    timerRef.current = setTimeout(onRequestClose, remainingRef.current);
  }, [lifetimeMs, item.closing, clearTimer, onRequestClose]);

  const pause = useCallback(() => {
    if (lifetimeMs === null || startedAtRef.current === null) return;
    clearTimer();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current));
    startedAtRef.current = null;
  }, [lifetimeMs, clearTimer]);

  useEffect(() => {
    start();
    const onVisibilityChange = () => {
      if (document.hidden) pause();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // Intentionally runs once per toast: `start`/`pause` close over refs, not state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!phase) return null;
  const isOpen = phase === "open";
  const duration = phase === "exiting" ? DURATION.fast : DURATION.base;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={phase === "exiting" ? true : undefined}
      className="pointer-events-auto flex items-start gap-3 rounded-[var(--uo-route-radius-surface)] border p-3 shadow-[var(--uo-route-shadow-menu)]"
      style={{
        borderColor: "var(--uo-route-border-default)",
        background: TONE[item.tone].surface,
        opacity: isOpen ? 1 : 0,
        transform: isOpen ? "translateY(0)" : "translateY(8px)",
        transition: motionAllowed ? `opacity ${duration}ms var(--uo-route-ease-standard), transform ${duration}ms var(--uo-route-ease-standard)` : "none",
        pointerEvents: phase === "exiting" ? "none" : undefined,
      }}
      onMouseEnter={pause}
      onMouseLeave={start}
      onFocus={pause}
      onBlur={start}
    >
      <span className="mt-0.5 shrink-0">{TONE[item.tone].icon}</span>
      <div className="min-w-0 flex-1">
        <p className="ua-text-working-title text-[var(--uo-route-text-primary)]">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-xs text-[var(--uo-route-text-secondary)]">{item.description}</p>
        ) : null}
      </div>
      <IconButton
        label="Dismiss notification"
        onClick={onRequestClose}
        size="sm"
        icon={<X />}
        className="border-transparent bg-transparent"
      />
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const requestClose = useCallback((id: number) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, closing: true } : item)));
  }, []);

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(({ title, description, tone = "info" }) => {
    idRef.current += 1;
    const id = idRef.current;
    setItems((current) => [...current, { id, title, description, tone, closing: false }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[var(--uo-route-z-toast)] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {items.map((item) => (
          <ToastItemView
            key={item.id}
            item={item}
            onRequestClose={() => requestClose(item.id)}
            onExited={() => remove(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Access the toast function. Returns a no-op if used outside a provider (SSR-safe). */
export function useToast(): ToastContextValue["toast"] {
  const ctx = useContext(ToastContext);
  return ctx?.toast ?? (() => {});
}
