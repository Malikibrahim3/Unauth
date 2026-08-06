import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('controlled rollout contracts', () => {
  it('keeps legacy redirects centralized in the shared route table', () => {
    const config = read('next.config.js');
    const aliases = read('lib/navigation/aliases.js');

    expect(config).toContain("require('./lib/navigation/aliases.js')");
    expect(config).toContain('...LEGACY_UI_REDIRECTS');
    expect(aliases).toContain("{ source: '/dashboard', destination: '/overview'");
    expect(aliases).toContain("{ source: '/claims/:path*', destination: '/cases/:path*'");
    expect(aliases).toContain("{ source: '/settings/integrations', destination: '/sources/connected'");
    expect(read('proxy.ts')).not.toContain('LEGACY_UI_REDIRECTS');
  });

  it('workspace switching authenticates and authorizes the exact active target membership', () => {
    const source = read('app/api/workspace/route.ts');

    expect(source).toContain('supabase.auth.getUser()');
    expect(source).not.toContain('requirePermission');
    expect(source).toContain(".eq('merchant_id', parsed.data.merchantId)");
    expect(source).toContain(".eq('user_id', user.id)");
    expect(source).toContain(".eq('invite_status', 'active')");
    expect(source).toContain('.maybeSingle()');
  });

  it('demo data covers the canonical operational lifecycle', () => {
    const source = read('scripts/seed-demo-v2.mjs');

    for (const table of ['loss_cases', 'work_tasks', 'case_decisions', 'case_outcomes', 'recovery_cases']) {
      expect(source).toContain(`'${table}'`);
    }
  });
});
