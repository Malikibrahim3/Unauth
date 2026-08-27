import { projectBoundedWorkQueue, type RawWorkQueueRow } from '@/lib/work/store';
import type { WorkQueueFilters } from '@/lib/work/types';

const nowMs = Date.parse('2026-08-23T12:00:00.000Z');

function row(index: number): RawWorkQueueRow {
  const id = `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  return {
    kind: 'task',
    id,
    title: index % 3 === 0 ? `Investigate carrier evidence ${index}` : `Review refund ${index}`,
    description: `Operational item ${index}`,
    status: index === 59 ? 'completed' : index % 7 === 0 ? 'blocked' : 'open',
    priority: index % 5 === 0 ? 'urgent' : index % 2 === 0 ? 'high' : 'medium',
    owner_user_id: index % 4 === 0 ? 'user-1' : null,
    owner_role: index % 4 === 0 ? 'analyst' : null,
    due_at: new Date(nowMs + (index - 10) * 3_600_000).toISOString(),
    snoozed_until: index === 58 ? new Date(nowMs + 86_400_000).toISOString() : null,
    created_at: new Date(nowMs - index * 60_000).toISOString(),
    updated_at: new Date(nowMs - index * 30_000).toISOString(),
    source: index % 3 === 0 ? 'ups' : 'shopify',
    support_payout_case_id: id,
    loss_case_id: null,
    recovery_case_id: null,
    blocking_reason: index % 3 === 0 ? 'carrier evidence' : null,
    source_metadata: {},
    task_kind: index % 3 === 0 ? 'evidence_gap' : 'decision',
    waiting_party: index % 3 === 0 ? 'carrier' : 'merchant',
    state_version: 1,
    exception_type: null,
    exception_context: null,
    deadline_kind: null,
  };
}

const rows = Array.from({ length: 60 }, (_, index) => row(index + 1));
const baseFilters: WorkQueueFilters = {
  view: 'open', search: '', priority: null, state: null, assignee: null,
  sort: 'deadline', page: 1, pageSize: 25,
};

function page(filters: Partial<WorkQueueFilters>) {
  return projectBoundedWorkQueue({
    rows,
    filters: { ...baseFilters, ...filters },
    currentUserId: 'user-1',
    canManage: true,
    canManageAnyAssignment: false,
    nowMs,
  });
}

describe('bounded canonical Work projection', () => {
  it('pages a population larger than one page without missing or duplicate rows', () => {
    const first = page({ page: 1 });
    const second = page({ page: 2 });
    const third = page({ page: 3 });
    const ids = [...first.items, ...second.items, ...third.items].map((item) => item.id);

    expect(first.total).toBe(58);
    expect(ids).toHaveLength(58);
    expect(new Set(ids).size).toBe(58);
    expect(first.items).toHaveLength(25);
    expect(second.items).toHaveLength(25);
    expect(third.items).toHaveLength(8);
  });

  it('searches, filters and sorts the full server result before slicing', () => {
    const result = page({ search: 'carrier evidence', priority: 'urgent', sort: 'newest' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((item) => item.priority === 'urgent' && item.source === 'ups')).toBe(true);
    expect(result.items.map((item) => item.createdAt)).toEqual(
      [...result.items].map((item) => item.createdAt).sort().reverse(),
    );
  });

  it('excludes snoozed work from Open while keeping an exact Snoozed count', () => {
    const result = page({});
    expect(result.items.some((item) => item.snoozedUntil != null)).toBe(false);
    expect(result.viewCounts.snoozed).toBe(1);
  });
});
