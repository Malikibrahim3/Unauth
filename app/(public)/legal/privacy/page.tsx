/** Privacy Policy — static page. */

import type { Metadata } from 'next';
import PrivacyVisual from '@/components/visual-authority/generated/Legal-Privacy-Clean';
import PublicLegal from '@/components/public/PublicLegal';

export const metadata: Metadata = {
  title: 'Privacy Policy | Unauth',
  description: 'Unauth privacy policy for merchant, customer, and platform data.',
};

export default function PrivacyPage() {
  return <PublicLegal source={PrivacyVisual} surfaceId="privacy-policy" />;
}
