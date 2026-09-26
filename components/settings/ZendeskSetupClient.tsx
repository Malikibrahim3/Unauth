'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { Card } from '@/components/ui';
import { StatusBadge } from '@/components/ui/StatusBadge';
import HelpdeskSidebarPreview from '@/components/settings/HelpdeskSidebarPreview';
import ZendeskSupportSyncClient from '@/components/settings/ZendeskSupportSyncClient';
import {
  ZENDESK_SUPPORT_WEBHOOK_HEADER_NAME,
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
    detail: 'Zendesk Admin, then Apps and integrations, then Zendesk Support apps, then Upload private app',
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
    detail: `Zendesk Admin, then Apps and integrations, then Webhooks, then create a webhook pointing to this deployment at ${ZENDESK_SUPPORT_WEBHOOK_PATH}?${ZENDESK_WEBHOOK_DOMAIN_QUERY_PARAM}=<your-subdomain>. Add header ${ZENDESK_SUPPORT_WEBHOOK_HEADER_NAME} with the one-time secret shown when you connect, then attach the webhook to a trigger on ticket created/updated.`,
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
    <div className="space-y-3">
      {/* Status header */}
      <div className="flex items-start gap-3">
        <Image
          src="/providers/zendesk.svg"
          alt="Zendesk"
          width={40}
          height={40}
          className="h-9 w-9 shrink-0 rounded-[8px] border border-[#eae8e5] object-contain p-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
              Zendesk
            </p>
            {!statusLoading ? (
              <StatusBadge family="workflowStatus" value={allDone ? 'connected' : sidebarVerified ? 'partial_setup' : 'disconnected'} />
            ) : null}
          </div>
          {allDone ? (
            <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
              Sidebar app verified · Ticket sync active
            </p>
          ) : sidebarVerified ? (
            <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
              Sidebar verified · Add API token below to sync ticket history
            </p>
          ) : null}
        </div>
      </div>

      {/* Setup steps */}
      <Card unstyled variant="panel" className="divide-y overflow-hidden p-0">
        <div className="px-4 py-2.5">
          <p className="text-[11px] font-medium leading-4 text-[#64686d]" style={{ color: '#64686d' }}>
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
              className="flex gap-3 px-4 py-3"
              style={{ borderColor: '#e4e3e0' }}
            >
              <div
                className="text-[11px] font-medium leading-4 text-[#64686d] flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold mt-0.5"
                style={{
                  background: isDone
                    ? 'color-mix(in srgb, #1a6b43 15%, transparent)'
                    : 'color-mix(in srgb, #64686d 10%, transparent)',
                  color: isDone ? '#1a6b43' : '#64686d',
                }}
              >
                {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{step.number}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
                  {step.title}
                </p>
                {step.number === 4 ? (
                  <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
                    When prompted, paste a key from{' '}
                    <Link
                      href="/sources/connected"
                      className="underline"
                      style={{ color: '#9f4f08' }}
                    >
                      Settings, then Integrations, then API keys
                    </Link>
                  </p>
                ) : step.detail ? (
                  <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <a
          href={ZENDESK_ZIP_PATH}
          download="unauth-zendesk-app.zip"
          className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex h-8 items-center gap-2 rounded-[8px] px-3"
          style={{ background: '#9f4f08', color: '#fff' }}
        >
          <Download className="h-4 w-4" />
          Download Zendesk app (.zip)
        </a>
        <button
          type="button"
          onClick={() => void verifyInstall()}
          disabled={verifying || sidebarVerified}
          className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex h-8 items-center gap-2 rounded-[8px] border px-3 disabled:opacity-60"
          style={{ borderColor: '#e4e3e0', color: '#1c1f23' }}
        >
          {sidebarVerified ? (
            <>
              <CheckCircle2 className="h-4 w-4" style={{ color: '#1a6b43' }} />
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
          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border px-3 text-[length:10.5px] font-medium"
          style={{ borderColor: '#e4e3e0', color: '#64686d' }}
        >
          Zendesk docs
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {verifyError ? (
        <Card unstyled
          variant="panel"
          className="text-[13px] leading-5 text-[#40454a] px-4 py-3"
          style={{
            borderColor: 'color-mix(in srgb, #b0431a 30%, #e4e3e0)',
            background: 'color-mix(in srgb, #b0431a 6%, #fff)',
            color: '#1c1f23',
          }}
        >
          {verifyError}
        </Card>
      ) : null}

      {/* Ticket sync section */}
      <div className="space-y-2.5 border-t border-[#eae8e5] pt-3">
        <div>
          <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
            Ticket sync
          </p>
          <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-0.5" style={{ color: '#64686d' }}>
            Connect your Zendesk account to import ticket history and link support conversations to customer profiles.
          </p>
        </div>
        <ZendeskSupportSyncClient canManage={canManage} />
      </div>

      <HelpdeskSidebarPreview providerLabel="Zendesk" />
    </div>
  );
}
