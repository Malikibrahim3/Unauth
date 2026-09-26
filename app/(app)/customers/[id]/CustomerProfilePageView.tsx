import CustomerNotes from '@/components/audit/CustomerNotes';
import Link from '@/components/navigation/AppNavLink';
import { SetBreadcrumbLabel } from '@/components/layout/SetBreadcrumbLabel';
import { CustomerDecisionControls } from '@/components/customers/CustomerDecisionControls';
import type { CustomerProfileBlockedReason, CustomerProfilePageViewProps } from '@/app/(app)/customers/[id]/customerProfilePageLoad';
import type { RoadmapTransaction } from '@/app/(app)/customers/[id]/customerProfilePageLabels';
import { formatCurrencyNullable, formatDayMonthInTimeZone, formatMonthInTimeZone, formatNumber } from '@/lib/utils/format';

import { ACTIVE_CLAIM_STATUSES } from '@/lib/claims/sla';

const sans = "'Inter',sans-serif";
const mono = "'IBM Plex Mono',monospace";
const line = '1px solid #eae8e5';
const cardShadow = '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)';

function shortDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDayMonthInTimeZone(date, 'UTC');
}

function monthName(index: number) {
  return formatMonthInTimeZone(new Date(Date.UTC(2026, index, 1)), 'UTC').toUpperCase();
}

function money(value: number | string | null | undefined, currency: string | null | undefined) {
  const amount = value == null ? null : Number(value);
  return amount == null || !Number.isFinite(amount) || !currency ? '—' : formatCurrencyNullable(amount, currency) ?? '—';
}

