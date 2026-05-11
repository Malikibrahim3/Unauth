"use client";

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Clock, MailPlus, Shield, Trash2, UserCog } from 'lucide-react';

type TeamRole = 'owner' | 'admin' | 'analyst' | 'viewer';
type InviteStatus = 'pending' | 'active' | 'revoked';

type TeamMember = {
  id: string;
  user_id: string | null;
  invited_email: string;
  role: TeamRole;
  invite_status: InviteStatus;
  created_at: string | null;
  accepted_at: string | null;
  is_account_owner?: boolean;
};

type AuditRow = {
  id: string;
  action: 'invite_team_member' | 'update_team_member_role' | 'remove_team_member';
  resource_id: string | null;
  actor_role: TeamRole;
  actor_user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type TeamResponse = {
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

const INVITE_ROLES: Array<{ value: Exclude<TeamRole, 'owner'>; label: string; help: string }> = [
  { value: 'admin', label: 'Admin', help: 'Can manage settings and invite teammates.' },
  { value: 'analyst', label: 'Analyst', help: 'Can run reviews and work investigation queues.' },
  { value: 'viewer', label: 'Viewer', help: 'Read-only access for reports and monitoring.' },
];

const ASSIGNABLE_ROLES: TeamRole[] = ['owner', 'admin', 'analyst', 'viewer'];

const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const STATUS_LABELS: Record<InviteStatus, string> = {
  active: 'Active',
  pending: 'Pending',
  revoked: 'Revoked',
};

function formatDate(value: string | null) {
  if (!value) return 'Not accepted yet';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function auditText(row: AuditRow) {
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

function messageFromResponse(response: Response, body: any) {
  if (body?.error === 'rate_limited') {
    const seconds = Number(body.retryAfter ?? response.headers.get('Retry-After') ?? 60);
    return `Rate limit reached. Try again in ${Math.ceil(seconds / 60)} minute(s).`;
  }
  return body?.error || 'Something went wrong.';
}

export default function TeamManagementClient() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditRow[]>([]);
  const [currentUser, setCurrentUser] = useState<TeamResponse['currentUser'] | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<TeamRole, 'owner'>>('analyst');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canManageTeam = currentUser?.canManageTeam === true;
  const isAccountOwner = currentUser?.isAccountOwner === true;

  const activeCount = useMemo(
    () => members.filter((member) => member.invite_status === 'active').length,
    [members]
  );

  async function loadTeam() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/team?includeAudit=true&includeOwner=true', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      setMembers(body.members ?? []);
      setAuditTrail(body.auditTrail ?? []);
      setCurrentUser(body.currentUser ?? null);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to load team.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      setEmail('');
      setRole('analyst');
      setMessage({ type: 'success', text: 'Invite sent. They will receive a magic link and join with the selected role.' });
      await loadTeam();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Invite failed.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function changeRole(member: TeamMember, nextRole: TeamRole) {
    if (member.role === nextRole) return;
    setBusyMemberId(member.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/team/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      setMessage({ type: 'success', text: `${member.invited_email} is now ${ROLE_LABELS[nextRole]}.` });
      await loadTeam();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Role update failed.' });
    } finally {
      setBusyMemberId(null);
    }
  }

  async function removeMember(member: TeamMember) {
    setBusyMemberId(member.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/team/${member.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFromResponse(response, body));
      setMessage({ type: 'success', text: `${member.invited_email} was removed from the team.` });
      await loadTeam();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Remove failed.' });
    } finally {
      setBusyMemberId(null);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            background: message.type === 'success' ? 'rgba(34, 197, 94, 0.10)' : 'rgba(248, 113, 113, 0.10)',
            borderColor: message.type === 'success' ? 'rgba(34, 197, 94, 0.35)' : 'rgba(248, 113, 113, 0.35)',
            color: 'var(--text)',
          }}
          role="status"
        >
          {message.text}
        </div>
      )}

      <form
        onSubmit={inviteMember}
        className="rounded-lg border p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Invite teammate</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Invite up to 50 teammates per hour with a magic-link email.
            </p>
          </div>
          <MailPlus className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--icon-muted)' }} />
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <label className="space-y-1">
            <span className="block text-xs font-semibold" style={{ color: 'var(--text)' }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={!canManageTeam || submitting}
              required
              placeholder="name@company.com"
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </label>

          <label className="space-y-1">
            <span className="block text-xs font-semibold" style={{ color: 'var(--text)' }}>Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Exclude<TeamRole, 'owner'>)}
              disabled={!canManageTeam || submitting}
              className="w-full rounded-md px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
              style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {INVITE_ROLES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={!canManageTeam || submitting}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            <MailPlus className="h-4 w-4" />
            {submitting ? 'Sending...' : 'Invite'}
          </button>
        </div>

        {!canManageTeam && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Your {currentUser?.role ?? 'current'} role can view the team but cannot invite users or change roles.
          </p>
        )}
      </form>

      <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Team members</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{activeCount} active user(s)</p>
          </div>
          <Shield className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm" style={{ color: 'var(--text-muted)' }}>Loading team...</div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {members.map((member) => {
              const isOwnerRow = member.is_account_owner === true;
              const canChangeThisRole =
                canManageTeam &&
                !isOwnerRow &&
                (isAccountOwner || member.role !== 'owner');
              const canRemoveThisMember = canManageTeam && !isOwnerRow && member.role !== 'owner';
              const roleDisabled = busyMemberId === member.id || !canChangeThisRole;

              return (
                <div key={member.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_170px_130px_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{member.invited_email}</p>
                      {member.invite_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ background: 'rgba(34, 197, 94, 0.12)', color: 'var(--text)' }}>
                          <Check className="h-3 w-3" /> {STATUS_LABELS[member.invite_status]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {member.is_account_owner ? 'Account owner' : `Joined: ${formatDate(member.accepted_at)}`}
                    </p>
                  </div>

                  <select
                    value={member.role}
                    onChange={(event) => changeRole(member, event.target.value as TeamRole)}
                    disabled={roleDisabled}
                    aria-label={`Role for ${member.invited_email}`}
                    className="rounded-md px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
                    style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    {ASSIGNABLE_ROLES.map((roleOption) => (
                      <option
                        key={roleOption}
                        value={roleOption}
                        disabled={roleOption === 'owner' && (!isAccountOwner || member.invite_status !== 'active')}
                      >
                        {ROLE_LABELS[roleOption]}
                      </option>
                    ))}
                  </select>

                  <div className="inline-flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <UserCog className="h-4 w-4" />
                    {ROLE_LABELS[member.role]}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMember(member)}
                    disabled={!canRemoveThisMember || busyMemberId === member.id}
                    aria-label={`Remove ${member.invited_email}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Role audit</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Recent invites, role changes, and removals.</p>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
          {auditTrail.length === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>No team role changes yet.</p>
          ) : (
            auditTrail.map((row) => (
              <div key={row.id} className="px-5 py-3">
                <p className="text-sm" style={{ color: 'var(--text)' }}>{auditText(row)}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(row.created_at)} by {ROLE_LABELS[row.actor_role] ?? row.actor_role}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
