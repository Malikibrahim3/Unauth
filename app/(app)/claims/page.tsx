import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { WorkbenchPage, WorkbenchKpiStrip, WorkbenchEmptyState, Button } from '@/components/ui';
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems';
import { TABLES } from '@/lib/supabase/tables';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { riskLevelToNewGrade } from '@/lib/confidence';
import { formatCurrencyNullable } from '@/lib/utils/format';
import { ACTIVE_CLAIM_STATUSES, formatClaimAge, formatFiledDate, getClaimSlaState } from '@/lib/claims/sla';

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
  pending:            { label: 'Pending external evidence', bg: 'var(--sev-medium-fill,#FEF3C7)', text: 'var(--sev-medium,#B45309)' },
  escalated:          { label: 'Escalated',           bg: 'var(--risk-critical-bg,#FEE2E2)',    text: 'var(--risk-critical,#991B1B)' },
  resolved:           { label: 'Resolved',            bg: 'var(--sev-clear-fill,#DCFCE7)',      text: 'var(--sev-clear,#166534)' },
  closed:             { label: 'Closed',              bg: 'var(--bg-subtle)',                   text: 'var(--text-muted)' },
};

const ALLOWED_STATUSES = ['open', 'under_review', 'evidence_requested', 'pending', 'escalated', 'resolved', 'closed'] as const;
type ClaimStatus = (typeof ALLOWED_STATUSES)[number];

type ClaimRow = {
  id: string;
  customer_id: string | null;
  shop_domain: string | null;
  shopify_order_id: string | null;
  order_ref?: string | null;
  claim_type: string;
  status: string;
  amount_at_risk: number | null;
  currency: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at: string;
};

type CustomerProfileSummary = {
  id: string;
  names: string[] | null;
  primary_email: string | null;
  risk_level: string;
};

type EvidencePackageRow = {
  id: string;
  customer_profile_id: string | null;
  generated_for_order_id: string | null;
  reference_number: string;
  generated_at: string;
};

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

