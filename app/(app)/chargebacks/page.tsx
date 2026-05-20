// app/(app)/chargebacks/page.tsx
// Evidence packages list — shows all generated packages for this merchant.

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { Badge, Button, DataTable, WorkbenchActionBar, WorkbenchEmptyState, WorkbenchKpiStrip, WorkbenchPage } from '@/components/ui'

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
  const profileMap: Record<string, { maskedEmail: string }> = {}
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
    <WorkbenchPage
      title="Reports"
      subtitle="Evidence packages generated for disputed orders."
      navItems={[
        { key: 'overview', label: 'Overview', href: '/dashboard' },
        { key: 'cases', label: 'Cases', href: '/inbox' },
        { key: 'clusters', label: 'Clusters', href: '/customers?merchantsMin=2' },
        { key: 'audits', label: 'Audits', href: '/history' },
        { key: 'reports', label: 'Reports', href: '/chargebacks' },
      ]}
      activeNavKey="reports"
      actions={
        <Link href="/customers">
          <Button variant="secondary" size="sm">View customers</Button>
        </Link>
      }
      kpiStrip={
        <WorkbenchKpiStrip
          items={[
            { label: 'Packages', value: pkgs.length.toLocaleString(), hint: 'Generated reports' },
            { label: 'CE3 eligible', value: pkgs.filter((pkg) => pkg.ce3_eligible).length.toLocaleString(), hint: 'Ready for CE3.0' },
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
          description="Generate packages from customer profiles after a chargeback is filed. CE3.0 formatting is added when eligible."
          action={<Link href="/customers" className="text-caption font-semibold hover:underline" style={{ color: 'var(--accent)' }}>View customers</Link>}
        />
      ) : (
        <DataTable
          columns={[
            {
              key: 'reference_number',
              header: 'Reference',
              render: (pkg) => (
                <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {pkg.reference_number}
                </span>
              ),
            },
            {
              key: 'customer',
              header: 'Customer',
              render: (pkg) => (
                <span className="text-xs" style={{ color: 'var(--text)' }}>
                  {pkg.customer_profile_id ? (profileMap[pkg.customer_profile_id]?.maskedEmail ?? '—') : '—'}
                </span>
              ),
            },
            {
              key: 'generated_at',
              header: 'Generated',
              render: (pkg) => (
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(pkg.generated_at)}
                </span>
              ),
            },
            {
              key: 'ce3_eligible',
              header: 'CE3.0',
              render: (pkg) => pkg.ce3_eligible
                ? <Badge tone="success" size="sm">CE3.0</Badge>
                : <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>—</span>,
            },
            {
              key: 'cross_merchant_indicator',
              header: 'Cross-merchant',
              render: (pkg) => pkg.cross_merchant_indicator
                ? <Badge tone="info" size="sm">Network</Badge>
                : <span className="text-caption" style={{ color: 'var(--text-subtle)' }}>—</span>,
            },
            {
              key: 'actions',
              header: '',
              render: (pkg) => (
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
              ),
            },
          ]}
          rows={pkgs}
          getRowKey={(pkg) => pkg.id}
          density="default"
        />
      )}
    />
  )
}
