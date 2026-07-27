import { UnauthLogo } from '@/components/ui/UnauthLogo';

interface HelpdeskSidebarPreviewProps {
  providerLabel: 'Zendesk' | 'Gorgias';
}

export default function HelpdeskSidebarPreview({ providerLabel }: HelpdeskSidebarPreviewProps) {
  return (
    <div>
      <p className="mb-2 text-[length:var(--ua-text-caption-size)] font-semibold" style={{ color: 'var(--ua-text-primary)' }}>
        Sidebar preview
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="w-[300px] shrink-0 rounded-md border p-3 text-xs"
          style={{
            borderColor: 'var(--ua-border-default)',
            background: 'var(--ua-text-primary)',
            color: 'var(--ua-text-inverse)',
            fontFamily: 'var(--ua-font-sans)',
          }}
        >
          <div
            className="rounded-md border p-3"
            style={{ background: 'var(--ua-severity-clear-bg)', borderColor: 'var(--ua-neutral)', color: 'var(--ua-neutral)' }}
          >
            <p className="text-sm font-bold">Case context available</p>
            <p className="mt-1">Open the case in Unauth to review store and case context.</p>
            <p className="mt-3 text-[length:var(--ua-text-metadata-size)] font-semibold">Context actions</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 normal-case">
              <li>View Store Check — 1 credit</li>
              <li>Generate Case Report — 3 credits</li>
            </ul>
            <div
              className="mt-3 rounded px-2 py-1.5 normal-case"
              style={{
                background: 'color-mix(in srgb, var(--ua-text-primary) 8%, transparent)',
                color: 'var(--ua-text-primary)',
              }}
            >
              Other merchants’ raw customer data is not exposed.
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <span
                className="block rounded py-1.5 text-center text-xs font-semibold"
                style={{ background: 'var(--ua-action-primary)', color: 'var(--ua-text-inverse)' }}
              >
                Open case in Unauth
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <UnauthLogo kind="wordmark" tone="white" height={13} alt="" decorative />
          </div>
        </div>
        <p className="max-w-xs text-[length:var(--ua-text-metadata-size)] leading-5" style={{ color: 'var(--ua-text-secondary)' }}>
          Approximate appearance inside {providerLabel} (~300px sidebar). The widget is a context
          entry point, not a decisioning tool.
        </p>
      </div>
    </div>
  );
}
