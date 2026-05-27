import { countInboxQueues, matchesInboxQueueFilter } from '@/components/inbox/InboxClient';

describe('inbox queue filters', () => {
  const oldUnassigned = {
    id: 'tx-1',
    order_id: 'IA-1001',
    identity_score: 91,
    identity_confidence_grade: 'definite',
    match_status: 'definite',
    processed_at: '2026-05-20T10:00:00.000Z',
    processing_job_id: 'job-1',
    first_viewed_at: null,
    assigned_to: null,
  };

  const assignedViewed = {
    id: 'tx-2',
    order_id: 'IA-1002',
    identity_score: 66,
    identity_confidence_grade: 'possible',
    match_status: 'candidate',
    processed_at: '2026-05-26T10:00:00.000Z',
    processing_job_id: 'job-1',
    first_viewed_at: '2026-05-26T11:00:00.000Z',
    assigned_to: 'user-1',
  };

  it('counts only truly unassigned rows in the unassigned inbox queue', () => {
    expect(countInboxQueues([oldUnassigned, assignedViewed]).unassigned).toBe(1);
  });

  it('filters assigned rows out of the unassigned inbox queue', () => {
    expect(matchesInboxQueueFilter(oldUnassigned, 'unassigned')).toBe(true);
    expect(matchesInboxQueueFilter(assignedViewed, 'unassigned')).toBe(false);
  });
});
