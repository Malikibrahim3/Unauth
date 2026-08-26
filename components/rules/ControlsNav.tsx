'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, GitBranch, RefreshCcw, ShieldCheck } from 'lucide-react';
import styles from './AutomationControls.module.css';

const ITEMS = [
  { href: '/controls/rules', label: 'Rules', icon: ShieldCheck, exact: true },
  { href: '/controls/rules/recovery', label: 'Recovery rulebook', icon: RefreshCcw, exact: false },
  { href: '/controls/flows', label: 'Flows', icon: GitBranch, exact: true },
  { href: '/controls/flows/runs', label: 'Run history', icon: Activity, exact: false },
] as const;

export function ControlsNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.controlsNav} aria-label="Controls sections">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
            || (href === '/controls/rules' && /^\/controls\/rules\/(?!recovery$)[^/]+$/.test(pathname))
            || (href === '/controls/flows' && /^\/controls\/flows\/(?!runs$)[^/]+$/.test(pathname))
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} className={styles.controlsNavLink} data-active={active} aria-current={active ? 'page' : undefined}>
            <Icon size={14} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function LifecycleGuide({ kind }: { kind: 'rule' | 'flow' }) {
  const isRule = kind === 'rule';
  return (
    <div className={styles.guide}>
      <div>
        <p className={styles.guideTitle}>{isRule ? 'Recommendations stay separate from decisions' : 'Draft automation stays separate from live execution'}</p>
        <p className={styles.guideCopy}>
          {isRule
            ? 'Draft and simulate policy safely. Publishing changes the recommendation version; an authorised merchant still records every case decision.'
            : 'Build bounded actions and test a sample event without live writes. Pilot publication and live execution are unavailable.'}
        </p>
      </div>
      <div className={styles.guideSteps} aria-label={`${isRule ? 'Rule' : 'Flow'} lifecycle`}>
        {(isRule ? ['Draft', 'Simulate', 'Publish', 'History'] : ['Draft', 'Test', 'Diagnose']).map((step) => (
          <span className={styles.guideStep} key={step}><span className={styles.guideDot} aria-hidden="true" />{step}</span>
        ))}
      </div>
    </div>
  );
}
