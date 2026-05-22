'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';
import { autoMapHeaders, REQUIRED_FIELDS, type RequiredField } from '@/lib/csv/headerAliases';

type Step = 'account' | 'upload';

type ParsedCsv = {
  rowCount: number;
  headers: string[];
  hashedFile: File;
};

type HashableField =
  | 'customer_email'
  | 'customer_name'
  | 'shipping_address'
  | 'billing_address'
  | 'customer_phone'
  | 'ip_address'
  | 'device_id'
  | 'browser_fingerprint'
  | 'cookie_id'
  | 'account_id'
  | 'card_fingerprint';

const HASHABLE_FIELDS = new Set<HashableField>([
  'customer_email',
  'customer_name',
  'shipping_address',
  'billing_address',
  'customer_phone',
  'ip_address',
  'device_id',
  'browser_fingerprint',
  'cookie_id',
  'account_id',
  'card_fingerprint',
]);

const TEXT_MUTED: React.CSSProperties = {
  color: '#8A8472',
  fontFamily: 'var(--font-dm-sans, sans-serif)',
};

function toCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

async function sha256Hex(value: string): Promise<string> {
  const buffer = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function parseAndHashCsv(file: File): Promise<ParsedCsv> {
  const csvText = await file.text();

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? 'We could not read that CSV.');
  }

  const headers = parsed.meta.fields ?? [];
  const { exact, fuzzy } = autoMapHeaders(headers);
  const columnMap = { ...exact, ...fuzzy } as Partial<Record<RequiredField, string>>;
  const missingRequired = REQUIRED_FIELDS.filter((field) => !columnMap[field]);

  if (missingRequired.length > 0) {
    throw new Error(`We could not automatically match: ${missingRequired.join(', ')}.`);
  }

  const headerToField = new Map<string, RequiredField>();
  for (const [field, header] of Object.entries(columnMap)) {
    if (header) headerToField.set(header, field as RequiredField);
  }
  const selectedHeaders = headers.filter((header) => headerToField.has(header));

  const salt = crypto.randomUUID();
  const rows = await Promise.all(
    parsed.data.map(async (row) => {
      const nextRow: Record<string, string> = {};
      await Promise.all(
        selectedHeaders.map(async (header) => {
          const field = headerToField.get(header);
          const rawValue = toCsvValue(row[header]).trim();

          if (field && HASHABLE_FIELDS.has(field as HashableField) && rawValue) {
            nextRow[header] = await sha256Hex(`${salt}:${field}:${rawValue.toLowerCase()}`);
            return;
          }

          nextRow[header] = rawValue;
        })
      );
      return nextRow;
    })
  );

  const hashedCsv = Papa.unparse(rows, { columns: selectedHeaders });
  const hashedFile = new File([hashedCsv], file.name, { type: 'text/csv' });

  return {
    rowCount: rows.length,
    headers: selectedHeaders,
    hashedFile,
  };
}

