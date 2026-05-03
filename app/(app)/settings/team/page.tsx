'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Shield, Eye, BarChart2, Crown, Trash2, ChevronDown, Mail, Clock, Check, AlertCircle, ArrowLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';

// Permissions that can be individually delegated to team members
const DELEGATABLE: { key: string; label: string; description: string }[] = [
  { key: 'upload_csv',             label: 'Upload CSV',             description: 'Run new fraud audits' },
  { key: 'export_audit',           label: 'Export Audit',           description: 'Download audit reports' },
  { key: 'lookup_customer',        label: 'Lookup Customer',        description: 'Manual customer lookups' },
  { key: 'update_customer_status', label: 'Update Customer Status', description: 'Change block/allow/review flags' },
  { key: 'add_customer_note',      label: 'Add Notes',              description: 'Write customer notes' },
  { key: 'delete_customer_note',   label: 'Delete Notes',           description: 'Delete customer notes' },
  { key: 'manage_watchlist',       label: 'Manage Watchlist',       description: 'Add / remove watchlist entries' },
  { key: 'generate_evidence',      label: 'Generate Evidence',      description: 'Create chargeback evidence packs' },
  { key: 'submit_fraud_feedback',  label: 'Submit Feedback',        description: 'Flag/approve fraud decisions' },
  { key: 'dismiss_transaction',    label: 'Dismiss Transactions',   description: 'Dismiss flagged transactions' },
  { key: 'hide_job',               label: 'Hide Jobs',              description: 'Hide audit jobs from history' },
  { key: 'bulk_delete',            label: 'Bulk Delete',            description: 'Delete multiple records at once' },
  { key: 'manage_settings',        label: 'Manage Settings',        description: 'Edit merchant settings' },
];

interface PermissionGrant {
  id: string;
  permission: string;
  granted_at: string;
}

