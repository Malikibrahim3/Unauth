export const metadata = {
  title: 'Mobile Not Supported',
};

export default function MobileUnsupportedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Mobile Phones Are Not Supported</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          This app is only available on desktop and tablet devices. Please open it on a larger screen to continue.
        </p>
      </section>
    </main>
  );
}
