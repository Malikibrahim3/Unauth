/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlatformSettingsClient } from '@/components/settings/PlatformSettingsClient';
import { DEFAULT_PLATFORM_SETTINGS } from '@/lib/settings/platform';
const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

jest.mock('@/components/settings/SettingsPageShell', () => ({
  SettingsPageShell: ({toolbar, children}: {toolbar: ReactNode; children: ReactNode}) => <main>{toolbar}{children}</main>,
}));

describe('money and period runtime bindings', () => {
  afterEach(() => jest.restoreAllMocks());

  function mockBackend(signOffState = 'available', signOff: object | null = null) {
    const settings = {...DEFAULT_PLATFORM_SETTINGS, reportingCurrency: 'USD', timezone: 'America/New_York'};
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/settings/platform') {
        return {ok: true, json: async () => ({settings: init?.method === 'PUT' ? JSON.parse(String(init.body)) : settings})};
      }
      if (/^\/api\/financial-periods\/\d{4}-\d{2}\/close$/.test(url)) {
        return {ok: true, json: async () => ({signOffState, signOff})};
      }
      throw new Error(`Unexpected endpoint: ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
  }

  it('loads saved values and the existing period-close read endpoint', async () => {
    const fetchMock = mockBackend();
    const {container} = render(<PlatformSettingsClient canManage />);
    expect(await screen.findByRole('combobox', {name: 'Reporting currency'})).toHaveValue('USD');
    expect(screen.getByRole('textbox', {name: 'Timezone'})).toHaveValue('America/New_York');
    await waitFor(() => expect(container.querySelectorAll('[title$=": open"]')).toHaveLength(13));
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/close'))).toHaveLength(13);
    expect(screen.queryByText('CLOSING')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', {name: 'Month locking policy'})).toHaveTextContent('Manual sign-off');
    expect(screen.queryByText(/5 working days|1\.15 rate|Priya Kapoor/)).not.toBeInTheDocument();
  });

  it('does not claim an unreadable sign-off is an open period', async () => {
    mockBackend('unavailable');
    const {container} = render(<PlatformSettingsClient canManage />);
    await screen.findByRole('combobox', {name: 'Reporting currency'});
    await waitFor(() => expect(container.querySelectorAll('[title$=": unavailable"]')).toHaveLength(13));
    expect(container.querySelectorAll('[title$=": open"]')).toHaveLength(0);
  });

  it('uses recorded closures, including the current month, rather than calendar guesses', async () => {
    mockBackend('available', {id: 'recorded-close'});
    const {container} = render(<PlatformSettingsClient canManage />);
    await screen.findByRole('combobox', {name: 'Reporting currency'});
    await waitFor(() => expect(container.querySelectorAll('[title$=": closed"]')).toHaveLength(13));
    expect(screen.getAllByRole('img', {name: 'Closed'})).toHaveLength(13);
  });

  it('persists edited values only through explicit save', async () => {
    const fetchMock = mockBackend();
    render(<PlatformSettingsClient canManage />);
    const currency = await screen.findByRole('combobox', {name: 'Reporting currency'});
    fireEvent.change(currency, {target: {value: 'EUR'}});
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));
    await screen.findByText('Money and period settings saved.');
    expect(fetchMock).toHaveBeenCalledWith('/api/settings/platform', expect.objectContaining({method: 'PUT', body: expect.stringContaining('"reportingCurrency":"EUR"')}));
    expect(refresh).toHaveBeenCalled();
  });

  it('retains read-only permission gates', async () => {
    mockBackend();
    render(<PlatformSettingsClient canManage={false} />);
    expect(await screen.findByRole('combobox', {name: 'Reporting currency'})).toBeDisabled();
    expect(screen.getByRole('textbox', {name: 'Timezone'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Save changes'})).toBeDisabled();
  });
});
