/** @jest-environment jsdom */
import React, { useInsertionEffect } from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { DesktopRequiredBoundary } from '@/components/system/DesktopRequiredBoundary';

let mockPathname = '/cases';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
beforeEach(() => { mockPathname = '/cases'; window.history.replaceState(null, '', '/'); });

function setSignals({ userAgent, platform, maxTouchPoints, width }: { userAgent: string; platform: string; maxTouchPoints: number; width: number }) {
  Object.defineProperty(window.navigator, 'userAgent', { configurable: true, value: userAgent });
  Object.defineProperty(window.navigator, 'platform', { configurable: true, value: platform });
  Object.defineProperty(window.navigator, 'maxTouchPoints', { configurable: true, value: maxTouchPoints });
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

describe('desktop required boundary', () => {
  it.each(['/landing', '/pricing', '/legal/privacy'])('allows marketing on a portable device: %s', async (path) => {
    mockPathname = path;
    setSignals({ userAgent:'iPhone Mobile', platform:'iPhone', maxTouchPoints:5, width:390 });
    render(<DesktopRequiredBoundary><h1>Marketing content</h1></DesktopRequiredBoundary>);
    expect(screen.getByRole('heading',{name:'Marketing content'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Copy desktop link'})).not.toBeInTheDocument();
  });
  it('does not mount public authentication on a phone and keeps legal navigation reachable', async () => {
    mockPathname = '/signup';
    setSignals({userAgent:'iPhone Mobile',platform:'iPhone',maxTouchPoints:5,width:390});
    render(<DesktopRequiredBoundary><button>Create account now</button></DesktopRequiredBoundary>);
    expect(await screen.findByRole('heading',{name:'Continue on a desktop.'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Create account now'})).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Privacy policy'})).toHaveAttribute('href','/legal/privacy');
  });
  it('copies the destination committed by client navigation, not the previous marketing URL', async () => {
    setSignals({userAgent:'iPhone Mobile',platform:'iPhone',maxTouchPoints:5,width:390});
    mockPathname = '/landing';
    window.history.replaceState(null, '', '/landing');
    function Navigation({ destination }: { destination: string }) {
      useInsertionEffect(() => { window.history.replaceState(null, '', destination); }, [destination]);
      return <DesktopRequiredBoundary><h1>Landing content</h1></DesktopRequiredBoundary>;
    }
    const { rerender } = render(<Navigation destination="/landing" />);
    mockPathname = '/demo';
    rerender(<Navigation destination="/demo?case=recoverable&step=inspect&token=secret" />);
    await waitFor(() => {
      const mail = new URL(screen.getByRole('link', {name:'Email the link'}).getAttribute('href')!);
      expect(mail.searchParams.get('body')).toContain('/demo?case=recoverable&step=inspect');
      expect(mail.searchParams.get('body')).not.toContain('/landing');
      expect(mail.searchParams.get('body')).not.toContain('secret');
    });
  });
  it('does not mount its decision-capable child for a wide tablet', async () => {
    setSignals({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5, width: 1180 });
    render(<DesktopRequiredBoundary><button>Record decision</button></DesktopRequiredBoundary>);
    expect(await screen.findByRole('heading', { name: 'Open Unauth on a desktop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record decision' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy desktop link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Email the link' })).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });

  it('keeps a narrow desktop workflow mounted with explicit horizontal-scroll guidance', async () => {
    setSignals({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0, width: 900 });
    const { container } = render(<DesktopRequiredBoundary><button>Record decision</button></DesktopRequiredBoundary>);
    await waitFor(() => expect(container.querySelector('[data-narrow-desktop="true"]')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Record decision' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('scroll horizontally');
  });
});
