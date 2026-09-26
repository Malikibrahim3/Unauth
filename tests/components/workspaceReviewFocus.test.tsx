/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BulkDeleteClient from '@/components/settings/BulkDeleteClient';
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

it('returns focus to the actual review opener after a pointer-triggered cancellation', async () => {
  render(<BulkDeleteClient workspaceId="local-focus-only" workspaceName="Local review" />);
  const input = screen.getByRole('textbox', { name: 'TYPE THE WORKSPACE NAME TO CONFIRM' });
  input.focus();
  fireEvent.change(input, { target: { value: 'DELETE LOCAL REVIEW' } });
  const opener = screen.getByRole('button', { name: 'Delete workspace', exact: true });
  fireEvent.click(opener);
  await screen.findByRole('dialog', { name: 'Delete this workspace?' });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(opener).toHaveFocus());
});
