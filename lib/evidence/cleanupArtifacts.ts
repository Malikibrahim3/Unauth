import type { SupabaseClient } from '@supabase/supabase-js';
import { STORAGE_BUCKETS, TABLES } from '@/lib/supabase/tables';

export async function deleteEvidencePackageArtifacts(
  scopedService: SupabaseClient,
  serviceRole: SupabaseClient,
  input: { packageId: string; storagePath: string | null },
): Promise<{ storageRemoved: boolean; dbRemoved: boolean }> {
  let storageRemoved = true;
  if (input.storagePath) {
    const { error } = await serviceRole.storage
      .from(STORAGE_BUCKETS.EVIDENCE_PACKAGES)
      .remove([input.storagePath]);
    storageRemoved = !error;
    if (error) {
      console.error('[evidence] storage cleanup failed:', error.message, input.storagePath);
    }
  }

  const { error: dbError } = await scopedService
    .from(TABLES.EVIDENCE_PACKAGES)
    .delete()
    .eq('id', input.packageId);

  if (dbError) {
    console.error('[evidence] db cleanup failed:', dbError.message, input.packageId);
  }

  return { storageRemoved, dbRemoved: !dbError };
}
