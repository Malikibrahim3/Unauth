import type { ReactNode } from 'react';
import { PublicRoot } from '@/components/public/PublicUI';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <PublicRoot>{children}</PublicRoot>;
}
