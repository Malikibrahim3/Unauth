import Link from 'next/link';
import { LegalHeader } from '@/components/public/LegalHeader';
import styles from '@/components/public/legalDocument.module.css';

/** Keeps an unknown legal URL inside the public editorial system. */
export default function LegalNotFound() {
  return (
    <>
      <LegalHeader currentPath="" />
      <main id="main-content" className={styles.notFound} tabIndex={-1}>
        <h1>Legal page not found</h1>
        <p>The legal page you requested does not exist or may have moved.</p>
        <div className={styles.notFoundActions}>
          <Link href="/legal/privacy">Privacy policy</Link>
          <Link href="/legal/data-handling">Data handling</Link>
          <Link href="/landing">Back to home</Link>
        </div>
      </main>
    </>
  );
}
