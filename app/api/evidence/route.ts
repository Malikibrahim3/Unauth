// app/api/evidence/route.ts
// POST /api/evidence
// Generates a chargeback evidence package, renders it as PDF,
// stores in Supabase Storage, and saves the record to evidence_packages.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildEvidencePackage } from '@/lib/evidence/buildPackage'
import { buildNarrative } from '@/lib/evidence/narrative'
import { renderEvidencePDF } from '@/lib/evidence/pdf'

export const dynamic = 'force-dynamic'
// PDF generation needs longer timeout — Vercel Pro max is 60s
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // 1. Auth
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // 2. Validate body
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

  const serviceRole = createServiceClient()

  // 3. Build package (includes CE3 assessment)
  let pkg
  try {
    pkg = await buildEvidencePackage(
      user.id,
      customerProfileId,
      disputedOrderId,
      serviceRole as any
    )
    // Attach any merchant notes from the form
    if (notes?.trim()) {
      pkg.merchantNotes = pkg.merchantNotes
        ? `${notes.trim()}\n\n${pkg.merchantNotes}`
        : notes.trim()
    }
  } catch (err) {
    console.error('[evidence] buildEvidencePackage failed:', err)
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
    console.error('[evidence] renderEvidencePDF failed:', err)
    return NextResponse.json(
      { error: 'Failed to render PDF', detail: String(err) },
      { status: 500 }
    )
  }

  // 6. Upload PDF to Storage
  const storagePath = `${user.id}/${pkg.referenceNumber}.pdf`
  const { error: uploadError } = await serviceRole.storage
    .from('evidence-packages')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    console.error('[evidence] Storage upload failed:', uploadError)
    // Non-fatal — continue and save the record without a PDF path
  }

  // 7. Insert to evidence_packages
  const { data: inserted, error: insertError } = await serviceRole
    .from('evidence_packages')
    .insert({
      merchant_id:              user.id,
      customer_profile_id:      customerProfileId,
      generated_for_order_id:   disputedOrderId,
      reference_number:         pkg.referenceNumber,
      pdf_storage_path:         uploadError ? null : storagePath,
      narrative_summary:        narrative,
      signal_snapshot:          pkg.identityEvidence as any,
      cross_merchant_indicator: pkg.crossMerchant.satisfied,
      ce3_eligible:             pkg.ce3.eligible,
      ce3_qualifying_signals:   pkg.ce3.qualifyingSignals as any,
      ce3_prior_transactions:   pkg.ce3.priorTransactions as any,
      merchant_notes:           pkg.merchantNotes ?? null,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[evidence] DB insert failed:', insertError)
    return NextResponse.json(
      { error: 'Failed to save evidence package', detail: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    packageId:   (inserted as any).id,
    referenceNumber: pkg.referenceNumber,
    ce3Eligible: pkg.ce3.eligible,
  })
}
