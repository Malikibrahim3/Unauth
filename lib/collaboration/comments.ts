import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { recordDomainEvent } from '@/lib/events/domainEventStore';

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  mentionedUserIds: z.array(z.string().uuid()).max(25).default([]),
  evidenceItemId: z.string().uuid().nullable().optional(),
  recoveryCaseId: z.string().uuid().nullable().optional(),
  ruleEvaluationId: z.string().uuid().nullable().optional(),
});

export async function listCaseComments(client: SupabaseClient, merchantId: string, caseId: string) {
  const { data, error } = await client
    .from(TABLES.CASE_COMMENTS)
    .select('id,author_user_id,body,edited_at,deleted_at,created_at,comment_mentions(mentioned_user_id)')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`case_comments_read_failed: ${error.message}`);
  return data ?? [];
}

export async function createCaseComment(client: SupabaseClient, input: {
  merchantId: string;
  caseId: string;
  authorUserId: string;
  body: string;
  mentionedUserIds?: string[];
  evidenceItemId?: string | null;
  recoveryCaseId?: string | null;
  ruleEvaluationId?: string | null;
}) {
  const parsed = createCommentSchema.parse(input);
  const mentionedUserIds = [...new Set(parsed.mentionedUserIds)].filter((id) => id !== input.authorUserId);
  if (mentionedUserIds.length) {
    const { data: members, error } = await client
      .from(TABLES.MERCHANT_MEMBERS)
      .select('user_id')
      .eq('merchant_id', input.merchantId)
      .eq('invite_status', 'active')
      .in('user_id', mentionedUserIds);
    if (error) throw new Error(`comment_mentions_membership_failed: ${error.message}`);
    if (new Set((members ?? []).map((member: { user_id: string | null }) => member.user_id).filter(Boolean)).size !== mentionedUserIds.length) {
      throw new Error('comment_mentions_non_member');
    }
  }

  const { data: comment, error } = await client.from(TABLES.CASE_COMMENTS).insert({
    merchant_id: input.merchantId,
    support_payout_case_id: input.caseId,
    author_user_id: input.authorUserId,
    body: parsed.body,
    evidence_item_id: parsed.evidenceItemId ?? null,
    recovery_case_id: parsed.recoveryCaseId ?? null,
    rule_evaluation_id: parsed.ruleEvaluationId ?? null,
  }).select('id,author_user_id,body,created_at').single();
  if (error) throw new Error(`case_comment_create_failed: ${error.message}`);

  const { error: auditError } = await client.from(TABLES.CASE_COMMENT_EVENTS).insert({
    merchant_id: input.merchantId,
    comment_id: comment.id,
    event_type: 'created',
    actor_user_id: input.authorUserId,
    body_snapshot: parsed.body,
  });
  if (auditError) throw new Error(`case_comment_audit_failed: ${auditError.message}`);

  if (mentionedUserIds.length) {
    const { error: mentionError } = await client.from(TABLES.COMMENT_MENTIONS).insert(mentionedUserIds.map((userId) => ({
      merchant_id: input.merchantId,
      comment_id: comment.id,
      mentioned_user_id: userId,
    })));
    if (mentionError) throw new Error(`comment_mentions_create_failed: ${mentionError.message}`);
    const { error: notificationError } = await client.from(TABLES.NOTIFICATIONS).insert(mentionedUserIds.map((userId) => ({
      merchant_id: input.merchantId,
      recipient_user_id: userId,
      kind: 'mention',
      title: 'You were mentioned in a payout case',
      body: parsed.body.slice(0, 240),
      target_href: `/claims/${input.caseId}`,
      deduplication_key: `comment-mention:${comment.id}:${userId}`,
    })));
    if (notificationError) throw new Error(`comment_notifications_create_failed: ${notificationError.message}`);
  }

  await recordDomainEvent(client, {
    merchantId: input.merchantId,
    eventType: 'case.comment_created',
    aggregateType: 'case',
    aggregateId: input.caseId,
    idempotencyKey: `case-comment-created:${comment.id}`,
    actorType: 'user',
    actorId: input.authorUserId,
    payload: { comment_id: comment.id, mention_count: mentionedUserIds.length },
  });
  return comment;
}
