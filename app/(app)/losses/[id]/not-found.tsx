import Link from 'next/link';
import { AuthenticatedPageHeader } from '@/components/authenticated/AuthenticatedPageHeader';
import { AuthenticatedPanel } from '@/components/authenticated/AuthenticatedPanel';
import pageStyles from '@/components/authenticated/AuthenticatedPageChrome.module.css';
export default function LossNotFound() { return <div><AuthenticatedPageHeader eyebrow="Loss ledger" title="Loss not found" subtitle="It may have been removed or belong to another workspace." /><div className={pageStyles.pageBody}><AuthenticatedPanel bodyClassName="p-4"><Link href="/losses" className="text-[length:var(--ua-text-metadata-size)] font-semibold underline">Return to losses</Link></AuthenticatedPanel></div></div>; }
