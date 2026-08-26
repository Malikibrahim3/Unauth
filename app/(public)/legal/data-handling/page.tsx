import type { Metadata } from 'next';
import { Challenge6Legal } from '@/components/public/Challenge6Legal';

export const metadata: Metadata = { title: 'Data handling | Unauth', description: 'How connected operational data moves through Unauth.' };
export default function DataHandlingPage() { return <Challenge6Legal doc="handling" />; }
