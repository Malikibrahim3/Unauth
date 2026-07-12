import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getConnector } from '@/lib/connectors/registry';
import { resolveCapabilityAvailability } from '@/lib/connectors/runtime';
import type { ConnectorActionPreview, ConnectorActionRequest } from '@/lib/connectors/actions/types';

async function connection(client: SupabaseClient, merchantId: string, connectionId: string) {
  const { data, error } = await client.from(TABLES.MERCHANT_INTEGRATIONS).select('id,provider_id,provider_account_name,status,granted_scopes,writeback_enabled').eq('merchant_id', merchantId).eq('id', connectionId).maybeSingle();
  if (error) throw new Error(`connector_action_connection_failed: ${error.message}`); if (!data) throw new Error('connector_action_connection_not_found'); return data;
}
export async function previewConnectorAction(client: SupabaseClient, merchantId: string, request: ConnectorActionRequest): Promise<ConnectorActionPreview> {
  const row = await connection(client, merchantId, request.connectionId); const adapter = getConnector(row.provider_id); const capability = adapter?.manifest.capabilities.find((item) => item.id === request.capabilityId);
  if (!adapter || !capability) return { provider: row.provider_id, account: row.provider_account_name ?? row.provider_id, capabilityId: request.capabilityId, externalRecordId: request.externalRecordId, availability: 'unsupported', reason: 'Connector action is not implemented.', risk: 'high', reversible: false };
  const runtime = resolveCapabilityAvailability(capability, { status: row.status, grantedScopes: row.granted_scopes ?? [], writebackEnabled: row.writeback_enabled });
  return { provider: row.provider_id, account: row.provider_account_name ?? row.provider_id, capabilityId: request.capabilityId, externalRecordId: request.externalRecordId, availability: adapter.executeAction ? runtime.availability : 'unsupported', reason: adapter.executeAction ? runtime.availabilityReason : 'This connector provides a manual completion path for this action.', risk: capability.risk, reversible: request.capabilityId !== 'tickets.write_note' };
}
export async function executeConnectorAction(client: SupabaseClient, merchantId: string, actorUserId: string, request: ConnectorActionRequest) {
  const prior = await client.from(TABLES.CONNECTOR_ACTION_RUNS).select('*').eq('merchant_id', merchantId).eq('idempotency_key', request.idempotencyKey).maybeSingle(); if (prior.error) throw prior.error; if (prior.data) return prior.data;
  const preview = await previewConnectorAction(client, merchantId, request); const row = await connection(client, merchantId, request.connectionId); const adapter = getConnector(row.provider_id);
  if (preview.risk === 'high') throw new Error('connector_action_high_risk_forbidden');
  let status = 'manual_required'; let result: Record<string, unknown> = { preview, manual_summary: `${request.capabilityId} on ${request.externalRecordId}` };
  if (preview.availability === 'enabled' && adapter?.executeAction) { const executed = await adapter.executeAction({ client, merchantId, connectionId: request.connectionId }, { id: request.idempotencyKey, capabilityId: request.capabilityId, payload: { ...request.payload, externalRecordId: request.externalRecordId } }); status = executed.ok ? 'completed' : 'failed'; result = { preview, ...executed }; }
  const { data, error } = await client.from(TABLES.CONNECTOR_ACTION_RUNS).insert({ merchant_id: merchantId, connection_id: request.connectionId, support_payout_case_id: request.caseId ?? null, capability_id: request.capabilityId, external_record_id: request.externalRecordId, payload: request.payload, status, idempotency_key: request.idempotencyKey, actor_user_id: actorUserId, result, completed_at: new Date().toISOString() }).select().single();
  if (error) throw new Error(`connector_action_record_failed: ${error.message}`); return data;
}
