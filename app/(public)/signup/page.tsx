import type { Metadata } from 'next';
import SignupFlow from '@/components/signup/SignupFlow';

export const metadata: Metadata = {
  title: 'Sign up | Unauth',
};

export default function SignupPage() {
  return <SignupFlow />;
}
