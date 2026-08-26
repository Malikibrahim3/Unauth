/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LossActions } from '@/components/losses/LossActions';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

describe('LossActions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    refresh.mockReset();
  });

  it('requires an audit reason before appending a write-off entry', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    global.fetch = fetchMock as never;

    render(
      <LossActions
        lossId="loss-1"
        canManage
        writeOffAmountMinor={1234}
        currency="GBP"
        writeOffState="available"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /write off outstanding/i }));
    expect(screen.getByText('£12.34')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm write-off/i })).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: /reason/i }), {
      target: { value: 'Carrier deadline expired after final documented chase.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm write-off/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith('/api/losses/loss-1', expect.objectContaining({ method: 'PATCH' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'write_off',
      rationale: 'Carrier deadline expired after final documented chase.',
    });
    expect(await screen.findByText(/original loss and recovery history remain unchanged/i)).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
