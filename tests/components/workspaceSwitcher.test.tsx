/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher';

const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const workspaces = [
  { id: '56000000-0000-4000-8000-000000000001', name: 'Northstar', role: 'owner' },
  { id: '56000000-0000-4000-8000-000000000002', name: 'Harbour', role: 'admin' },
  { id: '56000000-0000-4000-8000-000000000003', name: 'Read-only', role: 'viewer' },
];

describe('WorkspaceSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts the exact membership and re-enables repeated switching after success', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;
    render(
      <WorkspaceSwitcher
        workspaces={workspaces}
        activeMerchantId={workspaces[0]!.id}
      />,
    );
    const select = screen.getByRole('combobox', { name: 'Active workspace' });

    fireEvent.change(select, { target: { value: workspaces[1]!.id } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(select).toBeEnabled());

    fireEvent.change(select, { target: { value: workspaces[2]!.id } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(select).toBeEnabled());

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/workspace', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ merchantId: workspaces[1]!.id }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/workspace', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ merchantId: workspaces[2]!.id }),
    }));
    expect(mockRefresh).toHaveBeenCalledTimes(2);
  });
});
