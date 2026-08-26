import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const stylesheet = readFileSync(
  join(process.cwd(), 'styles/authenticated/replacement.css'),
  'utf8',
);

function expectRoundedRule(selector: string, radiusToken: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  expect(stylesheet).toMatch(
    new RegExp(
      `${escapedSelector}\\s*\\{[^}]*border-radius:\\s*var\\(${radiusToken}\\)`,
      's',
    ),
  );
}

describe('authenticated surface shape contract', () => {
  it('keeps the restrained shared radius scale', () => {
    expect(stylesheet).toContain('--ua-radius-control: 6px;');
    expect(stylesheet).toContain('--ua-radius-surface: 8px;');
    expect(stylesheet).toContain('--ua-radius-overlay: 12px;');
  });

  it('rounds every canonical framed surface', () => {
    expectRoundedRule('.ua-working-surface', '--ua-radius-surface');
    expectRoundedRule('.ua-section-card', '--ua-radius-surface');
    expectRoundedRule('.ua-card', '--ua-radius-surface');
    expectRoundedRule('.ua-chart-frame', '--ua-radius-surface');
    expectRoundedRule('.ua-inspector', '--ua-radius-overlay');
    expectRoundedRule('.ua-floating-surface', '--ua-radius-overlay');
    expectRoundedRule('.ua-modal', '--ua-radius-overlay');
  });

  it('does not flatten the open chart variant back to square corners', () => {
    expect(stylesheet).toMatch(
      /\.ua-chart-frame--open\s*\{[^}]*border-width:\s*1px;[^}]*border-radius:\s*var\(--ua-radius-surface\)/s,
    );
  });
});
