import fs from 'node:fs';
import path from 'node:path';

const read = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('UX9-5 connected records, rules, and flows structure', () => {
  it('keeps flow-run columns inside one labelled ARIA table and a bounded horizontal scroller', () => {
    const source = read('app/(app)/controls/flows/runs/FlowRunsPage.tsx');
    const styles = read('components/rules/AutomationControls.module.css');

    expect(source).toContain('role="table" aria-label="Flow run records"');
    expect(source).toContain('role="columnheader"');
    expect(source).toContain('role="cell"');
    expect(source).toContain('className={styles.flowRunTableScroll}');
    expect(styles).toContain('.flowRunTableScroll { max-width: 100%; overflow-x: auto;');
  });

  it('names the requested connected-record identity and preserves a safe return context', () => {
    const source = read('components/relationships/ConnectedObjectNotFound.tsx');

    expect(source).toContain('requestedReference(pathname, kind)');
    expect(source).toContain('cannot distinguish a missing or disconnected source record');
    expect(source).toContain('SAFE_RETURN_ROOTS');
  });

  it('makes draft sequencing, non-mutation, and publication consequences explicit', () => {
    const builder = read('components/rules/RuleBuilderDrawer.tsx');
    const versions = read('components/rules/RuleVersionWorkbench.tsx');

    expect(builder).toContain("['Goal', 'Conditions', 'Recommendation', 'Review']");
    expect(builder).toContain('Saving creates or updates a draft only.');
    expect(versions).toContain('<BeforeYouConfirm');
    expect(versions).toContain('does not record a merchant decision or contact a provider');
    expect(versions).toContain('rule audit history');
  });

  it('keeps portalled builders inside the active product theme contract', () => {
    const portal = read('components/ui/OverlayPortal.tsx');

    expect(portal).toContain("root.classList.toggle('uo-product', Boolean(productRoot))");
    expect(portal).toContain('root.dataset.authTheme = authenticatedTheme');
    expect(portal).toContain("attributeFilter: ['class', 'data-auth-theme', 'data-unauth-ui']");
  });

  it('leads rule and flow registries with version, owner, last change, and next task context', () => {
    const rules = read('components/rules/PayoutRulesOperations.tsx');
    const flows = read('components/rules/FlowsIndexClient.tsx');

    expect(rules).toContain('State / version');
    expect(rules).toContain('Owner unavailable');
    expect(rules).toContain('Next task');
    expect(rules).toContain("createRequested || searchParams.get('new') === '1'");
    expect(flows).toContain('owner unavailable · changed');
    expect(flows).toContain('aria-label={`Open ${selected.name}`}');
  });
});
