import type { Metadata } from 'next';
import PilotTermsVisual from '@/components/visual-authority/generated/Legal-Pilot-Terms-Clean';
import PublicLegal from '@/components/public/PublicLegal';

export const metadata: Metadata = { title: 'Pilot terms | Unauth', description: 'Terms for merchants participating in a time-boxed Unauth pilot.' };
export default function PilotTermsPage() { return <PublicLegal source={PilotTermsVisual} surfaceId="pilot-terms" />; }
