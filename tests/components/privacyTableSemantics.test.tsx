/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import PrivacyPage from '@/app/(public)/legal/privacy/page';

it('exposes the existing privacy data table with its headers and all six records', () => {
  render(<PrivacyPage />);
  const table = screen.getByRole('table', { name: 'What is collected' });
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(['Data', 'Why', 'Kept for']);
  expect(within(table).getAllByRole('row')).toHaveLength(7);
  expect(within(table).getAllByRole('cell')).toHaveLength(18);
  expect(within(table).getByRole('cell', { name: 'Account email and password hash' })).toBeInTheDocument();
  expect(within(table).getByRole('cell', { name: 'Support correspondence' })).toBeInTheDocument();
});

import SuppliedRouteSurface from '@/components/visual-authority/SuppliedRouteSurface';
import DataHandlingVisual from '@/components/visual-authority/generated/Legal-Data-Handling-Clean';
import DpaVisual from '@/components/visual-authority/generated/Legal-DPA-Clean';

it.each([
  ['data-handling-explainer', DataHandlingVisual, 'The chain a record travels', ['Stage', 'What happens', 'Reversible']],
  ['data-processing-addendum', DpaVisual, 'Personal data categories', ['Category', 'Examples', 'Subjects']],
] as const)('exposes the existing %s table without losing its rows', (surfaceId, source, name, headers) => {
  render(<SuppliedRouteSurface source={source} surfaceId={surfaceId} />);
  const table = screen.getByRole('table', { name });
  expect(within(table).getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual(headers);
  expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
  expect(within(table).getAllByRole('cell').length).toBe((within(table).getAllByRole('row').length - 1) * 3);
});
