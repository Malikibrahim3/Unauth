/**
 * Proves the dev-only status preview route (app/(app)/integrations/dev-preview/page.tsx)
 * refuses to run in production BEFORE touching auth, permissions, or any
 * data — the guard is a plain server-side env check with no client-supplied
 * input involved, so it cannot be bypassed by any request parameter.
 */
const notFoundMarker = new Error('NEXT_NOT_FOUND_MARKER');

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw notFoundMarker;
  }),
  redirect: jest.fn(() => {
    throw new Error('redirect should not be reached when notFound() fires first');
  }),
}));

const getUser = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ auth: { getUser } })),
  createServiceClient: jest.fn(() => {
    throw new Error('createServiceClient should not be reached when notFound() fires first');
  }),
}));

jest.mock('@/lib/permissions', () => ({
  PERMISSIONS: { VIEW_SETTINGS: 'view_settings' },
  requirePermission: jest.fn(() => {
    throw new Error('requirePermission should not be reached when notFound() fires first');
  }),
}));

describe('Integration health dev-preview route — production exclusion', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    (process.env as { NODE_ENV: string }).NODE_ENV = originalNodeEnv as string;
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('calls notFound() immediately when NODE_ENV=production, before any auth/data call', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'production';
    const { default: IntegrationHealthDevPreviewPage } = await import('@/app/(app)/integrations/dev-preview/page');

    await expect(IntegrationHealthDevPreviewPage()).rejects.toBe(notFoundMarker);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('does not call notFound() outside production (falls through to the normal auth check)', async () => {
    (process.env as { NODE_ENV: string }).NODE_ENV = 'development';
    getUser.mockResolvedValue({ data: { user: null } });
    const { default: IntegrationHealthDevPreviewPage } = await import('@/app/(app)/integrations/dev-preview/page');

    // No user -> redirect('/login'), which our mock throws on. This proves
    // execution reached the auth check instead of stopping at notFound().
    await expect(IntegrationHealthDevPreviewPage()).rejects.toThrow(/redirect/);
    expect(getUser).toHaveBeenCalled();
  });
});
