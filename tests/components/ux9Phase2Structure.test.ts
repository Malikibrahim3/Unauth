import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('full-app authority Cases structure', () => {
  it('uses the supplied analytical hierarchy before the five-column ledger', () => {
    const source = read('app/(app)/cases/ClaimsPageView.tsx');

    expect(source).toContain('data-visual-world="supplied-package"');
    expect(source.indexOf('aria-label="Opened against closed"')).toBeGreaterThan(-1);
    expect(source.indexOf('aria-label="Case metrics"')).toBeGreaterThan(source.indexOf('aria-label="Opened against closed"'));
    expect(source.indexOf('<ClaimsQueueClient')).toBeGreaterThan(source.indexOf('aria-label="Case metrics"'));
    expect(source).not.toContain('RegistrySurface');
    expect(source).not.toContain('ua-cases-analytics');
  });

  it('places evidence before the canonical merchant decision region', () => {
    const source = read('components/claims/CaseDetailOperations.tsx');

    expect(source).toContain('data-state-id="case-evidence-truth"');
    expect(source).toContain('PROVIDER GATES');
    expect(source).toContain('AUDIT TIMELINE');
    expect(source).toContain('DECISION BOUNDARY');
    expect(source).toContain('MONEY & RECOVERY');
    expect(source).toContain('Record decision');
    expect(source).toContain('Does not issue a refund or deny a request in the provider');
    expect(source).toContain('Does not submit a recovery claim');
  });

  it('uses a truthful three-step evidence package flow without dead views', () => {
    const page = [
      read('app/(app)/customers/[id]/evidence/new/page.tsx'),
      read('app/(app)/customers/[id]/evidence/new/EvidenceNewPageClient.tsx'),
    ].join('\n');
    const form = read('components/evidence/EvidencePackageForm.tsx');

    expect(page).toContain('data-surface-id="build-evidence-package"');
    expect(page).toContain('Choose the disputed order, then review item by item what a carrier or card network is allowed to see.');
    expect(page).toContain('Build the package');
    expect(page).toContain('<EvidencePackageForm');
    expect(page).not.toContain('Package JSON');
    expect(page).not.toContain('Export history');
    expect(form).toContain('Order history unavailable');
    expect(form).toContain('No empty customer history has been inferred.');
    expect(form).toContain('No orders found');
    expect(form).toContain('The connected records contain no orders for this customer.');
  });
});
