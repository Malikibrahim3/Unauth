'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

export default function ZendeskSetupClient() {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadZip() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/settings/zendesk/download');
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setDownloadError(body.error ?? 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unauth-zendesk-app.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Could not download the Zendesk app zip.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <button
          type="button"
          onClick={() => void downloadZip()}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Preparing zip…' : 'Download Zendesk app (.zip)'}
        </button>
        {downloadError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--danger, #e8362a)' }}>
            {downloadError}
          </p>
        )}
      </div>

      <ol className="list-decimal space-y-3 pl-5 text-sm" style={{ color: 'var(--text)' }}>
        <li>Download the Unauth app zip above — it ships pre-configured with your key.</li>
        <li>
          In Zendesk → Admin → Apps and integrations → Zendesk Support apps → Upload private app
        </li>
        <li>Upload the zip file.</li>
        <li>Install — no API key to paste. Unauth now appears on every ticket sidebar.</li>
      </ol>

      <div
        className="rounded-lg border p-4 text-sm"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Each download mints a dedicated, revocable API key bundled into the app. Manage or revoke
          it any time in Settings → API &amp; Integrations.
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Sidebar preview
        </p>
        <div className="flex gap-6 items-start flex-wrap">
          <div
            className="w-[300px] shrink-0 rounded-lg border p-3 text-xs"
            style={{
              borderColor: 'var(--surface-border)',
              background: '#14100e',
              color: '#f5f0eb',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div
              className="rounded-md p-3 border"
              style={{ background: '#0f2a18', borderColor: '#6fcf97', color: '#e6f7ed' }}
            >
              <p className="font-bold text-sm">🟢 DEFINITE</p>
              <p className="mt-1 opacity-90">Matched on email + shipping address</p>
              <p className="mt-3 text-[10px] uppercase opacity-60">Claims on record</p>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                <li>2 refunds · your store</li>
                <li>4 refunds across 3 merchants</li>
              </ul>
              <div
                className="mt-3 rounded px-2 py-1.5"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              >
                Cross-merchant: 4 merchants · 6 claims
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <span
                  className="block text-center rounded py-1.5 font-semibold"
                  style={{ background: '#c8763a', color: '#fff' }}
                >
                  View Profile
                </span>
                <span
                  className="block text-center rounded py-1.5 border"
                  style={{ borderColor: '#3d2e28', color: '#c8763a' }}
                >
                  Get PDF
                </span>
              </div>
            </div>
            <p className="text-right mt-2 opacity-40">Unauth</p>
          </div>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Approximate appearance inside Zendesk (~300px sidebar). Risk colours change based on
            customer grade.
          </p>
        </div>
      </div>
    </div>
  );
}
