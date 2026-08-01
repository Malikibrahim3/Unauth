/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgreementSettingsClient } from '@/components/settings/AgreementSettingsClient';
import { NotificationPreferencesForm } from '@/components/settings/NotificationPreferencesForm';

describe('Phase 22 governance settings', () => {
  it('shows server-loaded agreement status before the upload task', () => {
    render(<AgreementSettingsClient initialAgreements={[{
      id: 'agreement-1', agreement_type: 'COURIER', counterparty_name: 'Northline Carrier',
      service_name: 'Parcel delivery', document_name: 'northline.pdf', status: 'active',
      effective_from: '2026-01-01', effective_to: null, version_label: '2026 terms', created_at: '2026-01-01T00:00:00.000Z',
    }]} />);

    expect(screen.getByRole('heading', { name: 'Agreements on file' })).toBeInTheDocument();
    expect(screen.getByText('Northline Carrier')).toBeInTheDocument();
    expect(screen.getByText('Active terms')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Upload source document' })).toBeInTheDocument();
    expect(screen.getByText(/does not activate terms/i)).toBeInTheDocument();
  });

  it('groups notification preferences and restores a failed optimistic change', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: false } as Response);
    Object.defineProperty(global, 'fetch', { configurable: true, value: fetchMock });
    render(<NotificationPreferencesForm initial={[{ kind: 'assignment', in_app_enabled: true, email_enabled: false }]} />);

    expect(screen.getByRole('heading', { name: 'Review and ownership' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evidence and operations' })).toBeInTheDocument();
    const assignment = screen.getByRole('switch', { name: 'Assignments in app' });
    expect(assignment).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(assignment);
    await waitFor(() => expect(assignment).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByText(/previous preference was restored/i)).toBeInTheDocument();
    Object.defineProperty(global, 'fetch', { configurable: true, value: originalFetch });
  });
});
