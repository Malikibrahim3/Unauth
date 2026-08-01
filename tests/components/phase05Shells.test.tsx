/**
 * @jest-environment jsdom
 *
 * Phase 05 (LP-CMP-05..08, LP-MOT-10): the detail, settings-nav, and builder
 * shells each render their distinguishing anatomy, and the changed-value wash
 * fires only on a real value change (never on first mount) at its real
 * consumer (`MetricCard`).
 */
import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { DetailPageShell } from '@/components/workbench/DetailPageShell';
import {
  SettingsNav,
  isSettingsNavItemActive,
  type SettingsNavGroup,
} from '@/components/settings/SettingsNav';
import {
  BuilderShell,
  BuilderValidationSummary,
  BuilderSequence,
  BuilderStep,
} from '@/components/ui/BuilderShell';
import { MetricCard } from '@/components/ui/MetricCard';

describe('DetailPageShell (LP-CMP-05, §8.4)', () => {
  it('renders functional back navigation from backHref/backLabel', () => {
    render(
      <DetailPageShell backHref="/recoveries" backLabel="Recoveries" title="Late delivery · R-4821">
        <p>Body</p>
      </DetailPageShell>,
    );
    const back = screen.getByRole('link', { name: 'Recoveries' });
    expect(back).toHaveAttribute('href', '/recoveries');
    expect(back).toHaveClass('ua-detail-back');
  });

  it('renders provenance/owner/updated as one meta row and prev/next record nav', () => {
    render(
      <DetailPageShell
        backHref="/recoveries"
        title="Late delivery · R-4821"
        meta={[
          { label: 'Source', value: 'Shopify' },
          { label: 'Owner', value: 'A. Okafor' },
          { label: 'Updated', value: '2 hours ago' },
        ]}
        recordNav={{ nextHref: '/recoveries/r-4822' }}
      >
        <p>Body</p>
      </DetailPageShell>,
    );

    expect(screen.getByText('Shopify')).toBeInTheDocument();
    expect(screen.getByText('A. Okafor')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();

    const nav = screen.getByRole('navigation', { name: 'Record navigation' });
    // Next is a real link; the missing prev is a disabled, non-interactive edge.
    expect(within(nav).getByRole('link', { name: 'Next record' })).toHaveAttribute(
      'href',
      '/recoveries/r-4822',
    );
    expect(within(nav).queryByRole('link', { name: 'Previous record' })).toBeNull();
    const prev = within(nav).getByLabelText('Previous record');
    expect(prev).toHaveAttribute('aria-disabled', 'true');
  });

  it('omits the back link when no backHref is supplied', () => {
    render(
      <DetailPageShell title="No back">
        <p>Body</p>
      </DetailPageShell>,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('SettingsNav (LP-CMP-07, §5.4/§8.1)', () => {
  const GROUPS: SettingsNavGroup[] = [
    { label: 'Workspace', items: [{ href: '/settings/account', label: 'Workspace & account' }, { href: '/settings/team', label: 'Team' }] },
    { label: 'Connections', items: [{ href: '/integrations', label: 'Connections' }] },
  ];

  it('renders labelled groups with every destination visible (no scroll strip)', () => {
    const { container } = render(<SettingsNav groups={GROUPS} currentPath="/settings/team" />);
    const groupLabels = [...container.querySelectorAll('.ua-settings-nav__group-label')].map(
      (node) => node.textContent,
    );
    expect(groupLabels).toEqual(['Workspace', 'Connections']);
    // All items present, not hidden behind overflow.
    expect(screen.getByRole('link', { name: 'Workspace & account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Connections' })).toBeInTheDocument();
  });

  it('marks the active item with aria-current="page"', () => {
    render(<SettingsNav groups={GROUPS} currentPath="/settings/team" />);
    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Workspace & account' })).not.toHaveAttribute('aria-current');
  });

  it('treats an exact route and any child route as active', () => {
    expect(isSettingsNavItemActive('/settings/team', '/settings/team')).toBe(true);
    expect(isSettingsNavItemActive('/settings/team/roles', '/settings/team')).toBe(true);
    expect(isSettingsNavItemActive('/settings/account', '/settings/team')).toBe(false);
    // The /integrations item is active on the integrations hub and its children.
    expect(isSettingsNavItemActive('/integrations/shopify', '/integrations')).toBe(true);
    expect(isSettingsNavItemActive('/settings/account', '/integrations')).toBe(false);
  });
});

describe('BuilderShell (LP-CMP-08, §8.5)', () => {
  it('renders identity, actions, a validation summary, main config, and a preview aside that never dominates', () => {
    render(
      <BuilderShell
        title="High-value late delivery"
        meta="Version 4"
        actions={<button type="button">Review publish</button>}
        validation={<BuilderValidationSummary tone="blocking" title="1 requirement" items={['Connect a tracking source.']} />}
        preview={<p>Draft impact</p>}
      >
        <BuilderSequence aria-label="Rule sequence">
          <BuilderStep label="Trigger" detail="Enters submitted" />
          <BuilderStep label="Recommend" detail="Propose refund" />
        </BuilderSequence>
      </BuilderShell>,
    );

    expect(screen.getByText('High-value late delivery')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review publish' })).toBeInTheDocument();

    // A blocking validation summary is a semantic alert, not a filter/selection.
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('ua-builder__validation--blocking');
    expect(within(alert).getByText('Connect a tracking source.')).toBeInTheDocument();

    // The preview aside is a labelled, secondary region.
    expect(screen.getByRole('complementary', { name: 'Live preview' })).toBeInTheDocument();

    // The causal sequence is a real ordered list, not decorative nodes.
    const sequence = screen.getByRole('list', { name: 'Rule sequence' });
    expect(within(sequence).getAllByRole('listitem')).toHaveLength(2);
    expect(within(sequence).getByText('Trigger')).toBeInTheDocument();
  });

  it('announces a ready validation summary politely, not as an alert', () => {
    render(<BuilderValidationSummary tone="ready" title="Ready to publish" />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('ua-builder__validation--ready');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Changed-value wash (LP-MOT-10, §7.2) at MetricCard', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  function valueEl(container: HTMLElement): HTMLElement {
    const el = container.querySelector('.ua-metric-card__value');
    if (!el) throw new Error('metric value not found');
    return el as HTMLElement;
  }

  it('does not wash on first mount', () => {
    const { container } = render(<MetricCard label="Recovered" value="£4,820" />);
    expect(valueEl(container)).not.toHaveClass('ua-value-wash');
  });

  it('washes once when the value changes, then clears after the highlight duration', () => {
    const { container, rerender } = render(<MetricCard label="Recovered" value="£4,820" />);
    expect(valueEl(container)).not.toHaveClass('ua-value-wash');

    act(() => {
      rerender(<MetricCard label="Recovered" value="£5,000" />);
    });
    expect(valueEl(container)).toHaveClass('ua-value-wash');

    act(() => {
      jest.advanceTimersByTime(700);
    });
    expect(valueEl(container)).not.toHaveClass('ua-value-wash');
  });

  it('does not wash when a re-render keeps the same value', () => {
    const { container, rerender } = render(<MetricCard label="Recovered" value="£4,820" />);
    act(() => {
      rerender(<MetricCard label="Recovered" value="£4,820" />);
    });
    expect(valueEl(container)).not.toHaveClass('ua-value-wash');
  });
});
