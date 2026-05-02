import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/nav/Sidebar';
import AppHeader from '@/components/layout/AppHeader';
import DemoBanner from '@/components/common/DemoBanner';
import { headers } from 'next/headers';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Onboarding redirect: skip if already on /onboarding
  const headerList = headers();
  const pathname = headerList.get('x-pathname') ?? '';
  const isOnboarding = pathname.startsWith('/onboarding');

  if (!isOnboarding) {
    const [{ count: jobCount }, { data: merchantRow }] = await Promise.all([
      supabase.from('processing_jobs').select('*', { count: 'exact', head: true }).eq('is_demo', false),
      supabase.from('merchants').select('setup_complete').eq('user_id', user.id).single(),
    ]);

    const needsOnboarding =
      (jobCount === 0 || jobCount === null) &&
      (!merchantRow || !(merchantRow as unknown as { setup_complete: boolean }).setup_complete);

    if (needsOnboarding) {
      redirect('/onboarding');
    }
  }

  const { data: jobs } = await supabase
    .from('processing_jobs')
    .select('is_demo')
    .limit(20);

  const allDemo =
    (jobs ?? []).length > 0 &&
    (jobs as unknown as Array<{ is_demo: boolean }>).every((j) => j.is_demo);

  return (
    /*
     * Shell:  sidebar (sticky, full height) + right column (header sticky + scrollable body)
     * The sidebar handles its own collapse state in localStorage.
     * Only the page body scrolls — sidebar and header are fixed to the viewport.
     */
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* ── Sidebar ── */}
      <Sidebar merchantName={null} userEmail={user.email ?? ''} />

      {/* ── Right column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky header */}
        <AppHeader />

        {/* Demo / data-quality banner (full-width, between header and page) */}
        {allDemo && (
          <div className="flex-shrink-0">
            <DemoBanner />
          </div>
        )}

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
