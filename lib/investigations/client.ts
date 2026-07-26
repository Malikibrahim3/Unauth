type JsonRecord = Record<string, unknown>;

export type InvestigationMutationResult =
  | { ok: true; data: JsonRecord }
  | {
      ok: false;
      error: string;
      code: string | null;
      status: number;
      data: JsonRecord;
    };

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function newInvestigationIdempotencyKey(scope: string): string {
  const id = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${scope}:${id}`;
}

export async function mutateInvestigation(
  url: string,
  body: JsonRecord,
  idempotencyKey: string,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<InvestigationMutationResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const data = asRecord(await response.json().catch(() => ({})));
    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof data.error === 'string'
            ? data.error
            : 'The investigation could not be updated.',
        code: typeof data.code === 'string' ? data.code : null,
        status: response.status,
        data,
      };
    }
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: 'The investigation service is unavailable. Your changes were not recorded.',
      code: 'network_error',
      status: 0,
      data: {},
    };
  }
}
