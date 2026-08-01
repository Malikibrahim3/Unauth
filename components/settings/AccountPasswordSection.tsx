'use client';

import { Check, Eye, EyeOff } from 'lucide-react';
import { Button, Input, SectionCard } from '@/components/ui';
import type { AccountSettingsAction, AccountSettingsState } from '@/components/settings/accountSettingsReducer';

type Props = {
  state: AccountSettingsState;
  dispatch: React.Dispatch<AccountSettingsAction>;
  onSubmit: (e: React.FormEvent) => void;
};

export default function AccountPasswordSection({ state, dispatch, onSubmit }: Props) {
  return (
    <SectionCard joined title="Security" description="Password and access controls">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Change password</h2>
          <button
            type="button"
            onClick={() => dispatch({ type: 'patch', patch: { showPasswords: !state.showPasswords } })}
            className="text-xs flex items-center gap-1"
            style={{ color: 'var(--ua-text-secondary)' }}
          >
            {state.showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {state.showPasswords ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'New password', value: state.newPassword, field: 'newPassword' as const, placeholder: 'Min. 8 characters' },
            { label: 'Confirm new password', value: state.confirmPassword, field: 'confirmPassword' as const, placeholder: 'Repeat new password' },
          ].map(({ label, value, field, placeholder }) => (
            <div key={label}>
              <label htmlFor={`account-${label.toLowerCase().replace(/\s+/g, '-')}`} className="block text-xs font-semibold mb-1" style={{ color: 'var(--ua-text-primary)' }}>{label}</label>
              <Input
                id={`account-${label.toLowerCase().replace(/\s+/g, '-')}`}
                type={state.showPasswords ? 'text' : 'password'}
                value={value}
                onChange={(e) => dispatch({ type: 'patch', patch: { [field]: e.target.value } })}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {state.passwordError ? (
          <p className="text-xs" style={{ color: 'var(--ua-risk-critical)' }}>{state.passwordError}</p>
        ) : null}
        {state.passwordSuccess ? (
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ua-success)' }}>
            <Check className="h-3.5 w-3.5" /> {state.passwordSuccess}
          </p>
        ) : null}

        <Button type="submit" loading={state.passwordSaving} disabled={!state.newPassword}>
          {state.passwordSaving ? 'Updating…' : 'Update password'}
        </Button>
      </form>
    </SectionCard>
  );
}
