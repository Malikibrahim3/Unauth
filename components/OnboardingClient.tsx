'use client';

import { Children, cloneElement, isValidElement, useEffect, useMemo, useState, type CSSProperties, type ReactElement } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OnboardingStoreVisual from '@/components/visual-authority/generated/Onboarding-Store-Clean';
import OnboardingCommerceVisual from '@/components/visual-authority/generated/Onboarding-Commerce-Clean';
import OnboardingHelpdeskVisual from '@/components/visual-authority/generated/Onboarding-Helpdesk-Clean';
import OnboardingReadyVisual from '@/components/visual-authority/generated/Onboarding-Ready-Clean';
import { bindSuppliedTree, type SuppliedTreeElement } from '@/components/visual-authority/bindSuppliedTree';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';
import { createClient } from '@/lib/supabase/client';
import { formatNumber, formatTimeInTimeZone } from '@/lib/utils/format';

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

type LatestImportView = {
  status: string;
  failedRows: number | null;
  totalRows: number | null;
  processedRows: number | null;
  startedAt: string | null;
};

interface OnboardingClientProps {
  acceptanceScenarioId?: string | null;
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
  nextAction?: { label: string; href: string; detail?: string };
  requestedPlan?: string;
  requestedCredits?: string;
  requestedPlanUnavailableReason?: string;
  initialConnectors?: OnboardingConnectorView[];
  shopifyError?: string | null;
  reportingCurrency?: string;
  reportingTimezone?: string;
  latestImport?: LatestImportView | null;
}

type Step = 'store' | 'commerce' | 'helpdesk' | 'ready';
type Helpdesk = 'gorgias' | 'zendesk' | 'freshdesk';
type ProfileState = {
  storeName: string;
  platform: string;
  annualVolume: string;
  primaryConcern: string;
  operatingLayers: string;
};

const STEPS: ReadonlyArray<{ id: Step; title: string; detail: string }> = [
  { id: 'store', title: 'Your store', detail: 'who you are and what you sell' },
  { id: 'commerce', title: 'Commerce', detail: 'orders, refunds, customers' },
  { id: 'helpdesk', title: 'Helpdesk', detail: 'what the customer actually said' },
  { id: 'ready', title: 'Ready', detail: 'what happens next' },
];
const CONNECTED_STATUSES = new Set(['connected', 'active', 'import_complete', 'syncing', 'importing']);
const OPTION_VALUE: ReadonlyMap<string, readonly [keyof ProfileState, string]> = new Map([
  ['Shopify', ['platform', 'shopify']],
  ['WooCommerce', ['platform', 'woocommerce']],
  ['BigCommerce', ['platform', 'bigcommerce']],
  ['Amazon', ['platform', 'amazon']],
  ['Something else', ['platform', 'other']],
  ['Under 1,000', ['annualVolume', 'under_1000']],
  ['1,000 – 8,000', ['annualVolume', '1000_8000']],
  ['8,000 – 15,000', ['annualVolume', '8000_15000']],
  ['More', ['annualVolume', 'over_15000']],
  ['Delivery disputes', ['primaryConcern', 'delivery_disputes']],
  ['Returns', ['primaryConcern', 'returns']],
  ['Damage', ['primaryConcern', 'damage']],
  ['Chargebacks', ['primaryConcern', 'chargebacks']],
  ['Not sure yet', ['primaryConcern', 'all']],
  ['3PL only', ['operatingLayers', '3pl']],
  ['Returns platform only', ['operatingLayers', 'returns']],
  ['Both', ['operatingLayers', 'both']],
  ['Neither', ['operatingLayers', 'neither']],
] as const);

function initialOperatingLayers(wms: string | undefined, returns: string | undefined) {
  if (wms === 'yes' && returns === 'yes') return 'both';
  if (wms === 'yes') return '3pl';
  if (returns === 'yes') return 'returns';
  if (wms === 'no' && returns === 'no') return 'neither';
  return '';
}

function formatClock(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatTimeInTimeZone(date, 'Europe/London');
}

