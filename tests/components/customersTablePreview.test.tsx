/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import CustomersTableClient from '@/components/customers/CustomersTableClient';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams('selected=customer-1'),
}));

jest.mock('@/components/customers/CustomerPreviewDrawer', () => ({
  CustomerPreviewDrawer: ({ id, onClose }: { id: string | null; onClose: () => void }) => (
    <div>
      <output data-testid="preview-id">{id ?? 'closed'}</output>
      <button type="button" onClick={onClose}>Close preview</button>
    </div>
  ),
}));

describe('CustomersTableClient preview state', () => {
  it('closes immediately while the URL replacement completes asynchronously', () => {
    render(<CustomersTableClient rows={[{
      id: 'customer-1',
      primary_email: 'customer@example.invalid',
      names: ['Customer One'],
      total_orders: 1,
      order_coverage: 'complete',
      total_spent: 25,
      total_spent_currency: 'GBP',
      has_mixed_currency: false,
      payout_cases_total: 1,
      payout_cases_open: 1,
      case_coverage: 'complete',
      has_refund_case: false,
      has_chargeback_case: false,
      last_order_at: '2026-07-20T12:00:00.000Z',
    }]} />);

    expect(screen.getByTestId('preview-id')).toHaveTextContent('customer-1');
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(screen.getByTestId('preview-id')).toHaveTextContent('closed');
    expect(mockReplace).toHaveBeenCalledWith('/customers', { scroll: false });
  });
});