function PermissionsPanel({ memberId, memberRole, isOwner }: { memberId: string; memberRole: Role; isOwner: boolean }) {
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/team/${memberId}/permissions`)
      .then((r) => r.json())
      .then((d) => setGrants(d.grants ?? []))
      .finally(() => setLoading(false));
  }, [memberId]);

  if (isOwner) {
    return (
      <div className="px-5 pb-4 pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Owner has all permissions by default and cannot be restricted.
      </div>
    );
  }

  // Permissions granted by role already (no need to toggle)
  const roleDefaults: Record<Role, string[]> = {
    owner: [],
    admin: ['upload_csv','export_audit','lookup_customer','update_customer_status','add_customer_note','delete_customer_note','manage_watchlist','generate_evidence','submit_fraud_feedback','dismiss_transaction','hide_job','bulk_delete','manage_settings'],
    analyst: ['upload_csv','export_audit','lookup_customer','update_customer_status','add_customer_note','generate_evidence','submit_fraud_feedback','dismiss_transaction'],
    viewer: ['export_audit','lookup_customer'],
  };
  const byRole = new Set(roleDefaults[memberRole] ?? []);
  const byGrant = new Set(grants.map((g) => g.permission));

  async function toggle(permission: string) {
    if (byRole.has(permission)) return; // can't remove role-level perm
    setToggling(permission);
    try {
      const hasGrant = byGrant.has(permission);
      const res = await fetch(`/api/team/${memberId}/permissions`, {
        method: hasGrant ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      if (hasGrant) {
        setGrants((prev) => prev.filter((g) => g.permission !== permission));
      } else {
        setGrants((prev) => [...prev, { id: Date.now().toString(), permission, granted_at: new Date().toISOString() }]);
      }
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return <div className="px-5 pb-4 pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Loading permissions…</div>;
  }

  return (
    <div className="px-5 pb-4 pt-1">
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        <Lock className="h-3 w-3 inline mr-1" />
        Permissions marked <span className="font-semibold">By role</span> come from this member's role and cannot be removed here. Toggle extras below.
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {DELEGATABLE.map(({ key, label, description }) => {
          const fromRole = byRole.has(key);
          const granted = fromRole || byGrant.has(key);
          const isToggling = toggling === key;
          return (
            <button
              key={key}
              onClick={() => !fromRole && toggle(key)}
              disabled={fromRole || isToggling}
              className="flex items-start gap-2.5 rounded-md px-3 py-2 text-left transition-colors"
              style={{
                background: granted ? 'rgba(99,102,241,0.06)' : 'var(--bg-inset)',
                border: `1px solid ${granted ? 'rgba(99,102,241,0.2)' : 'var(--border-subtle)'}`,
                cursor: fromRole ? 'default' : 'pointer',
                opacity: isToggling ? 0.5 : 1,
              }}
            >
              {granted
                ? <Unlock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                : <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
              }
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight" style={{ color: granted ? 'var(--accent)' : 'var(--text)' }}>
                  {label}
                  {fromRole && <span className="ml-1.5 font-normal text-[10px] opacity-60">By role</span>}
                </p>
                <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Role = 'owner' | 'admin' | 'analyst' | 'viewer';
type InviteStatus = 'pending' | 'active' | 'revoked';

interface Member {
  id: string;
  merchant_id: string;
  user_id: string | null;
  invited_email: string;
  role: Role;
  invite_status: InviteStatus;
  invited_by: string | null;
  created_at: string;
  accepted_at: string | null;
}

const ROLE_META: Record<Role, { label: string; description: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; bg: string }> = {
  owner: {
    label: 'Owner',
    description: 'Full control. Cannot be removed.',
    icon: Crown,
    color: 'var(--risk-critical)',
    bg: 'rgba(239,68,68,0.08)',
  },
  admin: {
    label: 'Admin',
    description: 'Manage team, billing, all features.',
    icon: Shield,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
  },
  analyst: {
    label: 'Analyst',
    description: 'Run audits, lookup, watchlist, add notes, dismiss/feedback.',
    icon: BarChart2,
    color: 'var(--accent)',
    bg: 'rgba(99,102,241,0.08)',
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to all data and reports.',
    icon: Eye,
    color: 'var(--text-muted)',
    bg: 'var(--bg-subtle)',
  },
};

function RoleBadge({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: meta.bg, color: meta.color }}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function RoleSelect({ value, onChange, disabled }: { value: Role; onChange: (r: Role) => void; disabled?: boolean }) {
  const options: Role[] = ['admin', 'analyst', 'viewer'];
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Role)}
        disabled={disabled}
        className="appearance-none pl-3 pr-7 py-1.5 rounded text-xs font-semibold focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: ROLE_META[value].bg,
          color: ROLE_META[value].color,
          border: `1px solid ${ROLE_META[value].color}30`,
        }}
      >
        {options.map((r) => (
          <option key={r} value={r}>{ROLE_META[r].label}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" style={{ color: ROLE_META[value].color }} />
    </div>
  );
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('analyst');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [expandedPerms, setExpandedPerms] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteEmail('');
      setInviteSuccess(`Invite sent to ${data.member.invited_email}`);
      setMembers((prev) => [...prev, data.member]);
      setTimeout(() => setInviteSuccess(''), 5000);
    } catch (e: unknown) {
      setInviteError((e as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: Role) {
    setRoleUpdating(memberId);
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRoleUpdating(null);
    }
  }

  async function handleRemove(memberId: string, email: string) {
    const label = members.find((m) => m.id === memberId)?.invite_status === 'pending'
      ? 'Cancel this invite'
      : 'Remove this team member';
    if (!confirm(`${label}? This will immediately revoke ${email}'s access.`)) return;
    setRemoving(memberId);
    try {
      const res = await fetch(`/api/team/${memberId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setRemoving(null);
    }
  }

  const activeMembers = members.filter((m) => m.invite_status === 'active');
  const pendingMembers = members.filter((m) => m.invite_status === 'pending');

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-xs mb-4 hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          <ArrowLeft className="h-3 w-3" /> Settings
        </Link>
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5" style={{ color: 'var(--icon-muted)' }} />
          <h1 className="text-heading-lg" style={{ color: 'var(--text)' }}>Team & Access</h1>
        </div>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage who has access to your Unauth account and what they can do.
        </p>
      </div>

      {/* Role reference */}
      <div
        className="rounded-lg border p-5 grid grid-cols-2 gap-3 sm:grid-cols-4"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {(Object.entries(ROLE_META) as [Role, typeof ROLE_META[Role]][]).map(([role, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={role}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
                <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.label}</span>
              </div>
              <p className="text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>{meta.description}</p>
            </div>
          );
        })}
      </div>

      {/* Invite form */}
      <div
        className="rounded-lg border p-5"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
          <UserPlus className="h-4 w-4 inline-block mr-2" style={{ color: 'var(--icon-muted)' }} />
          Invite a team member
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="colleague@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-1"
            style={{
              background: 'var(--bg-inset)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              '--tw-ring-color': 'var(--accent)',
            } as React.CSSProperties}
          />
          <div className="relative">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as Role)}
              className="appearance-none pl-3 pr-8 py-2 rounded-md text-sm focus:outline-none focus:ring-1"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none" style={{ color: 'var(--icon-muted)' }} />
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            style={{ background: 'var(--accent)', color: 'var(--text-inverse)' }}
          >
            {inviting ? 'Sending…' : 'Send invite'}
          </button>
        </form>
        {inviteError && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--risk-critical)' }}>
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {inviteError}
          </div>
        )}
        {inviteSuccess && (
          <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--success)' }}>
            <Check className="h-3.5 w-3.5 shrink-0" /> {inviteSuccess}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border px-5 py-4 text-sm" style={{ borderColor: 'var(--risk-critical)', color: 'var(--risk-critical)', background: 'rgba(239,68,68,0.06)' }}>
          {error}
        </div>
      )}

      {/* Active members */}
      {loading ? (
        <div className="text-sm py-4" style={{ color: 'var(--text-muted)' }}>Loading team…</div>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Active members{activeMembers.length > 0 && <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({activeMembers.length})</span>}
            </h2>
          </div>

          {activeMembers.length === 0 ? (
            <div className="px-5 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              No active team members yet. Invite someone above to get started.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {activeMembers.map((member) => (
                <li key={member.id} className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-4 px-5 py-3.5">
                  {/* Avatar placeholder */}
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
                  >
                    {member.invited_email[0].toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {member.invited_email}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Joined {new Date(member.accepted_at ?? member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Role control */}
                  {member.role === 'owner' ? (
                    <RoleBadge role="owner" />
                  ) : (
                    <RoleSelect
                      value={member.role}
                      onChange={(r) => handleRoleChange(member.id, r)}
                      disabled={roleUpdating === member.id}
                    />
                  )}

                  {/* Permissions expand */}
                  <button
                    onClick={() => setExpandedPerms(expandedPerms === member.id ? null : member.id)}
                    className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-xs flex items-center gap-1"
                    style={{ color: 'var(--text-muted)' }}
                    title="Manage permissions"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    <ChevronRight className={`h-3 w-3 transition-transform ${expandedPerms === member.id ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Remove button */}
                  {member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(member.id, member.invited_email)}
                      disabled={removing === member.id}
                      className="p-1.5 rounded hover:bg-[var(--bg-subtle)] disabled:opacity-40"
                      title="Remove from team"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--risk-critical)' }} />
                    </button>
                  )}
                  </div>
                  {expandedPerms === member.id && (
                    <PermissionsPanel
                      memberId={member.id}
                      memberRole={member.role}
                      isOwner={member.role === 'owner'}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pending invites */}
      {!loading && pendingMembers.length > 0 && (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Pending invites
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({pendingMembers.length})</span>
            </h2>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {pendingMembers.map((member) => (
              <li key={member.id} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <Mail className="h-4 w-4" style={{ color: 'var(--icon-muted)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {member.invited_email}
                  </p>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="h-3 w-3" />
                    Invited {new Date(member.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <RoleBadge role={member.role} />

                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04', border: '1px solid rgba(234,179,8,0.2)' }}
                >
                  Pending
                </span>

                <button
                  onClick={() => handleRemove(member.id, member.invited_email)}
                  disabled={removing === member.id}
                  className="p-1.5 rounded hover:bg-[var(--bg-subtle)] disabled:opacity-40"
                  title="Cancel invite"
                >
                  <Trash2 className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
