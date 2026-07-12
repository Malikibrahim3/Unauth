'use client';

import { useEffect, useState } from 'react';
import { MentionPicker, type MentionMember } from '@/components/collaboration/MentionPicker';

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

  return <section className="order-4 min-w-0 rounded-lg border bg-white p-4 min-[1100px]:col-start-1" aria-label="Case comments">
    <h2 className="text-sm font-semibold">Comments and mentions</h2>
    <div className="mt-3 space-y-2">
      {comments.length ? comments.map((comment) => <article key={comment.id} className="rounded-md p-3 text-sm" style={{ background: 'var(--surface-muted, #f7f7f6)' }}>
        <p style={{ color: comment.deleted_at ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{comment.deleted_at ? 'Comment deleted' : comment.body}</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{comment.created_at.slice(0, 16).replace('T', ' ')}</p>
      </article>) : <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>No comments yet.</p>}
    </div>
    {canComment ? <form onSubmit={submit} className="mt-4 space-y-3">
      <textarea aria-label="Add a comment" rows={3} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} className="w-full resize-y rounded-md border p-2 text-sm" placeholder="Add context for your team…" />
      <MentionPicker members={members} selected={mentions} onChange={setMentions} />
      <button type="submit" disabled={saving || !body.trim()} className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: 'var(--accent)', color: 'white' }}>{saving ? 'Posting…' : 'Post comment'}</button>
    </form> : null}
    {error ? <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{error}</p> : null}
  </section>;
}
