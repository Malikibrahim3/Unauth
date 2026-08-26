import { GORGIAS_SIDEBAR_AUTO_NOTE } from '@/lib/support/gorgias/supportConnectionShared';
import HelpdeskSidebarPreview from '@/components/settings/HelpdeskSidebarPreview';

// Sidebar widget registration is now fully automated by the connect flow, so this card no longer
// carries manual setup steps — it explains what to expect and previews the in-ticket widget.
export default function GorgiasSetupClient() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="ua-text-working-title" style={{ color: 'var(--uo-route-text-primary)' }}>
          Gorgias sidebar widget
        </h2>
        <p className="mt-1 text-[length:var(--uo-route-text-caption-size)] leading-5" style={{ color: 'var(--uo-route-text-secondary)' }}>
          {GORGIAS_SIDEBAR_AUTO_NOTE}
        </p>
      </div>

      <HelpdeskSidebarPreview providerLabel="Gorgias" />
    </div>
  );
}
