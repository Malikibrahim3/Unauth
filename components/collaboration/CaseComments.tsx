'use client';

import { useEffect, useState } from 'react';
import { MentionPicker, type MentionMember } from '@/components/collaboration/MentionPicker';
import { Textarea } from '@/components/ui';
import { formatDateTime } from '@/lib/utils/format';

type Comment = { id: string; author_user_id: string | null; body: string; deleted_at: string | null; created_at: string };

async function fetchComments(caseId: string): Promise<Comment[]> {
  const response = await fetch(`/api/claims/${caseId}/comments`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Unable to load comments');
  return data.comments ?? [];
}

export function CaseComments({ caseId, canComment }: { caseId: string; canComment: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<MentionMember[]>([]);
  const [body, setBody] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchComments(caseId).then(setComments).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load comments'));
    if (canComment) fetch('/api/team?includeOwner=true').then((response) => response.json()).then((data) => setMembers(data.members ?? [])).catch(() => setMembers([]));
  }, [caseId, canComment]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/claims/${caseId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, mentionedUserIds: mentions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Unable to add comment');
      setBody('');
      setMentions([]);
      setComments(await fetchComments(caseId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to add comment');
    } finally {
      setSaving(false);
    }
  }

  return <section className="order-4 min-w-0 rounded-lg border border-[var(--uo-route-border-default)] bg-[var(--uo-route-surface-primary)] p-4 min-[1100px]:col-start-1" aria-label="Case comments">
    <h2 className="ua-text-section-title">Comments and mentions</h2>
    <div className="mt-3 space-y-2">
      {comments.length ? comments.map((comment) => <article key={comment.id} className="ua-text-dense rounded-md p-3" style={{ background: 'var(--uo-route-surface-muted)' }}>
        <p style={{ color: comment.deleted_at ? 'var(--uo-route-text-tertiary)' : 'var(--uo-route-text-primary)' }}>{comment.deleted_at ? 'Comment deleted' : comment.body}</p>
        <p className="ua-text-metadata mt-1">{formatDateTime(comment.created_at)}</p>
      </article>) : <p className="ua-text-body" style={{ color: 'var(--uo-route-text-tertiary)' }}>No comments yet.</p>}
    </div>
    {canComment ? <form onSubmit={submit} className="mt-4 space-y-3">
      <Textarea aria-label="Add a comment" rows={3} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} className="resize-y" placeholder="Add context for your team…" />
      <MentionPicker members={members} selected={mentions} onChange={setMentions} />
      <button type="submit" disabled={saving || !body.trim()} className="ua-text-working-title rounded-md px-3 py-1.5" style={{ background: 'var(--uo-route-action-primary)', color: 'var(--uo-route-action-primary-fg)' }}>{saving ? 'Posting…' : 'Post comment'}</button>
    </form> : null}
    {error ? <p role="alert" className="ua-text-caption-role mt-2" style={{ color: 'var(--uo-route-critical)' }}>{error}</p> : null}
  </section>;
}
