/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CanonicalCsvImportClient } from '@/components/imports/CanonicalCsvImportClient';

describe('CanonicalCsvImportClient recovery', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(global, 'fetch');
  });

  it('links to a durable failed job when commit fails after job creation', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_rows: 1, valid_count: 1, error_count: 0, duplicates_skipped: 0, errors: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'commit_failed', detail: 'The write failed safely.', job_id: 'job-failed-p05' }),
      } as Response);
    Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: fetchMock });

    render(<CanonicalCsvImportClient />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    fireEvent.click(screen.getByRole('button', { name: 'Paste CSV text instead' }));
    fireEvent.change(screen.getByPlaceholderText('external_id,currency,total_minor'), {
      target: { value: 'external_id,currency,total_minor\norder-1,GBP,1200' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue to mapping' }));
    fireEvent.click(screen.getByRole('button', { name: 'Validate rows' }));

    expect(await screen.findByRole('heading', { name: 'Review and commit' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Commit 1 valid rows' }));

    await waitFor(() => expect(screen.getByRole('link', { name: 'Open failed job' })).toHaveAttribute('href', '/sources/imports/job-failed-p05'));
    expect(screen.getByText(/retained its mapping and row-level outcome/i)).toBeInTheDocument();
  });
});
