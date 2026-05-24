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
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions'

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

  let maskedEmail = '****'
  if (pkg.customer_profile_id) {
    const { data: profile } = await serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
      .select('primary_email, emails, risk_level')
      .eq('id', pkg.customer_profile_id)
      .single() as unknown as { data: { primary_email: string | null; emails: string[]; risk_level: string } | null }
    const email = profile?.primary_email ?? profile?.emails?.[0] ?? ''
    if (email) maskedEmail = `${email[0]}****@${email.split('@')[1] ?? '***'}`
  }

  const ce3Signals = pkg.ce3_qualifying_signals ?? []
  const ce3Priors = pkg.ce3_prior_transactions ?? []

  // Derive evidence strength from available signals
  const signalCount = pkg.signal_snapshot?.length ?? 0
  const evidenceStrength: 'weak' | 'moderate' | 'strong' =
    pkg.ce3_eligible && signalCount >= 3 && ce3Priors.length >= 2
      ? 'strong'
      : signalCount >= 2 || pkg.narrative_summary
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
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Evidence Package
          </h1>
          <p className="text-body-sm font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {pkg.reference_number}
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

      {/* CE3 signals banner */}
      {pkg.ce3_eligible && (
        <div
          className="rounded-lg p-4"
          style={{
            background: 'var(--bg-inset)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
            CE3.0 Signals
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            This record contains prior transactions with matching identity signals that may be relevant to a CE 3.0 dispute response. Consult your acquirer or payment processor to determine eligibility before submission.
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card label="Reference" value={pkg.reference_number} mono />
        <Card label="Customer" value={maskedEmail} />
        <Card label="Generated" value={formatDate(pkg.generated_at)} />
        <Card
          label="CE3.0 Signals"
          value={pkg.ce3_eligible ? 'Detected' : 'Not detected'}
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

      {/* CE3 detail */}
      {pkg.ce3_eligible && (ce3Signals.length > 0 || ce3Priors.length > 0) && (
        <section
          className="rounded-xl p-5 border"
          style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--risk-low-bd)' }}
        >
          <h2 className="text-overline mb-3" style={{ color: 'var(--text-muted)' }}>CE3.0 Signal Detail</h2>
          {ce3Signals.length > 0 && (
            <p className="text-body-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold">Matching signals:</span>{' '}
              {ce3Signals.join(', ')}
            </p>
          )}
          {ce3Priors.length > 0 && (
            <div className="space-y-1">
              <p className="text-body-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Prior matching transactions:
              </p>
              {ce3Priors.map((p, i) => (
                <p key={i} className="text-body-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {p.orderId} — {formatDate(p.orderDate)} ({p.daysPriorToDispute} days prior)
                </p>
              ))}
            </div>
          )}
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Consult your acquirer or payment processor to determine whether this signal data meets CE 3.0 submission requirements. Visa's rules on qualifying evidence can change.
          </p>
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
                    title="This signal type matches CE 3.0 criteria. Consult your acquirer to confirm eligibility."
                  >
                    CE3.0
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
        This signal data may be relevant when preparing a dispute response. Your acquirer or payment processor can advise on submission requirements and whether this data meets CE 3.0 criteria.
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
