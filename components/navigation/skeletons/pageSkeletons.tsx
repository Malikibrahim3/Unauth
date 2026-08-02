import {
  Bone,
  MetricCardGridSkeleton,
  SectionCardSkeleton,
  TableSkeleton,
} from "./primitives";
import { WorkbenchPageSkeleton } from "./WorkbenchPageSkeleton";
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
import { DataTableServer, PageFrame, RegistrySurface, Surface } from '@/components/ui';

/**
 * Authenticated root transition fallback. The destination family is not known
 * at this boundary, so it reserves only the shared page-header rhythm and
 * never guesses at KPIs, a chart, a table, or a detail rail.
 */
export function AuthenticatedRouteLoadingSkeleton() {
  return (
    <div
      className={styles.pageBody}
      aria-busy="true"
      aria-label="Loading workspace"
      data-skeleton-variant="route-shell"
    >
      <div className="space-y-2 py-4" aria-hidden="true">
        <Bone className="h-5 w-40" />
        <Bone className="h-3 w-full max-w-md" />
      </div>
      <span className="sr-only" role="status">Loading workspace</span>
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div
      role="status"
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <header className="flex min-h-11 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Bone className="h-7 w-32" />
          <Bone className="h-3.5 w-[34rem] max-w-full" />
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Bone className="h-8 w-28 rounded-md" />
        <Bone className="h-8 w-32 rounded-md" />
        <Bone className="h-8 w-20 rounded-md" />
        <Bone className="h-8 w-20 rounded-md" />
      </div>

      <section className="overflow-hidden border-y border-[var(--ua-border-default)] bg-transparent">
        <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--ua-border-subtle)] px-4">
          <div className="space-y-1.5">
            <Bone className="h-4 w-32" />
            <Bone className="h-3 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((item) => <Bone key={item} className="h-8 w-20 rounded-md" />)}
          </div>
        </div>
        <div className="grid min-h-[270px] min-[981px]:grid-cols-[minmax(250px,0.72fr)_minmax(400px,1.4fr)] min-[1101px]:grid-cols-[minmax(290px,0.78fr)_minmax(440px,1.6fr)]">
          <div className="space-y-3 bg-[var(--ua-surface-secondary)] px-5 py-4">
            <div className="space-y-2">
              <Bone className="h-3 w-28" />
              <Bone className="h-11 w-52 max-w-full" />
              <Bone className="h-3.5 w-44" />
              <Bone className="h-3 w-36" />
            </div>
            <div className="flex gap-2 border-y border-[var(--ua-border-subtle)] py-2">
              {[0, 1, 2].map((item) => <Bone key={item} className="h-5 w-20" />)}
            </div>
            <div className="flex gap-3">
              {[0, 1, 2].map((item) => <Bone key={item} className="h-7 w-20" />)}
            </div>
            <div className="flex gap-2">
              <Bone className="h-8 w-24 rounded-md" />
              <Bone className="h-8 w-20 rounded-md" />
            </div>
          </div>
          <div className="space-y-2 p-3">
            <div className="flex justify-between gap-4">
              <div className="space-y-2">
                <Bone className="h-3.5 w-44" />
                <Bone className="h-3 w-40 max-w-full" />
              </div>
              <Bone className="h-7 w-16 rounded-md" />
            </div>
            <Bone className="h-[194px] w-full rounded-md" />
            <Bone className="h-3 w-48" />
          </div>
        </div>
        <div className="flex min-h-10 items-center gap-3 border-t border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)] px-4">
          <Bone className="h-4 w-4 rounded-full" />
          <Bone className="h-3 w-80 max-w-full" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 min-[981px]:grid-cols-[minmax(0,1fr)_300px] min-[1301px]:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden border-y border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)]">
          <div className="flex min-h-14 items-center justify-between border-b border-[var(--ua-border-subtle)] px-4">
            <div className="space-y-2">
              <Bone className="h-4 w-40" />
              <Bone className="h-3 w-56" />
            </div>
            <Bone className="h-4 w-16" />
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex min-h-12 items-center gap-3 border-t border-[var(--ua-border-subtle)] px-4 first:border-t-0">
              <Bone className="h-6 flex-1" />
              <Bone className="h-6 w-40" />
              <Bone className="h-1 w-24" />
              <Bone className="h-4 w-6" />
            </div>
          ))}
        </section>
        <section className="border-y border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] p-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Bone className="h-4 w-24" />
              <Bone className="h-3 w-40" />
            </div>
            <Bone className="h-8 w-16 rounded-md" />
          </div>
          <div className="mt-3 space-y-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-1.5 border-t border-[var(--ua-border-subtle)] pt-2 first:border-t-0">
                <div className="flex justify-between gap-3">
                  <Bone className="h-3 w-24" />
                  <Bone className="h-3 w-20" />
                </div>
                <Bone className="h-3 w-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function StoreLoadingSkeleton() {
  return (
    <div
      role="status"
      className="p-4 md:p-6 space-y-5"
      aria-busy="true"
      aria-label="Loading store overview"
    >
      <header
        className="rounded-md"
        style={{
          background: "var(--ua-canvas)",
          borderBottom: "1px solid var(--ua-border-default)",
          padding: "16px 24px",
        }}
      >
        <Bone className="h-3 w-12 mb-2" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-8 w-40" />
            <Bone className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Bone className="h-9 w-28" />
            <Bone className="h-9 w-32" />
          </div>
        </div>
      </header>

      <MetricCardGridSkeleton count={5} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section
            className="rounded-md border p-4"
            style={{
              borderColor: "var(--ua-border-default)",
              background: "var(--ua-surface-primary)",
            }}
          >
            <Bone className="h-4 w-28 mb-1" />
            <Bone className="h-3 w-40 mb-3" />
            <Bone className="h-[130px] w-full rounded-md" />
          </section>
          <SectionCardSkeleton titleWidth="w-44">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-md border px-3 py-2.5"
                  style={{ borderColor: "var(--ua-border-subtle)" }}
                >
                  <Bone className="h-8 w-8 shrink-0 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Bone className="h-3 w-24" />
                    <Bone className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </SectionCardSkeleton>
        </div>
        <aside className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-md border p-4 space-y-3"
              style={{
                borderColor: "var(--ua-border-default)",
                background: "var(--ua-surface-primary)",
              }}
            >
              <Bone className="h-4 w-32" />
              <Bone className="h-3 w-full" />
              <Bone className="h-8 w-full" />
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

export function WatchlistLoadingSkeleton() {
  return (
    <div
      role="status"
      className="p-4 md:p-6 space-y-5"
      aria-busy="true"
      aria-label="Loading watchlist"
    >
      <header
        style={{
          background: "var(--ua-canvas)",
          borderBottom: "1px solid var(--ua-border-default)",
          padding: "16px 24px",
        }}
      >
        <Bone className="h-3 w-28 mb-2" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-2">
            <Bone className="h-8 w-32" />
            <Bone className="h-4 w-96 max-w-full" />
          </div>
          <Bone className="h-8 w-36" />
        </div>
      </header>

      <MetricCardGridSkeleton
        count={3}
        colsClassName="grid-cols-2 lg:grid-cols-3"
      />

      <SectionCardSkeleton titleWidth="w-36">
        <TableSkeleton
          columns={[
            { width: "30%" },
            { width: "25%" },
            { width: "15%" },
            { width: "15%" },
            { width: "15%" },
          ]}
          rows={3}
        />
      </SectionCardSkeleton>

      <SectionCardSkeleton titleWidth="w-40" actions>
        <div className="flex justify-end gap-2 mb-4">
          <Bone className="h-8 w-40" />
          <Bone className="h-8 w-24" />
        </div>
        <TableSkeleton
          columns={[
            { width: 44, className: "w-11" },
            { width: "35%" },
            { width: "20%" },
            { width: "25%" },
            { width: "15%", className: "text-right" },
          ]}
          rows={6}
        />
      </SectionCardSkeleton>
    </div>
  );
}

export function CustomersLoadingSkeleton() {
  return (
    <PageFrame title="Customers" subtitle="Loading customer directory…">
      <RegistrySurface aria-label="Loading customer directory" toolbar={<div className="flex w-full flex-wrap gap-2"><Bone className="h-9 min-w-[280px] flex-1" /><Bone className="h-9 w-44" /><Bone className="h-8 w-24" /></div>} resultCount={<Bone className="h-3 w-28" />}>
        <TableSkeleton columns={[{ width: "30%" }, { width: "12%" }, { width: "18%" }, { width: "18%" }, { width: "18%" }]} rows={8} />
      </RegistrySurface>
    </PageFrame>
  );
}

export function ClaimsLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton
      showInsight
      showRail
      kpiCount={4}
      kpiColsClassName="grid-cols-2 md:grid-cols-4"
    >
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bone className="h-3 w-32" />
          <Bone className="h-8 w-28" />
        </div>
        <div
          className="flex flex-wrap gap-2 border-b pb-3"
          style={{ borderColor: "var(--ua-border-subtle)" }}
        >
          {[...Array(8)].map((_, i) => (
            <Bone key={i} className="h-7 w-24 rounded-full" />
          ))}
        </div>
        <Bone className="h-12 w-full rounded-md" />
        <div className="flex flex-wrap gap-2">
          {[...Array(5)].map((_, i) => (
            <Bone key={i} className="h-7 w-28 rounded-md" />
          ))}
        </div>
        <TableSkeleton
          minWidth="1080px"
          columns={[
            {},
            { width: 160 },
            {},
            {},
            {},
            { className: "hidden xl:table-cell" },
            { width: 150 },
            { className: "hidden xl:table-cell" },
            { className: "hidden lg:table-cell" },
            { className: "hidden lg:table-cell" },
            {},
            { className: "hidden xl:table-cell" },
            {},
            { className: "hidden lg:table-cell" },
            { width: 72 },
          ]}
          rows={7}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function ReportsLoadingSkeleton() {
  return (
    <PageFrame
      title="Reports"
      subtitle="Customer concessions, economic loss, and recovery reconciliation."
      toolbar={
        <div className="flex min-w-0 flex-wrap items-center gap-2" aria-hidden="true">
          <Bone className="h-7 w-20" />
          <Bone className="h-7 w-20" />
          <Bone className="h-7 w-20" />
          <Bone className="ml-auto h-8 w-16" />
        </div>
      }
    >
      <div className="space-y-6" aria-busy="true" aria-label="Loading reports">
        <span className="sr-only" role="status">Loading reports</span>
        <div className="ua-metric-group" aria-hidden="true">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="ua-metric-group__item space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-7 w-20" />
              <Bone className="h-3 w-full max-w-36" />
            </div>
          ))}
        </div>
        <Surface as="section" structure="working" className="p-4" aria-hidden="true">
          <div className="space-y-2">
            <Bone className="h-5 w-64" />
            <Bone className="h-3 w-44" />
          </div>
          <Bone className="mt-5 h-[340px] w-full" />
        </Surface>
        <RegistrySurface aria-label="Loading matching report records">
          <DataTableServer
            loading
            density="metadata"
            flush
            aria-label="Loading matching report records"
            rows={[]}
            emptyState={<p className="p-4 text-sm text-[var(--ua-text-secondary)]">No report records.</p>}
            getRowKey={() => "loading"}
            columns={[
              { key: "record", header: "Record", render: () => null },
              { key: "type", header: "Type", render: () => null },
              { key: "state", header: "State", render: () => null },
              { key: "amount", header: "Amount", kind: "currency", render: () => null },
              { key: "updated", header: "Updated", kind: "date", render: () => null },
            ]}
          />
        </RegistrySurface>
      </div>
    </PageFrame>
  );
}

