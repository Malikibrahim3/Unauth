import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { connectionFreshness, coverageFromRecords } from '@/lib/integrations/health';
import { publicConnectionErrorMessage, safeConnectionErrorCode } from '@/lib/integrations/publicErrors';

export const dynamic = 'force-dynamic';
type ConnectionRow = { id: string; provider_id: string; category: string; provider_account_name: string | null; status: string; capabilities_snapshot: Record<string, unknown>; granted_scopes: string[]; writeback_enabled: boolean; last_sync_started_at: string | null; last_sync_completed_at: string | null; last_successful_sync_at: string | null; data_fresh_through: string | null; webhook_status: string | null; webhook_last_received_at: string | null; imported_record_count: number; last_error_code: string | null; last_error_message: string | null; last_error_at: string | null };
type RecordRow = { connection_id: string | null; source_entity_type: string; freshness_state: string; sync_state: string };
type IssueRow = { id: string; connection_id: string | null; event_type: string | null; status: string; last_error: string | null; received_at: string };
export async function GET() {
  const userClient = createClient(); const { data: { user } } = await userClient.auth.getUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = createServiceClient(); const { denied, ctx } = await requirePermission(client, user.id, PERMISSIONS.VIEW_SETTINGS); if (denied || !ctx) return denied ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [connectionResult, recordResult, errorResult] = await Promise.all([
    client.from(TABLES.MERCHANT_INTEGRATIONS).select('id,provider_id,category,provider_account_name,status,capabilities_snapshot,granted_scopes,writeback_enabled,last_sync_started_at,last_sync_completed_at,last_successful_sync_at,data_fresh_through,webhook_status,webhook_last_received_at,imported_record_count,last_error_code,last_error_message,last_error_at').eq('merchant_id', ctx.merchantId).order('provider_id'),
    client.from(TABLES.SOURCE_RECORDS).select('connection_id,source_entity_type,freshness_state,sync_state').eq('merchant_id', ctx.merchantId).limit(10000),
    client.from(TABLES.INGESTION_EVENTS).select('id,connection_id,event_type,status,last_error,received_at').eq('merchant_id', ctx.merchantId).in('status', ['failed','dead_letter']).order('received_at', { ascending: false }).limit(100),
  ]);
  if (connectionResult.error) throw new Error(`integration_health_connections_failed: ${connectionResult.error.message}`); if (recordResult.error) throw new Error(`integration_health_records_failed: ${recordResult.error.message}`); if (errorResult.error) throw new Error(`integration_health_issues_failed: ${errorResult.error.message}`);
  const records = (recordResult.data ?? []) as RecordRow[]; const issues = (errorResult.data ?? []) as IssueRow[]; const now = Date.now();
  const connections = ((connectionResult.data ?? []) as ConnectionRow[]).map(({ last_error_message, ...row }) => ({ ...row, last_error_code: safeConnectionErrorCode(row.last_error_code, last_error_message), last_error_message: publicConnectionErrorMessage(row.last_error_code, last_error_message), freshness: connectionFreshness(row.data_fresh_through ?? row.last_successful_sync_at, now), recordCounts: records.filter((record) => record.connection_id === row.id).reduce((counts: Record<string, number>, record) => ({ ...counts, [record.source_entity_type]: (counts[record.source_entity_type] ?? 0) + 1 }), {}), activeIssueCount: issues.filter((issue) => issue.connection_id === row.id).length }));
  const safeIssues = issues.map(({ last_error, ...issue }) => ({
    ...issue,
    error_code: safeConnectionErrorCode(last_error) ?? 'ingestion_failed',
  }));
  return NextResponse.json({ connections, coverage: coverageFromRecords(records), issues: safeIssues });
}
