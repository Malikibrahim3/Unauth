import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import type { GradeDistEntry } from '@/components/charts/GradeDistBar';
import type { Database } from '@/lib/supabase/types';
import { createServiceClient } from '@/lib/supabase/server';
import { riskLevelToNewGrade } from '@/lib/confidence';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import {
  ShoppingBag,
  Headphones,
  ShieldCheck,
  Users,
  Inbox,
  Activity,
} from 'lucide-react';

import type { DashboardConfig, QueueRow } from '@/app/(app)/dashboard/dashboardPageTypes';

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function signalList(row: QueueRow): string[] {
  if (!Array.isArray(row.signals_matched)) return [];
  return row.signals_matched.filter((s): s is string => typeof s === 'string' && s.length > 0);
}

type DedupedQueueEntry = { row: QueueRow; profileId: string | undefined; extraOrders: number };

export function dedupeQueueByCustomer(rows: QueueRow[], profileIdByTx: Map<string, string>): DedupedQueueEntry[] {
  const byKey = new Map<string, DedupedQueueEntry>();
  for (const row of rows) {
    const profileId = profileIdByTx.get(row.id);
    const key = profileId ?? row.customer_email ?? row.customer_name ?? row.id;
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { row, profileId, extraOrders: 0 });
    else existing.extraOrders += 1;
  }
  return Array.from(byKey.values());
}

export function gradeFromQueueRow(row: QueueRow): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (row.identity_confidence_grade) return riskLevelToNewGrade(row.identity_confidence_grade);
  if (row.match_status === 'definite') return 'A';
  if (row.match_status === 'probable') return 'B';
  if (row.match_status === 'candidate') return 'C';
  return 'F';
}


