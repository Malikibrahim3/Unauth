/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function renderCurrent(items = ITEMS) {
  return render(<ExactWorkQueueOperations items={items} total={52} viewCounts={VIEW_COUNTS} page={1} pageSize={10} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage sourceNotice={null} />);
}
beforeEach(() => { window.history.replaceState(null, '', '/work'); jest.clearAllMocks(); global.fetch = jest.fn().mockImplementation(() => ok({})) as never; });
it('starts unselected, uses the supported assignee value and names the next page size', () => {
  renderCurrent();
  expect(screen.queryByRole('button', { name: 'Snooze 1 day' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Show next 10 items' })).toHaveAttribute('href', '/work?page=2');
  fireEvent.click(screen.getByRole('button', { name: 'Assigned: all' }));
  expect(push).toHaveBeenCalledWith('/work?assignee=mine&page=1');
});
it('reviews exact selected targets without writing on cancellation and clears selection on a changed scope', async () => {
  const view = renderCurrent();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select Case case-1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Snooze 1 day' }));
  expect(screen.getByRole('dialog')).toHaveTextContent('version 3');
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(global.fetch).not.toHaveBeenCalled();
  window.history.replaceState(null, '', '/work?page=2');
  view.rerender(<ExactWorkQueueOperations items={ITEMS} total={52} viewCounts={VIEW_COUNTS} page={2} pageSize={10} asOf="2026-08-23T10:00:00.000Z" currentUserId="user-1" canManage sourceNotice={null} />);
  expect(screen.queryByRole('button', { name: 'Snooze 1 day' })).not.toBeInTheDocument();
});
it('retries only the uncertain target with the original action identity after partial success', async () => {
  const fetchMock = jest.fn().mockImplementationOnce(() => ok({})).mockRejectedValueOnce(new Error('Connection lost')).mockImplementationOnce(() => ok({}));
  global.fetch = fetchMock as never;
  renderCurrent();
  for (const checkbox of screen.getAllByRole('checkbox')) fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: 'Snooze 1 day' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm task update' }));
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('1 of 2 updates confirmed'));
  fireEvent.click(screen.getByRole('button', { name: 'Retry remaining updates' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(fetchMock.mock.calls[1]).toEqual(fetchMock.mock.calls[2]);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ action: 'snooze', expectedVersion: 3 });
});
