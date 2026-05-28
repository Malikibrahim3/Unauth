'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';

type Props = {
  hasApiKeys: boolean;
  keyPrefixes: string[];
};

export default function ZendeskSetupClient({ hasApiKeys, keyPrefixes }: Props) {
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

  if (!hasApiKeys) {
    return (
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          You need an API key first
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Create a key in API &amp; Integrations, then return here to download the Zendesk app.
        </p>
        <Link
          href="/settings/api-integrations"
          className="mt-4 inline-flex rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
        >
          Settings → API &amp; Integrations
        </Link>
      </div>
    );
  }

  const displayPrefix = keyPrefixes[0] ?? 'unauth_sk_…';

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
        <li>Download the Unauth app zip above.</li>
        <li>
          In Zendesk → Admin → Apps and integrations → Zendesk Support apps → Upload private app
        </li>
        <li>Upload the zip file.</li>
        <li>
          When prompted for API key, enter your key from Unauth → Settings → API &amp; Integrations
        </li>
        <li>Install — Unauth now appears on every ticket sidebar.</li>
      </ol>

      <div
        className="rounded-lg border p-4 text-sm"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <p style={{ color: 'var(--text)' }}>
          Use key:{' '}
          <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {displayPrefix}
          </span>
        </p>
        {keyPrefixes.length > 1 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Additional keys: {keyPrefixes.slice(1).join(', ')}
          </p>
        )}
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Paste the full secret you saved when the key was created — only the prefix is shown here.
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
              style={{ background: '#3d0e0a', borderColor: '#e8362a', color: '#fde8e6' }}
            >
              <p className="font-bold text-sm">🔴 HIGH RISK</p>
              <p className="mt-1 opacity-90">Confidence: Definite · Score: 87</p>
              <p className="mt-3 text-[10px] uppercase opacity-60">Signals</p>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                <li>Refund abuse, 4 merchants</li>
                <li>Address cluster</li>
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
