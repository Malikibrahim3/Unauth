"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, Upload } from "lucide-react";
import { Badge, Button, DataTable, Disclosure, Input, Modal, Select, Textarea } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
const line = '1px solid #e4e3e0';
const panel: CSSProperties = { border: line, borderRadius: 12, background: '#fff' };
const styles: Record<string, CSSProperties> = {
  stack: { display: 'flex', flexDirection: 'column', gap: 16, padding: 20, background: '#ffffff', color: '#1c1f23' }, importGrid: { display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)', gap: 16 }, stepRail: { ...panel, margin: 0, padding: 10, listStyle: 'none' }, stepButton: { display: 'grid', width: '100%', gridTemplateColumns: '26px 1fr', gap: 9, alignItems: 'center', padding: '9px 8px', border: 0, borderRadius: 8, background: 'transparent', color: '#40454a', textAlign: 'left' }, stepIndex: { display: 'grid', width: 22, height: 22, placeItems: 'center', borderRadius: '50%', background: '#f4f3f1', fontSize: 10 },
  setupPanel: panel, setupMain: { padding: 18 }, setupTitle: { margin: 0, fontSize: 16 }, setupDescription: { margin: '4px 0 16px', color: '#64686d', fontSize: 12 }, setupFooter: { display: 'flex', justifyContent: 'space-between', gap: 10, padding: 14, borderTop: line }, dropzone: { display: 'grid', minHeight: 180, placeItems: 'center', padding: 24, border: '1px dashed #cfcac4', borderRadius: 10, background: '#ffffff', textAlign: 'center' }, fieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }, mappingList: { display: 'flex', flexDirection: 'column', border: line, borderRadius: 9, overflow: 'hidden' }, mappingRow: { display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 10, alignItems: 'center', padding: 10, borderTop: line }, validationGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }, validationMetric: { padding: 13, border: line, borderRadius: 9, background: '#ffffff' }, mutedCopy: { color: '#64686d', fontSize: 11.5 }, notice: { padding: 12, borderRadius: 9, background: '#fff3e9', color: '#7a5310', fontSize: 11.5 }, empty: { padding: 22, color: '#64686d', textAlign: 'center' }, actionLink: { color: '#9f4f08', textDecoration: 'none' },
  importHistoryGrid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 310px', gap: 16 }, importHistoryCard: panel, importHistoryHeading: { display: 'flex', justifyContent: 'space-between', gap: 12, padding: 15, borderBottom: line }, importHistoryHeader: { display: 'grid', gridTemplateColumns: '1.5fr .8fr .5fr 1fr .7fr .8fr', gap: 8, padding: '8px 12px', background: '#f4f3f1', color: '#64686d', fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase' }, importHistoryRows: { display: 'flex', flexDirection: 'column' }, importHistoryRow: { display: 'grid', width: '100%', gridTemplateColumns: '1.5fr .8fr .5fr 1fr .7fr .8fr', gap: 8, alignItems: 'center', padding: '10px 12px', border: 0, borderTop: line, background: '#fff', textAlign: 'left' }, importFile: { minWidth: 0 }, importType: { color: '#40454a', fontSize: 11.5 }, importRows: { fontSize: 11.5 }, importValidation: { minWidth: 0 }, importValidationTrack: { display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', background: '#e4e3e0' }, importStatus: { display: 'inline-flex', padding: '3px 6px', borderRadius: 5, background: '#f4f3f1', fontSize: 9.5, fontWeight: 600 }, importUploaded: { color: '#64686d', fontSize: 10.5 }, importHistoryFooter: { margin: 0, padding: 12, borderTop: line, color: '#64686d', fontSize: 10.5 },
  importJobInspector: { ...panel, alignSelf: 'start', padding: 15 }, importInspectorHeader: { display: 'flex', justifyContent: 'space-between', gap: 10 }, importInspectorFigures: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 12 }, importInspectorIssues: { marginTop: 12, paddingTop: 12, borderTop: line }, importClean: { display: 'flex', gap: 8, color: '#1a6b43', fontSize: 11.5 }, importUnavailable: { color: '#6f6a63', fontSize: 11.5 }, importInspectorActions: { display: 'flex', gap: 8, marginTop: 13 }, detailTopline: { display: 'flex', justifyContent: 'space-between', gap: 10 },
};
import { CountBars, OutcomeBand } from '@/components/charts/authenticated/SecondaryAnalytics';
import { buildImportErrorContributions } from '@/lib/visualisation/secondaryAnalytics';
import { formatDate, formatNumber } from '@/lib/utils/format';
import type { HoldRatePoint } from '@/lib/capabilities/derived';
import { replaceHistoryUrlIfChanged } from '@/lib/navigation/history';

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

