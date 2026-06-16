import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TABLES } from '@/lib/supabase/tables';
import { requirePermission, PERMISSIONS } from '@/lib/permissions';
import { CatchCard } from '@/components/catches/CatchCard';
import TrackPageView from '@/components/common/TrackPageView';
import type { IdentityCatchEvent } from '@/lib/catches/types';
import type { ConfidenceGrade } from '@/lib/engine/weights';

type CatchRow = {
  id: string;
  merchant_id: string;
  claim_id: string | null;
  order_id: string | null;
  profile_id: string | null;
  submitted_identifier_display: string | null;
  linked_identifier_display: string | null;
  matched_signal_types: string[] | null;
  confidence_score: number | null;
  confidence_grade: string | null;
  estimated_exposure_amount: number | null;
  estimated_exposure_currency: string | null;
  evidence_pack_id: string | null;
  created_at: string;
};

function mapRow(row: CatchRow): IdentityCatchEvent {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    claimId: row.claim_id,
    orderId: row.order_id,
    profileId: row.profile_id,
    submittedIdentifierDisplay: row.submitted_identifier_display,
    linkedIdentifierDisplay: row.linked_identifier_display,
    matchedSignalTypes: row.matched_signal_types ?? [],
    confidenceScore: row.confidence_score ?? 0,
    confidenceGrade: (row.confidence_grade ?? 'weak') as ConfidenceGrade,
    estimatedExposureAmount: row.estimated_exposure_amount,
    estimatedExposureCurrency: row.estimated_exposure_currency ?? 'GBP',
    evidencePackId: row.evidence_pack_id,
    createdAt: row.created_at,
  };
}

export default async function CatchesPage() {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { denied, ctx } = await requirePermission(
    serviceClient,
    user.id,
    PERMISSIONS.VIEW_DASHBOARD,
  );
  if (denied) redirect('/dashboard');

  const { data, error } = await serviceClient
    .from(TABLES.IDENTITY_CATCH_EVENTS)
    .select('*')
    .eq('merchant_id', ctx.merchantId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (data ?? []) as CatchRow[];
  const events: IdentityCatchEvent[] = error ? [] : rows.map(mapRow);

  return (
    <div className="p-4 md:p-6">
      <TrackPageView event="Catches Page Viewed" />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Identity catches
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Claims where Unauth detected a non-obvious identity link through hashed signal matching.
          Each catch surfaces the evidence — your team makes the decision.
        </p>
      </header>

      {events.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-[10px] border py-20 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            No identity catches yet
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            When Unauth detects a claim linked to an existing profile through non-obvious signals —
            like a plus-aliased email, same address hash, or matching payment fingerprint — it
            appears here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-w-3xl">
          {events.map((event) => (
            <CatchCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
