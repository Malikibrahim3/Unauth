'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';

type Props = {
  hasApiKeys: boolean;
  keyPrefixes: string[];
};

export default function ChromeSetupClient({ hasApiKeys, keyPrefixes }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadZip() {
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch('/api/settings/chrome/download');
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setDownloadError(body.error ?? 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'unauth-chrome-extension.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Could not download the Chrome extension zip.');
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
          Create a key in API &amp; Integrations, then return here to install the extension.
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
      <p
        className="rounded-md border px-4 py-3 text-sm"
        style={{ borderColor: 'var(--surface-border)', color: 'var(--text-muted)' }}
      >
        Available for manual install while Chrome Web Store listing is pending.
      </p>

      <div>
        <button
          type="button"
          onClick={() => void downloadZip()}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Preparing zip…' : 'Download Chrome extension (.zip)'}
        </button>
        {downloadError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--danger, #e8362a)' }}>
            {downloadError}
          </p>
        )}
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Or build locally: <code className="text-xs">npm run build:extension</code>, then load{' '}
          <code className="text-xs">extensions/chrome/dist</code> unpacked in Chrome.
        </p>
      </div>

      <ol className="list-decimal space-y-3 pl-5 text-sm" style={{ color: 'var(--text)' }}>
        <li>Download the extension zip above (or build into <code>extensions/chrome/dist</code>).</li>
        <li>
          Open Chrome → <strong>More tools</strong> → <strong>Extensions</strong> → enable{' '}
          <strong>Developer mode</strong>.
        </li>
        <li>
          Click <strong>Load unpacked</strong> → select the <code>extensions/chrome/dist</code> folder
          (or unzip the download and select that folder).
        </li>
        <li>Pin the Unauth extension to your toolbar.</li>
        <li>
          Click the icon → enter your API key from Settings → API &amp; Integrations → done.
        </li>
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
    </div>
  );
}
