'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DURATION, TOAST_TIMEOUT } from '@/lib/design/motion';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';

export type ToastTone = 'success' | 'info' | 'danger';
interface ToastItem { id: number; title: string; description?: string; tone: ToastTone; closing: boolean; }
interface ToastContextValue { toast: (input: { title: string; description?: string; tone?: ToastTone }) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);
const toneSurface: Record<ToastTone, string> = { success: '#eaf5ef', info: '#edf6f8', danger: '#fdf0e6' };
const toneColour: Record<ToastTone, string> = { success: '#1a6b43', info: '#247388', danger: '#b0431a' };

function toastLifetimeMs(tone: ToastTone, hasDescription: boolean): number | null { if (tone === 'danger') return TOAST_TIMEOUT.danger; return hasDescription ? TOAST_TIMEOUT.withDescription : TOAST_TIMEOUT.titleOnly; }

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="m5 8.1 2 2 4-4.2"/></svg>;
  if (tone === 'danger') return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2 14 13H2Z"/><path d="M8 6v3M8 11.4h.01"/></svg>;
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 4.7h.01"/></svg>;
}

function ToastItemView({ item, onRequestClose, onExited }: { item: ToastItem; onRequestClose: () => void; onExited: () => void; }) {
  const { phase, motionAllowed } = useOverlayPresence({ open: !item.closing, onClose: onRequestClose, onExited, exitDurationMs: DURATION.fast, transient: true });
  const lifetimeMs = toastLifetimeMs(item.tone, Boolean(item.description));
  const remainingRef = useRef(lifetimeMs ?? 0);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = null; }, []);
  const start = useCallback(() => { if (lifetimeMs === null || item.closing) return; clearTimer(); startedAtRef.current = Date.now(); timerRef.current = setTimeout(onRequestClose, remainingRef.current); }, [clearTimer, item.closing, lifetimeMs, onRequestClose]);
  const pause = useCallback(() => { if (lifetimeMs === null || startedAtRef.current === null) return; clearTimer(); remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAtRef.current)); startedAtRef.current = null; }, [clearTimer, lifetimeMs]);
  useEffect(() => { start(); const onVisibilityChange = () => { if (document.hidden) pause(); else start(); }; document.addEventListener('visibilitychange', onVisibilityChange); return () => { clearTimer(); document.removeEventListener('visibilitychange', onVisibilityChange); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!phase) return null;
  const isOpen = phase === 'open';
  const duration = phase === 'exiting' ? DURATION.fast : DURATION.base;
  return <div role="status" aria-live="polite" aria-hidden={phase === 'exiting' ? true : undefined} onMouseEnter={pause} onMouseLeave={start} onFocus={pause} onBlur={start} style={{ pointerEvents: phase === 'exiting' ? 'none' : 'auto', display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, border: '1px solid #e4e3e0', borderRadius: 12, background: toneSurface[item.tone], boxShadow: '0 12px 30px rgba(28,27,25,.12)', opacity: isOpen ? 1 : 0, transform: isOpen ? 'translateY(0)' : 'translateY(8px)', transition: motionAllowed ? `opacity ${duration}ms ease, transform ${duration}ms ease` : 'none' }}>
    <span aria-hidden="true" style={{ flex: 'none', marginTop: 2, color: toneColour[item.tone] }}><ToastIcon tone={item.tone}/></span>
    <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, color: '#1c1f23', font: "500 13px/1.5 'Inter',sans-serif" }}>{item.title}</p>{item.description ? <p style={{ margin: '2px 0 0', color: '#64686d', font: "400 12px/1.45 'Inter',sans-serif" }}>{item.description}</p> : null}</div>
    <button type="button" aria-label="Dismiss notification" onClick={onRequestClose} style={{ width: 26, height: 26, flex: 'none', display: 'grid', placeItems: 'center', padding: 0, border: 0, borderRadius: 7, background: 'transparent', color: '#64686d', cursor: 'pointer' }}><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true"><path d="m3.5 3.5 7 7M10.5 3.5l-7 7"/></svg></button>
  </div>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const requestClose = useCallback((id: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, closing: true } : item)), []);
  const remove = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const toast = useCallback<ToastContextValue['toast']>(({ title, description, tone = 'info' }) => { idRef.current += 1; setItems((current) => [...current, { id: idRef.current, title, description, tone, closing: false }]); }, []);
  const value = useMemo(() => ({ toast }), [toast]);
  return <ToastContext.Provider value={value}>{children}<div role="region" aria-label="Notifications" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 80, width: 'min(360px,calc(100vw - 2rem))', display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>{items.map((item) => <ToastItemView key={item.id} item={item} onRequestClose={() => requestClose(item.id)} onExited={() => remove(item.id)}/>)}</div></ToastContext.Provider>;
}

export function useToast(): ToastContextValue['toast'] { const ctx = useContext(ToastContext); return ctx?.toast ?? (() => {}); }
