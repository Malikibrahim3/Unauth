import { UnauthLogo } from '@/components/ui/UnauthLogo';

interface HelpdeskSidebarPreviewProps {
  providerLabel: 'Zendesk' | 'Gorgias';
}

export default function HelpdeskSidebarPreview({ providerLabel }: HelpdeskSidebarPreviewProps) {
  return (
    <div>
      <p className="ua-text-label mb-2" style={{ color: 'var(--uo-route-text-primary)' }}>
        Sidebar preview
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="ua-text-dense w-[300px] shrink-0 rounded-md border p-3"
          style={{
            borderColor: 'var(--uo-route-border-default)',
            background: 'var(--uo-route-text-primary)',
            color: 'var(--uo-route-text-inverse)',
            fontFamily: 'var(--uo-route-font-sans)',
          }}
        >
          <div
            className="rounded-md border p-3"
            style={{ background: 'var(--uo-route-surface-primary)', borderColor: 'var(--uo-route-border-default)', color: 'var(--uo-route-text-primary)' }}
          >
            <p className="ua-text-working-title font-bold">Case context available</p>
            <p className="mt-1">Open the case in Unauth to review store and case context.</p>
            <p className="ua-text-label mt-3">Context actions</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 normal-case">
              <li>View Store Check — 1 credit</li>
              <li>Generate Case Report — 3 credits</li>
            </ul>
            <div
              className="mt-3 rounded px-2 py-1.5 normal-case"
              style={{
                background: 'color-mix(in srgb, var(--uo-route-text-primary) 8%, transparent)',
                color: 'var(--uo-route-text-primary)',
              }}
            >
              Other merchants’ raw customer data is not exposed.
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <span
                className="ua-text-label block rounded py-1.5 text-center"
                style={{ background: 'var(--uo-route-action-primary)', color: 'var(--uo-route-text-inverse)' }}
              >
                Open case in Unauth
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <UnauthLogo kind="wordmark" tone="white" height={13} alt="" decorative />
          </div>
        </div>
        <p className="max-w-xs text-[length:var(--uo-route-text-metadata-size)] leading-5" style={{ color: 'var(--uo-route-text-secondary)' }}>
          Approximate appearance inside {providerLabel} (~300px sidebar). The widget is a context
          entry point, not a decisioning tool.
        </p>
      </div>
    </div>
  );
}
