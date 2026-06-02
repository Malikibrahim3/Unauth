export type TeamRole = 'owner' | 'admin' | 'analyst' | 'viewer';
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
  action: 'invite_team_member' | 'update_team_member_role' | 'remove_team_member';
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

export const INVITE_ROLES: Array<{ value: 'analyst'; label: string; help: string }> = [
  { value: 'analyst', label: 'Analyst', help: 'Can investigate customers, run audits, and generate evidence packages.' },
];

export const UI_ASSIGNABLE_ROLES = ['owner', 'analyst'] as const satisfies readonly TeamRole[];

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Analyst',
  analyst: 'Analyst',
  viewer: 'Analyst',
};

export const STATUS_LABELS: Record<InviteStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  revoked: 'Revoked',
};

const teamDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatTeamDate(value: string | null) {
  if (!value) return 'Not accepted yet';
  return teamDateFormatter.format(new Date(value));
}

export function uiRoleForMember(role: TeamRole): (typeof UI_ASSIGNABLE_ROLES)[number] {
  if (role === 'owner') return 'owner';
  return 'analyst';
}

export function auditText(row: AuditRow) {
  const email = typeof row.metadata?.email === 'string' ? row.metadata.email : 'A team member';
  const previousRole = typeof row.metadata?.previousRole === 'string' ? row.metadata.previousRole : null;
  const newRole = typeof row.metadata?.newRole === 'string' ? row.metadata.newRole : null;
  const role = typeof row.metadata?.role === 'string' ? row.metadata.role : null;

  if (row.action === 'invite_team_member') {
    return `${email} invited as ${role ? ROLE_LABELS[role as TeamRole] ?? role : 'a team member'}`;
  }
  if (row.action === 'update_team_member_role') {
    return `Role changed from ${previousRole ?? 'unknown'} to ${newRole ?? 'unknown'}`;
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
