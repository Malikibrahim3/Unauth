/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ImportJobDetail, type ImportJobRecord } from '@/components/imports/ImportJobDetail';

function job(overrides: Partial<ImportJobRecord> = {}): ImportJobRecord {
  return {
    id: 'job-p05',
    job_kind: 'csv_import',
    source: 'csv',
    status: 'completed',
    label: 'August order recovery',
    storage_path: null,
    file_hash: 'a'.repeat(64),
    column_map: { source_id: 'external_id', amount: 'total_minor' },
    total_rows: 3,
    processed_rows: 2,
    failed_rows: 1,
    error_log: [{ row: 3, field: 'externalId', code: 'required_field_missing', message: 'external_id missing' }],
    created_at: '2026-08-07T09:00:00.000Z',
    started_at: '2026-08-07T09:00:01.000Z',
    completed_at: '2026-08-07T09:00:04.000Z',
    updated_at: '2026-08-07T09:00:04.000Z',
    attempts: 1,
    max_attempts: 1,
    next_attempt_at: null,
    last_error_code: null,
    cursor: {
      dataset: 'orders',
      file_name: 'orders.csv',
      file_size: 512,
      imported_by: 'operator@example.test',
      duplicates_skipped: 0,
      validation_valid_rows: 2,
    },
    ...overrides,
  };
}

describe('ImportJobDetail', () => {
  it('renders immutable mapping, row recovery evidence and truthful actions', () => {
    render(<ImportJobDetail job={job()} />);

    expect(screen.getByRole('heading', { name: 'What happened, in order' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Retained mapping snapshot' })).toBeInTheDocument();
    expect(screen.getByText('external_id')).toBeInTheDocument();
    expect(screen.getByText('external_id missing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download error rows' })).toHaveAttribute('href', '/api/imports/job-p05/errors');
    expect(screen.queryByRole('button', { name: 'Cancel job' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Start a new import' })[0]).toHaveAttribute('href', '/sources/imports?step=upload');
  });

  it('offers a new import after failure without pretending a retry exists', () => {
    render(<ImportJobDetail job={job({ status: 'failed', processed_rows: 0, completed_at: null, last_error_code: 'commit_failed' })} />);

    expect(screen.getByText(/Failed · no records written/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Start a new import' })[0]).toHaveAttribute('href', '/sources/imports?step=upload');
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('does not mark unrecorded queued stages complete', () => {
    render(<ImportJobDetail job={job({ status: 'queued', total_rows: null, column_map: null, error_log: null, processed_rows: 0, failed_rows: 0, completed_at: null, cursor: { dataset: 'orders', file_name: 'orders.csv' } })} />);

    expect(screen.getByText('Waiting to parse source rows')).toBeInTheDocument();
    expect(screen.getByText('Waiting for a retained mapping snapshot')).toBeInTheDocument();
    expect(screen.getByText('Waiting for validation')).toBeInTheDocument();
    expect(screen.getByText('Waiting to commit')).toBeInTheDocument();
  });

  it('renders a partial job as a terminal incomplete outcome', () => {
    render(<ImportJobDetail job={job({ status: 'partial', processed_rows: 1, completed_at: '2026-08-07T09:00:04.000Z' })} />);

    expect(screen.getByText(/1 record written · outcome incomplete/)).toBeInTheDocument();
    expect(screen.queryByText('Waiting to commit')).not.toBeInTheDocument();
  });
});
