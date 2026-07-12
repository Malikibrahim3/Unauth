jest.mock('@/lib/exceptions/store', () => ({ getException: jest.fn(), settleException: jest.fn() }));
jest.mock('@/lib/relationships/resolveMatch', () => ({ resolveMatch: jest.fn() }));
jest.mock('@/lib/events/domainEventStore', () => ({ recordDomainEvent: jest.fn().mockResolvedValue(undefined) }));

import { resolveExceptionAction } from '@/lib/exceptions/resolveExceptionAction';
import { getException, settleException } from '@/lib/exceptions/store';
import { resolveMatch } from '@/lib/relationships/resolveMatch';
import { recordDomainEvent } from '@/lib/events/domainEventStore';

const getExc = getException as jest.Mock;
const settle = settleException as jest.Mock;
const resolve = resolveMatch as jest.Mock;
const emit = recordDomainEvent as jest.Mock;
const client = {} as never;
const M = 'm-1';
const USER = 'u-1';

const matchException = {
  id: 'e1', support_payout_case_id: 'c1', exception_type: 'match_uncertainty', confidence: 'probable', status: 'open',
  title: 'x', context: { is_match_exception: true, subject_entity_type: 'order', subject_entity_id: 'o1' },
};
const plainException = { id: 'e2', support_payout_case_id: 'c1', exception_type: 'unmatched_refund', confidence: 'probable', status: 'open', title: 'x', context: {} };

beforeEach(() => { settle.mockResolvedValue({ ok: true, exception: { id: 'e1', status: 'resolved' } }); resolve.mockResolvedValue({ status: 'confirmed', relationshipId: 'rel-1', selectedCandidateId: 'k1' }); });
afterEach(() => jest.clearAllMocks());

describe('resolveExceptionAction', () => {
  it('confirm routes a match exception through resolveMatch, then settles resolved', async () => {
    getExc.mockResolvedValue(matchException);
    const result = await resolveExceptionAction(client, { merchantId: M, exceptionId: 'e1', action: 'confirm', selectedCandidateId: 'k1', actorUserId: USER });
    expect(result.ok).toBe(true);
    expect(resolve).toHaveBeenCalledWith(client, expect.objectContaining({ subjectEntityType: 'order', subjectEntityId: 'o1', selectedCandidateId: 'k1', resolvedBy: USER }));
    expect(settle).toHaveBeenCalledWith(client, M, 'e1', expect.objectContaining({ status: 'resolved' }));
    expect(emit).toHaveBeenCalledWith(client, expect.objectContaining({ eventType: 'case.exception_resolved' }));
  });

  it('reject routes resolveMatch with no candidate and settles dismissed', async () => {
    getExc.mockResolvedValue(matchException);
    resolve.mockResolvedValue({ status: 'unmatched', relationshipId: null, selectedCandidateId: null });
    const result = await resolveExceptionAction(client, { merchantId: M, exceptionId: 'e1', action: 'reject', actorUserId: USER });
    expect(result.ok).toBe(true);
    expect(resolve).toHaveBeenCalledWith(client, expect.objectContaining({ selectedCandidateId: null }));
    expect(settle).toHaveBeenCalledWith(client, M, 'e1', expect.objectContaining({ status: 'dismissed' }));
  });

  it('confirm without a candidate is rejected', async () => {
    getExc.mockResolvedValue(matchException);
    expect(await resolveExceptionAction(client, { merchantId: M, exceptionId: 'e1', action: 'confirm', actorUserId: USER }))
      .toEqual({ ok: false, reason: 'candidate_required' });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('confirm on a non-match exception is rejected', async () => {
    getExc.mockResolvedValue(plainException);
    expect(await resolveExceptionAction(client, { merchantId: M, exceptionId: 'e2', action: 'confirm', selectedCandidateId: 'k1', actorUserId: USER }))
      .toEqual({ ok: false, reason: 'not_a_match_exception' });
  });

  it('resolve settles a plain exception without touching resolveMatch', async () => {
    getExc.mockResolvedValue(plainException);
    settle.mockResolvedValue({ ok: true, exception: { id: 'e2', status: 'resolved' } });
    const result = await resolveExceptionAction(client, { merchantId: M, exceptionId: 'e2', action: 'resolve', resolution: 'linked manually', actorUserId: USER });
    expect(result.ok).toBe(true);
    expect(resolve).not.toHaveBeenCalled();
    expect(settle).toHaveBeenCalledWith(client, M, 'e2', expect.objectContaining({ status: 'resolved', resolution: 'linked manually' }));
  });

  it('returns not_found / already_settled guards', async () => {
    getExc.mockResolvedValueOnce(null);
    expect(await resolveExceptionAction(client, { merchantId: M, exceptionId: 'x', action: 'resolve', actorUserId: USER })).toEqual({ ok: false, reason: 'not_found' });
    getExc.mockResolvedValueOnce({ ...plainException, status: 'resolved' });
    expect(await resolveExceptionAction(client, { merchantId: M, exceptionId: 'e2', action: 'resolve', actorUserId: USER })).toEqual({ ok: false, reason: 'already_settled' });
  });
});
