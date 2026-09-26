import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export type ImpactProof = { merchantId: string; revision: string; target: string; proposedHash: string; expiresAt: number; evaluatedCount: number };
function signature(payload: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Preview signing is unavailable.');
  return createHmac('sha256', secret).update(`unauth-policy-impact-v2:${payload}`).digest('base64url');
}
export function signImpactProof(proof: ImpactProof): string {
  const payload = Buffer.from(JSON.stringify(proof)).toString('base64url');
  return `${payload}.${signature(payload)}`;
}
export function verifyImpactProof(token: unknown, merchantId: string, target: string): ImpactProof | null {
  if (typeof token !== 'string' || token.length > 4096) return null;
  try {
    const [payload, supplied, extra] = token.split('.');
    if (!payload || !supplied || extra) return null;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(supplied);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const proof = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ImpactProof;
    if (proof.merchantId !== merchantId || proof.target !== target || !Number.isFinite(proof.expiresAt) || proof.expiresAt <= Date.now()) return null;
    return proof;
  } catch { return null; }
}
export async function readImpactRevision(client: SupabaseClient, merchantId: string): Promise<string> {
  const { data, error } = await client.from('merchant_rule_input_versions').select('revision').eq('merchant_id', merchantId).maybeSingle();
  if (error) throw new Error('Policy preview version tracking is unavailable. Install the P08 migration before using previews.');
  return String(data?.revision ?? 0);
}