/** Scoped report-record state: summary, export control, and one records table. */
export function ReportRecordsLoadingSkeleton() {
  return (
    <PageFrame
      title="Report records"
      subtitle="Loading the records for the selected report scope…"
      actions={<Bone className="h-8 w-24" />}
    >
      <RegistrySurface
        aria-label="Loading matching report records"
        toolbar={<div className="flex w-full flex-wrap items-center gap-2"><Bone className="h-8 w-36" /><Bone className="h-8 w-28" /><Bone className="ml-auto h-8 w-20" /></div>}
        resultCount={<span className="skeleton inline-block h-3 w-32 rounded-[var(--ua-radius-control)]" aria-hidden="true" />}
      >
        <TableSkeleton
          columns={[
            { width: '30%' },
            { width: '18%' },
            { width: '18%' },
            { width: '18%' },
            { width: '16%' },
          ]}
          rows={8}
        />
      </RegistrySurface>
    </PageFrame>
  );
}

export function ChargebacksLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div>
        <div
          className="border-b p-4 space-y-3"
          style={{ borderColor: "var(--ua-border-default)" }}
        >
          <Bone className="h-4 w-36" />
          <Bone className="h-16 w-full max-w-lg" />
          <Bone className="h-3 w-80" />
        </div>
        <TableSkeleton
          columns={[
            { width: "12%" },
            { width: "18%" },
            { width: "14%" },
            { width: "14%" },
            { width: "12%" },
            { width: "12%" },
            { width: "18%" },
          ]}
          rows={6}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function UploadLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActions kpiCount={0}>
      <div className="mx-auto w-full max-w-[1500px] space-y-3 p-4">
        <div
          className="rounded-[var(--ua-radius-control)] px-5 py-4 space-y-2"
          style={{
            background: "var(--ua-surface-secondary)",
            border: "1px solid var(--ua-border-subtle)",
          }}
        >
          <Bone className="h-5 w-64" />
          <Bone className="h-3 w-full" />
        </div>
        <div
          className="flex flex-col items-center gap-3 rounded-[var(--ua-radius-surface)] border border-dashed p-6"
          style={{ borderColor: "var(--ua-border-default)", background: "var(--ua-surface-primary)" }}
        >
          <Bone className="h-12 w-12 rounded-full" />
          <Bone className="h-4 w-48" />
          <Bone className="h-3 w-64" />
          <Bone className="h-9 w-32" />
        </div>
        <div className="space-y-3">
          <Bone className="h-4 w-32" />
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md border px-4 py-3"
              style={{ borderColor: "var(--ua-border-subtle)" }}
            >
              <div className="space-y-1.5">
                <Bone className="h-4 w-40" />
                <Bone className="h-3 w-24" />
              </div>
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
        <Bone className="h-3 w-72 mx-auto" />
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function HistoryLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div className="p-4">
        <AuditHistoryTableSkeleton />
      </div>
    </WorkbenchPageSkeleton>
  );
}

function AuditHistoryTableSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { width: 44, className: "w-11" },
        { width: "22%" },
        { width: "12%" },
        { width: "18%" },
        { width: "12%" },
        { width: "10%", className: "text-right" },
        { width: "10%", className: "text-right" },
        { width: "14%" },
        { width: 48 },
      ]}
      rows={6}
    />
  );
}

export function NetworkIntelligenceLoadingSkeleton() {
  return (
    <div
      role="status"
      className="mx-auto max-w-[1500px] space-y-3.5 px-3 pb-6 pt-4 sm:px-5"
      aria-busy="true"
      aria-label="Loading network intelligence"
    >
      <div className="space-y-2">
        <Bone className="h-7 w-52" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-md border p-4 space-y-2"
            style={{
              borderColor: "var(--ua-border-default)",
              background: "var(--ua-surface-primary)",
            }}
          >
            <Bone className="h-3 w-28" />
            <Bone className="h-6 w-12" />
            <Bone className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[230px_minmax(0,1fr)_280px]">
        <Bone className="rounded-md h-64" />
        <Bone className="rounded-md h-[520px]" />
        <Bone className="rounded-md h-64" />
      </div>
    </div>
  );
}

export function AuditDetailLoadingSkeleton() {
  return (
    <div
      role="status"
      className="mx-auto max-w-[1500px] space-y-3.5 px-3 pb-6 pt-4 sm:px-5"
      aria-busy="true"
      aria-label="Loading audit"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-7 w-48" />
          <Bone className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-24" />
        </div>
      </div>
      <MetricCardGridSkeleton count={4} />
      <SectionCardSkeleton>
        <TableSkeleton
          columns={[
            { width: "22%" },
            { width: "16%" },
            { width: "14%" },
            { width: "14%" },
            { width: "12%" },
            { width: "12%" },
            { width: 80 },
          ]}
          rows={8}
        />
      </SectionCardSkeleton>
    </div>
  );
}

