'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Download } from 'lucide-react';
import HelpdeskSidebarPreview from '@/components/settings/HelpdeskSidebarPreview';

const ZENDESK_ZIP_PATH = '/downloads/unauth-zendesk-app.zip';

export default function ZendeskSetupClient() {
  const [connected, setConnected] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const loadConnectionStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/settings/zendesk/connection', { cache: 'no-store' });
      if (!res.ok) {
        setConnected(false);
        return;
      }
      const body = (await res.json()) as { connected?: boolean };
      setConnected(Boolean(body.connected));
    } catch {
      setConnected(false);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConnectionStatus();
  }, [loadConnectionStatus]);

  async function verifyInstall() {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch('/api/settings/zendesk/verify-install', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setVerifyError(body.error ?? 'Verification failed');
        return;
      }
      setConnected(true);
    } catch {
      setVerifyError('Could not verify the Zendesk install.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={ZENDESK_ZIP_PATH}
          download="unauth-zendesk-app.zip"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg, #fff)' }}
        >
          <Download className="h-4 w-4" />
          Download Zendesk app (.zip)
        </a>
        <button
          type="button"
          onClick={() => void verifyInstall()}
          disabled={verifying || connected}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={{ borderColor: 'var(--surface-border)', color: 'var(--text)' }}
        >
          {connected ? (
            <>
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--sev-clear, #2f6b43)' }} />
              Install verified
            </>
          ) : verifying ? (
            'Verifying…'
          ) : (
            'Verify install'
          )}
        </button>
      </div>
      {verifyError && (
        <p className="text-sm" style={{ color: 'var(--danger, #e8362a)' }}>
          {verifyError}
        </p>
      )}
      {!statusLoading && connected && (
        <p className="text-sm font-medium" style={{ color: 'var(--sev-clear, #2f6b43)' }}>
          Zendesk is connected. The sidebar app should appear on support tickets.
        </p>
      )}

      <ol className="list-decimal space-y-3 pl-5 text-sm" style={{ color: 'var(--text)' }}>
        <li>Download the Unauth app zip above (same file for every merchant).</li>
        <li>
          In Zendesk → Admin → Apps and integrations → Zendesk Support apps → Upload private app
        </li>
        <li>Upload the zip file.</li>
        <li>
          Set <strong>Unauth app URL</strong> to this deployment (HTTPS, no trailing slash), e.g.{' '}
          <code className="text-xs">https://unauth-pi.vercel.app</code>.
        </li>
        <li>
          When prompted for <strong>API key</strong>, paste a key from{' '}
          <Link href="/settings/integrations" className="underline" style={{ color: 'var(--accent)' }}>
            Settings → Integrations
          </Link>{' '}
          (Advanced → API keys).
        </li>
        <li>Install the app. Unauth appears on every ticket sidebar.</li>
        <li>Return here and click <strong>Verify install</strong>.</li>
      </ol>

      <div
        className="rounded-lg border p-4 text-sm"
        style={{ borderColor: 'var(--surface-border)', background: 'var(--surface-raised)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>
          Use an existing API key from Settings → API &amp; Integrations. Revoke or rotate keys there
          at any time; update the key in Zendesk app settings if you change it.
        </p>
      </div>

      <HelpdeskSidebarPreview providerLabel="Zendesk" />
    </div>
  );
}
