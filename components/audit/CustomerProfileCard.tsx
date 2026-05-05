// TODO (App Cohesion Audit – Phase 2): This component is one of THREE separate
// customer profile renderers in the app:
//   1. CustomerProfileCard (this file) — used only on /audit/[runId]/customers
//   2. CustomerIntelligenceDrawer — slide-out panel used everywhere else
//   3. app/(app)/customers/[id]/page.tsx — full standalone page
//
// Phase 1 DONE: All local risk helpers and format functions have been replaced
// with canonical imports from @/lib/utils/riskStyles and @/lib/utils/format.
// Planned next: replace all three with a shared <CustomerProfilePanel> component.
// See reports/ui-ux-audit/APP_COHESION_AUDIT.md — Issue D1.
'use client';

import { useState } from 'react';
import type { CustomerProfile } from '@/lib/analysis/customerIntelligence';
import WatchlistStarButton from './WatchlistStarButton';
import CustomerNotes from './CustomerNotes';
import { riskBadgeStyle, riskBarStyle, severityStyle } from '@/lib/utils/riskStyles';
import { formatCurrencyNullable, formatDateShort } from '@/lib/utils/format';

export default function CustomerProfileCard({ profile }: { profile: CustomerProfile }) {
  const [expanded, setExpanded] = useState(false);

  const primaryEmail = profile.emails[0] ?? 'Unknown';
  const extraEmails = profile.emails.length - 1;

  return (
    <div className="rounded-xl overflow-hidden transition-shadow" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      {/* Colour bar */}
      <div className="h-1" style={riskBarStyle(profile.highestRisk)} />

      {/* Header — always visible */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
        className="w-full text-left px-5 py-4 focus:outline-none cursor-pointer"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase"
                style={riskBadgeStyle(profile.highestRisk)}
              >
                {profile.highestRisk}
              </span>
              <WatchlistStarButton
                displayEmail={primaryEmail}
                lastSeenRisk={profile.highestRisk}
              />
              {profile.emails.length > 1 && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{ background: 'var(--watchlist-bg)', color: 'var(--watchlist)', border: '1px solid var(--watchlist-bd)' }}
                >
                  Linked accounts
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{primaryEmail}</h3>
            {extraEmails > 0 && (
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--watchlist)' }}>
                + {extraEmails} linked account{extraEmails > 1 ? 's' : ''}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span><strong style={{ color: 'var(--text)' }}>{profile.orderCount}</strong> order{profile.orderCount !== 1 ? 's' : ''}</span>
              <span><strong style={{ color: 'var(--text)' }}>{formatCurrencyNullable(profile.totalSpend)}</strong> spent</span>
              {profile.refundCount > 0 && (
                <span style={profile.refundRate > 0.5 ? { color: 'var(--risk-critical)', fontWeight: 600 } : {}}>
                  <strong>{profile.refundCount}</strong> refund{profile.refundCount !== 1 ? 's' : ''} ({Math.round(profile.refundRate * 100)}%)
                </span>
              )}
            </div>

            {/* Inline flag pills */}
            {profile.flags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {profile.flags.map((f, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                    style={severityStyle(f.severity)}
                  >
                    {f.title}
                  </span>
                ))}
              </div>
            )}

            {/* Data coverage indicator */}
            <DataCoverageRow profile={profile} />
          </div>

          {/* Expand chevron */}
          <svg
            className={`w-5 h-5 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--icon-muted)' }}
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>

          {profile.id && <CustomerNotes customerProfileId={profile.id} />}

          {/* Identity details */}
          <div className="pt-4">
            <h4 className="text-overline mb-3">Identity details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <IdentityField label="Email addresses" values={profile.emails} />
              <IdentityField label="Names used" values={profile.names} highlight={profile.names.length > 1} />
              <IdentityField label="Delivery addresses" values={profile.addresses} highlight={profile.addresses.length > 1} />
              <IdentityField
                label="Devices used"
                values={profile.ips}
                hint="Different networks this customer ordered from."
              />
              {profile.cards.length > 0 && (
                <IdentityField
                  label="Cards used"
                  values={profile.cards.map((c) => `****${c}`)}
                  hint="Same card across multiple accounts is a strong link."
                />
              )}
              <IdentityField label="Payment methods" values={profile.paymentMethods} />
            </div>
          </div>

          {/* Why we linked these (only if multi-email) */}
          {profile.links.length > 0 && profile.emails.length > 1 && (
            <div>
              <h4 className="text-overline mb-2">Why we linked these accounts</h4>
              <div className="space-y-2">
                {profile.links.map((link, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm rounded-lg px-3 py-2" style={{ background: 'var(--watchlist-bg)', borderColor: 'var(--watchlist-bd)', color: 'var(--text)', border: '1px solid var(--watchlist-bd)' }}>
                    <LinkIcon type={link.type} />
                    <span>{link.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Identity changes / flags */}
          {profile.flags.length > 0 && (
            <div>
              <h4 className="text-overline mb-2">Suspicious activity</h4>
              <div className="space-y-2">
                {profile.flags.map((flag, i) => (
                  <div key={i} className="rounded-lg border px-3 py-2" style={severityStyle(flag.severity)}>
                    <p className="text-sm font-medium">{flag.title}</p>
                    <p className="text-xs mt-0.5">{flag.description}</p>
                    {flag.evidence.length > 0 && flag.evidence.length <= 6 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {flag.evidence.map((e, j) => (
                          <li key={j} className="text-xs">• {e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order history */}
          <div>
            <h4 className="text-overline mb-2">
              Order history ({profile.orders.length})
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left" style={{ background: 'var(--bg-subtle)' }}>
                    <th className="px-3 py-2 text-overline">Date</th>
                    <th className="px-3 py-2 text-overline">Order ID</th>
                    <th className="px-3 py-2 text-overline text-right">Amount</th>
                    <th className="px-3 py-2 text-overline">Refund</th>
                    <th className="px-3 py-2 text-overline">Score</th>
                    {profile.emails.length > 1 && (
                      <th className="px-3 py-2 text-overline">Account</th>
                    )}
                    {profile.names.length > 1 && (
                      <th className="px-3 py-2 text-overline">Name</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {profile.orders.map((order) => (
                    <tr key={order.orderId} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{formatDateShort(order.date)}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: 'var(--text)' }}>{order.orderId}</td>
                      <td className="px-3 py-2 text-right" style={{ color: 'var(--text)' }}>{formatCurrencyNullable(order.amount)}</td>
                      <td className="px-3 py-2">
                        {order.refunded ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" style={riskBadgeStyle('critical')}>
                            {order.refundReason ?? 'Refunded'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)' }}>—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium" style={riskBadgeStyle(order.riskLevel)}>
                          {Math.round(order.fraudScore)}
                        </span>
                      </td>
                      {profile.emails.length > 1 && (
                        <td className="px-3 py-2 truncate max-w-[160px]" style={{ color: 'var(--text-muted)' }}>{order.email}</td>
                      )}
                      {profile.names.length > 1 && (
                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{order.name}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * DataCoverageRow — 5-dot indicator showing which identity field categories
 * were seen across this customer's orders. A persistent, gentle reminder that
 * improves as merchants enrich their exports.
 */
function DataCoverageRow({ profile }: { profile: import('@/lib/analysis/customerIntelligence').CustomerProfile }) {
  const fields: Array<{ label: string; present: boolean; missingTip: string }> = [
    { label: 'email',    present: profile.emails.length > 0,          missingTip: 'Email not found' },
    { label: 'address',  present: profile.addresses.length > 0,       missingTip: 'Address not in export' },
    { label: 'IP',       present: profile.ips.length > 0,             missingTip: 'IP address not in export. Learn how to add it.' },
    { label: 'card',     present: profile.cards.length > 0,           missingTip: 'Card data not in export. Learn how to add it.' },
    { label: 'payment',  present: profile.paymentMethods.length > 0,  missingTip: 'Payment method not in export' },
  ];

  const anyMissing = fields.some((f) => !f.present);
  if (!anyMissing) return null; // only show when something is absent

  return (
    <div className="flex items-center gap-2 mt-2.5">
      <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>Data:</span>
      {fields.map(({ label, present, missingTip }) => (
        <span
          key={label}
          title={present ? `${label} present` : missingTip}
          className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
          style={{ color: present ? 'var(--text-muted)' : 'var(--text-subtle)' }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: present ? 'var(--icon-muted)' : 'var(--bg-subtle)' }}
          />
          {label}
        </span>
      ))}
      {anyMissing && (
        <a
          href="/help/csv-export"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs hover:underline ml-1"
          style={{ color: 'var(--text-subtle)' }}
          title="Learn how to add missing fields"
        >
          + add fields
        </a>
      )}
    </div>
  );
}

function IdentityField({ label, values, highlight, hint }: { label: string; values: string[]; highlight?: boolean; hint?: string }) {
  if (values.length === 0) return null;
  return (
    <div>
      <dt className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
        {hint && <span className="block text-xs font-normal" style={{ color: 'var(--text-subtle)' }}>{hint}</span>}
      </dt>
      <dd className="text-sm" style={{ color: highlight ? 'var(--risk-high)' : 'var(--text)', fontWeight: highlight ? 600 : undefined }}>
        {values.length <= 3 ? (
          values.map((v, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1" style={{ color: 'var(--border)' }}>·</span>}
              {v}
            </span>
          ))
        ) : (
          <>
            {values[0]}
            <span className="ml-1" style={{ color: 'var(--text-subtle)' }}>+ {values.length - 1} more</span>
          </>
        )}
      </dd>
    </div>
  );
}

function LinkIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4 flex-shrink-0 mt-0.5';
  const style = { color: 'var(--watchlist)' };
  if (type === 'shared_card') {
    return (
      <svg className={cls} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    );
  }
  if (type === 'shared_address') {
    return (
      <svg className={cls} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    );
  }
  return (
    <svg className={cls} style={style} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  );
}
