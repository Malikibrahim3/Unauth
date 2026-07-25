import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PERMISSIONS, requirePermission } from '@/lib/permissions';
import { TABLES } from '@/lib/supabase/tables';
import { isInvestigationEmailDispatchEnabled } from '@/lib/investigations/flags';

const investigationSettingsSchema = z.object({
  investigation_response_sla_hours: z.number().int().min(1).max(2160),
  investigation_reply_to: z.string().trim().email().max(240).nullable(),
  investigation_email_enabled: z.boolean(),
}).superRefine((value, context) => {
  if (value.investigation_email_enabled && !value.investigation_reply_to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['investigation_reply_to'],
      message: 'A valid reply-to address is required before email can be enabled.',
    });
  }
});

async function authorize(permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const serviceClient = createServiceClient();
  const { denied, ctx } = await requirePermission(serviceClient, user.id, permission);
  if (denied) return { response: denied };
  return { serviceClient, ctx };
}

export async function GET() {
  const auth = await authorize(PERMISSIONS.VIEW_SETTINGS);
  if ('response' in auth) return auth.response;
  const { data, error } = await auth.serviceClient
    .from(TABLES.MERCHANTS)
    .select('investigation_response_sla_hours,investigation_reply_to,investigation_email_enabled')
    .eq('id', auth.ctx.merchantId)
    .single();
  if (error) {
    return NextResponse.json(
      { error: 'Unable to load investigation settings.' },
      { status: 500 },
    );
  }
  return NextResponse.json({
    settings: data,
    email_dispatch_available: isInvestigationEmailDispatchEnabled(),
  });
}

export async function PUT(request: Request) {
  const auth = await authorize(PERMISSIONS.MANAGE_SETTINGS);
  if ('response' in auth) return auth.response;
  const input = await request.json().catch(() => null);
  const normalized = input && typeof input === 'object'
    ? {
        ...(input as Record<string, unknown>),
        investigation_reply_to:
          typeof (input as Record<string, unknown>).investigation_reply_to === 'string'
            && ((input as Record<string, unknown>).investigation_reply_to as string).trim()
            ? ((input as Record<string, unknown>).investigation_reply_to as string).trim()
            : null,
      }
    : input;
  const parsed = investigationSettingsSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid investigation settings.',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { data, error } = await auth.serviceClient
    .from(TABLES.MERCHANTS)
    .update(parsed.data)
    .eq('id', auth.ctx.merchantId)
    .select('investigation_response_sla_hours,investigation_reply_to,investigation_email_enabled')
    .single();
  if (error) {
    return NextResponse.json(
      { error: 'Unable to save investigation settings.' },
      { status: 500 },
    );
  }
  return NextResponse.json({ settings: data });
}
