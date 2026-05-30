import { redirect } from 'next/navigation';

export default function SavedViewsRedirectPage() {
  redirect('/history');
}
