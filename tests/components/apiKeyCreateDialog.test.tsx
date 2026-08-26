/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiKeyCreateDialog } from '@/components/settings/ApiKeyCreateDialog';
import { initialApiIntegrationsState } from '@/components/settings/apiIntegrationsReducer';

const handlers = {
  onClose: jest.fn(),
  onCreate: jest.fn(),
  onCopySecret: jest.fn(),
  onCopyWidgetToken: jest.fn(),
  onKeyNameChange: jest.fn(),
  onScopesChange: jest.fn(),
  onRateLimitChange: jest.fn(),
};

describe('ApiKeyCreateDialog one-time reveal boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires deliberate acknowledgement after revealing a secret', async () => {
    render(
      <ApiKeyCreateDialog
        open
        state={{ ...initialApiIntegrationsState, createdSecret: 'unauth_secret_once' }}
        {...handlers}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Save your credentials' })).toBeVisible();
    expect(screen.getByText('unauth_secret_once')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handlers.onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'I saved these credentials' }));
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps a create failure inside the open dialog', async () => {
    render(
      <ApiKeyCreateDialog
        open
        state={{
          ...initialApiIntegrationsState,
          keyName: 'Support integration',
          message: { type: 'error', text: 'The key could not be created.' },
        }}
        {...handlers}
      />,
    );

    const dialog = await screen.findByRole('dialog', { name: 'Create API key' });
    expect(dialog).toContainElement(screen.getByRole('alert'));
    expect(screen.getByRole('alert')).toHaveTextContent('The key could not be created.');
    await waitFor(() => expect(dialog).toHaveAttribute('data-overlay-state', 'open'));
  });
});
