import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = form.get('email');
  const file = form.get('file');

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'valid email required' }, { status: 400 });
  }
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'csv file required' }, { status: 400 });
  }

  // TODO: wire to processing pipeline — store submission, queue for processing, send confirmation email
  const auditId = `audit_${Date.now()}`;
  return NextResponse.json({ audit_id: auditId, email }, { status: 200 });
}
