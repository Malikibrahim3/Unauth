import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { createRequestLogger, withRequestLogging } from '@/lib/log';
import { captureServerException } from '@/lib/sentry';

/**
 * POST /api/customer/report-false-positive
 *
 * Merchant-submitted false-positive report for a confirmed identity link.
 *
 * Contract:
 *  - Stores an append-only `identity_resolution_events` record for review.
 *  - Does NOT mutate the identity graph or its confidence grade.
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

    // ── 1. Fetch evidence snapshot, constrained directly to this merchant ──
    type FalsePositiveTxRow = {
      id: string;
      identity_score: number | null;
      identity_confidence_grade: string | null;
      match_status: string | null;
    };
    const { data } = (await serviceClient
      .from(TABLES.SOURCE_ORDERS)
      .select('id, identity_confidence_grade, identity_score, match_status')
      .eq('merchant_id', merchantId)
      .eq('cluster_id', cluster_id)) as unknown as { data: FalsePositiveTxRow[] | null };
    const txRows = data ?? [];

    if (txRows.length === 0) {
      return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
    }

    // Build a compact evidence snapshot — just the signals, scores, and order IDs.
    const evidenceSnapshot = {
      cluster_id,
      merchant_id: merchantId,
      transaction_count: txRows.length,
      confidence_grades: Array.from(new Set(txRows.map((r) => r.identity_confidence_grade).filter(Boolean))),
      match_statuses: Array.from(new Set(txRows.map((r) => r.match_status).filter(Boolean))),
      max_identity_score: Math.max(0, ...txRows.map((r) => r.identity_score ?? 0)),
      reported_at: new Date().toISOString(),
      reviewer_notes: notes ?? null,
    };

    // ── 2. Append the false-positive report to the identity event stream ────
    const { error: reportError } = await serviceClient
      .from('identity_resolution_events')
      .insert({
        identity_id: cluster_id,
        event_type: 'merchant_false_positive_reported',
        actor: user.id,
        detail: evidenceSnapshot,
      });

    if (reportError) {
      logger.error('false_positive_report.insert_failed', { error: reportError, clusterId: cluster_id });
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 }
      );
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