export default function SignupFlow() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [step, setStep] = useState<Step>('account');
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [hashedFile, setHashedFile] = useState<File | null>(null);
  const [columnMap, setColumnMap] = useState<Partial<Record<RequiredField, string>>>({});
  const [accountLoading, setAccountLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationFallback, setVerificationFallback] = useState(false);

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setAccountLoading(true);

    const signUpResult = await supabase.auth.signUp({
      email: workEmail.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
        data: {
          full_name: fullName.trim(),
          store_name: storeName.trim(),
          setup_complete: true,
        },
      },
    });

    if (signUpResult.error) {
      setAccountLoading(false);
      setError(signUpResult.error.message);
      return;
    }

    let user = signUpResult.data.user ?? null;

    if (!signUpResult.data.session) {
      const signInResult = await supabase.auth.signInWithPassword({
        email: workEmail.trim(),
        password,
      });

      if (!signInResult.error) {
        user = signInResult.data.user;
      } else {
        setVerificationFallback(true);
      }
    }

    if (user) {
      const merchantPayload = {
        user_id: user.id,
        name: storeName.trim(),
        setup_complete: true,
      };

      const { error: merchantError } = await supabase
        .from('merchants')
        .upsert(merchantPayload as never, { onConflict: 'user_id' });

      if (merchantError) {
        setAccountLoading(false);
        setError(merchantError.message);
        return;
      }

      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          store_name: storeName.trim(),
          setup_complete: true,
        },
      });
    }

    setAccountLoading(false);
    setStep('upload');
  }

  async function handleFileSelection(file: File | null) {
    setError('');
    setSelectedFile(file);
    setRowCount(null);
    setHashedFile(null);
    setColumnMap({});

    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please choose a CSV file.');
      return;
    }

    try {
      const parsed = await parseAndHashCsv(file);
      setRowCount(parsed.rowCount);
      setHashedFile(parsed.hashedFile);
      const { exact, fuzzy } = autoMapHeaders(parsed.headers);
      setColumnMap({ ...exact, ...fuzzy });
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'We could not prepare that CSV.');
    }
  }

  async function handleRunAudit() {
    if (!selectedFile || !hashedFile) return;
    setError('');
    setUploadLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUploadLoading(false);
      setError('Check your verification email, then sign in to continue your upload.');
      return;
    }

    const filePath = `${user.id}/${Date.now()}_${hashedFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from('merchant-csv-uploads-2')
      .upload(filePath, hashedFile, {
        contentType: 'text/csv',
        upsert: false,
        cacheControl: '3600',
      });

    if (uploadError) {
      setUploadLoading(false);
      setError(uploadError.message);
      return;
    }

    const fileBuffer = await hashedFile.arrayBuffer();
    const fileHash = await crypto.subtle.digest('SHA-256', fileBuffer);
    const fileHashHex = Array.from(new Uint8Array(fileHash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    const response = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filePath,
        columnMap,
        label: 'Last 90 days',
        uploadType: 'standard',
        fileHash: fileHashHex,
      }),
    });

    const body = await response.json().catch(() => ({}));

    setUploadLoading(false);

    if (!response.ok) {
      setError(typeof body?.error === 'string' ? body.error : 'We could not start the audit.');
      return;
    }

    router.push(`/audit-running?email=${encodeURIComponent(user.email ?? workEmail.trim())}`);
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F5EE', color: '#1A1814' }}>
      <div className="mx-auto grid min-h-screen max-w-[1400px] gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b px-6 py-12 md:px-10 lg:border-b-0 lg:border-r" style={{ borderColor: '#D8D0BD' }}>
          <Link href="/" className="inline-block">
            <span className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: '#7B2D26' }}>
              Unauth
            </span>
          </Link>

          <div className="mt-16 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
              Tier 1 · siloed audit
            </p>
            <h1
              className="mt-4"
              style={{
                fontFamily: 'var(--font-dm-sans, sans-serif)',
                fontSize: 'clamp(34px, 5vw, 58px)',
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: '-0.03em',
              }}
            >
              Find out who&apos;s been hitting you.
            </h1>
            <p
              className="mt-5 max-w-[34rem]"
              style={{
                fontFamily: 'var(--font-serif, serif)',
                fontSize: '18px',
                lineHeight: 1.6,
                color: '#4A4640',
              }}
            >
              Create your account, upload your last 90 days of orders and refunds, and we&apos;ll run a siloed fraud-resolution audit on your store data only.
            </p>

            <div className="mt-10 space-y-4">
              {[
                'Free, instant access. No approval gate.',
                'Audit runs on your data only. No cross-merchant signals at this stage.',
                'Results land in your inbox in around 20 minutes.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ background: '#7B2D26' }} />
                  <p className="text-sm leading-6" style={TEXT_MUTED}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-12 md:px-10">
          <div className="mx-auto max-w-xl rounded-sm border bg-[#FDFBF6] p-8 md:p-10" style={{ borderColor: '#D8D0BD' }}>
            {step === 'account' ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
                  Step 1 · account
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-tight">Create your account.</h2>

                <form className="mt-8 space-y-5" onSubmit={handleCreateAccount}>
                  <Field label="Full name">
                    <Input value={fullName} onChange={(event) => setFullName(event.target.value)} required style={TEXT_MUTED} />
                  </Field>
                  <Field label="Work email">
                    <Input type="email" value={workEmail} onChange={(event) => setWorkEmail(event.target.value)} required style={TEXT_MUTED} />
                  </Field>
                  <Field label="Store name">
                    <Input value={storeName} onChange={(event) => setStoreName(event.target.value)} required style={TEXT_MUTED} />
                  </Field>
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Password">
                      <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required style={TEXT_MUTED} />
                    </Field>
                    <Field label="Confirm password">
                      <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required style={TEXT_MUTED} />
                    </Field>
                  </div>

                  {error ? (
                    <p className="text-sm" style={{ color: '#7B2D26' }}>
                      {error}
                    </p>
                  ) : null}

                  <div className="pt-2">
                    <Button type="submit" size="lg" loading={accountLoading}>
                      Create account →
                    </Button>
                    <p className="mt-3 text-sm" style={TEXT_MUTED}>
                      Free to start. No card required.
                    </p>
                  </div>
                </form>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: '#78889C' }}>
                  Step 2 · upload
                </p>
                <h2 className="mt-3 text-3xl font-medium tracking-tight">Upload your order export.</h2>
                <p className="mt-4 text-base leading-7" style={{ color: '#4A4640', fontFamily: 'var(--font-serif, serif)' }}>
                  A CSV of your last 90 days works best. 5,000–50,000 rows. We&apos;ll match your columns automatically — no formatting required.
                </p>

                {verificationFallback ? (
                  <div className="mt-6 rounded-sm border px-4 py-3 text-sm" style={{ borderColor: '#D8D0BD', background: '#F8F5EE', color: '#4A4640' }}>
                    We created your account and sent a confirmation email. If your environment requires verification before sign-in, confirm that email, then continue here.
                  </div>
                ) : null}

                <label
                  className="mt-8 flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-sm border border-dashed px-6 py-8 text-center"
                  style={{ borderColor: '#C7BEAA', background: '#FAF6EF' }}
                >
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => handleFileSelection(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-base font-medium">Drag and drop or choose a CSV</p>
                  <p className="mt-2 text-sm" style={TEXT_MUTED}>
                    Accepts .csv only
                  </p>
                  {selectedFile ? (
                    <div className="mt-6 rounded-sm border px-4 py-3 text-left text-sm" style={{ borderColor: '#D8D0BD', background: '#FDFBF6', minWidth: '100%' }}>
                      <p className="font-medium" style={{ color: '#1A1814' }}>
                        {selectedFile.name}
                      </p>
                      <p className="mt-1" style={TEXT_MUTED}>
                        {rowCount !== null ? `${rowCount.toLocaleString()} rows detected` : 'Preparing file…'}
                      </p>
                    </div>
                  ) : null}
                </label>

                {error ? (
                  <p className="mt-4 text-sm" style={{ color: '#7B2D26' }}>
                    {error}
                  </p>
                ) : null}

                <div className="mt-8">
                  <Button type="button" size="lg" loading={uploadLoading} disabled={!hashedFile} onClick={handleRunAudit}>
                    Run audit →
                  </Button>
                  <p className="mt-3 text-sm" style={TEXT_MUTED}>
                    Your data is hashed before it leaves your browser. Unauth never sees raw PII.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#78889C' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
