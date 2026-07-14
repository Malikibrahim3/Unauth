import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
import { verifyMerchantLiveConnections } from "@/lib/connections/liveVerification";
import { TABLES } from "@/lib/supabase/tables";
import { ConnectionActions } from "@/components/integrations/ConnectionActions";
import { Card, DataTableServer } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDateTime, formatNumber } from "@/lib/utils/format";
import { ProviderLogo } from "@/components/identity/ProviderLogo";

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

export default async function ConnectionPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const auth = createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const service = createServiceClient();
  const { denied, ctx } = await requirePermission(
    service,
    user.id,
    PERMISSIONS.VIEW_SETTINGS,
  );
  if (denied || !ctx) redirect("/dashboard");
  const { provider } = await params;
  const item = (await loadConnectorCatalogue(service, ctx.merchantId)).find(
    (candidate) => candidate.id === provider,
  );
  if (!item) notFound();
  const liveHealth = provider === "shopify"
    || provider === "gorgias"
    || provider === "shipbob"
    || provider === "ups"
    || provider === "fedex"
    ? await verifyMerchantLiveConnections(service, ctx.merchantId)
    : null;
  const liveResult = provider === "shopify"
    ? liveHealth?.shopify
    : provider === "gorgias"
      ? liveHealth?.gorgias
      : provider === "shipbob" || provider === "ups" || provider === "fedex"
        ? liveHealth?.[provider]
        : null;
  if (liveResult) {
    item.status = liveResult.status === "verified"
      ? "connected"
      : liveResult.status === "failed"
        ? "error"
        : "attention_required";
    item.lastError = liveResult.status === "failed"
      ? `Live verification failed${liveResult.reason ? `: ${liveResult.reason}` : ". Reconnect this integration."}`
      : liveResult.status === "inconclusive"
        ? "Live verification could not be completed. We will retry automatically."
        : null;
  } else if (liveHealth && item.status === "connected") {
    item.status = "attention_required";
    item.lastError = "Live verification is unavailable. We will retry automatically.";
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
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <Link
        href="/integrations"
        className="text-sm font-semibold text-[var(--accent)]"
      >
        Integrations
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-xs)] md:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <ProviderLogo provider={item.id} name={item.name} size="lg" />
          <div>
          <p className="text-sm capitalize text-[var(--text-secondary)]">
            {humanizeLabel(item.category)} · {humanizeLabel(item.stage)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{item.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
            {item.description}
          </p>
          </div>
        </div>
        <StatusBadge family="workflowStatus" value={item.status === "import_complete" ? "connected" : item.status} />
      </header>
      {item.stage === "planned" ? (
        <Card unstyled
          variant="inset"
          className="p-4 text-sm text-[var(--text-secondary)]"
        >
          This connector is planned. Capability rows document scope, but
          credential and sync controls remain unavailable until verification is
          complete.
        </Card>
      ) : (
        <ConnectionActions
          providerId={item.id}
          providerName={item.name}
          status={item.status}
          canManage={canManage}
        />
      )}
      {item.lastError ? (
        <Card unstyled
          as="section"
          variant="flat"
          className="border-[var(--danger)] p-4"
        >
          <h2 className="text-sm font-semibold text-[var(--danger)]">
            Action required
          </h2>
          <p role="alert" className="mt-1 text-sm text-[var(--text-secondary)]">
            {item.lastError}
          </p>
        </Card>
      ) : null}
      <section aria-labelledby="connection-health-title">
        <h2 id="connection-health-title" className="text-base font-semibold">
          Connection health
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Account</dt>
            <dd className="mt-1 truncate text-sm font-medium">
              {item.account ??
                (item.connectionCount
                  ? `${item.connectionCount} connected account${item.connectionCount === 1 ? "" : "s"}`
                  : "Not connected")}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">
              Imported objects
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold">
              {formatNumber(item.importedRecords)}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">
              Last successful sync
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {item.lastSuccessfulSyncAt
                ? formatDateTime(item.lastSuccessfulSyncAt)
                : "No successful sync"}
            </dd>
          </Card>
          <Card unstyled variant="flat" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">
              Granted scopes
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {item.scopes.length
                ? `${item.scopes.length} recorded`
                : "None recorded"}
            </dd>
          </Card>
        </dl>
      </section>
      <section aria-labelledby="capability-matrix-title">
        <div>
          <h2 id="capability-matrix-title" className="text-base font-semibold">
            Capability contract
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Read, subscribe and low-risk write capabilities are explicit.
            Unsupported autonomous payout actions remain blocked.
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
                render: (capability) => <div><span className="font-medium">{capability.description}</span><small className="mt-1 block font-mono text-[11px] text-[var(--text-tertiary)]">{capability.id}</small></div>,
              },
              {
                key: "level",
                header: "Level",
                render: (capability) => <span className="capitalize">{capability.level}</span>,
              },
              {
                key: "support",
                header: "Support",
                render: (capability) => <StatusBadge family="workflowStatus" value={capability.support} size="sm" />,
              },
              {
                key: "scopes",
                header: "Required scopes",
                render: (capability) => <span className="text-xs text-[var(--text-secondary)]">{capability.scopes.join(", ") || "None"}</span>,
              },
            ]}
          />
        </div>
        <div className="mt-3 grid gap-2 md:hidden">
          {item.capabilities.map((capability) => (
            <Card unstyled key={capability.id} variant="flat" className="p-3">
              <div className="flex items-start justify-between gap-2">
                <strong className="text-sm">{capability.description}</strong>
                <StatusBadge family="workflowStatus" value={capability.support} size="sm" />
              </div>
              <p className="mt-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                {capability.id}
              </p>
              <p className="mt-2 text-xs capitalize text-[var(--text-secondary)]">
                {capability.level} · scopes:{" "}
                {capability.scopes.join(", ") || "none"}
              </p>
            </Card>
          ))}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="sync-history-title">
          <div className="flex items-center justify-between">
            <h2 id="sync-history-title" className="text-base font-semibold">
              Import history
            </h2>
            <Link
              href="/integrations/imports"
              className="text-xs font-semibold text-[var(--accent)]"
            >
              Import records
            </Link>
          </div>
          {jobs.length ? (
            <div className="mt-3 divide-y divide-[var(--border-muted)] rounded-lg border border-[var(--border)]">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="grid gap-2 px-3 py-3 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {humanizeLabel(job.job_kind)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">
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
                    <p className="text-xs text-[var(--danger)] sm:col-span-2">
                      {job.last_error_code}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Card unstyled
              variant="inset"
              className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
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
                <Card unstyled key={issue.id} as="li" variant="flat" className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm">
                      {humanizeLabel(issue.event_type ?? "Ingestion event")}
                    </strong>
                    <StatusBadge family="workflowStatus" value={issue.status} tone="danger" size="sm" />
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {issue.last_error ??
                      "Source event needs retry or operator review."}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                    {formatDateTime(issue.received_at)}
                  </p>
                </Card>
              ))}
            </ul>
          ) : (
            <Card unstyled
              variant="inset"
              className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
            >
              No failed or dead-letter ingestion events for this connection.
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
