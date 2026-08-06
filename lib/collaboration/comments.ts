import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { TABLES } from '@/lib/supabase/tables';
import { recordDomainEvent } from '@/lib/events/domainEventStore';
import { filterInAppNotificationRecipients } from '@/lib/collaboration/notificationPreferences';

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
    // Respect each recipient's in-app preference for the 'mention' kind (default on).
    const inAppRecipients = await filterInAppNotificationRecipients(client, input.merchantId, mentionedUserIds, 'mention');
    if (inAppRecipients.length) {
      const { error: notificationError } = await client.from(TABLES.NOTIFICATIONS).insert(inAppRecipients.map((userId) => ({
        merchant_id: input.merchantId,
        recipient_user_id: userId,
        kind: 'mention',
        title: 'You were mentioned in a payout case',
        body: parsed.body.slice(0, 240),
        target_href: `/cases/${input.caseId}`,
        deduplication_key: `comment-mention:${comment.id}:${userId}`,
      })));
      if (notificationError) throw new Error(`comment_notifications_create_failed: ${notificationError.message}`);
    }
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

export const editCommentSchema = z.object({ body: z.string().trim().min(1).max(10_000) });

/** Load a comment scoped to merchant + case for authorization. */
async function loadComment(client: SupabaseClient, merchantId: string, caseId: string, commentId: string) {
  const { data, error } = await client
    .from(TABLES.CASE_COMMENTS)
    .select('id,author_user_id,support_payout_case_id,deleted_at')
    .eq('merchant_id', merchantId)
    .eq('support_payout_case_id', caseId)
    .eq('id', commentId)
    .maybeSingle();
  if (error) throw new Error(`case_comment_load_failed: ${error.message}`);
  return data as { id: string; author_user_id: string | null; support_payout_case_id: string; deleted_at: string | null } | null;
}

/**
 * Edit a comment's body. Only the author may edit, and only while the comment is
 * live. Stamps `edited_at` and appends an immutable 'edited' audit event holding
 * the new body snapshot; the prior snapshot is preserved by earlier audit rows.
 */
export async function editCaseComment(client: SupabaseClient, input: {
  merchantId: string; caseId: string; commentId: string; actorUserId: string; body: string;
}) {
  const parsed = editCommentSchema.parse({ body: input.body });
  const existing = await loadComment(client, input.merchantId, input.caseId, input.commentId);
  if (!existing) return { ok: false as const, reason: 'not_found' };
  if (existing.deleted_at) return { ok: false as const, reason: 'deleted' };
  if (existing.author_user_id !== input.actorUserId) return { ok: false as const, reason: 'forbidden' };

  const editedAt = new Date().toISOString();
  const { data: updated, error } = await client
    .from(TABLES.CASE_COMMENTS)
    .update({ body: parsed.body, edited_at: editedAt, updated_at: editedAt })
    .eq('merchant_id', input.merchantId)
    .eq('id', input.commentId)
    .select('id,author_user_id,body,edited_at,created_at')
    .single();
  if (error) throw new Error(`case_comment_edit_failed: ${error.message}`);

  const { error: auditError } = await client.from(TABLES.CASE_COMMENT_EVENTS).insert({
    merchant_id: input.merchantId, comment_id: input.commentId, event_type: 'edited',
    actor_user_id: input.actorUserId, body_snapshot: parsed.body,
  });
  if (auditError) throw new Error(`case_comment_audit_failed: ${auditError.message}`);

  await recordDomainEvent(client, {
    merchantId: input.merchantId, eventType: 'case.comment_edited', aggregateType: 'case',
    aggregateId: input.caseId, idempotencyKey: `case-comment-edited:${input.commentId}:${editedAt}`,
    actorType: 'user', actorId: input.actorUserId, payload: { comment_id: input.commentId },
  });
  return { ok: true as const, comment: updated };
}

/**
 * Soft-delete a comment (author only). The row is retained with `deleted_at`
 * set and the body redacted; the audit trail (created/edited snapshots) is
 * preserved via the append-only event log.
 */
export async function deleteCaseComment(client: SupabaseClient, input: {
  merchantId: string; caseId: string; commentId: string; actorUserId: string;
}) {
  const existing = await loadComment(client, input.merchantId, input.caseId, input.commentId);
  if (!existing) return { ok: false as const, reason: 'not_found' };
  if (existing.deleted_at) return { ok: true as const, alreadyDeleted: true };
  if (existing.author_user_id !== input.actorUserId) return { ok: false as const, reason: 'forbidden' };

  const deletedAt = new Date().toISOString();
  const { error } = await client
    .from(TABLES.CASE_COMMENTS)
    .update({ body: '[deleted]', deleted_at: deletedAt, updated_at: deletedAt })
    .eq('merchant_id', input.merchantId)
    .eq('id', input.commentId);
  if (error) throw new Error(`case_comment_delete_failed: ${error.message}`);

  const { error: auditError } = await client.from(TABLES.CASE_COMMENT_EVENTS).insert({
    merchant_id: input.merchantId, comment_id: input.commentId, event_type: 'deleted',
    actor_user_id: input.actorUserId, body_snapshot: null,
  });
  if (auditError) throw new Error(`case_comment_audit_failed: ${auditError.message}`);

  await recordDomainEvent(client, {
    merchantId: input.merchantId, eventType: 'case.comment_deleted', aggregateType: 'case',
    aggregateId: input.caseId, idempotencyKey: `case-comment-deleted:${input.commentId}`,
    actorType: 'user', actorId: input.actorUserId, payload: { comment_id: input.commentId },
  });
  return { ok: true as const };
}
