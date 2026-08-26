/**
 * @jest-environment jsdom
 *
 * §7.5's ResourceSnapshot contract (LP-MOT-07): initial load, refresh,
 * refresh failure, retry, and request-order races. The store is keyed by
 * URL, so each test uses a unique URL to stay independent without needing
 * module resets between tests.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFetchJson } from '@/lib/react/useFetchJson';

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500) {
  return { ok, status, json: async () => body } as Response;
}

function uniqueUrl(name: string): string {
  return `https://example.test/${name}-${Math.random().toString(36).slice(2)}`;
}

describe('useFetchJson — §7.5 ResourceSnapshot contract', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts initial-loading, then resolves to success with data', async () => {
    const url = uniqueUrl('initial-load');
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ value: 1 }));

    const { result } = renderHook(() => useFetchJson<{ value: number }>(url));

    expect(result.current.status).toBe('initial-loading');
    expect(result.current.isInitialLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ value: 1 });
    expect(result.current.error).toBeNull();
  });

  it('refresh preserves existing data — status becomes refreshing, never blanks to loading', async () => {
    const url = uniqueUrl('refresh-preserves-data');
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ value: 1 }));
    global.fetch = fetchMock;

    const { result } = renderHook(() => useFetchJson<{ value: number }>(url));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ value: 1 });

    let resolveSecond!: (response: Response) => void;
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveSecond = resolve; }),
    );

    act(() => {
      result.current.reload();
    });

    // Refreshing keeps the last-known-good data visible — never `undefined`, never `loading`.
    expect(result.current.status).toBe('refreshing');
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({ value: 1 });

    act(() => {
      resolveSecond(jsonResponse({ value: 2 }));
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ value: 2 });
  });

  it('refresh failure retains the stale data and reports hasStaleData', async () => {
    const url = uniqueUrl('refresh-failure');
    const fetchMock = jest.fn().mockResolvedValueOnce(jsonResponse({ value: 1 }));
    global.fetch = fetchMock;

    const { result } = renderHook(() => useFetchJson<{ value: number }>(url));
    await waitFor(() => expect(result.current.status).toBe('success'));

    fetchMock.mockRejectedValueOnce(new Error('network down'));
    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('network down');
    expect(result.current.hasStaleData).toBe(true);
    // §7.5: "Initial error may have no data; refresh error retains data."
    expect(result.current.data).toEqual({ value: 1 });
  });

  it('retry after a failed refresh can succeed and clears the error', async () => {
    const url = uniqueUrl('retry-after-failure');
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse({ value: 1 }))
      .mockRejectedValueOnce(new Error('temporary failure'));
    global.fetch = fetchMock;

    const { result } = renderHook(() => useFetchJson<{ value: number }>(url));
    await waitFor(() => expect(result.current.status).toBe('success'));

    act(() => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.status).toBe('error'));

    fetchMock.mockResolvedValueOnce(jsonResponse({ value: 3 }));
    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ value: 3 });
    expect(result.current.error).toBeNull();
  });

  it('a reload while one is already in flight never starts a duplicate request', async () => {
    // §7.5's ordering guarantee holds by construction here: only one load per
    // key may be in flight at a time, so a second `reload()` while the first
    // is still pending is a safe no-op rather than a race to apply results —
    // there is only ever one in-flight response to apply.
    const url = uniqueUrl('no-duplicate-in-flight');
    let resolveFirst!: (response: Response) => void;
    const fetchMock = jest.fn().mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );
    global.fetch = fetchMock;

    const { result } = renderHook(() => useFetchJson<{ value: number }>(url));
    expect(result.current.status).toBe('initial-loading');

    act(() => {
      result.current.reload();
      result.current.reload();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      resolveFirst(jsonResponse({ value: 1 }));
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toEqual({ value: 1 });

    // Once settled, a genuinely new reload does start a fresh request.
    fetchMock.mockResolvedValueOnce(jsonResponse({ value: 2 }));
    act(() => {
      result.current.reload();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.data).toEqual({ value: 2 }));
  });

  it('aborts an in-flight request after its final subscriber unmounts', async () => {
    const url = uniqueUrl('abort-on-unmount');
    let requestSignal: AbortSignal | undefined;
    global.fetch = jest.fn().mockImplementation((_url, init?: RequestInit) => {
      requestSignal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        requestSignal?.addEventListener('abort', () => reject(requestSignal?.reason));
      });
    });

    const { unmount } = renderHook(() => useFetchJson<{ value: number }>(url));
    expect(requestSignal?.aborted).toBe(false);
    unmount();

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    expect(requestSignal?.aborted).toBe(true);
  });

  it('turns an exceeded request deadline into a recoverable error', async () => {
    const url = uniqueUrl('request-timeout');
    global.fetch = jest.fn().mockImplementation((_url, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason));
      });
    });

    const { result } = renderHook(() => useFetchJson<{ value: number }>(url, { timeoutMs: 10 }));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Request timed out. Try again.');
  });
});
