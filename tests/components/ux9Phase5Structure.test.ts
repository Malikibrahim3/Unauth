/** @jest-environment jsdom */
import { createElement } from 'react';
import { render, waitFor } from '@testing-library/react';
import { OverlayPortal } from '@/components/ui/OverlayPortal';
import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('UX9-5 connected records, rules, and flows structure', () => {
  it('keeps flow-run columns inside one labelled ARIA table and a bounded horizontal scroller', () => {
    const source = read('app/(app)/controls/flows/runs/FlowRunsPage.tsx');

    expect(source).toContain('role="table" aria-label="Flow run records"');
    expect(source).toContain('role="columnheader"');
    expect(source).toContain('role="cell"');
    expect(source).toContain("overflow: 'auto'");
    expect(source).toContain('style={{ minWidth: 1060 }}');
    expect(source).toContain("gridTemplateColumns: '100px 130px 125px 90px minmax(220px,1fr) 130px 130px 74px'");
    expect(source).not.toContain('AutomationControls.module.css');
  });

  it('names the requested connected-record identity and preserves a safe return context', () => {
    const source = read('components/relationships/ConnectedObjectNotFound.tsx');

    expect(source).toContain('<ExactNotFound');
    expect(source).toContain('data-route-presentation="not-found"');
    expect(source).toContain('stateId="connected-record-not-found"');
    expect(source).toContain('returnHref={returnHref}');
  });

  it('makes draft sequencing, non-mutation, and publication consequences explicit', () => {
    const builder = read('components/rules/RuleBuilderDrawer.tsx');
    const versions = read('components/rules/RuleVersionWorkbench.tsx');

    expect(builder).toContain("['Goal', 'Conditions', 'Recommendation', 'Review']");
    expect(builder).toContain('Saving creates a draft. It changes no live recommendation until a separate test and publication action succeeds.');
    expect(versions).toContain('<ConsequenceRows');
    expect(versions).toContain('does not record a merchant decision or contact a provider');
    expect(versions).toContain('rule audit history');
  });

  it('keeps portalled builders inside the single full-app authority scope', async () => {
    const source = document.createElement('main');
    source.dataset.unauthUi = 'supplied-package';
    document.body.appendChild(source);
    const mounted = render(createElement(OverlayPortal, null, createElement('button', null, 'Portal action')));
    const host = document.getElementById('full-app-overlay-root')!;
    try {
      expect(host.dataset.overlayHost).toBe('true');
      expect(host.dataset.unauthUi).toBe('supplied-package');
      expect(host.contains(mounted.getByRole('button', { name: 'Portal action' }))).toBe(true);
      expect(host.dataset.authTheme).toBeUndefined();
      // A changed source scope must propagate; stale portal scope is not allowed.
      source.dataset.unauthUi = 'scope-change-fixture';
      await waitFor(() => expect(host.dataset.unauthUi).toBe('scope-change-fixture'));
      source.dataset.unauthUi = 'supplied-package';
      await waitFor(() => expect(host.dataset.unauthUi).toBe('supplied-package'));
    } finally {
      mounted.unmount();
      host.remove();
      source.remove();
    }
  });

  it('leads rule and flow registries with version, owner, last change, and next task context', () => {
    const rules = read('components/rules/PayoutRulesOperations.tsx');
    const flows = read('components/rules/FlowsIndexClient.tsx');

    expect(rules).toContain('SIMULATION RECEIPT');
    expect(rules).toContain('Create a draft, test it on source-backed cases, then publish it explicitly.');
    expect(rules).toContain('Everything the rules above did not catch');
    expect(rules).toContain('Selected rule:');
    expect(rules).toContain("createRequested || searchParams.get('new') === '1'");
    expect(flows).toContain('RUNS · 30 DAYS');
    expect(flows).toContain('Publication and live execution remain unavailable under the current pilot contract.');
  });
});
