import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { TABLES } from "@/lib/supabase/tables";
import {
  mergePlatformSettings,
  parsePlatformSettings,
  platformSettingsSchema,
} from "@/lib/settings/platform";
import { loadCanonicalFinancialAggregate } from "@/lib/financial/canonicalAggregates";
import { buildRestatementPreview } from "@/lib/capabilities/derived";

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

/**
 * Preview-only currency restatement. The caller supplies the dated rate; no
 * merchant settings, financial entries, or held rows are mutated.
 */
export async function POST(request: Request) {
  const result = await auth(PERMISSIONS.VIEW_SETTINGS);
  if ("response" in result) return result.response;
  const body = await request.json().catch(() => null) as {
    action?: string;
    baseCurrency?: string;
    proposedCurrency?: string;
    rate?: number;
    rateDate?: string;
    metric?: string;
  } | null;
  if (body?.action !== "currency_restatement_preview") {
    return NextResponse.json({ error: "Unsupported platform preview" }, { status: 400 });
  }
  const baseCurrency = body.baseCurrency?.toUpperCase() ?? "";
  const proposedCurrency = body.proposedCurrency?.toUpperCase() ?? "";
  const rate = body.rate;
  const rateDate = body.rateDate ?? null;
  const metric = body.metric ?? "confirmedLossMinor";
  const allowedMetrics = [
    "requestedMinor", "exposedMinor", "approvedMinor", "paidMinor",
    "estimatedLossMinor", "preventedMinor", "confirmedLossMinor",
    "recoverableMinor", "recoveredMinor", "writtenOffMinor",
    "outstandingMinor", "finalNetLossMinor",
  ] as const;
  if (!/^[A-Z]{3}$/.test(baseCurrency) || !/^[A-Z]{3}$/.test(proposedCurrency) || !allowedMetrics.includes(metric as (typeof allowedMetrics)[number]) || !Number.isFinite(rate) || rate! <= 0 || !rateDate || Number.isNaN(Date.parse(rateDate))) {
    return NextResponse.json({ error: "Provide two ISO currencies, a positive dated rate, and a supported metric." }, { status: 400 });
  }
  const aggregate = await loadCanonicalFinancialAggregate(result.client, result.ctx.merchantId, { currency: baseCurrency });
  const currencyRow = aggregate.currencies.find((row) => row.currency === baseCurrency);
  if (!currencyRow || aggregate.source !== "canonical") {
    return NextResponse.json({
      error: "Currency restatement is unavailable because the canonical aggregate did not return the requested currency.",
      state: "unavailable",
      writesPerformed: 0,
      persisted: false,
    }, { status: 503 });
  }
  const baseMinor = currencyRow[metric as keyof typeof currencyRow];
  if (typeof baseMinor !== "number" || !Number.isSafeInteger(baseMinor)) {
    return NextResponse.json({ error: "The selected metric is unavailable for this scope.", state: "unavailable", writesPerformed: 0, persisted: false }, { status: 503 });
  }
  return NextResponse.json({
    preview: buildRestatementPreview({ baseMinor, baseCurrency, proposedCurrency, rate, rateDate }),
    metric,
    scope: {
      merchantId: result.ctx.merchantId,
      definitionVersion: aggregate.definitionVersion,
      from: aggregate.from,
      to: aggregate.to,
      heldRowsExcluded: true,
      mixedCurrenciesCombined: false,
    },
    writesPerformed: 0,
    persisted: false,
  });
}
