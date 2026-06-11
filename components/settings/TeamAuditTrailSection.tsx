import {
  auditText,
  formatTeamDate,
  ROLE_LABELS,
  type AuditRow,
} from '@/components/settings/teamManagementTypes';

type TeamAuditTrailSectionProps = {
  auditTrail: AuditRow[];
};

export function TeamAuditTrailSection({ auditTrail }: TeamAuditTrailSectionProps) {
  return (
    <section className="rounded-md border" style={{ background: 'var(--surface)', borderColor: 'var(--border-muted)' }}>
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border-muted)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Role audit</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>Recent invites, role changes, and removals.</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
        {auditTrail.length === 0 ? (
          <p className="px-5 py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>No team role changes yet.</p>
        ) : (
          auditTrail.map((row) => (
            <div key={row.id} className="px-5 py-3">
              <p className="text-sm" style={{ color: 'var(--text)' }}>{auditText(row)}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {formatTeamDate(row.created_at)} by {ROLE_LABELS[row.actor_role] ?? row.actor_role}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