export function CanonicalCsvImportClient({ history = [], initialStep, holdRateTimeseries = [] }: { history?: ImportHistoryItem[]; initialStep?: string; holdRateTimeseries?: HoldRatePoint[] }) {
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
  const csvValueRef = useRef("");
  const headers = useMemo(() => parseHeaders(csv), [csv]);
  const sampleValues = useMemo(() => samples(csv), [csv]);
  const mappedTargets = Object.values(mapping).filter(Boolean);
  const missingRequired = FIELDS[dataset].filter((field) => field.required && !mappedTargets.includes(field.value));
  const persistableDataset = dataset !== "refunds";
  const dirtyMapping = Boolean(csv && (mappedTargets.length || result));

  useEffect(() => {
    csvValueRef.current = csv;
  }, [csv]);

  // The history/upload/map steps are URL-backed. Next's client navigation can
  // update `initialStep` without remounting this client component, so mirror a
  // changed query-state prop instead of leaving the previous history view on
  // screen until a hard refresh.
  useEffect(() => {
    if (!validStep(initialStep)) {
      setActive("history");
      setContinuityNotice(null);
      return;
    }

    setActive(initialStep);
    setContinuityNotice(
      initialStep !== "upload" && !csvValueRef.current
        ? "Choose the CSV again to continue. Files and mappings are not restored from URL state."
        : null,
    );
  }, [initialStep]);

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
    replaceHistoryUrlIfChanged(`${url.pathname}?${url.searchParams.toString()}${url.hash}`);
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
    <div style={styles.stack} data-source-import data-operations-surface="imports" data-state-id={active === "history" ? "import-history" : committed ? "import-committed" : error ? "import-error" : busy ? `import-${busy}` : csv ? `import-${active}` : "import-validation-empty-states"}>
      {active === "history" ? (
        history.length ? (
          <>
          <div style={styles.importHistoryGrid}>
            <section style={styles.importHistoryCard} aria-labelledby="import-history-title">
              <div style={styles.importHistoryHeading}>
                <div><h2 id="import-history-title">Import jobs</h2><p>Rows are validated before anything is committed to the ledger</p></div>
                <a className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-white text-[#40454a] border-[#d8d4cf] h-8 px-3 text-[12px]" download="unauth-import-template.csv" href="data:text/csv;charset=utf-8,external_id%2Ccurrency%2Ctotal_minor">Download template</a>
              </div>
              <div style={styles.importHistoryHeader} aria-hidden="true">
                <span>File</span><span>Type</span><span>Rows</span><span>Validation</span><span>Status</span><span>Uploaded</span>
              </div>
              <div style={styles.importHistoryRows} role="listbox" aria-label="Import jobs">
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
                      style={styles.importHistoryRow}
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                    >
                      <span className="import-file-cell" style={styles.importFile}><strong title={cursor.file_name ?? job.label ?? "CSV import"}>{cursor.file_name ?? job.label ?? "CSV import"}</strong><small>Immutable import job</small></span>
                      <span style={styles.importType}>{cursor.dataset ?? "— Unavailable"}</span>
                      <span style={styles.importRows}>{formatNumber(total)}</span>
                      <span style={styles.importValidation}>
                        <span style={styles.importValidationTrack} data-unavailable={!knownSegments || undefined}>
                          {knownSegments ? <><i data-tone="ok" style={{ width: `${validShare}%` }} /><i data-tone="warn" style={{ width: `${warningShare}%` }} /><i data-tone="red" style={{ width: `${errorShare}%` }} /></> : null}
                        </span>
                        <small>{errors == null ? "— err" : `${errors} err`} · {warnings == null ? "— warn" : `${warnings} warn`}</small>
                      </span>
                      <span><span style={styles.importStatus} data-tone={statusTone(job.status)}>{displayStatus(job.status)}</span></span>
                      <span style={styles.importUploaded}>{formatWhen(job.created_at)}</span>
                    </button>
                  );
                })}
              </div>
              <p style={styles.importHistoryFooter}>Nothing is committed until you approve it. Rejected rows remain in their immutable import job so they can be corrected and re-uploaded.</p>
            </section>

            {selectedJob ? (
              <aside style={styles.importJobInspector} aria-label="Selected import job">
                <div style={styles.importInspectorHeader}>
                  <div><h2 title={selectedCursor.file_name ?? selectedJob.label ?? "CSV import"}>{selectedCursor.file_name ?? selectedJob.label ?? "CSV import"}</h2><p>{selectedTotal == null ? "— rows" : `${formatNumber(selectedTotal)} rows`} · {selectedCursor.dataset ?? "type unavailable"} · uploaded {formatWhen(selectedJob.created_at).toLowerCase()}</p></div>
                  <span style={styles.importStatus} data-tone={statusTone(selectedJob.status)}>{displayStatus(selectedJob.status)}</span>
                </div>
                <div className="import-inspector-figures" style={styles.importInspectorFigures}>
                  <div><span>Valid</span><strong data-tone="ok">{formatNumber(selectedValid)}</strong></div>
                  <div><span>Warnings</span><strong data-tone="warn">{formatNumber(selectedWarnings)}</strong></div>
                  <div><span>Errors</span><strong data-tone="red">{formatNumber(selectedErrors)}</strong></div>
                </div>
                <div className="import-inspector-issues" style={styles.importInspectorIssues}>
                  <h3>Row errors</h3>
                  {selectedIssues.length ? (
                    <ul>{selectedIssues.slice(0, 4).map((issue, index) => <li key={`${issue.row ?? index}-${issue.code ?? index}`}><i /><span><strong>{issue.message ?? issue.code ?? "Validation error"}</strong><small>{issue.row == null ? "Affected rows recorded in the job" : `row ${issue.row}${issue.field ? ` · ${issue.field}` : ""}`}</small></span><b>1</b></li>)}</ul>
                  ) : selectedErrors === 0 ? (
                    <div style={styles.importClean}><i /><span>Every row passed validation. This is a verified clean file.</span></div>
                  ) : (
                    <div style={styles.importUnavailable}>— Row-level errors unavailable</div>
                  )}
                </div>
                <div style={styles.importInspectorActions}>
                  <Link className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-[#1c1f23] text-white border-[#1c1f23] h-8 px-3 text-[12px]" href={`/sources/imports/${selectedJob.id}`}>{displayStatus(selectedJob.status) === "Rejected" ? "Re-upload file" : displayStatus(selectedJob.status) === "Committed" ? "View committed rows" : `Review ${selectedValid == null ? "valid" : formatNumber(selectedValid)} rows`}</Link>
                  <Link className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-white text-[#40454a] border-[#d8d4cf] h-8 px-3 text-[12px]" href={`/sources/imports/${selectedJob.id}`}>Download errors</Link>
                </div>
              </aside>
            ) : null}
          </div>
          <section style={styles.importHistoryCard} aria-labelledby="import-hold-rate-title">
            <div style={styles.importHistoryHeading}>
              <div><h2 id="import-hold-rate-title">Held-row rate</h2><p>Nine weekly points from retained import jobs. A missing denominator stays unavailable.</p></div>
              <span className="text-[10.5px] leading-4 text-[#6f6a63]">Source-backed · no rows written by this view</span>
            </div>
            <div role="img" aria-label="Nine-week import held-row rate">
              {holdRateTimeseries.map((point) => <div key={point.weekStart}><i data-state={point.state === 'available' ? 'stalled' : 'none'} title={`${point.weekStart}: ${point.percentage == null ? 'held-row rate unavailable' : `${point.percentage}% held`}`} /><span>{point.weekStart.slice(5)}</span></div>)}
            </div>
            <table className="sr-only"><caption>Nine-week import held-row rate</caption><thead><tr><th>Week starting</th><th>Held rows</th><th>Total rows</th><th>Rate</th></tr></thead><tbody>{holdRateTimeseries.map((point) => <tr key={`hold-rate-${point.weekStart}`}><td>{point.weekStart}</td><td>{point.heldRows == null ? 'Unavailable' : point.heldRows}</td><td>{point.totalRows == null ? 'Unavailable' : point.totalRows}</td><td>{point.percentage == null ? 'Unavailable' : `${point.percentage}%`}</td></tr>)}</tbody></table>
            <p className="text-[10.5px] leading-4 text-[#6f6a63] mt-3">Held rows use the import job’s recorded failed-row count; they remain outside committed source records until corrected and re-uploaded.</p>
          </section>
          <style>{`
            [data-operations-surface="imports"] .import-file-cell{display:flex;min-width:0;flex-direction:column;gap:2px}
            [data-operations-surface="imports"] .import-file-cell strong{overflow:hidden;text-overflow:ellipsis;font-size:11px;white-space:nowrap}
            [data-operations-surface="imports"] .import-file-cell small{color:#6f6a63;font-size:9.5px}
            [data-operations-surface="imports"] .import-inspector-figures{grid-template-columns:repeat(3,minmax(0,1fr))!important}
            [data-operations-surface="imports"] .import-inspector-figures span,[data-operations-surface="imports"] .import-inspector-figures strong{display:block;text-align:center}
            [data-operations-surface="imports"] .import-inspector-figures span{color:#6f6a63;font-size:9.5px}
            [data-operations-surface="imports"] .import-inspector-figures strong{margin-top:4px;font:400 15px/1 'IBM Plex Mono',monospace}
            [data-operations-surface="imports"] .import-inspector-issues h3{margin:0 0 8px;font-size:11.5px}
            [data-operations-surface="imports"] .import-inspector-issues ul{margin:0;padding:0;list-style:none}
            [data-operations-surface="imports"] .import-inspector-issues li{display:grid;grid-template-columns:7px 1fr auto;gap:7px;align-items:start;padding:7px 0;border-top:1px solid #eae8e5}
            [data-operations-surface="imports"] .import-inspector-issues li i{width:6px;height:6px;margin-top:5px;border-radius:50%;background:#b0431a}
            [data-operations-surface="imports"] .import-inspector-issues li strong,[data-operations-surface="imports"] .import-inspector-issues li small{display:block}
            [data-operations-surface="imports"] .import-inspector-issues li strong{font-size:10.5px}.import-inspector-issues li small{color:#6f6a63;font-size:9.5px}
          `}</style>
          </>
        ) : (
          <section style={styles.importHistoryCard} data-state-id="imports-first-use">
            <div style={styles.empty}><strong>No import jobs yet</strong><p>Upload a CSV file to create the first immutable validation run.</p><button className="inline-flex items-center justify-center gap-2 rounded-lg border font-medium no-underline bg-[#1c1f23] text-white border-[#1c1f23] h-8 px-3 text-[12px]" type="button" onClick={() => setActive("upload")}>Upload file</button></div>
          </section>
        )
      ) : (
      <div style={styles.importGrid} id="import-workbench">
        <ol style={styles.stepRail} aria-label="Import progress">
          {STEPS.map((step, index) => {
            const complete = index < completedThrough;
            const available = index === 0 || Boolean(csv);
            return (
              <li key={step.id}>
                <button style={styles.stepButton} type="button" aria-current={active === step.id ? "step" : undefined} disabled={!available} onClick={() => setActive(step.id)}>
                  <span style={styles.stepIndex} data-state={complete ? "complete" : active === step.id ? "active" : "pending"}>{complete ? <Check size={13} aria-hidden="true" /> : index + 1}</span>
                  <span><span className="text-[11px] font-medium leading-4 text-[#64686d] block">{step.label}</span><span className="text-[10.5px] leading-4 text-[#6f6a63] block">{step.description}</span></span>
                </button>
              </li>
            );
          })}
        </ol>

        <div style={styles.setupMain} aria-live="polite">
          {active === "upload" ? (
            <section style={styles.setupPanel} aria-labelledby="import-upload-title">
              <h2 style={styles.setupTitle} id="import-upload-title">Choose source records</h2>
              <p style={styles.setupDescription}>Select the canonical dataset before mapping. Nothing is written during upload or validation.</p>
              {continuityNotice ? <div style={{ ...styles.notice, marginTop: 16 }} data-tone="warning" role="status"><span /><span>{continuityNotice}</span><span /></div> : null}
              <div style={styles.fieldGrid}>
                <label className="text-[11px] font-medium leading-4 text-[#64686d]">Dataset<Select className="mt-1 w-full capitalize" value={dataset} onChange={(event) => changeDataset(event.target.value as Dataset)}>{DATASETS.map((value) => <option value={value} key={value}>{value}{value === "refunds" ? " · validation only" : ""}</option>)}</Select></label>
                <label className="text-[11px] font-medium leading-4 text-[#64686d]">Import name<Input className="mt-1" value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="June order backfill" maxLength={200} /></label>
              </div>
              <label style={{ ...styles.dropzone, marginTop: 20, cursor: 'pointer' }}>
                <span><Upload size={22} aria-hidden="true" /><strong style={{ display: 'block', marginTop: 8 }}>{busy === "read" ? "Reading CSV…" : fileName ?? "Choose a CSV file"}</strong><span style={{ ...styles.mutedCopy, display: 'block' }}>UTF-8 CSV. Server limits and row structure are checked again before validation.</span></span>
                <input ref={fileInput} className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
              </label>
              {!persistableDataset ? <div style={{ ...styles.notice, marginTop: 16 }} data-tone="warning" role="status"><span /><span>Refund CSV validation is available, but canonical refund persistence is not enabled. Commit remains unavailable.</span><span /></div> : null}
              <Disclosure className="mt-4" summary="Paste CSV text instead" summaryClassName="text-[11px] font-medium leading-4 text-[#64686d] text-[#9f4f08]">
                <Textarea className="mt-2 h-36 font-mono text-xs" value={csv} placeholder="external_id,currency,total_minor" onChange={(event) => { const value = event.currentTarget.value; setCsv(value); setFileName(null); setFileSize(new Blob([value]).size); setMapping(automaticMapping(dataset, parseHeaders(value))); setResult(null); setCommitted(null); setContinuityNotice(null); }} />
                <Button className="mt-3" size="sm" disabled={!csv} onClick={() => setActive("map")}>Continue to mapping</Button>
              </Disclosure>
            </section>
          ) : null}

          {active === "map" ? (
            <section style={styles.setupPanel} aria-labelledby="import-map-title">
              <div style={styles.detailTopline}><div><h2 style={styles.setupTitle} id="import-map-title">Map source columns</h2><p style={styles.setupDescription}>Required canonical fields must be mapped once. Ignored columns are never persisted.</p></div><Badge tone={missingRequired.length ? "warning" : "success"} variant="subtle" dot>{mappedTargets.length} of {headers.length} mapped</Badge></div>
              <div style={styles.mappingList}>
                {headers.map((header) => (
                  <div style={styles.mappingRow} key={header}>
                    <div><span className="text-[11px] font-medium leading-4 text-[#64686d] block">{header}</span><span className="text-[10.5px] leading-4 text-[#6f6a63] block truncate">Sample: {sampleValues[header]}</span></div>
                    <ArrowRight size={14} aria-hidden="true" />
                    <Select aria-label={`Map ${header}`} value={mapping[header] ?? ""} onChange={(event) => { setMapping((current) => ({ ...current, [header]: event.target.value })); setResult(null); setCommitted(null); }}>
                      <option value="">Ignore column</option>
                      {FIELDS[dataset].map((field) => <option value={field.value} key={field.value}>{field.label}{field.required ? " · required" : ""}</option>)}
                    </Select>
                    <span className="text-[10.5px] leading-4 text-[#6f6a63]">{mapping[header] ? "Direct mapping" : "Not imported"}</span>
                  </div>
                ))}
              </div>
              {missingRequired.length ? <p style={{ ...styles.notice, marginTop: 16 }} data-tone="warning" role="status"><span /><span>Required mappings missing: {missingRequired.map((field) => field.label).join(", ")}.</span><span /></p> : null}
              <div style={styles.setupFooter}><Button variant="secondary" onClick={() => setActive("upload")}>Back</Button><Button disabled={missingRequired.length > 0 || !headers.length} onClick={() => { setActive("validate"); void validate(); }}>Validate rows</Button></div>
            </section>
          ) : null}

          {active === "validate" || active === "commit" ? (
            <section style={styles.setupPanel} aria-labelledby="import-review-title">
              <div style={styles.detailTopline}><div><h2 style={styles.setupTitle} id="import-review-title">{active === "commit" ? "Review and commit" : "Validate records"}</h2><p style={styles.setupDescription}>Validation writes nothing. Commit persists only valid, deduplicated rows with CSV provenance.</p></div>{result ? <StatusBadge family="workflowStatus" value={result.error_count ? "attention_required" : "ready"} /> : null}</div>
              {error ? <div style={{ ...styles.notice, marginTop: 16, background: '#fdf0e6', color: '#b0431a' }} data-tone="danger" role="alert"><span /><div><span>{error}</span>{failedCommit ? <p style={styles.mutedCopy}>The failed job retained its mapping and row-level outcome.</p> : null}</div>{failedCommit ? <Link style={styles.actionLink} href={`/sources/imports/${failedCommit.job_id}`}>Open failed job</Link> : <span />}</div> : null}
              {busy === "validate" ? <div style={styles.empty}>Validating rows and mapping…</div> : result ? (
                <>
                  <div style={styles.validationGrid}>
                    {[["Total rows", result.total_rows], ["Valid", result.valid_count], ["Invalid", result.error_count], ["Duplicates skipped", result.duplicates_skipped]].map(([label, value]) => <div style={styles.validationMetric} key={String(label)}><span className="text-[10.5px] leading-4 text-[#6f6a63]">{label}</span><strong>{value}</strong></div>)}
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
                        { key: "code", header: "Error", render: (item) => <span className="text-[#b0431a]">{item.message}</span> },
                      ]} />
                    </div>
                  ) : <div style={{ ...styles.notice, marginTop: 20, background: '#eaf5ef', color: '#1a6b43' }} data-tone="success"><Check size={16} aria-hidden="true" /><span>Every row passed validation.</span><span /></div>}
                </>
              ) : <div style={styles.empty}><Button disabled={Boolean(busy)} onClick={() => void validate()}>Run validation</Button></div>}

              {committed ? (
                <div style={{ ...styles.notice, marginTop: 20, background: '#eaf5ef', color: '#1a6b43' }} data-tone="success" role="status">
                  <Check size={16} aria-hidden="true" />
                  <div><strong>{committed.persisted} record{committed.persisted === 1 ? "" : "s"} committed</strong><p style={styles.mutedCopy}>{committed.error_count} invalid rows remain in the immutable job record.</p></div>
                  <Link href={`/sources/imports/${committed.job_id}`} style={styles.actionLink}>Open job</Link>
                </div>
              ) : null}
              {!persistableDataset ? <div style={{ ...styles.notice, marginTop: 20 }} data-tone="warning"><span /><span>This dataset can be validated and corrected, but it cannot be committed in the current runtime.</span><span /></div> : null}
              <div style={styles.setupFooter}>
                <Button variant="secondary" onClick={() => setActive("map")}>Back to mapping</Button>
                {active === "validate" ? <Button disabled={!result?.valid_count} onClick={() => setActive("commit")}>Review commit</Button> : <Button variant="commit" loading={busy === "commit"} disabled={!persistableDataset || !result?.valid_count || Boolean(busy) || Boolean(committed)} onClick={() => void commit()}>Commit {result?.valid_count ?? 0} valid rows</Button>}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      )}

      <Modal open={Boolean(pendingFile)} onClose={() => setPendingFile(null)} title="Replace the current CSV?" description="The current mapping and validation result have not been committed." overlayId="replace-import-file-confirmation" actions={[{ label: "Replace file", variant: "danger", onClick: () => { if (pendingFile) void applyFile(pendingFile); } }]}>
        <p className="text-[13px] leading-5 text-[#40454a] text-[#64686d]">Replacing the file clears the current column map and validation output. No records have been written.</p>
      </Modal>
    </div>
  );
}
