'use client';

import { MailPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { INVITE_ROLES, type TeamRole } from '@/components/settings/teamManagementTypes';

type TeamInviteFormProps = {
  email: string;
  role: Exclude<TeamRole, 'owner'>;
  submitting: boolean;
  canManageTeam: boolean;
  currentUserRole: TeamRole | undefined;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: Exclude<TeamRole, 'owner'>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TeamInviteForm({
  email,
  role,
  submitting,
  canManageTeam,
  currentUserRole,
  onEmailChange,
  onRoleChange,
  onSubmit,
}: TeamInviteFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-[var(--ua-radius-control)] border p-4"
      style={{ background: 'var(--ua-surface-primary)', borderColor: 'var(--ua-border-subtle)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Invite teammate</h2>
          <p className="mt-1 text-[length:var(--ua-text-metadata-size)]" style={{ color: 'var(--ua-text-secondary)' }}>
            Invite up to 50 teammates per hour with a magic-link email.
          </p>
        </div>
        <MailPlus className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--ua-icon-secondary)' }} />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <label className="space-y-1">
          <span className="block text-xs font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            disabled={!canManageTeam || submitting}
            required
            placeholder="name@company.com"
            className="h-8 w-full rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-caption-size)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
            style={{ background: 'var(--ua-surface-secondary)', border: '1px solid var(--ua-border-default)', color: 'var(--ua-text-primary)', outlineColor: 'var(--ua-action-primary)' }}
          />
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Role</span>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as Exclude<TeamRole, 'owner'>)}
            disabled={!canManageTeam || submitting}
            className="h-8 w-full rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-caption-size)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
            style={{ background: 'var(--ua-surface-secondary)', border: '1px solid var(--ua-border-default)', color: 'var(--ua-text-primary)', outlineColor: 'var(--ua-action-primary)' }}
          >
            {INVITE_ROLES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={!canManageTeam || submitting}
          className="inline-flex h-8 items-center justify-center gap-2 self-end rounded-[var(--ua-radius-control)] px-3 text-[length:var(--ua-text-metadata-size)] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
        >
          <MailPlus className="h-4 w-4" />
          {submitting ? 'Sending…' : 'Invite'}
        </button>
      </div>

      {!canManageTeam ? (
        <p className="text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
          Your {currentUserRole ?? 'current'} role can view the team but cannot invite users or change roles.
        </p>
      ) : null}
    </form>
  );
}
