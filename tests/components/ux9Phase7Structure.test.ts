import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('UX9-7 public, auth, support, and root structure', () => {
  it('replaces internal landing placeholders with current proof and truthful fallbacks', () => {
    const landing = read('app/(public)/landing/_components/operations/PublicLanding.tsx');
    expect(landing).toContain('Refunds, disputes and lost parcels are decided somewhere. Usually nowhere you can find later.');
    expect(landing).toContain('ONE CASE, END TO END');
    expect(landing).toContain('This is the desk, on a real Tuesday');
    expect(landing).toContain('data-screen-label="Landing"');
    expect(landing).not.toContain('visualAuthorityStyles');
    expect(landing).not.toContain('ARTWORK PLACEHOLDER — NOT FINAL');
  });

  it('keeps plan intent server-confirmed and visible during account entry', () => {
    const signup = read('app/(public)/signup/page.tsx');
    const login = read('app/(auth)/login/page.tsx');
    const loginVisual = read('components/visual-authority/generated/Login-Clean.tsx');
    expect(signup).toContain('planCarry');
    expect(signup).toContain('subscription_intent_key');
    expect(signup).toContain('plan request could not be saved');
    expect(signup).toContain("parseRequestedPlanId(searchParams.get('plan'))");
    expect(signup).toContain('safeRedirectPath(requestedNext)');
    expect(login).toContain('LoginVisual');
    expect(loginVisual).toContain('No workspace yet?');
    expect(login).toContain('safeRedirectPath(requestedNext)');
  });

  it('uses stable audited IDs across Phase 7 route owners', () => {
    const checks: Array<[string, string]> = [
      ['app/(public)/landing/_components/operations/PublicLanding.tsx', 'marketing-landing'],
      ['components/public/PublicOperationsPages.tsx', 'interactive-product-demo'],
      ['app/(public)/signup/page.tsx', 'create-account'],
      ['app/(auth)/login/page.tsx', 'sign-in'],
      ['app/(auth)/reset/page.tsx', 'password-reset-sent-state'],
      ['app/(auth)/reset/update/page.tsx', 'set-new-password'],
      ['components/notifications/NotificationCentre.tsx', 'notifications-inbox'],
      ['components/search/WorkspaceSearch.tsx', 'search-route'],
      ['components/help/HelpCentre.tsx', 'help-index'],
      ['app/(app)/help/[articleSlug]/page.tsx', 'help-article'],
      ['app/not-found.tsx', 'root-not-found'],
      ['app/global-error.tsx', 'root-global-error'],
    ];
    for (const [owner, stableId] of checks) expect(read(owner)).toContain(stableId);
  });

  it('keeps legal facts gated while adding document identity and keyboard anchors', () => {
    const legal = read('components/public/PublicOperationsLegal.tsx');
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
    expect(help).toContain("url.searchParams.set('q', term)");
    expect(help).toContain("url.searchParams.delete('q')");
    expect(help).toContain('`${url.pathname}${url.search}${url.hash}`');
    expect(rootError).toContain('GlobalErrorVisual');
    expect(rootError).toContain("'data-surface-id': 'root-global-error'");
    expect(rootError).toContain('data-state-id');
  });
});
