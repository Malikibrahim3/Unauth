// app/(app)/chargebacks/page.tsx
// Evidence packages list — shows all generated packages for this merchant.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TABLES } from '@/lib/supabase/tables'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { Badge, Button, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui'
import { WORKBENCH_NAV_ITEMS } from '@/components/workbench/workbenchNavItems'
import { requirePermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions'

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
  const profileIds = [...new Set(pkgs.map(p => p.customer_profile_id).filter(Boolean))]
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
    <WorkbenchPage
      title="Evidence packages"
      subtitle="Signal data compiled from your records for disputed orders."
      navItems={WORKBENCH_NAV_ITEMS}
      activeNavKey="customers"
      actions={
        <Link href="/customers">
          <Button variant="secondary" size="sm">View customers</Button>
        </Link>
      }
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Packages', value: pkgs.length.toLocaleString(), hint: 'Generated reports' },
            { label: 'Prior identity match', value: pkgs.filter((pkg) => pkg.ce3_eligible).length.toLocaleString(), hint: 'Packages with matched priors' },
            { label: 'Cross-merchant', value: pkgs.filter((pkg) => pkg.cross_merchant_indicator).length.toLocaleString(), hint: 'Network-linked evidence' },
            { label: 'Latest', value: pkgs[0]?.generated_at ? new Date(pkgs[0].generated_at).toLocaleDateString('en-GB') : '-', hint: 'Most recent package' },
            { label: 'Source', value: 'Customers', hint: 'Generated from customer profiles' },
          ]}
        />
      }
      actionBar={
        <WorkbenchActionBar
          right={
            <Link href="/customers">
              <Button size="sm">Generate From Customer</Button>
            </Link>
          }
        />
      }
      main={
      pkgs.length === 0 ? (
        <WorkbenchEmptyState
          title="No evidence packages yet"
          description="Compile identity evidence from customer profiles to support dispute review. Prior matching transactions are highlighted when found."
          action={<Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>View customers</Link>}
        />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-sm" style={{ background: 'var(--bg-surface)' }}>
            <thead>
              <tr className="border-b" style={{ background: 'var(--bg-surface-alt)', borderColor: 'var(--border-default)' }}>
                {['Reference', 'Customer', 'Generated', 'Prior match', 'Cross-merchant', ''].map((header) => (
                  <th key={header} className="px-4 py-2.5 text-left text-overline" style={{ color: 'var(--text-muted)' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pkgs.map((pkg) => (
                <tr key={pkg.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {pkg.reference_number}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: 'var(--text)' }}>
                      {pkg.customer_profile_id ? (profileMap[pkg.customer_profile_id]?.maskedEmail ?? '—') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(pkg.generated_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {pkg.ce3_eligible
                      ? <span title="Prior orders share identity signals with the disputed order"><Badge tone="neutral" size="sm">Matched</Badge></span>
                      : <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {pkg.cross_merchant_indicator
                      ? <Badge tone="info" size="sm">Network</Badge>
                      : <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a
                        href={`/api/evidence/${pkg.id}/pdf`}
                        className="text-caption hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                        download
                      >
                        Download
                      </a>
                      <Link
                        href={`/chargebacks/${pkg.id}`}
                        className="text-caption hover:underline"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Open
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    />
  )
}
