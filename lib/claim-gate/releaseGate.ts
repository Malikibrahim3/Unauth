import { env } from '@/lib/utils/env';

export function isPublicClaimGateEnabled(): boolean {
  return env.PUBLIC_CLAIM_GATE_ENABLED === 'true';
}

export function publicClaimGateUnavailableBody() {
  return {
    error: 'public_claim_gate_unavailable',
    message:
      'The legacy claim gate is disabled until all case lifecycle writes use the canonical transition contract.',
    canonical_path: 'Use authenticated case intake and explicit case evaluation.',
  };
}
