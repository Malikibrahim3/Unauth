import { redirect } from 'next/navigation';

export default function ClustersAliasPage() {
  redirect('/customers?merchantsMin=2');
}
