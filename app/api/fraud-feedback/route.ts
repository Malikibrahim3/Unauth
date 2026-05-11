import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { logAction } from '@/lib/permissions/audit';
import { withRequestLogging } from '@/lib/log';

const ALL_SIGNALS = [
  'refundRate',
  'inrAbuse',
  'velocity',
  'emailPattern',
  'addressClustering',
  'valueAnomaly',
  'paymentChurn',
  'inrSpeed',
  'crossMerchant',
  'refundPattern',
] as const;

type Outcome = 'confirmed_fraud' | 'confirmed_legitimate';

interface FeedbackBody {
  transaction_id: string;
  outcome: Outcome;
  signals_that_fired: string[];
}

function isValidBody(b: unknown): b is FeedbackBody {
  if (!b || typeof b !== 'object') return false;
  const x = b as Record<string, unknown>;
  if (typeof x.transaction_id !== 'string' || x.transaction_id.length === 0) return false;
  if (x.outcome !== 'confirmed_fraud' && x.outcome !== 'confirmed_legitimate') return false;
  if (!Array.isArray(x.signals_that_fired)) return false;
  if (!x.signals_that_fired.every((s) => typeof s === 'string')) return false;
  return true;
}

async function POSTHandler(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        error:
          'Body must be { transaction_id: string, outcome: "confirmed_fraud" | "confirmed_legitimate", signals_that_fired: string[] }',
      },
      { status: 400 }
    );
  }

  const { transaction_id, outcome, signals_that_fired } = body;
  const fired = new Set(signals_that_fired);

  // Auth check — must be authenticated and have permission
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const supabase = createServiceClient();
  const { denied, ctx } = await requirePermission(supabase, user.id, PERMISSIONS.SUBMIT_FRAUD_FEEDBACK);
  if (denied) return denied;

  // Verify the transaction belongs to a job owned by this merchant
  const { data: txCheck } = await supabase
    .from('audit_transactions')
    .select('job_id, processing_jobs!inner(merchant_id)')
    .eq('id', transaction_id)
    .single();
  if (!txCheck || (txCheck.processing_jobs as unknown as { merchant_id: string }).merchant_id !== ctx.merchantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Defer all the per-signal arithmetic to a single SQL RPC so we don't
  // multiplex 10+ network round-trips. The RPC also re-derives precision
  // and weight_adjustment atomically.
  const { error: rpcError } = await supabase.rpc('record_signal_feedback' as any, {
    p_transaction_id: transaction_id,
    p_outcome: outcome,
    p_fired: Array.from(fired),
    p_all_signals: ALL_SIGNALS as unknown as string[],
  });

  if (rpcError) {
    return NextResponse.json(
      { error: `record_signal_feedback failed: ${rpcError.message}` },
      { status: 500 }
    );
  }

  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0].trim()) ?? 'unknown';
  logAction({
    ctx,
    action: 'submit_fraud_feedback',
    resourceType: 'transaction',
    resourceId: transaction_id,
    metadata: { outcome, signalsFired: Array.from(fired) },
    ip,
  });

  return NextResponse.json({
    success: true,
    transaction_id,
    outcome,
    signals_that_fired: Array.from(fired),
  });
}

export const POST = withRequestLogging('/api/fraud-feedback', POSTHandler);
