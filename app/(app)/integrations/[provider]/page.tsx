import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  hasPermission,
  PERMISSIONS,
  requirePermission,
} from "@/lib/permissions";
import { loadConnectorCatalogue } from "@/lib/connectors/catalogue";
import { TABLES } from "@/lib/supabase/tables";
import { ConnectionActions } from "@/components/integrations/ConnectionActions";
import { PanelCard } from "@/components/ui";
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
            {item.category.replaceAll("_", " ")} · {item.stage}
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
        <PanelCard
          variant="appInset"
          className="p-4 text-sm text-[var(--text-secondary)]"
        >
          This connector is planned. Capability rows document scope, but
          credential and sync controls remain unavailable until verification is
          complete.
        </PanelCard>
      ) : (
        <ConnectionActions
          providerId={item.id}
          providerName={item.name}
          status={item.status}
          canManage={canManage}
        />
      )}
      {item.lastError ? (
        <PanelCard
          as="section"
          variant="app"
          className="border-[var(--danger)] p-4"
        >
          <h2 className="text-sm font-semibold text-[var(--danger)]">
            Action required
          </h2>
          <p role="alert" className="mt-1 text-sm text-[var(--text-secondary)]">
            {item.lastError}
          </p>
        </PanelCard>
      ) : null}
      <section aria-labelledby="connection-health-title">
        <h2 id="connection-health-title" className="text-base font-semibold">
          Connection health
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PanelCard variant="app" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">Account</dt>
            <dd className="mt-1 truncate text-sm font-medium">
              {item.account ??
                (item.connectionCount
                  ? `${item.connectionCount} connected account${item.connectionCount === 1 ? "" : "s"}`
                  : "Not connected")}
            </dd>
          </PanelCard>
          <PanelCard variant="app" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">
              Imported objects
            </dt>
            <dd className="mt-1 font-mono text-sm font-semibold">
              {formatNumber(item.importedRecords)}
            </dd>
          </PanelCard>
          <PanelCard variant="app" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">
              Last successful sync
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {item.lastSuccessfulSyncAt
                ? formatDateTime(item.lastSuccessfulSyncAt)
                : "No successful sync"}
            </dd>
          </PanelCard>
          <PanelCard variant="app" className="ua-metric-card p-3">
            <dt className="text-xs text-[var(--text-tertiary)]">
              Granted scopes
            </dt>
            <dd className="mt-1 text-sm font-medium">
              {item.scopes.length
                ? `${item.scopes.length} recorded`
                : "None recorded"}
            </dd>
          </PanelCard>
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
        <div className="mt-3 hidden overflow-x-auto rounded-lg border border-[var(--border)] md:block">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-[var(--surface-sunken)]">
              <tr>
                <th className="px-3 py-2 text-left">Capability</th>
                <th className="px-3 py-2 text-left">Level</th>
                <th className="px-3 py-2 text-left">Support</th>
                <th className="px-3 py-2 text-left">Required scopes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-muted)]">
              {item.capabilities.map((capability) => (
                <tr key={capability.id}>
                  <th scope="row" className="px-3 py-3 text-left">
                    <span className="font-medium">
                      {capability.description}
                    </span>
                    <small className="mt-1 block font-mono text-[11px] text-[var(--text-tertiary)]">
                      {capability.id}
                    </small>
                  </th>
                  <td className="px-3 py-3 capitalize">{capability.level}</td>
                  <td className="px-3 py-3">
                    <StatusBadge family="workflowStatus" value={capability.support} size="sm" />
                  </td>
                  <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                    {capability.scopes.join(", ") || "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-2 md:hidden">
          {item.capabilities.map((capability) => (
            <PanelCard key={capability.id} variant="app" className="p-3">
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
            </PanelCard>
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
                    <p className="text-sm font-medium capitalize">
                      {job.job_kind.replaceAll("_", " ")}
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
            <PanelCard
              variant="appInset"
              className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
            >
              No account-level import runs recorded for this provider.
            </PanelCard>
          )}
        </section>
        <section aria-labelledby="ingestion-issues-title">
          <h2 id="ingestion-issues-title" className="text-base font-semibold">
            Active ingestion issues
          </h2>
          {issues.length ? (
            <ul className="mt-3 space-y-2">
              {issues.map((issue) => (
                <PanelCard key={issue.id} as="li" variant="app" className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm">
                      {issue.event_type ?? "Ingestion event"}
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
                </PanelCard>
              ))}
            </ul>
          ) : (
            <PanelCard
              variant="appInset"
              className="mt-3 p-4 text-sm text-[var(--text-secondary)]"
            >
              No failed or dead-letter ingestion events for this connection.
            </PanelCard>
          )}
        </section>
      </div>
    </div>
  );
}