function shopifyErrorCopy(code: string | null | undefined) {
  if (!code) return null;
  if (code === 'forbidden' || code === 'unauthorized') return 'The account used for authorisation does not have the required Shopify permissions. Ask an account owner to authorise, or sign in as one. Nothing was connected and nothing was read.';
  if (code === 'misconfigured') return 'Shopify authorisation is not configured in this environment. Nothing was connected and nothing was read.';
  return 'Shopify did not complete the authorisation. Nothing was connected and nothing was read; try again or ask an account owner to authorise.';
}

function sourceForStep(step: Step): ReactElement {
  if (step === 'store') return OnboardingStoreVisual();
  if (step === 'commerce') return OnboardingCommerceVisual();
  if (step === 'helpdesk') return OnboardingHelpdeskVisual();
  return OnboardingReadyVisual();
}

function actionElement(element: SuppliedTreeElement, children: React.ReactNode, onClick: () => void, disabled = false) {
  return <button data-reference-tag={typeof element.type === 'string' ? element.type : 'div'} type="button" disabled={disabled} onClick={onClick} style={element.props.style as CSSProperties}>{children}</button>;
}

export default function OnboardingClient(props: OnboardingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedStep = searchParams.get('step') as Step | null;
  const connectors = useMemo(() => new Map((props.initialConnectors ?? []).map((connector) => [connector.id, connector])), [props.initialConnectors]);
  const shopify = connectors.get('shopify');
  const initialHelpdeskId: Helpdesk = props.helpdeskProvider ?? 'gorgias';
  const initialHelpdesk = connectors.get(initialHelpdeskId);
  const shopifyIsConnected = props.shopifyConnected === true || Boolean(shopify && CONNECTED_STATUSES.has(shopify.status));
  const helpdeskIsConnected = props.helpdeskConnected === true || Boolean(initialHelpdesk && CONNECTED_STATUSES.has(initialHelpdesk.status));
  const [step, setStepState] = useState<Step>(() => {
    if (requestedStep && STEPS.some((item) => item.id === requestedStep)) return requestedStep;
    if (!props.initialProfileComplete) return 'store';
    if (!shopifyIsConnected) return 'commerce';
    return 'ready';
  });
  const [profile, setProfile] = useState<ProfileState>({
    storeName: props.initialStoreName ?? '',
    platform: props.initialPlatform || 'shopify',
    annualVolume: props.initialAnnualVolume ?? '',
    primaryConcern: props.initialPrimaryConcern ?? '',
    operatingLayers: initialOperatingLayers(props.initialUsesWms3pl, props.initialUsesReturnsPlatform),
  });
  const [shopDomain, setShopDomain] = useState(props.shopifyShopDomain ?? '');
  const [selectedHelpdesk, setSelectedHelpdesk] = useState<Helpdesk>(initialHelpdeskId);
  const [busy, setBusy] = useState<'profile' | 'finish' | 'defer' | 'signout' | null>(null);
  const [error, setError] = useState('');
  const workspaceHref = props.workspaceHref ?? '/overview';
  const reportingCurrency = props.reportingCurrency ?? 'GBP';
  const reportingTimezone = props.reportingTimezone ?? 'Europe/London';
  const currentHelpdesk = connectors.get(selectedHelpdesk);

  function setStep(next: Step) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('step', next);
    replaceHistoryUrlIfChanged(`/onboarding?${params}`);
    setStepState(next);
    setError('');
  }

  useEffect(() => {
    function handleShopifyOAuth(event: MessageEvent) {
      if (event.origin === window.location.origin && event.data && typeof event.data === 'object' && event.data.type === 'shopify_oauth_complete') router.refresh();
    }
    window.addEventListener('message', handleShopifyOAuth);
    return () => window.removeEventListener('message', handleShopifyOAuth);
  }, [router]);

  async function signOut() {
    setBusy('signout');
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function saveProfile() {
    if (!profile.storeName.trim() || !profile.platform || !profile.annualVolume || !profile.primaryConcern || !profile.operatingLayers) {
      setError('Complete all four answers before continuing.');
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
        usesWms3pl: profile.operatingLayers === '3pl' || profile.operatingLayers === 'both',
        usesReturnsPlatform: profile.operatingLayers === 'returns' || profile.operatingLayers === 'both',
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
    setStep('commerce');
    router.refresh();
  }

  function openShopifySetup() {
    if (shopifyIsConnected) {
      setStep('helpdesk');
      return;
    }
    const shop = shopDomain.trim();
    router.push(`/sources/setup/shopify?returnTo=${encodeURIComponent('/onboarding?step=commerce')}${shop ? `&shop=${encodeURIComponent(shop)}` : ''}`);
  }

  function openHelpdeskSetup() {
    if (helpdeskIsConnected && selectedHelpdesk === initialHelpdeskId) {
      setStep('ready');
      return;
    }
    router.push(`/sources/setup/${selectedHelpdesk}?returnTo=${encodeURIComponent('/onboarding?step=helpdesk')}`);
  }

  async function enterWorkspace(destination = workspaceHref) {
    setBusy(shopifyIsConnected && helpdeskIsConnected ? 'finish' : 'defer');
    setError('');
    const response = await fetch('/api/account/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopifyIsConnected && helpdeskIsConnected ? { setupComplete: true } : { deferOnboarding: true }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(null);
      setError(payload.error ?? 'Could not open the workspace.');
      return;
    }
    router.push(destination);
    router.refresh();
  }

  const importedOrderCount = shopify?.importedRecordsKnown ? shopify.importedRecords : null;
  const volumeMaximum: Record<string, number | null> = { under_1000: 999, '1000_8000': 8000, '8000_15000': 15000, over_15000: null };
  const maximum = volumeMaximum[profile.annualVolume];
  const implausibleVolume = (importedOrderCount != null && maximum != null && importedOrderCount > maximum);
  const authError = shopifyErrorCopy(props.shopifyError);
  const failedRows = props.latestImport?.failedRows ?? null;
  const helpdeskName = selectedHelpdesk === 'zendesk' ? 'Zendesk' : selectedHelpdesk === 'freshdesk' ? 'Freshdesk' : 'Gorgias';
  const helpdeskImported = currentHelpdesk?.importedRecordsKnown ? currentHelpdesk.importedRecords : null;
  const connectedCount = Number(shopifyIsConnected) + Number(helpdeskIsConnected);
  const clock = formatClock(props.latestImport?.startedAt);
  const bannerError = error || authError || '';
  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const exactText = new Map<string, React.ReactNode>([
    ['Asterlane Ltd', profile.storeName || props.initialStoreName || 'Your store'],
    ['reporting currency will be GBP · Europe/London · changeable in settings', `reporting currency will be ${reportingCurrency} · ${reportingTimezone} · changeable in settings`],
    ['You said under 1,000, but the Shopify account you are about to connect shipped 1,204 orders last month. Unauth will use what it imports, not what you type — this only affects the warnings it shows you.', error || (importedOrderCount == null ? 'The imported order count is not available yet. Unauth will use what it imports, not what you type — this answer only affects warnings.' : `You selected this range, but the connected Shopify source exposes ${formatNumber(importedOrderCount)} imported records. Unauth will use what it imports, not what you type — this only affects the warnings it shows you.`)],
    ['Shopify declined the authorisation', shopifyIsConnected ? 'Shopify is connected' : 'Shopify declined the authorisation'],
    ['The account you signed in with is a staff account without the read_orders scope. Ask an account owner to authorise, or sign in as one. Nothing was connected and nothing was read.', shopifyIsConnected ? (props.shopifyShopDomain || shopify?.account || 'The order source returned data and is available to the workspace.') : bannerError],
    ['asterlane.myshopify.com', shopDomain || 'store.myshopify.com'],
    ['Gorgias has 2,104 tickets and a 90-day retention', helpdeskImported == null ? `${helpdeskName} history has not been measured yet` : `${helpdeskName} has ${formatNumber(helpdeskImported)} tickets visible`],
    ['Anything older than 3 June is already gone from the source, so Unauth will never see it. That is a Gorgias setting, not a limit here.', helpdeskImported == null ? 'Unauth will report the visible ticket count and retention boundary after the connection returns data.' : 'Unauth can use only the history the provider returns. Older records no longer in the source remain unavailable here.'],
    ['Two sources connected and verified. The first import runs now and takes about four minutes for a year of history — you do not have to wait for it.', `${connectedCount} of 2 recommended sources connected. ${props.latestImport ? `Latest import: ${props.latestImport.status.replaceAll('_', ' ')}.` : 'No import has been recorded yet.'} You can open the workspace; missing evidence remains visibly unavailable.`],
    ['The first import found 16 rows it cannot post', error ? 'The workspace could not open' : failedRows == null ? 'The held-row count is unavailable' : `The first import found ${formatNumber(failedRows)} rows it cannot post`],
    ['A currency column is unmapped. The workspace still opens and everything else imports — those 16 rows stay out of every figure until you map it.', error || (failedRows == null ? 'The workspace still opens, but Unauth will not claim every imported row posted until the import reports its outcome.' : failedRows > 0 ? `The workspace still opens and everything else imports — those ${formatNumber(failedRows)} rows stay out of every figure until their issue is resolved.` : 'The import reported zero failed rows. Source freshness and downstream evidence readiness are still shown separately.')],
    ['Asterlane Ltd · GBP · Europe/London', `${profile.storeName || props.initialStoreName || 'Workspace'} · ${reportingCurrency} · ${reportingTimezone}`],
    ['asterlane.myshopify.com · 4 read scopes verified', shopifyIsConnected ? `${props.shopifyShopDomain || shopify?.account || 'account connected'} · configuration recorded; review scope in Sources` : 'Not connected — order evidence remains unavailable'],
    ['2,104 tickets visible · attachments readable', helpdeskIsConnected ? `${helpdeskImported == null ? 'ticket count unavailable' : `${formatNumber(helpdeskImported)} tickets visible`} · connection recorded` : 'Not connected — customer messages remain unavailable'],
    ['import started 09:41 · 12 months of history · you will be told when it finishes', props.nextAction?.detail ?? `${clock ? `import started ${clock} · ` : ''}${props.latestImport?.totalRows == null ? 'import scope unavailable' : `${formatNumber(props.latestImport.totalRows)} rows in scope`} · check source details for progress`],
  ]);

  const boundTree = bindSuppliedTree(sourceForStep(step), {
    text: exactText,
    transform: (element, compactText, children) => {
      if (element.type === 'a' && compactText === 'Sign out') return actionElement(element, busy === 'signout' ? 'Signing out…' : children, () => void signOut(), busy !== null);
      const targetStep = STEPS.find((item) => compactText === `${item.title} ${item.detail}`);
      if (targetStep && element.props.style?.padding === '11px 12px') {
        const targetIndex = STEPS.findIndex((item) => item.id === targetStep.id);
        return actionElement(element, children, () => setStep(targetStep.id), targetIndex > stepIndex);
      }
      const option = OPTION_VALUE.get(compactText);
      if (step === 'store' && option && element.type === 'span' && element.props.style?.padding === '7px 12px') {
        const [field, value] = option;
        if (field === 'platform' && value !== 'shopify') return null;
        const selected = profile[field] === value;
        const optionStyle: CSSProperties = {
          ...(element.props.style as CSSProperties),
          color: selected ? '#fff' : '#40454a',
          font: `${selected ? 500 : 400} 12.5px/1 'Inter',sans-serif`,
        };
        if (selected) {
          optionStyle.background = '#1c1f23';
          delete optionStyle.boxShadow;
        } else {
          delete optionStyle.background;
          optionStyle.boxShadow = 'inset 0 0 0 1px rgba(28,27,25,.12)';
        }
        return <button data-reference-tag="span" type="button" aria-pressed={selected} onClick={() => setProfile((current) => ({ ...current, [field]: value }))} style={optionStyle}>{children}</button>;
      }
      if (step === 'store' && element.type === 'span' && compactText === 'Asterlane Ltd') {
        return <input data-reference-tag="span" aria-label="Store or business name" value={profile.storeName} onChange={(event) => setProfile((current) => ({ ...current, storeName: event.target.value }))} style={element.props.style as CSSProperties} />;
      }
      if (step === 'store' && element.props.style?.background === '#fff3e9' && compactText.includes('Orders a month looks low')) {
        return error || implausibleVolume ? cloneElement(element, { role: error ? 'alert' : 'status' }, children) : null;
      }
      if (step === 'store' && compactText === 'Continue' && element.props.style?.background === '#1c1f23') return actionElement(element, busy === 'profile' ? 'Saving…' : children, () => void saveProfile(), busy !== null);
      if (step === 'commerce' && element.props.style?.background === '#fdf0e6' && compactText.includes('Shopify declined')) {
        return bannerError || shopifyIsConnected ? cloneElement(element, { role: bannerError ? 'alert' : 'status', style: shopifyIsConnected ? { ...element.props.style, background: '#eef6f1' } : element.props.style }, children) : null;
      }
      if (step === 'commerce' && element.type === 'span' && compactText === 'asterlane.myshopify.com') {
        return <input data-reference-tag="span" aria-label="Your Shopify admin address" value={shopDomain} onChange={(event) => setShopDomain(event.target.value)} placeholder="store.myshopify.com" style={element.props.style as CSSProperties} />;
      }
      if (step === 'commerce' && compactText === 'Authorise in Shopify' && element.props.style?.background === '#1c1f23') return actionElement(element, shopifyIsConnected ? 'Continue' : children, openShopifySetup);
      if ((step === 'commerce' || step === 'helpdesk') && compactText === 'Back' && element.props.style?.padding === '9px 15px') return actionElement(element, children, () => setStep(step === 'commerce' ? 'store' : 'commerce'));
      if (step === 'helpdesk' && ['Gorgias', 'Zendesk', 'Freshdesk'].some((name) => compactText.startsWith(name)) && element.props.style?.padding === '15px 16px') {
        const provider: Helpdesk = compactText.startsWith('Zendesk') ? 'zendesk' : compactText.startsWith('Freshdesk') ? 'freshdesk' : 'gorgias';
        const selected = provider === selectedHelpdesk;
        return <button data-reference-tag="div" type="button" aria-pressed={selected} onClick={() => setSelectedHelpdesk(provider)} style={{ ...(element.props.style as CSSProperties), boxShadow: selected ? '0 1px 2px rgba(28,27,25,.05),0 0 0 2px rgba(242,118,26,.5)' : '0 1px 2px rgba(28,27,25,.05),0 0 0 1px rgba(28,27,25,.07)' }}>{children}</button>;
      }
      if (step === 'helpdesk' && compactText === 'Skip for now') return actionElement(element, busy === 'defer' ? 'Opening…' : children, () => void enterWorkspace('/overview'), busy !== null);
      if (step === 'helpdesk' && compactText === 'Connect Gorgias' && element.props.style?.background === '#1c1f23') return actionElement(element, helpdeskIsConnected && selectedHelpdesk === initialHelpdeskId ? 'Continue' : `Connect ${helpdeskName}`, openHelpdeskSetup);
      if (step === 'ready' && compactText === 'See the empty workspace') return null;
      if (step === 'ready' && compactText === 'Enter the workspace') return actionElement(element, busy ? 'Opening…' : props.nextAction?.label ?? 'Review source availability', () => void enterWorkspace(props.nextAction?.href ?? '/sources'), busy !== null);
      if (step === 'ready' && element.props.style?.padding === '13px 15px') {
        const item = compactText.startsWith('Shopify ') ? { ready: shopifyIsConnected } : compactText.startsWith(`${helpdeskName} `) || compactText.startsWith('Gorgias ') ? { ready: helpdeskIsConnected } : null;
        if (item && !item.ready) {
          const rowChildren = Children.toArray(children);
          const status = rowChildren[0];
          if (status && typeof status === 'object' && 'props' in status) {
            const statusElement = status as ReactElement<{ style?: CSSProperties; children?: React.ReactNode }>;
            rowChildren[0] = cloneElement(statusElement, { style: { ...statusElement.props.style, background: '#fff', boxShadow: 'inset 0 0 0 1.5px #ddd8d1' } }, null);
          }
          return cloneElement(element, {}, rowChildren);
        }
      }
      return undefined;
    },
  });
  if (!isValidElement(boundTree)) return boundTree;
  const stateId = props.acceptanceScenarioId?.startsWith('workspace-onboarding-')
    ? props.acceptanceScenarioId
    : undefined;
  return cloneElement(boundTree as ReactElement<Record<string, unknown>>, {
    'data-surface-id': 'workspace-onboarding',
    'data-state-id': stateId,
  });
}
