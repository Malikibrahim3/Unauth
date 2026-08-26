import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('UX9-6 settings and governance structure', () => {
  it('groups existing settings destinations by owner task without changing permission gates', () => {
    const nav = read('components/settings/HandoffSettingsNav.tsx');

    for (const group of ['Workspace', 'Product', 'Governance', 'Legal and data', 'Developer', 'Billing']) {
      expect(nav).toContain(`label: '${group}'`);
    }
    for (const permission of ['view_settings', 'view_team', 'view_inbox', 'view_audit_trail', 'manage_settings']) {
      expect(nav).toContain(`permission: '${permission}'`);
    }
    expect(nav).toContain('group.items.filter((item) => permissions.has(item.permission))');
  });

  it('puts authority, verified state, save behavior, and impact before every settings document', () => {
    const shell = read('components/settings/SettingsPageShell.tsx');
    expect(shell).toContain('Who can change it');
    expect(shell).toContain('Current state');
    expect(shell).toContain('Save behavior');
    expect(shell).toContain('Impact');

    const routeOwners = [
      'app/(app)/settings/workspace/account/AccountSettingsPage.tsx',
      'app/(app)/settings/workspace/team/TeamSettingsPage.tsx',
      'app/(app)/settings/product/platform/PlatformSettingsPage.tsx',
      'app/(app)/settings/product/notifications/NotificationsSettingsPage.tsx',
      'app/(app)/settings/developers/api-access/ApiAccessSettingsPage.tsx',
      'app/(app)/settings/governance/audit-trail/AuditTrailSettingsPage.tsx',
      'app/(app)/settings/legal/data-privacy/DataPrivacySettingsPage.tsx',
      'app/(app)/settings/legal/agreements/AgreementsSettingsPage.tsx',
      'components/billing/BillingSettingsClient.tsx',
    ];
    for (const owner of routeOwners) expect(read(owner)).toContain('truth=');
  });

  it('keeps settings loading inside the local navigation and truth geometry', () => {
    const loading = read('components/settings/SettingsRouteLoading.tsx');
    expect(loading).toContain('<SettingsPageShell');
    expect(loading).toContain('no saved value is inferred');
    expect(loading).toContain('No setting changes while this page loads');

    const settingsLoadingOwners = [
      'app/(app)/settings/loading.tsx',
      'app/(app)/settings/workspace/account/loading.tsx',
      'app/(app)/settings/workspace/team/loading.tsx',
      'app/(app)/settings/product/platform/loading.tsx',
      'app/(app)/settings/product/notifications/loading.tsx',
      'app/(app)/settings/developers/api-access/loading.tsx',
      'app/(app)/settings/governance/audit-trail/loading.tsx',
      'app/(app)/settings/legal/data-privacy/loading.tsx',
      'app/(app)/settings/legal/agreements/loading.tsx',
      'app/(app)/settings/billing/loading.tsx',
    ];
    for (const owner of settingsLoadingOwners) expect(read(owner)).toContain('SettingsRouteLoading');
  });

  it('keeps destructive and high-impact overlays open while pending and after failure', () => {
    const api = read('components/settings/ApiIntegrationsAdvancedSection.tsx');
    const apiCreate = read('components/settings/ApiKeyCreateDialog.tsx');
    const agreement = read('components/settings/AgreementSettingsClient.tsx');
    const billing = read('components/billing/BillingSettingsClient.tsx');
    const billingAction = billing.slice(billing.indexOf('const runAction'), billing.indexOf('useEffect(() => {', billing.indexOf('const runAction')));

    expect(api.indexOf('closeRevokeModal();')).toBeGreaterThan(api.indexOf('if (!res.ok) throw'));
    expect(api).toContain('setRevokeError(err instanceof Error');
    expect(apiCreate).toContain('closeOnBackdrop={!state.createdSecret && !state.creating}');
    expect(agreement).not.toContain("setRule({ status: 'error', message: error instanceof Error ? error.message : 'Agreement terms could not be approved.' });\n      setPendingRule(null);");
    expect(billingAction.indexOf('setPending(null);')).toBeLessThan(billingAction.indexOf('} catch (error)'));
    expect(billingAction).not.toContain('setActionLoading(null);\n      setPending(null);');
  });

  it('groups every canonical notification kind without inventing email or master controls', () => {
    const source = read('components/settings/NotificationPreferencesForm.tsx');
    const kinds = read('lib/notifications/kinds.ts');
    for (const kind of ['assignment', 'mention', 'approaching_deadline', 'evidence_update', 'decision_request', 'recovery_outcome', 'sync_failure', 'high_value_case_alert']) {
      expect(kinds).toContain(`'${kind}'`);
      expect(source).toContain(`'${kind}'`);
    }
    expect(source).toContain('there is no master switch and email delivery is unavailable');
    expect(source).toContain('email_enabled: false');
  });

  it('leads audit with the registry and does not publish an unapproved retention period', () => {
    const source = read('components/settings/AuditTrailClient.tsx');
    expect(source.indexOf('id="audit-event-history"')).toBeLessThan(source.indexOf('aria-label="Audit trail summary"'));
    expect(source).toContain('aria-label="Audit trail events" tabIndex={0}');
    expect(source).toContain('No pilot period published');
    expect(source).not.toContain('value="7 years"');
    expect(source).toContain('History is append-only inside the workspace');
  });
});
