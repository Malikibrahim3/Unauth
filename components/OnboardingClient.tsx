'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthProductContext } from '@/app/(auth)/AuthShell';
import { LOSS_CONCERN_OPTIONS, ORDER_VOLUME_OPTIONS } from '@/lib/constants/merchantProfile';
import { formatNumber } from '@/lib/utils/format';

export type OnboardingConnectorView = {
  id: string;
  name: string;
  stage: string;
  status: string;
  account: string | null;
  importedRecords: number;
  importedRecordsKnown: boolean;
  connectEnabled: boolean;
};

interface OnboardingClientProps {
  userId: string;
  initialStoreName?: string;
  initialPlatform?: string;
  initialAnnualVolume?: string;
  initialPrimaryConcern?: string;
  initialUsesWms3pl?: string;
  initialUsesReturnsPlatform?: string;
  initialProfileComplete?: boolean;
  shopifyConnected?: boolean;
  shopifyShopDomain?: string;
  helpdeskConnected?: boolean;
  helpdeskProvider?: 'gorgias' | 'zendesk' | 'freshdesk' | null;
  workspaceHref?: string;
  requestedPlan?: string;
  requestedCredits?: string;
  requestedPlanUnavailableReason?: string;
  initialConnectors?: OnboardingConnectorView[];
}

type View = 'profile' | 'connect' | 'verified';
type ConnectorTone = 'ok' | 'partial' | 'planned';
type ProfileField = 'storeName' | 'platform' | 'annualVolume' | 'primaryConcern';

const CONNECTED_STATUSES = new Set(['connected', 'active', 'import_complete', 'syncing', 'importing']);

function connectorMonogram(id: string) {
  if (id === 'shopify') return 'SHO';
  if (id === 'stripe') return 'PAY';
  if (id === 'shipbob') return 'SHP';
  if (id === 'royal_mail') return 'RM';
  if (id === 'csv_import') return 'DOC';
  return 'TKT';
}

