'use client';

import { useReducer } from 'react';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import type { CustomerIntelligencePanel } from '@/app/api/customers/[id]/route';
import { BuildEvidencePackageDrawer } from '@/components/evidence/BuildEvidencePackageDrawer';
import { CustomerIntelligenceDrawerContent } from '@/components/customers/CustomerIntelligenceDrawerContent';
import { DrawerSkeleton } from '@/components/customers/CustomerIntelligenceDrawerPrimitives';
import {
  customerIntelligenceDrawerUiReducer,
  initialCustomerIntelligenceDrawerUi,
} from '@/components/customers/customerIntelligenceDrawerReducer';
import { useFetchJson } from '@/lib/react/useFetchJson';
import { Drawer } from '@/components/ui/Drawer';

interface CustomerIntelligenceDrawerProps {
  profileId: string | null;
  onClose: () => void;
  prefetchedPanel?: CustomerIntelligencePanel | null;
  open?: boolean;
  resolving?: boolean;
}

function CustomerIntelligenceDrawerShell({
  profileId,
  onClose,
  prefetchedPanel,
  resolving,
}: CustomerIntelligenceDrawerProps) {
  const [ui, dispatchUi] = useReducer(
    customerIntelligenceDrawerUiReducer,
    initialCustomerIntelligenceDrawerUi,
  );
  const fetchUrl = profileId ? `/api/customers/${profileId}` : null;
  const { data: fetchedPanel, error: fetchError, loading: fetchLoading } =
    useFetchJson<CustomerIntelligencePanel>(fetchUrl);

  const panel = profileId ? (fetchedPanel ?? null) : prefetchedPanel;
  const loading = Boolean(profileId && fetchLoading);
  const error = profileId ? fetchError : null;
  const isNotFoundError = error?.startsWith('HTTP 404');
  const resolvedProfileId = profileId || panel?.profile.id || null;
  const showLoading = resolving || loading || (!!profileId && !panel && !error);

  return (
    <>
      <Drawer
        open
        onClose={onClose}
        width="min(629px, 100vw)"
        aria-label="Customer summary"
      >
        <div data-testid="customer-drawer" className="flex min-h-full flex-col bg-[var(--surface)]">
          <div className="cid-header">
            <div>
              <div className="cid-overline">
                <span aria-hidden="true" className="ua-section-dot" />
                Customer summary
              </div>
              <p className="cid-header-subtitle">What happened, in order</p>
            </div>
            <div className="flex items-center gap-2">
              {resolvedProfileId ? (
                <Link
                  href={`/customers/${resolvedProfileId}`}
                  onClick={onClose}
                  className="cid-profile-link hover:bg-[var(--surface-sunken)]"
                >
                  Full profile <ExternalLink className="cid-icon-11" />
                </Link>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close panel"
                className="cid-close-btn hover:bg-[var(--surface)] transition-colors"
              >
                <X className="cid-icon-16" />
              </button>
            </div>
          </div>

          <div className="cid-body flex-1">
            {showLoading ? <DrawerSkeleton /> : null}

            {error ? (
              <div className="cid-error-banner">
                {isNotFoundError
                  ? 'Customer record could not be found for this merchant.'
                  : 'Failed to load customer data. Please try again.'}
              </div>
            ) : null}

            {panel && !showLoading ? (
              <CustomerIntelligenceDrawerContent
                panel={panel}
                ordersExpanded={ui.ordersExpanded}
                dispatchUi={dispatchUi}
              />
            ) : null}
          </div>
        </div>
      </Drawer>

      {resolvedProfileId ? (
        <BuildEvidencePackageDrawer
          open={ui.evidenceOpen}
          onClose={() => dispatchUi({ type: 'close_evidence' })}
          profileId={resolvedProfileId}
          preselectedOrderId={ui.evidenceOrderId}
        />
      ) : null}
    </>
  );
}

export default function CustomerIntelligenceDrawer({
  profileId,
  onClose,
  prefetchedPanel = null,
  open: openProp = false,
  resolving = false,
}: CustomerIntelligenceDrawerProps) {
  const isOpen = !!(profileId || openProp);
  if (!isOpen) return null;

  const shellKey = profileId ?? prefetchedPanel?.profile.id ?? 'open';

  return (
    <CustomerIntelligenceDrawerShell
      key={shellKey}
      profileId={profileId}
      onClose={onClose}
      prefetchedPanel={prefetchedPanel}
      open={openProp}
      resolving={resolving}
    />
  );
}
