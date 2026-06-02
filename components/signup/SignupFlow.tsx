'use client';

import { useMemo, useReducer, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { autoMapHeaders } from '@/lib/csv/headerAliases';
import { createClient } from '@/lib/supabase/client';
import { TABLES, STORAGE_BUCKETS } from '@/lib/supabase/tables';
import { parseAndHashCsv } from '@/components/signup/signupFlowCsv';
import {
  initialSignupFlowState,
  signupFlowReducer,
  type SignupColumnMap,
} from '@/components/signup/signupFlowReducer';
import { SignupFlowMarketingPanel } from '@/components/signup/SignupFlowMarketingPanel';
import { SignupFlowSteps } from '@/components/signup/SignupFlowSteps';

export default function SignupFlow() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, dispatch] = useReducer(signupFlowReducer, initialSignupFlowState);
  const columnMapRef = useRef<SignupColumnMap>({});

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

    patch({ accountLoading: false, step: 'upload' });
  }

  async function handleFileSelection(file: File | null) {
    patch({
      error: '',
      selectedFile: file,
      rowCount: null,
      hashedFile: null,
    });
    columnMapRef.current = {};

    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      patch({ error: 'Please choose a CSV file.' });
      return;
    }

    try {
      const parsed = await parseAndHashCsv(file);
      const { exact, fuzzy } = autoMapHeaders(parsed.headers);
      columnMapRef.current = { ...exact, ...fuzzy };
      patch({
        rowCount: parsed.rowCount,
        hashedFile: parsed.hashedFile,
      });
    } catch (fileError) {
      patch({
        error: fileError instanceof Error ? fileError.message : 'We could not prepare that CSV.',
      });
    }
  }

  async function handleRunAudit() {
    if (!state.selectedFile || !state.hashedFile) return;
    patch({ error: '', uploadLoading: true });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      patch({
        uploadLoading: false,
        error: 'Check your verification email, then sign in to continue your upload.',
      });
      return;
    }

    const filePath = `${user.id}/${Date.now()}_${state.hashedFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.MERCHANT_CSV_UPLOADS)
      .upload(filePath, state.hashedFile, {
        contentType: 'text/csv',
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadError) {
      patch({ uploadLoading: false, error: uploadError.message });
      return;
    }

    const fileBuffer = await state.hashedFile.arrayBuffer();
    const fileHash = await crypto.subtle.digest('SHA-256', fileBuffer);
    const fileHashHex = Array.from(new Uint8Array(fileHash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        columnMap: columnMapRef.current,
        label: 'Last 90 days',
        uploadType: 'standard',
        fileHash: fileHashHex,
      }),
    });

    const body: { error?: string } = await response.json().catch(() => ({}));

    patch({ uploadLoading: false });

    if (!response.ok) {
      patch({
        error: typeof body.error === 'string' ? body.error : 'We could not start the audit.',
      });
      return;
    }

    router.push(`/audit-running?email=${encodeURIComponent(user.email ?? state.workEmail.trim())}`);
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
          onFileSelection={handleFileSelection}
          onRunAudit={handleRunAudit}
        />
      </div>
    </div>
  );
}
