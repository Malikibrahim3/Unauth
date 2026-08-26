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
import { OperationalState } from "@/components/ui";
import styles from '@/components/settings/OperationsSettings.module.css';

export default function ApiIntegrationsAdvancedSection({
  machineAccessEnabled,
}: {
  machineAccessEnabled: boolean;
}) {
  const [state, dispatch] = useReducer(
    apiIntegrationsReducer,
    initialApiIntegrationsState,
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const {
    data: keysData,
    loading,
    reload: reloadKeys,
    error: keysError,
  } = useFetchJson<{ keys?: ApiKeyRow[] }>("/api/settings/api-keys", {
    enabled: machineAccessEnabled,
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
        body: JSON.stringify({
          name: state.keyName.trim(),
          scopes: state.scopes,
          rateLimitPerMinute: state.rateLimitPerMinute,
        }),
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
    setRevokeError(null);
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
      closeRevokeModal();
      reloadKeys();
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "Failed to revoke key");
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
    setRevokeError(null);
    dispatch({ type: "patch", patch: { revokeTarget: key } });
    setRevokeModalOpen(true);
  }

  function closeRevokeModal() {
    setRevokeError(null);
    setRevokeModalOpen(false);
    dispatch({ type: "patch", patch: { revokeTarget: null } });
  }

  return (
    <div className={styles.stack}>
      <div className={styles.boundaryNotice}><strong>API keys read data and create imports.</strong> No key can record a merchant decision, publish a rule, write off a recovery or delete a record — those actions require a signed-in person with the permission.</div>

      {state.message ? (
        <p
          role={state.message.type === "error" ? "alert" : "status"}
          className={styles.message}
          data-tone={state.message.type}
        >
          {state.message.text}
        </p>
      ) : null}

      {machineAccessEnabled ? (
        <ApiKeysListSection
          keys={keys}
          loading={loading}
          keysError={keysError}
          busyId={state.busyId}
          onOpenCreateModal={openCreateModal}
          onOpenRevokeModal={openRevokeModal}
        />
      ) : (
        <section className={styles.card} data-operations-surface="api-access">
          <OperationalState
            kind="permission"
            title="Enterprise API access is not enabled"
            description="Key creation and existing machine credentials remain unavailable until the workspace has an active or grace-period Enterprise subscription. Signed-in product access does not grant machine access."
          />
        </section>
      )}

      <section className={styles.card}>
        <div className={styles.cardHeading}><div><h2>Creating a key</h2><p>Scope it to the least it needs.</p></div></div>
        <div className={styles.apiLifecycle}>
          <div><strong>Name and owner</strong><p>A key belongs to the workspace, not a person, but records who created it.</p></div>
          <div><strong>Scopes</strong><p>Chosen once. Read scopes stay within the selected object families; import is the only write boundary.</p></div>
          <div><strong>Rate limit</strong><p>Fixed at creation and stated in the API response headers.</p></div>
          <div><strong>The secret is shown once</strong><p>Unauth stores a hash, not the recoverable key.</p></div>
        </div>
        <div className={styles.apiRevealExample}><strong>Reveal-once lifecycle</strong><p>Closing the reveal is final. If the secret is lost, revoke the key and create another — there is no way to recover it.</p></div>
      </section>

      {machineAccessEnabled ? <ApiKeyCreateDialog
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
        onScopesChange={(scopes) => dispatch({ type: 'patch', patch: { scopes } })}
        onRateLimitChange={(rateLimitPerMinute) => dispatch({ type: 'patch', patch: { rateLimitPerMinute } })}
      /> : null}

      {machineAccessEnabled ? <ApiKeyRevokeDialog
        open={revokeModalOpen}
        revokeTarget={state.revokeTarget}
        busyId={state.busyId}
        error={revokeError}
        onClose={closeRevokeModal}
        onRevoke={revokeKey}
      /> : null}
    </div>
  );
}
