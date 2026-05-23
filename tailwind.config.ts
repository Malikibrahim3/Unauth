import type { Config } from 'tailwindcss';

const config: Config = {
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
        sans:    ['var(--font-sans)', 'DM Sans', 'sans-serif'],
        display: ['var(--font-sans)', 'DM Sans', 'sans-serif'],
        mono:    ['var(--font-mono)', 'DM Mono', 'monospace'],
      },
      spacing: {
        's1':  'var(--space-1)',
        's2':  'var(--space-2)',
        's3':  'var(--space-3)',
        's4':  'var(--space-4)',
        's5':  'var(--space-5)',
        's6':  'var(--space-6)',
        's7':  'var(--space-7)',
        's8':  'var(--space-8)',
        's9':  'var(--space-9)',
        's10': 'var(--space-10)',
        's11': 'var(--space-11)',
      },
      colors: {
        /* Direction A canonical tokens */
        'surface-base':    'var(--surface-base)',
        'surface-raised':  'var(--surface-raised)',
        'surface-overlay': 'var(--surface-overlay)',
        'surface-border':  'var(--surface-border)',
        'surface-muted':   'var(--surface-muted)',
        'surface-input':   'var(--surface-input)',
        'ink-primary':     'var(--ink-primary)',
        'ink-secondary':   'var(--ink-secondary)',
        'ink-tertiary':    'var(--ink-tertiary)',
        'ink-inverse':     'var(--ink-inverse)',
        'copper-bright':   'var(--copper-bright)',
        'copper-mid':      'var(--copper-mid)',
        'copper-dim':      'var(--copper-dim)',
        'sev-definite':    'var(--sev-definite)',
        'sev-probable':    'var(--sev-probable)',
        'sev-neutral':     'var(--sev-neutral)',
        'sev-clear':       'var(--sev-clear)',
        'privacy-ink':     'var(--privacy-ink)',
        'privacy-fill':    'var(--privacy-fill)',
        'privacy-border':  'var(--privacy-border)',
        'data-score':      'var(--data-score)',
        'data-currency':   'var(--data-currency)',
        'data-id':         'var(--data-id)',
        'data-date':       'var(--data-date)',

        /* ── Spec token surface aliases ── */
        'surface-alt':  'var(--bg-surface-alt)',
        'surface-sunk': 'var(--bg-surface-sunk)',
        'hover':        'var(--bg-hover)',
        'selected':     'var(--bg-selected)',
        /* ── Spec text aliases ── */
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary':  'var(--text-tertiary)',
        'text-link':      'var(--text-link)',
        /* ── Spec accent ── */
        'accent-500': 'var(--accent-500)',
        'accent-600': 'var(--accent-600)',
        'accent-700': 'var(--accent-700)',
        /* ── Spec risk semantic aliases ── */
        'risk-critical-fg':   'var(--risk-critical-fg)',
        'risk-critical-line': 'var(--risk-critical-line)',
        'risk-high-fg':       'var(--risk-high-fg)',
        'risk-high-line':     'var(--risk-high-line)',
        'risk-medium-fg':     'var(--risk-medium-fg)',
        'risk-medium-line':   'var(--risk-medium-line)',
        'risk-low-fg':        'var(--risk-low-fg)',
        'risk-low-line':      'var(--risk-low-line)',
        'info-fg':            'var(--info-fg)',
        'info-line':          'var(--info-line)',

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
        /* spec tokens */
        r1:   'var(--radius-1)',
        r2:   'var(--radius-2)',
        r3:   'var(--radius-3)',
        r4:   'var(--radius-4)',
        pill: 'var(--radius-pill)',
        DEFAULT: 'var(--radius-md)',
      },

      boxShadow: {
        xs:     'var(--shadow-xs)',
        sm:     'var(--shadow-sm)',
        md:     'var(--shadow-md)',
        lg:     'var(--shadow-lg)',
        xl:     'var(--shadow-xl)',
        /* spec tokens */
        s0:     'var(--shadow-0)',
        s1:     'var(--shadow-1)',
        s2:     'var(--shadow-2)',
        drawer: 'var(--shadow-drawer)',
        modal:  'var(--shadow-modal)',
        focus:  'var(--shadow-focus)',
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
