import { renderWidgetUnlockHtml } from '@/lib/gorgias/renderWidgetUnlockHtml';

describe('renderWidgetUnlockHtml', () => {
  it('formats insufficient credits without leaking context', () => {
    const html = renderWidgetUnlockHtml({
      contextType: 'full_context',
      results: [],
      creditsSpent: 0,
      remainingCredits: 1,
      ticketRef: 'T-1',
      orderRef: null,
      insufficientCredits: true,
      requiredCredits: 2,
      error: 'Not enough context credits remaining for this review.',
    });
    expect(html).toContain('This action requires 2 credits');
    expect(html).toContain('You have 1 remaining');
    expect(html).not.toContain('Store orders');
    expect(html).toContain('does not make refund');
  });

  it('shows return-to-ticket link when a safe Gorgias URL is provided', () => {
    const html = renderWidgetUnlockHtml({
      contextType: 'basic_context',
      results: [],
      creditsSpent: 1,
      remainingCredits: 40,
      ticketRef: '64322311',
      orderRef: null,
      gorgiasTicketUrl: 'https://unauth.gorgias.com/app/ticket/64322311',
    });
    expect(html).toContain('Return to Gorgias ticket');
    expect(html).toContain('href="https://unauth.gorgias.com/app/ticket/64322311"');
  });

  it('shows neutral copy when ticket scope exists but no safe Gorgias URL', () => {
    const html = renderWidgetUnlockHtml({
      contextType: 'basic_context',
      results: [],
      creditsSpent: 0,
      remainingCredits: 40,
      ticketRef: '64322311',
      orderRef: null,
      gorgiasTicketUrl: null,
    });
    expect(html).toContain('close this tab and return to the ticket in Gorgias');
    expect(html).not.toContain('Return to Gorgias ticket');
  });

  it('omits return block when no ticket scope', () => {
    const html = renderWidgetUnlockHtml({
      contextType: 'basic_context',
      results: [],
      creditsSpent: 0,
      remainingCredits: 40,
      ticketRef: null,
      orderRef: null,
    });
    expect(html).not.toContain('Return to Gorgias ticket');
    expect(html).not.toContain('close this tab');
  });

  it('shows plan gate message for evidence on free tier', () => {
    const html = renderWidgetUnlockHtml({
      contextType: 'evidence_summary',
      results: [],
      creditsSpent: 0,
      remainingCredits: 50,
      ticketRef: 'T-1',
      orderRef: null,
      planGate: true,
      error: 'Case Reports are available on paid plans (Pro or higher).',
    });
    expect(html).toContain('paid plans');
    expect(html).not.toContain('Store context');
  });
});
