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

  it('shows plan gate message for evidence on free tier', () => {
    const html = renderWidgetUnlockHtml({
      contextType: 'evidence_summary',
      results: [],
      creditsSpent: 0,
      remainingCredits: 50,
      ticketRef: 'T-1',
      orderRef: null,
      planGate: true,
      error: 'Evidence summaries are available on paid plans (Pro or higher).',
    });
    expect(html).toContain('paid plans');
    expect(html).not.toContain('Store context');
  });
});
