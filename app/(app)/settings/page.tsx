import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

type SettingsPageProps = {
  searchParams?: Promise<RedirectSearchParams>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  // Direct /settings requests are canonicalized by proxy.ts. This fallback
  // keeps the existing route-level redirect contract for server-side callers.
  redirect(preservedRedirectTarget('/settings/workspace/account', await searchParams));
}
