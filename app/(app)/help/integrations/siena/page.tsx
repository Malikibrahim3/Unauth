import Link from 'next/link';

const TEST_PAYLOAD = `{
  "platform": "siena",
  "platform_ticket_id": "siena-ticket-123",
  "platform_conversation_id": "conversation-456",
  "claim_type": "delivered_not_received",
  "escalation_reason": "Customer says the order is marked delivered but unavailable",
  "ai_analysis_summary": "The customer requested a replacement. Delivery evidence should be reviewed first.",
  "requested_action": "replacement",
  "order_name": "#1234",
  "customer_email": "customer@example.com",
  "conversation_text": "It says delivered, but nothing arrived at my address."
}`;

export default function SienaIntegrationGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/help" className="text-caption hover:underline" style={{ color: 'var(--text-secondary)' }}>
        ← Help
      </Link>
      <div>
        <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Siena escalation setup</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configure Siena to send unresolved post-purchase claim handoffs to Unauth before any refund, reship, or replacement workflow continues.
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
