"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DataTable,
} from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "./CanonicalCsvImportClient.module.css";

const DATASETS = ["orders", "refunds", "customers"] as const;
type Dataset = (typeof DATASETS)[number];

const CANONICAL_FIELDS: Record<Dataset, Array<{ value: string; label: string }>> = {
  orders: [
    { value: "external_id", label: "Source record ID" },
    { value: "order_number", label: "Order number" },
    { value: "currency", label: "Currency code" },
    { value: "total_minor", label: "Order total (integer, no decimal separator)" },
    { value: "financial_status", label: "Payment status" },
    { value: "fulfillment_status", label: "Fulfilment status" },
    { value: "customer_email", label: "Customer email" },
  ],
  refunds: [
    { value: "external_id", label: "Source refund ID" },
    { value: "order_external_id", label: "Related order ID" },
    { value: "amount_minor", label: "Refund amount (integer, no decimal separator)" },
    { value: "currency", label: "Currency code" },
    { value: "reason", label: "Refund reason" },
  ],
  customers: [
    { value: "external_id", label: "Source customer ID" },
    { value: "email", label: "Email address" },
    { value: "name", label: "Customer name" },
    { value: "phone", label: "Phone number" },
  ],
};

type ValidateResponse = {
  total_rows: number;
  valid_count: number;
  error_count: number;
  duplicates_skipped: number;
  errors: Array<{ row: number; field: string; code: string; message: string }>;
  preview?: Array<Record<string, unknown>>;
};

export type ImportHistoryItem = {
  id: string;
  label: string | null;
  status: string;
  total_rows: number | null;
  processed_rows: number | null;
  failed_rows: number | null;
  created_at: string;
  completed_at: string | null;
};

