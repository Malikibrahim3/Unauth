/** @jest-environment jsdom */

import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { TeamMembersTable } from '@/components/settings/TeamMembersTable';
import {
  formatTeamJoinState,
  INVITE_ROLES,
  UI_ASSIGNABLE_ROLES,
  type InviteStatus,
  type TeamMember,
} from '@/components/settings/teamManagementTypes';
import { TEAM_INVITABLE_ROLES, TEAM_ROLES } from '@/lib/permissions/roles';

describe('formatTeamJoinState', () => {
  it('uses the same exact roles in UI, server validation, and permission enforcement', () => {
    expect(UI_ASSIGNABLE_ROLES).toBe(TEAM_ROLES);
    expect(UI_ASSIGNABLE_ROLES).toEqual(['owner', 'admin', 'analyst', 'viewer']);
    expect(INVITE_ROLES.map((role) => role.value)).toEqual(TEAM_INVITABLE_ROLES);
  });

  it.each([
    ['pending', null, null, 'Not accepted yet'],
    ['active', '2026-08-01T12:00:00.000Z', null, '1 Aug, 12:00'],
    ['active', null, '2026-07-20T09:30:00.000Z', 'Member since 20 Jul, 09:30 · acceptance date unavailable'],
    ['active', null, null, 'Joined date unavailable'],
    ['revoked', '2026-08-01T12:00:00.000Z', '2026-07-20T09:30:00.000Z', 'Membership revoked'],
  ] satisfies Array<[InviteStatus, string | null, string | null, string]>) (
    '%s membership with accepted=%s and created=%s',
    (invite_status, accepted_at, created_at, expected) => {
      expect(formatTeamJoinState({ invite_status, accepted_at, created_at })).toBe(expected);
    },
  );

  it('renders active and pending membership language together without contradiction', () => {
    const members: TeamMember[] = [
      {
        id: 'owner-fixture',
        user_id: 'owner-user-fixture',
        invited_email: 'owner@example.test',
        role: 'owner',
        invite_status: 'active',
        created_at: null,
        accepted_at: null,
        is_account_owner: true,
      },
      {
        id: 'pending-fixture',
        user_id: null,
        invited_email: 'pending@example.test',
        role: 'analyst',
        invite_status: 'pending',
        created_at: '2026-08-01T12:00:00.000Z',
        accepted_at: null,
      },
    ];

    render(createElement(TeamMembersTable, {
      members,
      loading: false,
      canManageTeam: false,
      isAccountOwner: true,
      currentUserId: 'owner-user-fixture',
      currentUserRole: 'owner',
      busyMemberId: null,
      onChangeRole: () => undefined,
      onRemove: () => undefined,
      emptyState: createElement('p', null, 'No members'),
    }));

    expect(screen.getByText('Active')).toBeDefined();
    expect(screen.getByText('Joined date unavailable')).toBeDefined();
    expect(screen.getByText('Pending')).toBeDefined();
    expect(screen.getByText('Not accepted yet')).toBeDefined();
  });
});
