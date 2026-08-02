/**
 * @jest-environment jsdom
 *
 * Phase 04 (LP-CMP-04, LP-CMP-10, LP-CMP-11): the registry surface composes
 * toolbar + result count + table + pagination into ONE working surface, and
 * selection never borrows a semantic status style. Keyboard/screen-reader
 * assertions cover the changed interactions (labelled region, polite result
 * count, focusable row action, selected-row marker).
 */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { RegistrySurface } from '@/components/ui/RegistrySurface';
import { DataTable } from '@/components/ui/DataTable';
import { FilterChip } from '@/components/ui/FilterChip';

type Row = { id: string; name: string; amount: string };

const ROWS: Row[] = [
  { id: 'a', name: 'Acme Supplies', amount: '$1,240.00' },
  { id: 'b', name: 'Brightline Co.', amount: '$96.10' },
];

function renderRegistry(onOpen = jest.fn()) {
  const utils = render(
    <RegistrySurface
      aria-label="Cases registry"
      toolbar={
        <>
          <FilterChip active onClick={() => undefined}>All</FilterChip>
          <FilterChip onClick={() => undefined}>Escalated</FilterChip>
        </>
      }
      resultCount={`Showing 1–${ROWS.length} of ${ROWS.length}`}
      pagination={<button type="button">Next</button>}
    >
      <DataTable
        flush
        aria-label="Cases table"
        columns={[
          { key: 'name', header: 'Customer', render: (r) => r.name },
          { key: 'amount', header: 'Exposure', align: 'right', render: (r) => r.amount },
        ]}
        rows={ROWS}
        getRowKey={(r) => r.id}
        selectedKey="a"
        onRowClick={(r) => onOpen(r.id)}
        primaryColumnKey="name"
        primaryActionLabel={(r) => `Open ${r.name}`}
        rowActions={(r) => [{ label: 'Open record', onSelect: () => onOpen(r.id) }]}
      />
    </RegistrySurface>,
  );
  return { ...utils, onOpen };
}

describe('RegistrySurface — §8.3 one working surface', () => {
  it('composes toolbar, result count, table, and pagination inside one labelled region', () => {
    renderRegistry();

    // One region names the registry for assistive tech.
    const region = screen.getByRole('region', { name: 'Cases registry' });

    // Toolbar filters, result count, table, and pagination all live inside it.
    expect(within(region).getByRole('button', { name: 'All', pressed: true })).toBeInTheDocument();
    expect(within(region).getByText('Showing 1–2 of 2')).toBeInTheDocument();
    expect(within(region).getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(within(region).getByText('Acme Supplies')).toBeInTheDocument();
  });

  it('announces the result count in a polite live region (screen-reader)', () => {
    renderRegistry();
    const count = screen.getByText('Showing 1–2 of 2');
    expect(count).toHaveAttribute('aria-live', 'polite');
    expect(count).toHaveAttribute('role', 'status');
  });

  it('renders the table flush so the surface owns the single frame (§8.3)', () => {
    const { container } = renderRegistry();
    expect(container.querySelector('.ua-data-table.ua-data-table--flush')).toBeInTheDocument();
    // The flush table keeps overflow bounded; the surface clips it.
    expect(container.querySelector('.ua-registry-surface')).toBeInTheDocument();
  });

  it('keeps the row action a focusable button, never removed from the a11y tree (keyboard)', () => {
    const { onOpen } = renderRegistry();
    const triggers = screen.getAllByRole('button', { name: 'Row actions' });
    expect(triggers).toHaveLength(ROWS.length);
    for (const trigger of triggers) {
      expect(trigger).not.toHaveAttribute('aria-hidden', 'true');
      expect(trigger.tagName).toBe('BUTTON');
    }

    fireEvent.click(triggers[0]);
    const item = screen.getByRole('menuitem', { name: 'Open record' });
    fireEvent.click(item);
    expect(onOpen).toHaveBeenCalledWith('a');
  });

  it('marks the selected row with aria-selected and the accent marker class — never a semantic status style (LP-CMP-10)', () => {
    const { container } = renderRegistry();
    const selected = container.querySelector('.ua-data-table__row--selected');
    expect(selected).toBeInTheDocument();
    expect(selected).toHaveAttribute('aria-selected', 'true');
    // Selection is the neutral/accent marker only — it must not reuse a
    // semantic status tone (success/warning/danger/info) or the status badge.
    const cls = selected?.className ?? '';
    expect(cls).not.toMatch(/ua-status-badge|ua-(success|warning|danger|critical|info)/);
  });
});

describe('FilterChip selection is accent, never semantic (LP-CMP-10)', () => {
  it('applies the accent selection tokens and no semantic tone when active', () => {
    render(<FilterChip active onClick={() => undefined}>Open cases</FilterChip>);
    const chip = screen.getByRole('button', { name: 'Open cases', pressed: true });
    const cls = chip.className;
    // Accent selection language (§4.2): accent-100 fill, accent-200 border, accent-800 text.
    expect(cls).toContain('bg-[var(--ua-accent-100)]');
    expect(cls).toContain('border-[var(--ua-accent-200)]');
    expect(cls).toContain('text-[var(--ua-accent-800)]');
    // Never a semantic status tone or the status badge.
    expect(cls).not.toMatch(/ua-status-badge|--ua-(success|warning|risk-critical|critical|info)/);
  });
});
