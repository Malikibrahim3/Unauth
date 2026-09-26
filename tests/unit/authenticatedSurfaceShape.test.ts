import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const surface = readFileSync(join(root, 'components/ui/Surface.tsx'), 'utf8');
const modal = readFileSync(join(root, 'components/ui/Modal.tsx'), 'utf8');
const globals = readFileSync(join(root, 'app/globals.css'), 'utf8');

describe('full-app visual authority surface shape contract', () => {
  it('has no retired operations stylesheet or CSS-module presentation layer', () => {
    expect(existsSync(join(root, 'styles/operations/foundation.css'))).toBe(false);
    expect(existsSync(join(root, 'app/full-app-visual-authority.css'))).toBe(false);
    expect(globals).not.toMatch(/--(?:ua|uo)-|\.(?:ua|uo)-/);
  });

  it('keeps the authority radius directly on shared surfaces', () => {
    expect(surface).toContain('borderRadius: 12');
    expect(surface).toContain("border: '1px solid #eeecea'");
    expect(surface).toContain("background: '#fff'");
  });

  it('keeps overlays visibly distinct without an alternate theme layer', () => {
    expect(modal).toContain('borderRadius: 12');
    expect(modal).toContain("background: '#fff'");
    expect(modal).not.toMatch(/--(?:ua|uo)-|data-auth-theme|data-color-mode/);
  });
});
