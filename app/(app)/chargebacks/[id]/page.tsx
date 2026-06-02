// app/(app)/chargebacks/[id]/page.tsx
// Evidence package detail page.

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TABLES } from '@/lib/supabase/tables'
import { notFound, redirect } from 'next/navigation'
import { EvidenceDetailPageView } from '@/app/(app)/chargebacks/[id]/EvidenceDetailPageView'
import type { EvidenceDetailPackage } from '@/app/(app)/chargebacks/[id]/EvidenceDetailPageView'
import { requirePermission, hasPermission, PERMISSIONS, resolveDefaultAppPath } from '@/lib/permissions'

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
    <EvidenceDetailPageView
      pkg={pkg as EvidenceDetailPackage}
      canRevealCustomer={canRevealCustomer}
      maskedEmail={maskedEmail}
      fullEmail={fullEmail}
      matchSignals={matchSignals}
      matchedPriors={matchedPriors}
      signalCount={signalCount}
      identityMatchLevel={identityMatchLevel}
      evidenceStrength={evidenceStrength}
    />
  )
}
