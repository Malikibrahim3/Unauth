/**
 * @jest-environment jsdom
 */
import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClaimsQueueClient } from '@/app/(app)/cases/ClaimsQueueClient';
import type { ClaimRow } from '@/app/(app)/cases/claimsPageData';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function claim(id: string, amount: number): ClaimRow {
  return {
    id,
    customer_id: null,
    shop_domain: 'example.test',
    shopify_order_id: `order-${id}`,
    claim_type: 'missing_parcel',
    status: 'open',
    amount_at_risk: amount,
    currency: 'GBP',
    submitted_at: '2026-08-01T09:00:00.000Z',
    created_at: '2026-08-01T09:00:00.000Z',
    updated_at: '2026-08-07T09:00:00.000Z',
  };
}

describe('ClaimsQueueClient selection continuity', () => {
  it('selects the first remaining case when a URL-backed query removes the prior selection', async () => {
    window.history.replaceState(null, '', '/cases?selected=case-a');
    const common = {
      outcomesRecord: {},
      evidenceRecord: {},
      customersRecord: {},
      currentUserId: 'user-1',
    };
    const { container, rerender } = render(
      <ClaimsQueueClient {...common} claims={[claim('case-a', 12000), claim('case-b', 3400)]} initialSelectedCaseId="case-a" />,
    );

    expect(container.querySelector('[data-case-id="case-a"]')).toHaveAttribute('aria-selected', 'true');

    rerender(
      <ClaimsQueueClient {...common} claims={[claim('case-b', 3400)]} initialSelectedCaseId={null} />,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-case-id="case-b"]')).toHaveAttribute('aria-selected', 'true');
      expect(window.location.search).toBe('?selected=case-b');
    });
  });

  it('uses the five-column supplied ledger and retains the selected context', () => {
    const row = {
      ...claim('case-a', 12000),
      order_ref: '#1001',
      recovery_owner: 'carrier',
      recovery_next_action: 'submit_carrier_claim',
      loss_attribution: 'carrier_loss',
      attribution_confidence: 'high',
    } as ClaimRow;
    const { container } = render(
      <ClaimsQueueClient claims={[row]} outcomesRecord={{}} evidenceRecord={{}} customersRecord={{}} currentUserId="user-1" initialSelectedCaseId="case-a" />,
    );
    expect(Array.from(container.querySelectorAll('[role="columnheader"]')).map((cell) => cell.textContent)).toEqual([
      'CASE',
      'CUSTOMER · REASON',
      'STATUS',
      'NEXT ACTION',
      'AT RISK',
    ]);
    expect(container.querySelector('[aria-label="Selected case preview"]')).toHaveTextContent('Next action');
    expect(container.querySelector('[aria-label="Selected case preview"]')).toHaveTextContent('CUSTOMER CONTEXT');
  });

  it('keeps the selected case bounded and expands through the canonical case page', () => {
    render(
      <ClaimsQueueClient
        claims={[claim('case-a', 12000)]}
        outcomesRecord={{}}
        evidenceRecord={{}}
        customersRecord={{}}
        currentUserId="user-1"
        initialSelectedCaseId="case-a"
      />,
    );

    expect(screen.getByRole('region', { name: 'Selected case preview' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Expand case' })).toHaveAttribute(
      'href',
      '/cases/case-a?return=%2Fcases%3Fselected%3Dcase-a',
    );
  });

  it('closes a URL-backed preview without reopening the initial selection', async () => {
    window.history.replaceState(null, '', '/cases?selected=case-a');
    const { container } = render(
      <ClaimsQueueClient
        claims={[claim('case-a', 12000)]}
        outcomesRecord={{}}
        evidenceRecord={{}}
        customersRecord={{}}
        currentUserId="user-1"
        initialSelectedCaseId="case-a"
      />,
    );

    act(() => {
      screen.getByRole('button', { name: 'Close case preview' }).click();
    });

    await waitFor(() => {
      expect(container.querySelector('[aria-label="Selected case preview"]')).not.toBeInTheDocument();
      expect(window.location.search).toBe('');
    });
  });

  it('owns the five-column ledger and bounded preview directly in the authority renderer', () => {
    const source = readFileSync(join(process.cwd(), 'app/(app)/cases/ClaimsQueueClient.tsx'), 'utf8');
    expect(source).toContain("gridTemplateColumns: '86px minmax(0,1fr) 128px 132px 84px'");
    expect(source).toContain("gridTemplateColumns: '86px minmax(0,1fr) 128px 132px 84px'");
    expect(source).toContain('data-preview-open');
    expect(source).not.toContain('ua-case-queue');
  });
});
