jest.mock('@/lib/claim-gate/writeBackToGorgias', () => ({
  writeAccountabilityNoteToGorgias: jest.fn(),
}));

import { gorgiasConnector } from '@/lib/connectors/providers/gorgias';
import { writeAccountabilityNoteToGorgias } from '@/lib/claim-gate/writeBackToGorgias';

const mockWrite = writeAccountabilityNoteToGorgias as jest.Mock;
const ctx = { client: {} as never, merchantId: 'm-1' };

describe('gorgias connector executeAction (low-risk write-backs)', () => {
  afterEach(() => jest.clearAllMocks());

  it('writes an internal note through the real Gorgias write-back', async () => {
    mockWrite.mockResolvedValue({ attempted: true, ok: true });
    const result = await gorgiasConnector.executeAction!(ctx, {
      id: 'a1', capabilityId: 'tickets.write_note',
      payload: { externalRecordId: 'ticket-10', bodyText: 'Reviewed', tags: ['unauth_reviewed'] },
    });
    expect(result.ok).toBe(true);
    expect(mockWrite).toHaveBeenCalledWith(expect.objectContaining({
      merchantId: 'm-1', externalTicketId: 'ticket-10', bodyText: 'Reviewed', tags: ['unauth_reviewed'],
    }));
  });

  it('applies a tag without a note body and reports it reversible', async () => {
    mockWrite.mockResolvedValue({ attempted: true, ok: true });
    const result = await gorgiasConnector.executeAction!(ctx, {
      id: 'a2', capabilityId: 'tickets.write_tag',
      payload: { externalRecordId: 'ticket-11', tags: ['unauth_manager_review'] },
    });
    expect(result.ok).toBe(true);
    expect(result.reversible).toBe(true);
    expect(mockWrite).toHaveBeenCalledWith(expect.objectContaining({ bodyText: '', tags: ['unauth_manager_review'] }));
  });

  it('fails closed without an external ticket id', async () => {
    const result = await gorgiasConnector.executeAction!(ctx, {
      id: 'a3', capabilityId: 'tickets.write_note', payload: { bodyText: 'x' },
    });
    expect(result.ok).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('rejects a note with an empty body', async () => {
    const result = await gorgiasConnector.executeAction!(ctx, {
      id: 'a4', capabilityId: 'tickets.write_note', payload: { externalRecordId: 'ticket-12', bodyText: '  ' },
    });
    expect(result.ok).toBe(false);
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it('surfaces write-back failure', async () => {
    mockWrite.mockResolvedValue({ attempted: true, ok: false, error: 'gorgias_not_connected' });
    const result = await gorgiasConnector.executeAction!(ctx, {
      id: 'a5', capabilityId: 'tickets.write_note', payload: { externalRecordId: 'ticket-13', bodyText: 'x' },
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe('gorgias_not_connected');
  });
});
