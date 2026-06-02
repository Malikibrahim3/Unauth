'use client';

import { AlertTriangle } from 'lucide-react';
import { Button, Input, SectionCard } from '@/components/ui';
import type { AccountSettingsAction, AccountSettingsState } from '@/components/settings/accountSettingsReducer';

type Props = {
  state: AccountSettingsState;
  dispatch: React.Dispatch<AccountSettingsAction>;
  onDelete: () => void;
};

export default function AccountDangerSection({ state, dispatch, onDelete }: Props) {
  return (
    <SectionCard
      title="Account"
      description="Destructive actions"
      className="border-[rgba(159,29,29,0.30)]"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" style={{ color: 'var(--risk-critical)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--risk-critical)' }}>Danger zone</h2>
        </div>

        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Delete your account</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            This permanently deletes all your audits, customer profiles, watchlist, and notes. This action cannot be undone.
          </p>
        </div>

        <div>
          <label htmlFor="account-delete-confirm" className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Type <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>DELETE</span> to confirm
          </label>
          <div className="flex gap-2">
            <Input
              id="account-delete-confirm"
              type="text"
              value={state.deleteConfirm}
              onChange={(e) => dispatch({ type: 'patch', patch: { deleteConfirm: e.target.value } })}
              placeholder="DELETE"
              className="px-3 py-2 rounded-md text-sm focus:outline-none w-40"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={state.deleteConfirm !== 'DELETE' || state.deleteLoading}
              loading={state.deleteLoading}
            >
              {state.deleteLoading ? 'Deleting…' : 'Delete account'}
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
