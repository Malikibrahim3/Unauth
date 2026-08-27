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
    <SectionCard joined title="Password" description="Your sign-in credential, saved separately from workspace settings">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>Change password</h2>
          <button
            type="button"
            onClick={() => dispatch({ type: 'patch', patch: { showPasswords: !state.showPasswords } })}
            className="ua-text-label flex items-center gap-1"
            style={{ color: 'var(--uo-route-text-secondary)' }}
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
              <label htmlFor={`account-${label.toLowerCase().replace(/\s+/g, '-')}`} className="ua-text-label block mb-1" style={{ color: 'var(--uo-route-text-primary)' }}>{label}</label>
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
          <p className="ua-text-caption-role" style={{ color: 'var(--uo-route-risk-critical)' }}>{state.passwordError}</p>
        ) : null}
        {state.passwordSuccess ? (
          <p className="ua-text-caption-role flex items-center gap-1" style={{ color: 'var(--uo-route-success)' }}>
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
