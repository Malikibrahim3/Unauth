// app/(app)/chargebacks/[id]/page.tsx
// Evidence package detail page.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TABLES } from '@/lib/supabase/tables'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { EvidenceStrengthMeter } from '@/components/evidence/EvidenceStrengthMeter'
import { DisputeReadinessPanel } from '@/components/evidence/DisputeReadinessPanel'
import { EvidencePackagePreview } from '@/components/evidence/EvidencePackagePreview'
import { requirePermission, hasPermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions'
import { SensitiveField } from '@/components/ui/SensitiveField'
import { SectionCard, Badge } from '@/components/ui'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EvidenceDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const serviceClient = createServiceClient()
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CHARGEBACKS)
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id))

  const { data: pkg } = await serviceClient
    .from(TABLES.EVIDENCE_PACKAGES)
    .select('*')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .single() as unknown as {
      data: {
        id: string
        reference_number: string
        customer_profile_id: string | null
        generated_for_order_id: string | null
        generated_at: string
        ce3_eligible: boolean
        ce3_qualifying_signals: string[] | null
        ce3_prior_transactions: Array<{ orderId: string; orderDate: string; daysPriorToDispute: number }> | null
        cross_merchant_indicator: boolean
        narrative_summary: string | null
        merchant_notes: string | null
        pdf_storage_path: string | null
        signal_snapshot: Array<{ identifierType: string; maskedValue: string; ce3Accepted: boolean }> | null
      } | null
    }

  if (!pkg) notFound()

  const canRevealCustomer = await hasPermission(serviceClient, user.id, PERMISSIONS.VIEW_CUSTOMERS)

  let maskedEmail = '****'
  let fullEmail: string | null = null
  if (pkg.customer_profile_id) {
    const { data: profile } = await serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('primary_email, emails, risk_level')
      .eq('id', pkg.customer_profile_id)
      .single() as unknown as { data: { primary_email: string | null; emails: string[]; risk_level: string } | null }
    const email = profile?.primary_email ?? profile?.emails?.[0] ?? ''
    fullEmail = email || null
    if (email) maskedEmail = `${email[0]}****@${email.split('@')[1] ?? '***'}`
  }

  const matchSignals = pkg.ce3_qualifying_signals ?? []
  const matchedPriors = pkg.ce3_prior_transactions ?? []

  const signalCount = pkg.signal_snapshot?.length ?? 0
  const identityMatchLevel: 'Strong' | 'Partial' | 'None' =
    pkg.ce3_eligible && signalCount >= 3 && matchedPriors.length >= 2
      ? 'Strong'
      : pkg.ce3_eligible || matchedPriors.length > 0 || signalCount >= 2
        ? 'Partial'
        : 'None'

  const evidenceStrength: 'weak' | 'moderate' | 'strong' =
    identityMatchLevel === 'Strong'
      ? 'strong'
      : identityMatchLevel === 'Partial'
        ? 'moderate'
        : 'weak'

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
        <Link
          href="/chargebacks"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:opacity-80"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Back to Evidence Packages
        </Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm" style={{ color: 'var(--text)' }}>{pkg.reference_number}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
              Evidence package
            </h1>
            {pkg.ce3_eligible
              ? <Badge tone="success" size="sm">Dispute-ready</Badge>
              : <Badge tone="warning" size="sm">In progress</Badge>}
            {pkg.cross_merchant_indicator ? <Badge tone="info" size="sm">Network</Badge> : null}
          </div>
          <p className="text-body-sm font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {pkg.reference_number}
            {pkg.generated_for_order_id ? ` · Order ${pkg.generated_for_order_id.slice(0, 20)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pkg.pdf_storage_path && (
            <a
              href={`/api/evidence/${pkg.id}/pdf`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
              download
            >
              Download PDF ⤓
            </a>
          )}
        </div>
      </div>

      <SectionCard
        title="Package provenance"
        description="How this evidence package was compiled and where it can be reviewed."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Generated</p>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>
              {formatDate(pkg.generated_at)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Data sources</p>
            <p className="text-sm font-medium mt-1" style={{ color: 'var(--text)' }}>
              {signalCount} identity signal{signalCount === 1 ? '' : 's'}
              {identityMatchLevel !== 'None' ? ` · Prior identity match: ${identityMatchLevel}` : ''}
            </p>
          </div>
          {pkg.customer_profile_id ? (
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Customer record</p>
              <Link
                href={`/customers/${pkg.customer_profile_id}`}
                className="text-sm font-semibold mt-1 inline-block hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                View customer profile →
              </Link>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Retention</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Stored in your merchant-scoped evidence archive with masked identifiers for export.
            </p>
          </div>
        </div>
        {fullEmail ? (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <SensitiveField
              label="Customer email"
              masked={maskedEmail}
              full={fullEmail}
              canReveal={canRevealCustomer}
            />
          </div>
        ) : null}
      </SectionCard>

      {identityMatchLevel === 'Strong' && (
        <div
          className="rounded-lg p-4"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
            Strong prior identity match
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Prior orders in your records share multiple identity signals with the disputed transaction.
          </p>
        </div>
      )}

      {/* ── PHASE C: EVIDENCE AMPLIFICATION ─────────────────────────── */}
      {/* Evidence Strength Meter */}
      <EvidenceStrengthMeter
        strength={evidenceStrength}
        label="Overall evidence strength"
      />

      {/* Dispute Readiness Checklist */}
      <DisputeReadinessPanel pkg={pkg} />

      {/* PDF Preview (only when a PDF has been generated) */}
      {pkg.pdf_storage_path && (
        <EvidencePackagePreview
          packageId={pkg.id}
          referenceNumber={pkg.reference_number}
        />
      )}
      {/* ── END PHASE C ──────────────────────────────────────────────── */}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card label="Reference" value={pkg.reference_number} mono />
        <Card
          label="Identity match"
          value={identityMatchLevel}
        />
        <Card
          label="Cross-merchant indicator"
          value={pkg.cross_merchant_indicator ? 'Yes' : 'Not available'}
        />
        <Card
          label="Order in dispute"
          value={pkg.generated_for_order_id?.slice(0, 20) ?? '—'}
          mono
        />
      </div>

      {identityMatchLevel !== 'None' && (matchSignals.length > 0 || matchedPriors.length > 0) && (
        <section
          className="rounded-xl p-5 border"
          style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--risk-low-bd)' }}
        >
          <h2 className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>Prior match detail</h2>
          {matchSignals.length > 0 && (
            <p className="text-body-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold">Matching signals:</span>{' '}
              {matchSignals.join(', ')}
            </p>
          )}
          {matchedPriors.length > 0 && (
            <div className="space-y-1">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Matched prior orders:
              </p>
              {matchedPriors.map((p, i) => (
                <p key={i} className="text-body-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {p.orderId} — {formatDate(p.orderDate)} ({p.daysPriorToDispute} days prior)
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Narrative */}
      {pkg.narrative_summary && (
        <section
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-overline mb-3">Summary Narrative</h2>
          <p
            className="text-body-sm leading-relaxed whitespace-pre-line"
            style={{ color: 'var(--text)' }}
          >
            {pkg.narrative_summary}
          </p>
        </section>
      )}

      {/* Identity signals snapshot */}
      {pkg.signal_snapshot && pkg.signal_snapshot.length > 0 && (
        <section
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-overline mb-3">Identity Evidence</h2>
          <div className="space-y-2">
            {pkg.signal_snapshot.map((ev, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: 'var(--bg-subtle)' }}
              >
                <div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                    {ev.identifierType}
                  </span>
                  <span className="ml-2 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {ev.maskedValue}
                  </span>
                </div>
                {ev.ce3Accepted && (
                  <span
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                    title="Core identity signal used for prior-order matching"
                  >
                    Core
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Merchant notes */}
      {pkg.merchant_notes && (
        <section
          className="rounded-xl p-5 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-overline mb-3">Merchant Notes</h2>
          <p className="text-body-sm whitespace-pre-line" style={{ color: 'var(--text)' }}>
            {pkg.merchant_notes}
          </p>
        </section>
      )}

      <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
        This report presents cross-merchant identity match data. Merchants may use this information to support chargeback dispute processes at their discretion.
      </p>
    </div>
  )
}

function Card({
  label,
  value,
  mono = false,
  valueColor,
}: {
  label: string
  value: string
  mono?: boolean
  valueColor?: string
}) {
  return (
    <div
      className="rounded-lg px-4 py-3 border"
      style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
    >
      <div className="text-caption mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div
        className={`text-body-sm font-semibold truncate ${mono ? 'font-mono' : ''}`}
        style={{ color: valueColor ?? 'var(--text)' }}
      >
        {value}
      </div>
    </div>
  )
}
