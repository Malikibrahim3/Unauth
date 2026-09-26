'use client';
import { PublicState } from '@/components/public/PublicState';
export default function RouteState({reset,error}:{reset:()=>void;error:Error & {digest?:string}}) {
 return <PublicState title="The sample could not load" description="The walkthrough is browser-local. No real merchant or provider action is performed." stateId="demo-error" retry={reset} digest={error.digest}/>;
}
