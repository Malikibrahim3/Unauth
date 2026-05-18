import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createServiceClient } from '@/lib/supabase/server';
import { completeJob } from '@/lib/processing/job';
import {
  CHUNK_BUCKET,
  deleteChunkArtifacts,
  type ChunkDispatchPayload,
} from '@/lib/processing/chunkedDispatch';
import { verifyChunkToken, INTERNAL_CHUNK_TOKEN_HEADER } from '@/lib/processing/internalAuth';
import { countReviewWorthyTransactions } from '@/lib/supabase/merchantHelpers';
import { restitchAuditIdentityFromChunks } from '@/lib/processing/restitchAuditIdentity';
import { checkCsvUsageGuard } from '@/lib/processing/supabaseUsageGuard';
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeAuditResults } from '@/lib/audit/resultsSummary';
import { sendEmail } from '@/lib/email/send';
import { buildAuditResultsEmail } from '@/lib/email/templates';

export const maxDuration = 300;

const INLINE_RESTITCH_MAX_ROWS = Number(process.env.INLINE_RESTITCH_MAX_ROWS ?? 30000);

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== 'object') return String(err);

  const maybe = err as Record<string, unknown>;
  const parts = [
    typeof maybe.message === 'string' ? maybe.message : null,
    typeof maybe.details === 'string' ? maybe.details : null,
    typeof maybe.hint === 'string' ? maybe.hint : null,
    typeof maybe.code === 'string' ? `code=${maybe.code}` : null,
  ].filter(Boolean) as string[];

  if (parts.length > 0) return parts.join(' | ');
  return JSON.stringify(maybe);
}

async function checkWatchlistAppearances(
  merchantId: string,
  auditId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: watchlisted } = await supabase
    .from('watchlist_entries')
    .select('customer_profile_id')
    .eq('merchant_id', merchantId);
  if (!watchlisted || watchlisted.length === 0) return;
  const ids = (watchlisted as { customer_profile_id: string | null }[])
    .map((w) => w.customer_profile_id)
    .filter(Boolean) as string[];
  if (ids.length === 0) return;

  const { data: appearances } = await supabase
    .from('audit_transactions')
    .select('customer_profile_id, identity_confidence_grade')
    .eq('job_id', auditId)
    .eq('merchant_id', merchantId)
    .in('customer_profile_id', ids);
  if (!appearances || appearances.length === 0) return;

  const gradeOrder: Record<string, number> = { definite: 4, probable: 3, possible: 2, weak: 1 };
  const grouped = new Map<string, { count: number; highestGrade: string }>();
  for (const row of appearances as Array<{ customer_profile_id: string; identity_confidence_grade: string }>) {
    const ex = grouped.get(row.customer_profile_id);
    const rank = gradeOrder[row.identity_confidence_grade] ?? 0;
    if (!ex) {
      grouped.set(row.customer_profile_id, { count: 1, highestGrade: row.identity_confidence_grade });
    } else {
      grouped.set(row.customer_profile_id, {
        count: ex.count + 1,
        highestGrade: rank > (gradeOrder[ex.highestGrade] ?? 0) ? row.identity_confidence_grade : ex.highestGrade,
      });
    }
  }
  const rows = Array.from(grouped.entries()).map(([profileId, d]) => ({
    merchant_id: merchantId,
    customer_profile_id: profileId,
    audit_id: auditId,
    transaction_count: d.count,
    highest_grade: d.highestGrade,
  }));
  const { error } = await supabase
    .from('watchlist_appearances')
    .upsert(rows, { onConflict: 'merchant_id,customer_profile_id,audit_id' });
  if (error) console.error('[watchlist_appearances] upsert error:', error.message);
}

async function maybeSendAuditResultsEmail(
  supabase: SupabaseClient,
  jobId: string,
  merchantId: string
): Promise<void> {
  const { data: jobMeta } = await supabase
    .from('processing_jobs')
    .select('results_email_sent_at')
    .eq('id', jobId)
    .maybeSingle();

  if ((jobMeta as { results_email_sent_at?: string | null } | null)?.results_email_sent_at) {
    return;
  }

  const { data: publicAudit } = await supabase
    .from('public_audits' as any)
    .select('id, submitted_email')
    .eq('processing_job_id', jobId)
    .maybeSingle();

  let recipientEmail: string | null = null;
  if (publicAudit) {
    recipientEmail = (publicAudit as { submitted_email: string }).submitted_email;
  } else {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('name, user_id')
      .eq('id', merchantId)
      .maybeSingle();
    const merchantRecord = merchant as { user_id?: string } | null;
    if (!merchantRecord?.user_id) {
      await supabase
        .from('processing_jobs')
        .update({ results_email_error: 'Missing merchant owner for audit email.' } as any)
        .eq('id', jobId);
      return;
    }
    const admin = createAdminClient();
    const userResult = await admin.auth.admin.getUserById(merchantRecord.user_id);
    recipientEmail = userResult.data.user?.email ?? null;
  }

  if (!recipientEmail) {
    await supabase
      .from('processing_jobs')
      .update({ results_email_error: 'Missing recipient email for audit results.' } as any)
      .eq('id', jobId);
    return;
  }

  const { data: rows } = await supabase
    .from('audit_transactions')
    .select('cluster_id, order_value, fraud_flags, behavioural_flags, signals_matched, context_flags')
    .eq('job_id', jobId)
    .or('identity_confidence_grade.in.(probable,definite),match_status.in.(probable,definite)')
    .not('dismissed_by_merchant', 'is', true)
    .limit(5000);

  const summary = summarizeAuditResults((rows ?? []) as Array<{
    cluster_id: string | null;
    order_value: number | string | null;
    fraud_flags: unknown;
    behavioural_flags: unknown;
    signals_matched: unknown;
    context_flags: unknown;
  }>);

  const content = buildAuditResultsEmail({
    runId: jobId,
    identitiesFlagged: summary.repeatIdentityClusters,
    repeatIdentityClusters: summary.repeatIdentityClusters,
    refundPatternOrders: summary.refundPatternOrders,
    inrFlaggedAccounts: summary.inrFlaggedAccounts,
    estimatedExposure: summary.estimatedExposure,
  });

  const emailResult = await sendEmail({
    to: recipientEmail,
    subject: `Your Unauth audit is ready — ${summary.repeatIdentityClusters} identities flagged`,
    html: content.html,
    text: content.text,
  });

  const emailUpdate = emailResult.ok
    ? {
        results_email_sent_at: new Date().toISOString(),
        results_email_error: null,
      }
    : {
        results_email_error: emailResult.error ?? 'Unknown audit results email error.',
      };

  await supabase
    .from('processing_jobs')
    .update(emailUpdate as any)
    .eq('id', jobId);

  if (publicAudit) {
    await supabase
      .from('public_audits' as any)
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', (publicAudit as { id: string }).id);
  }
}

