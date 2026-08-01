/**
 * @jest-environment jsdom
 *
 * Phase 17: CSV mapping should describe record details in merchant language,
 * before the validation/commit boundary is reached.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { CanonicalCsvImportClient } from '@/components/imports/CanonicalCsvImportClient';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

describe('Phase 17 CSV import mapping', () => {
  it('uses merchant-facing record-detail labels before validation', () => {
    render(<CanonicalCsvImportClient />);

    fireEvent.change(screen.getByPlaceholderText(/Order ID,Currency/), {
      target: { value: 'Merchant order reference,Currency,Value in pence\nORDER-1,GBP,8400' },
    });

    expect(screen.getByRole('heading', { name: '2. Match columns' })).toBeInTheDocument();
    expect(screen.getByLabelText('Map Merchant order reference')).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Source record ID' })).not.toHaveLength(0);
    expect(screen.getAllByRole('option', { name: 'Order total (integer, no decimal separator)' })).not.toHaveLength(0);
    expect(screen.getByText(/Validation performs no writes/)).toBeInTheDocument();
  });
});
