import Link from 'next/link';
import { Download } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { PageFrame } from '@/components/ui/PageFrame';
import { formatDateTime, formatNumber } from '@/lib/utils/format';
import { hashId } from '@/lib/ui/displayRef';
import styles from '@/components/sources/SourcesSurface.module.css';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };
type RowError = { row: number; field: string; code: string; message: string; value: string | null };

export type ImportJobRecord = {
  id: string;
  job_kind: string;
  source: string | null;
  status: string;
  label: string | null;
  storage_path: string | null;
  file_hash: string | null;
  column_map: Json | null;
  total_rows: number | null;
  processed_rows: number;
  failed_rows: number;
  error_log: Json;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_error_code: string | null;
  cursor: Json | null;
};

function record(value: Json | null): Record<string, Json | undefined> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function rowErrors(value: Json): RowError[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const row = item as Record<string, Json | undefined>;
    if (typeof row.row !== 'number' || typeof row.field !== 'string' || typeof row.code !== 'string' || typeof row.message !== 'string') return [];
    const rawValue = row.value ?? row.value_seen ?? row.raw_value;
    return [{ row: row.row, field: row.field, code: row.code, message: row.message, value: rawValue == null ? null : String(rawValue) }];
  });
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function fileSize(value: Json | undefined) {
  if (typeof value !== 'number') return '— Not retained';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function duration(start: string | null, end: string | null) {
  if (!start || !end) return '— Not completed';
  const seconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function tone(status: string) {
  if (status === 'completed') return 'positive';
  if (status === 'failed') return 'critical';
  if (status === 'partial' || status === 'cancelled') return 'warning';
  return 'accent';
}

export function ImportJobDetail({ job }: { job: ImportJobRecord }) {
  const metadata = record(job.cursor);
  const mapping = record(job.column_map);
  const errors = rowErrors(job.error_log);
  const duplicateRows = typeof metadata.duplicates_skipped === 'number' ? metadata.duplicates_skipped : null;
  const validated = job.total_rows != null && Array.isArray(job.error_log);
  const validRows = typeof metadata.validation_valid_rows === 'number'
    ? metadata.validation_valid_rows
    : job.status === 'completed'
      ? job.processed_rows
      : null;
  const totalRows = job.total_rows;
  const committed = job.status === 'completed' ? job.processed_rows : job.processed_rows || null;
  const fileName = typeof metadata.file_name === 'string' && metadata.file_name ? metadata.file_name : job.label ?? 'CSV import';
  const dataset = humanize(typeof metadata.dataset === 'string' ? metadata.dataset : 'Dataset unavailable');
  const operatorRef = typeof metadata.imported_by === 'string' ? metadata.imported_by : '— Not retained';
  const jobRef = `IMP-${hashId(job.id).slice(1)}`;
  const mappedCount = Object.keys(mapping).length;
  const committedRate = totalRows && committed != null ? (committed / totalRows) * 100 : null;
  const outcomeTotal = Math.max(1, totalRows ?? ((committed ?? 0) + job.failed_rows + (duplicateRows ?? 0)));
  const mappingDownload = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(mapping, null, 2))}`;
  const inFlight = ['queued', 'pending', 'running', 'processing'].includes(job.status);
  const commitDetail = job.status === 'completed'
    ? `${formatNumber(committed)} records written${job.completed_at ? ` ${formatDateTime(job.completed_at)}` : ''}`
    : job.status === 'partial'
      ? `${formatNumber(committed)} ${committed === 1 ? 'record' : 'records'} written · outcome incomplete${job.completed_at ? ` ${formatDateTime(job.completed_at)}` : ''}`
      : inFlight
        ? job.status === 'queued' || job.status === 'pending' ? 'Waiting to commit' : 'Commit in progress'
        : job.status === 'failed' && committed == null
          ? 'Failed · no records written'
          : `${humanize(job.status)} · ${committed == null ? 'no committed count retained' : `${formatNumber(committed)} records written`}`;
  const stages = [
    { label: 'Uploaded', detail: `${fileName} · ${fileSize(metadata.file_size)} · ${job.file_hash ? `SHA-256 ${job.file_hash.slice(0, 4)}…${job.file_hash.slice(-4)}` : 'SHA-256 not retained'}`, stageTone: 'positive' },
    { label: 'Parsed', detail: totalRows == null ? (inFlight ? 'Waiting to parse source rows' : 'Row count was not retained') : `${formatNumber(totalRows)} data rows · column count and encoding not retained`, stageTone: totalRows == null ? (inFlight ? 'accent' : 'muted') : 'positive' },
    { label: 'Mapped', detail: mappedCount ? `${mappedCount} source columns mapped from the retained snapshot` : inFlight ? 'Waiting for a retained mapping snapshot' : 'Mapping snapshot was not retained for this job', stageTone: mappedCount ? 'positive' : inFlight ? 'accent' : 'muted' },
    { label: 'Validated', detail: validated ? `${validRows == null ? 'Valid count unavailable' : `${formatNumber(validRows)} valid`} · ${formatNumber(job.failed_rows)} invalid · ${duplicateRows == null ? 'duplicate count unavailable' : `${formatNumber(duplicateRows)} duplicates`}` : inFlight ? 'Waiting for validation' : 'Validation outcome was not retained', stageTone: validated ? 'positive' : inFlight ? 'accent' : 'muted' },
    { label: job.status === 'completed' ? 'Committed' : humanize(job.status), detail: commitDetail, stageTone: tone(job.status) },
  ];

  return (
    <PageFrame
      surfaceId="import-job-route"
      archetype="P7-P8-import-job"
      title={`Import job ${jobRef}`}
      subtitle="An immutable record of one CSV import: what was uploaded, how it was mapped, which rows were rejected or skipped, and what was actually committed."
      breadcrumbs={[{ label: 'Sources', href: '/sources/connected' }, { label: 'Imports', href: '/sources/imports' }, { label: jobRef }]}
      actions={<><ButtonLink href={`/api/imports/${job.id}/errors`} variant="secondary" size="sm" leadingIcon={<Download size={14} aria-hidden="true" />}>Download error rows</ButtonLink><ButtonLink href="/sources/imports?step=upload" size="sm">Start a new import</ButtonLink></>}
    >
      <div className={styles.importJobDetail} data-operations-surface="import-job-detail" data-state-id={`import-job-${job.status}`}>
        <section className={styles.importJobHero}>
          <div className={styles.importJobHeroTop}>
            <div className={styles.importJobIdentity}>
              <div><code>{jobRef}</code><span data-tone={tone(job.status)}>{humanize(job.status === 'completed' ? 'committed' : job.status)}</span><span>{dataset}</span></div>
              <h2>{fileName}</h2>
              <p>Uploaded by operator {operatorRef} · {formatDateTime(job.created_at)} · attempt {job.attempts} of {job.max_attempts}{job.completed_at ? ` · committed ${formatDateTime(job.completed_at)}` : ''}</p>
            </div>
            <div className={styles.importJobHeroFacts}>
              <JobFact label="Rows in file" value={totalRows == null ? '—' : formatNumber(totalRows)} detail={totalRows == null ? 'not retained' : ''} />
              <JobFact label="Committed" value={committed == null ? '—' : formatNumber(committed)} detail={committedRate == null ? 'not retained' : `${committedRate.toFixed(1)}%`} />
              <JobFact label="Invalid" value={validated ? formatNumber(job.failed_rows) : '—'} detail="not committed" />
              <JobFact label="Duplicates" value={duplicateRows == null ? '—' : formatNumber(duplicateRows)} detail={duplicateRows == null ? 'not retained' : 'skipped'} />
            </div>
          </div>
          <div className={styles.importJobOutcome} aria-label="Import outcome">
            <span data-tone="positive" style={{ flexGrow: Math.max(0, committed ?? 0) }} title={`${committed ?? 'Unavailable'} committed`} />
            <span data-tone="warning" style={{ flexGrow: Math.max(0, duplicateRows ?? 0) }} title={`${duplicateRows ?? 'Unavailable'} duplicates skipped`} />
            <span data-tone="critical" style={{ flexGrow: Math.max(0, job.failed_rows) }} title={`${validated ? job.failed_rows : 'Unavailable'} invalid`} />
            {!committed && !duplicateRows && !job.failed_rows ? <span data-tone="muted" style={{ flexGrow: outcomeTotal }} title="Outcome unavailable" /> : null}
          </div>
          <div className={styles.importJobLegend}>
            <Legend tone="positive" label={committed == null ? 'Committed count unavailable' : `${formatNumber(committed)} committed`} />
            <Legend tone="warning" label={duplicateRows == null ? 'Duplicate count unavailable' : `${formatNumber(duplicateRows)} duplicates skipped`} />
            <Legend tone="critical" label={validated ? `${formatNumber(job.failed_rows)} invalid, never committed` : 'Invalid count unavailable'} />
          </div>
        </section>

        <div className={styles.importJobTwoUp}>
          <section className={styles.importJobCard}>
            <CardHeading title="What happened, in order" copy="Recorded once. This job cannot be edited or re-run in place." />
            <ol className={styles.importJobStages}>
              {stages.map((stage, index) => <li key={stage.label}><span data-tone={stage.stageTone}>{index + 1}</span><div><strong>{stage.label}</strong><small>{stage.detail}</small></div></li>)}
            </ol>
          </section>
          <section className={styles.importJobCard}>
            <CardHeading title="File and attempt record" copy="Kept so a figure can be traced back to the exact file that produced it." />
            <dl className={styles.importJobFileFacts}>
              <FileFact label="File name" value={fileName} />
              <FileFact label="Size" value={fileSize(metadata.file_size)} />
              <FileFact label="SHA-256" value={job.file_hash ? `${job.file_hash.slice(0, 4)}…${job.file_hash.slice(-4)}` : '— Not retained'} mono />
              <FileFact label="Attempt" value={`${job.attempts} of ${job.max_attempts}${job.attempts > 1 ? ' · earlier attempt did not commit' : ''}`} />
              <FileFact label="Uploaded" value={formatDateTime(job.created_at)} />
              <FileFact label="Committed" value={job.completed_at ? formatDateTime(job.completed_at) : '— Not completed'} />
              <FileFact label="Duration" value={duration(job.started_at ?? job.created_at, job.completed_at)} />
              <FileFact label="Committed by" value={operatorRef} />
            </dl>
            <p className={styles.importJobFootnote}>Every attempt remains in history. A failed validation or commit is never presented as a successful write.</p>
          </section>
        </div>

        <section className={styles.importJobCard}>
          <CardHeading title="Retained mapping snapshot" copy="The mapping as it was at commit time. Later mapping changes do not alter these records." />
          <div className={styles.importMappingTable} role="table" aria-label="Retained mapping snapshot">
            <div role="row" className={styles.importMappingHeader}><span>CSV column</span><span>Unauth field</span><span>Transform</span><span>Required</span><span>Rows filled</span></div>
            {Object.entries(mapping).map(([source, target]) => <div role="row" className={styles.importMappingRow} key={source}><span title={source}>{source}</span><span title={String(target)}>{String(target)}</span><span>Direct mapping</span><span><em>— Not retained</em></span><span>— Not retained</span></div>)}
            {!mappedCount ? <p className={styles.importJobUnavailable} data-state-id="import-job-mapping-unavailable">This job did not retain its source-to-canonical mapping snapshot.</p> : null}
          </div>
          <p className={styles.importJobFootnote}>Currency, timezone, transforms, required state and per-column fill counts are only shown when the immutable job record retained them. Missing metadata is not inferred.</p>
        </section>

        <section className={styles.importJobCard}>
          <CardHeading title="Rows that were not committed" copy={`${validated ? formatNumber(job.failed_rows) : 'An unavailable number of'} invalid and ${duplicateRows == null ? 'an unavailable number of' : formatNumber(duplicateRows)} duplicate rows. Nothing was guessed or partially written.`} />
          <div className={styles.importErrorsTable} role="table" aria-label="Rows that were not committed">
            <div role="row" className={styles.importErrorsHeader}><span>Row</span><span>Reason</span><span>Column</span><span>Value seen</span><span>Outcome</span></div>
            {errors.slice(0, 6).map((error) => <div role="row" className={styles.importErrorsRow} key={`${error.row}-${error.field}-${error.code}`}><span>{error.row}</span><span title={error.message}>{error.message}</span><span>{error.field}</span><span>{error.value ?? '— Not retained'}</span><span><em data-tone="critical">Rejected</em></span></div>)}
            {!errors.length ? <p className={styles.importJobUnavailable} data-state-id="import-job-no-row-errors">No row-level rejection records were retained for this job.</p> : null}
          </div>
          <p className={styles.importJobFootnote}>{errors.length ? `Showing ${Math.min(6, errors.length)} of ${errors.length} retained row errors.` : 'The absence of retained row errors is not presented as proof that every row was valid.'} Download the error file for the complete retained set with original line numbers.</p>
          <div className={styles.importJobDownloads}>
            <ButtonLink href={`/api/imports/${job.id}/errors`} variant="secondary" size="sm">Download {errors.length ? formatNumber(errors.length) : ''} rejected rows</ButtonLink>
            <a className="ua-button ua-button--secondary ua-button--sm" href={mappingDownload} download={`${jobRef.toLowerCase()}-mapping.json`}>Download mapping snapshot</a>
          </div>
        </section>

        <section className={styles.importJobCard}>
          <CardHeading title="Fixing this safely" />
          <div className={styles.importFixGrid}>
            <div><strong>Correct and re-import</strong><p>Fix rejected rows in a new file and import that file. Existing committed records remain untouched.</p></div>
            <div><strong>Duplicates need nothing</strong><p>Skipped duplicate rows already exist. Re-importing the same records creates nothing new.</p></div>
            <div data-tone="critical"><strong>This job cannot be undone</strong><p>Committed rows are canonical. Removing one requires an explicit correction that appends a record.</p></div>
          </div>
          <div className={styles.importFixActions}><ButtonLink href="/sources/imports?step=upload" size="sm">Start a new import</ButtonLink><Link className="ua-button ua-button--secondary ua-button--sm" href="/sources/imports">Open imports registry</Link></div>
        </section>
      </div>
    </PageFrame>
  );
}

function JobFact({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return <span><i data-tone={tone} aria-hidden="true" />{label}</span>;
}

function CardHeading({ title, copy }: { title: string; copy?: string }) {
  return <div className={styles.importJobCardHeading}><h2>{title}</h2>{copy ? <p>{copy}</p> : null}</div>;
}

function FileFact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <><dt>{label}</dt><dd className={mono ? styles.importJobMono : undefined}>{value}</dd></>;
}
