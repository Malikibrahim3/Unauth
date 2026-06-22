import type { ReactNode } from 'react';
import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#F8F8F7] text-[#17151F]">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col px-5 py-6 sm:px-6">
        <Link href="/" className="mb-12 inline-flex w-fit">
          <UnauthLogo variant="light" size="nav" />
        </Link>
        <div className="flex flex-1 flex-col justify-center pb-12">{children}</div>
      </div>
    </main>
  );
}

export function AuthError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;

  return (
    <p id={id} className="mt-2 text-sm leading-5 text-[#9F2F3B]">
      {children}
    </p>
  );
}

export const authInputClassName =
  'h-12 rounded-md border-[#D9D7E2] bg-white px-3.5 text-[16px] text-[#17151F] shadow-none placeholder:text-[#8C879A] focus:border-[#5D4B8B] focus:bg-white focus:ring-[0_0_0_3px_rgba(93,75,139,0.16)]';

export const authButtonStyle = {
  background: '#5D4B8B',
  color: '#FFFFFF',
  borderColor: '#5D4B8B',
  borderRadius: '8px',
  boxShadow: 'none',
} as const;

