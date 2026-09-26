'use client';
import { PublicState } from '@/components/public/PublicState';
export default function RouteState({reset,error}:{reset:()=>void;error:Error & {digest?:string}}) {
 return <PublicState title="Account access could not load" description="Reload account access. If a prior request was submitted, confirm its result before repeating it." stateId="auth-route-error" retry={reset} digest={error.digest}/>;
}
