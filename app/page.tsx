import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {
  preservedRedirectTarget,
  type RedirectSearchParams,
} from '@/lib/navigation/preservedRedirect';

export const metadata: Metadata = {
  title: 'Unauth',
};

type HomePageProps = {
  searchParams?: Promise<RedirectSearchParams>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  redirect(preservedRedirectTarget('/landing', await searchParams));
}
