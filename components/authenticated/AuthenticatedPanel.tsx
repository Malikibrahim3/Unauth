import type { ReactNode } from 'react';

type AuthenticatedPanelProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  capabilityId?: string;
  'data-state-id'?: string;
};

/** Dense white content panel used by list, form, and configuration surfaces. */
export function AuthenticatedPanel({
  children,
  title,
  description,
  actions,
  className,
  bodyClassName,
  capabilityId,
  'data-state-id': dataStateId,
}: AuthenticatedPanelProps) {
  // Renders the canonical working surface (§7.1) via the shared Surface
  // primitive; `styles.panel`/`.panelHeader`/`.panelBody` compose the shared
  // `rounded-xl border border-[#e4e3e0] bg-white` anatomy from global rather than redeclaring it.
  return (
    <section className={className} data-capability-id={capabilityId} data-state-id={dataStateId} style={{ minWidth: 0, overflow: 'hidden', borderRadius: 12, background: '#fff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
      {title || description || actions ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, padding: '13px 15px 11px', borderBottom: '1px solid #eae8e5' }}>
          <div>
            {title ? <h2 style={{ margin: 0, color: '#1c1f23', font: "500 15px/1.35 'Inter',sans-serif", letterSpacing: '-.01em' }}>{title}</h2> : null}
            {description ? <p style={{ margin: '4px 0 0', color: '#64686d', font: "400 11px/1.5 'Inter',sans-serif" }}>{description}</p> : null}
          </div>
          {actions ? <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName} style={{ minWidth: 0, padding: 15 }}>{children}</div>
    </section>
  );
}
