import { NextResponse, type NextRequest } from 'next/server';
import { withRequestLogging } from '@/lib/log';

async function POSTHandler(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'In-app demo generation has been retired. Use npm run seed:demo to load the deterministic v2 sample merchant.',
      seedCommand: 'npm run seed:demo',
    },
    { status: 410 },
  );
}

export const POST = withRequestLogging('/api/demo', POSTHandler);
