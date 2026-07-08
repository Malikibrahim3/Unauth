import { ce3DetailStatusLabel } from '@/lib/evidence/ce3PackageLabels'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { EvidenceStrengthMeter } from '@/components/evidence/EvidenceStrengthMeter'
import { DisputeReadinessPanel } from '@/components/evidence/DisputeReadinessPanel'
import { EvidencePackagePreview } from '@/components/evidence/EvidencePackagePreview'
import { SensitiveField } from '@/components/ui/SensitiveField'
import { PanelCard, StatusBadge } from '@/components/ui'
import { NetworkFootprint } from '@/components/ui/NetworkFootprint'
import { IdentitySignalsTable } from '@/app/(app)/chargebacks/[id]/IdentitySignalsTable'
import { PriorMatchDetailSection } from '@/app/(app)/chargebacks/[id]/PriorMatchDetailSection'
import { NarrativeSummarySection } from '@/app/(app)/chargebacks/[id]/NarrativeSummarySection'
import { MerchantNotesSection } from '@/app/(app)/chargebacks/[id]/MerchantNotesSection'

export type EvidenceDetailPackage = {
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
}

export type EvidenceDetailPageViewProps = {
  pkg: EvidenceDetailPackage
  canRevealCustomer: boolean
  maskedEmail: string
  fullEmail: string | null
  matchSignals: string[]
  matchedPriors: Array<{ orderId: string; orderDate: string; daysPriorToDispute: number }>
  signalCount: number
  identityMatchLevel: 'Strong' | 'Partial' | 'None'
  evidenceStrength: 'weak' | 'moderate' | 'strong'
}

const STRENGTH_GRADE: Record<'weak' | 'moderate' | 'strong', string> = {
  strong: 'A',
  moderate: 'B',
  weak: 'C',
}

const STRENGTH_LABEL: Record<'weak' | 'moderate' | 'strong', string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  weak: 'Weak',
}

