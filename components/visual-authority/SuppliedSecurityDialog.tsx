'use client';

import { useCallback, type ReactNode } from 'react';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import { useOverlayPresence } from '@/lib/design/useOverlayPresence';

// User-approved reuse of the exact Write-Off-Clean frame for security forms
// absent from the ZIP. Only form content, confirmations and handlers vary.
export function SuppliedSecurityDialog({ open = true, title, description, overlayId, busy = false, onClose, children, footer }: {
  open?: boolean;
  title: string;
  description: string;
  overlayId: string;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  const requestClose = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);
  const { mounted, phase, containerRef } = useOverlayPresence({ open, onClose: requestClose, trapFocus: true, restoreFocus: true, lockBodyScroll: true, closeOnEscape: !busy, exitDurationMs: 0 });
  if (!mounted) return null;
  return <OverlayPortal><div style={{ position: 'fixed', zIndex: 1000, pointerEvents: 'auto', inset: 0, background: 'rgba(34,29,23,.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }} onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
    <section data-reference-tag="div" data-source-dialog-frame="Write-Off-Clean" data-overlay-id={overlayId} data-overlay-state={phase} ref={containerRef} role="dialog" aria-modal="true" aria-label={title} aria-busy={busy || undefined} tabIndex={-1} style={{ width: 620, maxHeight: '100%', background: '#ffffff', borderRadius: 14, boxShadow: '0 30px 70px rgba(28,22,14,.34),0 2px 8px rgba(28,22,14,.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '17px 18px 15px', borderBottom: '1px solid #eae8e5', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "500 15px/1.3 'Inter',sans-serif", color: '#1c1f23' }}>{title}</div>
          <div style={{ font: "400 12px/1.5 'Inter',sans-serif", color: '#64686d', marginTop: 4 }}>{description}</div>
        </div>
        <button type="button" aria-label={busy ? 'Close unavailable while saving' : 'Close dialog'} disabled={busy} onClick={requestClose} style={{ width: 32, height: 32, flex: 'none', display: 'grid', placeItems: 'center', border: '1px solid #e4e3e0', borderRadius: 8, background: '#fff', color: '#64686d', cursor: busy ? 'not-allowed' : 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true"><path d="M2.6 2.6 9.4 9.4M9.4 2.6 2.6 9.4" /></svg>
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>{children}</div>
      <div style={{ padding: '13px 18px', background: '#ffffff', borderTop: '1px solid #eae8e5', display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ flex: 1 }} />{footer}</div>
    </section>
  </div></OverlayPortal>;
}
