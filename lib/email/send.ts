const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  ok: boolean;
  skipped: boolean;
  error?: string;
  providerId?: string;
}

function asArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

export async function sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      error: 'RESEND_API_KEY is not configured.',
    };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from ?? process.env.AUDIT_EMAIL_FROM ?? 'Unauth <hello@unauth.app>',
        to: asArray(payload.to),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo ?? 'hello@unauth.app',
      }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        error: typeof body?.message === 'string' ? body.message : `Email send failed with ${response.status}.`,
      };
    }

    return {
      ok: true,
      skipped: false,
      providerId: typeof body?.id === 'string' ? body.id : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      error: error instanceof Error ? error.message : 'Unknown email send error.',
    };
  }
}
