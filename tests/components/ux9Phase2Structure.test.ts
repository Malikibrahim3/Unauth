import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('UX9-2 task-first structure', () => {
  it('keeps the Cases registry ahead of secondary analytics', () => {
    const source = read('app/(app)/cases/ClaimsPageView.tsx');

    expect(source.indexOf('<RegistrySurface')).toBeGreaterThan(-1);
    expect(source.indexOf('className="ua-cases-analytics"')).toBeGreaterThan(source.indexOf('<RegistrySurface'));
    expect(source).not.toContain('primaryVisual=');
    expect(source).not.toContain('metrics=');
  });

  it('places evidence before the canonical merchant decision region', () => {
    const source = read('components/claims/CaseDetailOperations.tsx');

    expect(source.indexOf('<EvidenceRegisterCard')).toBeGreaterThan(-1);
    expect(source.indexOf('id="merchant-decision-title"')).toBeGreaterThan(source.indexOf('<EvidenceRegisterCard'));
    expect(source).toContain('Review merchant decision');
    expect(source).toContain('Recording it does not contact a provider, notify the customer, or move money.');
  });

  it('uses a truthful three-step evidence package flow without dead views', () => {
    const page = read('app/(app)/customers/[id]/evidence/new/page.tsx');
    const form = read('components/evidence/EvidencePackageForm.tsx');

    expect(page).toContain('1 · Select order');
    expect(page).toContain('2 · Review evidence');
    expect(page).toContain('3 · Confirm package');
    expect(page).not.toContain('Package JSON');
    expect(page).not.toContain('Export history');
    expect(form).toContain('Order history unavailable');
    expect(form).toContain('No empty customer history has been inferred.');
    expect(form).toContain('No orders found');
    expect(form).toContain('The connected records contain no orders for this customer.');
  });
});
