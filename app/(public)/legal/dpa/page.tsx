import type { Metadata } from 'next';
import { Challenge6Legal } from '@/components/public/Challenge6Legal';

export const metadata: Metadata = { title: 'Data processing addendum | Unauth', description: 'Unauth data processing terms for customer procurement review.' };
export default function DpaPage() { return <Challenge6Legal doc="dpa" />; }
