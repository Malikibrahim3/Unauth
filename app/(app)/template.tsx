/**
 * §7.2 LP-MOT-05: Next.js remounts `template.tsx` on every navigation (unlike
 * `layout.tsx`), which is exactly the "one route-body settle, shell remains
 * fixed, no child stagger" behavior Instrument Grade requires — the sidebar,
 * header, and banners in the parent layout never remount, only this wrapper
 * and the page below it do. The actual animation lives in
 * `.ua-route-settle` in the replacement stylesheet so it stays inert under
 * reduced motion and capture mode via the shared product rules there.
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="ua-route-settle" style={{ height: '100%', minHeight: '100%' }}>
      <RouteReadinessBoundary>{children}</RouteReadinessBoundary>
    </div>
  );
}
import { RouteReadinessBoundary } from '@/components/system/RouteReadinessBoundary';
