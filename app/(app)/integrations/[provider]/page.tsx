import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
import { hasValidControlledRuntimeEvidence } from "@/lib/integrations/registry";
import { getCachedConnectionState } from "@/lib/connections/getConnectionState";
import { verifyMerchantLiveConnections } from "@/lib/connections/liveVerification";
import {
  isLiveCredentialCheckSupported,
  type EffectiveConnectionBadge,
} from "@/lib/connections/effectiveStatus";
// RUN-18: the validating entry point, so no consumer can skip the
// impossible-state check.
import { connectionReadModel } from "@/lib/connections/readModel";
import { TABLES } from "@/lib/supabase/tables";
import { ConnectionActions } from "@/components/integrations/ConnectionActions";
import { Card, DataTableServer } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/utils/format";
import { ConnectionHealthGrid } from "@/components/integrations/ConnectionHealthPanel";
import { AuthenticatedPageHeader } from "@/components/authenticated/AuthenticatedPageHeader";
import pageStyles from "@/components/authenticated/AuthenticatedPageChrome.module.css";

export const dynamic = "force-dynamic";

type SyncJob = {
  id: string;
  status: string;
  job_kind: string;
  processed_rows: number | null;
  failed_rows: number | null;
  created_at: string;
  completed_at: string | null;
  last_error_code: string | null;
};
type IngestionIssue = {
  id: string;
  event_type: string | null;
  status: string;
  last_error: string | null;
  received_at: string;
};

