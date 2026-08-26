"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Upload } from "lucide-react";
import { Badge, Button, DataTable, Disclosure, Input, Modal, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import styles from "@/components/sources/SourcesSurface.module.css";
import { CountBars, OutcomeBand } from '@/components/charts/authenticated/SecondaryAnalytics';
import { buildImportErrorContributions } from '@/lib/visualisation/secondaryAnalytics';
import { formatDate, formatNumber } from '@/lib/utils/format';

const DATASETS = ["orders", "refunds", "customers"] as const;
type Dataset = (typeof DATASETS)[number];
type Step = "upload" | "map" | "validate" | "commit";
type View = "history" | Step;

function validStep(value: string | null | undefined): value is Step {
  return value === "upload" || value === "map" || value === "validate" || value === "commit";
}

const FIELDS: Record<Dataset, Array<{ value: string; label: string; required?: boolean }>> = {
  orders: [
    { value: "external_id", label: "Source record ID", required: true },
    { value: "order_number", label: "Order number" },
    { value: "currency", label: "Currency code", required: true },
    { value: "total_minor", label: "Order total (whole number, smallest currency unit)", required: true },
    { value: "financial_status", label: "Payment status" },
    { value: "fulfillment_status", label: "Fulfilment status" },
    { value: "customer_email", label: "Customer email" },
  ],
  refunds: [
    { value: "external_id", label: "Source refund ID", required: true },
    { value: "order_external_id", label: "Related order ID", required: true },
    { value: "amount_minor", label: "Refund amount (whole number, smallest currency unit)", required: true },
    { value: "currency", label: "Currency code", required: true },
    { value: "reason", label: "Refund reason" },
  ],
  customers: [
    { value: "external_id", label: "Source customer ID", required: true },
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

type CommitResponse = {
  job_id: string;
  persisted: number;
  error_count: number;
  duplicates_skipped: number;
  dataset_supported: boolean;
};

type FailedCommit = { job_id: string; message: string };

export type ImportHistoryItem = {
  id: string;
  label: string | null;
  status: string;
  total_rows: number | null;
  processed_rows: number | null;
  failed_rows: number | null;
  created_at: string;
  completed_at: string | null;
  cursor: unknown;
  error_log: unknown;
};

type ImportCursor = {
  dataset?: string;
  file_name?: string | null;
  duplicates_skipped?: number;
  validation_valid_rows?: number;
};

type ImportIssue = { row?: number; field?: string; code?: string; message?: string };

function cursorOf(job: ImportHistoryItem): ImportCursor {
  return job.cursor && typeof job.cursor === "object" && !Array.isArray(job.cursor)
    ? job.cursor as ImportCursor
    : {};
}

function issuesOf(job: ImportHistoryItem): ImportIssue[] {
  return Array.isArray(job.error_log)
    ? job.error_log.filter((entry): entry is ImportIssue => Boolean(entry && typeof entry === "object"))
    : [];
}

function displayStatus(status: string) {
  if (status === "completed" || status === "committed") return "Committed";
  if (status === "failed" || status === "dead_letter") return "Rejected";
  return "Needs review";
}

function statusTone(status: string) {
  if (status === "completed" || status === "committed") return "committed";
  if (status === "failed" || status === "dead_letter") return "red";
  return "amber";
}

function formatWhen(value: string) {
  const formatted = formatDate(value);
  return formatted === "just now" ? "Just now" : formatted;
}

function csvCells(line: string) {
  return line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
}

function parseHeaders(csv: string) {
  return csvCells(csv.split(/\r?\n/)[0] ?? "").filter(Boolean);
}

function samples(csv: string) {
  const values = csvCells(csv.split(/\r?\n/)[1] ?? "");
  return Object.fromEntries(parseHeaders(csv).map((header, index) => [header, values[index] ?? "—"]));
}

function automaticMapping(dataset: Dataset, headers: string[]) {
  return Object.fromEntries(headers.flatMap((header) => FIELDS[dataset].some((field) => field.value === header) ? [[header, header]] : []));
}

const STEPS: Array<{ id: Step; label: string; description: string }> = [
  { id: "upload", label: "Upload", description: "Choose dataset and CSV" },
  { id: "map", label: "Map", description: "Match source columns" },
  { id: "validate", label: "Validate", description: "Review row errors" },
  { id: "commit", label: "Commit", description: "Write valid records" },
];

export function CanonicalCsvImportClient({ history = [], initialStep }: { history?: ImportHistoryItem[]; initialStep?: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dataset, setDataset] = useState<Dataset>("orders");
  const [active, setActive] = useState<View>(validStep(initialStep) ? initialStep : "history");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(history[0]?.id ?? null);
  const [continuityNotice, setContinuityNotice] = useState(
    validStep(initialStep) && initialStep !== "upload"
      ? "Choose the CSV again to continue. Files and mappings are not restored from URL state."
      : null,
  );
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [importName, setImportName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ValidateResponse | null>(null);
  const [committed, setCommitted] = useState<CommitResponse | null>(null);
  const [failedCommit, setFailedCommit] = useState<FailedCommit | null>(null);
  const [busy, setBusy] = useState<"read" | "validate" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const headers = useMemo(() => parseHeaders(csv), [csv]);
  const sampleValues = useMemo(() => samples(csv), [csv]);
  const mappedTargets = Object.values(mapping).filter(Boolean);
  const missingRequired = FIELDS[dataset].filter((field) => field.required && !mappedTargets.includes(field.value));
  const persistableDataset = dataset !== "refunds";
  const dirtyMapping = Boolean(csv && (mappedTargets.length || result));

  useEffect(() => {
    function guard(event: BeforeUnloadEvent) {
      if (!dirtyMapping || committed) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [committed, dirtyMapping]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (active === "history") url.searchParams.delete("step");
    else url.searchParams.set("step", active);
    window.history.replaceState(window.history.state, "", `${url.pathname}?${url.searchParams.toString()}${url.hash}`);
  }, [active]);

  useEffect(() => {
    function restoreStep() {
      const requested = new URL(window.location.href).searchParams.get("step");
      if (!requested) {
        setActive("history");
        return;
      }
      if (!validStep(requested) || (requested !== "upload" && !csv)) {
        setActive("upload");
        if (requested && requested !== "upload") {
          setContinuityNotice("Choose the CSV again to continue. Files and mappings are not restored from browser history.");
        }
        return;
      }
      setActive(requested);
    }
    window.addEventListener("popstate", restoreStep);
    return () => window.removeEventListener("popstate", restoreStep);
  }, [csv]);

  async function applyFile(file: File) {
    setBusy("read");
    setError(null);
    try {
      const text = await file.text();
      const nextHeaders = parseHeaders(text);
      setCsv(text);
      setFileName(file.name);
      setFileSize(file.size);
      setImportName(file.name.replace(/\.csv$/i, ""));
      setMapping(automaticMapping(dataset, nextHeaders));
      setResult(null);
      setCommitted(null);
      setContinuityNotice(null);
      setActive("map");
    } catch {
      setError("The file could not be read. Choose a UTF-8 CSV file and try again.");
    } finally {
      setBusy(null);
      setPendingFile(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function chooseFile(file: File | null) {
    if (!file) return;
    if (dirtyMapping) setPendingFile(file); else void applyFile(file);
  }

  async function validate() {
    setBusy("validate");
    setError(null);
    setCommitted(null);
    setFailedCommit(null);
    try {
      const response = await fetch("/api/imports/csv/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset, mapping, csv }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? body.error ?? "Validation failed");
      setResult(body);
      setActive(body.valid_count > 0 ? "commit" : "validate");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Validation failed");
      setActive("validate");
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
        body: JSON.stringify({ dataset, mapping, csv, import_name: importName.trim() || undefined, file_name: fileName ?? undefined, file_size: fileSize ?? undefined }),
      });
      const body = await response.json();
      if (!response.ok) {
        const message = body.message ?? body.detail ?? body.error ?? "Import failed";
        if (typeof body.job_id === "string") setFailedCommit({ job_id: body.job_id, message });
        throw new Error(message);
      }
      setFailedCommit(null);
      setCommitted(body);
      setActive("commit");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  function changeDataset(next: Dataset) {
    setDataset(next);
    setMapping(automaticMapping(next, headers));
    setResult(null);
    setCommitted(null);
    if (csv) setActive("map");
  }

  const completedThrough = committed ? 4 : result ? 3 : csv ? 1 : 0;
  const errorContributions = result ? buildImportErrorContributions(result.errors) : [];
  const selectedJob = history.find((job) => job.id === selectedJobId) ?? history[0] ?? null;
  const selectedCursor = selectedJob ? cursorOf(selectedJob) : {};
  const selectedIssues = selectedJob ? issuesOf(selectedJob) : [];
  const selectedTotal = selectedJob?.total_rows ?? null;
  const selectedValid = selectedJob?.processed_rows ?? selectedCursor.validation_valid_rows ?? null;
  const selectedWarnings = typeof selectedCursor.duplicates_skipped === "number" ? selectedCursor.duplicates_skipped : null;
  const selectedErrors = selectedJob?.failed_rows ?? null;

  return (
    <div className={styles.stack} data-source-import data-operations-surface="imports" data-state-id={active === "history" ? "import-history" : committed ? "import-committed" : error ? "import-error" : busy ? `import-${busy}` : csv ? `import-${active}` : "import-no-file"}>
      {active === "history" ? (
        history.length ? (
          <div className={styles.importHistoryGrid}>
            <section className={styles.importHistoryCard} aria-labelledby="import-history-title">
              <div className={styles.importHistoryHeading}>
                <div><h2 id="import-history-title">Import jobs</h2><p>Rows are validated before anything is committed to the ledger</p></div>
                <a className="ua-button ua-button--secondary ua-button--sm" download="unauth-import-template.csv" href="data:text/csv;charset=utf-8,external_id%2Ccurrency%2Ctotal_minor">Download template</a>
              </div>
              <div className={styles.importHistoryHeader} aria-hidden="true">
                <span>File</span><span>Type</span><span>Rows</span><span>Validation</span><span>Status</span><span>Uploaded</span>
              </div>
              <div className={styles.importHistoryRows} role="listbox" aria-label="Import jobs">
                {history.map((job) => {
                  const cursor = cursorOf(job);
                  const total = job.total_rows;
                  const valid = job.processed_rows ?? cursor.validation_valid_rows ?? null;
                  const warnings = typeof cursor.duplicates_skipped === "number" ? cursor.duplicates_skipped : null;
                  const errors = job.failed_rows;
                  const knownSegments = total != null && total > 0 && valid != null && warnings != null && errors != null;
                  const validShare = knownSegments ? Math.min(100, (valid / total) * 100) : 0;
                  const warningShare = knownSegments ? Math.min(100, (warnings / total) * 100) : 0;
                  const errorShare = knownSegments ? Math.min(100, (errors / total) * 100) : 0;
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedJob?.id === job.id}
                      className={styles.importHistoryRow}
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <span className={styles.importFile}><strong title={cursor.file_name ?? job.label ?? "CSV import"}>{cursor.file_name ?? job.label ?? "CSV import"}</strong><small>Immutable import job</small></span>
                      <span className={styles.importType}>{cursor.dataset ?? "— Unavailable"}</span>
                      <span className={styles.importRows}>{formatNumber(total)}</span>
                      <span className={styles.importValidation}>
                        <span className={styles.importValidationTrack} data-unavailable={!knownSegments || undefined}>
                          {knownSegments ? <><i data-tone="ok" style={{ width: `${validShare}%` }} /><i data-tone="warn" style={{ width: `${warningShare}%` }} /><i data-tone="red" style={{ width: `${errorShare}%` }} /></> : null}
                        </span>
                        <small>{errors == null ? "— err" : `${errors} err`} · {warnings == null ? "— warn" : `${warnings} warn`}</small>
                      </span>
                      <span><span className={styles.importStatus} data-tone={statusTone(job.status)}>{displayStatus(job.status)}</span></span>
                      <span className={styles.importUploaded}>{formatWhen(job.created_at)}</span>
                    </button>
                  );
                })}
              </div>
              <p className={styles.importHistoryFooter}>Nothing is committed until you approve it. Rejected rows remain in their immutable import job so they can be corrected and re-uploaded.</p>
            </section>

            {selectedJob ? (
              <aside className={styles.importJobInspector} aria-label="Selected import job">
                <div className={styles.importInspectorHeader}>
                  <div><h2 title={selectedCursor.file_name ?? selectedJob.label ?? "CSV import"}>{selectedCursor.file_name ?? selectedJob.label ?? "CSV import"}</h2><p>{selectedTotal == null ? "— rows" : `${formatNumber(selectedTotal)} rows`} · {selectedCursor.dataset ?? "type unavailable"} · uploaded {formatWhen(selectedJob.created_at).toLowerCase()}</p></div>
                  <span className={styles.importStatus} data-tone={statusTone(selectedJob.status)}>{displayStatus(selectedJob.status)}</span>
                </div>
                <div className={styles.importInspectorFigures}>
                  <div><span>Valid</span><strong data-tone="ok">{formatNumber(selectedValid)}</strong></div>
                  <div><span>Warnings</span><strong data-tone="warn">{formatNumber(selectedWarnings)}</strong></div>
                  <div><span>Errors</span><strong data-tone="red">{formatNumber(selectedErrors)}</strong></div>
                </div>
                <div className={styles.importInspectorIssues}>
                  <h3>Row errors</h3>
                  {selectedIssues.length ? (
                    <ul>{selectedIssues.slice(0, 4).map((issue, index) => <li key={`${issue.row ?? index}-${issue.code ?? index}`}><i /><span><strong>{issue.message ?? issue.code ?? "Validation error"}</strong><small>{issue.row == null ? "Affected rows recorded in the job" : `row ${issue.row}${issue.field ? ` · ${issue.field}` : ""}`}</small></span><b>1</b></li>)}</ul>
                  ) : selectedErrors === 0 ? (
                    <div className={styles.importClean}><i /><span>Every row passed validation. This is a verified clean file.</span></div>
                  ) : (
                    <div className={styles.importUnavailable}>— Row-level errors unavailable</div>
                  )}
                </div>
                <div className={styles.importInspectorActions}>
                  <Link className="ua-button ua-button--primary ua-button--sm" href={`/sources/imports/${selectedJob.id}`}>{displayStatus(selectedJob.status) === "Rejected" ? "Re-upload file" : displayStatus(selectedJob.status) === "Committed" ? "View committed rows" : `Review ${selectedValid == null ? "valid" : formatNumber(selectedValid)} rows`}</Link>
                  <Link className="ua-button ua-button--secondary ua-button--sm" href={`/sources/imports/${selectedJob.id}`}>Download errors</Link>
                </div>
              </aside>
            ) : null}
          </div>
        ) : (
          <section className={styles.importHistoryCard} data-state-id="imports-first-use">
            <div className={styles.empty}><strong>No import jobs yet</strong><p>Upload a CSV file to create the first immutable validation run.</p><button className="ua-button ua-button--primary ua-button--sm" type="button" onClick={() => setActive("upload")}>Upload file</button></div>
          </section>
        )
      ) : (
      <div className={styles.importGrid} id="import-workbench">
        <ol className={styles.stepRail} aria-label="Import progress">
          {STEPS.map((step, index) => {
            const complete = index < completedThrough;
            const available = index === 0 || Boolean(csv);
            return (
              <li key={step.id}>
                <button className={styles.stepButton} type="button" aria-current={active === step.id ? "step" : undefined} disabled={!available} onClick={() => setActive(step.id)}>
                  <span className={styles.stepIndex} data-state={complete ? "complete" : active === step.id ? "active" : "pending"}>{complete ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
                  <span><span className="ua-text-label block">{step.label}</span><span className="ua-text-metadata block">{step.description}</span></span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className={styles.setupMain} aria-live="polite">
          {active === "upload" ? (
            <section className={styles.setupPanel} aria-labelledby="import-upload-title">
              <h2 className={styles.setupTitle} id="import-upload-title">Choose source records</h2>
              <p className={styles.setupDescription}>Select the canonical dataset before mapping. Nothing is written during upload or validation.</p>
              {continuityNotice ? <div className={`${styles.notice} mt-4`} data-tone="warning" role="status"><span /><span>{continuityNotice}</span><span /></div> : null}
              <div className={styles.fieldGrid}>
                <label className="ua-text-label">Dataset<Select className="mt-1 w-full capitalize" value={dataset} onChange={(event) => changeDataset(event.target.value as Dataset)}>{DATASETS.map((value) => <option value={value} key={value}>{value}{value === "refunds" ? " · validation only" : ""}</option>)}</Select></label>
                <label className="ua-text-label">Import name<Input className="mt-1" value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="June order backfill" maxLength={200} /></label>
              </div>
              <label className={`${styles.dropzone} mt-5 cursor-pointer focus-within:ring-2 focus-within:ring-[var(--uo-route-border-focus)]`}>
                <span><Upload size={22} aria-hidden="true" /><span className="ua-text-working-title mt-2 block">{busy === "read" ? "Reading CSV…" : fileName ?? "Choose a CSV file"}</span><span className={styles.mutedCopy}>UTF-8 CSV. Server limits and row structure are checked again before validation.</span></span>
                <input ref={fileInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              </label>
              {!persistableDataset ? <div className={`${styles.notice} mt-4`} data-tone="warning" role="status"><span /><span>Refund CSV validation is available, but canonical refund persistence is not enabled. Commit remains unavailable.</span><span /></div> : null}
              <Disclosure className="mt-4" summary="Paste CSV text instead" summaryClassName="ua-text-label text-[var(--uo-route-text-link)]">
                <Textarea className="mt-2 h-36 font-mono text-xs" value={csv} placeholder="external_id,currency,total_minor" onChange={(event) => { const value = event.currentTarget.value; setCsv(value); setFileName(null); setFileSize(new Blob([value]).size); setMapping(automaticMapping(dataset, parseHeaders(value))); setResult(null); setCommitted(null); setContinuityNotice(null); }} />
                <Button className="mt-3" size="sm" disabled={!csv} onClick={() => setActive("map")}>Continue to mapping</Button>
              </Disclosure>
            </section>
          ) : null}

          {active === "map" ? (
            <section className={styles.setupPanel} aria-labelledby="import-map-title">
              <div className={styles.detailTopline}><div><h2 className={styles.setupTitle} id="import-map-title">Map source columns</h2><p className={styles.setupDescription}>Required canonical fields must be mapped once. Ignored columns are never persisted.</p></div><Badge tone={missingRequired.length ? "warning" : "success"} variant="subtle" dot>{mappedTargets.length} of {headers.length} mapped</Badge></div>
              <div className={styles.mappingList}>
                {headers.map((header) => (
                  <div className={styles.mappingRow} key={header}>
                    <div><span className="ua-text-label block">{header}</span><span className="ua-text-metadata block truncate">Sample: {sampleValues[header]}</span></div>
                    <ArrowRight size={14} aria-hidden="true" />
                    <Select aria-label={`Map ${header}`} value={mapping[header] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [header]: event.target.value })); setResult(null); setCommitted(null); }}>
                      <option value="">Ignore column</option>
                      {FIELDS[dataset].map((field) => <option value={field.value} key={field.value}>{field.label}{field.required ? " · required" : ""}</option>)}
                    </Select>
                    <span className="ua-text-metadata">{mapping[header] ? "Direct mapping" : "Not imported"}</span>
                  </div>
                ))}
              </div>
              {missingRequired.length ? <p className={`${styles.notice} mt-4`} data-tone="warning" role="status"><span /><span>Required mappings missing: {missingRequired.map((field) => field.label).join(", ")}.</span><span /></p> : null}
              <div className={styles.setupFooter}><Button variant="secondary" onClick={() => setActive("upload")}>Back</Button><Button disabled={missingRequired.length > 0 || !headers.length} onClick={() => { setActive("validate"); void validate(); }}>Validate rows</Button></div>
            </section>
          ) : null}

          {active === "validate" || active === "commit" ? (
            <section className={styles.setupPanel} aria-labelledby="import-review-title">
              <div className={styles.detailTopline}><div><h2 className={styles.setupTitle} id="import-review-title">{active === "commit" ? "Review and commit" : "Validate records"}</h2><p className={styles.setupDescription}>Validation writes nothing. Commit persists only valid, deduplicated rows with CSV provenance.</p></div>{result ? <StatusBadge family="workflowStatus" value={result.error_count ? "attention_required" : "ready"} /> : null}</div>
              {error ? <div className={`${styles.notice} mt-4`} data-tone="danger" role="alert"><span /><div><span>{error}</span>{failedCommit ? <p className={styles.mutedCopy}>The failed job retained its mapping and row-level outcome.</p> : null}</div>{failedCommit ? <Link className={styles.actionLink} href={`/sources/imports/${failedCommit.job_id}`}>Open failed job</Link> : <span />}</div> : null}
              {busy === "validate" ? <div className={styles.empty}>Validating rows and mapping…</div> : result ? (
                <>
                  <div className={styles.validationGrid}>
                    {[["Total rows", result.total_rows], ["Valid", result.valid_count], ["Invalid", result.error_count], ["Duplicates skipped", result.duplicates_skipped]].map(([label, value]) => <div className={styles.validationMetric} key={String(label)}><span className="ua-text-metadata">{label}</span><strong>{value}</strong></div>)}
                  </div>
                  <div className="mt-5">
                    <OutcomeBand total={result.valid_count + result.error_count + result.duplicates_skipped} segments={[
                      { label: 'Valid', value: result.valid_count, tone: 'positive' },
                      { label: 'Invalid', value: result.error_count, tone: 'negative' },
                      { label: 'Duplicate', value: result.duplicates_skipped, tone: 'neutral' },
                    ]} />
                  </div>
                  {result.errors.length ? <div className="mt-5"><CountBars id="import-error-contribution" question="Which validation errors affect the most rows?" summary="Errors are ranked from the current validation result. Correct the source or mapping, then validate again before commit." items={errorContributions} emptyTitle="No validation errors" emptyDescription="Every retained validation row passed." tone="negative" /></div> : null}
                  {result.errors.length ? (
                    <div className="mt-5 max-h-80 overflow-auto">
                      <DataTable aria-label="Import validation errors" rows={result.errors} getRowKey={(item) => `${item.row}-${item.field}-${item.code}`} density="metadata" emptyState={null} columns={[
                        { key: "row", header: "Source row", kind: "numeric", render: (item) => item.row },
                        { key: "field", header: "Field", render: (item) => item.field },
                        { key: "code", header: "Error", render: (item) => <span className="text-[var(--uo-route-critical)]">{item.message}</span> },
                      ]} />
                    </div>
                  ) : <div className={`${styles.notice} mt-5`} data-tone="success"><Check size={16} aria-hidden="true" /><span>Every row passed validation.</span><span /></div>}
                </>
              ) : <div className={styles.empty}><Button disabled={Boolean(busy)} onClick={() => void validate()}>Run validation</Button></div>}

              {committed ? (
                <div className={`${styles.notice} mt-5`} data-tone="success" role="status">
                  <Check size={16} aria-hidden="true" />
                  <div><strong className="ua-text-working-title">{committed.persisted} record{committed.persisted === 1 ? "" : "s"} committed</strong><p className={styles.mutedCopy}>{committed.error_count} invalid rows remain in the immutable job record.</p></div>
                  <Link href={`/sources/imports/${committed.job_id}`} className={styles.actionLink}>Open job</Link>
                </div>
              ) : null}
              {!persistableDataset ? <div className={`${styles.notice} mt-5`} data-tone="warning"><span /><span>This dataset can be validated and corrected, but it cannot be committed in the current runtime.</span><span /></div> : null}
              <div className={styles.setupFooter}>
                <Button variant="secondary" onClick={() => setActive("map")}>Back to mapping</Button>
                {active === "validate" ? <Button disabled={!result?.valid_count} onClick={() => setActive("commit")}>Review commit</Button> : <Button variant="commit" loading={busy === "commit"} disabled={!persistableDataset || !result?.valid_count || Boolean(busy) || Boolean(committed)} onClick={() => void commit()}>Commit {result?.valid_count ?? 0} valid rows</Button>}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      )}

      <Modal open={Boolean(pendingFile)} onClose={() => setPendingFile(null)} title="Replace the current CSV?" description="The current mapping and validation result have not been committed." overlayId="replace-import-file-confirmation" actions={[{ label: "Replace file", variant: "danger", onClick: () => { if (pendingFile) void applyFile(pendingFile); } }]}>
        <p className="ua-text-body text-[var(--uo-route-text-secondary)]">Replacing the file clears the current column map and validation output. No records have been written.</p>
      </Modal>
    </div>
  );
}
