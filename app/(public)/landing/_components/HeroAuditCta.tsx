'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

export default function HeroAuditCta() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    const params = new URLSearchParams({ email: trimmedEmail });
    router.push(`/audit-demo?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-[520px] flex-col gap-3 sm:flex-row sm:items-stretch"
    >
      <Input
        type="email"
        required
        inputMode="email"
        autoComplete="email"
        placeholder="you@yourstore.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-label="Work email"
        className="h-12 min-w-0 rounded-[14px] border-[var(--landing-border)] bg-white px-4 text-[15px] text-[var(--landing-ink)] placeholder:text-[var(--landing-ink-tertiary)]"
        style={{
          boxShadow: '0 12px 28px -20px rgba(26,24,20,0.18)',
        }}
      />
      <Button
        type="submit"
        size="lg"
        className="h-12 rounded-[14px] px-6 normal-case tracking-normal"
        style={{
          background: 'var(--landing-accent)',
          borderColor: 'var(--landing-accent)',
          color: 'var(--landing-accent-fg)',
          boxShadow: 'var(--landing-shadow-cta)',
        }}
      >
        Run a free audit →
      </Button>
    </form>
  );
}
