"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ButtonLink, EmptyState, PageFrame, Surface } from "@/components/ui";
import { objectDisplayRef } from "@/lib/ui/displayRef";

const SAFE_RETURN_ROOTS = new Set(["work", "cases", "customers", "financials", "sources", "search"]);

function requestedReference(pathname: string, kind: string) {
  const raw = pathname.split("/").filter(Boolean).at(-1) ?? "";
  try {
    return objectDisplayRef(kind, null, decodeURIComponent(raw));
  } catch {
    return objectDisplayRef(kind, null, raw);
  }
}

function safeReturn(raw: string | null, fallback: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  try {
    const url = new URL(raw, "https://unauth.internal");
    const root = url.pathname.split("/").filter(Boolean)[0];
    return root && SAFE_RETURN_ROOTS.has(root) ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

function returnLabel(href: string) {
  const root = href.split("?")[0]?.split("/").filter(Boolean)[0];
  if (root === "work") return "Return to work";
  if (root === "cases") return "Return to cases";
  if (root === "financials") return "Return to financials";
  if (root === "sources") return "Return to sources";
  if (root === "search") return "Return to search";
  return "Return to customers";
}

/** Route-owned, truthful unavailable state for Phase 20 connected objects. */
export function ConnectedObjectNotFound({
  kind,
  returnHref = "/customers",
}: {
  kind: "order" | "refund" | "return" | "shipment" | "dispute" | "support ticket";
  returnHref?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const label = kind === 'support ticket' ? 'Support ticket' : `${kind[0]?.toUpperCase()}${kind.slice(1)}`;
  const title = `${label} not found`;
  const reference = requestedReference(pathname, kind);
  const returnTarget = safeReturn(searchParams.get("return") ?? searchParams.get("returnTo"), returnHref);
  return (
    <PageFrame title={title} subtitle="This source record is not available in the current workspace." surfaceId={`${kind.replaceAll(' ', '-')}-not-found`} archetype="P12">
      <Surface structure="working" as="section">
        <div data-state-id="connected-record-not-found">
        <EmptyState
          title={title}
          description={`The requested ${reference} is not available in this workspace. From this route we cannot distinguish a missing or disconnected source record from a record your current workspace cannot access.`}
          action={<ButtonLink href={returnTarget} variant="secondary" size="md">{returnLabel(returnTarget)}</ButtonLink>}
        />
        </div>
      </Surface>
    </PageFrame>
  );
}
