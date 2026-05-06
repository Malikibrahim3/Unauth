// app/api/evidence/[id]/pdf/route.ts
// GET /api/evidence/[id]/pdf
// Streams PDF from Supabase Storage.
// Auth: merchant must own this package.

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requirePermission, PERMISSIONS } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const serviceRole = createServiceClient()
  const { denied, ctx } = await requirePermission(serviceRole, user.id, PERMISSIONS.VIEW_CUSTOMERS)
  if (denied) return denied

  // Verify merchant owns this package
  const { data: packageRow, error: pkgError } = await serviceRole
    .from('evidence_packages')
    .select('id, pdf_storage_path, reference_number, merchant_id')
    .eq('id', id)
    .eq('merchant_id', ctx.merchantId)
    .single() as unknown as {
      data: { id: string; pdf_storage_path: string | null; reference_number: string; merchant_id: string } | null
      error: unknown
    }

  if (pkgError || !packageRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  if (!packageRow.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  const { data: fileData, error: dlError } = await serviceRole.storage
    .from('evidence-packages')
    .download(packageRow.pdf_storage_path)

  if (dlError || !fileData) {
    console.error('[evidence/pdf] Storage download failed:', dlError)
    return NextResponse.json({ error: 'PDF not found in storage' }, { status: 404 })
  }

  const arrayBuffer = await fileData.arrayBuffer()

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${packageRow.reference_number}.pdf"`,
      'Cache-Control': 'private, no-cache',
    },
  })
}
