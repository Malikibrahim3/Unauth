import { getAppUrl } from '@/lib/utils/appUrl';
import { sendEmail } from '@/lib/email/send';
import { PLANS } from '@/lib/billing/plans';
import { gracePeriodDaysRemaining } from '@/lib/billing/subscriptionAccess';

export type BillingEmailKind =
  | 'payment_failed'
  | 'grace_reminder'
  | 'downgraded_to_free'
  | 'access_restored'
  | 'plan_upgraded'
  | 'downgrade_scheduled'
  | 'downgrade_executed'
  | 'cancellation_confirmed'
  | 'usage_warning_80'
  | 'credit_reset';

export type BillingEmailInput = {
  to: string;
  planName?: string;
  effectiveDate?: string | null;
  gracePeriodEndsAt?: string;
  usagePercent?: number;
  creditsMonthly?: number;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'the end of your billing period';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function billingSettingsUrl(): string {
  return `${getAppUrl()}/settings/billing`;
}

function portalHint(): string {
  return `Update your payment method in <a href="${billingSettingsUrl()}">billing settings</a>.`;
}

const TEMPLATES: Record<
  BillingEmailKind,
  (input: BillingEmailInput) => { subject: string; html: string; text: string }
> = {
  payment_failed: (input) => {
    const days = input.gracePeriodEndsAt
      ? gracePeriodDaysRemaining(input.gracePeriodEndsAt)
      : 7;
    const subject = 'Action required: your Unauth payment failed';
    const html = `
      <p>We couldn't process your latest subscription payment.</p>
      <p>Store Checks are still available. Network Checks and Case Reports are paused until billing is updated.</p>
      <p>${portalHint()} You have ${days ?? 7} days before your account moves to Free.</p>
    `;
    const text = `Payment failed. Store Checks still work. Update billing within ${days ?? 7} days: ${billingSettingsUrl()}`;
    return { subject, html, text };
  },
  grace_reminder: (input) => {
    const days = input.gracePeriodEndsAt
      ? gracePeriodDaysRemaining(input.gracePeriodEndsAt)
      : 2;
    const subject = 'Reminder: update billing to keep Unauth access';
    const html = `<p>Your payment is still overdue. ${portalHint()} Access downgrades in ${days ?? 2} days.</p>`;
    const text = `Billing reminder — ${days ?? 2} days left: ${billingSettingsUrl()}`;
    return { subject, html, text };
  },
  downgraded_to_free: () => ({
    subject: 'Your Unauth subscription has lapsed',
    html: `<p>Your subscription lapsed and your account is now on Free. <a href="${billingSettingsUrl()}">Resubscribe</a> to restore Pro/Growth features.</p>`,
    text: `Subscription lapsed — now on Free. Resubscribe: ${billingSettingsUrl()}`,
  }),
  access_restored: (input) => ({
    subject: 'Unauth access restored',
    html: `<p>Payment received — your ${escapeHtml(input.planName ?? 'paid')} plan is active again with full access restored.</p>`,
    text: `Access restored on ${input.planName ?? 'paid'} plan.`,
  }),
  plan_upgraded: (input) => ({
    subject: `Welcome to Unauth ${escapeHtml(input.planName ?? 'Pro')}`,
    html: `<p>Your plan is now ${escapeHtml(input.planName ?? 'Pro')}. Credits have been topped up for this billing cycle.</p>`,
    text: `Plan upgraded to ${input.planName ?? 'Pro'}.`,
  }),
  downgrade_scheduled: (input) => ({
    subject: 'Plan change scheduled',
    html: `<p>Your plan will change to ${escapeHtml(input.planName ?? 'Free')} on ${formatDate(input.effectiveDate)}. You keep your current credits and features until then.</p>`,
    text: `Downgrade to ${input.planName} on ${formatDate(input.effectiveDate)}.`,
  }),
  downgrade_executed: (input) => ({
    subject: 'Your Unauth plan has changed',
    html: `<p>Your plan is now ${escapeHtml(input.planName ?? 'Free')}. Monthly credits have been reset to your new allowance.</p>`,
    text: `Plan changed to ${input.planName}.`,
  }),
  cancellation_confirmed: () => ({
    subject: 'Unauth subscription cancelled',
    html: `<p>Your subscription has ended and your account is on Free. You can resubscribe anytime from <a href="${billingSettingsUrl()}">billing settings</a>.</p>`,
    text: `Subscription cancelled. Resubscribe: ${billingSettingsUrl()}`,
  }),
  usage_warning_80: (input) => ({
    subject: 'You have used 80% of your Unauth credits',
    html: `<p>You've used about ${input.usagePercent ?? 80}% of your monthly checks. <a href="${billingSettingsUrl()}">Top up or upgrade</a> to avoid interruption.</p>`,
    text: `${input.usagePercent ?? 80}% credits used. Top up: ${billingSettingsUrl()}`,
  }),
  credit_reset: (input) => ({
    subject: 'Your Unauth credits have reset',
    html: `<p>Your monthly allowance of ${input.creditsMonthly ?? 100} credits is available again.</p>`,
    text: `Credits reset — ${input.creditsMonthly ?? 100} available.`,
  }),
};

export async function sendBillingEmail(
  kind: BillingEmailKind,
  input: BillingEmailInput,
): Promise<void> {
  const template = TEMPLATES[kind](input);
  await sendEmail({
    to: input.to,
    subject: template.subject,
    html: wrapHtml(template.html),
    text: template.text,
  });
}

function wrapHtml(body: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #1A1814; line-height: 1.6;">
      ${body}
      <hr style="border: none; border-top: 1px solid #D8D0BD; margin: 28px 0;" />
      <p style="font-size: 12px; color: #6B665C;">
        Unauth · hello@unauth.co<br />
        <a href="${billingSettingsUrl()}">Billing settings</a>
      </p>
    </div>
  `;
}

export function planDisplayName(planId: string): string {
  const plan = PLANS[planId as keyof typeof PLANS];
  return plan?.name ?? planId;
}
