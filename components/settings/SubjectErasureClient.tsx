"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export default function SubjectErasureClient() {
  const [subjectId, setSubjectId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function eraseSubject() {
    setMessage(null);
    if (confirmation !== "ERASE") {
      setMessage('Type "ERASE" to confirm.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/settings/data-subject-erasure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subjectId.trim(),
          idempotencyKey: `privacy-ui:${crypto.randomUUID()}`,
          confirm: "ERASE",
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        receiptId?: string;
        storageCleanupError?: string | null;
      };
      if (!response.ok) throw new Error(body.error ?? "Subject erasure failed.");
      setMessage(
        body.storageCleanupError
          ? `Database erasure completed (receipt ${body.receiptId}). Storage cleanup is queued for retry.`
          : `Erasure completed and recorded (receipt ${body.receiptId}).`,
      );
      setConfirmation("");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-body-sm" style={{ color: "var(--ua-text-secondary)" }}>
        Enter the canonical customer ID shown in the customer URL. Direct
        identifiers and linked evidence are redacted for this workspace;
        monetary entries and a non-PII receipt remain for reconciliation.
      </p>
      <label className="ua-text-label block" htmlFor="privacy-subject-id">
        Customer ID
        <input
          id="privacy-subject-id"
          type="text"
          inputMode="text"
          autoComplete="off"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          placeholder="00000000-0000-0000-0000-000000000000"
          className="ua-text-body mt-1 block h-8 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 outline-none focus:border-[var(--ua-action-primary)] focus:shadow-[var(--ua-shadow-focus)]"
        />
      </label>
      <label className="ua-text-label block" htmlFor="privacy-subject-confirm">
        Type ERASE to confirm
        <input
          id="privacy-subject-confirm"
          type="text"
          autoComplete="off"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="ua-text-body mt-1 block h-8 w-full rounded-[var(--ua-radius-control)] border border-[var(--ua-border-default)] bg-[var(--ua-surface-primary)] px-3 outline-none focus:border-[var(--ua-action-primary)] focus:shadow-[var(--ua-shadow-focus)]"
        />
      </label>
      <Button
        type="button"
        variant="danger"
        loading={loading}
        disabled={!subjectId.trim() || confirmation !== "ERASE"}
        onClick={eraseSubject}
      >
        Erase customer data
      </Button>
      {message ? (
        <p role="status" aria-live="polite" className="ua-text-body" style={{ color: "var(--ua-text-secondary)" }}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