function SlaPill({ claim }: { claim: ClaimRow }) {
  const sla = getClaimSlaState(claim);
  const colourMap: Record<string, { bg: string; text: string }> = {
    normal: { bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
    approaching: { bg: 'var(--sev-medium-fill,#FEF3C7)', text: 'var(--sev-medium,#B45309)' },
    overdue: { bg: 'var(--sev-high-fill,#FEE2E2)', text: 'var(--sev-high,#991B1B)' },
    resolved: { bg: 'var(--sev-clear-fill,#DCFCE7)', text: 'var(--sev-clear,#166534)' },
  };
  const c = colourMap[sla.state] ?? colourMap.normal;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: c.bg, color: c.text }}
    >
      {sla.label}
    </span>
  );
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; sort?: string; sla?: string }>;
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
  const sort = resolvedParams.sort === 'age' || resolvedParams.sort === 'filed_desc' ? resolvedParams.sort : 'updated';
  const slaFilter = resolvedParams.sla === 'overdue' || resolvedParams.sla === 'approaching' ? resolvedParams.sla : null;
  const orderColumn = sort === 'age' || sort === 'filed_desc' ? 'submitted_at' : 'updated_at';
  const orderAscending = sort === 'age';

  let query = serviceClient
    .from('merchant_claims' as any)
    .select('id,customer_id,shop_domain,shopify_order_id,order_ref,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId)
    .order(orderColumn, { ascending: orderAscending })
    .limit(100);

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data: rawClaims, error: claimsQueryError } = await query;

  let claims = (rawClaims ?? []) as ClaimRow[];
  if (claimsQueryError) {
    const errMsg = String((claimsQueryError as any)?.message ?? '');
    const isExpectedShapeFallback =
      errMsg.includes('order_ref') ||
      errMsg.includes('order_source') ||
      errMsg.includes('column') ||
      errMsg.includes('schema cache');
    if (!isExpectedShapeFallback) {
      console.error('Claims page query failed; retrying with base merchant_claims columns', claimsQueryError);
    }

    let fallbackQuery = serviceClient
      .from('merchant_claims' as any)
      .select('id,customer_id,shop_domain,shopify_order_id,claim_type,status,amount_at_risk,currency,submitted_at,created_at,updated_at')
      .eq('merchant_id', ctx.merchantId)
      .order(orderColumn, { ascending: orderAscending })
      .limit(100);

    if (statusFilter) fallbackQuery = fallbackQuery.eq('status', statusFilter);

    const { data: fallbackClaims, error: fallbackQueryError } = await fallbackQuery;
    if (fallbackQueryError) {
      console.error('Claims page fallback query failed', fallbackQueryError);
    }
    claims = (fallbackClaims ?? []) as ClaimRow[];
  }

  if (slaFilter) {
    claims = claims.filter((claim) => getClaimSlaState(claim).state === slaFilter);
  }

  const claimIds = claims.map((c) => c.id);
  let latestOutcomeByClaimId = new Map<string, { decision: string; outcome: string; updated_at: string }>();
  if (claimIds.length > 0) {
    const { data: outcomeRows } = await serviceClient
      .from('merchant_case_outcomes' as any)
      .select('claim_id,decision,outcome,updated_at')
      .in('claim_id', claimIds)
      .order('updated_at', { ascending: false });
    for (const row of (outcomeRows ?? []) as Array<{ claim_id: string; decision: string; outcome: string; updated_at: string }>) {
      if (!latestOutcomeByClaimId.has(row.claim_id)) {
        latestOutcomeByClaimId.set(row.claim_id, { decision: row.decision, outcome: row.outcome, updated_at: row.updated_at });
      }
    }
  }

  const customerIds = Array.from(new Set(claims.map((c) => c.customer_id).filter(Boolean) as string[]));
  const customerById = new Map<string, CustomerProfileSummary>();
  if (customerIds.length > 0) {
    const { data: profileRows } = await serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('id, names, primary_email, risk_level')
      .in('id', customerIds);
    for (const row of (profileRows ?? []) as CustomerProfileSummary[]) {
      customerById.set(row.id, row);
    }
  }

  const orderRefs = Array.from(new Set(claims.map((c) => c.shopify_order_id ?? c.order_ref).filter(Boolean) as string[]));

  const orderIdByOrderRef = new Map<string, string>();
  if (orderRefs.length > 0) {
    const { data: orderRows } = await serviceClient
      .from('fraud_transactions' as any)
      .select('id,order_id')
      .eq('merchant_id', ctx.merchantId)
      .in('order_id', orderRefs)
      .limit(500);
    for (const row of (orderRows ?? []) as Array<{ id: string; order_id: string }>) {
      orderIdByOrderRef.set(row.order_id, row.id);
    }
  }

  const evidenceByClaimId = new Map<string, EvidencePackageRow | null>();
  if (customerIds.length > 0) {
    const { data: evidenceRows } = await serviceClient
      .from('evidence_packages' as any)
      .select('id,customer_profile_id,generated_for_order_id,reference_number,generated_at')
      .eq('merchant_id', ctx.merchantId)
      .in('customer_profile_id', customerIds)
      .order('generated_at', { ascending: false })
      .limit(1000);

    const rows = (evidenceRows ?? []) as EvidencePackageRow[];
    for (const claim of claims) {
      const claimOrderRef = claim.shopify_order_id ?? claim.order_ref ?? null;
      const disputedOrderId = claimOrderRef ? orderIdByOrderRef.get(claimOrderRef) ?? null : null;
      const customerMatch = rows.filter((r) => r.customer_profile_id === claim.customer_id);
      const exact = disputedOrderId ? customerMatch.find((r) => r.generated_for_order_id === disputedOrderId) : null;
      evidenceByClaimId.set(claim.id, exact ?? customerMatch[0] ?? null);
    }
  }

  // Count by status for KPI strip
  const { data: allRaw } = await serviceClient
    .from('merchant_claims' as any)
    .select('status,amount_at_risk,currency,submitted_at,created_at,updated_at')
    .eq('merchant_id', ctx.merchantId);
  const all = (allRaw ?? []) as Array<{ status: string; amount_at_risk: number | null; currency: string | null }>;
  const openCount = all.filter((c) => ACTIVE_CLAIM_STATUSES.includes(c.status as any)).length;
  const totalAtRisk = all.reduce((s, c) => s + (c.amount_at_risk ?? 0), 0);
  const resolvedCount = all.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
  const overdueCount = all.filter((c) => ACTIVE_CLAIM_STATUSES.includes(c.status as any) && getClaimSlaState(c).state === 'overdue').length;

  const statusTabs: Array<{ label: string; value: string | null }> = [
    { label: 'All', value: null },
    { label: 'Open', value: 'open' },
    { label: 'Under review', value: 'under_review' },
    { label: 'Pending', value: 'pending' },
    { label: 'Escalated', value: 'escalated' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  const isEmpty = all.length === 0;

  return (
    <WorkbenchPage
      title="Claims"
      subtitle="Track and resolve customer claims across all orders"
      navItems={[
        ...WORKBENCH_NAV_ITEMS,
        { key: 'claims', label: 'Claims', href: '/claims' },
      ]}
      activeNavKey="claims"
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Open / in review', value: openCount.toLocaleString(), hint: 'Needs action' },
            { label: 'Overdue', value: overdueCount.toLocaleString(), hint: '>72h open' },
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

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {[
                { label: 'Recently updated', href: statusFilter ? `/claims?status=${statusFilter}` : '/claims', active: sort === 'updated' },
                { label: 'Oldest first', href: `/claims?${new URLSearchParams({ ...(statusFilter ? { status: statusFilter } : {}), sort: 'age' }).toString()}`, active: sort === 'age' },
                { label: 'Newest filed', href: `/claims?${new URLSearchParams({ ...(statusFilter ? { status: statusFilter } : {}), sort: 'filed_desc' }).toString()}`, active: sort === 'filed_desc' },
                { label: 'Overdue', href: '/claims?sla=overdue&sort=age', active: slaFilter === 'overdue' },
                { label: 'Approaching SLA', href: '/claims?sla=approaching&sort=age', active: slaFilter === 'approaching' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-2.5 py-1 rounded-md font-medium"
                  style={{ background: item.active ? 'var(--accent)' : 'var(--bg-subtle)', color: item.active ? 'var(--text-inverse)' : 'var(--text-muted)' }}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {claims.length === 0 ? (
              <p className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                {statusFilter ? `No claims with status "${statusFilter}".` : 'No claims found.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-subtle)' }}>
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-subtle)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {[
                        { label: 'Order ref', className: '' },
                        { label: 'Customer', className: 'min-w-[160px]' },
                        { label: 'Type', className: '' },
                        { label: 'Status', className: '' },
                        { label: 'Decision', className: 'hidden xl:table-cell' },
                        { label: 'Filed', className: 'hidden lg:table-cell' },
                        { label: 'Age', className: 'hidden lg:table-cell' },
                        { label: 'SLA', className: '' },
                        { label: 'Evidence', className: 'hidden xl:table-cell' },
                        { label: 'At risk', className: '' },
                        { label: 'Updated', className: 'hidden lg:table-cell' },
                      ].map((col) => (
                        <th
                          key={col.label}
                          className={`text-left px-4 py-2.5 text-xs font-semibold whitespace-nowrap ${col.className}`}
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {col.label}
                        </th>
                      ))}
                      <th
                        className="sticky right-0 px-4 py-2.5 text-xs font-semibold text-right whitespace-nowrap"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c) => {
                      const orderRef = c.shopify_order_id ?? c.order_ref ?? c.id.slice(0, 8);
                      const latestOutcome = latestOutcomeByClaimId.get(c.id) ?? null;
                      const linkedEvidence = evidenceByClaimId.get(c.id) ?? null;
                      const customer = c.customer_id ? customerById.get(c.customer_id) ?? null : null;
                      const customerName = customer?.names?.[0] ?? null;
                      const customerEmail = customer?.primary_email ?? null;
                      return (
                        <tr
                          key={c.id}
                          className="group border-t hover:bg-[var(--bg-hover)]"
                          style={{ borderColor: 'var(--border-subtle)' }}
                        >
                          <td className="px-4 py-3 font-mono text-xs max-w-[120px] truncate" style={{ color: 'var(--text)' }} title={orderRef}>
                            {orderRef}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>
                            {c.customer_id ? (
                              <Link href={`/customers/${c.customer_id}`} className="block min-w-0 hover:underline" style={{ color: 'var(--accent)' }}>
                                <span className="block font-semibold truncate">{customerName ?? 'Unknown customer'}</span>
                                {customerEmail && (
                                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{customerEmail}</span>
                                )}
                                {customer?.risk_level && (
                                  <span className="mt-1 inline-block">
                                    <ConfidenceBadge grade={riskLevelToNewGrade(customer.risk_level)} size="sm" />
                                  </span>
                                )}
                              </Link>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {CLAIM_TYPE_LABELS[c.claim_type] ?? c.claim_type}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {latestOutcome ? DECISION_LABELS[latestOutcome.decision] ?? latestOutcome.decision : '—'}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatFiledDate(c)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {formatClaimAge(c)}
                          </td>
                          <td className="px-4 py-3">
                            <SlaPill claim={c} />
                          </td>
                          <td className="hidden xl:table-cell px-4 py-3 text-xs max-w-[100px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {linkedEvidence ? (
                              <Link href={`/chargebacks/${linkedEvidence.id}`} className="hover:underline truncate block" style={{ color: 'var(--accent)' }} title={linkedEvidence.reference_number}>
                                {linkedEvidence.reference_number}
                              </Link>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                            {formatCurrencyNullable(c.amount_at_risk, c.currency ?? undefined)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.updated_at).toLocaleDateString('en-GB')}
                          </td>
                          <td
                            className="sticky right-0 px-4 py-3 text-right whitespace-nowrap group-hover:bg-[var(--bg-hover)]"
                            style={{ background: 'var(--surface-raised)' }}
                          >
                            {c.customer_id ? (
                              <Link
                                href={`/customers/${c.customer_id}/claims?claimId=${c.id}`}
                                className="text-xs font-semibold hover:underline"
                                style={{ color: 'var(--accent)' }}
                              >
                                Review
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