/** Settings-owned list skeleton; route registries use their own table geometry. */
export function TablePageLoadingSkeleton({
  label = "Loading activity",
}: {
  label?: string;
}) {
  return <SettingsGeometrySkeleton mode="list" label={label} />;
}

/** Generic form page skeleton — used for apply, new-audit, settings subpages */
export function FormPageLoadingSkeleton() {
  return <SettingsGeometrySkeleton mode="form" />;
}

/** Focused configuration task — used outside the settings information architecture. */
export function ConfigurationTaskLoadingSkeleton({
  label = 'Loading configuration',
}: {
  label?: string;
}) {
  return (
    <PageFrame title="Configuration" subtitle="Loading the current setup…">
      <Surface
        as="section"
        structure="working"
        pad="standard"
        className="ua-settings-form space-y-4"
        aria-busy="true"
        aria-label={label}
      >
        <div className="space-y-2">
          <Bone className="h-5 w-48" />
          <Bone className="h-3 w-full max-w-lg" />
        </div>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="space-y-1.5">
            <Bone className="h-2.5 w-24" />
            <Bone className="h-8 w-full" />
          </div>
        ))}
        <Bone className="h-8 w-28" />
      </Surface>
    </PageFrame>
  );
}

/** Settings page with list items skeleton — used for integrations, team */
export function SettingsListLoadingSkeleton() {
  return <SettingsGeometrySkeleton mode="list" />;
}

