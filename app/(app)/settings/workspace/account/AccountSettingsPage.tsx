"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFetchJson } from "@/lib/react/useFetchJson";
import {
  accountSettingsReducer,
  initialAccountSettingsState,
  type MerchantData,
} from "@/components/settings/accountSettingsReducer";
import AccountProfileSection from "@/components/settings/AccountProfileSection";
import AccountPasswordSection from "@/components/settings/AccountPasswordSection";
import AppearanceSettings from "@/components/settings/AppearanceSettings";
import { useSettingsPermissions } from "@/components/settings/SettingsAccessContext";
import { Bone, Button, OperationalState, SettingsPageShell, Surface } from "@/components/ui";
import { PERMISSIONS } from "@/lib/permissions";

export type AccountSetupPayload = {
  user?: { email?: string };
  merchant?: MerchantData | null;
};

function AccountSettingsForm({
  initialData,
  canManageWorkspace,
}: {
  initialData: AccountSetupPayload;
  canManageWorkspace: boolean;
}) {
  const supabase = createClient();
  const settingsPermissions = new Set(useSettingsPermissions());
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [state, dispatch] = useReducer(
    accountSettingsReducer,
    initialData,
    (data) => accountSettingsReducer(initialAccountSettingsState, {
      type: "loadAccount",
      userEmail: data.user?.email ?? "",
      merchant: data.merchant ?? null,
    }),
  );
  const remoteSetup = useFetchJson<AccountSetupPayload>("/api/account/setup", {
    enabled: remoteEnabled,
  });
  const setupData = remoteSetup.data ?? initialData;
  const setupError = remoteSetup.error;
  const setupLoading = remoteEnabled && remoteSetup.loading;
  const reloadSetup = () => {
    if (remoteEnabled) remoteSetup.reload();
    else setRemoteEnabled(true);
  };

  useEffect(() => {
    if (!setupData) return;
    dispatch({
      type: "loadAccount",
      userEmail: setupData.user?.email ?? "",
      merchant: setupData.merchant ?? null,
    });
  }, [setupData]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    dispatch({
      type: "patch",
      patch: { saving: true, saveError: "", saveSuccess: false },
    });
    try {
      if (!state.merchant) {
        dispatch({
          type: "patch",
          patch: {
            saveError:
              "Still loading your store profile. Wait a moment and try again.",
            saving: false,
          },
        });
        return;
      }
      const res = await fetch("/api/account/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: state.storeName.trim(),
          monthlyOrderVolume: state.monthlyVolume || null,
          primaryLossConcern: state.fraudConcern || null,
          setupComplete: state.merchant.setup_complete,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not save merchant profile.");
      }
      dispatch({
        type: "profileSaved",
        merchant: {
          ...state.merchant,
          name: state.storeName.trim(),
          monthly_order_volume: state.monthlyVolume || null,
          primary_fraud_concern: state.fraudConcern || null,
        },
      });
      window.setTimeout(
        () => dispatch({ type: "patch", patch: { saveSuccess: false } }),
        4000,
      );
    } catch (e: unknown) {
      dispatch({
        type: "patch",
        patch: { saveError: (e as Error).message, saving: false },
      });
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    dispatch({
      type: "patch",
      patch: { passwordError: "", passwordSuccess: "" },
    });
    if (state.newPassword.length < 8) {
      dispatch({
        type: "patch",
        patch: { passwordError: "New password must be at least 8 characters." },
      });
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      dispatch({
        type: "patch",
        patch: { passwordError: "Passwords do not match." },
      });
      return;
    }
    dispatch({ type: "patch", patch: { passwordSaving: true } });
    try {
      const { error } = await supabase.auth.updateUser({
        password: state.newPassword,
      });
      if (error) throw error;
      dispatch({
        type: "patch",
        patch: {
          passwordSuccess: "Password updated successfully.",
          newPassword: "",
          confirmPassword: "",
          passwordSaving: false,
        },
      });
      window.setTimeout(
        () => dispatch({ type: "patch", patch: { passwordSuccess: "" } }),
        5000,
      );
    } catch (e: unknown) {
      dispatch({
        type: "patch",
        patch: { passwordError: (e as Error).message, passwordSaving: false },
      });
    }
  }

  const accountTruth = {
    access: canManageWorkspace ? "Workspace profile: owner or administrator · password and theme: you" : "Workspace profile: read-only · password and theme: you",
    currentState: state.merchant ? `Workspace ${state.merchant.name} · theme saved on this device` : "Workspace profile is still being verified",
    saveBehavior: "Profile and password save separately · theme applies immediately",
    impact: "Profile affects future workspace context; theme affects signed-in pages on this device only",
  };

  if (setupLoading && !setupData) {
    return (
      <SettingsPageShell
        title="Account"
        subtitle="Update your store profile, account credentials, and workspace preferences."
        surfaceId="account-and-appearance"
        truth={accountTruth}
      >
        <Surface structure="working" role="status" aria-busy="true" aria-label="Loading account settings">
          {["Profile", "Appearance", "Password"].map((section) => (
            <div key={section} className="space-y-3 border-b border-[var(--uo-route-border-subtle)] p-5 last:border-b-0">
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-full max-w-lg" />
              <Bone className="h-8 w-full" />
            </div>
          ))}
        </Surface>
      </SettingsPageShell>
    );
  }

  if (setupError && !setupData) {
    return (
      <SettingsPageShell
        title="Account"
        subtitle="Update your store profile, account credentials, and workspace preferences."
        surfaceId="account-and-appearance"
        truth={accountTruth}
      >
        <Surface structure="working">
          <OperationalState
            kind="error"
            title="Account settings unavailable"
            description={`${setupError} No profile values are shown because a verified workspace profile was not loaded.`}
            action={<Button variant="secondary" onClick={reloadSetup}>Try again</Button>}
          />
        </Surface>
      </SettingsPageShell>
    );
  }

  return (
    <SettingsPageShell
      title="Account"
      subtitle={canManageWorkspace
        ? "Update your store profile, account credentials, and workspace preferences."
        : "Manage your account credentials and device appearance. Workspace administration is restricted to administrators and owners."}
      surfaceId="account-and-appearance"
      truth={accountTruth}
    >
      <Surface structure="working">
        {setupError && setupData ? (
          <div
            className="border-b border-[var(--uo-route-critical-border)] bg-[var(--uo-route-critical-bg)] px-4 py-3 text-[length:var(--uo-route-text-caption-size)] text-[var(--uo-route-text-primary)]"
            role="alert"
          >
            <p className="font-medium">Account details may be stale.</p>
            <p className="mt-1">{setupError} The last verified profile remains visible; no value was replaced with an empty fallback.</p>
            <button
              type="button"
              className="mt-2 underline"
              onClick={reloadSetup}
            >
              Try again
            </button>
          </div>
        ) : null}
        {canManageWorkspace ? (
          <AccountProfileSection
            state={state}
            dispatch={dispatch}
            onSave={handleProfileSave}
          />
        ) : (
          <OperationalState
            kind="permission"
            title="Workspace profile is read-only for your role"
            description={`You are signed in to ${state.merchant?.name ?? "this workspace"}. An administrator or owner must change its business name and operating profile.`}
          />
        )}
        <AppearanceSettings />
        <AccountPasswordSection
          state={state}
          dispatch={dispatch}
          onSubmit={handlePasswordChange}
        />
      </Surface>
      <Surface structure="working" className="ua-settings-related" aria-label="Related account settings">
        <header>
          <h2>Related account settings</h2>
          <p>Only destinations permitted for your active workspace role are shown.</p>
        </header>
        <div>
          {settingsPermissions.has(PERMISSIONS.VIEW_INBOX) ? <Link href="/settings/product/notifications"><span>Notification preferences</span><small>Choose which operational events reach your inbox.</small></Link> : null}
          {settingsPermissions.has(PERMISSIONS.VIEW_AUDIT_TRAIL) ? <Link href="/settings/legal/data-privacy"><span>Data and privacy</span><small>Access or erase subject data, export scoped records, or run the owner-only workspace deletion job.</small></Link> : null}
          {settingsPermissions.has(PERMISSIONS.MANAGE_SETTINGS) ? <Link href="/settings/legal/agreements"><span>Agreements</span><small>Manage verified commercial terms used in recovery review.</small></Link> : null}
        </div>
      </Surface>
    </SettingsPageShell>
  );
}

export default function AccountSettingsPage({
  initialData,
  canManageWorkspace,
}: {
  initialData: AccountSetupPayload;
  canManageWorkspace: boolean;
}) {
  return <AccountSettingsForm initialData={initialData} canManageWorkspace={canManageWorkspace} />;
}
