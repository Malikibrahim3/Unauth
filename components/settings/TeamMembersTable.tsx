'use client';

import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Select } from '@/components/ui/Select';
import type { RowAction } from '@/components/ui/RowActionsMenu';
import {
  formatTeamDate,
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
  busyMemberId,
  onChangeRole,
  onRemove,
  emptyState,
}: TeamMembersTableProps) {
  return (
    <DataTable
      density="compact"
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
                className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--ua-radius-round)] bg-[var(--ua-surface-secondary)] text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-secondary)]"
              >
                {initials(member.invited_email)}
              </span>
              <span className="min-w-0 truncate text-[length:var(--ua-text-dense-size)] font-medium text-[var(--ua-text-primary)]">
                {member.invited_email}
              </span>
              {member.is_account_owner ? (
                <span className="shrink-0 rounded-[var(--ua-badge-radius-meta)] border border-[var(--ua-border-subtle)] bg-[var(--ua-surface-secondary)] px-1.5 py-px text-[length:var(--ua-text-metadata-size)] font-medium text-[var(--ua-text-secondary)]">
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
            const canChange =
              canManageTeam && !isOwnerRow && (isAccountOwner || member.role !== 'owner');
            if (!canChange) {
              return (
                <span className="text-[length:var(--ua-text-dense-size)] text-[var(--ua-text-secondary)]">
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
                {UI_ASSIGNABLE_ROLES.map((value) => (
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
            <span className="text-[length:var(--ua-text-dense-size)] tabular-nums text-[var(--ua-text-secondary)]">
              {formatTeamDate(member.accepted_at ?? member.created_at)}
            </span>
          ),
        },
      ]}
      rowActions={(member): RowAction[] => {
        const isOwnerRow = member.is_account_owner === true;
        if (!canManageTeam || isOwnerRow || member.role === 'owner') return [];
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
