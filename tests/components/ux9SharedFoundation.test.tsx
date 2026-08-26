/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CommandPaletteSurface, { commandResultGroup } from '@/components/layout/CommandPaletteSurface';
import { LoadingRecovery } from '@/components/navigation/skeletons/LoadingRecovery';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { RegistrySurface } from '@/components/ui/RegistrySurface';
import { RegistryToolbar } from '@/components/ui/RegistryToolbar';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/cases',
}));

jest.mock('@/components/navigation/AppNavLink', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

describe('UX9-1 shared usability foundation', () => {
  beforeEach(() => {
    push.mockReset();
  });

  it('groups command results by merchant object and navigation task while exposing workspace scope', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(
      <CommandPaletteSurface
        workspaceName="Asterlane"
        inputRef={inputRef}
        onClose={jest.fn()}
        navItems={[
          { label: 'Cases', description: 'Review case evidence', href: '/cases', group: 'Act on work', icon: <span /> },
          { label: 'Loss ledger', description: 'Trace financial outcomes', href: '/financials/losses', group: 'Trace money', icon: <span /> },
        ]}
      />,
    );

    expect(screen.getByText('Search this workspace')).toBeVisible();
    expect(screen.getByText('Asterlane')).toBeVisible();
    expect(screen.getByRole('group', { name: 'Act on work' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Trace money' })).toBeVisible();
    expect(commandResultGroup('case')).toBe('Cases');
    expect(commandResultGroup('order')).toBe('Commerce records');
    expect(commandResultGroup('ticket')).toBe('Support records');
  });

  it('keeps applied registry scope visible outside the full controls', () => {
    render(
      <RegistrySurface
        toolbar={<RegistryToolbar search={<input aria-label="Search cases" />} filters={<button type="button">Filters</button>} scope="Open cases" />}
        resultCount="24 results"
        appliedSummary={<><span>Priority: urgent</span><button type="button">Clear all</button></>}
        aria-label="Cases"
      >
        <p>Registry rows</p>
      </RegistrySurface>,
    );

    expect(screen.getByRole('status', { name: 'Applied filters and scope' })).toHaveTextContent('Priority: urgent');
    expect(screen.getByText('24 results')).toBeVisible();
    expect(screen.getByText('Open cases')).toBeVisible();
  });

  it('offers truthful retry and safe exit only after the bounded loading wait', () => {
    jest.useFakeTimers();
    render(<LoadingRecovery title="Cases" />);
    expect(screen.queryByText('Cases is taking longer than expected')).not.toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(8_000); });
    expect(screen.getByText('Cases is taking longer than expected')).toBeVisible();
    expect(screen.getByText(/No values have been assumed/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Retry this page/ })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Go to Overview' })).toHaveAttribute('href', '/overview');
    jest.useRealTimers();
  });

  it('blocks modal and drawer dismissal while a change is pending', () => {
    const closeModal = jest.fn();
    const closeDrawer = jest.fn();
    render(
      <>
        <Modal open onClose={closeModal} title="Record outcome" pending>
          <p>Outcome form</p>
        </Modal>
        <Drawer open onClose={closeDrawer} title="Case filters" pending>
          <p>Filter form</p>
        </Drawer>
      </>,
    );

    expect(screen.getByRole('dialog', { name: 'Record outcome' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('button', { name: 'Close unavailable while saving' })).toHaveLength(3);
    screen.getAllByRole('button', { name: 'Close unavailable while saving' }).forEach((button) => expect(button).toBeDisabled());
    expect(screen.getAllByText(/Keep this (dialog|panel) open/)).toHaveLength(2);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeModal).not.toHaveBeenCalled();
    expect(closeDrawer).not.toHaveBeenCalled();
  });
});