function humanizeLabel(value: string | null | undefined): string {
  const text = String(value ?? "").replaceAll("_", " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

function deliveryModelLabel(value: string): string {
  if (value === "periodic_sync") return "Scheduled sync";
  if (value === "webhook") return "Event delivery";
  if (value === "on_demand") return "On-demand lookup";
  return humanizeLabel(value);
}

export default async function ConnectionPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const service = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_SETTINGS);
  if (!ctx) redirect("/dashboard");
  const { provider } = await params;
  const item = (await loadConnectorCatalogue(service, ctx.merchantId)).find(
    (candidate) => candidate.id === provider,
  );
  if (!item) notFound();
  // Must mirror app/(app)/integrations/page.tsx exactly — the same
  // connector's badge must never disagree between the catalogue list and
  // its own detail page. Shopify/Gorgias are only actually live-checked
  // when they're the merchant's active order-source/helpdesk selection;
  // ShipBob/UPS/FedEx are always probed.
  const connectionState = await getCachedConnectionState(ctx.merchantId);
  const isOrderSource = provider === connectionState.orderSourcePlatform;
  const isHelpdesk = provider === connectionState.helpdeskProvider;
  const providerHasLiveCheck = isLiveCredentialCheckSupported(provider);
  const isActiveSelection = provider === "shopify" ? isOrderSource : provider === "gorgias" ? isHelpdesk : true;
  const isActiveProbedProvider = providerHasLiveCheck && isActiveSelection;
  const liveHealth = isActiveProbedProvider
    ? await verifyMerchantLiveConnections(service, ctx.merchantId)
    : null;
  const liveResult = provider === "shopify" && isOrderSource
    ? liveHealth?.shopify
    : provider === "gorgias" && isHelpdesk
      ? liveHealth?.gorgias
      : provider === "shipbob" || provider === "ups" || provider === "fedex"
        ? liveHealth?.[provider]
        : null;
  let badge: EffectiveConnectionBadge = "disconnected";
  const probeExpectedButMissing = item.status === "connected";
  if (isActiveProbedProvider && !liveResult && probeExpectedButMissing) {
    // A probe was expected but no checkable row was found — a data
    // inconsistency, not a normal freshness signal.
    item.status = "attention_required";
    badge = "not_syncing";
    item.lastError = "Live verification is unavailable. We will retry automatically.";
  }
  // RUN-18: resolved once. The probe branch above is a genuinely different
  // fact — an expected probe row was missing — and stays an explicit override
  // rather than a second derivation of the same state.
  const readModel = connectionReadModel({
    providerId: item.id,
    syncState: item.syncState,
    freshness: item.freshness,
    liveVerification: liveResult ?? null,
    lastVerifiedAt: item.lastVerifiedAt,
    importedRecords: item.importedRecords,
  });
  if (!(isActiveProbedProvider && !liveResult && probeExpectedButMissing)) {
    item.status = readModel.bucket;
    badge = readModel.badge;
    item.lastError = readModel.note;
  }
  const [canManage, jobsResult, issuesResult] = await Promise.all([
    hasPermission(service, ctx, PERMISSIONS.MANAGE_SETTINGS),
    service
      .from(TABLES.PROCESSING_JOBS)
      .select(
        "id,status,job_kind,processed_rows,failed_rows,created_at,completed_at,last_error_code",
      )
      .eq("merchant_id", ctx.merchantId)
      .eq("source", item.id)
      .order("created_at", { ascending: false })
      .limit(10),
    item.connectionId
      ? service
          .from(TABLES.INGESTION_EVENTS)
          .select("id,event_type,status,last_error,received_at")
          .eq("merchant_id", ctx.merchantId)
          .eq("connection_id", item.connectionId)
          .in("status", ["failed", "dead_letter"])
          .order("received_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const jobs = (jobsResult.data ?? []) as SyncJob[];
  const issues = (issuesResult.data ?? []) as IngestionIssue[];
  const applicableLifecycle = item.lifecycle.filter((dim) => dim.applicability === "applicable");
  const verifiedLifecycleCount = applicableLifecycle.filter(
    (dim) => dim.evidence === "controlled_runtime_verified" && Boolean(dim.runtimeEvidence) && hasValidControlledRuntimeEvidence(dim),
  ).length;
  const pendingLifecycleLabels = item.lifecycle
    .filter((dim) => item.pendingRuntimeCapabilities.includes(dim.id))
    .map((dim) => humanizeLabel(dim.id));
  return (
    <div>
      <AuthenticatedPageHeader
        title={item.name}
        subtitle={item.description}
        breadcrumbs={[{ label: "Integrations", href: "/integrations" }, { label: item.name }]}
        actions={<StatusBadge family="workflowStatus" value={badge} />}
      />
      <div className={pageStyles.pageBody}>
        <div className={pageStyles.detailStack}>
      {item.stage === "planned" ? (
        <Card unstyled
          variant="muted"
          className="p-4 text-sm text-[var(--ua-text-secondary)]"
        >
          This connector is coming soon. It is visible so you can understand
          the intended coverage; setup and syncing are not available yet.
        </Card>
      ) : (
        <ConnectionActions
          providerId={item.id}
          providerName={item.name}
          status={item.status}
          canManage={canManage}
        />
      )}
      <ConnectionHealthGrid item={{ ...item, badge }} />
      {item.stage !== "planned" ? (
        <Card unstyled variant="panel" className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Setup coverage</h2>
              <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
                {verifiedLifecycleCount} of {applicableLifecycle.length} supported setup paths have verified coverage.
              </p>
            </div>
            {item.runtimeVerificationPending ? (
              <StatusBadge family="workflowStatus" value="verification_unavailable" size="sm" />
            ) : null}
          </div>
          {item.runtimeVerificationPending ? (
            <p className="mt-3 text-xs text-[var(--ua-text-secondary)]">
              <strong className="text-[var(--ua-text-primary)]">Runtime verification pending</strong>
              {pendingLifecycleLabels.length ? ` · ${pendingLifecycleLabels.join(", ")}` : ""}
            </p>
          ) : null}
        </Card>
      ) : null}
      <Card unstyled variant="panel" className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-[var(--ua-text-tertiary)]">Configuration</p>
          <div className="mt-1"><StatusBadge family="workflowStatus" value={readModel.configuration === "configured" ? "connected" : "not_connected"} size="sm" /></div>
        </div>
        <div>
          <p className="text-xs text-[var(--ua-text-tertiary)]">Operational health</p>
          <div className="mt-1"><StatusBadge family="workflowStatus" value={readModel.operational === "healthy" ? "healthy" : readModel.operational === "attention" ? "attention_required" : "verification_unavailable"} size="sm" /></div>
        </div>
        <div>
          <p className="text-xs text-[var(--ua-text-tertiary)]">Data delivery</p>
          <p className="mt-1 text-sm font-medium text-[var(--ua-text-primary)]">{deliveryModelLabel(readModel.deliveryModel)}</p>
          <p className="mt-0.5 text-xs text-[var(--ua-text-secondary)]">{item.lastDataReceivedAt ? `Last data ${formatDateTime(item.lastDataReceivedAt)}` : "No data receipt recorded"}</p>
        </div>
      </Card>
      <section aria-labelledby="capability-matrix-title">
        <div>
          <h2 id="capability-matrix-title" className="text-base font-semibold">
            Data available to Unauth
          </h2>
          <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
            These are the records this connection can contribute to case
            evidence. Unauth does not make customer or payout decisions
            automatically.
          </p>
        </div>
        <div className="mt-3 hidden md:block">
          <DataTableServer
            rows={item.capabilities}
            getRowKey={(capability) => capability.id}
            density="compact"
            columns={[
              {
                key: "capability",
                header: "Capability",
                render: (capability) => <span className="font-medium">{capability.description}</span>,
              },
              {
                key: "support",
                header: "Support",
                render: (capability) => <StatusBadge family="workflowStatus" value={capability.support} size="sm" />,
              },
            ]}
          />
        </div>
        <div className="mt-3 grid gap-2 md:hidden">
          {item.capabilities.map((capability) => (
            <Card unstyled key={capability.id} variant="panel" className="p-3">
              <div className="flex items-start justify-between gap-2">
                <strong className="text-sm">{capability.description}</strong>
                <StatusBadge family="workflowStatus" value={capability.support} size="sm" />
              </div>
              <p className="mt-2 text-xs text-[var(--ua-text-secondary)]">Available to the connected case workflow.</p>
            </Card>
          ))}
        </div>
      </section>
      <div className={pageStyles.detailSplit}>
        <section aria-labelledby="sync-history-title">
          <div className="flex items-center justify-between">
            <h2 id="sync-history-title" className="text-base font-semibold">
              Import history
            </h2>
            <Link
              href="/integrations/imports"
              className="text-xs font-semibold text-[var(--ua-action-primary)]"
            >
              Import records
            </Link>
          </div>
          {jobs.length ? (
            <div className="mt-3 divide-y divide-[var(--ua-border-subtle)] rounded-lg border border-[var(--ua-border-default)]">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {humanizeLabel(job.job_kind)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ua-text-tertiary)]">
                      Started {formatDateTime(job.created_at)}
                      {job.completed_at
                        ? ` · completed ${formatDateTime(job.completed_at)}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge family="workflowStatus" value={job.status} size="sm" />
                    <p className="mt-1 font-mono text-xs">
                      {job.processed_rows ?? 0} processed ·{" "}
                      {job.failed_rows ?? 0} failed
                    </p>
                  </div>
                  {job.last_error_code ? (
                    <p className="text-xs text-[var(--ua-critical)] sm:col-span-2">
                      {job.last_error_code}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Card unstyled
              variant="muted"
              className="mt-3 p-4 text-sm text-[var(--ua-text-secondary)]"
            >
              No account-level import runs recorded for this provider.
            </Card>
          )}
        </section>
        <section aria-labelledby="ingestion-issues-title">
          <h2 id="ingestion-issues-title" className="text-base font-semibold">
            Active ingestion issues
          </h2>
          {issues.length ? (
            <ul className="mt-3 space-y-2">
              {issues.map((issue) => (
                <Card unstyled key={issue.id} as="li" variant="panel" className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm">
                      {humanizeLabel(issue.event_type ?? "Ingestion event")}
                    </strong>
                    <StatusBadge family="workflowStatus" value={issue.status} tone="danger" size="sm" />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ua-text-secondary)]">
                    {issue.last_error ??
                      "Source event needs retry or operator review."}
                  </p>
                  <p className="mt-1 text-[length:var(--ua-text-micro-size)] text-[var(--ua-text-tertiary)]">
                    {formatDateTime(issue.received_at)}
                  </p>
                </Card>
              ))}
            </ul>
          ) : (
            <Card unstyled
              variant="muted"
              className="mt-3 p-4 text-sm text-[var(--ua-text-secondary)]"
            >
              No failed or dead-letter ingestion events for this connection.
            </Card>
          )}
        </section>
      </div>
        </div>
      </div>
    </div>
  );
}
