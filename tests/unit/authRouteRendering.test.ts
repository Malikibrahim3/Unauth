import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('live authentication route rendering', () => {
  it.each(['app/(auth)/login/page.tsx', 'app/(auth)/reset/page.tsx', 'app/(auth)/reset/update/page.tsx', 'app/(public)/signup/page.tsx'])('does not accept fictional source states on %s', (file) => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    expect(source).not.toContain('__visual');
    expect(source).not.toContain('sourceState');
  });
  it('does not replace login or onboarding with static reference screens in development', () => {
    const login = fs.readFileSync(path.join(root, 'app/(auth)/login/page.tsx'), 'utf8');
    const onboarding = fs.readFileSync(path.join(root, 'app/onboarding/page.tsx'), 'utf8');

    expect(login).not.toContain('AuthOnboardingReferencePage');
    expect(onboarding).not.toContain('AuthOnboardingReferencePage');
  });
});
