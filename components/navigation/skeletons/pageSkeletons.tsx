import {
  Bone,
  MetricCardGridSkeleton,
  SectionCardSkeleton,
  TableSkeleton,
} from "./primitives";
import { WorkbenchPageSkeleton } from "./WorkbenchPageSkeleton";
import styles from '@/components/authenticated/AuthenticatedPageChrome.module.css';

export function DashboardLoadingSkeleton() {
  return (
    <div
      role="status"
      className="space-y-3.5 animate-pulse"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <header className="flex min-h-12 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <Bone className="h-5 w-28" />
          <Bone className="h-3 w-64 max-w-full" />
        </div>
        <Bone className="h-4 w-20" />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--border-muted)] py-2.5">
        <div className="flex flex-wrap gap-2">
          <Bone className="h-[30px] w-28 rounded-md" />
          <Bone className="h-[30px] w-32 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-[30px] w-20 rounded-md" />
          <Bone className="h-[30px] w-16 rounded-md" />
        </div>
      </div>

      <section className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-start justify-between gap-3 p-4 pb-2">
          <div className="space-y-1.5">
            <Bone className="h-3.5 w-36" />
            <Bone className="h-2.5 w-28" />
          </div>
          <Bone className="h-2.5 w-32" />
        </div>
        <div className="px-4 pt-2">
          <Bone className="h-3 w-24" />
          <Bone className="mt-2 h-5 w-32" />
        </div>
        <div className="p-4 pt-2">
          <Bone className="h-[250px] w-full rounded-md" />
        </div>
        <div className="grid grid-cols-2 border-t border-[var(--border-muted)] lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="space-y-2 border-l border-[var(--border-muted)] p-3 first:border-l-0">
              <Bone className="h-2.5 w-24" />
              <Bone className="h-5 w-20" />
              <Bone className="h-2.5 w-28 max-w-full" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {[0, 1].map((card) => (
          <section key={card} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Bone className="h-3.5 w-32" />
                <Bone className="h-6 w-16" />
                <Bone className="h-2.5 w-40" />
              </div>
              <Bone className="h-7 w-16 rounded-md" />
            </div>
            <Bone className="mt-5 h-12 w-full rounded-sm" />
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[var(--border-muted)] pt-3">
              <Bone className="h-8 w-full" />
              <Bone className="h-8 w-full" />
              <Bone className="h-8 w-full" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function StoreLoadingSkeleton() {
  return (
    <div
      role="status"
      className="p-4 md:p-6 space-y-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading store overview"
    >
      <header
        className="rounded-md"
        style={{
          background: "var(--bg-canvas)",
          borderBottom: "1px solid var(--border)",
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
              borderColor: "var(--border)",
              background: "var(--surface)",
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
                  style={{ borderColor: "var(--border-muted)" }}
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
                borderColor: "var(--border)",
                background: "var(--surface)",
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
      className="p-4 md:p-6 space-y-5 animate-pulse"
      aria-busy="true"
      aria-label="Loading watchlist"
    >
      <header
        style={{
          background: "var(--bg-canvas)",
          borderBottom: "1px solid var(--border)",
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
    <WorkbenchPageSkeleton showActionBar showInsight showRail kpiCount={4} kpiColsClassName="grid-cols-2 md:grid-cols-4">
      <div className="p-4 space-y-4">
        <div
          className="rounded-md border p-4 space-y-3"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex justify-between gap-3">
            <Bone className="h-4 w-48" />
            <Bone className="h-3 w-24" />
          </div>
          <Bone className="h-8 w-full max-w-md" />
        </div>
        <div
          className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <Bone className="h-3 w-12" />
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-7 w-20 rounded-sm" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Bone className="h-3 w-20" />
          {[...Array(4)].map((_, i) => (
            <Bone key={i} className="h-7 w-28 rounded-sm" />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Bone className="h-3 w-40" />
          <Bone className="h-8 w-48" />
        </div>
        <TableSkeleton
          columns={[
            { width: "28%" },
            { width: "12%" },
            { width: "10%" },
            { width: "10%" },
            { width: "12%" },
            { width: "12%" },
            { width: "10%" },
          ]}
          rows={8}
        />
      </div>
    </WorkbenchPageSkeleton>
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
          style={{ borderColor: "var(--border-muted)" }}
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
    <WorkbenchPageSkeleton showActions kpiCount={0}>
      <div
        className="flex gap-1 border-b px-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {[...Array(3)].map((_, i) => (
          <Bone
            key={i}
            className="h-10 w-28 mb-0 rounded-none"
            style={{ borderRadius: 4 }}
          />
        ))}
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-md border p-4 space-y-2"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <Bone className="h-3 w-20" />
              <Bone className="h-7 w-14" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCardSkeleton titleWidth="w-36">
            <Bone className="h-40 w-full" />
          </SectionCardSkeleton>
          <SectionCardSkeleton titleWidth="w-32">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <Bone className="h-3 w-24" />
                    <Bone className="h-3 w-8" />
                  </div>
                  <Bone className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </SectionCardSkeleton>
        </div>
      </div>
    </WorkbenchPageSkeleton>
  );
}

export function ChargebacksLoadingSkeleton() {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={5}>
      <div>
        <div
          className="border-b p-4 space-y-3"
          style={{ borderColor: "var(--border)" }}
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
          className="rounded-[var(--radius-2)] px-5 py-4 space-y-2"
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-muted)",
          }}
        >
          <Bone className="h-5 w-64" />
          <Bone className="h-3 w-full" />
        </div>
        <div
          className="flex flex-col items-center gap-3 rounded-[var(--ua-radius-card)] border border-dashed p-6"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
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
              style={{ borderColor: "var(--border-muted)" }}
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
      className="mx-auto max-w-[1500px] animate-pulse space-y-3.5 px-3 pb-6 pt-4 sm:px-5"
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
              borderColor: "var(--border)",
              background: "var(--surface)",
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
      className="mx-auto max-w-[1500px] animate-pulse space-y-3.5 px-3 pb-6 pt-4 sm:px-5"
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

/** Generic workbench table page skeleton — used for clusters, evidence, evidence-packages, audit-history, audits */
export function TablePageLoadingSkeleton({
  label: _label = "Loading",
}: {
  label?: string;
}) {
  return (
    <WorkbenchPageSkeleton showActionBar kpiCount={4}>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Bone className="h-3 w-40" />
          <Bone className="h-8 w-28" />
        </div>
        <TableSkeleton
          columns={[
            { width: "28%" },
            { width: "16%" },
            { width: "14%" },
            { width: "14%" },
            { width: "14%" },
            { width: "14%" },
          ]}
          rows={8}
        />
      </div>
    </WorkbenchPageSkeleton>
  );
}

/** Generic form page skeleton — used for apply, new-audit, settings subpages */
export function FormPageLoadingSkeleton() {
  return <SettingsGeometrySkeleton mode="form" />;
}

/** Settings page with list items skeleton — used for integrations, team */
export function SettingsListLoadingSkeleton() {
  return <SettingsGeometrySkeleton mode="list" />;
}

function SettingsGeometrySkeleton({ mode }: { mode: 'form' | 'list' }) {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading settings">
      <header className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <div className="space-y-2"><Bone className="h-2.5 w-20" /><Bone className="h-5 w-40" /><Bone className="h-3 w-72 max-w-full" /></div>
        </div>
      </header>
      <div className={styles.pageBody}>
        <div className={styles.settingsGrid}>
          <section className={styles.panel}>
            <div className="space-y-3 p-4">
              {mode === 'form' ? Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-1.5"><Bone className="h-2.5 w-24" /><Bone className="h-8 w-full" /></div>
              )) : Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex min-h-14 items-center justify-between gap-4 border-b border-[var(--border-muted)] py-2 last:border-0">
                  <div className="space-y-1.5"><Bone className="h-3 w-36" /><Bone className="h-2.5 w-52 max-w-full" /></div><Bone className="h-8 w-24" />
                </div>
              ))}
              {mode === 'form' ? <Bone className="h-8 w-28" /> : null}
            </div>
          </section>
          <aside className={styles.guidanceStack}>
            <div className={styles.guidanceCard}><Bone className="h-8 w-8" /><Bone className="mt-3 h-3 w-32" /><Bone className="mt-2 h-12 w-full" /></div>
            <Bone className="h-8 w-full" />
          </aside>
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
              borderColor: "var(--border)",
              background: "var(--surface)",
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
