import { Bone } from '@/components/ui/LoadingSkeleton';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';

export function SettingsRouteLoading({
  title,
  layout = 'form',
}: {
  title: string;
  layout?: 'form' | 'wide';
}) {
  return (
    <SettingsPageShell
      title={title}
      subtitle="Loading the verified workspace state. Your role and any unsaved work remain unchanged."
      surfaceId="settings-form-loading-families"
      layout={layout}
      truth={{
        access: 'Checking your active workspace role',
        currentState: 'Loading — no saved value is inferred',
        saveBehavior: 'Controls stay unavailable until verified',
        impact: 'No setting changes while this page loads',
      }}
    >
      <div style={{ display: 'grid', gap: 14 }} role="status" aria-busy="true" aria-label={`Loading ${title}`}>
        {[2, 3, 2].map((fields, section) => (
          <section style={{ display: 'grid', gap: 12, padding: '17px 18px', border: '1px solid #e4e3e0', borderRadius: 12, background: '#fff' }} key={`${title}-${section}`}>
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-full max-w-xl" />
            <div style={{ display: 'grid', gap: 10 }}>
              {Array.from({ length: fields }, (_, index) => <Bone className="h-8 w-full" key={index} />)}
            </div>
          </section>
        ))}
      </div>
    </SettingsPageShell>
  );
}
