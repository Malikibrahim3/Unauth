import fs from 'node:fs';
import path from 'node:path';

describe('permanent light appearance', () => {
  it('removes the authenticated theme runtime instead of retaining an inert provider', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'components/theme/AuthenticatedThemeProvider.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/theme/authenticatedTheme.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/theme/colorMode.ts'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'lib/theme/preference.ts'))).toBe(false);
  });

  it('keeps the product light-only without retaining the historical palette cascade', () => {
    const globals = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
    const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app/layout.tsx'), 'utf8');
    const publicLayout = fs.readFileSync(path.join(process.cwd(), 'app/(public)/layout.tsx'), 'utf8');

    expect(rootLayout).toContain("import './globals.css'");
    expect(publicLayout).toContain('data-unauth-ui="supplied-package"');
    expect(globals).not.toMatch(/--(?:ua|uo)-|\.(?:ua|uo)-/);
    expect(globals).not.toContain('data-auth-theme');
    expect(globals).not.toContain('color-scheme: dark');
    expect(globals).toContain('color-scheme: light;');
    expect(fs.existsSync(path.join(process.cwd(), 'styles/evidence-operations.css'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'styles/authenticated'))).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), 'styles/p07.css'))).toBe(false);
  });
});
