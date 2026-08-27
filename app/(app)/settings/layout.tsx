import { SettingsAccessProvider } from '@/components/settings/SettingsAccessContext';
import { getRequestPermissions } from '@/lib/auth/requestContext';

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const permissions = await getRequestPermissions();
  return <SettingsAccessProvider permissions={permissions}>{children}</SettingsAccessProvider>;
}
