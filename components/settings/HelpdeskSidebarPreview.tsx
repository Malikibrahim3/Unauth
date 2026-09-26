import { UnauthLogo } from '@/components/ui/UnauthLogo';

interface HelpdeskSidebarPreviewProps {
  providerLabel: 'Zendesk' | 'Gorgias';
}

export default function HelpdeskSidebarPreview({ providerLabel }: HelpdeskSidebarPreviewProps) {
  return (
    <div>
      <p className="text-[11px] font-medium leading-4 text-[#64686d] mb-2" style={{ color: '#1c1f23' }}>
        Sidebar preview
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="text-[12px] leading-[1.45] text-[#40454a] w-[300px] shrink-0 rounded-md border p-3"
          style={{
            borderColor: '#e4e3e0',
            background: '#1c1f23',
            color: '#fff',
            fontFamily: 'Inter,ui-sans-serif,system-ui,sans-serif',
          }}
        >
          <div
            className="rounded-md border p-3"
            style={{ background: '#fff', borderColor: '#e4e3e0', color: '#1c1f23' }}
          >
            <p className="font-medium text-[13px] leading-5 text-[#1c1f23] font-bold">Case context available</p>
            <p className="mt-1">Open the case in Unauth to review store and case context.</p>
            <p className="text-[11px] font-medium leading-4 text-[#64686d] mt-3">Context actions</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 normal-case">
              <li>View Store Check — 1 credit</li>
              <li>Generate Case Report — 3 credits</li>
            </ul>
            <div
              className="mt-3 rounded px-2 py-1.5 normal-case"
              style={{
                background: 'color-mix(in srgb, #1c1f23 8%, transparent)',
                color: '#1c1f23',
              }}
            >
              Other merchants’ raw customer data is not exposed.
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              <span
                className="text-[11px] font-medium leading-4 text-[#64686d] block rounded py-1.5 text-center"
                style={{ background: '#9f4f08', color: '#fff' }}
              >
                Open case in Unauth
              </span>
            </div>
          </div>
          <div className="mt-2 flex justify-end">
            <UnauthLogo kind="wordmark" tone="white" height={13} alt="" decorative />
          </div>
        </div>
        <p className="max-w-xs text-[length:10.5px] leading-5" style={{ color: '#64686d' }}>
          Approximate appearance inside {providerLabel} (~300px sidebar). The widget is a context
          entry point, not a decisioning tool.
        </p>
      </div>
    </div>
  );
}
