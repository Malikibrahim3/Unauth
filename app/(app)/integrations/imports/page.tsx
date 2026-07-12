import { CanonicalCsvImportClient } from '@/components/imports/CanonicalCsvImportClient';

export const metadata = { title: 'Import records' };

export default function ImportsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl font-semibold">Import records</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Import orders, refunds, or customers from a CSV. Rows validate individually — valid
        rows import even if others fail. Imported records are tagged with CSV-import provenance.
      </p>
      <div className="mt-6">
        <CanonicalCsvImportClient />
      </div>
    </div>
  );
}
