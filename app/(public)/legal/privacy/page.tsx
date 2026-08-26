/** Privacy Policy — static page. */

import type { Metadata } from 'next';
import { Challenge6Legal } from '@/components/public/Challenge6Legal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Unauth',
  description: 'Unauth privacy policy for merchant, customer, and platform data.',
};

export default function PrivacyPage() {
  return <Challenge6Legal doc="privacy" />;
}
