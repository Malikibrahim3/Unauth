'use client';

import { useState, useEffect } from 'react';
import { UnauthLogo } from '@/components/ui/UnauthLogo';

export function StickyHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: scrolled ? 'rgba(248,245,238,0.84)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px) saturate(150%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(150%)' : 'none',
        borderBottom: scrolled
          ? '1px solid rgba(216,208,189,0.6)'
          : '1px solid transparent',
        transition: 'background 0.35s ease, border-color 0.35s ease',
      }}
    >
      <div
        style={{
          margin: '0 auto',
          maxWidth: '1400px',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
        }}
      >
        <UnauthLogo variant="light" size={28} />

        <nav
          className="hidden md:flex"
          style={{ alignItems: 'center', gap: '36px' }}
        >
          {[
            { label: 'Pattern',      id: 'section-pattern' },
            { label: 'Network',      id: 'section-network' },
            { label: 'How it works', id: 'section-how' },
            { label: 'Security',     id: 'section-security' },
          ].map(({ label, id }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: '15px',
                color: '#4A4640',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                letterSpacing: '0.01em',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#1A1814'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#4A4640'; }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a
            href="/login"
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '15px',
              color: '#4A4640',
              textDecoration: 'none',
            }}
          >
            Sign in
          </a>
          <a
            href="/login"
            style={{
              fontFamily: 'var(--font-dm-sans, sans-serif)',
              fontSize: '13px',
              fontWeight: 600,
              color: '#E8E4D8',
              background: 'linear-gradient(135deg, #8C3129 0%, #7B2D26 100%)',
              borderRadius: '8px',
              padding: '9px 20px',
              textDecoration: 'none',
              letterSpacing: '0.03em',
              boxShadow: '0 2px 10px rgba(123,45,38,0.22)',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(123,45,38,0.38)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(123,45,38,0.22)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
