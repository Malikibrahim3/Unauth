import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Unauth',
};

export default async function HomePage() {
  redirect('/landing');
}
