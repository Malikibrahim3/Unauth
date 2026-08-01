/** @jest-environment jsdom */

import React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Button } from '@/components/ui/Button';
import { MetricGroup } from '@/components/ui/MetricGroup';
import { SidebarAside } from '@/components/nav/SidebarAside';
import { SidebarNavItem } from '@/components/nav/SidebarNavItem';
import { RankedContributionChart } from '@/components/charts/authenticated/RankedContributionChart';
import {
  AuthenticatedRouteLoadingSkeleton,
  ConfigurationTaskLoadingSkeleton,
  ReportRecordsLoadingSkeleton,
} from '@/components/navigation/skeletons/pageSkeletons';
import { ErrorBoundaryUI } from '@/components/ui/LoadingState';
import { useMotionAllowed } from '@/lib/design/useMotionAllowed';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    prefetch: _prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => (
    <a {...props}>{children}</a>
  ),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

jest.mock('@/components/navigation/AppNavLink', () => ({
  __esModule: true,
  default: ({
    children,
    active: _active,
    onNavigate: _onNavigate,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    active?: boolean;
    onNavigate?: () => void;
  }) => <a {...props}>{children}</a>,
}));

function TestIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 16 16" {...props} />;
}

function MotionProbe() {
  const motionAllowed = useMotionAllowed();
  return <output>{motionAllowed ? 'allowed' : 'blocked'}</output>;
}

describe('Phase 27 cross-product release sweep', () => {
  it('preserves an action accessible name while exposing its busy state', () => {
    render(<Button loading>Save rule</Button>);

    expect(screen.getByRole('button', { name: 'Save rule' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save rule' })).toHaveAttribute('aria-busy', 'true');
  });

  it('marks the active navigation destination and keeps counts visually neutral', () => {
    const { container } = render(
      <SidebarNavItem
        item={{
          href: '/claims',
          label: 'Cases',
          icon: TestIcon,
          badge: 12,
          badgeTitle: 'Cases requiring review',
        }}
        collapsed={false}
        active
      />,
    );

    expect(screen.getByRole('link', { name: /Cases/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Cases requiring review: 12')).toHaveClass(
      'bg-[var(--ua-surface-muted)]',
      'text-[var(--ua-text-secondary)]',
    );
    expect(container.querySelector('[aria-current="page"]')).toBeInTheDocument();
  });

  it('keeps workspace identity and truthful source health available in expanded and collapsed navigation', () => {
    const sharedProps = {
      isMobile: false,
      merchantName: 'North Star Goods',
      userEmail: 'operator@example.com',
      connectionState: {
        orderSourceConnected: true,
        helpdesk: false,
        helpdeskProvider: null,
      },
      workspaces: [{ id: 'merchant-1', name: 'North Star Goods', role: 'owner' }],
      activeMerchantId: 'merchant-1',
      groups: [],
      isActive: () => false,
      onCloseMobile: jest.fn(),
      onToggleCollapse: jest.fn(),
      onSignOut: jest.fn(),
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
    };

    const { rerender } = render(<SidebarAside {...sharedProps} isCollapsed={false} />);
    expect(screen.getByText('North Star Goods')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'One source needs attention. Review integrations.' }),
    ).toHaveAttribute('href', '/integrations');

    rerender(<SidebarAside {...sharedProps} isCollapsed />);
    expect(
      screen.getByRole('link', {
        name: 'North Star Goods. One source needs attention. Review integrations.',
      }),
    ).toHaveAttribute('href', '/integrations');
  });

  it('uses family-specific loading geometry without guessing at root-route content', () => {
    const { container, rerender } = render(<AuthenticatedRouteLoadingSkeleton />);
    expect(container.querySelector('[data-skeleton-variant="route-shell"]')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText(/metric/i)).not.toBeInTheDocument();

    rerender(<ReportRecordsLoadingSkeleton />);
    expect(screen.getByLabelText('Loading matching report records')).toBeInTheDocument();
    expect(screen.getByText('Report records')).toBeInTheDocument();

    rerender(
      <ConfigurationTaskLoadingSkeleton label="Loading recovery rule configuration" />,
    );
    expect(screen.getByLabelText('Loading recovery rule configuration')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Configuration' })).toBeInTheDocument();
  });

  it('routes legacy error boundaries through the canonical focused recovery state', () => {
    const reset = jest.fn();
    render(
      <ErrorBoundaryUI
        error={new Error('private diagnostic')}
        reset={reset}
        title="Cases could not be loaded"
        description="The review queue is unchanged."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('No data or workflow state was changed.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Leave this page' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(screen.queryByText('private diagnostic')).not.toBeInTheDocument();
  });

  it('keeps metric definitions valid and does not wrap chart links in an image role', () => {
    const { container, rerender } = render(
      <MetricGroup
        items={[
          {
            label: 'Recovered',
            value: '£12,400',
            description: 'Settled this period',
            microchart: <span>Trend</span>,
          },
        ]}
      />,
    );
    expect(
      container.querySelectorAll('dl > div > :not(dt):not(dd)'),
    ).toHaveLength(0);

    rerender(
      <RankedContributionChart
        id="phase-27-ranked"
        title="Case states"
        description="Current case distribution"
        items={[
          { label: 'Open', value: 5, href: '/claims?state=open' },
          { label: 'Closed', value: 3, href: '/claims?state=closed' },
        ]}
      />,
    );
    expect(
      screen.getByRole('group', { name: 'Open: 5, Closed: 3' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'Open: 5, Closed: 3' }),
    ).not.toBeInTheDocument();
  });

  it('reacts to both reduced-motion preference and capture mode', async () => {
    let reduced = false;
    const listeners = new Set<() => void>();
    window.matchMedia = jest.fn().mockImplementation(() => ({
      get matches() {
        return reduced;
      },
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<MotionProbe />);
    expect(await screen.findByText('allowed')).toBeInTheDocument();

    await act(async () => {
      reduced = true;
      listeners.forEach((listener) => listener());
    });
    expect(await screen.findByText('blocked')).toBeInTheDocument();

    await act(async () => {
      reduced = false;
      listeners.forEach((listener) => listener());
    });
    expect(await screen.findByText('allowed')).toBeInTheDocument();

    await act(async () => {
      document.documentElement.setAttribute('data-capture-mode', 'true');
      await Promise.resolve();
    });
    await waitFor(() => expect(screen.getByText('blocked')).toBeInTheDocument());

    await act(async () => {
      document.documentElement.removeAttribute('data-capture-mode');
      await Promise.resolve();
    });
  });

  it('keeps dark, forced-colour, reduced-motion, and width boundaries in the shared CSS contract', () => {
    const foundations = readFileSync(
      join(process.cwd(), 'styles/authenticated/foundations.css'),
      'utf8',
    );
    const responsive = readFileSync(
      join(process.cwd(), 'styles/authenticated/responsive.css'),
      'utf8',
    );
    const tokens = readFileSync(
      join(process.cwd(), 'styles/authenticated/tokens.css'),
      'utf8',
    );

    expect(foundations).toContain('@media (prefers-reduced-motion: reduce)');
    expect(foundations).toContain('animation: none !important');
    expect(foundations).toContain('[aria-current="page"]');
    expect(foundations).toContain('[data-auth-chart]');
    expect(responsive).toContain('@media (max-width: 767px)');
    expect(responsive).toContain('.ua-desktop-product');
    expect(responsive).not.toContain('display: none !important');
    expect(tokens).toContain(':root[data-theme="dark"] .ua-desktop-boundary');
    expect(tokens).toContain('--ua-text-tertiary: #6b6b75');
  });
});
