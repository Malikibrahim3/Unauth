function sanitize(input: string): string {
  return input.replace(/[<>]/g, '').trim();
}

async function safePost(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Permission denied' };
    return { ok: false, message: (data as any).error ?? 'Request failed' };
  }
  return { ok: true, data };
}

export async function submitClaim(input: Record<string, unknown>) {
  const payload = {
    ...input,
    customer_claim_reason: typeof input.customer_claim_reason === 'string' ? sanitize(input.customer_claim_reason) : input.customer_claim_reason,
    normalized_reason: typeof input.normalized_reason === 'string' ? sanitize(input.normalized_reason) : input.normalized_reason,
  };
  const result = await safePost('/api/claims', payload);
  if (!result.ok) return { message: result.message, claimId: null };
  return { message: 'Claim saved', claimId: (result.data as any)?.claim?.id ?? null };
}

export async function submitOutcome(claimId: string, input: Record<string, unknown>) {
  const payload = { ...input, notes: typeof input.notes === 'string' ? sanitize(input.notes) : input.notes };
  const result = await safePost(`/api/claims/${claimId}/outcome`, payload);
  return { message: result.ok ? 'Outcome saved' : result.message };
}

export async function submitEvidence(claimId: string, input: Record<string, unknown>) {
  const payload = {
    ...input,
    evidence_url: typeof input.evidence_url === 'string' ? sanitize(input.evidence_url) : input.evidence_url,
    evidence_hash: typeof input.evidence_hash === 'string' ? sanitize(input.evidence_hash) : input.evidence_hash,
  };
  const result = await safePost(`/api/claims/${claimId}/evidence`, payload);
  return { message: result.ok ? 'Evidence saved' : result.message };
}
