import { GORGIAS_SIDEBAR_AUTO_NOTE } from '@/lib/support/gorgias/supportConnectionShared';

// Sidebar widget registration is now fully automated by the connect flow, so this card no longer
// carries manual setup steps — it explains what to expect and previews the in-ticket widget.
export default function GorgiasSetupClient() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Gorgias sidebar widget
        </h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          {GORGIAS_SIDEBAR_AUTO_NOTE}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
          Sidebar preview
        </p>
        <div className="flex gap-6 items-start flex-wrap">
          <div
            className="w-[300px] shrink-0 rounded-lg border p-3 text-xs"
            style={{
              borderColor: 'var(--surface-border)',
              background: '#14100e',
              color: '#f5f0eb',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <div
              className="rounded-md p-3 border"
              style={{ background: '#3d0e0a', borderColor: '#e8362a', color: '#fde8e6' }}
            >
              <p className="font-bold text-sm">🔴 HIGH RISK</p>
              <p className="mt-1 opacity-90">Definite · Score 87</p>
              <p className="mt-3 text-[10px] uppercase opacity-60">Signals</p>
              <ul className="mt-1 space-y-0.5 list-disc pl-4">
                <li>Refund abuse, 4 merchants</li>
                <li>Address cluster</li>
              </ul>
              <div
                className="mt-3 rounded px-2 py-1.5"
                style={{ background: 'rgba(0,0,0,0.2)' }}
              >
                4 merchants · 6 claims
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <span
                  className="block text-center rounded py-1.5 font-semibold"
                  style={{ background: '#c8763a', color: '#fff' }}
                >
                  View Profile
                </span>
                <span
                  className="block text-center rounded py-1.5 border"
                  style={{ borderColor: '#3d2e28', color: '#c8763a' }}
                >
                  Get PDF
                </span>
              </div>
            </div>
            <p className="text-right mt-2 opacity-40">Unauth</p>
          </div>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-muted)' }}>
            Approximate appearance inside Gorgias (~300px sidebar). Risk colours change based on
            customer grade.
          </p>
        </div>
      </div>
    </div>
  );
}