function SettingsGeometrySkeleton({ mode, label = 'Loading settings' }: { mode: 'form' | 'list'; label?: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <header className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className="space-y-2"><Bone className="h-2.5 w-20" /><Bone className="h-5 w-40" /><Bone className="h-3 w-72 max-w-full" /></div>
        </div>
      </header>
      <div className={styles.pageBody}>
        {/* Mirrors the resolved settings screen: one 680–820px form column, no
            guidance rail (§5.4, §8.6). */}
        <div className="ua-settings-form">
          <section className={styles.panel}>
            <div className="space-y-3 p-4">
              {mode === 'form' ? Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-1.5"><Bone className="h-2.5 w-24" /><Bone className="h-8 w-full" /></div>
              )) : Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--ua-border-subtle)] py-2 last:border-0">
                  <div className="space-y-1.5"><Bone className="h-3 w-36" /><Bone className="h-2.5 w-52 max-w-full" /></div><Bone className="h-8 w-24" />
                </div>
              ))}
              {mode === 'form' ? <Bone className="h-8 w-28" /> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Graph / network visualization skeleton */
export function GraphLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-3.5 px-3 pb-6 pt-4 sm:px-5" aria-busy="true">
      <div className="space-y-2">
        <Bone className="h-8 w-52" />
        <Bone className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-md border p-4 space-y-2"
            style={{
              borderColor: "var(--ua-border-default)",
              background: "var(--ua-surface-primary)",
            }}
          >
            <Bone className="h-3 w-24" />
            <Bone className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[230px_minmax(0,1fr)_280px]">
        <Bone className="rounded-md h-64" />
        <Bone className="rounded-md h-[520px]" />
        <Bone className="rounded-md h-64" />
      </div>
    </div>
  );
}

/** Report detail skeleton */
export function ReportDetailLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-3.5 px-3 pb-6 pt-4 sm:px-5" aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-8 w-56" />
          <Bone className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-24" />
        </div>
      </div>
      <MetricCardGridSkeleton count={4} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SectionCardSkeleton titleWidth="w-36">
          <Bone className="h-48 w-full" />
        </SectionCardSkeleton>
        <SectionCardSkeleton titleWidth="w-40">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Bone className="h-3 w-40" />
                <Bone className="h-3 w-12" />
              </div>
            ))}
          </div>
        </SectionCardSkeleton>
      </div>
    </div>
  );
}
