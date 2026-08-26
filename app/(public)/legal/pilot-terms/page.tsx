import type { Metadata } from 'next';
import { Challenge6Legal } from '@/components/public/Challenge6Legal';

export const metadata: Metadata = { title: 'Pilot terms | Unauth', description: 'Terms for merchants participating in a time-boxed Unauth pilot.' };
export default function PilotTermsPage() { return <Challenge6Legal doc="pilot" />; }
