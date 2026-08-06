/* PROVISIONAL — NOT CERTIFICATION EVIDENCE. Generated-shape P00 contract. */
export const P00_BOOTSTRAP_CONTRACT_VERSION = 'p00-bootstrap.v1' as const;

export type P00BootstrapResponse = {
  contractVersion: typeof P00_BOOTSTRAP_CONTRACT_VERSION;
  status: 'ready';
  evidenceClass: 'P00_ACCEPTANCE';
  traceId: string;
};

export function decodeP00BootstrapResponse(value: unknown): P00BootstrapResponse {
  if (!value || typeof value !== 'object') throw new Error('p00_contract_invalid');
  const input = value as Record<string, unknown>;
  if (
    input.contractVersion !== P00_BOOTSTRAP_CONTRACT_VERSION ||
    input.status !== 'ready' ||
    input.evidenceClass !== 'P00_ACCEPTANCE' ||
    typeof input.traceId !== 'string' ||
    !/^p00-[a-f0-9]{12}$/.test(input.traceId)
  ) {
    throw new Error('p00_contract_invalid');
  }
  return input as P00BootstrapResponse;
}
