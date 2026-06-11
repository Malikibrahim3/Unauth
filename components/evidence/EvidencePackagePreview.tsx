'use client';

/**
 * EvidencePackagePreview
 * Renders an inline PDF preview of the evidence package via the existing
 * /api/evidence/[id]/pdf endpoint.
 *
 * - Inline PDF via embed (same-origin API route)
 * - Aspect ratio 8.5 × 11 (US Letter) — responsive width
 * - Download button links to the same endpoint
 *
 * DO NOT modify the /api/evidence/[id]/pdf route.
 */

import { useState } from 'react';
import { FileText, Download, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface EvidencePackagePreviewProps {
  packageId: string;
  referenceNumber?: string;
}

// US Letter aspect ratio: 8.5 / 11 = ~77.27%
const LETTER_ASPECT_RATIO = (11 / 8.5) * 100;

export function EvidencePackagePreview({ packageId, referenceNumber }: EvidencePackagePreviewProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const pdfUrl = `/api/evidence/${packageId}/pdf`;

  return (
    <div
      className="border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)', borderRadius: 4 }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3 gap-3"
        style={{ borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-inset)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>
              <span aria-hidden="true" className="ua-section-dot" />
              Evidence Package
            </p>
            {referenceNumber && (
              <p className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                {referenceNumber} · Draft preview
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </a>
          <a
            href={pdfUrl}
            download
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-muted)' }}>
        <span>Document preview</span>
        <span>01 / 04</span>
      </div>

      {/* PDF frame - letter aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: `${LETTER_ASPECT_RATIO}%` }}>
        {/* Loading state */}
        {!loaded && !errored && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: 'var(--bg-subtle)' }}
          >
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--text-secondary)' }} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading PDF preview…</p>
          </div>
        )}

        {/* Error state */}
        {errored && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
            style={{ background: 'var(--bg-subtle)' }}
          >
            <AlertCircle className="h-6 w-6" style={{ color: 'var(--risk-high-fg)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                Preview unavailable
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Your browser may not support inline PDF rendering.
              </p>
            </div>
            <a
              href={pdfUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF instead
            </a>
          </div>
        )}

        <iframe
          src={pdfUrl}
          title={`Evidence package PDF${referenceNumber ? ` — ${referenceNumber}` : ''}`}
          aria-label={`Evidence package PDF preview${referenceNumber ? ` for ${referenceNumber}` : ''}`}
          sandbox=""
          className="absolute inset-0 w-full h-full border-0"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{ display: errored ? 'none' : 'block' }}
        />
      </div>
      <div className="px-4 py-2 flex items-center justify-between text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)', borderTop: '1px solid var(--border-muted)', background: 'var(--bg-inset)' }}>
        <span>Generated evidence package</span>
        <span>{referenceNumber ?? 'Draft'}</span>
      </div>
    </div>
  );
}
