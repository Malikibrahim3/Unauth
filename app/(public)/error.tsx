'use client';
import { PublicState } from '@/components/public/PublicState';
export default function RouteState({reset,error}:{reset:()=>void;error:Error & {digest?:string}}) {
 return <PublicState title="This page could not load" description="Try loading the page again, or return to the product overview." stateId="public-route-error" retry={reset} digest={error.digest}/>;
}
