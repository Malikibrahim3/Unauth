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
        className="text-[11px] font-medium leading-4 text-[#64686d]"
        style={{ color: "#64686d" }}
      >
        {label}
      </p>
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          background: "color-mix(in srgb, #1c1f23 5%, transparent)",
        }}
      >
        <span
          className={`text-[12px] leading-[1.45] text-[#40454a] flex-1 truncate ${mono ? "font-mono" : ""}`}
          style={{ color: "#1c1f23" }}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={() => onCopy(field, value)}
          className="shrink-0 ml-1"
          style={{ color: copied ? "#1a6b43" : "#64686d" }}
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
          borderColor: "color-mix(in srgb, #7a5310 35%, #e4e3e0)",
          background: "color-mix(in srgb, #7a5310 8%, #fff)",
        }}
      >
        <AlertTriangle
          className="h-4 w-4 shrink-0 mt-0.5"
          style={{ color: "#7a5310" }}
        />
        <div className="space-y-1">
          <p className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: "#1c1f23" }}>
            Copy your secret now
          </p>
          <p className="text-[11.5px] leading-[1.45] text-[#64686d]" style={{ color: "#64686d" }}>
            {secret.warning} This secret is shown once — if you lose it, rotate
            it from the connection settings.
          </p>
        </div>
      </Card>

      {/* Credentials to copy */}
      <Card unstyled variant="panel" className="divide-y p-4 space-y-3">
        <p
          className="text-[11px] font-medium leading-4 text-[#64686d] pb-3"
          style={{
            color: "#64686d",
            borderColor: "#e4e3e0",
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
            className="text-[11px] font-medium leading-4 text-[#64686d]"
            style={{ color: "#64686d" }}
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
            style={{ borderColor: "#e4e3e0" }}
          >
            <span
              className="text-[11px] font-medium leading-4 text-[#64686d] flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-bold mt-0.5"
              style={{
                background:
                  "color-mix(in srgb, #64686d 10%, transparent)",
                color: "#64686d",
              }}
            >
              {i + 1}
            </span>
            <p
              className="text-[11.5px] leading-[1.45] text-[#64686d] leading-relaxed"
              style={{ color: "#64686d" }}
            >
              {step}
            </p>
          </div>
        ))}
      </Card>

      <button
        type="button"
        onClick={onDismiss}
        className="text-[11px] font-medium leading-4 text-[#64686d] underline"
        style={{ color: "#64686d" }}
      >
        I saved the secret — hide this panel
      </button>
    </div>
  );
}
