/**
 * @jest-environment jsdom
 *
 * Phase 13: recovery stages remain operationally distinct without categorical
 * decoration, and recovery value movement stays tied to dated ledger entries.
 */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { RECOVERY_BOARD_COLUMNS } from '@/lib/recoveries/status';
import { RECOVERY_CASE_STATUSES } from '@/lib/recoveries/types';
import { RecoveryProgress, RecoveryTrend } from '@/components/recoveries/RecoveryVisuals';

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as typeof ResizeObserver;
});

describe('Phase 13 recovery surfaces', () => {
  it('groups every operational status into one of four readable board stages', () => {
    expect(RECOVERY_BOARD_COLUMNS).toHaveLength(4);
    for (const status of RECOVERY_CASE_STATUSES) {
      expect(RECOVERY_BOARD_COLUMNS.flatMap((column) => column.statuses).filter((item) => item === status)).toHaveLength(1);
    }
  });

  it('renders a weekly recovery trend with an equivalent data table', () => {
    render(
      <RecoveryTrend
        currency="GBP"
        mixedCurrencyCount={0}
        points={[
          { key: '2026-W01', label: 'Week 1, 2026', recoveredMinor: 1000, outstandingMinor: 9000, recoveryRate: 0.1 },
          { key: '2026-W02', label: 'Week 2, 2026', recoveredMinor: 2500, outstandingMinor: 6500, recoveryRate: 0.3 },
          { key: '2026-W03', label: 'Week 3, 2026', recoveredMinor: 1500, outstandingMinor: 5000, recoveryRate: 0.5 },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Is recoverable value converting into cash?' })).toBeInTheDocument();
    expect(screen.getByText(/Recovered value is the weekly cash/)).toBeInTheDocument();
    expect(screen.getByRole('table')).toHaveTextContent('Week 2, 2026');
    expect(screen.getByRole('table')).toHaveTextContent('£25.00');
  });

  it('keeps the detail progression factual and distinguishes approved from recovered value', () => {
    render(
      <RecoveryProgress
        currency="GBP"
        steps={[
          { key: 'sought', label: 'Sought', valueMinor: 10000, detail: 'Amount actively pursued' },
          { key: 'approved', label: 'Approved', valueMinor: 7000, detail: 'Source-approved, not cash' },
          { key: 'recovered', label: 'Recovered', valueMinor: 2500, detail: 'Received or credited' },
          { key: 'outstanding', label: 'Outstanding', valueMinor: 7500, detail: 'Still being pursued' },
        ]}
      />,
    );

    expect(screen.getByRole('heading', { name: 'How far has this recovery progressed?' })).toBeInTheDocument();
    expect(screen.getByText('Source-approved, not cash')).toBeInTheDocument();
    expect(screen.getByText('Received or credited')).toBeInTheDocument();
  });
});