export async function POST(request: NextRequest) {
  let body: ChunkDispatchPayload;
  try {
    body = (await request.json()) as ChunkDispatchPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const token = request.headers.get(INTERNAL_CHUNK_TOKEN_HEADER);
  if (!verifyChunkToken(body.jobId, token)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { jobId, totalChunks, merchantId, storagePath } = body;
  const log = (msg: string) =>
    console.log(`[finalize ${jobId}] ${new Date().toISOString()} ${msg}`);

  const sc = createServiceClient();
  const { data: job } = await sc
    .from('processing_jobs')
    .select('merchant_id, status, total_rows, processed_rows, failed_rows')
    .eq('id', jobId)
    .single();

  if (!job || job.merchant_id !== merchantId) {
    return NextResponse.json({ error: 'Job/merchant mismatch' }, { status: 403 });
  }
  if (job.status === 'completed' || job.status === 'failed') {
    log('Job already terminal - skipping');
    return NextResponse.json({ skipped: true });
  }

  const usageGuard = await checkCsvUsageGuard(sc);
  if (usageGuard.shouldStop) {
    log(`Usage guard tripped before finalisation: ${usageGuard.reason}`);
    await completeJob(sc, jobId, false, [
      { message: usageGuard.reason ?? 'Supabase usage guard stopped this run', code: 'SUPABASE_USAGE_GUARD' },
    ]);
    return NextResponse.json({ stopped: true, reason: usageGuard.reason }, { status: 429 });
  }

  const rowsDone = (job.processed_rows ?? 0) + (job.failed_rows ?? 0);
  if ((job.total_rows ?? 0) > 0 && rowsDone < job.total_rows) {
    return NextResponse.json({ error: 'Job rows are not fully processed yet' }, { status: 409 });
  }

  try {
    log('Finalising job');
    let watchlistSyncStatus: 'synced' | 'failed' = 'synced';
    try {
      await checkWatchlistAppearances(merchantId, jobId, sc);
    } catch (err) {
      watchlistSyncStatus = 'failed';
      console.warn(`[finalize ${jobId}] watchlist sync non-fatal failure:`, formatError(err));
    }
    await sc
      .from('processing_jobs')
      .update({ watchlist_sync_status: watchlistSyncStatus } as any)
      .eq('id', jobId);
    const flaggedCount = await countReviewWorthyTransactions(sc, jobId, merchantId);
    await completeJob(sc, jobId, true, undefined, flaggedCount);
    log(`Job marked completed: flaggedCount=${flaggedCount}`);

    const totalRows = job.total_rows ?? 0;
    if (totalRows > 0 && totalRows <= INLINE_RESTITCH_MAX_ROWS) {
      try {
        const restitch = await restitchAuditIdentityFromChunks(sc, jobId, totalChunks);
        log(`Identity restitch complete: updated ${restitch.updated}/${restitch.linkedRows} linked rows`);
      } catch (err) {
        const restitchMessage = formatError(err);
        console.warn(`[finalize ${jobId}] identity restitch non-fatal failure:`, restitchMessage);
        log(`Identity restitch skipped after failure: ${restitchMessage}`);
      }
    } else {
      log(`Identity restitch skipped inline for ${totalRows} rows (limit ${INLINE_RESTITCH_MAX_ROWS})`);
    }

    try {
      await maybeSendAuditResultsEmail(sc, jobId, merchantId);
    } catch (err) {
      const emailMessage = formatError(err);
      console.warn(`[finalize ${jobId}] results email non-fatal failure:`, emailMessage);
      await sc
        .from('processing_jobs')
        .update({ results_email_error: emailMessage } as any)
        .eq('id', jobId);
    }

    await deleteChunkArtifacts(sc, jobId, totalChunks);
    if (storagePath) {
      const { error: rmErr } = await sc.storage.from(CHUNK_BUCKET).remove([storagePath]);
      if (rmErr) console.warn('[finalize] CSV cleanup non-fatal error:', rmErr.message);
    }

    log(`Job finalised: flaggedCount=${flaggedCount}`);
    return NextResponse.json({ ok: true, finalised: true, flaggedCount });
  } catch (err) {
    const message = formatError(err);
    console.error(`[finalize ${jobId}] FAILED:`, message);
    await completeJob(sc, jobId, false, [{ message: `Finalisation failed: ${message}` }]);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
