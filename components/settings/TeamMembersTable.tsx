'use client';

import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Select';
import type { RowAction } from '@/components/ui/RowActionsMenu';
import {
  formatTeamJoinState,
  ROLE_LABELS,
  UI_ASSIGNABLE_ROLES,
  uiRoleForMember,
  type TeamMember,
  type TeamRole,
} from '@/components/settings/teamManagementTypes';

type TeamMembersTableProps = {
  members: TeamMember[];
  loading: boolean;
  canManageTeam: boolean;
  isAccountOwner: boolean;
  currentUserId: string | null;
  currentUserRole: TeamRole | null;
  busyMemberId: string | null;
  onChangeRole: (member: TeamMember, nextRole: TeamRole) => void;
  onRemove: (member: TeamMember) => void;
  emptyState: React.ReactNode;
};

function initials(email: string) {
  const [local] = email.split('@');
  return (local ?? email).slice(0, 2).toUpperCase();
}

/**
 * Canonical member table (spec §6.6, §7.8): identity, role, status, joined date,
 * and a shared row-action menu. Row actions stay secondary; the destructive one
 * is confirmed by the caller rather than firing from the menu.
 */
export function TeamMembersTable({
  members,
  loading,
  canManageTeam,
  isAccountOwner,
  currentUserId,
  currentUserRole,
  busyMemberId,
  onChangeRole,
  onRemove,
  emptyState,
}: TeamMembersTableProps) {
  return (
    <DataTable
      density="metadata"
      loading={loading}
      rows={members}
      getRowKey={(member) => member.id}
      emptyState={emptyState}
      columns={[
        {
          key: 'member',
          header: 'Member',
          render: (member) => (
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--uo-route-radius-round)] bg-[var(--uo-route-surface-secondary)] text-[length:var(--uo-route-text-metadata-size)] font-medium text-[var(--uo-route-text-secondary)]"
              >
                {initials(member.invited_email)}
              </span>
              <span className="min-w-0 truncate text-[length:var(--uo-route-text-dense-size)] font-medium text-[var(--uo-route-text-primary)]">
                {member.invited_email}
              </span>
              {member.is_account_owner ? (
                <span className="shrink-0 rounded-[var(--uo-route-badge-radius-meta)] border border-[var(--uo-route-border-subtle)] bg-[var(--uo-route-surface-secondary)] px-1.5 py-px text-[length:var(--uo-route-text-metadata-size)] font-medium text-[var(--uo-route-text-secondary)]">
                  Account owner
                </span>
              ) : null}
            </div>
          ),
        },
        {
          key: 'role',
          header: 'Role',
          width: '160px',
          render: (member) => {
            const isOwnerRow = member.is_account_owner === true;
            const isSelf = member.user_id != null && member.user_id === currentUserId;
            const canChange =
              canManageTeam
              && !isOwnerRow
              && !isSelf
              && (isAccountOwner || (currentUserRole === 'admin' && (member.role === 'analyst' || member.role === 'viewer')));
            if (!canChange) {
              return (
                <span className="text-[length:var(--uo-route-text-dense-size)] text-[var(--uo-route-text-secondary)]">
                  {ROLE_LABELS[member.role]}
                </span>
              );
            }
            return (
              <Select
                aria-label={`Role for ${member.invited_email}`}
                value={uiRoleForMember(member.role)}
                disabled={busyMemberId === member.id}
                onChange={(event) => onChangeRole(member, event.target.value as TeamRole)}
              >
                {UI_ASSIGNABLE_ROLES.filter((value) => {
                  if (currentUserRole === 'admin') return value === 'analyst' || value === 'viewer';
                  if (value === 'owner') return member.invite_status === 'active';
                  return true;
                }).map((value) => (
                  <option key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </option>
                ))}
              </Select>
            );
          },
        },
        {
          key: 'status',
          header: 'Status',
          width: '120px',
          render: (member) => (
            <StatusBadge family="inviteStatus" value={member.invite_status} size="sm" />
          ),
        },
        {
          key: 'joined',
          header: 'Joined',
          width: '160px',
          render: (member) => (
            <span className="text-[length:var(--uo-route-text-dense-size)] tabular-nums text-[var(--uo-route-text-secondary)]">
              {formatTeamJoinState(member)}
            </span>
          ),
        },
      ]}
      rowActions={(member): RowAction[] => {
        const isOwnerRow = member.is_account_owner === true;
        const isSelf = member.user_id != null && member.user_id === currentUserId;
        const adminCanRemove = currentUserRole === 'admin' && (member.role === 'analyst' || member.role === 'viewer');
        if (!canManageTeam || isOwnerRow || isSelf || member.role === 'owner' || (!isAccountOwner && !adminCanRemove)) return [];
        return [
          {
            label: 'Remove from workspace',
            tone: 'danger',
            onSelect: () => onRemove(member),
          },
        ];
      }}
    />
  );
}
