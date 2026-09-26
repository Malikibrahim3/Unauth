/** @jest-environment jsdom */
import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AvatarMenu } from '@/components/layout/AvatarMenu';

const signOut = jest.fn();
const replace = jest.fn();
const refresh = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace, refresh }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signOut } }) }));

describe('authenticated account menu', () => {
  beforeEach(() => { jest.clearAllMocks(); signOut.mockResolvedValue({ error: null }); });

  it('shows the real account and uses local-session sign out', async () => {
    render(<AvatarMenu name="Avery Mercer" email="avery@example.test" role="Owner" workspaceName="Asterlane" />);
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(await screen.findByRole('menu', { name: 'Account and session' })).toBeInTheDocument();
    expect(screen.getByText('avery@example.test')).toBeInTheDocument();
    expect(screen.getByText('Asterlane · Owner')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ scope: 'local' }));
    expect(replace).toHaveBeenCalledWith('/login');
    expect(refresh).toHaveBeenCalled();
  });
});
