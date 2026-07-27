function sanitize(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

type JsonRecord = Record<string, unknown>;
type SafePostResult =
  | { ok: true; data: JsonRecord }
  | { ok: false; message: string; data: JsonRecord };

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function newIdempotencyKey(scope: string): string {
  return `${scope}:${crypto.randomUUID()}`;
}

async function safePost(
  url: string,
  body: JsonRecord,
  options: { idempotencyKey?: string } = {},
): Promise<SafePostResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = record(await res.json().catch(() => ({})));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Permission denied', data };
    return { ok: false, message: typeof data.error === 'string' ? data.error : 'Request failed', data };
  }
  return { ok: true, data };
}

export async function submitClaim(input: JsonRecord) {
  const payload = {
    ...input,
    customer_claim_reason: typeof input.customer_claim_reason === 'string' ? sanitize(input.customer_claim_reason) : input.customer_claim_reason,
    normalized_reason: typeof input.normalized_reason === 'string' ? sanitize(input.normalized_reason) : input.normalized_reason,
  };
  const result = await safePost('/api/claims', payload);
  if (!result.ok) {
    return {
      message: result.message,
      claimId: null,
      duplicateClaimId: typeof result.data.existingClaimId === 'string' ? result.data.existingClaimId : null,
      duplicateCode: typeof result.data.code === 'string' ? result.data.code : null,
    };
  }
  const claim = record(result.data.claim);
  return { message: 'Claim saved', claimId: typeof claim.id === 'string' ? claim.id : null };
}

export async function submitOutcome(
  claimId: string,
  input: JsonRecord,
  idempotencyKey = newIdempotencyKey(`case-decision:${claimId}`),
) {
  const payload = { ...input, notes: typeof input.notes === 'string' ? sanitize(input.notes) : input.notes };
  const result = await safePost(`/api/claims/${claimId}/outcome`, payload, { idempotencyKey });
  return { message: result.ok ? 'Decision saved' : result.message, idempotencyKey, data: result.data };
}

export async function submitEvidence(claimId: string, input: JsonRecord) {
  const payload = {
    ...input,
    evidence_url: typeof input.evidence_url === 'string' ? sanitize(input.evidence_url) : input.evidence_url,
    evidence_hash: typeof input.evidence_hash === 'string' ? sanitize(input.evidence_hash) : input.evidence_hash,
  };
  const result = await safePost(`/api/claims/${claimId}/evidence`, payload);
  return { message: result.ok ? 'Evidence saved' : result.message };
}

export async function updateClaimStatus(claimId: string, input: JsonRecord) {
  const payload = { ...input, note: typeof input.note === 'string' ? sanitize(input.note) : input.note };
  const result = await safePost(`/api/claims/${claimId}/status`, payload);
  return { message: result.ok ? 'Status updated' : result.message };
}

export async function reopenClaim(claimId: string, input: JsonRecord) {
  const payload = { ...input, note: typeof input.note === 'string' ? sanitize(input.note) : input.note };
  const result = await safePost(`/api/claims/${claimId}/reopen`, payload);
  return { message: result.ok ? 'Claim reopened' : result.message };
}

export async function reverseClaimDecision(
  claimId: string,
  input: JsonRecord,
  idempotencyKey = newIdempotencyKey(`case-decision-reversal:${claimId}`),
) {
  const payload = { ...input, note: typeof input.note === 'string' ? sanitize(input.note) : input.note };
  const result = await safePost(`/api/claims/${claimId}/reverse`, payload, { idempotencyKey });
  return { message: result.ok ? 'Decision reversed' : result.message, idempotencyKey, data: result.data };
}

export async function recordCustomerResponseCopied(claimId: string, input: JsonRecord) {
  const result = await safePost(`/api/claims/${claimId}/customer-response-copied`, input);
  return { message: result.ok ? 'Customer response copied' : result.message };
}

export async function markClaimViewed(claimId: string) {
  const result = await safePost(`/api/claims/${claimId}/view`, {});
  return { message: result.ok ? 'Claim viewed' : result.message };
}

/**
 * RUN-04: `mode: 'read'` is the default because opening a case is a read.
 * `mode: 'refresh'` is the explicit merchant command and is the only path that
 * writes.
 */
export async function fetchClaimDecision(claimId: string, mode: 'read' | 'refresh' = 'read') {
  const res = await fetch(`/api/claims/${claimId}/decision`, { method: mode === 'refresh' ? 'POST' : 'GET' });
  const data = record(await res.json().catch(() => ({})));
  if (!res.ok) {
    return { ok: false as const, message: typeof data.error === 'string' ? data.error : 'Failed to load recommendation', data: null };
  }
  return { ok: true as const, data };
}

export async function assignClaim(claimId: string, action: 'assign_to_me' | 'unassign') {
  const result = await safePost(`/api/claims/${claimId}/assignment`, { action });
  return { message: result.ok ? 'Assignment updated' : result.message };
}

export async function snoozeClaim(claimId: string, input: { snoozed_until: string | null; reason?: string | null }) {
  const result = await safePost(`/api/claims/${claimId}/snooze`, input);
  return { message: result.ok ? 'Follow-up updated' : result.message };
}
