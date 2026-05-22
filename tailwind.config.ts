import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'IBM Plex Mono', 'monospace'],
      },
      colors: {
        'surface-base': 'var(--surface-base)',
        'surface-raised': 'var(--surface-raised)',
        'surface-overlay': 'var(--surface-overlay)',
        'surface-border': 'var(--surface-border)',
        'surface-muted': 'var(--surface-muted)',
        'surface-input': 'var(--surface-input)',
        'ink-primary': 'var(--ink-primary)',
        'ink-secondary': 'var(--ink-secondary)',
        'ink-tertiary': 'var(--ink-tertiary)',
        'ink-inverse': 'var(--ink-inverse)',
        'copper-bright': 'var(--copper-bright)',
        'copper-mid': 'var(--copper-mid)',
        'copper-dim': 'var(--copper-dim)',
        'sev-definite': 'var(--sev-definite)',
        'sev-definite-fill': 'var(--sev-definite-fill)',
        'sev-probable': 'var(--sev-probable)',
        'sev-probable-fill': 'var(--sev-probable-fill)',
        'sev-neutral': 'var(--sev-neutral)',
        'sev-neutral-fill': 'var(--sev-neutral-fill)',
        'sev-clear': 'var(--sev-clear)',
        'sev-clear-fill': 'var(--sev-clear-fill)',
        'privacy-ink': 'var(--privacy-ink)',
        'privacy-fill': 'var(--privacy-fill)',
        'privacy-border': 'var(--privacy-border)',
        'data-score': 'var(--data-score)',
        'data-currency': 'var(--data-currency)',
        'data-id': 'var(--data-id)',
        'data-date': 'var(--data-date)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xl: '0 18px 48px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
