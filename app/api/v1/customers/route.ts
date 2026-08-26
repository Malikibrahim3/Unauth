import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { validateApiKey, isValidatedApiKey } from "@/lib/api/validateApiKey";
import { performV1CustomerProfile } from "@/lib/api/v1/customers";
import { v1OptionsResponse, withV1Cors } from "@/lib/api/v1/cors";
import { withRequestLogging } from "@/lib/log";
import { enforceEntitlement } from "@/lib/product/requireEntitlement";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return v1OptionsResponse(request);
}

async function GETHandler(request: NextRequest) {
  const authResult = await validateApiKey(request, 'customers:read');
  if (!isValidatedApiKey(authResult)) return withV1Cors(authResult, request);

  const service = createServiceClient();
  const gated = await enforceEntitlement(
    service,
    authResult.merchantId,
    "CUSTOMER_DOSSIER",
  );
  if (gated) return withV1Cors(gated, request);

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";

  const result = await performV1CustomerProfile(
    service,
    {
      merchantId: authResult.merchantId,
      apiKeyId: authResult.keyId,
      requestIp: authResult.requestIp,
    },
    email,
  );

  if (!result.ok) {
    return withV1Cors(
      NextResponse.json({ error: result.error }, { status: result.status }),
      request,
    );
  }
  return withV1Cors(NextResponse.json(result.body), request);
}

export const GET = withRequestLogging("/api/v1/customers", GETHandler);
