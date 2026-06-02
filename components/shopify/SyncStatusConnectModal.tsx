'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeShopInput } from '@/lib/shopify/normalizeShopInput';

export function SyncStatusConnectModal({
  initialValue,
  onClose,
}: {
  initialValue?: string;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');
  const [inputError, setInputError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = normalizeShopInput(value);
    if (result.error === 'empty') {
      setInputError('Please enter your Shopify Admin URL.');
      inputRef.current?.focus();
      return;
    }
    if (result.error === 'public_domain') {
      setInputError(
        'That looks like a public website address. Please enter your Shopify Admin URL instead - for example admin.shopify.com/store/your-store.',
      );
      inputRef.current?.focus();
      return;
    }
    if (result.error === 'invalid') {
      setInputError('We could not recognise that as a Shopify Admin URL. Try admin.shopify.com/store/your-store.');
      inputRef.current?.focus();
      return;
    }
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(result.domain as string)}`;
  }

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-0 flex max-h-none max-w-none items-center justify-center border-0 bg-transparent p-4 backdrop:bg-black/45 open:flex"
      aria-labelledby="connect-shopify-title"
      onClose={onClose}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close connect Shopify dialog"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-xl p-6 shadow-xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded p-1 opacity-50 hover:opacity-100"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <h2
          id="connect-shopify-title"
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--text)' }}
        >
          Connect Shopify
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
          We use this only to send you to the correct Shopify approval screen.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="shopify-admin-url"
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text)' }}
            >
              Shopify Admin URL
            </label>
            <input
              ref={inputRef}
              id="shopify-admin-url"
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value); setInputError(''); }}
              placeholder="admin.shopify.com/store/your-store"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1"
              style={{
                borderColor: inputError ? 'var(--risk-high, #DC2626)' : 'var(--border-subtle)',
                background: 'var(--bg-inset)',
                color: 'var(--text)',
              }}
              autoComplete="off"
              spellCheck={false}
              data-testid="shopify-admin-url-input"
            />
            {inputError ? (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--risk-high, #DC2626)' }} role="alert">
                {inputError}
              </p>
            ) : (
              <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                Paste the Shopify Admin URL for the store you want to connect. You can find it in Shopify Admin, usually as{' '}
                <code className="font-mono">admin.shopify.com/store/your-store</code>.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-xs font-medium"
              style={{ color: 'var(--text-muted)', background: 'var(--bg-inset)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md px-4 py-2 text-xs font-semibold"
              style={{ background: 'var(--accent)', color: '#fff' }}
              data-testid="shopify-connect-submit"
            >
              Continue to Shopify →
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
