'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import HelpdeskSidebarPreview from '@/components/settings/HelpdeskSidebarPreview';

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

      <HelpdeskSidebarPreview providerLabel="Zendesk" />
    </div>
  );
}