function parseHeaders(csv: string): string[] {
  const firstLine = csv.split(/\r?\n/)[0] ?? "";
  return firstLine
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function automaticMapping(dataset: Dataset, headers: string[]) {
  return Object.fromEntries(
    headers.flatMap((header) =>
      CANONICAL_FIELDS[dataset].some((field) => field.value === header) ? [[header, header]] : [],
    ),
  );
}

function fieldLabel(dataset: Dataset, value: string) {
  return CANONICAL_FIELDS[dataset].find((field) => field.value === value)?.label ?? "Record detail";
}

export function CanonicalCsvImportClient({
  history = [],
}: {
  history?: ImportHistoryItem[];
}) {
  const router = useRouter();
  const [dataset, setDataset] = useState<Dataset>("orders");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [importName, setImportName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [committed, setCommitted] = useState<{
    persisted: number;
    error_count: number;
    duplicates_skipped: number;
  } | null>(null);
  const [busy, setBusy] = useState<"read" | "validate" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const headers = useMemo(() => parseHeaders(csv), [csv]);
  const mappedCount = Object.values(mapping).filter(Boolean).length;

  async function loadFile(file: File | null) {
    if (!file) return;
    setBusy("read");
    setError(null);
    setResult(null);
    setCommitted(null);
    try {
      const text = await file.text();
      const nextHeaders = parseHeaders(text);
      setCsv(text);
      setFileName(file.name);
      setImportName(file.name.replace(/\.csv$/i, ""));
      setMapping(automaticMapping(dataset, nextHeaders));
    } catch {
      setError("The selected file could not be read. Choose a UTF-8 CSV file.");
    } finally {
      setBusy(null);
    }
  }

  async function validate() {
    setBusy("validate");
    setError(null);
    setCommitted(null);
    try {
      const response = await fetch("/api/imports/csv/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset, mapping, csv }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message ?? body.error ?? "Validation failed");
      setResult(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Validation failed");
    } finally {
      setBusy(null);
    }
  }

  async function commit() {
    setBusy("commit");
    setError(null);
    try {
      const response = await fetch("/api/imports/csv/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataset,
          mapping,
          csv,
          import_name: importName.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message ?? body.error ?? "Import failed");
      setCommitted(body);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  function handleCsvTextChange(value: string) {
    setCsv(value);
    setFileName(null);
    setMapping(automaticMapping(dataset, parseHeaders(value)));
    setResult(null);
    setCommitted(null);
  }

  function changeDataset(next: Dataset) {
    setDataset(next);
    setMapping(automaticMapping(next, headers));
    setResult(null);
    setCommitted(null);
  }

  return (
    <div className={styles.workspace}>
      <ol className={styles.progress} aria-label="Import progress">
        {[
          { label: "Choose CSV", complete: Boolean(csv) },
          { label: "Map columns", complete: Boolean(csv) && mappedCount > 0 },
          { label: "Validate and import", complete: Boolean(committed) },
        ].map((step, index) => (
          <li
            key={step.label}
            className={`${styles.progressStep} ${step.complete ? styles.progressStepComplete : ""}`}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full font-mono"
              style={{
                background: step.complete ? "var(--ua-success)" : "var(--ua-surface-primary)",
                color: step.complete ? "var(--ua-text-inverse)" : "var(--ua-text-secondary)",
              }}
            >
              {step.complete ? "✓" : index + 1}
            </span>
            <span className="ua-text-working-title">{step.label}</span>
          </li>
        ))}
      </ol>

      <Card unstyled as="section" variant="panel" className={styles.section}>
        <div className={styles.sectionHeading}>
          <h2 className="ua-text-working-title">1. Source file</h2>
          <p>Choose the records you want to add. Nothing is written until validation is complete.</p>
        </div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="ua-text-label">
            Dataset
            <select
              className="ua-text-body mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2 capitalize"
              value={dataset}
              onChange={(event) => changeDataset(event.target.value as Dataset)}
            >
              {DATASETS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="ua-text-label">
            Import name
            <input
              className="ua-text-body mt-1 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 py-2"
              value={importName}
              onChange={(event) => setImportName(event.target.value)}
              placeholder="e.g. June order backfill"
              maxLength={200}
            />
          </label>
        </div>
        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[var(--ua-border-default)] bg-[var(--ua-surface-muted)] px-4 py-8 text-center focus-within:ring-2 focus-within:ring-[var(--ua-action-primary)]">
          <Upload className="h-5 w-5 text-[var(--ua-action-primary)]" />
          <span className="ua-text-working-title mt-2">
            {fileName ?? "Choose a CSV file"}
          </span>
          <span className="ua-text-caption-role mt-1">
            UTF-8 text; row and file-size limits are revalidated by the server.
          </span>
          <input
            className="sr-only"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => void loadFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <details className="mt-3">
          <summary className="ua-text-label cursor-pointer text-[var(--ua-action-primary)]">
            Paste CSV text instead
          </summary>
          <textarea
            className="mt-2 h-36 w-full rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-3 font-mono text-xs"
            value={csv}
            placeholder="Order ID,Currency,Order total (integer)&#10;ORDER-1,GBP,8400"
            onChange={(event) => handleCsvTextChange(event.currentTarget.value)}
            onInput={(event) => handleCsvTextChange(event.currentTarget.value)}
          />
        </details>
      </Card>

      {headers.length > 0 ? (
        <Card unstyled as="section" variant="panel" className={styles.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="ua-text-working-title">2. Match columns</h2>
              <p className="ua-text-caption-role mt-1">
                Match each source column to a record detail. Exact known headers are matched automatically; ignored columns are never persisted.
              </p>
            </div>
            <Badge tone={mappedCount > 0 ? "success" : "neutral"} dot>
              {mappedCount} of {headers.length} mapped
            </Badge>
          </div>
          <div className={styles.mappingLabels} aria-hidden="true">
            <span>Your CSV column</span><span>Unauth record detail</span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {headers.map((header) => (
              <label
                key={header}
                className="ua-text-metadata grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2"
              >
                <span className="truncate font-mono" title={header}>
                  {header}
                </span>
                <span className="sr-only">maps to</span>
                <select
                  aria-label={`Map ${header}`}
                  className="min-w-0 rounded-md border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-2 py-1.5"
                  value={mapping[header] ?? ""}
                  onChange={(event) => {
                    setMapping((current) => ({
                      ...current,
                      [header]: event.target.value,
                    }));
                    setResult(null);
                    setCommitted(null);
                  }}
                >
                  <option value="">Ignore</option>
                  {CANONICAL_FIELDS[dataset].map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Card>
      ) : null}

      {csv ? (
        <Card unstyled as="section" variant="panel" className={styles.section}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="ua-text-working-title">3. Validate and import</h2>
              <p className="ua-text-caption-role mt-1">
                Validation performs no writes. Import commits only valid,
                deduplicated rows with CSV provenance.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                loading={busy === "validate"}
                disabled={mappedCount === 0 || Boolean(busy)}
                onClick={validate}
              >
                Validate
              </Button>
              <Button
                /* Writing deduplicated rows into the merchant ledger is
                   irreversible — commit, not an accent forward action (§3.2). */
                variant="commit"
                loading={busy === "commit"}
                disabled={!result || result.valid_count === 0 || Boolean(busy)}
                onClick={commit}
              >
                Import {result?.valid_count ?? 0} valid{" "}
                {(result?.valid_count ?? 0) === 1 ? "row" : "rows"}
              </Button>
            </div>
          </div>
          {error ? (
            <p
              role="alert"
              className="ua-text-body mt-3 rounded-md border border-[var(--ua-critical)] px-3 py-2 text-[var(--ua-critical)]"
            >
              {error}
            </p>
          ) : null}
          {result ? (
            <div className="mt-4">
              <dl className="grid gap-2 sm:grid-cols-4">
                {[
                  ["Total rows", result.total_rows],
                  ["Valid", result.valid_count],
                  ["Errors", result.error_count],
                  ["Duplicates skipped", result.duplicates_skipped],
                ].map(([label, value]) => (
                  <Card unstyled
                    key={String(label)}
                    variant="muted"
                    className="p-3"
                  >
                    <dt className="text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">
                      {label}
                    </dt>
                    <dd className="mt-1 font-sans text-lg font-semibold tabular-nums">
                      {value}
                    </dd>
                  </Card>
                ))}
              </dl>
              {result.errors.length ? (
                <div className="mt-3 max-h-56 overflow-auto rounded-md border border-[var(--ua-border-default)]">
                  <DataTable
                    aria-label="Import validation issues"
                    rows={result.errors}
                    emptyState={<p className="ua-text-dense p-4 text-[var(--ua-text-secondary)]">No validation issues.</p>}
                    getRowKey={(item) =>
                      `${item.row}-${item.field}-${item.code}-${item.message}`
                    }
                    density="metadata"
                    columns={[
                      {
                        key: "row",
                        header: "Row",
                        kind: "numeric",
                        render: (item) => <span className="font-mono">{item.row}</span>,
                      },
                      {
                        key: "field",
                        header: "Field",
                        render: (item) => fieldLabel(dataset, item.field),
                      },
                      {
                        key: "issue",
                        header: "Issue",
                        render: (item) => <span className="text-[var(--ua-critical)]">{item.message}</span>,
                      },
                    ]}
                  />
                </div>
              ) : (
                <p className="ua-text-body mt-3 flex items-center gap-2 text-[var(--ua-success)]">
                  <CheckCircle2 className="h-4 w-4" /> Every row passed
                  validation.
                </p>
              )}
            </div>
          ) : null}
          {committed ? (
            <div
              role="status"
              className="mt-4 rounded-md border border-[var(--ua-success)] bg-[var(--ua-success-bg)] p-3"
            >
              <p className="ua-text-working-title flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Imported{" "}
                {committed.persisted} record
                {committed.persisted === 1 ? "" : "s"}
              </p>
              <p className="ua-text-caption-role mt-1">
                {committed.duplicates_skipped} duplicates skipped · {committed.error_count} invalid rows retained in validation output
              </p>
            </div>
          ) : null}
        </Card>
      ) : null}

      <section className={styles.history} aria-labelledby="import-history-title">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          <h2 id="import-history-title" className="ua-text-working-title">
            Recent import history
          </h2>
        </div>
        {history.length ? (
          <div className="mt-3 divide-y divide-[var(--ua-border-subtle)] rounded-lg border border-[var(--ua-border-default)]">
            {history.map((job) => (
              <div
                key={job.id}
                className="grid gap-2 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div>
                  <p className="ua-text-body font-medium">
                    {job.label ?? "CSV import"}
                  </p>
                  <p className="mt-1 text-[length:var(--ua-text-metadata-size)] text-[var(--ua-text-tertiary)]">CSV import</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="ua-text-metadata font-sans tabular-nums">
                    {job.processed_rows ?? 0}/{job.total_rows ?? 0} imported ·{" "}
                    {job.failed_rows ?? 0} invalid
                  </span>
                  <StatusBadge family="workflowStatus" value={job.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card unstyled
            variant="muted"
            className="ua-text-body mt-3 p-4 text-[var(--ua-text-secondary)]"
          >
            No CSV import jobs recorded yet.
          </Card>
        )}
      </section>
    </div>
  );
}
