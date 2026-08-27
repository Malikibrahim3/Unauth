import { formatDateTime } from '@/lib/utils/format';
import { TEAM_INVITABLE_ROLES, TEAM_ROLES, type Role } from '@/lib/permissions/roles';

export type TeamRole = Role;
export type InviteStatus = 'pending' | 'active' | 'revoked';

export type TeamMember = {
  id: string;
  user_id: string | null;
  invited_email: string;
  role: TeamRole;
  invite_status: InviteStatus;
  created_at: string | null;
  accepted_at: string | null;
  is_account_owner?: boolean;
};

export type AuditRow = {
  id: string;
  action: 'team_member_invited' | 'team_member_role_changed' | 'team_member_removed';
  resource_id: string | null;
  actor_role: TeamRole;
  actor_user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type TeamResponse = {
  members: TeamMember[];
  currentUser: {
    id: string;
    email: string | null;
    role: TeamRole;
    memberId: string | null;
    canManageTeam: boolean;
    isAccountOwner: boolean;
  };
  auditTrail: AuditRow[];
};

const INVITE_ROLE_COPY: Record<(typeof TEAM_INVITABLE_ROLES)[number], { label: string; help: string }> = {
  admin: { label: 'Administrator', help: 'Can manage workspace settings and lower-privilege members, but cannot transfer ownership.' },
  analyst: { label: 'Analyst', help: 'Can investigate cases, manage work, and prepare evidence-backed recommendations.' },
  viewer: { label: 'Viewer', help: 'Can review permitted workspace records without changing operational state.' },
};

export const INVITE_ROLES = TEAM_INVITABLE_ROLES.map((value) => ({ value, ...INVITE_ROLE_COPY[value] }));

export const UI_ASSIGNABLE_ROLES = TEAM_ROLES;

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

export const STATUS_LABELS: Record<InviteStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  revoked: 'Revoked',
};

export function formatTeamDate(value: string | null) {
  if (!value) return 'Not accepted yet';
  return formatDateTime(value);
}

export function formatTeamJoinState(member: Pick<TeamMember, 'invite_status' | 'accepted_at' | 'created_at'>) {
  if (member.invite_status === 'pending') return 'Not accepted yet';
  if (member.invite_status === 'revoked') return 'Membership revoked';
  if (member.accepted_at) return formatDateTime(member.accepted_at);
  if (member.created_at) {
    return `Member since ${formatDateTime(member.created_at)} · acceptance date unavailable`;
  }
  return 'Joined date unavailable';
}

export function uiRoleForMember(role: TeamRole): (typeof UI_ASSIGNABLE_ROLES)[number] {
  return role;
}

export function auditText(row: AuditRow) {
  const email = typeof row.metadata?.email === 'string' ? row.metadata.email : 'A team member';
  const previousRole = typeof row.metadata?.previousRole === 'string' ? row.metadata.previousRole : null;
  const newRole = typeof row.metadata?.newRole === 'string' ? row.metadata.newRole : null;
  const role = typeof row.metadata?.role === 'string' ? row.metadata.role : null;

  if (row.action === 'team_member_invited') {
    return `${email} invited as ${role ? ROLE_LABELS[role as TeamRole] ?? role : 'a team member'}`;
  }
  if (row.action === 'team_member_role_changed') {
    const triggerPreviousRole = typeof row.metadata?.previous_role === 'string' ? row.metadata.previous_role : null;
    const triggerNewRole = typeof row.metadata?.new_role === 'string' ? row.metadata.new_role : null;
    return `Role changed from ${previousRole ?? triggerPreviousRole ?? 'unknown'} to ${newRole ?? triggerNewRole ?? 'unknown'}`;
  }
  return `${email} removed from the team`;
}

type ErrorBody = {
  error?: string;
  retryAfter?: number;
};

export function messageFromResponse(response: Response, body: ErrorBody) {
  if (body?.error === 'rate_limited') {
    const seconds = Number(body.retryAfter ?? response.headers.get('Retry-After') ?? 60);
    return `Rate limit reached. Try again in ${Math.ceil(seconds / 60)} minute(s).`;
  }
  return body?.error || 'Something went wrong.';
}
