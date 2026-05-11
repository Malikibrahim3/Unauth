import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger, withRequestLogging } from '@/lib/log';

export const dynamic = 'force-dynamic';

async function POSTHandler(request: NextRequest) {
  const logger = createRequestLogger(request, '/api/csp-report');
  let report: unknown = null;

  try {
    const body = await request.text();
    report = body ? JSON.parse(body) : null;
  } catch {
    report = { parseError: true };
  }

  logger.warn('csp.report', { report });

  return new NextResponse(null, { status: 204 });
}

export const POST = withRequestLogging('/api/csp-report', POSTHandler);
