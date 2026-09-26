import { isDeepStrictEqual } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import { getConnector } from '@/lib/connectors/registry';
import { resolveCapabilityAvailability } from '@/lib/connectors/runtime';
import type { ConnectorActionPreview, ConnectorActionRequest } from '@/lib/connectors/actions/types';
import { env } from '@/lib/utils/env';

async function connection(client: SupabaseClient, merchantId: string, connectionId: string) {
  const { data, error } = await client.from(TABLES.MERCHANT_INTEGRATIONS)
    .select('id,provider_id,provider_account_name,status,granted_scopes,writeback_enabled')
    .eq('merchant_id', merchantId).eq('id', connectionId).maybeSingle();
  if (error) throw new Error(`connector_action_connection_failed: ${error.message}`);
  if (!data) throw new Error('connector_action_connection_not_found');
  return data;
}

export async function previewConnectorAction(
  client: SupabaseClient, merchantId: string, request: ConnectorActionRequest,
): Promise<ConnectorActionPreview> {
  const row = await connection(client, merchantId, request.connectionId);
  const adapter = getConnector(row.provider_id);
  const capability = adapter?.manifest.capabilities.find((item) => item.id === request.capabilityId);
  if (!adapter || !capability) return {
    provider: row.provider_id, account: row.provider_account_name ?? row.provider_id,
    capabilityId: request.capabilityId, externalRecordId: request.externalRecordId,
    availability: 'unsupported', reason: 'Connector action is not implemented.',
    risk: 'high', reversible: false,
  };
  if (row.provider_id === 'gorgias' && request.capabilityId.startsWith('tickets.write_')
    && env.GORGIAS_BOUNDED_WRITEBACK_ENABLED !== 'true') return {
    provider: row.provider_id, account: row.provider_account_name ?? row.provider_id,
    capabilityId: request.capabilityId, externalRecordId: request.externalRecordId,
    availability: 'disabled', reason: 'Gorgias note and tag writeback is gated off until a controlled provider run is accepted.',
    risk: capability.risk, reversible: false,
  };
  const runtime = resolveCapabilityAvailability(capability, {
    status: row.status, grantedScopes: row.granted_scopes ?? [], writebackEnabled: row.writeback_enabled,
  });
  return {
    provider: row.provider_id, account: row.provider_account_name ?? row.provider_id,
    capabilityId: request.capabilityId, externalRecordId: request.externalRecordId,
    availability: adapter.executeAction ? runtime.availability : 'unsupported',
    reason: adapter.executeAction ? runtime.availabilityReason : 'This connector provides a manual completion path for this action.',
    risk: capability.risk, reversible: request.capabilityId !== 'tickets.write_note',
  };
}

function assertSameRequest(prior: Record<string, unknown>, actorUserId: string, request: ConnectorActionRequest) {
  if (prior.connection_id !== request.connectionId
    || prior.support_payout_case_id !== (request.caseId ?? null)
    || prior.capability_id !== request.capabilityId
    || prior.external_record_id !== request.externalRecordId
    || prior.actor_user_id !== actorUserId
    || !isDeepStrictEqual(prior.payload, request.payload)) {
    throw new Error('connector_action_idempotency_conflict');
  }
}

async function existingRun(client: SupabaseClient, merchantId: string, idempotencyKey: string) {
  const { data, error } = await client.from(TABLES.CONNECTOR_ACTION_RUNS).select('*')
    .eq('merchant_id', merchantId).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (error) throw error;
  return data;
}

async function assertCaseScope(client: SupabaseClient, merchantId: string, caseId: string | null | undefined) {
  if (!caseId) return;
  const { data, error } = await client.from(TABLES.MERCHANT_CLAIMS).select('id')
    .eq('merchant_id', merchantId).eq('id', caseId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('connector_action_case_not_found');
}

/** Persist and claim one intent before any provider call. A replay never resends it. */
export async function executeConnectorAction(
  client: SupabaseClient, merchantId: string, actorUserId: string, request: ConnectorActionRequest,
) {
  const prior = await existingRun(client, merchantId, request.idempotencyKey);
  if (prior) {
    assertSameRequest(prior, actorUserId, request);
    return prior;
  }

  const preview = await previewConnectorAction(client, merchantId, request);
  if (preview.risk === 'high') throw new Error('connector_action_high_risk_forbidden');
  if (preview.availability !== 'enabled') throw new Error('connector_action_unavailable');
  await assertCaseScope(client, merchantId, request.caseId);
  const row = await connection(client, merchantId, request.connectionId);
  const adapter = getConnector(row.provider_id);
  if (!adapter?.executeAction) throw new Error('connector_action_unavailable');
  const { data: intent, error: insertError } = await client.from(TABLES.CONNECTOR_ACTION_RUNS).insert({
    merchant_id: merchantId, connection_id: request.connectionId,
    support_payout_case_id: request.caseId ?? null,
    capability_id: request.capabilityId, external_record_id: request.externalRecordId,
    payload: request.payload, status: 'previewed', action_state: 'authorised',
    idempotency_key: request.idempotencyKey, actor_user_id: actorUserId,
    result: { preview },
  }).select().single();
  if (insertError) {
    if (insertError.code === '23505') {
      const raced = await existingRun(client, merchantId, request.idempotencyKey);
      if (raced) {
        assertSameRequest(raced, actorUserId, request);
        return raced;
      }
    }
    throw insertError;
  }
  // Conditional persistence lets only one concurrent request claim dispatch.
  const { data: claimed, error: claimError } = await client.from(TABLES.CONNECTOR_ACTION_RUNS)
    .update({ action_state: 'provider_processing' })
    .eq('merchant_id', merchantId).eq('id', intent.id).eq('action_state', 'authorised')
    .select().maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return await existingRun(client, merchantId, request.idempotencyKey);

  try {
    const executed = await adapter.executeAction(
      { client, merchantId, connectionId: request.connectionId },
      { id: request.idempotencyKey, capabilityId: request.capabilityId,
        payload: { ...request.payload, externalRecordId: request.externalRecordId } },
    );
    // An adapter acknowledgement alone is not a source-observed outcome.
    const { data, error } = await client.from(TABLES.CONNECTOR_ACTION_RUNS).update({
      action_state: executed.ok ? 'provider_accepted' : 'indeterminate',
      result: { preview, provider_acknowledged: executed.ok, reversible: executed.reversible,
        ...(executed.ok ? {} : { reason: 'Provider result needs verification.' }) },
    }).eq('merchant_id', merchantId).eq('id', intent.id).eq('action_state', 'provider_processing')
      .select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    // A timeout or failed result-write can follow a successful external call.
    // Keep the intent for verification and never automatically send it again.
    const { data, error: recordError } = await client.from(TABLES.CONNECTOR_ACTION_RUNS).update({
      action_state: 'indeterminate',
      result: { preview, provider_acknowledged: false, reason: 'Provider result needs verification.' },
    }).eq('merchant_id', merchantId).eq('id', intent.id).eq('action_state', 'provider_processing')
      .select().maybeSingle();
    if (recordError) throw recordError;
    if (data) return data;
    throw error;
  }
}
