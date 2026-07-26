import {
  buildGorgiasWidgetUnlockActionUrl,
  buildGorgiasWidgetUnlockUrlSet,
} from '@/lib/gorgias/widgetUnlockUrls';
import { claimWidgetToJson } from '@/lib/gorgias/widgetJson';
import {
  buildGorgiasSidebarWidgetTemplate,
  GORGIAS_SIDEBAR_CARD_TITLE,
  GORGIAS_SIDEBAR_ROW_LABELS,
} from '@/lib/support/gorgias/registerSidebarWidget';

describe('Gorgias widget unlock links', () => {
  it('builds case-scoped unlock action URLs', () => {
    const url = buildGorgiasWidgetUnlockActionUrl({
      appBaseUrl: 'https://app.unauth.test',
      widgetToken: 'wt_abc',
      contextType: 'basic_context',
      email: 'agent@store.com',
      ticketRef: '999',
      orderRef: 'ORD-1',
    });
    expect(url).toContain('/api/gorgias/widget/unlock/action?');
    expect(url).toContain('contextType=basic_context');
    expect(url).toContain('widget_token=wt_abc');
    expect(url).toContain('email=agent%40store.com');
    expect(url).toContain('ticketRef=999');
    expect(url).toContain('orderRef=ORD-1');
  });

  it('claimWidgetToJson includes unlock URLs when ticket scope is present', () => {
    const payload = claimWidgetToJson(
      { ok: false, kind: 'not_found' },
      {
        widgetToken: 'wt_abc',
        email: 'a@b.com',
        ticketRef: 'T-1',
        orderRef: null,
      },
    );
    expect(payload.basic_unlock_url).toContain('basic_context');
    expect(payload.full_unlock_url).toBe('');
    expect(payload.evidence_unlock_url).toContain('evidence_summary');
    expect(payload.basic_unlock_label).toBe('View Store Check →');
    expect(payload.basic_unlock_url).toContain('basic_context');
  });

  it('shows own-store context without network intelligence by default', () => {
    const link = {
      widgetToken: 'wt_abc',
      email: 'a@b.com',
      ticketRef: 'T-1',
      orderRef: null,
    };
    const payload = claimWidgetToJson(
      {
        ok: true,
        data: {
          confidenceGrade: 'definite',
          matchedOn: ['email'],
          ce3EvidenceAvailable: true,
          profileUrl: 'https://app.unauth.test/customers/p1',
          dataFreshAt: '2026-01-01T00:00:00.000Z',
          watchlisted: false,
          thisStore: {
            orderCount: 9,
            claimCount: 4,
            claimRate: 0.44,
            ordersCountSource: 'audit_transactions',
            lastClaimAt: '2026-01-01T00:00:00.000Z',
          },
          network: {
            orderCount: 20,
            claimCount: 8,
            claimRate: 0.4,
            merchantCount: 3,
            lastClaimAt: null,
            recentClaimCount: 2,
            recentWindowDays: 90,
            primaryReason: { type: 'dominant', label: 'Item not received', percentage: 80 },
          },
          storeClaimValue: 500,
          storePrimaryReason: { type: 'dominant', label: 'Item not received', percentage: 100 },
          storeRecentClaimCount: 2,
        },
      },
      link,
    );
    expect(payload.identity).toContain('DEFINITE');
    expect(payload.orders).toContain('9');
    expect(payload.orders).not.toContain('20');
    expect(payload.ce3_evidence).toContain('Store order evidence available');
    expect(payload.primary_reason).toContain('Item not received');
    expect(payload.cta_url).toContain('source=gorgias');
    expect(payload.cta_url).toContain('ticket_id=T-1');
  });

  it('omits unlock URLs without case scope', () => {
    const payload = claimWidgetToJson(
      { ok: false, kind: 'not_found' },
      { widgetToken: 'wt', email: 'a@b.com', ticketRef: null, orderRef: null },
    );
    expect(payload.basic_unlock_url).toBe('');
  });

  it('sidebar template uses safe card title and context row labels', () => {
    const template = buildGorgiasSidebarWidgetTemplate('https://app.unauth.test');
    expect(template.widgets[0].title).toBe(GORGIAS_SIDEBAR_CARD_TITLE);
    const rowTitles = template.widgets[0].widgets.map((w: { title: string }) => w.title);
    expect(rowTitles).toEqual([
      GORGIAS_SIDEBAR_ROW_LABELS.customer_action,
      GORGIAS_SIDEBAR_ROW_LABELS.responsibility,
      GORGIAS_SIDEBAR_ROW_LABELS.recovery_recommendation,
      GORGIAS_SIDEBAR_ROW_LABELS.why,
      GORGIAS_SIDEBAR_ROW_LABELS.missing_evidence,
    ]);
    const blob = JSON.stringify(template);
    expect(blob).not.toMatch(/Claims on record|Identity Intelligence/i);
  });

  it('sidebar template omits the unproven network unlock', () => {
    const template = buildGorgiasSidebarWidgetTemplate('https://app.unauth.test');
    const links = template.widgets[0].meta.custom.links;
    expect(links).toHaveLength(3);
    expect(links[0]).toEqual({ url: '{{basic_unlock_url}}', label: '{{basic_unlock_label}}' });
    expect(links[1]).toEqual({ url: '{{evidence_unlock_url}}', label: '{{evidence_unlock_label}}' });
    expect(JSON.stringify(links)).not.toContain('full_unlock_url');
  });

  it('unlock URL set keeps the compatibility field empty while network context is gated', () => {
    const set = buildGorgiasWidgetUnlockUrlSet({
      appBaseUrl: 'https://app.unauth.test',
      widgetToken: 'wt',
      email: 'x@y.com',
      ticketRef: '1',
    });
    expect(set.basic_unlock_url).toContain('basic_context');
    expect(set.full_unlock_url).toBe('');
    expect(set.evidence_unlock_url).toContain('evidence_summary');
  });
});
