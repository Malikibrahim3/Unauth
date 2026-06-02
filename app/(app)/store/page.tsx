import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { formatDateMode } from '@/lib/utils/format';
import { getConnectionState, type ConnectionState } from '@/lib/connections/getConnectionState';
import { getMerchantDataPresence, type MerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import { resolveMerchantSetupState, type MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import { PageHeader, MetricCard, SectionCard, EmptyState, Badge } from '@/components/ui';
import TrackPageView from '@/components/common/TrackPageView';
import WeeklyTrendChart from '@/components/charts/WeeklyTrendChart';
import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import {
  ShoppingBag,
  Headphones,
  Users,
  ShieldCheck,
  Activity,
  Upload,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Store,
} from 'lucide-react';

/**
 * /store — real Shopify-centric store overview. Reads canonical connection +
 * data-presence state (same as the dashboard) and renders the store picture
 * from data presence rather than redirecting to a single audit job. A link to
 * the latest Shopify audit detail is offered as a secondary action only.
 */

type Tone = 'incomplete' | 'stale' | 'normal';

type StoreConfig = {
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  banner: { tone: Tone; title: string; body: string } | null;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmt(n: number): string {
  return n === 0 ? '—' : n.toLocaleString();
}

function buildConfig(state: MerchantSetupState, connection: ConnectionState): StoreConfig {
  const integrations = '/settings/integrations';
  switch (state) {
    case 'shopify_only_with_data':
      return {
        subtitle: 'Shopify orders and customers are syncing. Add your helpdesk to complete claim context.',
        primaryCta: { label: 'Connect helpdesk', href: integrations },
        secondaryCta: { label: 'Import CSV', href: '/upload' },
        banner: {
          tone: 'incomplete',
          title: 'Shopify is connected. Connect your helpdesk to finish setup.',
          body: 'Order and customer data is flowing from Shopify. Connect your helpdesk to add claim history and dispute context — until then, claim metrics read as incomplete, not zero.',
        },
      };
    case 'helpdesk_only_with_data':
      return {
        subtitle: 'Claim history is syncing from your helpdesk. Connect Shopify for order and customer context.',
        primaryCta: { label: 'Connect Shopify', href: integrations },
        secondaryCta: { label: 'Import CSV', href: '/upload' },
        banner: {
          tone: 'incomplete',
          title: 'Your helpdesk is connected. Connect Shopify to add order context.',
          body: 'This store view is built from helpdesk claims. Connect Shopify to tie those claims to real orders and customer history.',
        },
      };
    case 'csv_only':
      return {
        subtitle: 'Showing store intelligence from your imported history.',
        primaryCta: { label: 'Connect Shopify & helpdesk', href: integrations },
        secondaryCta: { label: 'Import more', href: '/upload' },
        banner: {
          tone: 'incomplete',
          title: 'Connect Shopify and your helpdesk for live store monitoring.',
          body: 'This workspace is built from imported CSV history. Connect your live sources to monitor new orders and claims as they happen.',
        },
      };
    case 'stale_existing_data':
      return {
        subtitle: 'Showing your existing store and order intelligence.',
        primaryCta: { label: 'Reconnect sources', href: integrations },
        secondaryCta: { label: 'Import CSV', href: '/upload' },
        banner: {
          tone: 'stale',
          title: 'Showing existing data.',
          body: 'Reconnect Shopify and your helpdesk to keep your store analysis current and add fresh claim context.',
        },
      };
    case 'fully_connected_with_data':
    default:
      return {
        subtitle: 'Live store intelligence across your Shopify orders and helpdesk claims.',
        primaryCta: { label: 'Review customers', href: '/customers' },
        secondaryCta: { label: 'Import CSV', href: '/upload' },
        banner: null,
      };
  }
}

type Kpi = {
  label: string;
  value: string;
  hint?: string;
  incomplete?: boolean;
  icon: React.ReactNode;
};

function buildKpis(
  state: MerchantSetupState,
  connection: ConnectionState,
  presence: MerchantDataPresence,
): Kpi[] {
  const s = presence.sources;
  const orders: Kpi = {
    label: 'Orders synced',
    value: fmt(s.shopifyOrderSignals || s.auditTransactions),
    hint: s.shopifyOrderSignals > 0 ? 'From Shopify' : s.auditTransactions > 0 ? 'From imports' : 'Appears once Shopify syncs',
    icon: <ShoppingBag className="h-4 w-4" />,
  };
  const customers: Kpi = {
    label: state === 'csv_only' ? 'Imported customers' : 'Customers',
    value: fmt(s.customerProfiles),
    hint: s.customerProfiles > 0 ? 'Profiles across all sources' : 'Appears once data syncs',
    icon: <Users className="h-4 w-4" />,
  };
  const claims: Kpi = {
    label: 'Claims tracked',
    value: connection.helpdesk || presence.hasHelpdeskClaims ? fmt(s.merchantClaims + s.supportCases) : 'Missing',
    hint:
      connection.helpdesk || presence.hasHelpdeskClaims
        ? 'From your helpdesk'
        : 'Connect helpdesk to add claim history',
    incomplete: !connection.helpdesk && !presence.hasHelpdeskClaims,
    icon: <Headphones className="h-4 w-4" />,
  };
  const evidence: Kpi = {
    label: 'Evidence ready',
    value: fmt(s.evidencePackages),
    hint: 'Dispute-ready packages',
    icon: <ShieldCheck className="h-4 w-4" />,
  };
  const syncHealth: Kpi = {
    label: 'Sync health',
    value: connection.bothConnected ? 'Healthy' : connection.neitherConnected ? 'Offline' : 'Partial',
    hint: connection.bothConnected ? 'Both sources connected' : connection.neitherConnected ? 'No live sources' : 'One source missing',
    incomplete: !connection.bothConnected,
    icon: <Activity className="h-4 w-4" />,
  };

  switch (state) {
    case 'helpdesk_only_with_data':
      return [claims, customers, orders, evidence, syncHealth];
    case 'csv_only':
      return [orders, customers, claims, evidence, syncHealth];
    default:
      return [orders, customers, claims, evidence, syncHealth];
  }
}

function SyncRow({
  label,
  connected,
  icon: Icon,
}: {
  label: string;
  connected: boolean;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: 'var(--ink-tertiary)' }} />
        <span className="text-caption" style={{ color: 'var(--text)' }}>{label}</span>
      </div>
      {connected ? (
        <span className="flex items-center gap-1.5 text-caption font-medium" style={{ color: 'var(--sev-clear)' }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
        </span>
      ) : (
        <Link
          href="/settings/integrations"
          className="flex items-center gap-1.5 text-caption font-medium hover:underline"
          style={{ color: 'var(--warning)' }}
        >
          <AlertTriangle className="h-3.5 w-3.5" /> Not connected
        </Link>
      )}
    </div>
  );
}

function CompletenessBanner({
  banner,
  primaryCta,
}: {
  banner: { tone: Tone; title: string; body: string };
  primaryCta: { label: string; href: string };
}) {
  const accentBorder =
    banner.tone === 'stale'
      ? 'var(--border-default)'
      : 'color-mix(in srgb, var(--warning) 35%, var(--border-default))';
  const bg =
    banner.tone === 'stale'
      ? 'var(--bg-surface)'
      : 'color-mix(in srgb, var(--warning) 7%, var(--bg-surface))';
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border px-4 py-3.5"
      style={{ background: bg, borderColor: accentBorder }}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: 'color-mix(in srgb, var(--warning) 14%, transparent)' }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} />
        </span>
        <div className="min-w-0">
          <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>{banner.title}</p>
          <p className="text-caption mt-0.5 leading-snug" style={{ color: 'var(--ink-secondary)' }}>{banner.body}</p>
        </div>
      </div>
      <Link
        href={primaryCta.href}
        className="btn-accent shrink-0 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
      >
        {primaryCta.label}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

export default async function StorePage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_AUDIT);
  if (denied) redirect('/dashboard');

  const cutoff8w = new Date(Date.now() - 56 * 24 * 3600 * 1000).toISOString();

  const [connectionState, dataPresence, { data: latestShopifyJob }, orderTrendRaw] = await Promise.all([
    getConnectionState(serviceClient, ctx.merchantId),
    getMerchantDataPresence(serviceClient, ctx.merchantId, user.id),
    serviceClient
      .from(TABLES.PROCESSING_JOBS)
      .select('id, created_at')
      .eq('merchant_id', ctx.merchantId)
      .eq('upload_type', 'shopify')
      .eq('hidden_by_merchant', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    serviceClient
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('processed_at')
      .eq('merchant_id' as never, ctx.merchantId as never)
      .gte('processed_at' as never, cutoff8w as never)
      .then((r: { data: Array<{ processed_at: string }> | null; error: unknown }) => r.error ? [] : (r.data ?? [])),
  ]);

  const orderTrend: TrendDataPoint[] = buildWeeklyOrderTrend(
    orderTrendRaw as Array<{ processed_at: string }>,
  );

  const setupState = resolveMerchantSetupState(connectionState, dataPresence);

  /* ---- First-run gate: only when no useful store data exists at all ---- */
  if (!dataPresence.hasAnyData) {
    const primary =
      connectionState.shopifyOnlyConnected
        ? { label: 'Connect helpdesk', href: '/settings/integrations' }
        : connectionState.helpdeskOnlyConnected
          ? { label: 'Connect Shopify', href: '/settings/integrations' }
          : { label: 'Connect Shopify & your helpdesk', href: '/settings/integrations' };
    return (
      <div className="p-4 md:p-6">
        <TrackPageView event="Store Viewed" />
        <PageHeader
          eyebrow="Store"
          title="Store overview"
          subtitle="Your Shopify orders and helpdesk claims, in one place."
        />
        <div className="mt-6">
          <SectionCard title="Connect your sources">
            <EmptyState
              icon={<Store className="h-6 w-6" />}
              title="Connect Shopify and your helpdesk"
              description="Store intelligence needs both your Shopify store and a helpdesk (Gorgias or Zendesk). Orders come from Shopify; claim history comes from your helpdesk. Without both, this view would be incomplete."
              action={
                <div className="flex items-center justify-center gap-3">
                  <Link href={primary.href} className="btn-accent inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold">
                    {primary.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/upload" className="text-sm font-medium hover:underline" style={{ color: 'var(--ink-tertiary)' }}>
                    Import CSV instead →
                  </Link>
                </div>
              }
            />
          </SectionCard>
        </div>
      </div>
    );
  }

  /* ---- Data-present store overview ---- */
  const config = buildConfig(setupState, connectionState);
  const kpis = buildKpis(setupState, connectionState, dataPresence);
  const helpdeskLabel = connectionState.helpdeskProvider ? capitalize(connectionState.helpdeskProvider) : 'Helpdesk';
  const latestSync = latestShopifyJob?.created_at ? formatDateMode(latestShopifyJob.created_at, 'recent') : null;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <TrackPageView event="Store Viewed" />

      <PageHeader
        eyebrow="Store"
        title="Store overview"
        subtitle={config.subtitle}
        secondaryActions={
          config.secondaryCta
            ? [
                <Link
                  key="secondary"
                  href={config.secondaryCta.href}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-caption font-semibold"
                  style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)', color: 'var(--ink-secondary)' }}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {config.secondaryCta.label}
                </Link>,
              ]
            : undefined
        }
        primaryAction={
          <Link
            href={config.primaryCta.href}
            className="btn-accent inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-caption font-semibold"
          >
            {config.primaryCta.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* Completeness / stale banner - the clear next best action */}
      {config.banner ? <CompletenessBanner banner={config.banner} primaryCta={config.primaryCta} /> : null}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <MetricCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            icon={kpi.icon}
          />
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {/* Order volume trend */}
          <section className="rounded-lg border p-4" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-body-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>Order volume</p>
                <p className="text-caption" style={{ color: 'var(--ink-tertiary)' }}>8-week Shopify sync trend</p>
              </div>
            </div>
            {orderTrend.some((pt) => pt.value > 0) ? (
              <WeeklyTrendChart data={orderTrend} color="var(--accent)" primaryLabel="Orders" height={130} />
            ) : (
              <div
                className="flex h-[130px] items-center justify-center rounded-md"
                style={{ background: 'var(--bg-surface-alt)', border: '1px dashed var(--border-default)' }}
              >
                <p className="text-caption text-center px-4" style={{ color: 'var(--ink-tertiary)' }}>
                  {connectionState.shopify
                    ? 'No order signals in the past 8 weeks'
                    : 'Connect Shopify to see order trends'}
                </p>
              </div>
            )}
          </section>

          {/* Data detected */}
          <SectionCard
            title="Store data detected"
            description="What we have for your store right now, by source."
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <DataPresenceRow
                label="Shopify orders"
                present={dataPresence.hasShopifySignals}
                detail={dataPresence.hasShopifySignals ? `${dataPresence.sources.shopifyOrderSignals.toLocaleString()} order signals` : 'No Shopify orders yet'}
                icon={ShoppingBag}
              />
              <DataPresenceRow
                label="Imported orders"
                present={dataPresence.sources.auditTransactions > 0}
                detail={dataPresence.sources.auditTransactions > 0 ? `${dataPresence.sources.auditTransactions.toLocaleString()} matched transactions` : 'No CSV imports'}
                icon={Upload}
              />
              <DataPresenceRow
                label="Customer profiles"
                present={dataPresence.hasCustomerProfiles}
                detail={dataPresence.hasCustomerProfiles ? `${dataPresence.sources.customerProfiles.toLocaleString()} profiles` : 'No profiles yet'}
                icon={Users}
              />
              <DataPresenceRow
                label="Helpdesk claims"
                present={dataPresence.hasHelpdeskClaims}
                detail={dataPresence.hasHelpdeskClaims ? `${(dataPresence.sources.merchantClaims + dataPresence.sources.supportCases).toLocaleString()} claims tracked` : 'Connect helpdesk for claim history'}
                icon={Headphones}
              />
              <DataPresenceRow
                label="Evidence packages"
                present={dataPresence.hasEvidencePackages}
                detail={dataPresence.hasEvidencePackages ? `${dataPresence.sources.evidencePackages.toLocaleString()} dispute-ready` : 'None generated yet'}
                icon={ShieldCheck}
              />
              <DataPresenceRow
                label="Watchlist"
                present={dataPresence.hasWatchlist}
                detail={dataPresence.hasWatchlist ? `${dataPresence.sources.watchlistEntries.toLocaleString()} watched identities` : 'No watched identities'}
                icon={Activity}
              />
            </div>
          </SectionCard>

          {/* Helpdesk completeness - keep helpdesk first-class, never optional */}
          <SectionCard
            title="Claim & dispute context"
            description="Helpdesk completeness for this store"
            actions={
              <Link href="/claims" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Open claims →
              </Link>
            }
          >
            {connectionState.helpdesk ? (
              <p className="text-body-sm" style={{ color: 'var(--ink-secondary)' }}>
                {helpdeskLabel} is connected. {(dataPresence.sources.merchantClaims + dataPresence.sources.supportCases).toLocaleString()} claim
                {dataPresence.sources.merchantClaims + dataPresence.sources.supportCases === 1 ? '' : 's'} tracked and tied to orders and customer profiles for dispute context.
              </p>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-caption" style={{ color: 'var(--warning)' }}>
                  No helpdesk connected. Claim history and dispute context are incomplete until you connect Gorgias or Zendesk.
                </p>
                <Link
                  href="/settings/integrations"
                  className="btn-accent inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-semibold"
                >
                  Connect helpdesk
                </Link>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right rail */}
        <aside className="space-y-4">
          <SectionCard title="Sync health" actions={
            <Link href="/settings/integrations" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
              Manage →
            </Link>
          }>
            <div className="space-y-2.5">
              <SyncRow label="Shopify" connected={connectionState.shopify} icon={ShoppingBag} />
              <SyncRow label={helpdeskLabel} connected={connectionState.helpdesk} icon={Headphones} />
            </div>
          </SectionCard>

          <SectionCard title="Data freshness">
            {latestSync ? (
              <>
                <p className="num font-semibold" style={{ fontSize: 18, color: 'var(--data-score)' }}>{latestSync}</p>
                <p className="text-caption mt-1" style={{ color: 'var(--text-muted)' }}>Latest Shopify sync run.</p>
              </>
            ) : (
              <p className="text-caption" style={{ color: 'var(--text-subtle)' }}>
                {connectionState.shopify
                  ? 'No Shopify sync run recorded yet. Orders may still be arriving via live signals.'
                  : 'Connect Shopify to track sync freshness.'}
              </p>
            )}
            {connectionState.bothConnected ? (
              <Badge tone="success" size="sm" className="mt-3">Live monitoring on</Badge>
            ) : setupState === 'stale_existing_data' ? (
              <Badge tone="warning" size="sm" className="mt-3">Sources disconnected</Badge>
            ) : (
              <Badge tone="warning" size="sm" className="mt-3">Setup incomplete</Badge>
            )}
          </SectionCard>

          {latestShopifyJob ? (
            <SectionCard title="Shopify audit detail" description="Latest synced batch">
              <Link
                href={`/audit/${latestShopifyJob.id}?source=shopify`}
                className="inline-flex items-center gap-1.5 text-caption font-semibold hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                Open audit detail
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </SectionCard>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function buildWeeklyOrderTrend(rows: Array<{ processed_at: string }>): TrendDataPoint[] {
  const NOW = Date.now();
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const counts = new Array<number>(8).fill(0);
  for (const row of rows) {
    const ts = new Date(row.processed_at).getTime();
    const weeksAgo = Math.floor((NOW - ts) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < 8) counts[7 - weeksAgo] += 1;
  }
  return counts.map((value, i) => ({
    label: i === 7 ? 'Now' : i === 6 ? '1w' : `${8 - i}w`,
    value,
  }));
}

function DataPresenceRow({
  label,
  present,
  detail,
  icon: Icon,
}: {
  label: string;
  present: boolean;
  detail: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-md border px-3 py-2.5"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: present ? 'var(--accent)' : 'var(--ink-tertiary)' }} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-caption font-semibold" style={{ color: 'var(--ink-secondary)' }}>{label}</p>
          {present ? (
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--sev-clear)' }} />
          ) : null}
        </div>
        <p className="text-caption mt-0.5 leading-snug" style={{ color: present ? 'var(--text-muted)' : 'var(--text-subtle)' }}>
          {detail}
        </p>
      </div>
    </div>
  );
}
