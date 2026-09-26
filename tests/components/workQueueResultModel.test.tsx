/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkQueueOperations } from '@/components/work/WorkQueueOperations';
import { ExactWorkQueueOperations } from '@/components/work/ExactWorkQueueOperations';
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

  it('binds exact-source controls once and names keyboard-operable row checkboxes', () => {
    const { container } = render(<ExactWorkQueueOperations items={ITEMS} total={52} viewCounts={VIEW_COUNTS} page={1} pageSize={25} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage sourceNotice={null} />);
    expect(container.querySelector('[role="button"] [role="button"]')).toBeNull();
    const checkbox = screen.getByRole('checkbox', { name: 'Select Case case-1' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    fireEvent.keyDown(checkbox, { key: ' ' });
    expect(screen.getByRole('checkbox', { name: 'Select Case case-1' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByText('Assigned: all'));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/work?assignee=mine&page=1');
  });

  it('renders all ten runtime records even when all belong to one deadline group', () => {
    const items = Array.from({ length: 10 }, (_, index) => task(`live-${index}`, `Live task ${index}`));
    const { container } = render(<ExactWorkQueueOperations items={items} total={10} viewCounts={VIEW_COUNTS} page={1} pageSize={10} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage sourceNotice={null} />);
    expect(container.querySelectorAll('[data-work-item-id]')).toHaveLength(10);
    for (const item of items) expect(screen.getByRole('link', { name: item.objectLabel })).toHaveAttribute('href', item.objectHref);
    expect(screen.getByText('10 shown')).toBeInTheDocument();
    expect(screen.queryByText('CASE-4187')).not.toBeInTheDocument();
    expect(container.querySelectorAll('[role="checkbox"] svg')).toHaveLength(0);
    expect(screen.getByLabelText('Historical queue depth unavailable')).toBeInTheDocument();
  });

  it('does not turn unavailable cause filtering into an unrelated priority filter', () => {
    render(<ExactWorkQueueOperations items={ITEMS} total={2} viewCounts={VIEW_COUNTS} page={1} pageSize={10} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage sourceNotice={null} />);
    fireEvent.click(screen.getByText('Cause: all'));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Cause filtering is unavailable');
  });

  it('does not send hold mutations from the exact source for a read-only member', () => {
    window.history.replaceState(null, '', '/work?selected=case-1');
    const fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    render(<ExactWorkQueueOperations items={ITEMS} total={52} viewCounts={VIEW_COUNTS} page={1} pageSize={25} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage={false} sourceNotice={null} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select Case case-1' }));
    expect(screen.queryByRole('button', { name: 'Snooze 1 day' })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('moves row details onto a second line at the supplied compact-desk boundary', () => {
    const original = window.matchMedia;
    jest.spyOn(window, 'matchMedia').mockImplementation((query) => ({ ...original(query), matches: query === '(max-width: 1280px)' }));
    const { container } = render(<ExactWorkQueueOperations items={ITEMS} total={52} viewCounts={VIEW_COUNTS} page={1} pageSize={25} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage sourceNotice={null} />);
    expect(container.querySelector('[data-work-item-id="case-1"]')).toHaveStyle({ display: 'grid' });
    expect(screen.getByRole('link', { name: 'Case case-1' })).toBeVisible();
    expect(screen.getByText('Review delivery evidence')).toHaveStyle({ gridColumn: '3', gridRow: '1' });
  });

  it('implements the authority toolbar without the retired system-view strip', () => {
    renderQueue();
    expect(screen.getByRole('combobox', { name: 'Assigned' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Priority' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'State' })).toBeInTheDocument();
    expect(screen.getByLabelText('Queue depth, 14 days')).toBeInTheDocument();
    expect(screen.queryByText('SYSTEM VIEWS')).not.toBeInTheDocument();
  });

  it('uses the exact server total and never renders fictional bulk approval', async () => {
    renderQueue();
    expect(screen.getByText('2 of 52 shown · every row retains its source and deadline')).toBeInTheDocument();
    expect(screen.queryByText(/bulk approve/i)).not.toBeInTheDocument();
    expect(screen.getByText(/2 of 52 shown/)).toBeInTheDocument();
  });

  it('stores authority filters in URL query state', () => {
    renderQueue();
    fireEvent.change(screen.getByRole('combobox', { name: 'Priority' }), { target: { value: 'urgent' } });
    expect(push).toHaveBeenCalledWith('/work?priority=urgent');
  });

  it('sends optimistic version and a fresh idempotency key for a valid action', async () => {
    const fetchMock = jest.fn().mockImplementationOnce(() => ok({ task: { id: 'case-1', state_version: 4 } }));
    renderQueue(fetchMock);
    fireEvent.click(screen.getAllByRole('button', { name: 'Assign to me' })[0]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, options] = fetchMock.mock.calls[0];
    expect(fetchMock.mock.calls[0][0]).toBe('/api/work-tasks/case-1');
    expect(JSON.parse(options.body)).toEqual({ action: 'assign_to_me', expectedVersion: 3 });
    expect(options.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/i);
    expect(refresh).toHaveBeenCalled();
  });

  it('handles only the documented queue shortcuts and ignores form input', async () => {
    const fetchMock = jest.fn().mockImplementationOnce(() => ok({ task: { id: 'case-1', state_version: 4 } }));
    renderQueue(fetchMock);

    fireEvent.keyDown(document.body, { key: 'j' });
    expect(window.location.search).toBe('?selected=case-2');
    fireEvent.keyDown(document.body, { key: 'k' });
    expect(window.location.search).toBe('?selected=case-1');

    fireEvent.keyDown(document.body, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith(expect.stringContaining('/cases/case-1?return='));

    fireEvent.keyDown(document.body, { key: 'a' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const priority = screen.getByRole('combobox', { name: 'Priority' });
    priority.focus();
    fireEvent.keyDown(priority, { key: 'a' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves the exact Work return context in record links', async () => {
    window.history.replaceState(null, '', '/work?view=overdue&page=2&selected=case-1');
    renderQueue();
    const link = screen.getAllByRole('link', { name: 'Open' })[0];
    expect(link.getAttribute('href')).toContain('/cases/case-1?return=');
    expect(decodeURIComponent(link.getAttribute('href') ?? '')).toContain('/work?view=overdue&page=2&selected=case-1');
  });

  it('clears URL-backed selection from the authority bulk dock', async () => {
    window.history.replaceState(null, '', '/work?view=overdue&selected=case-1');
    renderQueue();
    expect(screen.getByRole('link', { name: 'Open selected' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    await waitFor(() => {
      expect(window.location.search).toBe('?view=overdue');
      expect(screen.queryByRole('link', { name: 'Open selected' })).not.toBeInTheDocument();
    });
  });
});
