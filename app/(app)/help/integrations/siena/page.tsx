import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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
    <div>
      <AuthenticatedPageHeader
        eyebrow="Integration guide"
        title="Siena escalation setup"
        subtitle="Configure Siena to send unresolved post-purchase claim handoffs to Unauth before any refund, reship, or replacement workflow continues."
        breadcrumbs={[{ label: 'Help', href: '/help' }, { label: 'Siena escalation setup' }]}
      />
      <div className={pageStyles.pageBody}>
        <div className="grid gap-3">
      <AuthenticatedPanel title="Webhook" description="Send escalations to the Gate API with your bearer credential.">
        <div className="grid gap-2 p-3">
        <pre className="overflow-x-auto rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-[10px]">
          <code>POST https://YOUR-UNAUTH-DOMAIN/api/v1/gate/escalation</code>
        </pre>
        <pre className="overflow-x-auto rounded-[var(--ua-radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3 text-[10px]">
          <code>Authorization: Bearer YOUR_UNAUTH_GATE_API_KEY</code>
        </pre>
        </div>
      </AuthenticatedPanel>
      <AuthenticatedPanel title="Test payload" description="Use a representative handoff before enabling live traffic.">
        <pre className="overflow-x-auto bg-[var(--surface-sunken)] p-4 text-[10px] leading-4">
          <code>{TEST_PAYLOAD}</code>
        </pre>
      </AuthenticatedPanel>
        </div>
      </div>
    </div>
  );
}
