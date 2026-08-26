import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('UX9-7 public, auth, support, and root structure', () => {
  it('replaces internal landing placeholders with current proof and truthful fallbacks', () => {
    const model = read('app/(public)/landing/_components/neutral/neutralLandingViewModel.ts');
    const artifact = read('app/(public)/landing/_components/neutral/NeutralArtifact.tsx');
    expect(model).toContain("src: '/product-proof/hero-case-gate-hold-signal-3420x1920.png'");
    expect(artifact).toContain("data-artifact-state={spec.src ? 'ready' : 'truthful-fallback'}");
    expect(artifact).not.toContain('ARTWORK PLACEHOLDER — NOT FINAL');
  });

  it('keeps plan intent server-confirmed and visible during account entry', () => {
    const signup = read('app/(public)/signup/page.tsx');
    const login = read('app/(auth)/login/page.tsx');
    expect(signup).toContain('Requested plan intent');
    expect(signup).toContain('billing changes only after provider confirmation');
    expect(signup).toContain("parseRequestedPlanId(searchParams.get('plan'))");
    expect(signup).toContain('safeRedirectPath(requestedNext)');
    expect(login).toContain('Need an account?');
    expect(login).toContain('safeRedirectPath(requestedNext)');
  });

  it('uses stable audited IDs across Phase 7 route owners', () => {
    const checks: Array<[string, string]> = [
      ['app/(public)/landing/_components/neutral/NeutralLanding.tsx', 'marketing-landing'],
      ['components/public/Challenge6PublicPages.tsx', 'interactive-product-demo'],
      ['app/(public)/signup/page.tsx', 'create-account'],
      ['app/(auth)/login/page.tsx', 'sign-in'],
      ['app/(auth)/reset/page.tsx', 'password-reset-sent-state'],
      ['app/(auth)/reset/update/page.tsx', 'set-new-password'],
      ['components/notifications/NotificationCentre.tsx', 'notifications-inbox'],
      ['app/(app)/search/page.tsx', 'search-route'],
      ['components/help/HelpCentre.tsx', 'help-index'],
      ['app/(app)/help/[articleSlug]/page.tsx', 'help-article'],
      ['app/not-found.tsx', 'root-not-found'],
      ['app/global-error.tsx', 'root-global-error'],
    ];
    for (const [owner, stableId] of checks) expect(read(owner)).toContain(stableId);
  });

  it('keeps legal facts gated while adding document identity and keyboard anchors', () => {
    const legal = read('components/public/Challenge6Legal.tsx');
    expect(legal).toContain('data-release-status="blocked-unapproved"');
    expect(legal).toContain('named legal entity');
    expect(legal).toContain('aria-label="On this page"');
    expect(legal).toContain('tabIndex={-1}');
    for (const stableId of ['privacy-policy', 'data-handling-explainer', 'data-processing-addendum', 'pilot-terms']) {
      expect(legal).toContain(stableId);
    }
  });

  it('preserves truthful notification, search, help, and root recovery branches', () => {
    const notifications = read('components/notifications/NotificationCentre.tsx');
    const search = read('components/search/WorkspaceSearch.tsx');
    const help = read('components/help/HelpCentre.tsx');
    const rootError = read('app/global-error.tsx');
    for (const state of ['You are caught up', 'Nothing needs you', 'No source notifications', 'No notifications yet']) expect(notifications).toContain(state);
    for (const state of ['No match in this search scope', 'Workspace records are restricted', 'Workspace search is unavailable']) expect(search).toContain(state);
    expect(search).toContain('No partial count is shown');
    expect(help).toContain("window.history.replaceState(null, '', term ? `/help?q=");
    expect(rootError).toContain('does not infer that it succeeded or failed');
    expect(rootError).toContain('mailto:support@unauth.app');
  });
});
