import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

type SettingsPageProps = {
  searchParams?: Promise<RedirectSearchParams>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  redirect(preservedRedirectTarget('/settings/account', await searchParams));
}
