'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
      className="flex w-full max-w-[480px] items-center"
      style={{
        background: '#ffffff',
        border: '1px solid var(--landing-border)',
        borderRadius: '8px',
        padding: '5px 5px 5px 16px',
      }}
    >
      <input
        type="email"
        required
        inputMode="email"
        autoComplete="email"
        placeholder="you@yourstore.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-label="Work email"
        style={{
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-dm-sans, sans-serif)',
          fontSize: '15px',
          color: 'var(--landing-ink)',
        }}
      />
      <button
        type="submit"
        style={{
          flexShrink: 0,
          background: 'var(--landing-accent)',
          color: 'var(--landing-accent-fg)',
          border: 'none',
          borderRadius: '5px',
          padding: '9px 18px',
          fontFamily: 'var(--font-dm-sans, sans-serif)',
          fontSize: '14px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          letterSpacing: '-0.01em',
        }}
      >
        Run free audit →
      </button>
    </form>
  );
}
