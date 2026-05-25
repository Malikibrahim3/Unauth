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
      className="ua-hero-cta"
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
        className="ua-hero-cta-input"
      />
      <button type="submit" className="ua-hero-cta-button">
        Run free audit →
      </button>

      <style>{`
        .ua-hero-cta {
          display: flex;
          width: 100%;
          max-width: 480px;
          align-items: center;
          background: #ffffff;
          border: 1px solid var(--landing-border);
          border-radius: 8px;
          padding: 5px 5px 5px 16px;
        }
        .ua-hero-cta-input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-dm-sans, sans-serif);
          font-size: 15px;
          color: var(--landing-ink);
        }
        .ua-hero-cta-button {
          flex-shrink: 0;
          background: var(--landing-accent);
          color: var(--landing-accent-fg);
          border: none;
          border-radius: 5px;
          padding: 9px 18px;
          font-family: var(--font-dm-sans, sans-serif);
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          cursor: pointer;
          letter-spacing: -0.01em;
        }
        @media (max-width: 359px) {
          .ua-hero-cta {
            flex-direction: column;
            align-items: stretch;
            gap: 6px;
            padding: 8px;
          }
          .ua-hero-cta-input {
            padding: 8px 8px;
            font-size: 16px;
            border-bottom: 1px solid var(--landing-line-faint);
            border-radius: 0;
          }
          .ua-hero-cta-button {
            padding: 11px 14px;
          }
        }
      `}</style>
    </form>
  );
}
