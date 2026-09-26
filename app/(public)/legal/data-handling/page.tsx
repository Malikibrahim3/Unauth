import type { Metadata } from 'next';
import DataHandlingVisual from '@/components/visual-authority/generated/Legal-Data-Handling-Clean';
import PublicLegal from '@/components/public/PublicLegal';
import { throwForAcceptanceScenario } from '@/lib/testing/acceptanceStateInjector';

export const metadata: Metadata = { title: 'Data handling | Unauth', description: 'How connected operational data moves through Unauth.' };
export default async function DataHandlingPage() { await throwForAcceptanceScenario('legal-document-error'); return <PublicLegal source={DataHandlingVisual} surfaceId="data-handling-explainer" />; }
