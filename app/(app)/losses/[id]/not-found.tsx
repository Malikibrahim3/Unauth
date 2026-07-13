import Link from 'next/link';
export default function LossNotFound() { return <main className="p-10 text-center"><h1 className="text-xl font-semibold">Loss not found</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">It may have been removed or belong to another workspace.</p><Link href="/losses" className="mt-4 inline-block underline">Return to Losses</Link></main>; }
