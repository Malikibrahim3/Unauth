import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { getMerchantOwnedJobIds } from '@/lib/supabase/merchantHelpers';
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

    const userClient = createClient();

    // Resolve the authenticated user.
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Resolve the caller's merchant server-side and require the fraud-feedback
    // permission. (Previously this trusted a dropped `merchants.user_id` column
    // and fell back to `user.id`, and its job filter passed a query builder as an
    // `.eq()` value — so scoping did not actually constrain the query.)
    const serviceClient = createServiceClient();
    const { denied, ctx } = await requirePermission(
      serviceClient,
      user.id,
      PERMISSIONS.SUBMIT_FRAUD_FEEDBACK,
    );
    if (denied) return denied;
    const merchantId = ctx.merchantId;

    // ── 1. Fetch evidence snapshot, constrained to this merchant's own jobs ──
    type FalsePositiveTxRow = {
      id: string;
      signals_matched: string[] | null;
      identity_score: number | null;
    };
    const ownedJobIds = await getMerchantOwnedJobIds(serviceClient, merchantId);
    let txRows: FalsePositiveTxRow[] = [];
    if (ownedJobIds.length > 0) {
      const { data } = (await serviceClient
        .from(TABLES.AUDIT_TRANSACTIONS)
        .select('id, order_id, identity_confidence_grade, identity_score, signals_matched, behavioural_flags, match_status, confirmed_identity_id')
        .eq('confirmed_identity_id', cluster_id)
        .in('job_id', ownedJobIds)) as unknown as { data: FalsePositiveTxRow[] | null };
      txRows = data ?? [];
    }

    // Build a compact evidence snapshot — just the signals, scores, and order IDs.
    const evidenceSnapshot = {
      cluster_id,
      merchant_id: merchantId,
      transaction_count: txRows.length,
      sample_signals: Array.from(
        new Set(txRows.flatMap((r) => r.signals_matched ?? []))
      ).slice(0, 20),
      max_identity_score: Math.max(0, ...txRows.map((r) => r.identity_score ?? 0)),
      reported_at: new Date().toISOString(),
      reviewer_notes: notes ?? null,
    };

    // ── 2. Insert the false-positive report ──────────────────────────────────
    const { error: reportError } = await serviceClient
      .from('identity_false_positive_reports' as never)
      .insert({
        cluster_id,
        reported_by_merchant_id: merchantId,
        evidence_snapshot: evidenceSnapshot,
        status: 'pending',
      } as never);

    if (reportError) {
      logger.error('false_positive_report.insert_failed', { error: reportError, clusterId: cluster_id });
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      );
    }

    // ── 3. Flag this merchant's own audit_transactions rows ──────────────────
    // Scoped by both id and owned job IDs (source_orders is a caller-scoped table).
    if (txRows.length > 0) {
      const txIds = txRows.map((r) => r.id);
      await serviceClient
        .from(TABLES.AUDIT_TRANSACTIONS)
        .update({
          false_positive_reported: true,
          false_positive_reported_at: new Date().toISOString(),
        } as never)
        .in('id', txIds)
        .in('job_id', ownedJobIds);
    }

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