export function buildConfig(state: MerchantSetupState, connection: ConnectionState): DashboardConfig {
  const integrations = '/settings/integrations';
  switch (state) {
    case 'shopify_only_with_data':
      return {
        subtitle: 'Shopify orders are syncing. Connect Gorgias to add claim context to your tickets.',
        primaryCta: { label: 'Connect Gorgias', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'incomplete',
          title: 'Shopify connected — add Gorgias to activate claim intelligence',
          body: 'Connect Gorgias so your agents see claim context inside every support ticket. Claim metrics will show as incomplete until Gorgias is connected.',
        },
      };
    case 'helpdesk_only_with_data':
      return {
        subtitle: 'Claim history is syncing from your helpdesk. Add Shopify for order and customer context.',
        primaryCta: { label: 'Connect Shopify', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'incomplete',
          title: 'Your helpdesk is connected. Connect Shopify to add order context.',
          body: 'Claims are arriving, but order and customer context comes from Shopify. Connect it to tie claims to real purchase history.',
        },
      };
    case 'csv_only':
      return {
        subtitle: 'Showing intelligence from your imported history.',
        primaryCta: { label: 'Connect Shopify & helpdesk', href: integrations },
        secondaryCta: { label: 'Import more', href: '/upload' },
        banner: {
          tone: 'incomplete',
          title: 'Connect Shopify and your helpdesk for live monitoring.',
          body: 'This workspace is built from imported CSV history. Connect your live sources to monitor new orders and claims as they happen.',
        },
      };
    case 'stale_existing_data':
      return {
        subtitle: 'Showing your existing customer and order intelligence.',
        primaryCta: { label: 'Reconnect sources', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'stale',
          title: 'Showing existing data.',
          body: 'Reconnect Shopify and your helpdesk to keep analysis current and add claim context.',
        },
      };
    case 'fully_connected_with_data':
    default:
      return {
        subtitle: 'Claim intelligence across your Shopify orders and Gorgias tickets.',
        primaryCta: connection.bothConnected
          ? { label: 'Review queue', href: '/customers?risk=high&status=new' }
          : { label: 'Complete setup', href: integrations },
        banner: null,
      };
  }
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type Kpi = {
  label: string;
  value: string;
  hint?: string;
  incomplete?: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
};

function fmt(n: number): string {
  return n === 0 ? '—' : n.toLocaleString();
}

export function buildKpis(
  state: MerchantSetupState,
  connection: ConnectionState,
  presence: MerchantDataPresence,
  metrics: { reviewQueue: number | null; claimsNeedingAction: number; totalPackages: number },
): Kpi[] {
  const s = presence.sources;
  const customers: Kpi = {
    label: state === 'csv_only' ? 'Imported customers' : 'Customers monitored',
    value: fmt(s.customerProfiles),
    hint: s.customerProfiles > 0 ? 'Profiles across all sources' : 'Appears once data syncs',
    icon: Users,
  };
  const orders: Kpi = {
    label: 'Orders synced',
    value: fmt(s.shopifyOrderSignals || s.auditTransactions),
    hint: s.shopifyOrderSignals > 0 ? 'From Shopify' : s.auditTransactions > 0 ? 'From imports' : undefined,
    icon: ShoppingBag,
  };
  const identityMatches: Kpi = {
    label: 'Identity matches',
    value: metrics.reviewQueue === null ? 'Unavailable' : fmt(metrics.reviewQueue),
    hint: 'High-confidence linked identities',
    icon: Users,
  };
  const evidence: Kpi = {
    label: 'Evidence ready',
    value: fmt(metrics.totalPackages),
    hint: 'For dispute documentation',
    icon: ShieldCheck,
  };
  const reviewQueue: Kpi = {
    label: 'Review queue',
    value: metrics.reviewQueue === null ? 'Unavailable' : fmt(metrics.reviewQueue),
    hint: 'Profiles needing a look',
    icon: Inbox,
  };
  const claims: Kpi = {
    label: 'Claims needing action',
    value: connection.helpdesk ? fmt(metrics.claimsNeedingAction) : 'Missing',
    hint: connection.helpdesk ? 'Awaiting a decision' : 'Connect helpdesk to add claim history',
    incomplete: !connection.helpdesk,
    icon: Headphones,
  };
  const syncHealth: Kpi = {
    label: 'Sync health',
    value: connection.bothConnected ? 'Healthy' : connection.neitherConnected ? 'Offline' : 'Partial',
    hint: connection.bothConnected ? 'Both sources connected' : 'One source missing',
    incomplete: !connection.bothConnected,
    icon: Activity,
  };

  switch (state) {
    case 'shopify_only_with_data':
      return [customers, orders, identityMatches, claims, evidence];
    case 'helpdesk_only_with_data':
      return [
        { label: 'Claims tracked', value: fmt(s.merchantClaims + s.supportCases), hint: 'From your helpdesk', icon: Headphones },
        claims,
        customers,
        { label: 'Order context', value: 'Missing', hint: 'Connect Shopify to add orders', incomplete: true, icon: ShoppingBag },
        evidence,
      ];
    case 'csv_only':
      return [
        customers,
        reviewQueue,
        { label: 'Matched orders', value: fmt(s.auditTransactions), hint: 'From imports', icon: ShoppingBag },
        evidence,
        { label: 'Live monitoring', value: 'Off', hint: 'Connect Shopify & helpdesk', incomplete: true, icon: Activity },
      ];
    case 'stale_existing_data':
      return [customers, identityMatches, orders, evidence, syncHealth];
    case 'fully_connected_with_data':
    default:
      return [customers, reviewQueue, claims, evidence, syncHealth];
  }
}

// Build an 8-week trend array from rows that have submitted_at or created_at
export function buildWeeklyTrend(
  rows: Array<{ submitted_at: string | null; created_at: string }>,
): TrendDataPoint[] {
  const NOW = Date.now();
  const WEEK_MS = 7 * 24 * 3600 * 1000;
  const counts = new Array<number>(8).fill(0);
  for (const row of rows) {
    const ts = new Date(row.submitted_at ?? row.created_at).getTime();
    const weeksAgo = Math.floor((NOW - ts) / WEEK_MS);
    if (weeksAgo >= 0 && weeksAgo < 8) counts[7 - weeksAgo] += 1;
  }
  return counts.map((value, i) => ({
    label: i === 7 ? 'Now' : i === 6 ? '1w' : `${8 - i}w`,
    value,
  }));
}

// Build grade distribution array from review queue rows
export function buildGradeDist(rows: QueueRow[]): GradeDistEntry[] {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const row of rows) {
    const g = gradeFromQueueRow(row);
    if (g in counts) counts[g as keyof typeof counts] += 1;
  }
  return [
    { key: 'A', label: 'A · Definite', count: counts.A, color: 'var(--sev-definite)' },
    { key: 'B', label: 'B · Probable', count: counts.B, color: 'var(--sev-probable)' },
    { key: 'C', label: 'C · Possible', count: counts.C, color: 'var(--sev-possible)' },
    { key: 'D', label: 'D · Weak',     count: counts.D, color: 'var(--sev-clear)' },
  ];
}

export async function countEvidence(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
): Promise<{ total: number; ce3Eligible: number }> {
  const [{ count: total }, { count: ce3Eligible }] = await Promise.all([
    serviceClient
      .from('evidence_packages' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from('evidence_packages' as never)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .eq('ce3_eligible', true),
  ]);
  return { total: total ?? 0, ce3Eligible: ce3Eligible ?? 0 };
}

export async function countClaimsNeedingAction(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
): Promise<number> {
  const { count } = await serviceClient
    .from('merchant_claims' as never)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .in('status', ['open', 'under_review', 'evidence_requested', 'pending', 'escalated']);
  return count ?? 0;
}
