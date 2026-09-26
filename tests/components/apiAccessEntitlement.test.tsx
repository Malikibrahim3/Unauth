/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ApiIntegrationsAdvancedSection from '@/components/settings/ApiIntegrationsAdvancedSection';

const mockUseFetchJson = jest.fn();

jest.mock('@/lib/react/useFetchJson', () => ({
  useFetchJson: (...args: unknown[]) => mockUseFetchJson(...args),
}));

describe('API access commercial entitlement', () => {
  beforeEach(() => {
    mockUseFetchJson.mockReturnValue({
      data: null,
      loading: false,
      reload: jest.fn(),
      error: null,
    });
  });

  it('shows no key creation control when durable machine access is disabled', () => {
    render(<ApiIntegrationsAdvancedSection machineAccessEnabled={false} />);

    expect(screen.getByText('Enterprise machine access is unavailable for the workspace’s provider-confirmed plan.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a key' })).toBeDisabled();
    expect(mockUseFetchJson).toHaveBeenCalledWith(
      '/api/settings/api-keys',
      expect.objectContaining({ enabled: false }),
    );
  });

  it('renders the scoped key lifecycle only when durable access is enabled', () => {
    render(<ApiIntegrationsAdvancedSection machineAccessEnabled />);

    expect(screen.getByRole('button', { name: 'Create a key' })).toBeInTheDocument();
    expect(mockUseFetchJson).toHaveBeenCalledWith(
      '/api/settings/api-keys',
      expect.objectContaining({ enabled: true }),
    );
  });

  it('keeps a failed creation visible inside the dialog and prevents dismissal while creating', async () => {
    const originalFetch = global.fetch;
    let finish!: (value: Response) => void;
    global.fetch = jest.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    try {
      render(<ApiIntegrationsAdvancedSection machineAccessEnabled />);
      fireEvent.click(screen.getByRole('button', { name: 'Create a key' }));
      const dialog = await screen.findByRole('dialog');
      fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'Local failure test' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Create key' }));
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await act(async () => finish({ ok: false, json: async () => ({ error: 'Local test denial' }) } as Response));
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Local test denial');
      expect(within(dialog).getByRole('button', { name: 'Create key' })).toBeEnabled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('submits the retained fields from the supplied frame footer and clears reveal-once credentials on close', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ key: { secret: 'local-test-secret', widget_token: 'local-widget-token' } }),
    } as Response);
    global.fetch = fetchMock;
    try {
      render(<ApiIntegrationsAdvancedSection machineAccessEnabled />);
      fireEvent.click(screen.getByRole('button', { name: 'Create a key' }));
      const dialog = await screen.findByRole('dialog', { name: 'Create an API key' });
      expect(dialog).toHaveAttribute('data-source-dialog-frame', 'Write-Off-Clean');
      expect(dialog).toHaveStyle({ width: '620px' });
      fireEvent.change(within(dialog).getByLabelText('Label'), { target: { value: 'Local integration' } });
      const scopes = within(dialog).getAllByRole('checkbox');
      if (!scopes.some((input) => (input as HTMLInputElement).checked)) fireEvent.click(scopes[0]);
      const submit = within(dialog).getByRole('button', { name: 'Create key' });
      expect((submit as HTMLButtonElement).form?.id).toBe('source-api-create-form');
      fireEvent.click(submit);
      await screen.findByText('local-test-secret');
      expect(fetchMock).toHaveBeenCalledWith('/api/settings/api-keys', expect.objectContaining({
        method: 'POST', body: expect.stringContaining('Local integration'),
      }));
      fireEvent.click(screen.getByRole('button', { name: 'I saved these credentials' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'Create a key' }));
      await screen.findByRole('dialog', { name: 'Create an API key' });
      expect(screen.queryByText('local-test-secret')).not.toBeInTheDocument();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
