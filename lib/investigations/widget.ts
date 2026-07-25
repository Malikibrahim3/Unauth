import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

type WidgetInvestigationRow = {
  status: string;
  target_type: string;
  target_name: string | null;
  is_primary: boolean;
  due_at: string | null;
  evidence_gap: string;
  response_summary: string | null;
  updated_at: string;
  partner: { name: string } | null;
};

function humanize(value: string): string {
  const words = value.replaceAll('_', ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function compact(value: string | null | undefined, max = 110): string | null {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  if (!normalized) return null;
  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max - 1).trimEnd()}…`;
}

function dueLabel(value: string | null, now = new Date()): string | null {
  if (!value) return null;
  const due = new Date(value);
  if (!Number.isFinite(due.getTime())) return null;
  const rendered = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(due);
  return due.getTime() < now.getTime() ? `Overdue ${rendered}` : `Due ${rendered}`;
}

export async function buildInvestigationWidgetField(
  client: SupabaseClient,
  merchantId: string,
  caseId: string,
): Promise<{ investigation_summary: string }> {
  const [{ data: payoutCase }, { data, error }] = await Promise.all([
    client
      .from(TABLES.MERCHANT_CLAIMS)
      .select('status')
      .eq('merchant_id', merchantId)
      .eq('id', caseId)
      .maybeSingle(),
    client
      .from(TABLES.CASE_CLARIFICATION_REQUESTS)
      .select('status,target_type,target_name,is_primary,due_at,evidence_gap,response_summary,updated_at,partner:partners(name)')
      .eq('merchant_id', merchantId)
      .eq('support_payout_case_id', caseId)
      .order('is_primary', { ascending: false })
      .order('updated_at', { ascending: false }),
  ]);
  if (error) {
    return { investigation_summary: 'Investigation context unavailable · open case in Unauth' };
  }
  const rows = (data ?? []) as unknown as WidgetInvestigationRow[];
  const open = rows.filter((row) => !['closed', 'cancelled'].includes(row.status));
  const primary = open.find((row) => row.is_primary) ?? open[0] ?? null;
  const latestResponse = rows.find((row) => row.response_summary)?.response_summary ?? null;
  const parts = [
    payoutCase?.status ? `Case ${humanize(payoutCase.status)}` : 'Case state unavailable',
  ];
  if (!primary) {
    parts.push('No open investigation');
    if (latestResponse) parts.push(`Latest: ${compact(latestResponse)}`);
    return { investigation_summary: parts.filter(Boolean).join(' · ') };
  }
  const party = primary.partner?.name
    ?? primary.target_name
    ?? humanize(primary.target_type);
  parts.push(
    primary.status === 'response_received'
      ? `Response from ${party} needs review`
      : primary.status === 'draft'
        ? `Draft for ${party} not sent`
        : `Waiting on ${party}`,
  );
  const due = dueLabel(primary.due_at);
  if (due && primary.status === 'waiting_response') parts.push(due);
  parts.push(`Gap: ${compact(primary.evidence_gap)}`);
  if (latestResponse) parts.push(`Latest: ${compact(latestResponse, 80)}`);
  if (open.length > 1) parts.push(`${open.length} open requests`);
  return { investigation_summary: parts.filter(Boolean).join(' · ') };
}
