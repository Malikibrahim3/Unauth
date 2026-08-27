import Link from 'next/link';
import { UnauthLogo } from '@/components/ui/UnauthLogo';
import { neutralLandingViewModel } from './neutralLandingViewModel';
import styles from './neutralLanding.module.css';

export function NeutralLandingFooter() {
  const { footer, routes } = neutralLandingViewModel;

  return (
    <footer className={styles.footer}>
      <div className={styles.shell}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <Link href={routes.landing} aria-label="Unauth home" className={styles.logoLink} prefetch={false}>
              <UnauthLogo kind="wordmark" tone="graphite" height={22} alt="Unauth" />
            </Link>
            <p>{footer.tagline}</p>
            <Link href={routes.signup} className={styles.secondaryButton} prefetch={false}>Create workspace</Link>
          </div>

          {footer.columns.map((column) => (
            <nav key={column.heading} aria-label={`${column.heading} links`} className={styles.footerColumn}>
              <h2>{column.heading}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link href={link.href} prefetch={false}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className={styles.footerBottom}>
          <div>
            <p>{footer.legal}</p>
            <p>{footer.legalRules}</p>
          </div>
          <p>© {new Date().getFullYear()} Unauth</p>
        </div>
      </div>
    </footer>
  );
}
