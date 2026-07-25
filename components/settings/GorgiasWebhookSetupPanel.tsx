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
        className="text-xs font-medium"
        style={{ color: "var(--ua-text-secondary)" }}
      >
        {label}
      </p>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: "color-mix(in srgb, var(--ua-text-primary) 5%, transparent)",
        }}
      >
        <span
          className={`flex-1 truncate text-xs ${mono ? "font-mono" : ""}`}
          style={{ color: "var(--ua-text-primary)" }}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={() => onCopy(field, value)}
          className="shrink-0 ml-1"
          style={{ color: copied ? "var(--ua-success)" : "var(--ua-text-secondary)" }}
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
          borderColor: "color-mix(in srgb, var(--ua-warning) 35%, var(--ua-border-default))",
          background: "color-mix(in srgb, var(--ua-warning) 8%, var(--ua-surface-primary))",
        }}
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0 mt-0.5"
          style={{ color: "var(--ua-warning)" }}
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold" style={{ color: "var(--ua-text-primary)" }}>
            Copy your secret now
          </p>
          <p className="text-xs" style={{ color: "var(--ua-text-secondary)" }}>
            {secret.warning} This secret is shown once — if you lose it, rotate
            it from the connection settings.
          </p>
        </div>
      </Card>

      {/* Credentials to copy */}
      <Card unstyled variant="panel" className="divide-y p-4 space-y-3">
        <p
          className="text-[length:var(--ua-text-micro-size)] font-semibold pb-3"
          style={{
            color: "var(--ua-text-secondary)",
            borderColor: "var(--ua-border-default)",
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
            className="text-[length:var(--ua-text-micro-size)] font-semibold"
            style={{ color: "var(--ua-text-secondary)" }}
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
            style={{ borderColor: "var(--ua-border-default)" }}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5"
              style={{
                background:
                  "color-mix(in srgb, var(--ua-text-secondary) 10%, transparent)",
                color: "var(--ua-text-secondary)",
              }}
            >
              {i + 1}
            </span>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--ua-text-secondary)" }}
            >
              {step}
            </p>
          </div>
        ))}
      </Card>

      <button
        type="button"
        onClick={onDismiss}
        className="text-xs font-medium underline"
        style={{ color: "var(--ua-text-secondary)" }}
      >
        I saved the secret — hide this panel
      </button>
    </div>
  );
}
