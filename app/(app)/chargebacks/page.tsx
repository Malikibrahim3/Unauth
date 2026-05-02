// app/(app)/chargebacks/page.tsx
// Evidence packages list — shows all generated packages for this merchant.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import ConfidenceGrade, { riskLevelToGrade } from '@/components/ConfidenceGrade'

export const metadata = {
  title: 'Evidence Packages — Unauth',
}

export default async function ChargebacksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: packages } = await supabase
    .from('evidence_packages')
    .select(
      'id, reference_number, customer_profile_id, generated_for_order_id, generated_at, ce3_eligible, cross_merchant_indicator, narrative_summary'
    )
    .order('generated_at', { ascending: false })
    .limit(100) as unknown as {
      data: Array<{
        id: string
        reference_number: string
        customer_profile_id: string | null
        generated_for_order_id: string | null
        generated_at: string
        ce3_eligible: boolean
        cross_merchant_indicator: boolean
        narrative_summary: string | null
      }> | null
    }

  const pkgs = packages ?? []

  // Fetch masked email hints for each package
  const profileIds = [...new Set(pkgs.map(p => p.customer_profile_id).filter(Boolean))]
  let profileMap: Record<string, { maskedEmail: string }> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('customer_profiles')
      .select('id, primary_email, emails')
      .in('id', profileIds as string[]) as unknown as {
        data: Array<{ id: string; primary_email: string | null; emails: string[] }> | null
      }
    for (const p of profiles ?? []) {
      const email = p.primary_email ?? p.emails?.[0] ?? ''
      profileMap[p.id] = {
        maskedEmail: email
          ? `${email[0]}****@${email.split('@')[1] ?? '***'}`
          : '****',
      }
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>
            Evidence Packages
          </h1>
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Chargeback representment documents generated for disputed orders.
            {pkgs.some(p => p.ce3_eligible) && (
              <> Where eligible, packages are formatted for Visa Compelling Evidence 3.0.</>
            )}
          </p>
        </div>
        <Link
          href="/customers"
          className="text-xs font-semibold hover:underline shrink-0"
          style={{ color: 'var(--accent)' }}
        >
          View customers →
        </Link>
      </div>

      {pkgs.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-body-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
            No evidence packages yet.
          </p>
          <p className="text-body-sm mb-4 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
            When a customer files a chargeback, generate an evidence package from their profile.
            Where eligible, packages are formatted for Visa Compelling Evidence 3.0 submission.
          </p>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
            style={{ color: 'var(--accent)' }}
          >
            View customers →
          </Link>
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
              >
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Reference
                </th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Customer
                </th>
                <th className="text-left px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  Generated
                </th>
                <th className="text-center px-4 py-2.5 text-overline" style={{ color: 'var(--text-muted)' }}>
                  CE3.0
                </th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pkgs.map(pkg => {
                const customer = pkg.customer_profile_id
                  ? profileMap[pkg.customer_profile_id]
                  : null
                return (
                  <tr
                    key={pkg.id}
                    className="border-b transition-colors hover-bg-subtle"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                      {pkg.reference_number}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text)' }}>
                      {customer?.maskedEmail ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(pkg.generated_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {pkg.ce3_eligible ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          style={{ color: 'var(--success)' }}
                          title="This package meets Visa Compelling Evidence 3.0 requirements"
                        >
                          Eligible ✓
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-subtle)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <a
                          href={`/api/evidence/${pkg.id}/pdf`}
                          className="text-xs hover:underline"
                          style={{ color: 'var(--text-muted)' }}
                          download
                        >
                          ↓ Download
                        </a>
                        <Link
                          href={`/chargebacks/${pkg.id}`}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: 'var(--text)' }}
                        >
                          View →
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
