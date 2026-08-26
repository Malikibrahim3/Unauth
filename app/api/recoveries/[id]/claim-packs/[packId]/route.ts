import { NextResponse } from "next/server";
import { authorizeInvestigationRequest } from "@/lib/investigations/routeAuth";
import { getRecoveryCase } from "@/lib/recoveries/store";
import { PERMISSIONS } from "@/lib/permissions";
import { STORAGE_BUCKETS, TABLES } from "@/lib/supabase/tables";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; packId: string }> },
) {
  const auth = await authorizeInvestigationRequest(
    request,
    PERMISSIONS.VIEW_INBOX,
  );
  if (auth.response) return auth.response;
  const { id, packId } = await params;
  const format =
    new URL(request.url).searchParams.get("format") === "pdf" ? "pdf" : "zip";
  const recoveryCase = await getRecoveryCase(
    auth.service,
    auth.ctx.merchantId,
    id,
  );
  if (!recoveryCase)
    return NextResponse.json(
      { error: "Recovery case not found." },
      { status: 404 },
    );
  const packResult = await auth.service
    .from(TABLES.RECOVERY_CLAIM_PACKS)
    .select("id,pack_version,state,pdf_storage_path,zip_storage_path")
    .eq("merchant_id", auth.ctx.merchantId)
    .eq("recovery_case_id", recoveryCase.id)
    .eq("id", packId)
    .maybeSingle();
  if (
    packResult.error &&
    !/does not exist|schema cache/i.test(packResult.error.message)
  ) {
    return NextResponse.json(
      { error: packResult.error.message },
      { status: 500 },
    );
  }
  if (!packResult.data)
    return NextResponse.json(
      { error: "Claim pack not found." },
      { status: 404 },
    );
  const storagePath =
    format === "pdf"
      ? packResult.data.pdf_storage_path
      : packResult.data.zip_storage_path;
  if (!storagePath)
    return NextResponse.json(
      { error: `${format.toUpperCase()} artifact unavailable.` },
      { status: 404 },
    );
  const fileResult = await auth.service.storage
    .from(STORAGE_BUCKETS.EVIDENCE_PACKAGES)
    .download(storagePath);
  if (fileResult.error || !fileResult.data)
    return NextResponse.json(
      { error: "Claim-pack artifact not found." },
      { status: 404 },
    );
  const filename = `case-${recoveryCase.id}-pack-v${packResult.data.pack_version}.${format}`;
  return new NextResponse(await fileResult.data.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": format === "pdf" ? "application/pdf" : "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
