import { LandingHeroCaseCardBody } from './LandingHeroCaseCardBody';
import { LandingHeroCaseCardFooter } from './LandingHeroCaseCardFooter';

export function LandingHeroCaseCard() {
  return (
    <div className="hidden lg:w-full lg:max-h-[720px] overflow-hidden">
      <div className="ua-hover-glow ua-case-card ua-premium-surface ua-case-card-glass" suppressHydrationWarning>
        <div className="ua-case-file-header">
          <p className="ua-case-file-eyebrow">
            <span className="ua-case-file-eyebrow-accent">●</span>{' '}
            CASE FILE · UN-2026-04-21-0083
          </p>
          <div className="ua-case-chip-row">
            <span className="ua-case-chip ua-case-chip-accent">DEFINITE</span>
            <span className="ua-case-chip ua-case-chip-muted">RISK 0.92</span>
            <span className="ua-case-chip ua-case-chip-muted">CONF 0.96</span>
          </div>
        </div>
        <LandingHeroCaseCardBody />
        <LandingHeroCaseCardFooter />
      </div>
    </div>
  );
}
