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
      overlayId="case-context-drawer"
      signalRail
      footer={
        <div className="p-4">
          <Link
            href={`/cases/${caseId}`}
            className="font-medium text-[13px] leading-5 text-[#1c1f23] inline-flex min-h-10 items-center rounded-md bg-[#9f4f08] px-4 py-2 text-[#fff]"
          >
            Open full case
          </Link>
        </div>
      }
    >
      <div className="space-y-6 p-4 sm:p-5">
        {error ? (
          <p role="alert" className="text-[13px] leading-5 text-[#40454a] text-[#b0431a]">
            {error}
          </p>
        ) : null}
        {!data && !error ? (
          <p role="status" className="text-[13px] leading-5 text-[#40454a] text-[#6f6a63]">
            Loading case context…
          </p>
        ) : null}
        {data ? (
          <>
            <section className="grid grid-cols-2 gap-4 rounded-lg border border-[#eae8e5] bg-[#f4f3f1] p-4">
              <div>
                <p className="text-[10.5px] leading-4 text-[#6f6a63]">Status</p>
                <p className="text-[12px] leading-[1.45] text-[#40454a] font-medium capitalize">
                  {title("caseStatus", data.case.status)}
                </p>
              </div>
              <div>
                <p className="text-[10.5px] leading-4 text-[#6f6a63]">Exposure</p>
                <p className="text-[12px] leading-[1.45] text-[#40454a] font-medium">
                  {formatCurrencyNullable(
                    data.case.amount_at_risk,
                    data.case.currency,
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10.5px] leading-4 text-[#6f6a63]">
                  Next action
                </p>
                <p className="text-[12px] leading-[1.45] text-[#40454a]">
                  {title("nextAction", data.case.next_action)}
                  {data.case.next_action_reason
                    ? ` · ${data.case.next_action_reason}`
                    : ""}
                </p>
              </div>
            </section>
            <section>
              <h3 className="mb-2 font-medium text-[13px] leading-5 text-[#1c1f23]">Related records</h3>
              <RelatedRecordsPanel records={data.relatedRecords} />
            </section>
            <section>
              <h3 className="mb-2 font-medium text-[13px] leading-5 text-[#1c1f23]">Activity</h3>
              {data.timeline.length ? (
                <ul className="space-y-2">
                  {data.timeline
                    .slice(-12)
                    .reverse()
                    .map((item) => (
                      <li
                        key={item.id}
                        className="rounded-md border border-[#e4e3e0] p-3 text-[12px] leading-[1.45] text-[#40454a]"
                      >
                        <p className="font-medium">{item.title}</p>
                        <p className="text-[10.5px] leading-4 text-[#6f6a63]">
                          {item.occurredAt.slice(0, 10)} · {item.sourceSystem}
                        </p>
                        {item.summary ? (
                          <p className="mt-1 text-[11.5px] leading-[1.45] text-[#64686d]">
                            {item.summary}
                          </p>
                        ) : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-[13px] leading-5 text-[#40454a] text-[#6f6a63]">
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
