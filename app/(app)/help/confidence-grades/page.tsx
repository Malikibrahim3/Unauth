import { redirect } from 'next/navigation';

export default function LegacyConfidenceGradesRedirect() {
  redirect('/help');
}
