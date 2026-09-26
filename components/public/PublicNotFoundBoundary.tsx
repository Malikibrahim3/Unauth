'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PublicRoot } from './PublicUI';
import { PublicState } from './PublicState';
export function PublicNotFoundBoundary({fallback}:{fallback:ReactNode}) {
 const path=usePathname()??'';
 const publicPath=['/landing','/pricing','/demo','/login','/signup','/reset','/legal'].some(prefix=>path===prefix||path.startsWith(prefix+'/'));
 return publicPath?<PublicRoot><PublicState title="Page not found" description="This public page does not exist or may have moved. Return to the product overview or use the legal links below." stateId="public-not-found"/></PublicRoot>:fallback;
}
