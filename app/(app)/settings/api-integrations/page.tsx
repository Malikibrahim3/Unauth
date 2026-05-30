import { redirect } from 'next/navigation';

export default function ApiIntegrationsRedirectPage() {
  redirect('/settings/integrations');
}
