'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { ConnectorSetupNotice } from '@/components/settings/ConnectorSetupShell';

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
        className="rounded-md border p-5"
        style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--ua-text-primary)' }}>
          You need an API key first
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--ua-text-secondary)' }}>
          Create a key in API &amp; Integrations, then return here to install the extension.
        </p>
        <Link
          href="/settings/integrations"
          className="mt-3 inline-flex h-8 items-center rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-metadata-size)] font-semibold"
          style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
        >
          Settings → API &amp; Integrations
        </Link>
      </div>
    );
  }

  const displayPrefix = keyPrefixes[0] ?? 'unauth_sk_…';

  return (
    <div className="space-y-3">
      <p
        className="rounded-[var(--ua-radius-control)] border px-4 py-3 text-[length:var(--ua-text-metadata-size)]"
        style={{ borderColor: 'var(--ua-border-default)', color: 'var(--ua-text-secondary)' }}
      >
        Available for manual install while Chrome Web Store listing is pending.
      </p>

      <div>
        <button
          type="button"
          onClick={() => void downloadZip()}
          disabled={downloading}
          className="inline-flex h-8 items-center gap-2 rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-metadata-size)] font-semibold disabled:opacity-60"
          style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
        >
          <Download className="h-4 w-4" />
          {downloading ? 'Preparing zip…' : 'Download Chrome extension (.zip)'}
        </button>
        {downloadError && (
          <div className="mt-3">
            <ConnectorSetupNotice tone="error">{downloadError} Retry the download or check that you still have permission to access this workspace.</ConnectorSetupNotice>
          </div>
        )}
        <p className="mt-2 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
          Unzip the download on your computer, then follow the steps below in Chrome.
        </p>
      </div>

      <ol className="list-decimal space-y-2 pl-5 text-[length:var(--ua-text-caption-size)] leading-5" style={{ color: 'var(--ua-text-primary)' }}>
        <li>Download the extension zip above and unzip it.</li>
        <li>
          In Chrome, open <strong>Extensions</strong> (from the puzzle icon or browser menu).
        </li>
        <li>
          Turn on <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and select the unzipped folder.
        </li>
        <li>Pin the Unauth extension to your toolbar.</li>
        <li>
          Click the icon → paste an API key from <strong>Settings → Integrations</strong> below.
        </li>
      </ol>

      <div
        className="rounded-md border p-4 text-sm"
        style={{ borderColor: 'var(--ua-border-default)', background: 'var(--ua-surface-primary)' }}
      >
        <p style={{ color: 'var(--ua-text-primary)' }}>
          Use key:{' '}
          <span className="font-mono text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
            {displayPrefix}
          </span>
        </p>
        {keyPrefixes.length > 1 && (
          <p className="mt-2 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
            Additional keys: {keyPrefixes.slice(1).join(', ')}
          </p>
        )}
        <p className="mt-2 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
          Paste the full secret you saved when the key was created - only the prefix is shown here.
        </p>
      </div>
    </div>
  );
}
