import { createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';

export async function consumeEvidenceDownloadToken(
  tokenRowId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient();
  const nowIso = new Date().toISOString();

  const { data: consumedRow, error: consumeError } = await service
    .from(TABLES.EVIDENCE_DOWNLOAD_TOKENS)
    .update({ used_at: nowIso })
    .eq('id', tokenRowId)
    .is('used_at', null)
    .select('id')
    .maybeSingle() as unknown as { data: { id: string } | null; error: { message: string } | null };

  if (consumeError) {
    return { ok: false, error: 'Failed to consume token' };
  }
  if (!consumedRow) {
    return { ok: false, error: 'Token already used' };
  }
  return { ok: true };
}
