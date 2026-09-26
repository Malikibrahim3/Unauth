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
      className={joined ? 'border-t border-[#eae8e5]' : 'rounded-md border'}
      style={{ background: '#fff', borderColor: '#eae8e5' }}
    >
      <div className="border-b px-4 py-3" style={{ borderColor: '#eae8e5' }}>
        <h2 className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>Role audit</h2>
        <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1" style={{ color: '#64686d' }}>Recent invites, role changes, and removals.</p>
      </div>
      <div className="divide-y" style={{ borderColor: '#eae8e5' }}>
        {auditTrail.length === 0 ? (
          <p className="px-4 py-5 text-[length:11.5px]" style={{ color: '#64686d' }}>No team role changes yet.</p>
        ) : (
          auditTrail.map((row) => (
            <div key={row.id} className="px-4 py-2.5">
              <p className="text-[length:11.5px]" style={{ color: '#1c1f23' }}>{auditText(row)}</p>
              <p className="text-[11.5px] leading-[1.45] text-[#64686d] mt-1">
                {formatTeamDate(row.created_at)} by {ROLE_LABELS[row.actor_role] ?? row.actor_role}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
