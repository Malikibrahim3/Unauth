import { createRequestLogger, withRequestLogging } from '@/lib/log';
import { captureServerException } from '@/lib/sentry';
// app/api/evidence/route.ts
// POST /api/evidence
// Generates a chargeback evidence package, renders it as PDF,
// stores in Supabase Storage, and saves the record to evidence_packages.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { TABLES, STORAGE_BUCKETS } from '@/lib/supabase/tables'
import { createScopedClient } from '@/lib/supabase/scoped'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'
import { logAction } from '@/lib/permissions/audit'
import { writeActivityLog } from '@/lib/customers/activityLog'
import { buildEvidencePackage } from '@/lib/evidence/buildPackage'
import { buildNarrative } from '@/lib/evidence/narrative'
import { renderEvidencePDF } from '@/lib/evidence/pdf'
import { enforceRateLimit, limitFromEnv, rateLimitKey } from '@/lib/ratelimit'
import { precheckContextCredits, spendContextCreditsAfterSuccess } from '@/lib/billing/contextUnlockFlow'
import { getSubscribedMerchantTier } from '@/lib/billing/getMerchantTier'
import { TIER_CONFIG } from '@/lib/billing/tiers'
import { deleteEvidencePackageArtifacts } from '@/lib/evidence/cleanupArtifacts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function POSTHandler(request: NextRequest) {
  const logger = createRequestLogger(request, '/api/evidence')
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'

  // ── Auth + permission ─────────────────────────────────────────────────────
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const serviceRole = createServiceClient()
  const { denied, ctx } = await requirePermission(serviceRole, user.id, PERMISSIONS.GENERATE_EVIDENCE)
  if (denied) return denied
  const scopedServiceRole = createScopedClient(ctx.merchantId, serviceRole)

  const limited = await enforceRateLimit(
    rateLimitKey('evidence', 'generate', ctx.merchantId),
    limitFromEnv('RL_EVIDENCE_PER_HOUR', 60, 3600, 'RL_EVIDENCE_WINDOW_SECONDS')
  )
  if (limited) return limited

  // ── Validate body ─────────────────────────────────────────────────────────
  let body: { customerProfileId?: string; disputedOrderId?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { customerProfileId, disputedOrderId, notes } = body
  if (!customerProfileId || !disputedOrderId) {
    return NextResponse.json(
      { error: 'customerProfileId and disputedOrderId are required' },
      { status: 400 }
    )
  }

  const tier = await getSubscribedMerchantTier(serviceRole, ctx.merchantId)
  if (TIER_CONFIG[tier].features.evidence_export_raw !== true) {
    return NextResponse.json(
      {
        error:
          'Case Reports require Pro or higher. Upgrade for case-scoped exports and more monthly context credits.',
      },
      { status: 403 },
    )
  }

  const creditPrecheck = await precheckContextCredits(
    serviceRole,
    ctx.merchantId,
    'evidence_summary',
  )
  if (!creditPrecheck.ok) {
    return NextResponse.json(
      {
        error: creditPrecheck.error,
        requiredCredits: creditPrecheck.creditsRequired,
        remainingCredits: creditPrecheck.snapshot.remaining,
      },
      { status: creditPrecheck.status },
    )
  }

  // ── Build package ─────────────────────────────────────────────────────────
  let pkg
  try {
    pkg = await buildEvidencePackage(
      ctx.merchantId,
      customerProfileId,
      disputedOrderId,
      serviceRole,
      ctx.userId
    )
    // Attach any merchant notes from the form
    if (notes?.trim()) {
      pkg.merchantNotes = pkg.merchantNotes
        ? `${notes.trim()}\n\n${pkg.merchantNotes}`
        : notes.trim()
    }
  } catch (err) {
    captureServerException(err, {
      requestId: request.headers.get('x-request-id'),
      merchantId: ctx.merchantId,
      route: '/api/evidence',
      method: request.method,
    })
    logger.error('evidence.build_package_failed', { error: err, customerProfileId, disputedOrderId })
    return NextResponse.json(
      { error: 'Failed to build evidence package', detail: String(err) },
      { status: 500 }
    )
  }

  // 4. Generate narrative
  const narrative = buildNarrative(pkg)

  // 5. Render PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderEvidencePDF(pkg, narrative)
  } catch (err) {
    captureServerException(err, {
      requestId: request.headers.get('x-request-id'),
      merchantId: ctx.merchantId,
      route: '/api/evidence',
      method: request.method,
    })
    logger.error('evidence.render_pdf_failed', { error: err, referenceNumber: pkg.referenceNumber })
    return NextResponse.json(
      { error: 'Failed to render PDF', detail: String(err) },
      { status: 500 }
    )
  }

  // 6. Upload PDF to Storage
  const storagePath = `${user.id}/${pkg.referenceNumber}.pdf`
  const { error: uploadError } = await serviceRole.storage
    .from(STORAGE_BUCKETS.EVIDENCE_PACKAGES)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    logger.error('evidence.storage_upload_failed', { error: uploadError, referenceNumber: pkg.referenceNumber, nonFatal: true })
    // Non-fatal — continue and save the record without a PDF path
  }

  // 7. Insert to evidence_packages
  const { data: inserted, error: insertError } = await scopedServiceRole
    .from(TABLES.EVIDENCE_PACKAGES)
    .insert({
      customer_profile_id:      customerProfileId,
      generated_for_order_id:   disputedOrderId,
      reference_number:         pkg.referenceNumber,
      pdf_storage_path:         uploadError ? null : storagePath,
      narrative_summary:        narrative,
      signal_snapshot:          pkg.identityEvidence,
      cross_merchant_indicator: false,
      ce3_eligible:             pkg.ce3.eligible,
      ce3_qualifying_signals:   pkg.ce3.qualifyingSignals,
      ce3_prior_transactions:   pkg.ce3.priorTransactions,
      merchant_notes:           pkg.merchantNotes ?? null,
    })
    .select('id')
    .single()

  if (insertError) {
    logger.error('evidence.db_insert_failed', { error: insertError, referenceNumber: pkg.referenceNumber })
    return NextResponse.json(
      { error: 'Failed to save evidence package', detail: insertError.message },
      { status: 500 }
    )
  }

  const packageId = (inserted as { id: string }).id
  const creditSpend = await spendContextCreditsAfterSuccess(serviceRole, {
    merchantId: ctx.merchantId,
    userId: ctx.userId,
    contextType: 'evidence_summary',
    customerRef: customerProfileId,
    orderRef: disputedOrderId,
    metadata: {
      request_source: 'app',
      evidence_package_id: packageId,
    },
  })

  if (!creditSpend.ok) {
    await deleteEvidencePackageArtifacts(scopedServiceRole, serviceRole, {
      packageId,
      storagePath: uploadError ? null : storagePath,
    })
    return NextResponse.json(
      {
        error: 'Not enough context credits remaining to generate this evidence summary.',
        requiredCredits: creditSpend.creditsRequired,
        remainingCredits: creditSpend.snapshot.remaining,
      },
      { status: 402 },
    )
  }

  logAction({
    ctx,
    action: 'generate_evidence',
    resourceType: 'evidence_package',
    resourceId: packageId,
    metadata: { customerProfileId, disputedOrderId, referenceNumber: pkg.referenceNumber },
    ip,
  })

  await writeActivityLog({
    supabase: scopedServiceRole,
    profileId: customerProfileId,
    merchantId: ctx.merchantId,
    eventType: 'evidence_generated',
    eventData: { reference_number: pkg.referenceNumber },
  })

  return NextResponse.json({
    packageId,
    referenceNumber: pkg.referenceNumber,
    hasPriorMatchEvidence: pkg.ce3.eligible,
  })
}

export const POST = withRequestLogging('/api/evidence', POSTHandler);
