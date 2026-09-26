import { GORGIAS_SIDEBAR_AUTO_NOTE } from '@/lib/support/gorgias/supportConnectionShared';
import HelpdeskSidebarPreview from '@/components/settings/HelpdeskSidebarPreview';

// Sidebar widget registration is now fully automated by the connect flow, so this card no longer
// carries manual setup steps — it explains what to expect and previews the in-ticket widget.
export default function GorgiasSetupClient() {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-medium text-[13px] leading-5 text-[#1c1f23]" style={{ color: '#1c1f23' }}>
          Gorgias sidebar widget
        </h2>
        <p className="mt-1 text-[length:11.5px] leading-5" style={{ color: '#64686d' }}>
          {GORGIAS_SIDEBAR_AUTO_NOTE}
        </p>
      </div>

      <HelpdeskSidebarPreview providerLabel="Gorgias" />
    </div>
  );
}
