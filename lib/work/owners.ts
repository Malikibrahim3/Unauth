import type { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from '@/lib/supabase/tables';

export type WorkOwner = {
  name: string;
  initials: string;
  role: string | null;
};

function nameFromEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const localPart = email.split('@')[0]?.replace(/[._+-]+/g, ' ').trim();
  if (!localPart) return null;
  return localPart.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Work rows store the stable user id, not a presentation name. Resolve the
 * small merchant-owned team once for the page so assignment rows can identify
 * the person without exposing an email address in the working table.
 */
export async function loadWorkOwnerDirectory(
  client: SupabaseClient,
  merchantId: string,
): Promise<Map<string, WorkOwner>> {
  const { data } = await client
    .from(TABLES.MERCHANT_MEMBERS)
    .select('user_id, invited_email, role')
    .eq('merchant_id', merchantId)
    .eq('invite_status', 'active');

  const entries = await Promise.all(
    ((data ?? []) as Array<{ user_id: string | null; invited_email: string | null; role: string | null }>)
      .filter((member) => Boolean(member.user_id))
      .map(async (member) => {
        let metadataName: string | null = null;
        try {
          const { data: authData } = await client.auth.admin.getUserById(member.user_id as string);
          const fullName = authData.user?.user_metadata?.full_name;
          metadataName = typeof fullName === 'string' && fullName.trim() ? fullName.trim() : null;
        } catch {
          // The membership email remains a safe fallback for restricted auth clients.
        }
        const name = metadataName ?? nameFromEmail(member.invited_email) ?? 'Workspace operator';
        return [member.user_id as string, { name, initials: initials(name), role: member.role }] as const;
      }),
  );

  return new Map(entries);
}
