"use client";

import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Global toast (WS4.4). Every mutation answers back. Success/info/danger tones,
 * auto-dismiss, accessible (aria-live polite), restrained motion (a 140ms
 * ease-out slide that collapses to a fade under prefers-reduced-motion).
 */
export type ToastTone = "success" | "info" | "danger";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE: Record<ToastTone, { border: string; icon: ReactNode }> = {
  success: { border: "var(--ua-success)", icon: <CheckCircle2 className="h-4 w-4" style={{ color: "var(--ua-success)" }} /> },
  info: { border: "var(--ua-info)", icon: <Info className="h-4 w-4" style={{ color: "var(--ua-info)" }} /> },
  danger: { border: "var(--ua-risk-critical)", icon: <TriangleAlert className="h-4 w-4" style={{ color: "var(--ua-risk-critical)" }} /> },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(
    ({ title, description, tone = "info" }) => {
      idRef.current += 1;
      const id = idRef.current;
      setItems((current) => [...current, { id, title, description, tone }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[var(--ua-z-toast)] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className="ua-toast pointer-events-auto flex items-start gap-2.5 rounded-lg border bg-[var(--ua-surface-primary)] p-3 shadow-[var(--ua-shadow-menu)]"
            style={{ borderColor: "var(--ua-border-default)", borderLeft: `3px solid ${TONE[item.tone].border}` }}
          >
            <span className="mt-0.5 shrink-0">{TONE[item.tone].icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ua-text-primary)]">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs text-[var(--ua-text-secondary)]">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded p-0.5 text-[var(--ua-text-tertiary)] hover:text-[var(--ua-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ua-border-focus)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        .ua-toast { animation: ua-toast-in 140ms ease-out; }
        @keyframes ua-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ua-toast { animation: ua-toast-fade 140ms ease-out; }
          @keyframes ua-toast-fade { from { opacity: 0; } to { opacity: 1; } }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/** Access the toast function. Returns a no-op if used outside a provider (SSR-safe). */
export function useToast(): ToastContextValue["toast"] {
  const ctx = useContext(ToastContext);
  return ctx?.toast ?? (() => {});
}
