import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  mergePlatformSettings,
  parsePlatformSettings,
  platformSettingsSchema,
} from "@/lib/settings/platform";

async function auth(
  permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS],
) {
  const userClient = createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user)
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  const client = createServiceClient();
  const result = await requirePermission(client, user.id, permission);
  if (result.denied || !result.ctx)
    return {
      response:
        result.denied ??
        NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  return { client, ctx: result.ctx };
}
export async function GET() {
  const result = await auth(PERMISSIONS.VIEW_SETTINGS);
  if ("response" in result) return result.response;
  const { data, error } = await result.client
    .from(TABLES.MERCHANTS)
    .select("settings")
    .eq("id", result.ctx.merchantId)
    .single();
  if (error) throw error;
  return NextResponse.json({ settings: parsePlatformSettings(data.settings) });
}
export async function PUT(request: Request) {
  const result = await auth(PERMISSIONS.MANAGE_SETTINGS);
  if ("response" in result) return result.response;
  const parsed = platformSettingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid platform settings", details: parsed.error.flatten() },
      { status: 400 },
    );
  const { data: current, error: readError } = await result.client
    .from(TABLES.MERCHANTS)
    .select("settings")
    .eq("id", result.ctx.merchantId)
    .single();
  if (readError) throw readError;
  const { error } = await result.client
    .from(TABLES.MERCHANTS)
    .update({ settings: mergePlatformSettings(current.settings, parsed.data) })
    .eq("id", result.ctx.merchantId);
  if (error) throw error;
  return NextResponse.json({ settings: parsed.data });
}
