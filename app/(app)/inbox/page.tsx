import { redirect } from 'next/navigation';

// /inbox is an alias for the canonical claim queue at /claims.
export default function InboxPage() {
  redirect('/claims');
}
