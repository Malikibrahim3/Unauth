/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import LoginPage from '@/app/(auth)/login/page';
import UpdatePasswordPage from '@/app/(auth)/reset/update/page';
import SignupPage from '@/app/(public)/signup/page';
import ResetPage from '@/app/(auth)/reset/page';

const getSession = jest.fn(async () => ({ data: { session: null } }));
const auth = {
  getSession,
  onAuthStateChange: jest.fn((_callback: unknown) => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  signUp: jest.fn(),
  signInWithPassword: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
};
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams('__visual=source-state'),
}));

beforeEach(() => jest.clearAllMocks());

it('does not prefill a fictional identity or password through the public visual query', () => {
  render(<LoginPage />);
  expect(screen.getByLabelText('Email')).toHaveValue('');
  expect(screen.getByLabelText('Password')).toHaveValue('');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('checks the real recovery session even when the public visual query is supplied', async () => {
  render(<UpdatePasswordPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('This link is invalid or expired');
  expect(getSession).toHaveBeenCalled();
  expect(screen.getByLabelText('New password')).toBeDisabled();
  expect(screen.queryByText(/two browsers|last used 29 Aug/)).not.toBeInTheDocument();
});

it.each([
  [LoginPage, 'Sign in'],
  [SignupPage, 'Create your workspace'],
  [ResetPage, 'Reset your password'],
  [UpdatePasswordPage, 'Set a new password'],
] as const)('exposes an entry heading and main without submitting authentication: %s', async (Page, title) => {
  render(<Page />);
  const heading = await screen.findByRole('heading', { name: title, level: 1 });
  expect(screen.getByRole('main')).toContainElement(heading);
  expect(screen.queryByText(/Ten minutes to the first import|not the business name|last one hour|old links stop working/i)).not.toBeInTheDocument();
  expect(auth.signUp).not.toHaveBeenCalled();
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
  expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it.each([
  [LoginPage, 'Email'],
  [SignupPage, 'Work email'],
  [ResetPage, 'Email'],
] as const)('validates native entry submission without contacting authentication: %s', async (Page, field) => {
  render(<Page />);
  fireEvent.submit(screen.getByLabelText(field).closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
  expect(screen.getByLabelText(field)).toHaveFocus();
  expect(auth.signUp).not.toHaveBeenCalled();
  expect(auth.signInWithPassword).not.toHaveBeenCalled();
  expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
});

it('keeps a verified recovery session usable beyond the initial lookup deadline', async () => {
  jest.useFakeTimers();
  getSession.mockResolvedValueOnce({ data: { session: { user: { email: 'recovery@example.test' } } } } as never);
  try {
    render(<UpdatePasswordPage />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByLabelText('New password')).toBeEnabled();
    await act(async () => { jest.advanceTimersByTime(10_001); });
    expect(screen.getByLabelText('New password')).toBeEnabled();
    expect(screen.queryByText('This link is invalid or expired')).not.toBeInTheDocument();
    expect(auth.updateUser).not.toHaveBeenCalled();
  } finally {
    jest.useRealTimers();
  }
});

it('validates native recovery submission while leaving password persistence untouched', async () => {
  getSession.mockResolvedValueOnce({ data: { session: { user: { email: 'recovery@example.test' } } } } as never);
  render(<UpdatePasswordPage />);
  const input = await screen.findByLabelText('New password');
  fireEvent.submit(input.closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('Use at least 12 characters.');
  expect(input).toHaveFocus();
  expect(auth.updateUser).not.toHaveBeenCalled();
});

it.each([
  [LoginPage, 'Email', 'Sign in', auth.signInWithPassword],
  [SignupPage, 'Work email', 'Create workspace', auth.signUp],
] as const)('releases pending entry controls after a rejected request: %s', async (Page, field, action, request) => {
  request.mockRejectedValueOnce(new Error('offline'));
  render(<Page />);
  fireEvent.change(screen.getByLabelText(field), { target: { value: 'entry@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'local-test-password-only' } });
  const confirmation = screen.queryByLabelText('Confirm password');
  if (confirmation) fireEvent.change(confirmation, { target: { value: 'local-test-password-only' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent(/could not be confirmed/);
  expect(screen.getByRole('button', { name: action, exact: true })).toBeEnabled();
  expect(screen.getByLabelText(field)).toHaveValue('entry@example.test');
  expect(request).toHaveBeenCalledTimes(1);
});

it('reports other-session revocation failure separately from a successful password change', async () => {
  getSession.mockResolvedValueOnce({ data: { session: { user: { email: 'recovery@example.test' } } } } as never);
  auth.updateUser.mockResolvedValueOnce({ error: null });
  auth.signOut.mockResolvedValueOnce({ error: { message: 'unavailable' } });
  render(<UpdatePasswordPage />);
  fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'local-test-password-only' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'local-test-password-only' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Other sessions could not be signed out and may still have access.');
  expect(auth.updateUser).toHaveBeenCalledTimes(1);
  expect(auth.signOut).toHaveBeenCalledWith({ scope: 'others' });
});

it('releases password update controls after a rejected request without claiming success', async () => {
  getSession.mockResolvedValueOnce({ data: { session: { user: { email: 'recovery@example.test' } } } } as never);
  auth.updateUser.mockRejectedValueOnce(new Error('offline'));
  render(<UpdatePasswordPage />);
  fireEvent.change(await screen.findByLabelText('New password'), { target: { value: 'local-test-password-only' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'local-test-password-only' } });
  fireEvent.submit(screen.getByRole('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('The password update could not be confirmed.');
  expect(screen.getByRole('button', { name: 'Set password and continue' })).toBeEnabled();
  expect(screen.queryByRole('heading', { name: 'Password updated' })).not.toBeInTheDocument();
  expect(auth.signOut).not.toHaveBeenCalled();
});

it('retains a recovery event when the older session lookup later returns empty', async () => {
  let finishLookup!: (result: { data: { session: null } }) => void;
  getSession.mockReturnValueOnce(new Promise((resolve) => { finishLookup = resolve; }));
  render(<UpdatePasswordPage />);
  const onAuthChange = auth.onAuthStateChange.mock.calls[0][0] as (event: string, session: unknown) => void;
  act(() => onAuthChange('PASSWORD_RECOVERY', { user: { email: 'recovery@example.test' } }));
  expect(screen.getByLabelText('New password')).toBeEnabled();
  await act(async () => finishLookup({ data: { session: null } }));
  expect(screen.getByLabelText('New password')).toBeEnabled();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
