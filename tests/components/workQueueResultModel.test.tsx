/**
 * @jest-environment jsdom
 *
 * RUN-06 and RUN-07 regressions.
 *
 * RUN-06: a failed `/api/work/views` request must be reported as
 * "saved views unavailable" with a retry, never silently rendered as
 * "you have no saved views".
 *
 * RUN-07: the table, empty state, selectable IDs and footer counts must all be
 * derived from the same visible result model, so a zero-result search cannot
 * leave an empty table beside an unfiltered footer count or a selection that
 * still targets rows the operator can no longer see.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WorkQueue, type WorkQueueItem, type WorkViewCounts } from '@/components/work/WorkQueue';
import { WorkQueuePulse } from '@/components/work/WorkQueuePulse';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn(), replace: jest.fn() }),
}));

const VIEW_COUNTS = {
  open: 2,
  mine: 0,
  unassigned: 0,
  'due-today': 0,
  overdue: 0,
  'no-sla': 0,
  blocked: 0,
  'evidence-needed': 0,
  'decision-needed': 0,
  'integration-exceptions': 0,
  completed: 0,
} as WorkViewCounts;

function task(id: string, title: string): WorkQueueItem {
  return {
    id,
    kind: 'task',
    title,
    description: null,
    ownerRole: 'analyst',
    ownerUserId: null,
    status: 'open',
    priority: 'medium',
    dueAt: null,
    createdAt: '2026-07-01T09:00:00Z',
    supportPayoutCaseId: null,
    objectHref: null,
    objectLabel: `Case ${id}`,
    blockingReason: null,
    source: 'shopify',
  };
}

const ITEMS = [task('t1', 'Chase carrier response'), task('t2', 'Confirm refund amount')];

function renderQueue(fetchImpl: jest.Mock) {
  global.fetch = fetchImpl as never;
  return render(<WorkQueue items={ITEMS} total={7} view="open" viewCounts={VIEW_COUNTS} />);
}

const okViews = () => jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ views: [] }) });

describe('WorkQueue saved views (RUN-06)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('distinguishes an unavailable saved-view request from having no saved views', async () => {
    renderQueue(jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }));
    expect(await screen.findByText(/couldn’t load your saved views/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows no saved-view failure notice when the request succeeds', async () => {
    const fetchMock = okViews();
    renderQueue(fetchMock);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/work/views'));
    expect(screen.queryByText(/couldn’t load your saved views/i)).not.toBeInTheDocument();
  });

  it('retries the saved-view request without discarding the visible views', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ views: [{ id: 'v1', name: 'Ageing chargebacks', definition: { view: 'overdue' }, is_shared: false }] }),
      });
    renderQueue(fetchMock);
    fireEvent.click(await screen.findByRole('button', { name: /try again/i }));
    fireEvent.click(await screen.findByRole('button', { name: /more views/i }));
    expect(await screen.findByRole('link', { name: /ageing chargebacks/i })).toBeInTheDocument();
    expect(screen.queryByText(/couldn’t load your saved views/i)).not.toBeInTheDocument();
    // Five primary views stay visible; the remaining system and saved views
    // become reachable through the disclosed selector.
    expect(within(screen.getByRole('navigation', { name: /work views/i })).getAllByRole('link')).toHaveLength(5);
    expect(within(screen.getByRole('group', { name: /more work views/i })).getAllByRole('link')).toHaveLength(7);
  });
});

describe('WorkQueue visible result model (RUN-07)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders a zero-result search state instead of an empty table', async () => {
    renderQueue(okViews());
    fireEvent.change(await screen.findByRole('searchbox', { name: /search this view/i }), {
      target: { value: 'nothing matches this' },
    });
    expect(screen.getByText(/no results for “nothing matches this”/i)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText(/0 of 2 loaded results/i)).toBeInTheDocument();
  });

  it('reports the visible count and the server total from one model', async () => {
    renderQueue(okViews());
    await screen.findByRole('table');
    expect(screen.getByText('Showing 1–2 of 7')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: /search this view/i }), { target: { value: 'carrier' } });
    expect(screen.getByText(/1 of 2 loaded results/i)).toBeInTheDocument();
  });

  it('drops a selection that falls outside the current result set', async () => {
    renderQueue(okViews());
    await screen.findByRole('table');
    fireEvent.click(screen.getAllByRole('checkbox', { name: /select confirm refund amount/i })[0]);
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox', { name: /search this view/i }), { target: { value: 'carrier' } });
    expect(screen.queryByText(/selected$/i)).not.toBeInTheDocument();
    // The out-of-result selection is dropped, not merely hidden: clearing the
    // search must not resurrect it.
    fireEvent.change(screen.getByRole('searchbox', { name: /search this view/i }), { target: { value: '' } });
    expect(screen.queryByText(/selected$/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox', { name: /select confirm refund amount/i })[0]).not.toBeChecked();
  });

  it('retains a search query in system-view links', async () => {
    render(<WorkQueue items={ITEMS} total={7} view="open" viewCounts={VIEW_COUNTS} initialQuery="carrier" />);
    await screen.findByRole('table');
    expect(screen.getByRole('link', { name: /overdue/i })).toHaveAttribute('href', '/work?view=overdue&q=carrier');
  });

  it('retains a search query when a deadline band drills into the queue', () => {
    render(<WorkQueuePulse query="carrier" view="open" bands={{ overdue: 1, 'due-today': 0, 'due-1-3': 0, 'due-4-7': 0, 'due-later': 0, 'no-sla': 0 }} />);
    expect(screen.getByRole('link', { name: /overdue/i })).toHaveAttribute('href', '/work?view=overdue&q=carrier');
  });
});
