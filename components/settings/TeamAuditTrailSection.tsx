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
      className={joined ? 'border-t border-[var(--uo-route-border-subtle)]' : 'rounded-md border'}
      style={{ background: 'var(--uo-route-surface-primary)', borderColor: 'var(--uo-route-border-subtle)' }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--uo-route-border-subtle)' }}>
        <h2 className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>Role audit</h2>
        <p className="ua-text-caption-role mt-1" style={{ color: 'var(--uo-route-text-secondary)' }}>Recent invites, role changes, and removals.</p>
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--uo-route-border-subtle)' }}>
        {auditTrail.length === 0 ? (
          <p className="px-4 py-5 text-[length:var(--uo-route-text-caption-size)]" style={{ color: 'var(--uo-route-text-secondary)' }}>No team role changes yet.</p>
        ) : (
          auditTrail.map((row) => (
            <div key={row.id} className="px-4 py-2.5">
              <p className="text-[length:var(--uo-route-text-caption-size)]" style={{ color: 'var(--uo-route-text-primary)' }}>{auditText(row)}</p>
              <p className="ua-text-caption-role mt-1">
                {formatTeamDate(row.created_at)} by {ROLE_LABELS[row.actor_role] ?? row.actor_role}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
