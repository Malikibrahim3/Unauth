import {
  auditText,
  formatTeamDate,
  ROLE_LABELS,
  type AuditRow,
} from '@/components/settings/teamManagementTypes';

type TeamAuditTrailSectionProps = {
  auditTrail: AuditRow[];
  /** Render within the Team working surface instead of creating another card. */
  joined?: boolean;
};

export function TeamAuditTrailSection({ auditTrail, joined = false }: TeamAuditTrailSectionProps) {
  return (
    <section
      className={joined ? 'border-t border-[var(--ua-border-subtle)]' : 'rounded-md border'}
      style={{ background: 'var(--ua-surface-primary)', borderColor: 'var(--ua-border-subtle)' }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--ua-border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--ua-text-primary)' }}>Role audit</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>Recent invites, role changes, and removals.</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--ua-border-subtle)' }}>
        {auditTrail.length === 0 ? (
          <p className="px-4 py-5 text-[length:var(--ua-text-caption-size)]" style={{ color: 'var(--ua-text-secondary)' }}>No team role changes yet.</p>
        ) : (
          auditTrail.map((row) => (
            <div key={row.id} className="px-4 py-2.5">
              <p className="text-[length:var(--ua-text-caption-size)]" style={{ color: 'var(--ua-text-primary)' }}>{auditText(row)}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--ua-text-secondary)' }}>
                {formatTeamDate(row.created_at)} by {ROLE_LABELS[row.actor_role] ?? row.actor_role}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
