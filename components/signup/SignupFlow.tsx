'use client';

import { useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TABLES } from '@/lib/supabase/tables';
import {
  initialSignupFlowState,
  signupFlowReducer,
} from '@/components/signup/signupFlowReducer';
import { SignupFlowMarketingPanel } from '@/components/signup/SignupFlowMarketingPanel';
import { SignupFlowSteps } from '@/components/signup/SignupFlowSteps';

export default function SignupFlow() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, dispatch] = useReducer(signupFlowReducer, initialSignupFlowState);

  const patch = (patchState: Partial<typeof state>) => dispatch({ type: 'patch', patch: patchState });

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    patch({ error: '' });

    if (state.password !== state.confirmPassword) {
      patch({ error: 'Passwords do not match.' });
      return;
    }

    patch({ accountLoading: true });

    const signUpResult = await supabase.auth.signUp({
      email: state.workEmail.trim(),
      password: state.password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: {
          full_name: state.fullName.trim(),
          store_name: state.storeName.trim(),
          setup_complete: true,
        },
      },
    });

    if (signUpResult.error) {
      patch({ accountLoading: false, error: signUpResult.error.message });
      return;
    }

    let user = signUpResult.data.user ?? null;

    if (!signUpResult.data.session) {
      const signInResult = await supabase.auth.signInWithPassword({
        email: state.workEmail.trim(),
        password: state.password,
      });

      if (!signInResult.error) {
        user = signInResult.data.user;
      } else {
        patch({ verificationFallback: true });
      }
    }

    if (user) {
      const merchantPayload = {
        user_id: user.id,
        name: state.storeName.trim(),
        setup_complete: true,
      };

      const { error: merchantError } = await supabase
        .from(TABLES.MERCHANTS)
        .upsert(merchantPayload as never, { onConflict: 'user_id' });

      if (merchantError) {
        patch({ accountLoading: false, error: merchantError.message });
        return;
      }

      await supabase.auth.updateUser({
        data: {
          full_name: state.fullName.trim(),
          store_name: state.storeName.trim(),
          setup_complete: true,
        },
      });
    }

    patch({ accountLoading: false });
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', color: '#1A1814' }}>
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <SignupFlowMarketingPanel />
        <SignupFlowSteps
          state={state}
          onPatch={patch}
          onCreateAccount={handleCreateAccount}
        />
      </div>
    </div>
  );
}
