import Link from 'next/link';

const TEST_PAYLOAD = `{
  "platform": "yuma",
  "platform_ticket_id": "yuma-ticket-123",
  "platform_conversation_id": "conversation-456",
  "claim_type": "item_not_received",
  "escalation_reason": "Customer reports the delivery did not arrive",
  "ai_analysis_summary": "Order reference was found in the conversation. Review is required before payout action.",
  "requested_action": "refund",
  "order_name": "#1234",
  "customer_email": "customer@example.com",
  "conversation_text": "Tracking says delivered but I never received the parcel."
}`;

export default function YumaIntegrationGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/help" className="text-caption hover:underline" style={{ color: 'var(--text-secondary)' }}>
        ← Help
      </Link>
      <div>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Yuma escalation setup</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Point Yuma escalations at Unauth so every claim handoff creates a payout case, evaluates merchant rules, and writes the outcome ledger path.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Webhook</h2>
        <pre className="overflow-x-auto rounded-md p-4 text-xs" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <code>POST https://YOUR-UNAUTH-DOMAIN/api/v1/gate/escalation</code>
        </pre>
        <pre className="overflow-x-auto rounded-md p-4 text-xs" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <code>Authorization: Bearer YOUR_UNAUTH_GATE_API_KEY</code>
        </pre>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Test Payload</h2>
        <pre className="overflow-x-auto rounded-md p-4 text-xs" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
          <code>{TEST_PAYLOAD}</code>
        </pre>
      </section>
    </div>
  );
}
