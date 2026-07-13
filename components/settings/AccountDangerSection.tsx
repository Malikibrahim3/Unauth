"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Input, SectionCard } from "@/components/ui";
import type {
  AccountSettingsAction,
  AccountSettingsState,
} from "@/components/settings/accountSettingsReducer";

type Props = {
  state: AccountSettingsState;
  dispatch: React.Dispatch<AccountSettingsAction>;
  onDelete: () => void;
};

export default function AccountDangerSection({
  state,
  dispatch,
  onDelete,
}: Props) {
  return (
    <SectionCard
      title="Account"
      description="Destructive actions"
      style={{
        borderColor: "color-mix(in srgb, var(--success) 30%, var(--border))",
      }}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-4 w-4"
            style={{ color: "var(--risk-critical)" }}
          />
          <h2
            className="text-sm font-semibold"
            style={{ color: "var(--risk-critical)" }}
          >
            Danger zone
          </h2>
        </div>

        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
            Delete your account
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            This permanently deletes your imported history, customer records,
            case evidence, and notes. This action cannot be undone.
          </p>
        </div>

        <div>
          <label
            htmlFor="account-delete-confirm"
            className="block text-xs mb-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Type{" "}
            <span
              className="font-mono font-bold"
              style={{ color: "var(--text)" }}
            >
              DELETE
            </span>{" "}
            to confirm
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="account-delete-confirm"
              type="text"
              value={state.deleteConfirm}
              onChange={(e) =>
                dispatch({
                  type: "patch",
                  patch: { deleteConfirm: e.target.value },
                })
              }
              placeholder="DELETE"
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none sm:w-40"
              style={{
                background: "var(--bg-inset)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={state.deleteConfirm !== "DELETE" || state.deleteLoading}
              loading={state.deleteLoading}
              className="w-full sm:w-auto"
            >
              {state.deleteLoading ? "Deleting…" : "Delete account"}
            </Button>
          </div>
          {state.deleteError ? (
            <p
              role="alert"
              className="mt-2 text-xs text-[var(--risk-critical)]"
            >
              {state.deleteError}
            </p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
