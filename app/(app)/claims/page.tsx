import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { WorkbenchPage, WorkbenchKpiStrip, WorkbenchEmptyState, Button } from '@/components/ui';
import { formatCurrencyNullable } from '@/lib/utils/format';

const CLAIM_TYPE_LABELS: Record<string, string> = {
  missing_parcel: 'Missing parcel',
  damaged: 'Damaged item',
  wrong_item: 'Wrong item',
  refund_request: 'Refund request',
  chargeback: 'Chargeback',
  return_abuse: 'Return abuse',
  other: 'Other',
};

const DECISION_LABELS: Record<string, string> = {
  approved: 'Approved',
  denied: 'Denied',
  escalated: 'Escalated',
  partial_refund: 'Partial refund',
  full_refund: 'Full refund',
  chargeback_disputed: 'CB disputed',
  blacklist: 'Blacklisted',
  no_action: 'No action',
};

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  open:               { label: 'Open',               bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
  under_review:       { label: 'Under review',        bg: 'var(--sev-medium-fill,#FEF3C7)',     text: 'var(--sev-medium,#B45309)' },
  evidence_requested: { label: 'Evidence requested',  bg: 'var(--sev-high-fill,#FEE2E2)',       text: 'var(--sev-high,#991B1B)' },
  resolved:           { label: 'Resolved',            bg: 'var(--sev-clear-fill,#DCFCE7)',      text: 'var(--sev-clear,#166534)' },
  closed:             { label: 'Closed',              bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
};

const ALLOWED_STATUSES = ['open', 'under_review', 'evidence_requested', 'resolved', 'closed'] as const;
type ClaimStatus = (typeof ALLOWED_STATUSES)[number];

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? STATUS_META['open'];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) redirect('/dashboard');

  const resolvedParams = (await searchParams) ?? {};
  const statusFilter = ALLOWED_STATUSES.includes(resolvedParams.status as ClaimStatus)
    ? (resolvedParams.status as ClaimStatus)
    : null;

  let query = serviceClient
    .from('merchant_claims' as any)
    .select('id,customer_id,shop_domain,shopify_order_id,order_ref,claim_type,status,amount_at_risk,currency,updated_at,merchant_case_outcomes(decision,outcome,updated_at)')
    .eq('merchant_id', ctx.merchantId)
    .order('updated_at', { ascending: false })
    .limit(100);

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data: rawClaims, error: claimsQueryError } = await query;
  let claimsSource = rawClaims;
  if (claimsQueryError) {
    const { data: fallbackClaims } = await serviceClient
      .from('merchant_claims' as any)
      .select('id,customer_id,shop_domain,shopify_order_id,order_ref,claim_type,status,amount_at_risk,currency,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .order('updated_at', { ascending: false })
      .limit(100);
    claimsSource = (fallbackClaims ?? []).map((c: any) => ({ ...c, merchant_case_outcomes: [] }));
  }
  const claims = (claimsSource ?? []) as Array<{
    id: string;
    customer_id: string | null;
    shop_domain: string | null;
    shopify_order_id: string | null;
    order_ref: string | null;
    claim_type: string;
    status: string;
    amount_at_risk: number | null;
    currency: string | null;
    updated_at: string;
    merchant_case_outcomes: Array<{ decision: string; outcome: string; updated_at: string }> | null;
  }>;

  // Count by status for KPI strip
  const { data: allRaw } = await serviceClient
    .from('merchant_claims' as any)
    .select('status,amount_at_risk,currency')
    .eq('merchant_id', ctx.merchantId);
  const all = (allRaw ?? []) as Array<{ status: string; amount_at_risk: number | null; currency: string | null }>;
  const openCount = all.filter((c) => c.status === 'open' || c.status === 'under_review' || c.status === 'evidence_requested').length;
  const totalAtRisk = all.reduce((s, c) => s + (c.amount_at_risk ?? 0), 0);
  const resolvedCount = all.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

  const statusTabs: Array<{ label: string; value: string | null }> = [
    { label: 'All', value: null },
    { label: 'Open', value: 'open' },
    { label: 'Under review', value: 'under_review' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  const isEmpty = all.length === 0;

  return (
    <WorkbenchPage
      title="Claims"
      subtitle="Track and resolve customer claims across all orders"
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'claims', label: 'Claims', href: '/claims' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/reports' },
      ]}
      activeNavKey="claims"
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Open / in review', value: openCount.toLocaleString(), hint: 'Needs action' },
            { label: 'Total at risk', value: formatCurrencyNullable(totalAtRisk || null), hint: 'All claims' },
            { label: 'Resolved', value: resolvedCount.toLocaleString(), hint: 'All time' },
            { label: 'Total claims', value: all.length.toLocaleString(), hint: 'All time' },
          ]}
        />
      }
      main={
        isEmpty ? (
          <WorkbenchEmptyState
            title="No claims yet"
            description="Claims appear here when filed from a customer profile. Open a customer profile, run a claim review, and it will show up in this list."
            action={
              <Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                Go to Customers →
              </Link>
            }
          />
        ) : (
          <div className="p-4 space-y-3">
            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.value;
                const href = tab.value ? `/claims?status=${tab.value}` : '/claims';
                return (
                  <Link
                    key={tab.label}
                    href={href}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: active ? 'var(--accent)' : 'var(--bg-subtle)',
                      color: active ? 'var(--text-inverse)' : 'var(--text-muted)',
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {claims.length === 0 ? (
              <p className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {statusFilter ? `No claims with status "${statusFilter}".` : 'No claims found.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {['Order ref', 'Type', 'Status', 'Decision', 'At risk', 'Updated'].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                          {h}
                        </th>
                      ))}
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      const orderRef = c.shopify_order_id ?? c.order_ref ?? c.id.slice(0, 8);
                      const latestOutcome = Array.isArray(c.merchant_case_outcomes) && c.merchant_case_outcomes.length > 0
                        ? c.merchant_case_outcomes[0]
                        : null;
                      return (
                        <tr
                          key={c.id}
                          className="border-t"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text)' }}>
                            {orderRef}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>
                            {CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {latestOutcome ? DECISION_LABELS[latestOutcome.decision] ?? latestOutcome.decision : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--text)' }}>
                            {formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined)}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.updated_at).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {c.customer_id ? (
                              <Link
                                href={`/customers/${c.customer_id}/claims`}
                                className="text-xs font-semibold hover:underline"
                                style={{ color: 'var(--accent)' }}
                              >
                                Review →
                              </Link>
                            ) : (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }
    />
  );
}
