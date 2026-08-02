/**
 * @jest-environment jsdom
 *
 * Phase 15: rules are a causal configuration surface, not a passive document
 * plus an always-empty draft-impact rail.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { RuleVersionWorkbench, type RuleVersionRecord } from '@/components/rules/RuleVersionWorkbench';

jest.mock('@/components/rules/RuleBuilderDrawer', () => ({
  RuleBuilderDrawer: () => null,
}));

const published: RuleVersionRecord = {
  id: 'published-v1',
  version: 1,
  status: 'published',
  name: 'Review high-value refunds',
  description: 'Protect high-value refund decisions.',
  conditions: [{ id: 'condition-1', field: 'order_value_usd', operator: 'gte', value: 100 }],
  action: 'manual_review',
  condition_operator: 'and',
  priority: 0,
  created_at: '2026-07-01T10:00:00.000Z',
  published_at: '2026-07-01T10:00:00.000Z',
};

describe('Phase 15 rule detail', () => {
  it('puts rule logic in When, If, Recommend order and makes merchant authority explicit', () => {
    render(<RuleVersionWorkbench ruleId="rule-1" initialVersions={[published]} canManage />);

    expect(screen.getByRole('heading', { name: 'Review high-value refunds' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Rule evaluation sequence' })).toHaveTextContent('When');
    expect(screen.getByRole('list', { name: 'Rule evaluation sequence' })).toHaveTextContent('If');
    expect(screen.getByRole('list', { name: 'Rule evaluation sequence' })).toHaveTextContent('Recommend');
    expect(screen.getByText(/your team retains every payout decision/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Draft changes' })).not.toBeInTheDocument();
  });

  it('shows a draft comparison only when a published configuration has changed', () => {
    const draft: RuleVersionRecord = {
      ...published,
      id: 'draft-v2',
      version: 2,
      status: 'draft',
      action: 'approve',
      created_at: '2026-07-02T10:00:00.000Z',
      published_at: null,
    };

    render(<RuleVersionWorkbench ruleId="rule-1" initialVersions={[draft, published]} canManage />);

    expect(screen.getByRole('heading', { name: 'Draft changes' })).toBeInTheDocument();
    expect(screen.getByText('Recommendation')).toBeInTheDocument();
    expect(screen.getAllByText('Approve payout')).toHaveLength(2);
  });
});
