import { createHash } from 'node:crypto';

export const visualFixtureNamespace = process.env.UNAUTH_VISUAL_FIXTURE_NAMESPACE?.trim() || '';
if (visualFixtureNamespace) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(visualFixtureNamespace)) throw new Error('Visual fixture namespace must be a run-owned UUID.');
  if (process.env.RELEASE_E2E_LOCAL !== '1' || process.env.VERCEL_ENV === 'production') throw new Error('Isolated visual fixtures require local acceptance mode.');
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL']) {
    if (!process.env[name]) continue;
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(process.env[name]).hostname)) throw new Error('Isolated visual fixture refused non-loopback Supabase.');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('Explicit loopback Supabase URL is required.');
}

export function visualFixtureId(original) {
  if (!visualFixtureNamespace) return original;
  const hex = createHash('sha256').update(`${visualFixtureNamespace}:${original}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function visualFixtureEmail(original, role) {
  return visualFixtureNamespace ? `${role}-${visualFixtureNamespace}@example.invalid` : original;
}
