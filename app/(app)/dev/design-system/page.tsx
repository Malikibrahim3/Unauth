import { notFound } from 'next/navigation';
import { DesignSystemGalleryClient } from './DesignSystemGalleryClient';

export const metadata = {
  title: 'Design system gallery | Unauth (dev only)',
};

/**
 * Visual regression inspection surface for styles/authenticated/, not
 * documentation prose. Development only — 404s in every other environment.
 */
export default function DesignSystemGalleryPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }

  return <DesignSystemGalleryClient />;
}
