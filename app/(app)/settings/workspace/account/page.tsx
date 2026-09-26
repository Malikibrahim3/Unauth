import { redirect } from 'next/navigation';
import { getMerchantProfileById } from '@/lib/account/merchantProfile';
import {
  getRequestCallerContext,
  getRequestPermissions,
  getRequestServiceClient,
  getRequestUser,
} from '@/lib/auth/requestContext';
import { PERMISSIONS } from '@/lib/permissions';
import AccountSettingsPage, { type AccountSetupPayload } from './AccountSettingsPage';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const dynamic = 'force-dynamic';

export default async function AccountSettingsRoute() {
  const [user, ctx, permissions] = await Promise.all([
    getRequestUser(),
    getRequestCallerContext(),
    getRequestPermissions(),
  ]);
  if (!user) redirect('/login');
  await throwForAcceptanceScenario('account-settings-error');

  const merchant = ctx
    ? await getMerchantProfileById(getRequestServiceClient(), ctx.merchantId)
    : null;
  const initialData: AccountSetupPayload = {
    user: { email: user.email ?? '', role: ctx?.role ?? null },
    merchant: merchant
      ? {
          id: merchant.id,
          name: merchant.name,
          monthly_order_volume: merchant.monthly_order_volume,
          primary_fraud_concern: merchant.primary_fraud_concern,
          setup_complete: merchant.setup_complete,
        }
      : null,
  };

  return (
    <AccountSettingsPage
      initialData={initialData}
      canManageWorkspace={permissions.includes(PERMISSIONS.MANAGE_SETTINGS)}
    />
  );
}
