// app/(app)/chargebacks/page.tsx
// Evidence packages list — shows all generated packages for this merchant.

import { ce3ListStatusLabel } from '@/lib/evidence/ce3PackageLabels'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TABLES } from '@/lib/supabase/tables'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { Badge, ButtonLink, WorkbenchEmptyState } from '@/components/ui'
import { ChargebacksPageWorkbench } from '@/app/(app)/chargebacks/ChargebacksPageWorkbench'
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems'
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions'
import ReadinessFunnel from '@/components/charts/ReadinessFunnel'

export const metadata = {
  title: 'Evidence Packages — Unauth',
}

export default async function ChargebacksPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const serviceClient = createServiceClient()
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.VIEW_CHARGEBACKS)
  if (denied) redirect(await resolveDefaultAppPath(serviceClient, user.id))

  const { data: packages } = await serviceClient
    .from(TABLES.EVIDENCE_PACKAGES)
    .select(
      'id, reference_number, customer_profile_id, generated_for_order_id, generated_at, ce3_eligible, cross_merchant_indicator, narrative_summary'
    )
    .eq('merchant_id', ctx.merchantId)
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
  const profileIds = [...new Set(pkgs.flatMap(p => p.customer_profile_id ? [p.customer_profile_id] : []))]
  const profileMap: Record<string, { maskedEmail: string }> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await serviceClient
      .from(TABLES.CUSTOMER_PROFILES)
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
    <ChargebacksPageWorkbench
      title="Dispute evidence"
      subtitle="Generate evidence packages when a claim escalates to a dispute. CE 3.0 readiness is checked automatically where data exists."
      navItems={WORKBENCH_NAV_ITEMS}
      actions={
        <ButtonLink href="/customers" variant="secondary" size="sm">View customers</ButtonLink>
      }
      kpiItems={[
        { label: 'Packages', value: pkgs.length.toLocaleString(), hint: 'Evidence artifacts compiled' },
        { label: 'CE 3.0 ready', value: pkgs.filter((pkg) => pkg.ce3_eligible).length.toLocaleString(), hint: 'Prior identity match where required fields exist' },
        { label: 'Cross-merchant', value: pkgs.filter((pkg) => pkg.cross_merchant_indicator).length.toLocaleString(), hint: 'Network-linked evidence' },
        { label: 'With narrative', value: pkgs.filter((pkg) => Boolean(pkg.narrative_summary)).length.toLocaleString(), hint: 'Include summary narrative' },
        { label: 'Last generated', value: pkgs[0]?.generated_at ? new Date(pkgs[0].generated_at).toLocaleDateString('en-US') : '-', hint: 'Most recent artifact' },
      ]}
      main={
      pkgs.length === 0 ? (
        <WorkbenchEmptyState
          title="No evidence packages yet"
          description="Compile a dispute-ready evidence artifact from a customer profile when an order is disputed. Prior matching transactions and cross-merchant links are highlighted when found."
          action={<Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>Generate from a customer</Link>}
        />
      ) : (
        <div>
          {/* Readiness distribution */}
          <div className="border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Package readiness</p>
            <ReadinessFunnel
              total={pkgs.length}
              ready={pkgs.filter((p) => p.ce3_eligible).length}
              inProgress={pkgs.filter((p) => !p.ce3_eligible && Boolean(p.narrative_summary)).length}
              missing={pkgs.filter((p) => !p.ce3_eligible && !p.narrative_summary).length}
            />
            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
              CE 3.0-ready packages have a confirmed prior identity match where required data exists. Other packages may still be evidence-ready or missing IP/device checkout-time signals.
            </p>
          </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
          {pkgs.map((pkg) => {
            const readinessLabel = ce3ListStatusLabel(pkg.ce3_eligible, Boolean(pkg.narrative_summary));
            const readinessTone = pkg.ce3_eligible ? 'success' : pkg.narrative_summary ? 'warning' : 'neutral';
            const maskedEmail = pkg.customer_profile_id
              ? (profileMap[pkg.customer_profile_id]?.maskedEmail ?? null)
              : null;
            return (
              <div
                key={pkg.id}
                className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 items-center px-5 py-4 transition-colors"
                style={{ borderBottom: '1px solid var(--border-muted)' }}
              >
                <div className="min-w-0 space-y-1.5">
                  {/* Row 1: reference + badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="font-mono text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {pkg.reference_number}
                    </span>
                    <Badge tone={readinessTone} size="sm">{readinessLabel}</Badge>
                    {pkg.ce3_eligible && (
                      <Badge tone="neutral" size="sm">Prior match</Badge>
                    )}
                    {pkg.cross_merchant_indicator && (
                      <Badge tone="info" size="sm">Network</Badge>
                    )}
                  </div>
                  {/* Row 2: customer + order */}
                  <div className="flex flex-wrap items-center gap-3">
                    {maskedEmail && (
                      <span
                        className="text-xs font-mono"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {maskedEmail}
                      </span>
                    )}
                    {pkg.generated_for_order_id && (
                      <span
                        className="text-xs font-mono"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Order {pkg.generated_for_order_id.slice(0, 20)}
                      </span>
                    )}
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Generated {formatDate(pkg.generated_at)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={`/api/evidence/${pkg.id}/pdf`}
                    className="text-xs font-medium hover:underline"
                    style={{ color: 'var(--text-tertiary)' }}
                    download
                  >
                    PDF
                  </a>
                  <Link
                    href={`/chargebacks/${pkg.id}`}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: 'var(--accent)' }}
                  >
                    Open →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}
    />
  )
}
