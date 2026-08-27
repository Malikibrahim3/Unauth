"use client";

import { Check, Copy, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui";
import type {
  GorgiasEphemeralSecret,
  GorgiasSupportSyncState,
} from "@/components/settings/gorgiasSupportSyncReducer";
import { GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME } from "@/lib/support/gorgias/supportConnectionShared";

type Props = {
  secret: GorgiasEphemeralSecret;
  canManage: boolean;
  copiedField: GorgiasSupportSyncState["copiedField"];
  onCopy: (field: string, value: string) => void;
  onDismiss: () => void;
};

function CopyRow({
  label,
  value,
  field,
  mono,
  copiedField,
  onCopy,
}: {
  label: string;
  value: string;
  field: string;
  mono?: boolean;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
}) {
  const copied = copiedField === field;
  return (
    <div className="space-y-1.5">
      <p
        className="ua-text-label"
        style={{ color: "var(--uo-route-text-secondary)" }}
      >
        {label}
      </p>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: "color-mix(in srgb, var(--uo-route-text-primary) 5%, transparent)",
        }}
      >
        <span
          className={`ua-text-dense flex-1 truncate ${mono ? "font-mono" : ""}`}
          style={{ color: "var(--uo-route-text-primary)" }}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={() => onCopy(field, value)}
          className="shrink-0 ml-1"
          style={{ color: copied ? "var(--uo-route-success)" : "var(--uo-route-text-secondary)" }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function GorgiasWebhookSetupPanel({
  secret,
  canManage,
  copiedField,
  onCopy,
  onDismiss,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Warning banner */}
      <Card unstyled
        variant="muted"
        className="flex gap-3 px-4 py-3"
        style={{
          borderColor: "color-mix(in srgb, var(--uo-route-warning) 35%, var(--uo-route-border-default))",
          background: "color-mix(in srgb, var(--uo-route-warning) 8%, var(--uo-route-surface-primary))",
        }}
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0 mt-0.5"
          style={{ color: "var(--uo-route-warning)" }}
        />
        <div className="space-y-1">
          <p className="ua-text-working-title" style={{ color: "var(--uo-route-text-primary)" }}>
            Copy your secret now
          </p>
          <p className="ua-text-caption-role" style={{ color: "var(--uo-route-text-secondary)" }}>
            {secret.warning} This secret is shown once — if you lose it, rotate
            it from the connection settings.
          </p>
        </div>
      </Card>

      {/* Credentials to copy */}
      <Card unstyled variant="panel" className="divide-y p-4 space-y-3">
        <p
          className="ua-text-label pb-3"
          style={{
            color: "var(--uo-route-text-secondary)",
            borderColor: "var(--uo-route-border-default)",
          }}
        >
          Webhook credentials
        </p>
        <div className="pt-3 space-y-3">
          <CopyRow
            label="Webhook URL"
            value={secret.webhookUrl}
            field="webhookUrl"
            copiedField={canManage ? copiedField : null}
            onCopy={onCopy}
          />
          <CopyRow
            label="Header name"
            value={secret.headerName}
            field="headerName"
            mono
            copiedField={canManage ? copiedField : null}
            onCopy={onCopy}
          />
          <CopyRow
            label="Secret value"
            value={secret.secret}
            field="secret"
            mono
            copiedField={canManage ? copiedField : null}
            onCopy={onCopy}
          />
        </div>
      </Card>

      {/* Setup steps */}
      <Card unstyled variant="panel" className="divide-y p-0">
        <div className="px-4 py-2.5">
          <p
            className="ua-text-label"
            style={{ color: "var(--uo-route-text-secondary)" }}
          >
            How to configure in Gorgias
          </p>
        </div>
        {[
          "Go to Gorgias, then Settings, then Apps & Plugins, then HTTP Integration, then Add HTTP Integration",
          "Set Request type to POST and paste the Webhook URL above into the URL field",
          `Under Headers, add: name = ${GORGIAS_SUPPORT_WEBHOOK_HEADER_NAME}, value = the secret above`,
          "Add a second header: name = x-gorgias-account-id, value = your numeric Gorgias account ID (visible in your Gorgias URL)",
          "Click Save, then use the Send test button to confirm Unauth receives the event",
        ].map((step, i) => (
          <div
            key={step}
            className="flex gap-3 px-4 py-3"
            style={{ borderColor: "var(--uo-route-border-default)" }}
          >
            <span
              className="ua-text-label flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold mt-0.5"
              style={{
                background:
                  "color-mix(in srgb, var(--uo-route-text-secondary) 10%, transparent)",
                color: "var(--uo-route-text-secondary)",
              }}
            >
              {i + 1}
            </span>
            <p
              className="ua-text-caption-role leading-relaxed"
              style={{ color: "var(--uo-route-text-secondary)" }}
            >
              {step}
            </p>
          </div>
        ))}
      </Card>

      <button
        type="button"
        onClick={onDismiss}
        className="ua-text-label underline"
        style={{ color: "var(--uo-route-text-secondary)" }}
      >
        I saved the secret — hide this panel
      </button>
    </div>
  );
}
