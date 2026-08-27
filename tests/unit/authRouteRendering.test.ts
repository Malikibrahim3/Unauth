import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('live authentication route rendering', () => {
  it('does not replace login or onboarding with static reference screens in development', () => {
    const login = fs.readFileSync(path.join(root, 'app/(auth)/login/page.tsx'), 'utf8');
    const onboarding = fs.readFileSync(path.join(root, 'app/onboarding/page.tsx'), 'utf8');

    expect(login).not.toContain('AuthOnboardingReferencePage');
    expect(onboarding).not.toContain('AuthOnboardingReferencePage');
  });
});