function initials(value: string) {
  return value.split(/\s+|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '—';
}

function sentence(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ') : 'reason unavailable';
}

function outcome(status: string) {
  const normalized = status.toLowerCase();
  if (['resolved', 'closed', 'refunded', 'approved', 'recovered'].includes(normalized)) return { label: normalized.toUpperCase(), bg: '#eef6f1', color: '#1a6b43' };
  if (['declined', 'denied', 'rejected'].includes(normalized)) return { label: 'DECLINED', bg: '#fdf0e6', color: '#b0431a' };
  if (['replaced', 'replacement'].includes(normalized)) return { label: 'REPLACED', bg: '#f4f3f1', color: '#40454a' };
  return { label: normalized === 'under_review' ? 'OPEN' : normalized.replaceAll('_', ' ').toUpperCase(), bg: '#fff3e9', color: '#7a5310' };
}

function transactionFor(sourceOrderId: string | null | undefined, transactions: RoadmapTransaction[]) {
  return sourceOrderId ? transactions.find((transaction) => transaction.source_order_id === sourceOrderId) ?? null : null;
}

export function CustomerProfileBlockedView({ reason }: { reason: CustomerProfileBlockedReason }) {
  const denied = reason === 'access_denied';
  return <section data-screen-label={denied ? 'Access denied' : 'Link expired'} data-state-id={denied ? 'customer-profile-access-blocked-state' : 'customer-profile-link-expired'} style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'grid', placeItems: 'center', background: '#fff' }}><div style={{ width: 520, maxWidth: '100%', borderRadius: 13, padding: 11, background: '#f4f3f1' }}><div style={{ borderRadius: 10, padding: 24, background: '#fff', boxShadow: cardShadow, textAlign: 'center' }}><strong style={{ display: 'block', color: '#1c1f23', font: `500 15px/1.3 ${sans}` }}>{denied ? 'Access denied' : 'Link expired'}</strong><span style={{ display: 'block', marginTop: 7, color: '#64686d', font: `400 11.5px/1.55 ${sans}` }}>{denied ? 'Your current workspace role does not include this customer record. No customer name or identifier is shown.' : 'This link has expired. Ask your team for a new one from Unauth.'}</span>{denied ? null : <a href="https://unauth.co" style={{ display: 'inline-block', marginTop: 13, padding: '7px 11px', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.1)', color: '#40454a', textDecoration: 'none', font: `500 12px/1 ${sans}` }}>Go to unauth.co</a>}</div></div></section>;
}

export function CustomerProfilePageView(props: CustomerProfilePageViewProps) {
  const {
    profile, displayName, orderCoverage, caseCoverage, merchantClaimCount,
    merchantOrderCount, isEligibleForEvidence, totalOrderValue, totalRefundedValue,
    displayCurrency, transactions, activityLog, openClaimCount,
    linkedAccounts, claims,
  } = props;
  const claimCount = merchantClaimCount ?? claims.length;
  const orderCount = merchantOrderCount;
  const lossValue = totalRefundedValue;
  const datedCases = claims.flatMap((claim) => {
    const raw = claim.submitted_at ?? claim.created_at;
    if (!raw) return [];
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? [] : [{ claim, date }];
  });
  const latestDate = datedCases.map(({ date }) => date).sort((a, b) => b.getTime() - a.getTime())[0];
  const months = latestDate ? Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(Date.UTC(latestDate.getUTCFullYear(), latestDate.getUTCMonth() - (5 - offset), 1));
    const matching = datedCases.filter((entry) => entry.date.getUTCFullYear() === date.getUTCFullYear() && entry.date.getUTCMonth() === date.getUTCMonth());
    const openCount = matching.filter(({ claim }) => (ACTIVE_CLAIM_STATUSES as readonly string[]).includes(claim.status)).length;
    return { label: monthName(date.getUTCMonth()), period: date.toISOString().slice(0, 7), count: matching.length, openCount };
  }) : [];
  const maxMonthly = Math.max(1, ...months.map((month) => month.count));
  const loadedScope = `${formatNumber(claims.length)} loaded of ${merchantClaimCount == null ? 'an unavailable total' : `${formatNumber(merchantClaimCount)} observed cases`}`;
  const coverageLabel = caseCoverage === 'complete' ? 'retained source coverage' : caseCoverage === 'partial' ? 'partial source coverage' : 'case history unavailable';
  const decisions = activityLog.slice(0, 3);
  const firstSeen = shortDate(profile.first_seen);
  const freshness = shortDate(profile.last_seen);

  return <>
    <SetBreadcrumbLabel label={displayName} detail={`${profile.id.slice(0, 9).toUpperCase()} · customer since ${firstSeen} · ${orderCount == null ? 'Order count unavailable' : `${formatNumber(orderCount)} observed orders`} · as of ${freshness}`} />
    <>
      <div style={{ height: 54, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderBottom: line }}>
        <span style={{ flex: 1, color: '#64686d', font: `400 12px/1.5 ${sans}` }}>Latest loaded cases · {loadedScope} · {coverageLabel}</span>
        <CustomerDecisionControls customerId={profile.id} canRequestEvidence={isEligibleForEvidence} initialStatus={profile.investigation_status} />
      </div>

      <div data-screen-label="Customer detail" data-visual-world="supplied-package" data-surface-id="customer-profile" data-archetype="P7" style={{ flex: 1, minHeight: 0, padding: '16px 22px 20px', display: 'flex', gap: 14, overflowY: 'auto' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section aria-label="Loaded cases over time" style={{ flex: 'none', borderRadius: 11, background: '#fff', boxShadow: cardShadow, padding: '13px 16px', display: 'flex', alignItems: 'flex-end', gap: 18 }}>
            <div style={{ width: 150, flex: 'none' }}><strong style={{ display: 'block', color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>LOADED CASES</strong><div style={{ color: '#1c1f23', font: `400 26px/1 ${mono}`, marginTop: 9 }}>{caseCoverage === 'unavailable' ? '—' : formatNumber(claims.length)}</div><span style={{ color: '#64686d', font: `400 11px/1.4 ${sans}` }}>{coverageLabel}</span></div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <div aria-hidden="true" style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 6 }}>{months.map((month) => <div key={month.period} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}><div title={`${month.period}: ${month.count} loaded cases; ${month.openCount} active`} style={{ width: '100%', height: Math.round((month.count / maxMonthly) * 62), minHeight: month.count ? 4 : 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 1.5 }}>{month.openCount > 0 ? <i style={{ width: '100%', height: `${month.openCount / month.count * 100}%`, borderRadius: '3px 3px 0 0', background: 'repeating-linear-gradient(135deg,#e0a97a 0 3px,#f0cdaa 3px 6px)' }} /> : null}{month.count > month.openCount ? <i style={{ width: '100%', flex: 1, borderRadius: month.openCount ? '0 0 2px 2px' : '3px 3px 2px 2px', background: '#e8802a' }} /> : null}</div><span style={{ color: month.count ? '#40454a' : '#a7abad', font: `400 9.5px/1 ${mono}` }}>{month.label}</span></div>)}</div>
              <span style={{ color: '#64686d', font: `400 10.5px/1.5 ${sans}` }}>{latestDate ? `Loaded cases by recorded month (UTC), six months ending ${latestDate.toISOString().slice(0, 7)}. Hatched cases are active. Counts do not measure payment or loss.` : 'No dated cases are available to plot.'}</span>
              <details style={{ color: '#64686d', font: `400 10.5px/1.5 ${sans}` }}><summary style={{ cursor: 'pointer' }}>View monthly counts</summary><table aria-label="Loaded case counts by recorded month"><thead><tr><th scope="col">Month (UTC)</th><th scope="col">Loaded cases</th><th scope="col">Active cases</th></tr></thead><tbody>{months.map((month) => <tr key={month.period}><th scope="row">{month.period}</th><td>{month.count}</td><td>{month.openCount}</td></tr>)}</tbody></table><p>{claims.length - datedCases.length} loaded cases have no valid recorded date. Older loaded cases outside these six months remain in the history below.</p></details>
            </div>
          </section>

          <section aria-label="Case history" style={{ flex: 1, minHeight: 260, borderRadius: 13, padding: 11, background: '#f4f3f1', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 4px 0' }}><strong style={{ flex: 1, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>CASE HISTORY</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>recorded cases; status does not establish payment</span><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#64686d" strokeWidth="1.2" strokeLinecap="round"><circle cx="6" cy="2.6" r=".9" /><circle cx="6" cy="6" r=".9" /><circle cx="6" cy="9.4" r=".9" /></svg></div>
            <div role="table" aria-label="Recorded customer cases" style={{ flex: 1, minHeight: 0, borderRadius: 10, background: '#fff', boxShadow: cardShadow, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div role="row" style={{ display: 'grid', gridTemplateColumns: '1fr 52px 88px 76px', gap: 10, padding: '9px 14px', borderBottom: line, background: '#ffffff' }}>{['ORDER', 'DATE', 'REASON', 'STATUS'].map((label) => <span role="columnheader" key={label} style={{ color: '#64686d', letterSpacing: '.06em', font: `400 9.5px/1 ${mono}` }}>{label}</span>)}</div>
              <div role="rowgroup" tabIndex={0} aria-label="Customer case rows" style={{ minHeight: 0, overflowY: 'auto' }}>{claims.length > 0 ? claims.map((claim) => {
                const transaction = transactionFor(claim.source_order_id, transactions);
                const state = outcome(claim.status);
                const items = (transaction?.line_items ?? []).filter((item) => item.title);
                const itemLabel = items.length ? `${items[0].title}${items.length > 1 ? ` +${items.length - 1}` : ''}` : 'Order detail unavailable';
                return <div role="row" key={claim.id} style={{ display: 'grid', gridTemplateColumns: '1fr 52px 88px 76px', gap: 10, padding: '11px 14px', alignItems: 'center' }}><div role="cell" style={{ minWidth: 0 }}><div style={{ overflowWrap: 'anywhere', color: '#1c1f23', font: `500 12.5px/1.3 ${sans}` }}><Link href={transaction ? `/orders/${transaction.source_order_id}` : `/cases/${claim.id}`} style={{ color: '#1c1f23', textDecoration: 'none' }}>{transaction?.order_id ?? 'Order unavailable'}</Link> · <Link href={`/cases/${claim.id}`} style={{ color: '#9b470d', font: `400 11.5px/1.3 ${mono}` }}>{claim.id.slice(0, 9).toUpperCase()}</Link></div><div style={{ overflowWrap: 'anywhere', color: '#64686d', font: `400 11px/1.4 ${sans}` }}>{itemLabel} · {money(claim.amount_at_risk, claim.currency ?? transaction?.currency)} · {transaction?.shipment?.status ? sentence(transaction.shipment.status) : 'delivery evidence unavailable'}</div></div><span role="cell" style={{ color: '#40454a', font: `400 11.5px/1 ${mono}` }}>{shortDate(claim.submitted_at ?? claim.updated_at ?? claim.created_at)}</span><span role="cell" style={{ overflowWrap: 'anywhere', color: '#40454a', font: `400 11.5px/1 ${sans}` }}>{sentence(claim.reason_normalized ?? claim.reason_raw ?? claim.claim_type)}</span><span role="cell" style={{ justifySelf: 'start', padding: '2px 7px', borderRadius: 5, background: state.bg, color: state.color, font: `500 10px/1.5 ${sans}` }}>{state.label}</span></div>;
              }) : <div role="row"><div role="cell" aria-colspan={4} style={{ padding: 24, color: '#64686d', textAlign: 'center', font: `400 11.5px/1.5 ${sans}` }}>{caseCoverage === 'unavailable' ? 'Case history is unavailable.' : 'No cases are recorded for this customer.'}</div></div>}</div>
              <div role="row" style={{ marginTop: 'auto', borderTop: line, background: '#ffffff' }}><div role="cell" aria-colspan={4} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 14px' }}><span style={{ flex: 1, color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>{loadedScope} · {coverageLabel}</span><Link href="/cases" style={{ color: '#9b470d', font: `400 11.5px/1.4 ${sans}` }}>Open workspace case registry</Link></div></div>
            </div>
          </section>
        </div>

        <aside aria-label="What we know" tabIndex={0} style={{ minHeight: 0, width: 322, flex: 'none', borderRadius: 13, padding: 11, background: '#f4f3f1', display: 'grid', gridAutoRows: 'max-content', alignContent: 'start', gap: 10, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '2px 4px 0' }}><strong style={{ flex: 1, color: '#64686d', letterSpacing: '.09em', font: `600 10.5px/1 ${sans}` }}>WHAT WE KNOW</strong><span style={{ color: '#64686d', font: `400 10px/1 ${mono}` }}>no score</span></div>
          <section style={{ borderRadius: 10, padding: '12px 13px', background: '#fff', boxShadow: cardShadow, display: 'flex', flexDirection: 'column', gap: 9 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>ACCOUNT</strong><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f2f0ed', boxShadow: 'inset 0 0 0 1px rgba(28,27,25,.06)', color: '#40454a', textAlign: 'center', font: `500 11px/34px ${mono}` }}>{initials(displayName)}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#1c1f23', font: `500 13px/1.3 ${sans}` }}>{displayName}</div><div style={{ overflowWrap: 'anywhere', color: '#64686d', font: `400 10.5px/1.4 ${mono}` }}>{profile.primary_email ?? 'email unavailable'}</div></div></div><div style={{ height: 1, background: '#eae8e5' }} />{[
            ['Orders', orderCount == null ? '—' : formatNumber(orderCount), '#1c1f23'],
            ['Recorded order value', money(totalOrderValue, displayCurrency), '#1c1f23'],
            ['Observed cases', merchantClaimCount == null ? '—' : formatNumber(claimCount), claimCount > 0 ? '#b0431a' : '#1c1f23'],
            ['Case-linked order value', money(lossValue, displayCurrency), lossValue ? '#b0431a' : '#1c1f23'],
          ].map(([label, value, color]) => <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}><span style={{ flex: 1, color: '#64686d', font: `400 11.5px/1.4 ${sans}` }}>{label}</span><span style={{ color, font: `400 11.5px/1.4 ${mono}` }}>{value}</span></div>)}</section>
          <section style={{ borderRadius: 10, padding: '12px 13px', background: '#fff', boxShadow: cardShadow, display: 'flex', flexDirection: 'column', gap: 9 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>PATTERN</strong><div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{[
            orderCount == null ? 'Recorded order count is unavailable.' : `${formatNumber(orderCount)} observed order${orderCount === 1 ? '' : 's'}; ${orderCoverage === 'complete' ? 'retained' : orderCoverage === 'partial' ? 'partial' : 'unavailable'} order source coverage. Cases do not establish refunds or an order refund rate.`,
            openClaimCount == null ? 'Active case count is unavailable.' : `${formatNumber(openClaimCount)} observed active case${openClaimCount === 1 ? '' : 's'}. Case status does not establish payment or loss.`,
            linkedAccounts.length ? `${formatNumber(linkedAccounts.length)} linked identifier pattern${linkedAccounts.length === 1 ? '' : 's'} observed; a person decides whether accounts belong together.` : 'No linked account pattern is currently disclosed.',
          ].map((copy, index) => <div key={copy} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}><i style={{ width: 5, height: 5, flex: 'none', marginTop: 5, borderRadius: '50%', background: ['#b0431a', '#c98a1a', '#64686d'][index] }} /><span style={{ color: '#40454a', font: `400 11.5px/1.5 ${sans}` }}>{copy}</span></div>)}</div></section>
          <section style={{ borderRadius: 10, padding: '12px 13px', background: '#fff', boxShadow: cardShadow, display: 'flex', flexDirection: 'column', gap: 9 }}><strong style={{ color: '#64686d', letterSpacing: '.09em', font: `600 9.5px/1 ${sans}` }}>DECISIONS ON RECORD</strong><div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>{decisions.length ? decisions.map((decision, index) => <div key={decision.id} style={{ borderTop: index ? line : undefined, paddingTop: index ? 9 : 0 }}><div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ flex: 1, color: '#1c1f23', font: `500 11.5px/1.4 ${sans}` }}>{sentence(decision.event_type)}</span><span style={{ padding: '2px 7px', borderRadius: 5, background: index === 2 ? '#fff3e9' : '#f4f3f1', color: index === 2 ? '#7a5310' : '#40454a', font: `500 10px/1.5 ${sans}` }}>{shortDate(decision.created_at).toUpperCase()}</span></div><div style={{ marginTop: 3, color: '#64686d', font: `400 11px/1.5 ${sans}` }}>{typeof decision.event_data.note === 'string' ? decision.event_data.note : 'Recorded in the append-only customer activity history.'}</div></div>) : <span style={{ color: '#64686d', font: `400 11px/1.5 ${sans}` }}>No customer-level decisions are recorded.</span>}</div></section>
          {!props.viewToken ? <section aria-label="Merchant notes" style={{ flex: 'none', borderRadius: 10, background: '#fff', boxShadow: cardShadow }}><CustomerNotes key={profile.id} customerProfileId={profile.id} canAdd={props.notePermissions?.add ?? false} canDelete={props.notePermissions?.delete ?? false} /></section> : null}
        </aside>
      </div>
    </>
  </>;
}
