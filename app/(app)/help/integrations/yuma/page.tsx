import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

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
    <div>
      <AuthenticatedPageHeader
        eyebrow="Integration guide"
        title="Yuma escalation setup"
        subtitle="Point Yuma escalations at Unauth so every claim handoff creates a payout case, evaluates merchant rules, and writes the outcome ledger path."
        breadcrumbs={[{ label: 'Help', href: '/help' }, { label: 'Yuma escalation setup' }]}
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
