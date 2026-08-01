/**
 * @jest-environment jsdom
 *
 * Phase 16: flows should read as a bounded causal sequence, and a no-op draft
 * must not consume space with an empty impact rail.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { FlowVersionWorkbench, type WorkflowVersionRecord } from '@/components/rules/FlowVersionWorkbench';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const published: WorkflowVersionRecord = {
  id: 'published-v1',
  version: 1,
  status: 'published',
  active: true,
  name: 'Chase missing delivery evidence',
  description: 'Route incomplete delivery evidence to the recovery team.',
  trigger_event_type: 'case.updated',
  conditions: [{ field: 'case.status', operator: 'eq', value: 'evidence_needed' }],
  outputs: [{ type: 'create_task', title: 'Request delivery evidence', priority: 'high', dueInHours: 24 }],
  created_at: '2026-07-01T10:00:00.000Z',
  updated_at: '2026-07-01T10:00:00.000Z',
  published_at: '2026-07-01T10:00:00.000Z',
};

describe('Phase 16 flow detail', () => {
  it('puts the trigger, conditions, and bounded actions in a readable sequence', () => {
    render(<FlowVersionWorkbench versions={[published]} currentId={published.id} canManage publicationEnabled />);

    const sequence = screen.getByRole('list', { name: 'Flow execution sequence' });
    expect(sequence).toHaveTextContent('Trigger');
    expect(sequence).toHaveTextContent('Conditions');
    expect(sequence).toHaveTextContent('Bounded action');
    expect(sequence).toHaveTextContent('never make or issue payout decisions');
    expect(screen.queryByRole('heading', { name: 'Draft changes' })).not.toBeInTheDocument();
  });

  it('shows a draft comparison only for a changed published configuration', () => {
    const draft: WorkflowVersionRecord = {
      ...published,
      id: 'draft-v2',
      version: 2,
      status: 'draft',
      active: false,
      outputs: [{ type: 'set_deadline', dueInHours: 12 }],
      created_at: '2026-07-02T10:00:00.000Z',
      updated_at: '2026-07-02T10:00:00.000Z',
      published_at: null,
    };

    render(<FlowVersionWorkbench versions={[draft, published]} currentId={draft.id} canManage publicationEnabled />);

    expect(screen.getByRole('heading', { name: 'Draft changes' })).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
