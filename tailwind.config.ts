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
        sans:    ['var(--ua-font-sans, var(--font-sans))', 'DM Sans', 'sans-serif'],
        display: ['var(--ua-font-sans, var(--font-sans))', 'DM Sans', 'sans-serif'],
        mono:    ['var(--ua-font-mono, var(--font-mono))', 'DM Mono', 'monospace'],
      },
      spacing: {
        's1':  'var(--ua-space-1, var(--space-1))',
        's2':  'var(--ua-space-2, var(--space-2))',
        's3':  'var(--ua-space-3, var(--space-3))',
        's4':  'var(--ua-space-4, var(--space-4))',
        's5':  'var(--ua-space-5, var(--space-5))',
        's6':  'var(--ua-space-6, var(--space-6))',
        's7':  'var(--ua-space-8, var(--space-7))',
        's8':  'var(--ua-space-10, var(--space-8))',
        's9':  'var(--ua-space-12, var(--space-9))',
        's10': 'var(--space-10)',
        's11': 'var(--space-11)',
      },
      colors: {
        /* Direction A canonical tokens */
        'surface-base':    'var(--ua-canvas, var(--surface-base))',
        'surface-raised':  'var(--ua-surface-primary, var(--surface-raised))',
        'surface-overlay': 'var(--ua-surface-primary, var(--surface-overlay))',
        'surface-border':  'var(--ua-border-default, var(--surface-border))',
        'surface-muted':   'var(--ua-surface-muted, var(--surface-muted))',
        'surface-input':   'var(--ua-surface-primary, var(--surface-input))',
        'ink-primary':     'var(--ua-text-primary, var(--ink-primary))',
        'ink-secondary':   'var(--ua-text-secondary, var(--ink-secondary))',
        'ink-tertiary':    'var(--ua-text-tertiary, var(--ink-tertiary))',
        'ink-inverse':     'var(--ua-text-inverse, var(--ink-inverse))',
        'copper-bright':   'var(--copper-bright)',
        'copper-mid':      'var(--copper-mid)',
        'copper-dim':      'var(--copper-dim)',
        'sev-definite':    'var(--ua-severity-definite, var(--sev-definite))',
        'sev-probable':    'var(--ua-severity-probable, var(--sev-probable))',
        'sev-neutral':     'var(--ua-severity-possible, var(--sev-neutral))',
        'sev-clear':       'var(--ua-severity-clear, var(--sev-clear))',
        'privacy-ink':     'var(--ua-privacy, var(--privacy-ink))',
        'privacy-fill':    'var(--ua-privacy-bg, var(--privacy-fill))',
        'privacy-border':  'var(--ua-privacy-border, var(--privacy-border))',
        'data-score':      'var(--data-score)',
        'data-currency':   'var(--data-currency)',
        'data-id':         'var(--data-id)',
        'data-date':       'var(--data-date)',

        /* ── Spec token surface aliases ── */
        'surface-alt':  'var(--ua-surface-secondary, var(--bg-surface-alt))',
        'surface-sunk': 'var(--ua-surface-muted, var(--bg-surface-sunk))',
        'hover':        'var(--ua-surface-hover, var(--bg-hover))',
        'selected':     'var(--ua-surface-selected, var(--bg-selected))',
        /* ── Spec text aliases ── */
        'text-primary':   'var(--ua-text-primary, var(--text-primary))',
        'text-secondary': 'var(--ua-text-secondary, var(--text-secondary))',
        'text-tertiary':  'var(--ua-text-tertiary, var(--text-tertiary))',
        'text-link':      'var(--ua-text-link, var(--text-link))',
        /* ── Spec accent ── */
        'accent-500': 'var(--accent-500)',
        'accent-600': 'var(--accent-600)',
        'accent-700': 'var(--accent-700)',
        /* ── Spec risk semantic aliases ── */
        'risk-critical-fg':   'var(--ua-risk-critical, var(--risk-critical-fg))',
        'risk-critical-line': 'var(--ua-risk-critical-line, var(--risk-critical-line))',
        'risk-high-fg':       'var(--ua-risk-high, var(--risk-high-fg))',
        'risk-high-line':     'var(--ua-risk-high-line, var(--risk-high-line))',
        'risk-medium-fg':     'var(--ua-risk-medium, var(--risk-medium-fg))',
        'risk-medium-line':   'var(--ua-risk-medium-line, var(--risk-medium-line))',
        'risk-low-fg':        'var(--ua-risk-low, var(--risk-low-fg))',
        'risk-low-line':      'var(--ua-risk-low-line, var(--risk-low-line))',
        'info-fg':            'var(--ua-info, var(--info-fg))',
        'info-line':          'var(--ua-info-line, var(--info-line))',

        /* ── Surfaces ── */
        canvas:  'var(--ua-canvas, var(--bg-canvas))',
        surface: 'var(--ua-surface-primary, var(--bg-surface))',
        subtle:  'var(--ua-surface-secondary, var(--bg-subtle))',

        /* ── shadcn compat ── */
        border:      'var(--ua-border-default, var(--border))',
        input:       'var(--ua-border-default, var(--border))',
        ring:        'var(--ua-border-focus, var(--focus-ring))',
        background:  'var(--ua-canvas, var(--bg-canvas))',
        foreground:  'var(--ua-text-primary, var(--text))',
        primary: {
          DEFAULT:    'var(--ua-action-primary, var(--accent))',
          foreground: 'var(--ua-text-inverse, var(--text-inverse))',
        },
        secondary: {
          DEFAULT:    'var(--ua-surface-secondary, var(--bg-subtle))',
          foreground: 'var(--ua-text-primary, var(--text))',
        },
        destructive: {
          DEFAULT:    'var(--ua-risk-critical, var(--risk-critical))',
          foreground: 'var(--ua-text-inverse, var(--text-inverse))',
        },
        muted: {
          DEFAULT:    'var(--ua-surface-secondary, var(--bg-subtle))',
          foreground: 'var(--ua-text-secondary, var(--text-muted))',
        },
        accent: {
          DEFAULT:    'var(--ua-action-primary, var(--accent))',
          foreground: 'var(--ua-text-inverse, var(--text-inverse))',
        },
        popover: {
          DEFAULT:    'var(--ua-surface-primary, var(--bg-surface))',
          foreground: 'var(--ua-text-primary, var(--text))',
        },
        card: {
          DEFAULT:    'var(--ua-surface-primary, var(--bg-surface))',
          foreground: 'var(--ua-text-primary, var(--text))',
        },

        /* ── Risk tiers ── */
        risk: {
          critical: {
            DEFAULT: 'var(--ua-risk-critical, var(--risk-critical))',
            bg:      'var(--ua-risk-critical-bg, var(--risk-critical-bg))',
            bd:      'var(--ua-risk-critical-border, var(--risk-critical-bd))',
          },
          high: {
            DEFAULT: 'var(--ua-risk-high, var(--risk-high))',
            bg:      'var(--ua-risk-high-bg, var(--risk-high-bg))',
            bd:      'var(--ua-risk-high-border, var(--risk-high-bd))',
          },
          medium: {
            DEFAULT: 'var(--ua-risk-medium, var(--risk-medium))',
            bg:      'var(--ua-risk-medium-bg, var(--risk-medium-bg))',
            bd:      'var(--ua-risk-medium-border, var(--risk-medium-bd))',
          },
          low: {
            DEFAULT: 'var(--ua-risk-low, var(--risk-low))',
            bg:      'var(--ua-risk-low-bg, var(--risk-low-bg))',
            bd:      'var(--ua-risk-low-border, var(--risk-low-bd))',
          },
          none: {
            DEFAULT: 'var(--ua-neutral, var(--risk-none))',
            bg:      'var(--ua-neutral-bg, var(--risk-none-bg))',
            bd:      'var(--ua-neutral-border, var(--risk-none-bd))',
          },
        },

        /* ── Informational ── */
        info: {
          DEFAULT: 'var(--ua-info, var(--info))',
          bg:      'var(--ua-info-bg, var(--info-bg))',
          bd:      'var(--ua-info-border, var(--info-bd))',
        },
        success: {
          DEFAULT: 'var(--ua-success, var(--success))',
          bg:      'var(--ua-success-bg, var(--success-bg))',
          bd:      'var(--ua-success-border, var(--success-bd))',
        },
        watchlist: {
          DEFAULT: 'var(--ua-watchlist, var(--watchlist))',
          bg:      'var(--ua-watchlist-bg, var(--watchlist-bg))',
          bd:      'var(--ua-watchlist-border, var(--watchlist-bd))',
        },
      },

      borderRadius: {
        xs:   'var(--ua-radius-xs, var(--radius-xs))',
        sm:   'var(--ua-radius-control, var(--radius-sm))',
        md:   'var(--ua-radius-control, var(--radius-md))',
        lg:   'var(--ua-radius-surface, var(--radius-lg))',
        xl:   'var(--ua-radius-overlay, var(--radius-xl))',
        full: 'var(--ua-radius-round, var(--radius-full))',
        /* spec tokens */
        r1:   'var(--ua-radius-xs, var(--radius-1))',
        r2:   'var(--ua-radius-control, var(--radius-2))',
        r3:   'var(--ua-radius-control, var(--radius-3))',
        r4:   'var(--ua-radius-surface, var(--radius-4))',
        pill: 'var(--ua-radius-round, var(--radius-pill))',
        DEFAULT: 'var(--ua-radius-control, var(--radius-md))',
      },

      boxShadow: {
        /* Inline product surfaces are flat (§3.5) — only floating layers lift. */
        xs:     'var(--ua-shadow-none, var(--shadow-xs))',
        sm:     'var(--ua-shadow-none, var(--shadow-sm))',
        md:     'var(--ua-shadow-none, var(--shadow-md))',
        lg:     'var(--ua-shadow-menu, var(--shadow-lg))',
        xl:     'var(--ua-shadow-overlay, var(--shadow-xl))',
        /* spec tokens */
        s0:     'var(--ua-shadow-none, var(--shadow-0))',
        s1:     'var(--ua-shadow-none, var(--shadow-1))',
        s2:     'var(--ua-shadow-none, var(--shadow-2))',
        drawer: 'var(--ua-shadow-overlay, var(--shadow-drawer))',
        modal:  'var(--ua-shadow-overlay, var(--shadow-modal))',
        focus:  'var(--ua-shadow-focus, var(--shadow-focus))',
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
