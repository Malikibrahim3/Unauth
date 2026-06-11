import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Audit report | Unauth',
  description: 'Review flagged identities from your audit run.',
};
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { TABLES } from '@/lib/supabase/tables';
import ClaimGate from './ClaimGate';
import { formatCurrency } from '@/lib/utils/format';

interface ReportPageProps {
  params: Promise<{ runId: string }>;
}

type ReportRow = {
  cluster_id: string | null;
  customer_email: string | null;
  shipping_address: string | null;
  identity_match_score: number | null;
  identity_confidence_grade: string | null;
  signals_matched: unknown;
  order_value: number | null;
};

function redactEmail(value: string | null): string {
  if (!value) return 'masked';
  const parts = value.split('@');
  const local = parts[0] ?? '';
  const domain = parts[1] ?? 'masked';
  const tail = local.slice(-4);
  return `••••${tail}@${domain}`;
}

function redactAddress(value: string | null): string {
  if (!value) return 'masked';
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= 8 ? '••••' : `•••• ${compact.slice(-8)}`;
}

function signalsText(value: unknown): string {
  if (!value) return '—';
  if (Array.isArray(value)) return value.slice(0, 3).join(', ') || '—';
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).slice(0, 3).join(', ') || '-';
  return String(value);
}

function scoreText(row: ReportRow): string {
  const grade = row.identity_confidence_grade;
  return grade ? grade.charAt(0).toUpperCase() + grade.slice(1) : '-';
}

export default async function PublicAuditReportPage({ params }: ReportPageProps) {
  const { runId } = await params;
  const supabase = createClient();
  const service = createServiceClient();
  const [
    {
      data: { user },
    },
    { data: audit },
  ] = await Promise.all([
    supabase.auth.getUser(),
    service
      .from(TABLES.PUBLIC_AUDITS)
      .select('id, submitted_email, linked_user_id, processing_job_id')
      .eq('id', runId)
      .maybeSingle(),
  ]);

  if (!audit) notFound();
  const publicAudit = audit as {
    id: string;
    submitted_email: string;
    linked_user_id: string | null;
    processing_job_id: string | null;
  };
  if (!publicAudit.processing_job_id) notFound();

  const canView =
    !!user &&
    (
      publicAudit.linked_user_id === user.id ||
      user.email?.toLowerCase() === publicAudit.submitted_email.toLowerCase()
    );

  let rows: ReportRow[] = [];
  let summaryExposure = 0;

  if (canView) {
    const { data: reportRows } = await service
      .from(TABLES.AUDIT_TRANSACTIONS)
      .select('cluster_id, customer_email, shipping_address, identity_match_score, identity_confidence_grade, signals_matched, order_value')
      .eq('job_id', publicAudit.processing_job_id)
      .or('identity_confidence_grade.in.(probable,definite),match_status.in.(probable,definite)')
      .not('dismissed_by_merchant', 'is', true)
      .order('identity_match_score', { ascending: false, nullsFirst: false })
      .limit(120);

    rows = (reportRows ?? []) as ReportRow[];
    summaryExposure = rows.reduce((sum, row) => sum + (row.order_value ?? 0), 0);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-base)', color: 'var(--ink-primary)' }} className="px-6 py-12 md:px-10">
      <div className="mx-auto max-w-6xl space-y-5">
        {canView ? (
          <div className="border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-raised)', color: 'var(--ink-secondary)' }}>
            This report shows patterns within your store only. Network-wide resolution is available to founding merchants.{' '}
            <Link href="/apply" className="underline" style={{ color: 'var(--ink-primary)' }}>
              Apply for network access →
            </Link>
          </div>
        ) : null}

        <div className="relative overflow-hidden border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-raised)' }}>
          <div className={!canView ? 'blur-[6px] pointer-events-none select-none' : ''}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h1 style={{ fontFamily: 'var(--font-dm-sans, sans-serif)', fontSize: '30px', fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>
                  Full audit report
                </h1>
                <p style={{ margin: '6px 0 0', color: 'var(--ink-tertiary)', fontSize: '13px', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
                  Audit ID: {publicAudit.id}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--ink-tertiary)', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
                  Order value linked
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '24px', fontFamily: 'var(--font-dm-sans, sans-serif)', fontWeight: 500 }}>
                  {formatCurrency(summaryExposure, 'USD')}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead style={{ background: 'var(--surface-raised)' }}>
                  <tr>
                    {['Cluster ID', 'Linked identities', 'Confidence grade', 'Signals fired', 'Orders / order value'].map((label) => (
                      <th key={label} className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--ink-tertiary)' }}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-tertiary)' }}>
                        No matched rows yet for this audit.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.cluster_id ?? `${row.customer_email ?? ''}-${row.shipping_address ?? ''}`} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <td className="px-4 py-3 text-sm">{row.cluster_id ?? 'Pending'}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-secondary)' }}>
                          {redactEmail(row.customer_email)} · {redactAddress(row.shipping_address)}
                        </td>
                        <td className="px-4 py-3 text-sm">{scoreText(row)}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--ink-secondary)' }}>{signalsText(row.signals_matched)}</td>
                        <td className="px-4 py-3 text-sm">1 order · {formatCurrency(row.order_value ?? 0, 'USD')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!canView ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(248,245,238,0.55)] p-4">
              <ClaimGate auditId={publicAudit.id} email={publicAudit.submitted_email} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
