'use client';
import { PublicState } from '@/components/public/PublicState';
export default function RouteState({reset,error}:{reset:()=>void;error:Error & {digest?:string}}) {
 return <PublicState title="This document could not load" description="Try loading the legal document again, or return to the product overview." stateId="legal-document-error" retry={reset} digest={error.digest}/>;
}
