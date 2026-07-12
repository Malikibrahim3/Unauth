/**
 * Determines whether a helpdesk ticket should be treated as claim-like for
 * recommendation gating (widget must not show identity-only recommendations).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaimResolutionResult } from '@/lib/claims/decision/resolveClaim';
import { DEFAULT_TAG_CONFIGS } from '@/lib/support/intake/tagClaimDetection';
import { detectClaimFromKeywords } from '@/lib/support/intake/tagClaimDetection';

function normaliseTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => (typeof t === 'string' ? t.trim().toLowerCase() : ''))
    .filter(Boolean);
}

export function ticketTagsIndicateClaim(provider: string, tags: unknown): boolean {
  const config = DEFAULT_TAG_CONFIGS[provider as keyof typeof DEFAULT_TAG_CONFIGS]
    ?? DEFAULT_TAG_CONFIGS.gorgias;
  const tagSet = new Set(normaliseTags(tags));
  const triggers = config.claim_trigger_tags.map((t) => t.trim().toLowerCase());
  return triggers.some((t) => tagSet.has(t));
}

export function isTicketClaimLike(input: {
  provider?: string | null;
  tags?: unknown;
  messages?: Array<{ body?: string | null; body_text?: string | null; from_agent?: boolean | null }>;
}): boolean {
  const provider = input.provider ?? 'gorgias';
  if (ticketTagsIndicateClaim(provider, input.tags ?? [])) return true;
  if (input.messages && input.messages.length > 0) {
    const keyword = detectClaimFromKeywords({ tags: [], messages: input.messages });
    if (keyword) return true;
  }
  return false;
}

/**
 * Whether the Gorgias widget should treat this ticket as claim-like for
 * recommendation gating (blocks identity-only fallback recommendations).
 */
export async function inferWidgetTicketClaimLike(
  client: SupabaseClient,
  input: {
    merchantId: string;
    ticketExternalId: string | null;
    resolution: ClaimResolutionResult;
  },
): Promise<boolean> {
  if (input.resolution.status === 'resolved' || input.resolution.status === 'created') {
    return true;
  }
  if (input.resolution.status === 'ambiguous') return true;
  if (input.resolution.status === 'not_found' && input.resolution.sourceTicketId) {
    return true;
  }

  if (!input.ticketExternalId?.trim()) return false;

  const { data } = await client
    .from('source_tickets')
    .select('tags, subject, provider')
    .eq('merchant_id', input.merchantId)
    .eq('external_id', input.ticketExternalId.trim())
    .maybeSingle();

  if (!data) return false;

  const subject = typeof data.subject === 'string' ? data.subject : null;
  return isTicketClaimLike({
    provider: data.provider as string,
    tags: data.tags,
    messages: subject ? [{ body: subject }] : [],
  });
}
