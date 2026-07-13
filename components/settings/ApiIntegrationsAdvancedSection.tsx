"use client";

import { useReducer, useState, type FormEvent } from "react";
import { useFetchJson } from "@/lib/react/useFetchJson";
import {
  apiIntegrationsReducer,
  initialApiIntegrationsState,
} from "@/components/settings/apiIntegrationsReducer";
import type { ApiKeyRow } from "@/components/settings/apiIntegrationsTypes";
import { ApiKeysListSection } from "@/components/settings/ApiIntegrationsKeyDialogs";
import { ApiKeyCreateDialog } from "@/components/settings/ApiKeyCreateDialog";
import { ApiKeyRevokeDialog } from "@/components/settings/ApiKeyRevokeDialog";
import { FeatureGate } from "@/components/product/FeatureGate";

export default function ApiIntegrationsAdvancedSection() {
  const [state, dispatch] = useReducer(
    apiIntegrationsReducer,
    initialApiIntegrationsState,
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);

  const {
    data: keysData,
    loading,
    reload: reloadKeys,
    error: keysError,
  } = useFetchJson<{ keys?: ApiKeyRow[] }>("/api/settings/api-keys", {
    parse: async (response) => {
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Failed to load API keys");
      return body;
    },
  });
  const keys = keysData?.keys ?? [];

  async function createKey(event: FormEvent) {
    event.preventDefault();
    dispatch({ type: "patch", patch: { creating: true, message: null } });
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: state.keyName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create key");
      dispatch({
        type: "patch",
        patch: {
          createdSecret: body.key?.secret ?? null,
          createdWidgetToken: body.key?.widget_token ?? null,
          keyName: "",
          creating: false,
        },
      });
      reloadKeys();
    } catch (err) {
      dispatch({
        type: "patch",
        patch: {
          creating: false,
          message: {
            type: "error",
            text: err instanceof Error ? err.message : "Failed to create key",
          },
        },
      });
    }
  }

  async function revokeKey(key: ApiKeyRow) {
    dispatch({ type: "patch", patch: { busyId: key.id, message: null } });
    closeRevokeModal();
    try {
      const res = await fetch(`/api/settings/api-keys/${key.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to revoke key");
      dispatch({
        type: "patch",
        patch: {
          message: { type: "success", text: `Revoked "${key.name}".` },
          busyId: null,
        },
      });
      reloadKeys();
    } catch (err) {
      dispatch({
        type: "patch",
        patch: {
          busyId: null,
          message: {
            type: "error",
            text: err instanceof Error ? err.message : "Failed to revoke key",
          },
        },
      });
    }
  }

  async function copySecret() {
    if (!state.createdSecret) return;
    await navigator.clipboard.writeText(state.createdSecret);
    dispatch({ type: "patch", patch: { copied: true } });
    window.setTimeout(
      () => dispatch({ type: "patch", patch: { copied: false } }),
      2000,
    );
  }

  async function copyWidgetToken() {
    if (!state.createdWidgetToken) return;
    await navigator.clipboard.writeText(state.createdWidgetToken);
    dispatch({ type: "patch", patch: { copied: true } });
    window.setTimeout(
      () => dispatch({ type: "patch", patch: { copied: false } }),
      2000,
    );
  }

  function closeCreateModal() {
    setCreateModalOpen(false);
    dispatch({ type: "clearCreated" });
  }

  function openCreateModal() {
    setCreateModalOpen(true);
  }

  function openRevokeModal(key: ApiKeyRow) {
    dispatch({ type: "patch", patch: { revokeTarget: key } });
    setRevokeModalOpen(true);
  }

  function closeRevokeModal() {
    setRevokeModalOpen(false);
    dispatch({ type: "patch", patch: { revokeTarget: null } });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Advanced &amp; optional
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          API keys for custom integrations. Not required for the core Shopify +
          Gorgias workflow.
        </p>
      </div>

      {state.message ? (
        <p
          role={state.message.type === "error" ? "alert" : "status"}
          className="rounded-md px-3 py-2 text-sm"
          style={{
            background:
              state.message.type === "error"
                ? "var(--danger-bg)"
                : "var(--success-bg)",
            color:
              state.message.type === "error"
                ? "var(--danger-fg)"
                : "var(--success-fg)",
          }}
        >
          {state.message.text}
        </p>
      ) : null}

      <FeatureGate entitlement="LIVE_LOOKUP_API" plan="enterprise">
        <ApiKeysListSection
          keys={keys}
          loading={loading}
          keysError={keysError}
          busyId={state.busyId}
          onOpenCreateModal={openCreateModal}
          onOpenRevokeModal={openRevokeModal}
        />
      </FeatureGate>

      <ApiKeyCreateDialog
        open={createModalOpen}
        state={state}
        onClose={closeCreateModal}
        onCreate={createKey}
        onCopySecret={() => {
          void copySecret();
        }}
        onCopyWidgetToken={() => {
          void copyWidgetToken();
        }}
        onKeyNameChange={(value) =>
          dispatch({ type: "patch", patch: { keyName: value } })
        }
      />

      <ApiKeyRevokeDialog
        open={revokeModalOpen}
        revokeTarget={state.revokeTarget}
        busyId={state.busyId}
        onClose={closeRevokeModal}
        onRevoke={revokeKey}
      />
    </div>
  );
}
