import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CasePrototypeLab } from './CasePrototypeLab';

export const metadata: Metadata = {
  title: 'Unauth case-detail prototype lab',
  robots: { index: false, follow: false },
};

export default function UnauthCaseDetailPrototypePage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <CasePrototypeLab />;
}
