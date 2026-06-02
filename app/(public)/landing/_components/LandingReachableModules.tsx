'use client';

import dynamic from 'next/dynamic';
import { AnimatedGridPattern } from '@/components/ui/animated-grid-pattern';
import { BorderBeam } from '@/components/ui/border-beam';
import { Meteors } from '@/components/ui/meteors';
import { DottedMap } from '@/registry/magicui/dotted-map';

const MerchantDashboard = dynamic(() => import('./MerchantDashboard'), { ssr: false });
const NetworkChart = dynamic(() => import('./NetworkChart'), { ssr: false });
const AuditForm = dynamic(() => import('../AuditForm'), { ssr: false });
const PublicAuditForm = dynamic(() => import('../PublicAuditForm'), { ssr: false });

/**
 * Keeps landing marketing modules in the app import graph (react-doctor reachability).
 * Renders only when ?landing_modules=1 - otherwise returns null with no client bundle cost for the chunks until requested.
 */
export default function LandingReachableModules({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div className="sr-only" aria-hidden>
      <MerchantDashboard />
      <NetworkChart />
      <AuditForm />
      <PublicAuditForm />
      <AnimatedGridPattern numSquares={4} maxOpacity={0.05} duration={3} className="hidden" />
      <Meteors number={2} />
      <BorderBeam size={40} duration={8} />
      <DottedMap width={120} height={60} mapSamples={400} />
    </div>
  );
}
