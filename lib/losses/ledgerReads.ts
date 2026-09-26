type ReadError = { message: string; code?: string };

/** Keep ledger identity filters below proxy URL limits and read every page. */
export async function readLossLedgerIds<T>(
  ids: string[],
  read: (ids: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: ReadError | null }>,
): Promise<{ data: T[]; error: ReadError | null }> {
  const data: T[] = [];
  const unique = [...new Set(ids)];
  for (let index = 0; index < unique.length; index += 75) {
    const batch = unique.slice(index, index + 75);
    for (let from = 0; ; from += 500) {
      const result = await read(batch, from, from + 499);
      // Never expose a successfully read prefix as a complete ledger.
      if (result.error) return { data: [], error: result.error };
      data.push(...(result.data ?? []));
      if (!result.data || result.data.length < 500) break;
    }
  }
  return { data, error: null };
}
