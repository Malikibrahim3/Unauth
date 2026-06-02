import type { Metadata } from 'next';
import MobileUnsupportedClient from './MobileUnsupportedClient';

export const metadata: Metadata = {
  title: 'Desktop required | Unauth',
  description: 'Unauth is optimized for desktop browsers.',
};

export default function MobileUnsupportedPage() {
  return <MobileUnsupportedClient />;
}
