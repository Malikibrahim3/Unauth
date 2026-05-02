import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    screens: {
      sm:  '640px',
      md:  '768px',
      lg:  '1024px',
      xl:  '1280px',
      '2xl': '1600px',
    },
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        /* ── Surfaces ── */
        canvas:  'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle:  'var(--bg-subtle)',

        /* ── shadcn compat ── */
        border:      'var(--border)',
        input:       'var(--border)',
        ring:        'var(--focus-ring)',
        background:  'var(--bg-canvas)',
        foreground:  'var(--text)',
        primary: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--text-inverse)',
        },
        secondary: {
          DEFAULT:    'var(--bg-subtle)',
          foreground: 'var(--text)',
        },
        destructive: {
          DEFAULT:    'var(--risk-critical)',
          foreground: 'var(--text-inverse)',
        },
        muted: {
          DEFAULT:    'var(--bg-subtle)',
          foreground: 'var(--text-muted)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--text-inverse)',
        },
        popover: {
          DEFAULT:    'var(--bg-surface)',
          foreground: 'var(--text)',
        },
        card: {
          DEFAULT:    'var(--bg-surface)',
          foreground: 'var(--text)',
        },

        /* ── Risk tiers ── */
        risk: {
          critical: {
            DEFAULT: 'var(--risk-critical)',
            bg:      'var(--risk-critical-bg)',
            bd:      'var(--risk-critical-bd)',
          },
          high: {
            DEFAULT: 'var(--risk-high)',
            bg:      'var(--risk-high-bg)',
            bd:      'var(--risk-high-bd)',
          },
          medium: {
            DEFAULT: 'var(--risk-medium)',
            bg:      'var(--risk-medium-bg)',
            bd:      'var(--risk-medium-bd)',
          },
          low: {
            DEFAULT: 'var(--risk-low)',
            bg:      'var(--risk-low-bg)',
            bd:      'var(--risk-low-bd)',
          },
          none: {
            DEFAULT: 'var(--risk-none)',
            bg:      'var(--risk-none-bg)',
            bd:      'var(--risk-none-bd)',
          },
        },

        /* ── Informational ── */
        info: {
          DEFAULT: 'var(--info)',
          bg:      'var(--info-bg)',
          bd:      'var(--info-bd)',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg:      'var(--success-bg)',
          bd:      'var(--success-bd)',
        },
        watchlist: {
          DEFAULT: 'var(--watchlist)',
          bg:      'var(--watchlist-bg)',
          bd:      'var(--watchlist-bd)',
        },
      },

      borderRadius: {
        xs:   'var(--radius-xs)',
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
        /* keep default Tailwind rounded-* utilities working */
        DEFAULT: 'var(--radius-md)',
      },

      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
      },

      /* Spacing uses Tailwind's default 4px base — we document the tokens in globals.css */

      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'shimmer':        'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