export default function OnboardingClient(props: OnboardingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get('step');
  const [view, setViewState] = useState<View>(() => {
    if (requestedStep === 'profile') return 'profile';
    if (!props.initialProfileComplete) return 'profile';
    if (requestedStep === 'verified' || requestedStep === 'first') return 'verified';
    return 'connect';
  });
  const [profile, setProfile] = useState({
    storeName: props.initialStoreName ?? '',
    platform: props.initialPlatform ?? '',
    annualVolume: props.initialAnnualVolume ?? '',
    primaryConcern: props.initialPrimaryConcern ?? '',
    usesWms3pl: props.initialUsesWms3pl ?? '',
    usesReturnsPlatform: props.initialUsesReturnsPlatform ?? '',
  });
  const [profileSaved, setProfileSaved] = useState(Boolean(props.initialProfileComplete));
  const [setupVerified, setSetupVerified] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [busy, setBusy] = useState<'profile' | 'complete' | 'defer' | null>(null);
  const [error, setError] = useState('');
  const {
    shopifyConnected = false,
    shopifyShopDomain = '',
    helpdeskConnected = false,
    helpdeskProvider = null,
    workspaceHref = '/overview',
    initialConnectors = [],
  } = props;

  const connectorById = useMemo(
    () => new Map(initialConnectors.map((connector) => [connector.id, connector])),
    [initialConnectors],
  );
  const shopify = connectorById.get('shopify');
  const stripe = connectorById.get('stripe');
  const shipbob = connectorById.get('shipbob');
  const helpdeskId = helpdeskProvider ?? 'gorgias';
  const helpdesk = connectorById.get(helpdeskId);
  const csv = connectorById.get('csv_import');
  const shopifyIsConnected = shopifyConnected || Boolean(shopify && CONNECTED_STATUSES.has(shopify.status));
  const helpdeskIsConnected = helpdeskConnected || Boolean(helpdesk && CONNECTED_STATUSES.has(helpdesk.status));
  const shipbobIsConnected = Boolean(shipbob && CONNECTED_STATUSES.has(shipbob.status));
  const warehouseRequired = profile.usesWms3pl === 'yes';
  const requiredTotal = warehouseRequired ? 3 : 2;
  const coreRequiredConnected = Number(shopifyIsConnected) + Number(helpdeskIsConnected) + Number(warehouseRequired && shipbobIsConnected);
  const setupPercent = Math.round(coreRequiredConnected / requiredTotal * 100);

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', next);
    window.history.replaceState(null, '', `/onboarding?${params.toString()}`);
    setViewState(next);
    setError('');
  }

  function setProfileField(field: keyof typeof profile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    if (field in fieldErrors) setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setError('');
  }

  async function saveProfileAndContinue() {
    const nextErrors: Partial<Record<ProfileField, string>> = {};
    if (!profile.storeName.trim()) nextErrors.storeName = 'Enter your store name.';
    if (!profile.platform) nextErrors.platform = 'Choose your platform.';
    if (!profile.annualVolume) nextErrors.annualVolume = 'Choose a monthly order volume.';
    if (!profile.primaryConcern) nextErrors.primaryConcern = 'Choose a primary concern.';
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setError('Review the highlighted fields before continuing.');
      return;
    }
    setBusy('profile');
    setError('');
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeName: profile.storeName.trim(),
        platform: profile.platform,
        monthlyOrderVolume: profile.annualVolume,
        primaryLossConcern: profile.primaryConcern,
        usesWms3pl: profile.usesWms3pl ? profile.usesWms3pl === 'yes' : undefined,
        usesReturnsPlatform: profile.usesReturnsPlatform ? profile.usesReturnsPlatform === 'yes' : undefined,
        profileComplete: true,
        setupComplete: false,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok) {
      setError(payload.error ?? 'Could not save your store details.');
      return;
    }
    setProfileSaved(true);
    setView('connect');
    router.refresh();
  }

  useEffect(() => {
    function handleShopifyOAuth(event: MessageEvent) {
      if (event.origin === window.location.origin && event.data && typeof event.data === 'object' && event.data.type === 'shopify_oauth_complete') {
        router.refresh();
      }
    }
    window.addEventListener('message', handleShopifyOAuth);
    return () => window.removeEventListener('message', handleShopifyOAuth);
  }, [router]);

  async function completeSetup() {
    if (!shopifyIsConnected || !helpdeskIsConnected || (warehouseRequired && !shipbobIsConnected)) {
      setError('Connect every required source, or choose Finish setup later. Optional and unavailable sources do not block deferral.');
      return;
    }
    setBusy('complete');
    setError('');
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setupComplete: true }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);
    if (!response.ok || payload.setupComplete !== true) {
      setError(payload.error ?? 'Could not verify the connected sources.');
      return;
    }
    setView('verified');
    setSetupVerified(true);
    router.refresh();
  }

  async function deferOnboarding() {
    setBusy('defer');
    setError('');
    try {
      const response = await fetch('/api/account/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deferOnboarding: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.onboardingDeferred !== true) throw new Error('defer_failed');
      router.push(workspaceHref);
      router.refresh();
    } catch {
      setBusy(null);
      setError('We could not defer setup. Try again, or continue setup here.');
    }
  }

  function sourceDetail(connector: OnboardingConnectorView | undefined, fallback: string) {
    if (!connector) return fallback;
    if (connector.importedRecordsKnown) return `${formatNumber(connector.importedRecords)} records read`;
    if (connector.account) return connector.account;
    return fallback;
  }

  const helpdeskName = helpdesk?.name ?? (helpdeskProvider === 'zendesk' ? 'Zendesk' : helpdeskProvider === 'freshdesk' ? 'Freshdesk' : 'Gorgias');
  const connectors: Array<{
    id: string;
    name: string;
    state: string;
    tone: ConnectorTone;
    detail: string;
    action: string;
    href: string;
    primary: boolean;
  }> = [
    {
      id: 'shopify',
      name: 'Shopify',
      state: shopifyIsConnected ? 'Connected' : 'Not connected',
      tone: shopifyIsConnected ? 'ok' : 'planned',
      detail: shopifyIsConnected ? `Orders, refunds and discounts · ${sourceDetail(shopify, shopifyShopDomain || 'data received')}` : 'Orders, refunds and discounts · required for the operating position',
      action: shopifyIsConnected ? 'Manage' : 'Connect',
      href: shopifyIsConnected ? '/sources/shopify' : '/sources/setup/shopify?returnTo=%2Fonboarding%3Fstep%3Dconnect',
      primary: !shopifyIsConnected,
    },
    {
      id: 'stripe',
      name: 'Stripe',
      state: stripe?.stage === 'planned' ? 'Not available' : CONNECTED_STATUSES.has(stripe?.status ?? '') ? 'Connected' : 'Not connected',
      tone: CONNECTED_STATUSES.has(stripe?.status ?? '') ? 'ok' : 'planned',
      detail: stripe?.stage === 'planned' ? 'Payments, disputes and payouts · connector not implemented' : `Payments, disputes and payouts · ${sourceDetail(stripe, 'no records returned')}`,
      action: 'View',
      href: '/sources/stripe',
      primary: false,
    },
    {
      id: 'shipbob',
      name: 'ShipBob',
      state: shipbobIsConnected ? 'Connected' : shipbob?.status === 'attention_required' ? 'Needs permission' : 'Not connected',
      tone: shipbobIsConnected ? 'ok' : shipbob?.status === 'attention_required' ? 'partial' : 'planned',
      detail: shipbobIsConnected ? `Fulfilment and shipping fees · ${sourceDetail(shipbob, 'data received')}` : 'Fulfilment and shipping fees · needed for fee reconciliation',
      action: shipbobIsConnected ? 'Manage' : 'Connect',
      href: shipbobIsConnected ? '/sources/shipbob' : '/sources/setup/shipbob?returnTo=%2Fonboarding%3Fstep%3Dconnect',
      primary: !shipbobIsConnected,
    },
    {
      id: 'royal_mail',
      name: 'Royal Mail',
      state: 'Not available',
      tone: 'planned',
      detail: 'Carrier tracking · no implemented connector is available',
      action: 'View',
      href: '/sources/browse',
      primary: false,
    },
    {
      id: helpdeskId,
      name: helpdeskName,
      state: helpdeskIsConnected ? 'Connected' : 'Not connected',
      tone: helpdeskIsConnected ? 'ok' : 'planned',
      detail: helpdeskIsConnected ? `Support tickets · ${sourceDetail(helpdesk, 'data received')}` : 'Support tickets · required for case evidence',
      action: helpdeskIsConnected ? 'Manage' : 'Connect',
      href: helpdeskIsConnected ? `/sources/${helpdeskId}` : `/sources/setup/${helpdeskId}?returnTo=%2Fonboarding%3Fstep%3Dconnect`,
      primary: !helpdeskIsConnected,
    },
    {
      id: 'csv_import',
      name: 'CSV import',
      state: 'Optional',
      tone: 'planned',
      detail: csv?.importedRecordsKnown ? `Returns and adjustments · ${formatNumber(csv.importedRecords)} records read` : 'Returns and adjustments you keep outside a platform',
      action: 'Upload',
      href: '/sources/imports',
      primary: false,
    },
  ];

  const setupSummary = [
    { name: 'Store profile', state: profileSaved ? 'Completed' : 'Needs attention', detail: profileSaved ? 'Merchant context saved' : 'Required before source setup' },
    { name: 'Shopify', state: shopifyIsConnected ? 'Completed' : 'Needs attention', detail: shopifyIsConnected ? sourceDetail(shopify, shopifyShopDomain || 'Connection recorded') : 'Required order evidence source' },
    { name: helpdeskName, state: helpdeskIsConnected ? 'Completed' : 'Needs attention', detail: helpdeskIsConnected ? sourceDetail(helpdesk, 'Connection recorded') : 'Required support evidence source' },
    { name: 'ShipBob', state: shipbobIsConnected ? 'Completed' : warehouseRequired ? 'Needs attention' : 'Deferred', detail: shipbobIsConnected ? sourceDetail(shipbob, 'Connection recorded') : warehouseRequired ? 'Required because WMS / 3PL use was selected' : 'Optional for this workspace profile' },
    { name: 'Stripe', state: 'Unavailable', detail: 'Connector is not implemented' },
  ];

  return (
    <main className="uo-entry ua-auth-surface ua-onboarding-handoff" data-unauth-ui="evidence-operations-v1" data-screen-label="Auth and onboarding" data-surface-id="workspace-onboarding" data-state-id={`onboarding-${view}`} data-archetype="P3">
      <div className="ua-onboarding-handoff__frame">
        <AuthProductContext />
        <section className="ua-onboarding-handoff__workspace">
          <header className="ua-onboarding-handoff__topbar">
            <nav aria-label="Account setup progress">
              <Link href="/login">Sign in</Link>
              <button type="button" data-active={view === 'profile' ? 'true' : undefined} onClick={() => setView('profile')}>Store profile</button>
              <button type="button" data-active={view === 'connect' ? 'true' : undefined} disabled={!profileSaved} onClick={() => setView('connect')}>Connect sources</button>
              <button type="button" data-active={view === 'verified' ? 'true' : undefined} disabled={!profileSaved} onClick={() => setView('verified')}>Setup summary</button>
            </nav>
            <span>{view === 'profile' ? 'Step 1 of 3 · required' : view === 'connect' ? `${coreRequiredConnected} of ${requiredTotal} required sources connected` : 'Step 3 of 3 · review and handoff'}</span>
          </header>

          {props.requestedPlan ? (
            <div className="border-b border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-secondary)] px-5 py-3 text-sm text-[var(--uo-route-text-secondary)]" role="status">
              Requested plan: <strong className="text-[var(--uo-route-text-primary)]">{props.requestedPlan}</strong>
              {props.requestedCredits ? ` · ${props.requestedCredits}` : ''}. This is pending; Billing changes only after provider confirmation.
            </div>
          ) : props.requestedPlanUnavailableReason ? (
            <div className="border-b border-[var(--uo-route-warning-border)] bg-[var(--uo-route-warning-bg)] px-5 py-3 text-sm text-[var(--uo-route-text-secondary)]" role="status">
              Requested plan unavailable. {props.requestedPlanUnavailableReason}
            </div>
          ) : null}

          {view === 'profile' ? (
            <div className="ua-onboarding-handoff__body">
              <div className="ua-onboarding-handoff__intro">
                <div><h1>Tell us about this workspace</h1><p>These required details set the source checklist and keep setup relevant to the way this merchant fulfils orders and handles returns.</p></div>
                <div className="ua-onboarding-handoff__coverage"><span>Setup progress</span><strong>1 / 3</strong></div>
              </div>
              <section className="ua-onboarding-handoff__card" aria-labelledby="workspace-profile-title" data-state-id="workspace-onboarding-store-profile">
                <header className="ua-onboarding-handoff__card-header"><div><h2 id="workspace-profile-title">Store profile</h2><p>Required fields are marked. You can revise optional operating details later.</p></div><span>Required</span></header>
                <div className="ua-onboarding-handoff__profile-grid">
                  <ProfileField label="Store name" error={fieldErrors.storeName} required>
                    <input value={profile.storeName} onChange={(event) => setProfileField('storeName', event.target.value)} placeholder="Asterlane" autoComplete="organization" />
                  </ProfileField>
                  <ProfileField label="Commerce platform" error={fieldErrors.platform} required>
                    <select value={profile.platform} onChange={(event) => setProfileField('platform', event.target.value)}>
                      <option value="">Select platform…</option><option value="shopify">Shopify</option><option value="woocommerce" disabled>WooCommerce (not available yet)</option><option value="bigcommerce" disabled>BigCommerce (not available yet)</option><option value="magento">Magento</option><option value="custom">Custom</option><option value="other">Other</option>
                    </select>
                  </ProfileField>
                  <ProfileField label="Monthly order volume" error={fieldErrors.annualVolume} required>
                    <select value={profile.annualVolume} onChange={(event) => setProfileField('annualVolume', event.target.value)}><option value="">Select range…</option>{ORDER_VOLUME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </ProfileField>
                  <ProfileField label="Primary post-purchase concern" error={fieldErrors.primaryConcern} required>
                    <select value={profile.primaryConcern} onChange={(event) => setProfileField('primaryConcern', event.target.value)}><option value="">Select concern…</option>{LOSS_CONCERN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
                  </ProfileField>
                  <ProfileField label="Do you use a WMS or 3PL?" help="This makes fulfilment evidence part of the required setup checklist.">
                    <select value={profile.usesWms3pl} onChange={(event) => setProfileField('usesWms3pl', event.target.value)}><option value="">Select…</option><option value="yes">Yes, warehouse software or a 3PL</option><option value="no">No, fulfilled in-house</option></select>
                  </ProfileField>
                  <ProfileField label="Do you use a returns platform?" help="This keeps return evidence requirements explicit without blocking setup.">
                    <select value={profile.usesReturnsPlatform} onChange={(event) => setProfileField('usesReturnsPlatform', event.target.value)}><option value="">Select…</option><option value="yes">Yes, a dedicated returns platform</option><option value="no">No, returns are handled elsewhere</option></select>
                  </ProfileField>
                </div>
              </section>
              <footer className="ua-onboarding-handoff__actions">
                <button type="button" className="is-primary" onClick={() => void saveProfileAndContinue()} disabled={busy !== null}>{busy === 'profile' ? 'Saving profile…' : profileSaved ? 'Save and review sources' : 'Save and continue'}</button>
                <button type="button" aria-label="Skip for now — finish setup later" onClick={deferOnboarding} disabled={busy !== null}>{busy === 'defer' ? 'Saving…' : 'Finish setup later'}</button>
                <span>Setup is recommended. Your profile changes guidance only; it does not connect a provider or publish a decision.</span>
              </footer>
              <p className="ua-onboarding-handoff__error" role={error ? 'alert' : undefined}>{error}</p>
            </div>
          ) : view === 'connect' ? (
            <div className="ua-onboarding-handoff__body">
              <div className="ua-onboarding-handoff__intro">
                <div><h1>Connect your sources</h1><p>Unauth states a position only from source-backed records. Connect what you have — coverage is shown honestly at every step.</p></div>
                <div className="ua-onboarding-handoff__coverage"><span>Setup coverage</span><strong>{setupPercent}%</strong></div>
              </div>
              <div className="ua-onboarding-handoff__progress" aria-label={`${setupPercent}% setup coverage`}><i style={{ width: `${setupPercent}%` }} /></div>

              <div className="ua-onboarding-handoff__connect-grid">
                <section className="ua-onboarding-handoff__connectors" aria-label="Source connections">
                  {connectors.map((connector) => (
                    <div className="ua-onboarding-handoff__connector" key={connector.id} data-state-id={connector.id === 'shopify' ? 'workspace-onboarding-shopify-connection' : connector.id === helpdeskId ? 'workspace-onboarding-helpdesk-connection' : undefined}>
                      <span className="ua-onboarding-handoff__monogram">{connectorMonogram(connector.id)}</span>
                      <div><div><strong>{connector.name}</strong><em data-tone={connector.tone}>{connector.state}</em></div><p>{connector.detail}</p></div>
                      <Link className={connector.primary ? 'is-primary' : undefined} href={connector.href}>{connector.action}</Link>
                    </div>
                  ))}
                  <footer><i /><p>A source is only ever shown as connected once it has returned data. Nothing here is marked healthy on the strength of a plan.</p></footer>
                </section>

                <div className="ua-onboarding-handoff__side-stack">
                  <section className="ua-onboarding-handoff__unlock-card">
                    <h2>What you unlock</h2>
                    {[
                      ['Operating position', 'Needs orders and payments.', shopifyIsConnected],
                      ['Case decisioning with evidence', 'Needs support tickets.', helpdeskIsConnected],
                      ['Delivery evidence and carrier claims', 'Needs an implemented carrier connection.', false],
                      ['Fulfilment fee reconciliation', 'Needs ShipBob records.', shipbobIsConnected],
                    ].map(([title, body, ready]) => <div key={String(title)}><span data-ready={ready ? 'true' : undefined}>{ready ? '✓' : '·'}</span><div><strong>{title}</strong><p>{body} {ready ? 'Ready now.' : 'Unavailable.'}</p></div></div>)}
                  </section>
                  <section className="ua-onboarding-handoff__demo-card"><h2>Demonstration data</h2><p>Explore the product with a synthetic Northwind Supply workspace. Every figure is labelled as demonstration data and is never mixed with your own.</p><Link href="/demo">Open demonstration workspace</Link></section>
                </div>
              </div>

              <footer className="ua-onboarding-handoff__actions">
                <button type="button" className="is-primary" onClick={() => void completeSetup()} disabled={busy !== null}>{busy === 'complete' ? 'Verifying setup…' : coreRequiredConnected === requiredTotal ? 'Verify setup' : `Review ${requiredTotal - coreRequiredConnected} required source${requiredTotal - coreRequiredConnected === 1 ? '' : 's'}`}</button>
                <button type="button" aria-label="Skip for now — finish setup later" onClick={deferOnboarding} disabled={busy !== null}>{busy === 'defer' ? 'Saving…' : 'Finish setup later'}</button>
                <span>Shopify and one supported helpdesk are required. ShipBob is required only when this profile uses a WMS or 3PL. Everything else remains optional or unavailable.</span>
              </footer>
              <p className="ua-onboarding-handoff__error" role={error ? 'alert' : undefined}>{error}</p>
            </div>
          ) : (
            <div className="ua-onboarding-handoff__body">
              <div className="ua-onboarding-handoff__intro"><div><h1>Review setup</h1><p>Completed, deferred, unavailable, and attention-needed work stay separate. This summary does not imply that authorization returned records or that a connected source is healthy.</p></div></div>
              <section className="ua-onboarding-handoff__first-run" aria-label="Workspace setup summary" data-state-id="workspace-onboarding-setup-verified">
                {setupSummary.map((item) => <div key={item.name}><i data-state={item.state === 'Completed' ? 'done' : 'blocked'} /><div><div><strong>{item.name}</strong><span>{item.detail}</span><em>{item.state}</em></div></div></div>)}
                <footer><span>Any missing or unavailable source leaves dependent figures unavailable. It never produces a verified zero.</span></footer>
              </section>
              <section className="ua-onboarding-handoff__pending">
                <div><span>Required setup</span><strong>{coreRequiredConnected === requiredTotal ? 'Ready' : 'Needs attention'}</strong><p>{coreRequiredConnected} of {requiredTotal} required sources connected</p></div>
                <div><span>Optional work</span><strong>{!warehouseRequired && !shipbobIsConnected ? 'Deferred' : 'Reviewed'}</strong><p>can be completed later from Sources</p></div>
                <div><span>Unavailable providers</span><strong>Kept separate</strong><p>no health, freshness, or record count is asserted</p></div>
              </section>
              <footer className="ua-onboarding-handoff__actions">
                <button type="button" className="is-primary" onClick={() => setupVerified ? router.push(workspaceHref) : void deferOnboarding()} disabled={busy !== null}>{busy === 'defer' ? 'Opening workspace…' : 'Continue to workspace'}</button>
                <button type="button" onClick={() => setView('connect')}>Review connections</button>
                <span>The workspace opens with any missing-source limitations still visible.</span>
              </footer>
              <p className="ua-onboarding-handoff__error" role={error ? 'alert' : undefined}>{error}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ProfileField({ label, error, help, required = false, children }: { label: string; error?: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="ua-onboarding-handoff__profile-field">
      <span>{label}{required ? <em>Required</em> : <em>Optional</em>}</span>
      {children}
      {error ? <small role="alert">{error}</small> : help ? <small>{help}</small> : null}
    </label>
  );
}
