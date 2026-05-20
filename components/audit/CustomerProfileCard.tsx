// TODO (App Cohesion Audit – Phase 2): This component is one of THREE separate
// customer profile renderers in the app:
//   1. CustomerProfileCard (this file) — used only on /audit/[runId]/customers
//   2. CustomerIntelligenceDrawer — slide-out panel used everywhere else
//   3. app/(app)/customers/[id]/page.tsx — full standalone page
//
// Planned next: replace all three with a shared <CustomerProfilePanel> component.
// See reports/ui-ux-audit/APP_COHESION_AUDIT.md — Issue D1.
'use client';

import { useState } from 'react';
import type { CustomerProfile } from '@/lib/analysis/customerIntelligence';
import WatchlistStarButton from './WatchlistStarButton';
import CustomerNotes from './CustomerNotes';
import { labelFor } from '@/lib/copy/labels';
import { riskBarStyle, severityStyle } from '@/lib/utils/riskStyles';
import { formatCurrencyNullable, formatDateShort } from '@/lib/utils/format';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

function tierChipStyle(risk: string): React.CSSProperties {
  switch (risk) {
    case 'critical':
      return { background: 'var(--brand-ink)', color: 'var(--text-inverse)', border: '1px solid var(--brand-ink)' };
    case 'high':
      return { background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-fg)', border: '1px solid var(--risk-critical-bd)' };
    case 'medium':
      return { background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' };
    default:
      return { background: 'var(--bg-surface-alt)', color: 'var(--text-subtle)', border: '1px solid var(--border-default)' };
  }
}

function tierLabel(risk: string): string {
  switch (risk) {
    case 'critical': return 'DEFINITE';
    case 'high':     return 'PROBABLE';
    case 'medium':   return 'CANDIDATE';
    default:         return 'INCONCLUSIVE';
  }
}

function riskChipStyle(risk: string): React.CSSProperties {
  switch (risk) {
    case 'critical':
    case 'high':
      return { background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-fg)', border: '1px solid var(--risk-critical-bd)' };
    case 'medium':
      return { background: 'var(--risk-medium-bg)', color: 'var(--risk-medium-fg)', border: '1px solid var(--risk-medium-bd)' };
    default:
      return { background: 'var(--bg-surface-alt)', color: 'var(--text-subtle)', border: '1px solid var(--border-default)' };
  }
}

const CHIP_BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 18,
  paddingLeft: 7,
  paddingRight: 7,
  borderRadius: 3,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  lineHeight: 1,
  whiteSpace: 'nowrap',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CustomerProfileCard({ profile }: { profile: CustomerProfile }) {
  const [expanded, setExpanded] = useState(false);

  const primaryEmail = profile.emails[0] ?? 'Unknown';
  const extraEmails = profile.emails.length - 1;

  // Generate a stable case file ID from the primary email
  const caseId = `UN-${primaryEmail.split('@')[0].slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${profile.orderCount}`;

  // Network footprint: compute bar widths from orderCount
  const maxOrders = Math.max(profile.orderCount, 1);
  const refundPct = Math.round(profile.refundRate * 100);

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {/* ── Case file header bar ─────────────────────────────── */}
      <div
        style={{
          background: 'var(--bg-canvas)',
          borderBottom: '1px solid var(--border-default)',
          padding: '9px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Case indicator dot */}
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: profile.highestRisk === 'critical' || profile.highestRisk === 'high' ? 'var(--accent)' : 'var(--text-subtle)',
              flexShrink: 0,
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            CASE FILE · {caseId}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Status chips */}
          <span style={{ ...CHIP_BASE, ...tierChipStyle(profile.highestRisk) }}>
            {tierLabel(profile.highestRisk)}
          </span>
          {profile.orderCount > 0 && (
            <span style={{ ...CHIP_BASE, ...riskChipStyle(profile.highestRisk) }}>
              RISK {(Math.min(profile.orderCount * 12, 99) / 100).toFixed(2)}
            </span>
          )}
          <span style={{ ...CHIP_BASE, background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
            CONF {(0.85 + Math.min(profile.emails.length * 0.03, 0.14)).toFixed(2)}
          </span>
          <WatchlistStarButton
            displayEmail={primaryEmail}
            lastSeenRisk={profile.highestRisk}
          />
        </div>
      </div>

      {/* ── Subject row ──────────────────────────────────────── */}
      <div
        style={{
          padding: '10px 14px 8px',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 4,
            lineHeight: 1,
          }}
        >
          Subject
        </div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
              }}
              className="truncate"
            >
              {primaryEmail}
            </div>
            {extraEmails > 0 && (
              <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2, fontWeight: 500 }}>
                + {extraEmails} linked account{extraEmails > 1 ? 's' : ''}
              </div>
            )}
          </div>
          {profile.flags.length > 0 && (
            <div className="flex flex-wrap gap-1 flex-shrink-0">
              {profile.flags.slice(0, 2).map((f, i) => (
                <span
                  key={i}
                  style={{ ...CHIP_BASE, ...severityStyle(f.severity), border: undefined, borderRadius: 3, height: 18, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}
                >
                  {f.title}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4-col stats grid ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {[
          { label: 'EMAILS',    value: profile.emails.length },
          { label: 'ADDRESSES', value: profile.addresses.length },
          { label: 'PAYMENT',   value: profile.paymentMethods.length || profile.cards.length },
          { label: 'DEVICES',   value: profile.ips.length },
        ].map(({ label, value }, i) => (
          <div
            key={label}
            style={{
              padding: '8px 14px',
              borderRight: i < 3 ? '1px solid var(--border-default)' : undefined,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: value > 1 ? 'var(--accent)' : 'var(--text)',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1,
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Expand toggle ────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: '100%',
          padding: '7px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderBottom: expanded ? '1px solid var(--border-default)' : undefined,
        }}
        className="hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          {expanded ? 'Hide detail' : 'View detail'}
        </span>
        <svg
          style={{
            width: 12,
            height: 12,
            color: 'var(--icon-muted)',
            transform: expanded ? 'rotate(180deg)' : undefined,
            transition: 'transform 200ms',
          }}
          fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* ── Expanded detail ──────────────────────────────────── */}
      {expanded && (
        <div>
          {/* Network footprint — order history bars */}
          <div style={{ borderBottom: '1px solid var(--border-default)' }}>
            <div
              style={{
                padding: '8px 14px 6px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                lineHeight: 1,
              }}
            >
              <span aria-hidden="true" className="ua-section-dot" />
              Network footprint — {profile.orders.length} orders
            </div>

            {/* Footprint bars */}
            <div style={{ padding: '0 14px 10px' }}>
              {[
                { label: 'Total spend',  value: formatCurrencyNullable(profile.totalSpend) ?? '—',  pct: 80 },
                { label: 'Refund rate',  value: `${refundPct}%`, pct: refundPct, warn: refundPct > 30 },
                { label: 'Order count',  value: String(profile.orderCount), pct: Math.min(profile.orderCount * 8, 100) },
              ].map(({ label, value, pct, warn }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <div style={{ width: 90, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {label}
                  </div>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: warn ? 'var(--accent)' : 'var(--brand-ink)',
                        borderRadius: 2,
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 64,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      color: warn ? 'var(--accent)' : 'var(--text)',
                      textAlign: 'right',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {profile.id && (
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)' }}>
              <CustomerNotes customerProfileId={profile.id} />
            </div>
          )}

          {/* Identity details */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 8,
                lineHeight: 1,
              }}
            >
              <span aria-hidden="true" className="ua-section-dot" />
              Identity details
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <IdentityField label="Email addresses" values={profile.emails} />
              <IdentityField label="Names used" values={profile.names} highlight={profile.names.length > 1} />
              <IdentityField label="Delivery addresses" values={profile.addresses} highlight={profile.addresses.length > 1} />
              <IdentityField label="Devices / IPs" values={profile.ips} />
              {profile.cards.length > 0 && (
                <IdentityField label="Cards used" values={profile.cards.map((c) => `····${c}`)} hint="Same card across accounts = strong link" />
              )}
              <IdentityField label="Payment methods" values={profile.paymentMethods} />
            </div>
          </div>

          {/* Link evidence */}
          {profile.links.length > 0 && profile.emails.length > 1 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                  lineHeight: 1,
                }}
              >
                <span aria-hidden="true" className="ua-section-dot" />
                Why this customer was matched
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.links.map((link, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      padding: '6px 10px',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-default)',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                    }}
                  >
                    <span style={{ color: 'var(--accent)', flexShrink: 0 }}>·</span>
                    {link.description}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {profile.flags.length > 0 && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 6,
                  lineHeight: 1,
                }}
              >
                <span aria-hidden="true" className="ua-section-dot" />
                Matched datapoints
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {profile.flags.map((flag, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '7px 10px',
                      border: '1px solid var(--border-default)',
                      borderRadius: 3,
                      background: 'var(--risk-critical-bg)',
                      borderColor: 'var(--risk-critical-bd)',
                    }}
                  >
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--risk-critical-fg)' }}>{flag.title}</p>
                    <p style={{ fontSize: 11, marginTop: 2, color: 'var(--risk-critical-fg)' }}>{flag.description}</p>
                    {flag.evidence.length > 0 && flag.evidence.length <= 6 && (
                      <ul style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {flag.evidence.map((e, j) => (
                          <li key={j} style={{ fontSize: 11, color: 'var(--risk-critical-fg)' }}>· {e}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order history table */}
          <div style={{ padding: '10px 14px 14px' }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 8,
                lineHeight: 1,
              }}
            >
              <span aria-hidden="true" className="ua-section-dot" />
              Order history ({profile.orders.length})
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--bg-canvas)',
                      borderBottom: '1px solid var(--border-default)',
                    }}
                  >
                    {['Date', 'Order ID', 'Amount', 'Refund', 'Score',
                      ...(profile.emails.length > 1 ? ['Account'] : []),
                      ...(profile.names.length > 1 ? ['Name'] : []),
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '6px 10px',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                          textAlign: h === 'Amount' ? 'right' : 'left',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {profile.orders.map((order) => (
                    <tr
                      key={order.orderId}
                      style={{ borderBottom: '1px solid var(--border-default)' }}
                    >
                      <td style={{ padding: '7px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 11 }}>
                        {formatDateShort(order.date)}
                      </td>
                      <td style={{ padding: '7px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 11 }}>
                        {order.orderId}
                      </td>
                      <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 11 }}>
                        {formatCurrencyNullable(order.amount)}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        {order.refunded ? (
                          <span style={{ ...CHIP_BASE, background: 'var(--risk-critical-bg)', color: 'var(--risk-critical-fg)', border: '1px solid var(--risk-critical-bd)' }}>
                            {order.refundReason ?? 'Refunded'}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '7px 10px' }}>
                        <span style={{ ...CHIP_BASE, ...riskChipStyle(order.riskLevel) }}>
                          {(Math.round(order.fraudScore) / 100).toFixed(2)}
                        </span>
                      </td>
                      {profile.emails.length > 1 && (
                        <td style={{ padding: '7px 10px', color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {order.email}
                        </td>
                      )}
                      {profile.names.length > 1 && (
                        <td style={{ padding: '7px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
                          {order.name}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data coverage */}
          <DataCoverageRow profile={profile} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DataCoverageRow({ profile }: { profile: import('@/lib/analysis/customerIntelligence').CustomerProfile }) {
  const fields: Array<{ label: string; present: boolean; missingTip: string }> = [
    { label: labelFor('email'),   present: profile.emails.length > 0,          missingTip: 'Email not found' },
    { label: labelFor('address'), present: profile.addresses.length > 0,       missingTip: 'Address not in export' },
    { label: labelFor('ip'),      present: profile.ips.length > 0,             missingTip: 'IP address not in export' },
    { label: labelFor('card'),    present: profile.cards.length > 0,           missingTip: 'Card data not in export' },
    { label: labelFor('payment'), present: profile.paymentMethods.length > 0,  missingTip: 'Payment method not in export' },
  ];

  const anyMissing = fields.some((f) => !f.present);
  if (!anyMissing) return null;

  return (
    <div
      style={{
        borderTop: '1px solid var(--border-default)',
        padding: '7px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        DATA
      </span>
      {fields.map(({ label, present, missingTip }) => (
        <span
          key={label}
          title={present ? `${label} present` : missingTip}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: present ? 'var(--text-muted)' : 'var(--text-subtle)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: present ? 'var(--brand-ink)' : 'var(--bg-surface-alt)',
              opacity: present ? 0.5 : 1,
              border: present ? undefined : '1px solid var(--border-default)',
            }}
          />
          {label}
        </span>
      ))}
      {anyMissing && (
        <a
          href="/help/csv-export"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--text-subtle)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          className="hover:text-[var(--text-muted)] ml-1"
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
      <dt style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
        {label}
        {hint && <span style={{ display: 'block', fontSize: 10, fontWeight: 400, letterSpacing: 0, textTransform: 'none', color: 'var(--text-subtle)' }}>{hint}</span>}
      </dt>
      <dd style={{ fontSize: 12, color: highlight ? 'var(--accent)' : 'var(--text)', fontWeight: highlight ? 600 : 400, fontFamily: 'var(--font-mono)' }}>
        {values.length <= 3 ? (
          values.map((v, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 4px', color: 'var(--border-default)' }}>·</span>}
              {v}
            </span>
          ))
        ) : (
          <>
            {values[0]}
            <span style={{ marginLeft: 6, color: 'var(--text-subtle)' }}>+{values.length - 1} more</span>
          </>
        )}
      </dd>
    </div>
  );
}
