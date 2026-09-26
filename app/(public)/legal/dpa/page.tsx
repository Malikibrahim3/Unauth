import type { Metadata } from 'next';
import DpaVisual from '@/components/visual-authority/generated/Legal-DPA-Clean';
import PublicLegal from '@/components/public/PublicLegal';

export const metadata: Metadata = { title: 'Data processing addendum | Unauth', description: 'Unauth data processing terms for customer procurement review.' };
export default function DpaPage() { return <PublicLegal source={DpaVisual} surfaceId="data-processing-addendum" />; }
