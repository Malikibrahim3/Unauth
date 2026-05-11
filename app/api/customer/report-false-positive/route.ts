import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRequestLogger, withRequestLogging } from '@/lib/log';
import { captureServerException } from '@/lib/sentry';

/**
 * POST /api/customer/report-false-positive
 *
 * Merchant-submitted false-positive report for a confirmed identity link.
 *
 * Contract:
 *  - Stores the report in `identity_false_positive_reports` for Unauth review.
 *  - Sets `false_positive_reported = true` on the relevant `audit_transactions`
 *    and `customer_profiles` rows.
 *  - Does NOT change `match_status` — the graph is append-only; only Unauth
 *    reviewers can dismiss or confirm a false positive.
 *
 * Body: { cluster_id: string; merchant_id?: string; notes?: string }
 */
async function POSTHandler(req: NextRequest) {
  const logger = createRequestLogger(req, '/api/customer/report-false-positive');
  try {
    const body = await req.json();
    const { cluster_id, notes } = body as {
      cluster_id?: string;
      merchant_id?: string;
      notes?: string;
    };

    if (!cluster_id) {
      return NextResponse.json(
        { error: 'cluster_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Resolve the authenticated merchant.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Resolve the merchant ID from the user's profile.
    const { data: merchantRow } = await supabase
      .from('merchants' as any)
      .select('id')
      .eq('user_id', user.id)
      .single();
    const merchantId: string = (merchantRow as any)?.id ?? user.id;

    // ── 1. Fetch evidence snapshot from the matching transactions ───────────
    const { data: txRows } = await supabase
      .from('audit_transactions')
      .select(
        'id, order_id, identity_confidence_grade, identity_score, signals_matched, behavioural_flags, match_status, confirmed_identity_id'
      )
      .eq('confirmed_identity_id', cluster_id)
      .eq('job_id', (
        // Narrow to this merchant's jobs only.
        supabase
          .from('processing_jobs' as any)
          .select('id')
          .eq('merchant_id', merchantId)
      ) as any);

    // Build a compact evidence snapshot — just the signals, scores, and order IDs.
    const evidenceSnapshot = {
      cluster_id,
      merchant_id: merchantId,
      transaction_count: (txRows ?? []).length,
      sample_signals: Array.from(
        new Set((txRows ?? []).flatMap((r: any) => r.signals_matched ?? []))
      ).slice(0, 20),
      max_identity_score: Math.max(
        0,
        ...(txRows ?? []).map((r: any) => r.identity_score ?? 0)
      ),
      reported_at: new Date().toISOString(),
      reviewer_notes: notes ?? null,
    };

    // ── 2. Insert the false-positive report ──────────────────────────────────
    const { error: reportError } = await supabase
      .from('identity_false_positive_reports' as any)
      .insert({
        cluster_id,
        reported_by_merchant_id: merchantId,
        evidence_snapshot: evidenceSnapshot,
        status: 'pending',
      });

    if (reportError) {
      logger.error('false_positive_report.insert_failed', { error: reportError, clusterId: cluster_id });
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      );
    }

    // ── 3. Flag audit_transactions rows ─────────────────────────────────────
    // Only flag transactions this merchant can see (matching confirmed_identity_id).
    if ((txRows ?? []).length > 0) {
      const txIds = (txRows ?? []).map((r: any) => r.id as string);
      await supabase
        .from('audit_transactions')
        .update({
          false_positive_reported: true,
          false_positive_reported_at: new Date().toISOString(),
        } as any)
        .in('id', txIds);
    }

    // ── 4. Flag customer_profile rows linked to this cluster ─────────────────
    await supabase
      .from('customer_profiles')
      .update({ false_positive_reported: true } as any)
      .eq('identity_cluster_id', cluster_id)
      .eq('merchant_ids', merchantId as any); // narrows to this merchant's profiles

    return NextResponse.json({
      success: true,
      cluster_id,
      message:
        'Report submitted. Our team will review the connection and follow up if needed. The link status is unchanged until the review is complete.',
    });
  } catch (err) {
    captureServerException(err, {
      requestId: req.headers.get('x-request-id'),
      route: '/api/customer/report-false-positive',
      method: req.method,
    });
    logger.error('false_positive_report.failed', { error: err });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRequestLogging('/api/customer/report-false-positive', POSTHandler);
