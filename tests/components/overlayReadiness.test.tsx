/**
 * @jest-environment jsdom
 */
import React, { useState } from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)}>Open review</button><Modal open={open} onClose={() => setOpen(false)} title="Review decision" overlayId="review-decision"><button type="button">Confirm</button></Modal></>;
}

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)}>Open builder</button><Drawer open={open} onClose={() => setOpen(false)} title="Build rule" overlayId="build-rule"><button type="button">Save draft</button></Drawer></>;
}

describe("overlay readiness contract", () => {
  it.each([
    ["modal", ModalHarness, "Open review", "Review decision", "review-decision"],
    ["drawer", DrawerHarness, "Open builder", "Build rule", "build-rule"],
  ])("opens the %s with a visible title and restores focus", async (_kind, Harness, triggerName, title, overlayId) => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: triggerName });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: title });
    expect(screen.getByRole("heading", { name: title })).toBeVisible();
    await waitFor(() => expect(dialog).toHaveAttribute("data-overlay-state", "open"));
    expect(dialog).toHaveAttribute("data-overlay-id", overlayId);
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: title })).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
