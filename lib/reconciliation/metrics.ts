import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type AutomationMetrics = {
  automaticOutcomes: number; probableOutcomes: number; unknownOutcomes: number; unresolvedExceptions: number;
  automationCompletionPercent: number; averageMerchantInputsPerCase: number; reconciliationLagHours: number | null;
};

export async function getAutomationMetrics(client: SupabaseClient, merchantId: string): Promise<AutomationMetrics> {
  const [casesResult, eventsResult, exceptionsResult] = await Promise.all([
    client.from(TABLES.MERCHANT_CLAIMS).select('id,created_at,updated_at').eq('merchant_id', merchantId).limit(10000),
    client.from(TABLES.DOMAIN_EVENTS).select('aggregate_id,event_type,actor_type,recorded_at').eq('merchant_id', merchantId).eq('aggregate_type', 'case').limit(20000),
    client.from(TABLES.CASE_EXCEPTIONS).select('confidence,status,created_at').eq('merchant_id', merchantId).limit(10000),
  ]);
  if (casesResult.error) throw new Error(`automation_metrics_cases_failed: ${casesResult.error.message}`);
  if (eventsResult.error) throw new Error(`automation_metrics_events_failed: ${eventsResult.error.message}`);
  if (exceptionsResult.error) throw new Error(`automation_metrics_exceptions_failed: ${exceptionsResult.error.message}`);
  const cases = casesResult.data ?? []; const events = eventsResult.data ?? []; const exceptions = exceptionsResult.data ?? [];
  const automaticCases = new Set(events.filter((event) => event.actor_type === 'system' || event.actor_type === 'workflow').map((event) => event.aggregate_id).filter(Boolean));
  const merchantInputs = events.filter((event) => event.actor_type === 'user' && event.event_type.includes('exception')).length;
  const probable = exceptions.filter((row) => row.confidence === 'probable').length;
  const unknown = exceptions.filter((row) => row.confidence === 'unknown').length;
  const unresolved = exceptions.filter((row) => row.status === 'open').length;
  const latestException = exceptions.reduce<string | null>((latest, row) => !latest || row.created_at > latest ? row.created_at : latest, null);
  return {
    automaticOutcomes: automaticCases.size,
    probableOutcomes: probable,
    unknownOutcomes: unknown,
    unresolvedExceptions: unresolved,
    automationCompletionPercent: cases.length ? Math.round((automaticCases.size / cases.length) * 1000) / 10 : 0,
    averageMerchantInputsPerCase: cases.length ? Math.round((merchantInputs / cases.length) * 100) / 100 : 0,
    reconciliationLagHours: latestException ? Math.round(((Date.now() - Date.parse(latestException)) / 3600000) * 10) / 10 : null,
  };
}
