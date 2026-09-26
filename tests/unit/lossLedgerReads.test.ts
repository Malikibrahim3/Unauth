import { readLossLedgerIds } from '@/lib/losses/ledgerReads';

describe('loss ledger bounded identity reads', () => {
  it('reads every identity without oversized URL filters or duplicate batches', async () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
    const read = jest.fn(async (batch: string[]) => ({ data: batch.map((id) => ({id})), error: null }));
    const result = await readLossLedgerIds([...ids, ids[0]], read);
    expect(result.data.map((row) => row.id)).toEqual(ids);
    expect(read).toHaveBeenCalledTimes(14);
    expect(read.mock.calls.every(([batch]) => batch.length <= 75)).toBe(true);
  });

  it('pages financial history beyond the server row cap', async () => {
    const history = Array.from({length: 1101}, (_, id) => ({id}));
    const read = jest.fn(async (_ids: string[], from: number, to: number) => ({data: history.slice(from, to + 1), error: null}));
    expect((await readLossLedgerIds(['case-1'], read)).data).toEqual(history);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it('retains the exact database error and withholds a partial prefix', async () => {
    const error = {code: '42703', message: 'known_states missing'};
    const read = jest.fn().mockResolvedValueOnce({data: Array(500).fill({id: 'one'}), error: null}).mockResolvedValueOnce({data: null, error});
    expect(await readLossLedgerIds(['case-1'], read)).toEqual({data: [], error});
  });

  it('does not issue an unfiltered request for an empty scope', async () => {
    const read = jest.fn();
    expect(await readLossLedgerIds([], read)).toEqual({data: [], error: null});
    expect(read).not.toHaveBeenCalled();
  });
});
