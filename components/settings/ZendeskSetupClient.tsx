'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { PanelCard, StatusBadge } from '@/components/ui';
import HelpdeskSidebarPreview from '@/components/settings/HelpdeskSidebarPreview';
import ZendeskSupportSyncClient from '@/components/settings/ZendeskSupportSyncClient';
import {
  ZENDESK_SUPPORT_WEBHOOK_PATH,
  ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM,
} from '@/lib/support/zendesk/supportConnectionShared';

const ZENDESK_ZIP_PATH = '/downloads/unauth-zendesk-app.zip';

type Props = {
  canManage?: boolean;
};

const SETUP_STEPS = [
  {
    number: 1,
    title: 'Download the Unauth app',
    detail: 'Same zip file for every Zendesk account.',
  },
  {
    number: 2,
    title: 'Upload as a private app',
    detail: 'Zendesk Admin → Apps and integrations → Zendesk Support apps → Upload private app',
  },
  {
    number: 3,
    title: 'Configure the app URL',
    detail: 'Set Unauth app URL to this deployment (HTTPS, no trailing slash), e.g. https://unauth-pi.vercel.app',
  },
  {
    number: 4,
    title: 'Add your API key',
    detail: null,
  },
  {
    number: 5,
    title: 'Install and verify',
    detail: 'Install the app, then return here and click Verify install below.',
  },
  {
    number: 6,
    title: 'Import ticket history',
    detail: 'Enter your Zendesk subdomain and API token below to sync up to 24 months of tickets.',
  },
  {
    number: 7,
    title: 'Add the ticket webhook',
    detail: `Zendesk Admin → Apps and integrations → Webhooks → create a webhook pointing to this deployment at ${ZENDESK_SUPPORT_WEBHOOK_PATH}?${ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM}=<your-subdomain>, then attach it to a trigger on ticket created/updated. Include the webhook secret shown when you connect below.`,
  },
];

export default function ZendeskSetupClient({ canManage = true }: Props) {
  const [sidebarVerified, setSidebarVerified] = useState(false);
  const [ticketSyncConnected, setTicketSyncConnected] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const loadConnectionStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/settings/zendesk/connection', { cache: 'no-store' });
      if (!res.ok) {
        setSidebarVerified(false);
        setTicketSyncConnected(false);
        return;
      }
      const body = (await res.json()) as {
        connected?: boolean;
        connection?: { status?: string; zendesk_api_configured?: boolean };
        link?: { helpdeskLinked?: boolean; sidebarReady?: boolean };
      };
      setTicketSyncConnected(
        Boolean(body.link?.helpdeskLinked ?? body.connected ?? body.connection?.zendesk_api_configured),
      );
      setSidebarVerified(Boolean(body.link?.sidebarReady ?? body.connection?.status === 'active'));
    } catch {
      setSidebarVerified(false);
      setTicketSyncConnected(false);
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
      setSidebarVerified(true);
    } catch {
      setVerifyError('Could not verify the Zendesk install.');
    } finally {
      setVerifying(false);
    }
  }

  const allDone = !statusLoading && sidebarVerified && ticketSyncConnected;

  return (
    <div className="space-y-8">
      {/* Status header */}
      <div className="flex items-start gap-3">
        <Image
          src="/integrations/zendesk.svg"
          alt="Zendesk"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl object-contain"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Zendesk
            </p>
            {!statusLoading ? (
              <StatusBadge variant={allDone ? 'cleared' : sidebarVerified ? 'flagged' : 'held'}>
                {allDone ? 'Connected' : sidebarVerified ? 'Partial setup' : 'Not connected'}
              </StatusBadge>
            ) : null}
          </div>
          {allDone ? (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Sidebar app verified · Ticket sync active
            </p>
          ) : sidebarVerified ? (
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              Sidebar verified · Add API token below to sync ticket history
            </p>
          ) : null}
        </div>
      </div>

      {/* Setup steps */}
      <PanelCard variant="app" className="divide-y overflow-hidden p-0">
        <div className="px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Setup steps
          </p>
        </div>

        {SETUP_STEPS.map((step) => {
          const isDone =
            (step.number <= 5 && sidebarVerified) ||
            (step.number === 6 && ticketSyncConnected);

          return (
            <div
              key={step.number}
              className="flex gap-3 px-4 py-3.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5"
                style={{
                  background: isDone
                    ? 'color-mix(in srgb, var(--success) 15%, transparent)'
                    : 'color-mix(in srgb, var(--text-secondary) 10%, transparent)',
                  color: isDone ? 'var(--success)' : 'var(--text-secondary)',
                }}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{step.number}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {step.title}
                </p>
                {step.number === 4 ? (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    When prompted, paste a key from{' '}
                    <Link
                      href="/settings/integrations"
                      className="underline"
                      style={{ color: 'var(--accent)' }}
                    >
                      Settings → Integrations → API keys
                    </Link>
                  </p>
                ) : step.detail ? (
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </PanelCard>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <a
          href={ZENDESK_ZIP_PATH}
          download="unauth-zendesk-app.zip"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <Download className="h-4 w-4" />
          Download Zendesk app (.zip)
        </a>
        <button
          type="button"
          onClick={() => void verifyInstall()}
          disabled={verifying || sidebarVerified}
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          {sidebarVerified ? (
            <>
              <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--success)' }} />
              Sidebar verified
            </>
          ) : verifying ? (
            'Verifying…'
          ) : (
            'Verify install'
          )}
        </button>
        <a
          href="https://support.zendesk.com/hc/en-us/articles/4408843303194"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          Zendesk docs
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {verifyError ? (
        <PanelCard
          variant="app"
          className="px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--risk-critical) 30%, var(--border))',
            background: 'color-mix(in srgb, var(--risk-critical) 6%, var(--surface))',
            color: 'var(--text)',
          }}
        >
          {verifyError}
        </PanelCard>
      ) : null}

      {/* Ticket sync section */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Ticket sync
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Connect your Zendesk account to import ticket history and link support conversations to customer profiles.
          </p>
        </div>
        <ZendeskSupportSyncClient canManage={canManage} />
      </div>

      <HelpdeskSidebarPreview providerLabel="Zendesk" />
    </div>
  );
}
