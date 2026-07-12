import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { getCandidate } from '@/lib/relationships/candidateStore';
import { resolveMatch } from '@/lib/relationships/resolveMatch';

const bodySchema = z.object({
  /** Candidate id to select, or null to reject all (leave unmatched). */
  selectedCandidateId: z.string().uuid().nullable().optional(),
  reason: z.string().trim().max(2000).optional(),
});

/**
 * Resolve an ambiguous/probable match. The `[id]` path segment is the subject's
 * anchor candidate id — resolution operates on that candidate's whole subject.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, PERMISSIONS.SUBMIT_PAYOUT_DECISIONS);
  if (denied) return denied;

  const { id } = await params;
  const anchor = await getCandidate(serviceClient, ctx.merchantId, id);
  if (!anchor) return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid resolution body' }, { status: 400 });

  // A supplied selected candidate must belong to the same subject.
  const selectedId = parsed.data.selectedCandidateId ?? null;
  if (selectedId) {
    const selected = await getCandidate(serviceClient, ctx.merchantId, selectedId);
    if (
      !selected ||
      selected.subject_entity_type !== anchor.subject_entity_type ||
      selected.subject_entity_id !== anchor.subject_entity_id
    ) {
      return NextResponse.json({ error: 'Candidate not found for subject' }, { status: 400 });
    }
  }

  try {
    const result = await resolveMatch(serviceClient, {
      merchantId: ctx.merchantId,
      subjectEntityType: anchor.subject_entity_type,
      subjectEntityId: anchor.subject_entity_id,
      selectedCandidateId: selectedId,
      reason: parsed.data.reason ?? null,
      resolvedBy: user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'resolve_failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
