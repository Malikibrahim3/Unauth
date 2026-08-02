"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/Drawer";
import { RelatedRecordsPanel } from "@/components/relationships/RelatedRecordsPanel";
import type { TimelineItem } from "@/lib/cases/timeline";
import type { RelatedRecord } from "@/lib/relationships/relatedRecords";
import { formatCurrencyNullable } from "@/lib/utils/format";
import { label } from "@/lib/ui/labels";
import { shortRef } from "@/lib/ui/displayRef";

type CaseContext = {
  case: {
    id: string;
    status: string;
    amount_at_risk: number | null;
    currency: string | null;
    next_action: string | null;
    next_action_reason: string | null;
  };
  relatedRecords: RelatedRecord[];
  timeline: TimelineItem[];
  financialSummaries: Array<Record<string, unknown>>;
};

function title(family: "caseStatus" | "nextAction", value: string | null | undefined) {
  return value ? label(family, value) : "Not set";
}

export function CaseContextDrawer({
  caseId,
  onClose,
}: {
  caseId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<CaseContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/cases/${caseId}/context`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Unable to load case context");
        setData(body as CaseContext);
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string }).name !== "AbortError")
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load case context",
          );
      });
    return () => controller.abort();
  }, [caseId]);

  return (
    <Drawer
      open
      onClose={onClose}
      title={shortRef(null, caseId)}
      footer={
        <div className="p-4">
          <Link
            href={`/claims/${caseId}`}
            className="ua-text-working-title inline-flex min-h-10 items-center rounded-md bg-[var(--ua-action-primary)] px-4 py-2 text-[var(--ua-action-primary-fg)]"
          >
            Open full case
          </Link>
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-5">
        {error ? (
          <p role="alert" className="ua-text-body text-[var(--ua-critical)]">
            {error}
          </p>
        ) : null}
        {!data && !error ? (
          <p role="status" className="ua-text-body text-[var(--ua-text-tertiary)]">
            Loading case context…
          </p>
        ) : null}
        {data ? (
          <>
            <section className="grid grid-cols-2 gap-4 rounded-lg border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-muted)] p-4">
              <div>
                <p className="ua-text-metadata">Status</p>
                <p className="ua-text-dense font-medium capitalize">
                  {title("caseStatus", data.case.status)}
                </p>
              </div>
              <div>
                <p className="ua-text-metadata">Exposure</p>
                <p className="ua-text-dense font-medium">
                  {formatCurrencyNullable(
                    data.case.amount_at_risk,
                    data.case.currency,
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <p className="ua-text-metadata">
                  Next action
                </p>
                <p className="ua-text-dense">
                  {title("nextAction", data.case.next_action)}
                  {data.case.next_action_reason
                    ? ` · ${data.case.next_action_reason}`
                    : ""}
                </p>
              </div>
            </section>
            <section>
              <h3 className="mb-2 ua-text-working-title">Related records</h3>
              <RelatedRecordsPanel records={data.relatedRecords} />
            </section>
            <section>
              <h3 className="mb-2 ua-text-working-title">Activity</h3>
              {data.timeline.length ? (
                <ul className="space-y-2">
                  {data.timeline
                    .slice(-12)
                    .reverse()
                    .map((item) => (
                      <li
                        key={item.id}
                        className="rounded-md border border-[var(--ua-border-default)] p-3 ua-text-dense"
                      >
                        <p className="font-medium">{item.title}</p>
                        <p className="ua-text-metadata">
                          {item.occurredAt.slice(0, 10)} · {item.sourceSystem}
                        </p>
                        {item.summary ? (
                          <p className="mt-1 ua-text-caption-role">
                            {item.summary}
                          </p>
                        ) : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="ua-text-body text-[var(--ua-text-tertiary)]">
                  No activity yet.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </Drawer>
  );
}
