export const uiTokens = {
  colors: {
    ink: {
      primary: '#111111',
      espresso: '#1A1814',
      muted: 'rgba(17,17,17,0.56)',
      faint: 'rgba(17,17,17,0.42)',
      inverse: '#FFFFFF',
    },
    panel: {
      dark: '#111111',
      paper: '#FFFFFF',
      raised: '#fbfbfa',
      muted: '#f6f5f2',
      input: '#f8f8f6',
    },
    brand: {
      rust: '#A85040',
      rustDeep: '#7B2D26',
      rustHover: '#5E2018',
      rustSoft: '#F4E6E0',
      espresso: '#1A1814',
    },
    evidence: {
      confirmed: '#1f9d57',
      pending: 'rgba(0,0,0,0.28)',
    },
  },
  typography: {
    sectionEyebrow:
      'font-mono text-xs uppercase tracking-[0.14em] text-[var(--uo-route-text-secondary)]',
    sectionHeadline:
      'mt-4 text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.02em] [font-family:var(--uo-route-font-sans)] md:text-[2.375rem]',
    sectionBody: 'mt-5 text-[1.0625rem] leading-[1.65]',
    landingEyebrow:
      '[font-family:var(--uo-route-font-sans)] text-[12px] font-semibold uppercase tracking-[0.16em] text-[rgba(17,17,17,0.42)]',
    landingHeadline:
      'mt-4 [font-family:var(--uo-route-font-sans)] text-[clamp(2.25rem,3.6vw,2.625rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[#111111]',
    landingBody:
      'mt-5 [font-family:var(--uo-route-font-sans)] text-[17px] leading-[1.55] tracking-[-0.025em] text-[rgba(17,17,17,0.56)]',
  },
  radius: {
    sm: 'rounded-md',
    card: 'rounded-lg',
    panel: 'rounded-[16px]',
    mock: 'rounded-[10px]',
    pill: 'rounded-full',
  },
  shadows: {
    panel:
      'shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_18px_45px_rgba(0,0,0,0.10),0_58px_120px_rgba(0,0,0,0.16)]',
    board:
      'shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_18px_46px_rgba(0,0,0,0.09),0_60px_130px_rgba(0,0,0,0.14)]',
    card: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_24px_rgba(0,0,0,0.045)]',
    browser: 'shadow-[0_24px_54px_rgba(23,28,36,0.16)]',
  },
  spacing: {
    badge: 'px-2.5 py-1',
    tag: 'h-[27px] px-2.5',
    panel: 'p-4',
    sectionX: 'px-5 sm:px-8',
  },
  badge: {
    base: 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold leading-none',
    tag: 'inline-flex h-[27px] items-center gap-1.5 rounded px-2.5 text-[14px] font-medium',
    dot: 'h-[4px] w-[4px] rounded-full',
  },
  stepBadges: {
    '01': {
      badge: 'bg-[#E0E7FF] text-[#4F46E5]',
      topBorder: 'border-t-[#E0E7FF]',
      text: '[--step-text:#4F46E5]',
    },
    '02': {
      badge: 'bg-[#FEF3C7] text-[#D97706]',
      topBorder: 'border-t-[#FEF3C7]',
      text: '[--step-text:#D97706]',
    },
    '03': {
      badge: 'bg-[#F5F0EB] text-[#6B4C35]',
      topBorder: 'border-t-[#F5F0EB]',
      text: '[--step-text:#6B4C35]',
    },
    '04': {
      badge: 'bg-[#FEE2E2] text-[#DC2626]',
      topBorder: 'border-t-[#FEE2E2]',
      text: '[--step-text:#DC2626]',
    },
    '05': {
      badge: 'bg-[#DCFCE7] text-[#16A34A]',
      topBorder: 'border-t-[#DCFCE7]',
      text: '[--step-text:#16A34A]',
    },
  },
  app: {
    card:
      'rounded-[var(--uo-route-radius-surface)] border bg-[var(--uo-route-surface-primary)] shadow-none',
    cardMuted:
      'rounded-[var(--uo-route-radius-surface)] border bg-[var(--uo-route-surface-muted)] shadow-none',
    cardInset:
      'rounded-[var(--uo-route-radius-surface)] border bg-[var(--uo-route-surface-muted)]',
    border: 'border-[var(--uo-route-border-default)]',
    borderMuted: 'border-[var(--uo-route-border-subtle)]',
    eyebrow:
      'text-[10px] font-medium uppercase tracking-wider text-[var(--uo-route-text-tertiary)]',
    heading: 'text-body font-semibold text-[var(--uo-route-text-primary)]',
    body: 'text-body-sm text-[var(--uo-route-text-secondary)]',
    caption: 'text-caption text-[var(--uo-route-text-tertiary)]',
  },
} as const;

export type StepBadgeVariant = keyof typeof uiTokens.stepBadges;
