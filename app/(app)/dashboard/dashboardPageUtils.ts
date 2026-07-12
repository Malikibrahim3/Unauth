import type { TrendDataPoint } from '@/components/charts/WeeklyTrendChart';
import type { GradeDistEntry } from '@/components/charts/GradeDistBar';
import type { Database } from '@/lib/supabase/types';
import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { formatCurrency } from '@/lib/utils/format';
import type { ConnectionState } from '@/lib/connections/getConnectionState';
import type { MerchantDataPresence } from '@/lib/supabase/getMerchantDataPresence';
import type { MerchantSetupState } from '@/lib/connections/getMerchantSetupState';
import {
  ShoppingBag,
  Headphones,
  ShieldCheck,
  Users,
  Search,
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
        subtitle: 'Shopify orders are syncing. Connect Gorgias to add payout control to your tickets.',
        primaryCta: { label: 'Connect Gorgias', href: integrations },
        secondaryCta: undefined,
        banner: {
          tone: 'incomplete',
          title: 'Shopify connected - add Gorgias to activate payout control',
          body: 'Connect Gorgias so your agents see payout exposure, evidence, and recovery context inside every support ticket. Payout metrics will show as incomplete until Gorgias is connected.',
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
        banner: {
          tone: 'stale',
          title: 'Running from imported history — connect live sources for real-time monitoring.',
          body: 'Shopify and a helpdesk will add new orders and claims as they happen, and sync your ticket queue for one-click evidence building.',
        },
      };
    case 'stale_existing_data':
      return {
        subtitle: 'What is at risk, what needs action, and what came back.',
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
        subtitle: 'Payout exposure, recovery progress, and prevention insights across your support payouts.',
        primaryCta: connection.bothConnected
          ? { label: 'Open payout control', href: '/claims' }
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
  metrics: {
    reviewQueue: number | null;
    claimsNeedingAction: number;
    totalPackages: number;
    recoveryOpen: number;
    chaseDue: number;
    amountRecovered: number;
    payoutExposureOpen: number;
    displayCurrency: string;
  },
): Kpi[] {
  const s = presence.sources;
  const fmtMoney = (n: number) => (n <= 0 ? '—' : formatCurrency(n, metrics.displayCurrency));

  const openExposure: Kpi = {
    label: 'Open payout exposure',
    value: fmtMoney(metrics.payoutExposureOpen),
    hint: metrics.payoutExposureOpen > 0 ? 'On open support payout cases' : 'No open exposure',
    icon: Headphones,
  };
  // Show the real open-case count whenever payout cases exist — even on a demo /
  // disconnected account (Option A). Only fall back to "Missing" when there is
  // genuinely no case data AND no helpdesk connection to produce it.
  const hasClaimData = metrics.claimsNeedingAction > 0;
  const openClaims: Kpi = {
    label: 'Open payout cases',
    value: connection.helpdesk || hasClaimData ? fmt(metrics.claimsNeedingAction) : 'Missing',
    hint: connection.helpdesk || hasClaimData ? 'Awaiting decision or evidence' : 'Connect helpdesk',
    incomplete: !connection.helpdesk && !hasClaimData,
    icon: ShieldCheck,
  };
  const recoveryOpen: Kpi = {
    label: 'Recovery cases open',
    value: fmt(metrics.recoveryOpen),
    hint: 'Recoverable losses in progress',
    icon: Activity,
  };
  const chaseDue: Kpi = {
    label: 'Chase due',
    value: fmt(metrics.chaseDue),
    hint: 'Recovery cases needing follow-up',
    icon: Search,
  };
  const recovered: Kpi = {
    label: 'Amount recovered',
    value: fmtMoney(metrics.amountRecovered),
    hint: 'Paid recovery outcomes',
    icon: ShoppingBag,
  };
  const syncHealth: Kpi = {
    label: 'Sync health',
    value: connection.bothConnected ? 'Healthy' : connection.neitherConnected ? 'Offline' : 'Partial',
    hint: connection.bothConnected ? 'Shopify + helpdesk connected' : 'One source missing',
    incomplete: !connection.bothConnected,
    icon: Activity,
  };

  switch (state) {
    case 'shopify_only_with_data':
      return [openExposure, openClaims, recoveryOpen, chaseDue, syncHealth];
    case 'helpdesk_only_with_data':
      return [openClaims, openExposure, recoveryOpen, { label: 'Order context', value: 'Missing', hint: 'Connect Shopify', incomplete: true, icon: ShoppingBag }, syncHealth];
    case 'csv_only':
      return [
        { label: 'Legacy profiles', value: fmt(s.customerProfiles), hint: 'From imported history', icon: Users },
        { label: 'Matched orders', value: fmt(s.auditTransactions), hint: 'Legacy import only', icon: ShoppingBag },
        openClaims,
        recoveryOpen,
        { label: 'Live monitoring', value: 'Off', hint: 'Connect Shopify & helpdesk', incomplete: true, icon: Activity },
      ];
    case 'stale_existing_data':
      return [openExposure, openClaims, recoveryOpen, recovered, syncHealth];
    case 'fully_connected_with_data':
    default:
      return [openExposure, openClaims, recoveryOpen, chaseDue, recovered];
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
    { key: 'A', label: 'A · Definite', count: counts.A, color: 'var(--success)' },
    { key: 'B', label: 'B · Probable', count: counts.B, color: 'var(--warning)' },
    { key: 'C', label: 'C · Possible', count: counts.C, color: 'var(--sev-possible)' },
    { key: 'D', label: 'D · Weak',     count: counts.D, color: 'var(--neutral)' },
  ];
}

export async function countEvidence(
  serviceClient: ReturnType<typeof createServiceClient>,
  merchantId: string,
): Promise<{ total: number; ce3Eligible: number }> {
  const [{ count: total }, { count: ce3Eligible }] = await Promise.all([
    serviceClient
      .from(TABLES.EVIDENCE_PACKAGES)
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId),
    serviceClient
      .from(TABLES.EVIDENCE_PACKAGES)
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
    .from(TABLES.MERCHANT_CLAIMS)
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .in('status', [...ACTIVE_CLAIM_STATUSES]);
  return count ?? 0;
}
