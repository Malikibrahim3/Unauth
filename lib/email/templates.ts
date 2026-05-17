import { getAppUrl } from '@/lib/utils/appUrl';

interface AuditEmailInput {
  runId: string;
  identitiesFlagged: number;
  repeatIdentityClusters: number;
  refundPatternOrders: number;
  inrFlaggedAccounts: number;
  estimatedExposure: number;
}

interface ApplicationNotificationInput {
  storeName: string;
  monthlyOrderVolume: string;
  monthlyRefundChargebackVolume: string | null;
  fraudProblem: string;
  applicantEmail: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildAuditResultsEmail(input: AuditEmailInput) {
  const reportUrl = `${getAppUrl()}/audit/${input.runId}/report`;
  const applyUrl = `${getAppUrl()}/apply`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1A1814; line-height: 1.6;">
      <p>Here's what we found in your last 90 days:</p>
      <p>
        ${input.repeatIdentityClusters} repeat identities clustered<br />
        ${input.refundPatternOrders} orders linked to known refund patterns<br />
        ${input.inrFlaggedAccounts} accounts flagged for INR behaviour<br />
        ${escapeHtml(formatUsd(input.estimatedExposure))} estimated exposure across flagged orders
      </p>
      <p>
        Your full report — including cluster IDs, individual risk scores, and signal breakdowns — is ready to view.
      </p>
      <p><a href="${reportUrl}">View full report →</a></p>
      <hr style="border: none; border-top: 1px solid #D8D0BD; margin: 28px 0;" />
      <p>This is what we found inside your store alone.</p>
      <p>
        Once the Unauth network is live, every identity we flagged here resolves against every merchant we've seen them at.
        You're currently seeing one store's view. The network sees all of them.
      </p>
      <p>
        We're onboarding 3–5 founding merchants now. No cost during the pilot. In return we ask for a short feedback call
        and permission to include your anonymised order volume in our network benchmarks.
      </p>
      <p><a href="${applyUrl}">Apply for network access →</a></p>
      <hr style="border: none; border-top: 1px solid #D8D0BD; margin: 28px 0;" />
      <p style="font-size: 12px; color: #6B665C;">
        Unauth · hello@unauth.app<br />
        You're receiving this because you ran an audit at unauth.co.<br />
        <a href="mailto:hello@unauth.app?subject=Unsubscribe">Unsubscribe</a>
      </p>
    </div>
  `;

  const text = [
    "Here's what we found in your last 90 days:",
    '',
    `${input.repeatIdentityClusters} repeat identities clustered`,
    `${input.refundPatternOrders} orders linked to known refund patterns`,
    `${input.inrFlaggedAccounts} accounts flagged for INR behaviour`,
    `${formatUsd(input.estimatedExposure)} estimated exposure across flagged orders`,
    '',
    'Your full report - including cluster IDs, individual risk scores, and signal breakdowns - is ready to view.',
    '',
    `View full report: ${reportUrl}`,
    '',
    '---',
    '',
    'This is what we found inside your store alone.',
    '',
    "Once the Unauth network is live, every identity we flagged here resolves against every merchant we've seen them at.",
    "You're currently seeing one store's view. The network sees all of them.",
    '',
    "We're onboarding 3–5 founding merchants now. No cost during the pilot. In return we ask for a short feedback call and permission to include your anonymised order volume in our network benchmarks.",
    '',
    `Apply for network access: ${applyUrl}`,
    '',
    'Unauth · hello@unauth.app',
    "You're receiving this because you ran an audit at unauth.co.",
    'Unsubscribe: hello@unauth.app',
  ].join('\n');

  return { html, text };
}

export function buildFoundingMerchantApplicationNotification(input: ApplicationNotificationInput) {
  const refundVolume = input.monthlyRefundChargebackVolume || 'Not provided';
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1A1814; line-height: 1.6;">
      <p>New founding-merchant application received.</p>
      <p>
        <strong>Store</strong>: ${escapeHtml(input.storeName)}<br />
        <strong>Email</strong>: ${escapeHtml(input.applicantEmail)}<br />
        <strong>Monthly order volume</strong>: ${escapeHtml(input.monthlyOrderVolume)}<br />
        <strong>Monthly refund/chargeback volume</strong>: ${escapeHtml(refundVolume)}
      </p>
      <p><strong>Fraud problem</strong><br />${escapeHtml(input.fraudProblem)}</p>
    </div>
  `;

  const text = [
    'New founding-merchant application received.',
    '',
    `Store: ${input.storeName}`,
    `Email: ${input.applicantEmail}`,
    `Monthly order volume: ${input.monthlyOrderVolume}`,
    `Monthly refund/chargeback volume: ${refundVolume}`,
    '',
    'Fraud problem:',
    input.fraudProblem,
  ].join('\n');

  return { html, text };
}
