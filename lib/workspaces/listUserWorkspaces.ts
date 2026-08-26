import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';
import type { Role } from '@/lib/permissions';

export type UserWorkspace = {
  id: string;
  name: string;
  role: Role;
};

/**
 * Lists only active memberships for the authenticated user. Workspace names
 * are resolved in a second query so a missing merchant row cannot broaden the
 * membership result through an implicit join.
 */
export async function listUserWorkspaces(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<UserWorkspace[]> {
  const { data: memberships, error: membershipError } = await serviceClient
    .from(TABLES.MERCHANT_MEMBERS)
    .select('merchant_id, role')
    .eq('user_id', userId)
    .eq('invite_status', 'active');

  if (membershipError || !memberships?.length) return [];

  const merchantIds = [...new Set(memberships.map((row) => row.merchant_id))];
  const { data: merchants, error: merchantError } = await serviceClient
    .from(TABLES.MERCHANTS)
    .select('id, name')
    .in('id', merchantIds);

  if (merchantError) return [];

  const names = new Map((merchants ?? []).map((merchant) => [merchant.id, merchant.name]));
  return memberships
    .map((membership) => ({
      id: membership.merchant_id,
      name: names.get(membership.merchant_id)?.trim() || 'Unnamed workspace',
      role: membership.role as Role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
