import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('controlled rollout contracts', () => {
  it('keeps legacy redirects centralized with an explicit retirement rule', () => {
    const config = read('next.config.js');

    expect(config).toContain("source: '/inbox', destination: '/claims'");
    expect(config).toContain("source: '/partners', destination: '/rules/recovery'");
    expect(config).toContain("source: '/settings/integrations', destination: '/integrations'");
    expect(config).toContain('90 days');
    expect(read('proxy.ts')).not.toContain('legacyRouteRedirects');
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

  it('operations documentation defines stop gates and redirect retirement', () => {
    const source = read('docs/OPERATIONS.md');

    expect(source).toContain('Stop expansion');
    expect(source).toContain('90 days');
    expect(source).toContain('tenant-isolation');
  });
});
