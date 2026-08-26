import type { ReactNode } from 'react';
import { AuthShell } from './AuthShell';
import '@/styles/operations/index.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return <AuthShell>{children}</AuthShell>;
}
