/**
 * @jest-environment jsdom
 */
import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CaseContextDrawer } from "@/components/cases/CaseContextDrawer";

describe("CaseContextDrawer", () => {
  it("loads the tenant-scoped context and preserves a route to the full case", async () => {
    const onClose = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        case: {
          id: "case-1",
          status: "evidence_needed",
          amount_at_risk: 49.99,
          currency: "GBP",
          next_action: "request_evidence",
          next_action_reason: "Tracking is unavailable",
        },
        relatedRecords: [],
        financialSummaries: [],
        timeline: [
          {
            id: "event-1",
            title: "Evidence requested",
            occurredAt: "2026-07-11T00:00:00.000Z",
            sourceSystem: "unauth",
            recordedAt: "2026-07-11T00:00:00.000Z",
            actor: { type: "user" },
            freshness: "fresh",
          },
        ],
      }),
    }) as never;

    render(<CaseContextDrawer caseId="case-1" onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByText("Evidence requested")).toBeInTheDocument(),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/cases/case-1/context",
      expect.any(Object),
    );
    expect(
      screen.getByRole("link", { name: /open full case/i }),
    ).toHaveAttribute("href", "/claims/case-1");

    // The drawer's focus trap moves initial focus to its primary close
    // control (the header "Close" button) so keyboard users can dismiss
    // immediately without tabbing through the panel content.
    const closeButton = screen.getByRole("button", { name: "Close" });
    await waitFor(() => expect(closeButton).toHaveFocus());

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
