import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { streamV1EvidencePdf } from '@/lib/api/v1/evidence';
import { parseAndVerifySignedToken, hashSignedToken } from '@/lib/api/signedAccess';
import { consumeEvidenceDownloadToken } from '@/lib/api/v1/consumeEvidenceDownloadToken';
import { TABLES } from '@/lib/supabase/tables';
import { withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

async function GETHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get('token')?.trim() ?? '';
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const parsed = parseAndVerifySignedToken(token);
  if (!parsed || parsed.evidence_id !== id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (new Date(parsed.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  const service = createServiceClient();
  const tokenHash = hashSignedToken(token);

  const { data: tokenRow } = await service
    .from(TABLES.EVIDENCE_DOWNLOAD_TOKENS)
    .select('id, evidence_id, merchant_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle() as unknown as {
    data: {
      id: string;
      evidence_id: string;
      merchant_id: string;
      expires_at: string;
      used_at: string | null;
    } | null;
  };

  if (!tokenRow || tokenRow.evidence_id !== id || tokenRow.merchant_id !== parsed.merchant_id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  if (tokenRow.used_at) {
    return NextResponse.json({ error: 'Token already used' }, { status: 401 });
  }
  if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  const consumed = await consumeEvidenceDownloadToken(tokenRow.id);
  if (!consumed.ok) {
    const status = consumed.error === 'Token already used' ? 401 : 500;
    return NextResponse.json({ error: consumed.error }, { status });
  }

  const pdf = await streamV1EvidencePdf(service, tokenRow.merchant_id, id);
  if (!pdf.ok) {
    return NextResponse.json({ error: pdf.error }, { status: pdf.status });
  }

  return new NextResponse(pdf.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="UNAUTH-${pdf.filename.replace(/\.pdf$/i, '')}.pdf"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}

export const GET = withRequestLogging('/api/v1/evidence/[id]/download', GETHandler);
