/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationCentre } from '@/components/notifications/NotificationCentre';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('NotificationCentre', () => {
  it('marks an unread notification before opening its internal target', async () => {
    const unreadChanges: number[] = [];
    window.addEventListener('unauth:notification-unread-change', ((event: CustomEvent<{ unreadCount: number }>) => unreadChanges.push(event.detail.unreadCount)) as EventListener);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as never;
    render(<NotificationCentre initialNotifications={[{
      id: 'n1', kind: 'mention', title: 'Mentioned', body: 'Please review',
      target_href: '/cases/case-1', read_at: null, created_at: '2026-07-11T10:00:00Z',
    }]} />);
    fireEvent.click(screen.getByRole('button', { name: /mentioned/i }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/notifications/n1/read', { method: 'POST' }));
    expect(push).toHaveBeenCalledWith('/cases/case-1');
    await waitFor(() => expect(unreadChanges).toContain(0));
  });

  it('shows an empty state', () => {
    render(<NotificationCentre initialNotifications={[]} />);
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });
});