export function EvidenceDetailPageView({
  pkg,
  canRevealCustomer,
  maskedEmail,
  fullEmail,
  matchSignals,
  matchedPriors,
  signalCount,
  identityMatchLevel,
  evidenceStrength,
}: EvidenceDetailPageViewProps) {
  const gradeLabel = STRENGTH_GRADE[evidenceStrength]
  const strengthLabel = STRENGTH_LABEL[evidenceStrength]
  const ce3Label = ce3DetailStatusLabel(pkg.ce3_eligible, identityMatchLevel)
  const ce3Variant = ce3Label === 'CE 3.0 ready' ? 'cleared' : ce3Label === 'Needs stronger checkout-time data' ? 'held' : 'flagged'

  return (
    <div className="p-6 md:p-8" style={{ background: 'var(--bg-canvas)', minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
        <Link href="/chargebacks" className="hover:underline transition-colors" style={{ color: 'var(--text-secondary)' }}>
          Evidence Packages
        </Link>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-primary)' }}>{pkg.reference_number}</span>
      </nav>

      {/* Two-rail layout */}
      <div className="grid gap-6 max-w-6xl mx-auto" style={{ gridTemplateColumns: '1fr 280px', alignItems: 'start' }}>
        {/* ═══════════════════════════════════════
            MAIN RAIL
        ═══════════════════════════════════════ */}
        <main className="space-y-5 min-w-0">

          {/* ── HERO BLOCK ─────────────────────── */}
          <PanelCard
            as="section"
            data-dossier-hero
            variant="app"
            className="p-6"
            style={{
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Eyebrow */}
            <div className="text-overline mb-1" style={{ color: 'var(--text-secondary)' }}>
              Case Reference
            </div>
            <div
              className="font-mono font-semibold mb-6"
              style={{ fontSize: 18, letterSpacing: '-0.005em', color: 'var(--text-primary)' }}
            >
              {pkg.reference_number}
            </div>

            {/* Evidence strength as focal element */}
            <div className="mb-6">
              <div className="text-overline mb-3" style={{ color: 'var(--text-secondary)' }}>
                Evidence strength
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="text-mono-lg inline-flex shrink-0 items-center justify-center rounded-md"
                  style={{
                    width: 56,
                    height: 56,
                    lineHeight: 1,
                    background: `var(--evidence-${evidenceStrength}-bg)`,
                    color: `var(--evidence-${evidenceStrength}-fg)`,
                    border: `2px solid var(--evidence-${evidenceStrength}-line)`,
                  }}
                >
                  {gradeLabel}
                </div>
                <div>
                  <div className="font-semibold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>
                    {strengthLabel} evidence
                  </div>
                  <div className="mt-1" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {signalCount} identity signal{signalCount === 1 ? '' : 's'}
                    {matchedPriors.length > 0
                      ? ` · ${matchedPriors.length} prior order${matchedPriors.length === 1 ? '' : 's'}`
                      : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)', margin: '0 0 16px' }} />

            <div className="mb-4">
              <NetworkFootprint
                merchants={pkg.cross_merchant_indicator ? Math.max(2, matchedPriors.length + 1) : 1}
                claims={matchedPriors.length}
                grade={gradeLabel === 'A' || gradeLabel === 'B' ? gradeLabel : 'C'}
                kSatisfied={pkg.cross_merchant_indicator && matchedPriors.length >= 1}
                variant="compact"
              />
            </div>

            {/* Metadata row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>Order in dispute</div>
                <div className="font-mono font-semibold truncate" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  {pkg.generated_for_order_id?.slice(0, 20) ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>Cross-merchant</div>
                <div className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  {pkg.cross_merchant_indicator ? 'Yes' : 'Not linked'}
                </div>
              </div>
              <div>
                <div className="text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>Generated</div>
                <div className="font-semibold" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                  {formatDate(pkg.generated_at)}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {pkg.pdf_storage_path && (
                <a
                  href={`/api/evidence/${pkg.id}/pdf`}
                  className="inline-flex items-center gap-2 rounded-md text-caption font-semibold transition-colors"
                  style={{
                    padding: '8px 14px',
                    background: 'var(--accent)',
                    color: 'white',
                    border: '1px solid var(--accent)',
                  }}
                  download
                >
                  Download PDF ⤓
                </a>
              )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-md text-caption font-semibold transition-colors"
                style={{
                  padding: '8px 14px',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                Print ↗
              </button>
            </div>
          </PanelCard>

          {/* ── DOSSIER SECTIONS ──────────────── */}
          <DisputeReadinessPanel pkg={pkg} />

          <EvidenceStrengthMeter strength={evidenceStrength} label="Dispute evidence strength" />

          {pkg.signal_snapshot && pkg.signal_snapshot.length > 0 && (
            <IdentitySignalsTable signals={pkg.signal_snapshot} />
          )}

          {identityMatchLevel !== 'None' && (matchSignals.length > 0 || matchedPriors.length > 0) && (
            <PriorMatchDetailSection matchSignals={matchSignals} matchedPriors={matchedPriors} />
          )}

          {pkg.narrative_summary && (
            <NarrativeSummarySection narrative={pkg.narrative_summary} />
          )}

          {pkg.merchant_notes && (
            <MerchantNotesSection notes={pkg.merchant_notes} />
          )}

          {pkg.pdf_storage_path && (
            <EvidencePackagePreview packageId={pkg.id} referenceNumber={pkg.reference_number} />
          )}

          <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
            This report presents cross-merchant identity match data. Merchants may use this information to support chargeback dispute processes at their discretion.
          </p>
        </main>

        {/* ═══════════════════════════════════════
            SIDEBAR — sticky metadata
        ═══════════════════════════════════════ */}
        <aside>
          <PanelCard
            variant="app"
            className="p-4"
            style={{
              position: 'sticky',
              top: 20,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* CE 3.0 status */}
            <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="text-overline mb-2" style={{ color: 'var(--text-secondary)' }}>
                CE 3.0 Status
              </div>
              <StatusBadge variant={ce3Variant}>{ce3Label}</StatusBadge>
              {pkg.cross_merchant_indicator && (
                <div className="mt-2">
                  <StatusBadge variant="flagged">Network flag</StatusBadge>
                </div>
              )}
            </div>

            {/* Customer link */}
            {pkg.customer_profile_id && (
              <div className="mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="text-caption font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Customer
                </div>
                {fullEmail && (
                  <SensitiveField
                    label=""
                    masked={maskedEmail}
                    full={fullEmail}
                    canReveal={canRevealCustomer}
                  />
                )}
                <Link
                  href={`/customers/${pkg.customer_profile_id}`}
                  className="inline-flex items-center gap-1 mt-2 font-semibold hover:opacity-70 transition-opacity"
                  style={{ fontSize: 12, color: 'var(--accent)' }}
                >
                  View profile →
                </Link>
              </div>
            )}

            {/* Retention note */}
            <div>
              <div className="text-caption font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Storage
              </div>
              <p className="text-caption" style={{ color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                Stored in your merchant-scoped archive with masked identifiers for export.
              </p>
            </div>
          </PanelCard>
        </aside>
      </div>
    </div>
  )
}
