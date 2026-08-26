/** @jest-environment jsdom */

import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ConnectorSetupShell } from '@/components/settings/ConnectorSetupShell';
import { projectConnectionActionMode } from '@/lib/connections/actionMode';
import type { EffectiveConnectionBadge } from '@/lib/connections/effectiveStatus';

const CONFIGURED_CASES: Array<{
  badge: Exclude<EffectiveConnectionBadge, 'disconnected'>;
  operational: 'healthy' | 'attention';
  shipBobMode: string;
  otherMode: string;
}> = [
  { badge: 'error', operational: 'attention', shipBobMode: 'repair', otherMode: 'repair' },
  { badge: 'not_syncing', operational: 'attention', shipBobMode: 'retry_import', otherMode: 'repair' },
  { badge: 'stale', operational: 'attention', shipBobMode: 'sync', otherMode: 'manage' },
  { badge: 'sync_pending', operational: 'attention', shipBobMode: 'sync_pending', otherMode: 'sync_pending' },
  { badge: 'no_data', operational: 'attention', shipBobMode: 'sync', otherMode: 'manage' },
  { badge: 'healthy', operational: 'healthy', shipBobMode: 'sync', otherMode: 'manage' },
  { badge: 'connection_verified', operational: 'healthy', shipBobMode: 'manage', otherMode: 'manage' },
  { badge: 'verification_unavailable', operational: 'attention', shipBobMode: 'manage', otherMode: 'manage' },
];

describe('projectConnectionActionMode', () => {
  it('projects every configured badge for ShipBob and other providers', () => {
    for (const row of CONFIGURED_CASES) {
      expect(projectConnectionActionMode({
        configuration: 'configured',
        operational: row.operational,
        badge: row.badge,
        providerId: 'shipbob',
      }).mode).toBe(row.shipBobMode);
      expect(projectConnectionActionMode({
        configuration: 'configured',
        operational: row.operational,
        badge: row.badge,
        providerId: 'gorgias',
      }).mode).toBe(row.otherMode);
    }
  });

  it('connects only a genuinely not-configured and disconnected provider', () => {
    expect(projectConnectionActionMode({
      configuration: 'not_configured',
      operational: 'unknown',
      badge: 'disconnected',
      providerId: 'shipbob',
    })).toMatchObject({ mode: 'connect', connectLabel: 'Connect', showDisconnect: false });
  });

  it.each([
    { configuration: 'configured' as const, operational: 'unknown' as const, badge: 'healthy' as const },
    { configuration: 'configured' as const, operational: 'healthy' as const, badge: 'disconnected' as const },
    { configuration: 'not_configured' as const, operational: 'attention' as const, badge: 'error' as const },
  ])('renders impossible configuration/badge combinations unavailable', (input) => {
    expect(projectConnectionActionMode({ ...input, providerId: 'shipbob' })).toMatchObject({
      mode: 'unavailable',
      showManage: false,
      showDisconnect: false,
      syncLabel: null,
    });
  });

  it('keeps on-demand verified providers manage-only and never offers periodic sync', () => {
    expect(projectConnectionActionMode({
      configuration: 'configured',
      operational: 'healthy',
      badge: 'connection_verified',
      providerId: 'ups',
    })).toMatchObject({ mode: 'manage', syncLabel: null, showDisconnect: true });
  });

  it('projects configured healthy ShipBob to its existing sync and disconnect controls', () => {
    expect(projectConnectionActionMode({
      configuration: 'configured',
      operational: 'healthy',
      badge: 'healthy',
      providerId: 'shipbob',
    })).toMatchObject({
      mode: 'sync',
      syncLabel: 'Sync account',
      showManage: true,
      showDisconnect: true,
    });
  });

  it('renders the Challenge6 Shopify authorisation stage', () => {
    render(createElement(
      ConnectorSetupShell,
      {
        provider: 'Shopify',
        requirements: createElement('p', null, 'Sign in as an administrator.'),
        setupMode: 'connect',
        currentStage: 'connect',
      },
      createElement('div', null, 'Fresh Shopify setup'),
    ));

    expect(screen.getByText('Before you authorise')).toBeDefined();
    expect(screen.getByText('Fresh Shopify setup')).toBeDefined();
    expect(document.querySelector('[aria-current="step"]')?.textContent).toContain('Authorise');
    expect(screen.getByText('Map fields')).toBeDefined();
    expect(screen.getByText('Backfill')).toBeDefined();
    expect(screen.getByText('Verify')).toBeDefined();
  });
});
