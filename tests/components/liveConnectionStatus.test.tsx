/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import { ConnectorRow, type CatalogueRowItem } from '@/components/integrations/ConnectorRow';

const POLL_INTERVAL_MS = 5 * 60 * 1000;

function row(overrides: Partial<CatalogueRowItem> = {}): CatalogueRowItem {
  return {
    id: 'gorgias',
    name: 'Gorgias',
    description: 'Support tickets, messages, and the compressed decision widget.',
    category: 'helpdesk',
    stage: 'live',
    status: 'connected',
    syncState: 'stale',
    freshness: { confidence: 'measured', deliveryModel: 'webhook', lastDataReceivedAt: '2026-07-14T20:05:00Z', lastSyncAttemptAt: null },
    connectionId: 'conn-1',
    connectionCount: 1,
    account: 'Fixture gorgias',
    lastSyncAttemptAt: null,
    lastSuccessfulSyncAt: null,
    lastDataReceivedAt: '2026-07-14T20:05:00Z',
    lastVerifiedAt: '2026-07-16T20:05:00Z',
    lastError: "Data hasn't synced since 14 Jul, 20:05.",
    importedRecords: 42,
    scopes: [],
    capabilities: [],
    connectEnabled: true,
    badge: 'stale',
    noteTone: 'warning',
    ...overrides,
  };
}

function mockFetchSequence(responses: Array<{ ok: boolean; inconclusive?: boolean; status?: number }>) {
  let call = 0;
  global.fetch = jest.fn().mockImplementation(() => {
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve({
      status: response.status ?? (response.ok ? 200 : 401),
      json: async () => ({ ok: response.ok, inconclusive: response.inconclusive }),
    });
  }) as never;
}

describe('ConnectorRow live polling — tests the real component/hook, not a reimplementation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('repeated successful polls preserve a richer initial badge instead of resetting to healthy', async () => {
    mockFetchSequence([{ ok: true }, { ok: true }, { ok: true }]);
    render(<ConnectorRow item={row()} />);
    expect(screen.getByText('Stale')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(screen.getByText('Stale')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('re-rendering with a fresh (non-memoized) item object never recreates the poll interval (regression: caused 150 requests instead of 2)', async () => {
    mockFetchSequence([{ ok: true }, { ok: true }]);
    const { rerender } = render(<ConnectorRow item={row()} />);
    // Simulate 20 parent re-renders with brand-new item object literals, as
    // a real parent list re-rendering (e.g. from unrelated state elsewhere
    // on the page) would produce.
    for (let i = 0; i < 20; i += 1) {
      rerender(<ConnectorRow item={row()} />);
    }
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('a failed poll after a healthy state downgrades badge AND note together (regression: badge/note must never disagree)', async () => {
    mockFetchSequence([{ ok: false, status: 401 }]);
    render(<ConnectorRow item={row({ badge: 'healthy', lastError: null, noteTone: null, syncState: 'import_complete' })} />);
    expect(screen.getByText('Healthy')).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(screen.getByText('Error')).toBeInTheDocument();
    // The note must update alongside the badge — never leave the old
    // (absent, in this case) note or a mismatched one behind.
    expect(screen.getByText('Live verification failed. Reconnect this integration.')).toBeInTheDocument();
  });

  it('a failed poll after a stale state replaces the stale-specific note, not just the badge (the exact bug found in live browser verification)', async () => {
    mockFetchSequence([{ ok: false, status: 401 }]);
    render(<ConnectorRow item={row()} />); // badge: stale, note: "Data hasn't synced since ..."
    expect(screen.getByText('Stale')).toBeInTheDocument();
    expect(screen.getByText("Data hasn't synced since 14 Jul, 20:05.")).toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText("Data hasn't synced since 14 Jul, 20:05.")).not.toBeInTheDocument();
    expect(screen.getByText('Live verification failed. Reconnect this integration.')).toBeInTheDocument();
  });

  it('repeated identical polls are idempotent (no state thrash)', async () => {
    mockFetchSequence([{ ok: true }, { ok: true }, { ok: true }, { ok: true }]);
    render(<ConnectorRow item={row({ badge: 'no_data', syncState: 'no_records_found', lastError: 'Connected, but no records have been found yet.' })} />);
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        jest.advanceTimersByTime(POLL_INTERVAL_MS);
        await Promise.resolve();
      });
      expect(screen.getByText('No data')).toBeInTheDocument();
    }
  });

  it('an out-of-order (slower, earlier) response cannot overwrite a newer poll result', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount += 1;
      if (callCount === 1) return firstResponse;
      return Promise.resolve({ status: 200, json: async () => ({ ok: false }) });
    }) as never;

    render(<ConnectorRow item={row({ badge: 'healthy', lastError: null, noteTone: null, syncState: 'import_complete' })} />);

    // First interval tick starts a request that will hang until resolved manually.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
    });
    // Second interval tick starts a newer request that resolves immediately.
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS);
      await Promise.resolve();
    });
    expect(screen.getByText('Error')).toBeInTheDocument();

    // The first, slower request now resolves with ok:true — it must NOT win
    // over the newer (already-applied) failure.
    await act(async () => {
      resolveFirst({ status: 200, json: async () => ({ ok: true }) });
      await Promise.resolve();
    });
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('stops polling after unmount — no leaked interval or in-flight state updates', async () => {
    mockFetchSequence([{ ok: true }]);
    const { unmount } = render(<ConnectorRow item={row({ badge: 'healthy', lastError: null, noteTone: null, syncState: 'import_complete' })} />);
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
      await Promise.resolve();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('a provider with no verify endpoint never polls at all', async () => {
    global.fetch = jest.fn() as never;
    render(<ConnectorRow item={row({ id: 'ups', name: 'UPS', badge: 'connection_verified', lastError: null, noteTone: null })} />);
    await act(async () => {
      jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);
      await Promise.resolve();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
