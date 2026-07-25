import type { DomainEventHandler } from '@/lib/events/handlers/types';
import { TABLES } from '@/lib/supabase/tables';
import { runWorkflowForEvent } from '@/lib/workflows/run';
import { env } from '@/lib/utils/env';

export const workflowHandler: DomainEventHandler = async (client, event) => {
  if (env.WORKFLOW_PUBLICATION_ENABLED !== 'true') {
    return { applied: false, detail: 'workflows:publication_gated' };
  }
  const { data, error } = await client.from(TABLES.WORKFLOW_DEFINITIONS).select('*').eq('merchant_id', event.merchant_id).eq('trigger_event_type', event.event_type).eq('active', true).order('version', { ascending: true });
  if (error) throw new Error(`workflow_definitions_read_failed: ${error.message}`);
  let applied = 0;
  for (const definition of data ?? []) if ((await runWorkflowForEvent(client, definition, event)).applied) applied += 1;
  return { applied: applied > 0, detail: `workflows:${applied}` };
};
