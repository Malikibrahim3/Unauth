/**
 * Landing page design tokens — single source of truth for JS/TS usage.
 *
 * Every value is a CSS custom property reference defined in globals.css.
 * NEVER write raw hex, rgb, or hsl values in landing components.
 * NEVER add values here that aren't already in globals.css.
 *
 * Usage:  import { t } from '@/app/(public)/landing/_tokens';
 *         style={{ color: t.ink, background: t.cream }}
 */

export const t = {
  // ── Fonts ─────────────────────────────────────────────────────────────
  sans:  'var(--font-sans)',
  mono:  'var(--font-mono)',
  serif: 'var(--font-serif, Georgia, serif)',

  // ── Ink — warm grey scale ─────────────────────────────────────────────
  ink:          'var(--landing-ink)',
  inkSecondary: 'var(--landing-ink-secondary)',
  inkTertiary:  'var(--landing-ink-tertiary)',
  inkMuted:     'var(--landing-ink-muted)',
  inkFaint:     'var(--landing-ink-faint)',

  // ── Surfaces ──────────────────────────────────────────────────────────
  bg:     'var(--landing-bg)',
  paper:  'var(--landing-paper)',
  cream:  'var(--landing-cream)',
  cream2: 'var(--landing-cream-2)',

  // ── Lines / borders ───────────────────────────────────────────────────
  line:      'var(--landing-line)',
  lineFaint: 'var(--landing-line-faint)',
  border:    'var(--landing-border)',

  // ── Accent — burgundy ─────────────────────────────────────────────────
  accent:      'var(--landing-accent)',
  accentHover: 'var(--landing-accent-hover)',
  accentFg:    'var(--landing-accent-fg)',

  // ── Dark section (§1 + audit form) ───────────────────────────────────
  darkBg:      'var(--landing-dark-bg)',
  darkCard:    'var(--landing-dark-card)',
  darkBorder:  'var(--landing-dark-border)',
  darkBorder2: 'var(--landing-dark-border-2)',
  darkText:    'var(--landing-dark-text)',
  darkLabel:   'var(--landing-dark-label)',
  darkSubtle:  'var(--landing-dark-subtle)',
  darkBright:  'var(--landing-dark-bright)',
  darkWarm:    'var(--landing-dark-warm)',
  darkMuted:   'var(--landing-dark-muted)',
  darkDim:     'var(--landing-dark-dim)',
  darkFaint:   'var(--landing-dark-faint)',

  // ── Security section (§7 — deepest dark) ─────────────────────────────
  securityBg:       'var(--landing-security-bg)',
  securityBg2:      'var(--landing-security-bg-2)',
  securityBg3:      'var(--landing-security-bg-3)',
  securityAccent:   'var(--landing-security-accent)',
  securityAccent2:  'var(--landing-security-accent-2)',

  // ── Warm surfaces (comparison table, feature rows) ────────────────────
  surfaceWarm:   'var(--landing-surface-warm)',
  surfaceWarm2:  'var(--landing-surface-warm-2)',
  surfacePink:   'var(--landing-surface-pink)',
  surfacePink2:  'var(--landing-surface-pink-2)',
  borderWarm:    'var(--landing-border-warm)',

  // ── Extended dark palette ─────────────────────────────────────────────
  darkShell2:    'var(--landing-dark-shell-2)',
  darkBgDeep:    'var(--landing-dark-bg-deep)',
  darkMid:       'var(--landing-dark-mid)',
  amber:         'var(--landing-amber)',
  orange:        'var(--landing-orange)',
  greenBright:   'var(--landing-green-bright)',
  accentDark:    'var(--landing-accent-dark)',
  // Card overlays
  cardBg:        'var(--landing-card-bg)',
  cardHd:        'var(--landing-card-hd)',
  cardBd:        'var(--landing-card-bd)',
  cardHb:        'var(--landing-card-hb)',

  // ── Form states ───────────────────────────────────────────────────────
  errorFg: 'var(--landing-error-fg)',

  // ── Semantic fills ────────────────────────────────────────────────────
  surfaceAlt:    'var(--landing-surface-alt)',
  screenshotBg:  'var(--landing-screenshot-bg)',
  greenFg:       'var(--landing-green-fg)',
  greenBg:       'var(--landing-green-bg)',
  warnFg:        'var(--landing-warn-fg)',
  warnBg:        'var(--landing-warn-bg)',

  // ── Radius ────────────────────────────────────────────────────────────
  radius:        'var(--landing-radius)',        // 6px — all cards
  radiusTabTop:  '6px 6px 0 0',                 // tab bar top corners
  radiusTabBot:  '0 0 6px 6px',                 // panel bottom corners

  // ── Shadows ───────────────────────────────────────────────────────────
  shadowCard:  'var(--landing-shadow-card)',
  shadowPanel: 'var(--landing-shadow-panel)',
  shadowHero:  'var(--landing-shadow-hero)',
  shadowCta:   'var(--landing-shadow-cta)',
} as const;
