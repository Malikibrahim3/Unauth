/**
 * Unified case timeline. Merges normalized facts from several stores — source
 * events, domain events, case/claim events, decisions, loss, recovery, tasks —
 * into one stable, sorted shape.
 *
 * Sort order: `occurredAt`, then `recordedAt`, then `id`. Provider occurrence
 * time is never overwritten with ingestion time.
 *
 * See docs/IMPL_source_agnostic_connected_ecosystem.md §6.
 */

export type TimelineActor = { type: string; id?: string; label?: string };

export type TimelineItem = {
  id: string;
  type: string;
  occurredAt: string;
  recordedAt: string;
  sourceSystem: string;
  sourceAccount?: string;
  actor: TimelineActor;
  title: string;
  summary?: string;
  relatedValue?: { amountMinor: number; currency: string };
  relatedEntity?: { type: string; id: string };
  sourceUrl?: string;
  freshness: string;
};

function compareTimeline(a: TimelineItem, b: TimelineItem): number {
  if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? -1 : 1;
  if (a.recordedAt !== b.recordedAt) return a.recordedAt < b.recordedAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Merge several already-normalized timeline sources into one sorted list.
 * De-duplicates by id (first occurrence wins), so a fact appearing in both a
 * domain-event feed and a compatibility feed is shown once.
 */
export function mergeTimeline(...sources: TimelineItem[][]): TimelineItem[] {
  const seen = new Set<string>();
  const merged: TimelineItem[] = [];
  for (const source of sources) {
    for (const item of source) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged.sort(compareTimeline);
}

type DomainEventRow = {
  id: string;
  event_type: string;
  occurred_at: string | null;
  recorded_at: string | null;
  actor_type: string | null;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
};

/** Project domain-event rows into timeline items. */
export function domainEventsToTimeline(rows: DomainEventRow[]): TimelineItem[] {
  return rows.map((r) => ({
    id: `domain:${r.id}`,
    type: r.event_type,
    occurredAt: r.occurred_at ?? r.recorded_at ?? '',
    recordedAt: r.recorded_at ?? r.occurred_at ?? '',
    sourceSystem: 'unauth',
    actor: { type: r.actor_type ?? 'system', id: r.actor_id ?? undefined },
    title: r.event_type,
    freshness: 'fresh',
  }));
}

type ClaimEventRow = {
  id: string;
  event_type: string;
  created_at: string;
  note: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
};

export function claimEventsToTimeline(rows: ClaimEventRow[]): TimelineItem[] {
  return rows.map((row) => ({
    id: `claim:${row.id}`,
    type: row.event_type,
    occurredAt: typeof row.metadata?.triggered_at === 'string' ? row.metadata.triggered_at : row.created_at,
    recordedAt: row.created_at,
    sourceSystem: 'unauth',
    actor: { type: row.actor_user_id ? 'user' : 'system', id: row.actor_user_id ?? undefined },
    title: row.event_type.replaceAll('_', ' '),
    summary: row.note ?? undefined,
    freshness: 'fresh',
  }));
}
