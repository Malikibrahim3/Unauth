import { Bone } from '@/components/ui/LoadingSkeleton';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import styles from '@/components/settings/OperationsSettings.module.css';

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
      <div className={styles.settingsLoading} role="status" aria-busy="true" aria-label={`Loading ${title}`}>
        {[2, 3, 2].map((fields, section) => (
          <section className={styles.settingsLoadingSection} key={`${title}-${section}`}>
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-full max-w-xl" />
            <div className={styles.settingsLoadingFields}>
              {Array.from({ length: fields }, (_, index) => <Bone className="h-8 w-full" key={index} />)}
            </div>
          </section>
        ))}
      </div>
    </SettingsPageShell>
  );
}
