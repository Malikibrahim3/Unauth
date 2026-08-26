/**
 * Customer-level blacklist/watchlist semantics must not surface in merchant UI or APIs.
 */
import * as fs from 'fs';
import * as path from 'path';

describe('customer semantics deprecation', () => {
  it('customers page does not filter on on_watchlist or watchlistedOnly', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/page.tsx'),
      'utf-8',
    );
    expect(content).not.toContain('watchlistedOnly');
    expect(content).not.toContain("eq('on_watchlist'");
    expect(content).toContain('openClaimsOnly');
    expect(content).not.toMatch(/sp\.watchlisted\s*===\s*['"]1['"]\s*&&/);
  });

  it('customers overview view does not expose watchlist filter props', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/CustomersOverviewPageView.tsx'),
      'utf-8',
    );
    expect(content).not.toContain('watchlistedOnly');
    expect(content).not.toContain('watchlistFilterActive');
    expect(content).toContain('statusFilter');
  });

  it('canonical customer controls offer open claims rather than watchlist', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/CustomersOverviewPageView.tsx'),
      'utf-8',
    );
    expect(content).toContain('?status=open_cases');
    expect(content).toContain('With open cases');
    expect(content).not.toContain('watchlisted');
    expect(content).not.toContain('on_watchlist');
  });

  it('customer API hardcodes retired watchlist fields', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/api/customers/[id]/route.ts'),
      'utf-8',
    );
    expect(content).toContain('on_watchlist: false');
    expect(content).not.toMatch(/from\s*\(\s*TABLES\.WATCHLIST_ENTRIES/);
  });

  it('widget JSON uses trust signal helper for legacy watchlisted field', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/gorgias/widgetJson.ts'),
      'utf-8',
    );
    expect(content).toContain('computeWidgetTrustSummary');
    expect(content).toMatch(/watchlisted:\s*computeWidgetTrustSummary/);
    expect(content).toContain('deprecated');
  });

  it('widget data loader does not query watchlist_entries', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'lib/gorgias/widgetData.ts'),
      'utf-8',
    );
    expect(content).not.toMatch(/from\s*\(\s*['"]watchlist_entries['"]\s*\)/);
    expect(content).toContain('watchlisted: false');
  });

  it('customers overview exposes open payout case quick filter and saved view', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/CustomersOverviewPageView.tsx'),
      'utf-8',
    );
    expect(content).toContain('?status=open_cases');
    expect(content).toContain('With open cases');
    expect(content).not.toContain('watchlisted');
  });

  it('customers overview avoids high-risk verdict wording and preserves unavailable values', () => {
    const content = fs.readFileSync(
      path.join(process.cwd(), 'app/(app)/customers/CustomersOverviewPageView.tsx'),
      'utf-8',
    );
    expect(content).not.toMatch(/High risk/i);
    expect(content).toContain('— means unavailable, not zero');
  });
});
