import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/log';

/**
 * Retired endpoint.
 *
 * This route fed the signal_performance adaptive-learning loop via the
 * record_signal_feedback RPC. That RPC has been broken since the
 * fraud_transactions → audit_transactions rename, and the v2 schema
 * migration archived signal_performance entirely (seeded data, no live
 * write path). A replacement feedback loop will be rebuilt against the
 * v2 claim/outcome model; until then this endpoint is explicitly gone
 * rather than silently failing.
 */
async function POSTHandler(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Legacy signal feedback is retired pending the v2 payout-case feedback loop. Signal-level feedback is no longer recorded.',
    },
    { status: 410 },
  );
}

export const POST = withRequestLogging('/api/fraud-feedback', POSTHandler);
