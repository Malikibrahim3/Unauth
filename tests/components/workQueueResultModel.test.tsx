/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkQueueOperations } from '@/components/work/WorkQueueOperations';
import type { WorkQueueItem, WorkViewCounts } from '@/lib/work/types';

const push = jest.fn();
const refresh = jest.fn();
const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const VIEW_COUNTS: WorkViewCounts = {
  open: 52,
  mine: 3,
  unassigned: 49,
  snoozed: 2,
  'due-today': 4,
  overdue: 5,
  'no-sla': 10,
  blocked: 1,
  'evidence-needed': 7,
  'decision-needed': 6,
  'integration-exceptions': 2,
  completed: 18,
};

function task(id: string, title: string, objectHref = `/cases/${id}`): WorkQueueItem {
  return {
    id,
    key: `task:${id}`,
    kind: 'task',
    title,
    description: 'Review the exact source evidence before recording the next state.',
    ownerRole: null,
    ownerUserId: null,
    ownerName: null,
    ownerInitials: null,
    status: 'open',
    priority: 'high',
    dueAt: '2026-08-24T09:00:00.000Z',
    snoozedUntil: null,
    createdAt: '2026-08-23T09:00:00.000Z',
    updatedAt: '2026-08-23T09:00:00.000Z',
    stateVersion: 3,
    taskKind: 'evidence_gap',
    waitingParty: 'merchant',
    supportPayoutCaseId: id,
    lossCaseId: null,
    recoveryCaseId: null,
    objectHref,
    objectLabel: `Case ${id}`,
    blockingReason: 'delivery evidence',
    source: 'shopify',
    sourceMetadata: {},
    validActions: ['assign_to_me', 'start', 'snooze'],
  };
}

const ITEMS = [task('case-1', 'Review delivery evidence'), task('case-2', 'Record merchant decision')];

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => body });
}

function renderQueue(fetchImpl: jest.Mock = jest.fn().mockImplementation(() => ok({ views: [] }))) {
  global.fetch = fetchImpl as never;
  return render(
    <WorkQueueOperations
      items={ITEMS}
      total={52}
      view="open"
      viewCounts={VIEW_COUNTS}
      page={1}
      pageSize={25}
      asOf="2026-08-23T10:00:00.000Z"
      initialQuery=""
      currentUserId="user-1"
      canManage
      canManageViews
      sourceNotice={null}
      savedViewId={null}
    />,
  );
}

describe('canonical Work queue', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/work');
    push.mockReset();
    refresh.mockReset();
    replace.mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it('keeps an unavailable saved-view request distinct from an empty saved-view list', async () => {
    renderQueue(jest.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }));
    expect(await screen.findByRole('button', { name: /saved views unavailable.*retry/i })).toBeInTheDocument();
  });

  it('uses the exact server total and never renders fictional bulk approval', async () => {
    renderQueue();
    expect(await screen.findByText('Showing 1–25 of 52')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /snoozed 2/i })).toHaveAttribute('href', '/work?view=snoozed');
    expect(screen.queryByText(/bulk approve/i)).not.toBeInTheDocument();
    expect(screen.getByText('2 rows on this page')).toBeInTheDocument();
  });

  it('submits search as URL query state without filtering the server page locally', async () => {
    renderQueue();
    await screen.findByRole('combobox', { name: /saved work view/i });
    fireEvent.change(screen.getByRole('textbox', { name: /search work/i }), { target: { value: 'carrier refund' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(push).toHaveBeenCalledWith('/work?search=carrier+refund');
    expect(screen.getAllByText('Review delivery evidence').length).toBeGreaterThan(0);
  });

  it('sends optimistic version and a fresh idempotency key for a valid action', async () => {
    const fetchMock = jest.fn()
      .mockImplementationOnce(() => ok({ views: [] }))
      .mockImplementationOnce(() => ok({ task: { id: 'case-1', state_version: 4 } }));
    renderQueue(fetchMock);
    await screen.findByRole('combobox', { name: /saved work view/i });
    fireEvent.click(screen.getByRole('button', { name: 'Assign to me' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, options] = fetchMock.mock.calls[1];
    expect(fetchMock.mock.calls[1][0]).toBe('/api/work-tasks/case-1');
    expect(JSON.parse(options.body)).toEqual({ action: 'assign_to_me', expectedVersion: 3 });
    expect(options.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/i);
    expect(refresh).toHaveBeenCalled();
  });

  it('handles only the documented queue shortcuts and ignores form input', async () => {
    const fetchMock = jest.fn()
      .mockImplementationOnce(() => ok({ views: [] }))
      .mockImplementationOnce(() => ok({ task: { id: 'case-1', state_version: 4 } }));
    renderQueue(fetchMock);
    await screen.findByRole('combobox', { name: /saved work view/i });

    fireEvent.keyDown(document.body, { key: 'j' });
    expect(window.location.search).toBe('?selected=case-2');
    fireEvent.keyDown(document.body, { key: 'k' });
    expect(window.location.search).toBe('?selected=case-1');

    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/cases/case-1?return='));

    fireEvent.keyDown(document.body, { key: 'a' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const search = screen.getByRole('textbox', { name: /search work/i });
    search.focus();
    fireEvent.keyDown(search, { key: 'a' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('preserves the exact Work return context in record links', async () => {
    window.history.replaceState(null, '', '/work?view=overdue&page=2&selected=case-1');
    renderQueue();
    const link = await screen.findByRole('link', { name: /open full record/i });
    expect(link.getAttribute('href')).toContain('/cases/case-1?return=');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('/work?view=overdue&page=2&selected=case-1');
  });
});
