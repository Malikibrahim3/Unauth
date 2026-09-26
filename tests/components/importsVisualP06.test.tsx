/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ImportsVisualClient } from '@/components/imports/ImportsVisualClient';

jest.mock('@/components/layout/SetBreadcrumbLabel', () => ({ SetBreadcrumbLabel: () => null }));
jest.mock('@/components/navigation/AppNavLink', () => ({ __esModule: true, default: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} /> }));

it('explains requirements before the file picker and keeps validation separate from review', async () => {
  const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ total_rows: 1, valid_count: 1, error_count: 0, duplicates_skipped: 0, errors: [] }) });
  global.fetch = fetchMock;
  const { container } = render(<ImportsVisualClient history={[]} holdRateTimeseries={[]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Upload a file' }));
  expect(screen.getByText(/Maximum 20 MB/)).toBeInTheDocument();
  const file = new File(['external_id,currency\n"order,001",GBP'], 'orders.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => 'external_id,currency\n"order,001",GBP' });
  fireEvent.input(container.querySelector('input[type=file]')!, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Validate mapping' })).toBeInTheDocument());
  expect(screen.getByText('order,001')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Validate mapping' }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(fetchMock.mock.calls[0][0]).toBe('/api/imports/csv/validate');
  expect(container.querySelector('[data-overlay-id="import-commit"]')).not.toBeInTheDocument();
});

it('holds commit review while pending and reuses the import identity after an uncertain response', async () => {
  Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: () => 'a6000000-0000-4000-8000-000000000006' });
  let rejectCommit: (reason: Error) => void = () => {};
  const fetchMock = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ total_rows: 1, valid_count: 1, error_count: 0, duplicates_skipped: 0, errors: [] }) })
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectCommit = reject; }))
    .mockResolvedValueOnce({ ok: true, status: 202, json: async () => ({ job_id: 'a6000000-0000-4000-8000-000000000006', status: 'running', message: 'Open the existing job.' }) });
  global.fetch = fetchMock;
  const { container } = render(<ImportsVisualClient history={[]} holdRateTimeseries={[]} initialStep="upload" />);
  const file = new File(['external_id,currency\norder-001,GBP'], 'orders.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => 'external_id,currency\norder-001,GBP' });
  fireEvent.input(container.querySelector('input[type=file]')!, { target: { files: [file] } });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Review import' })).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: 'Review import' }));
  const post = await screen.findByRole('button', { name: 'Post validated rows' });
  fireEvent.click(post);
  fireEvent.click(post);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  rejectCommit(new Error('Network response lost'));
  const check = await screen.findByRole('button', { name: 'Check same import' });
  fireEvent.click(check);
  await screen.findByRole('link', { name: 'Review existing import job' });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).import_id).toBe(JSON.parse(fetchMock.mock.calls[2][1].body).import_id);
  expect(screen.queryByText(/rows posted in job/)).not.toBeInTheDocument();
});
