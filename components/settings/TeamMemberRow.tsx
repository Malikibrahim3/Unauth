'use client';

import { Check, Clock, Trash2 } from 'lucide-react';
import {
  formatTeamDate,
  STATUS_LABELS,
  UI_ASSIGNABLE_ROLES,
  uiRoleForMember,
  type TeamMember,
  type TeamRole,
} from '@/components/settings/teamManagementTypes';

type TeamMemberRowProps = {
  member: TeamMember;
  canManageTeam: boolean;
  isAccountOwner: boolean;
  busyMemberId: string | null;
  confirmingId: string | null;
  onChangeRole: (member: TeamMember, nextRole: TeamRole) => void;
  onConfirmRemove: (memberId: string) => void;
  onCancelRemove: () => void;
  onRemove: (member: TeamMember) => void;
};

export function TeamMemberRow({
  member,
  canManageTeam,
  isAccountOwner,
  busyMemberId,
  confirmingId,
  onChangeRole,
  onConfirmRemove,
  onCancelRemove,
  onRemove,
}: TeamMemberRowProps) {
  const isOwnerRow = member.is_account_owner === true;
  const canChangeThisRole =
    canManageTeam &&
    !isOwnerRow &&
    (isAccountOwner || member.role !== 'owner');
  const canRemoveThisMember = canManageTeam && !isOwnerRow && member.role !== 'owner';
  const roleDisabled = busyMemberId === member.id || !canChangeThisRole;

  return (
    <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_170px_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--ua-text-primary)' }}>{member.invited_email}</p>
          {member.invite_status === 'pending' ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--ua-surface-secondary)', color: 'var(--ua-text-secondary)' }}>
              <Clock className="h-3 w-3" /> Pending
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--ua-success-bg)', color: 'var(--ua-text-primary)' }}>
              <Check className="h-3 w-3" /> {STATUS_LABELS[member.invite_status]}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
          {member.is_account_owner
            ? 'Account owner'
            : member.invite_status === 'pending'
              ? `Invited ${formatTeamDate(member.created_at)}`
              : `Joined: ${formatTeamDate(member.accepted_at)}`}
        </p>
      </div>

      <select
        value={uiRoleForMember(member.role)}
        onChange={(event) => onChangeRole(member, event.target.value as TeamRole)}
        disabled={roleDisabled}
        aria-label={`Role for ${member.invited_email}`}
        className="rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
        style={{ background: 'var(--ua-surface-secondary)', border: '1px solid var(--ua-border-default)', color: 'var(--ua-text-primary)', outlineColor: 'var(--ua-action-primary)' }}
      >
        {UI_ASSIGNABLE_ROLES.map((roleOption) => (
          <option
            key={roleOption}
            value={roleOption}
            disabled={roleOption === 'owner' && (!isAccountOwner || member.invite_status !== 'active')}
          >
            {roleOption === 'owner' ? 'Owner' : 'Analyst'}
          </option>
        ))}
      </select>

      {confirmingId === member.id ? (
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onRemove(member)}
            disabled={busyMemberId === member.id}
            className="inline-flex items-center rounded-md px-2.5 py-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-50"
            style={{ background: 'var(--ua-risk-critical)', color: 'var(--ua-text-inverse)', outlineColor: 'var(--ua-risk-critical)' }}
          >
            {busyMemberId === member.id ? 'Removing…' : 'Remove'}
          </button>
          <button
            type="button"
            onClick={onCancelRemove}
            className="inline-flex items-center rounded-md border px-2.5 py-1.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{ borderColor: 'var(--ua-border-subtle)', color: 'var(--ua-text-secondary)', outlineColor: 'var(--ua-action-primary)' }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onConfirmRemove(member.id)}
          disabled={!canRemoveThisMember || busyMemberId === member.id}
          aria-label={`Remove ${member.invited_email}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ border: '1px solid var(--ua-border-default)', color: 'var(--ua-text-secondary)', outlineColor: 'var(--ua-action-primary)' }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
