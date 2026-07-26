import { NextResponse } from 'next/server';
import type { CallerContext, Permission } from '@/lib/permissions';
import { requirePermission } from '@/lib/permissions';
import {
  InvestigationConflictError,
  InvestigationNotFoundError,
} from '@/lib/investigations/store';
import {
  areInvestigationWritesEnabled,
  INVESTIGATION_WRITES_DISABLED_MESSAGE,
} from '@/lib/investigations/flags';
import { getClientIp } from '@/lib/ratelimit';
import { createClient, createServiceClient } from '@/lib/supabase/server';

type AuthorizedInvestigationRequest = {
  response?: never;
  user: { id: string };
  ctx: CallerContext;
  service: ReturnType<typeof createServiceClient>;
  mutationClient: ReturnType<typeof createServiceClient>;
};

type DeniedInvestigationRequest = {
  response: NextResponse;
  user?: never;
  ctx?: never;
  service?: never;
  mutationClient?: never;
};

export async function authorizeInvestigationRequest(
  request: Request,
  permission: Permission,
  options: { requireWriteFeature?: boolean } = {},
): Promise<AuthorizedInvestigationRequest | DeniedInvestigationRequest> {
  const userClient = createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(service, user.id, permission);
  if (denied) return { response: denied };
  if (options.requireWriteFeature && !areInvestigationWritesEnabled()) {
    return {
      response: NextResponse.json(
        {
          error: 'investigations_read_only',
          message: INVESTIGATION_WRITES_DISABLED_MESSAGE,
        },
        { status: 503 },
      ),
    };
  }
  const mutationClient = createServiceClient({
    audit: {
      actorId: user.id,
      actorRole: ctx.role,
      requestIp: getClientIp(request.headers),
    },
  });
  return { user, ctx, service, mutationClient };
}

export function investigationErrorResponse(error: unknown): NextResponse {
  if (error instanceof InvestigationNotFoundError) {
    return NextResponse.json({ error: 'Investigation not found' }, { status: 404 });
  }
  if (error instanceof InvestigationConflictError) {
    return NextResponse.json(
      {
        error: 'Investigation changed or cannot perform that action in its current state.',
        code: error.message,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ error: 'Investigation operation failed' }, { status: 500 });
}
