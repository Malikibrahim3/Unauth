import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'docs/unauth/implementation/p01/reference.html'), 'utf8');
const css = readFileSync(join(root, 'docs/unauth/implementation/p01/reference.css'), 'utf8');
const js = readFileSync(join(root, 'docs/unauth/implementation/p01/reference.js'), 'utf8');
const fixture = JSON.parse(readFileSync(join(root, 'docs/unauth/implementation/p00/reference-fixture.normal.json'), 'utf8'));
const supplement = JSON.parse(readFileSync(join(root, 'docs/unauth/implementation/p01/display-supplement.json'), 'utf8'));

describe('P01 non-production reference contract', () => {
  it('keeps the artifact outside production routes and labels the direction and finish contract', () => {
    expect(html).toContain('THESIS:');
    expect(html).toContain('PROVISIONAL');
    expect(html).toContain('FINISH: unreviewed and undocumented is unfinished');
    expect(html).not.toMatch(/\/app\/|next\/link|use client/i);
  });

  it('renders every required surface from the frozen fixture without financial arithmetic', () => {
    for (const surface of fixture.surfaces) expect(js).toContain(surface.surface_id);
    expect(js).toContain('reference-fixture.normal.json');
    expect(js).toContain('display-supplement.json');
    expect(js).not.toMatch(/parseFloat|parseInt|Number\(|\.reduce\(|Math\.(min|max|round)|toLocaleString/);
    expect(js).toContain('Recommendation never approves, denies or pays');
    expect(js).toContain('Approved is not received');
    expect(js).toContain('residual is server-authored and never an adjustment');
  });

  it('limits the v1.2 supplement to locked V02 strings and explicit P12-owned unavailable structures', () => {
    expect(supplement.non_computing).toBe(true);
    expect(supplement.synthetic_only).toBe(true);
    expect(supplement.actual_money_over_time.buckets).toEqual([
      { bucket_start: '2026-01-01', label: 'Jan', realised_loss: '£24,000.00', recovered_applied: '£14,000.00', net_loss: '£10,000.00' },
      { bucket_start: '2026-02-01', label: 'Feb', realised_loss: '£28,500.00', recovered_applied: '£18,000.00', net_loss: '£10,500.00' },
      { bucket_start: '2026-03-01', label: 'Mar', realised_loss: '£30,000.00', recovered_applied: '£20,000.00', net_loss: '£10,000.00' },
      { bucket_start: '2026-04-01', label: 'Apr', realised_loss: '£27,300.00', recovered_applied: '£21,400.00', net_loss: '£5,900.00' },
      { bucket_start: '2026-05-01', label: 'May', realised_loss: '£25,000.00', recovered_applied: '£20,000.00', net_loss: '£5,000.00' },
      { bucket_start: '2026-06-01', label: 'Jun', realised_loss: '£30,000.00', recovered_applied: '£25,000.00', net_loss: '£5,000.00' },
    ]);
    expect(supplement.p12_owned_structures).toHaveLength(8);
    expect(supplement.p12_owned_structures.every((record: { display: string }) => record.display === 'Unavailable')).toBe(true);
  });

  it('uses the specification tokens and direct responsive reflow', () => {
    for (const token of ['#101828', '#4338ca', '#067647', '#b54708', '#b42318', '#f7f8fa']) expect(css.toLowerCase()).toContain(token);
    expect(css).toContain('@media (max-width: 600px)');
    expect(css).toContain('html[data-mode="text200"]');
    expect(css).toContain('html[data-mode="zoom400"]');
    expect(css).not.toMatch(/gradient-text|backdrop-filter|filter:\s*blur/);
  });
});
