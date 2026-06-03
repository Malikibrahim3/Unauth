interface HelpdeskSidebarPreviewProps {
  providerLabel: 'Zendesk' | 'Gorgias';
}

export default function HelpdeskSidebarPreview({ providerLabel }: HelpdeskSidebarPreviewProps) {
  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Sidebar preview
      </p>
      <div className="flex flex-wrap items-start gap-6">
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
            className="rounded-md border p-3"
            style={{ background: 'var(--sev-clear-fill)', borderColor: 'var(--sev-clear)', color: 'var(--sev-clear)' }}
          >
            <p className="text-sm font-bold">Case context available</p>
            <p className="mt-1 opacity-90">Open the case in Unauth to review store and network context.</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide opacity-70">Context actions</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 normal-case opacity-90">
              <li>View Store Check — 1 credit</li>
              <li>View Network Check — 2 credits</li>
              <li>Generate Case Report — 3 credits</li>
            </ul>
            <div
              className="mt-3 rounded px-2 py-1.5 normal-case opacity-80"
              style={{ background: 'rgba(0,0,0,0.08)' }}
            >
              Other merchants’ raw customer data is not exposed.
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <span
                className="block rounded py-1.5 text-center text-xs font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--ink-inverse)' }}
              >
                Open case in Unauth
              </span>
            </div>
          </div>
          <p className="mt-2 text-right opacity-40">Unauth</p>
        </div>
        <p className="max-w-xs text-sm" style={{ color: 'var(--text-muted)' }}>
          Approximate appearance inside {providerLabel} (~300px sidebar). The widget is a context
          entry point, not a decisioning tool.
        </p>
      </div>
    </div>
  );
}
