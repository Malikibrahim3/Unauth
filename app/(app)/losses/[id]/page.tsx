import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  hasPermission,
  PERMISSIONS,
} from "@/lib/permissions";
import {
  getRequestServiceClient,
  getRequestUser,
  requirePagePermission,
} from "@/lib/auth/requestContext";
import { DetailPageShell } from "@/components/workbench/DetailPageShell";
import { getLossReadModel } from "@/lib/losses/readModel";
import { LossActions } from "@/components/losses/LossActions";
import { formatDateTime, formatMoneyOrDash } from "@/lib/utils/format";
import { humanise, label as enumLabel } from "@/lib/ui/labels";
import { hashId } from "@/lib/ui/displayRef";

export const dynamic = "force-dynamic";
const money = (
  minor: number | null | undefined,
  currency: string | null | undefined,
) => formatMoneyOrDash(minor, currency);
// Humanise fields that have no dedicated label family (evidence types, source
// providers, confidence, financial state, event types).
const humaniseField = (value: string | null | undefined) => value ? humanise(value) : "—";

export default async function LossDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getRequestUser();
  if (!user) redirect("/login");
  const client = getRequestServiceClient();
  const ctx = await requirePagePermission(PERMISSIONS.VIEW_INBOX);
  if (!ctx) redirect("/dashboard");
  const model = await getLossReadModel(client, ctx.merchantId, id);
  if (!model) notFound();
  const canManage = await hasPermission(
    client,
    ctx,
    PERMISSIONS.SUBMIT_PAYOUT_DECISIONS,
  );
  const primary =
    model.attributionCandidates.find((candidate) => candidate.is_primary) ??
    null;
  const alternatives = model.attributionCandidates.filter(
    (candidate) => !candidate.is_primary,
  );
  const amount = model.amounts[0];
  return (
    <DetailPageShell
      backHref="/losses"
      backLabel="Losses"
      eyebrow="Loss"
      title={`${enumLabel("lossCategory", model.loss.case_category)} · ${hashId(id)}`}
      subtitle={`${enumLabel("lossStatus", model.loss.status)} · ${humaniseField(model.loss.source_confidence)}`}
      statusBadge={
        <span className="rounded-md border border-[var(--border)] px-2 py-1 text-xs">
          {humaniseField(model.loss.financial_state)}
        </span>
      }
      actions={
        <LossActions
          lossId={id}
          canManage={canManage}
          writeOffAmount={money(
            amount?.outstandingRecoveryMinor,
            amount?.currency,
          )}
        />
      }
    >
      <div className="space-y-3">
        <section
          aria-labelledby="loss-financial"
          className="rounded-[var(--ua-radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-xs)]"
        >
          <h2 id="loss-financial" className="font-semibold">
            Financial outcome
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
            {[
              [
                "Realised loss",
                money(amount?.realisedLossMinor, amount?.currency),
              ],
              [
                "Estimated loss",
                money(amount?.estimatedLossMinor, amount?.currency),
              ],
              [
                "Recoverable",
                money(amount?.recoverableMinor, amount?.currency),
              ],
              ["Recovered", money(amount?.recoveredMinor, amount?.currency)],
              [
                "Outstanding",
                money(amount?.outstandingRecoveryMinor, amount?.currency),
              ],
            ].map(([term, value]) => (
              <div key={term}>
                <dt className="text-xs text-[var(--text-secondary)]">{term}</dt>
                <dd className="mt-1 font-mono font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {model.amounts.length > 1 ? (
            <p className="mt-3 text-sm text-[var(--warning)]">
              This loss spans multiple currencies. Values are shown separately
              in the ledger and cannot be combined.
            </p>
          ) : null}
        </section>
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="font-semibold">Attribution</h2>
            <p className="mt-3 text-sm">
              <strong>Primary:</strong>{" "}
              {primary
                ? `${enumLabel("attribution", primary.attribution)} · ${primary.accountable_party_name ?? enumLabel("counterparty", primary.accountable_party_type)}`
                : enumLabel("attribution", model.loss.attribution)}
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Confidence:{" "}
              {primary?.confidence == null
                ? humaniseField(model.loss.source_confidence)
                : `${Math.round(primary.confidence * 100)}%`}
            </p>
            {alternatives.length ? (
              <>
                <h3 className="mt-4 text-sm font-medium">Alternatives</h3>
                <ul className="mt-2 space-y-2">
                  {alternatives.map((candidate) => (
                    <li key={candidate.id} className="text-sm">
                      {enumLabel("attribution", candidate.attribution)} ·{" "}
                      {candidate.accountable_party_name ??
                        enumLabel("counterparty", candidate.accountable_party_type)}{" "}
                      <span className="text-[var(--text-secondary)]">
                        (candidate only; not added to loss totals)
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 text-sm text-[var(--text-secondary)]">
                No alternative attribution candidates.
              </p>
            )}
          </section>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <h2 className="font-semibold">Connected records</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {model.loss.support_payout_case_id ? (
                <Link
                  href={`/claims/${model.loss.support_payout_case_id}`}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  Payout case
                </Link>
              ) : null}
              {model.recoveries.map((recovery) => (
                <Link
                  key={recovery.id}
                  href={`/recoveries/${recovery.id}`}
                  className="rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                >
                  Recovery {hashId(recovery.id)}
                </Link>
              ))}
            </div>
          </section>
        </div>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold">Evidence</h2>
          {model.evidence.length ? (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {model.evidence.map((item) => (
                <li key={item.id} className="py-3 text-sm">
                  <span className="font-medium">
                    {humaniseField(item.evidence_type)}
                  </span>{" "}
                  · {humaniseField(item.source_provider)} ·{" "}
                  {item.source_verified
                    ? "Source verified"
                    : "Not source verified"}
                  {item.source_url ? (
                    <a href={item.source_url} className="ml-2 underline">
                      Open source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              No loss-specific evidence is linked. This does not mean evidence
              is complete.
            </p>
          )}
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="font-semibold">Activity</h2>
          {model.events.length ? (
            <ol className="mt-3 space-y-3">
              {model.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <span className="font-medium">{humaniseField(event.event_type)}</span>{" "}
                  <time className="text-[var(--text-secondary)]">
                    {formatDateTime(event.created_at)}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              No loss activity has been recorded.
            </p>
          )}
        </section>
      </div>
    </DetailPageShell>
  );
}
