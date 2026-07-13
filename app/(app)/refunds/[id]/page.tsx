import { connectedObjectPage } from '@/lib/relationships/connectedObjectPage';
export default async function Page(props: { params: Promise<{id:string}>; searchParams: Promise<{return?:string}> }) { return connectedObjectPage('refund', props); }
