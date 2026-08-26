/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ConnectionActions } from '@/components/integrations/ConnectionActions';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));

describe('ConnectionActions one-time credential boundary', () => {
  it('clears carrier secrets when the credential dialog closes', async () => {
    render(
      <ConnectionActions
        providerId="ups"
        providerName="UPS"
        configuration="not_configured"
        operational="unknown"
        badge="disconnected"
        canManage
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Connect UPS' }));
    const clientId = await screen.findByLabelText('Client ID');
    const clientSecret = screen.getByLabelText('Client secret');
    const accountNumber = screen.getByLabelText(/Shipper account number/i);
    fireEvent.change(clientId, { target: { value: 'client-credential' } });
    fireEvent.change(clientSecret, { target: { value: 'secret-credential' } });
    fireEvent.change(accountNumber, { target: { value: 'account-credential' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Connect UPS' }));
    expect(await screen.findByLabelText('Client ID')).toHaveValue('');
    expect(screen.getByLabelText('Client secret')).toHaveValue('');
    expect(screen.getByLabelText(/Shipper account number/i)).toHaveValue('');
  });
});
