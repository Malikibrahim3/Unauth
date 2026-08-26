"use client";

import { useState } from "react";
import { BeforeYouConfirm, Button, FormField, Input, Modal } from "@/components/ui";
import { normalizeShopInput } from "@/lib/shopify/normalizeShopInput";

export function SyncStatusConnectModal({ initialValue, onClose }: { initialValue?: string; onClose: () => void }) {
  const [value, setValue] = useState(initialValue ?? "");
  const [inputError, setInputError] = useState("");
  const normalized = normalizeShopInput(value);

  function continueToShopify() {
    const result = normalizeShopInput(value);
    if (result.error === "empty") return setInputError("Enter the Shopify Admin URL.");
    if (result.error === "public_domain") return setInputError("Use the Shopify Admin URL, not the public storefront address.");
    if (result.error === "invalid") return setInputError("Use admin.shopify.com/store/your-store or your-store.myshopify.com.");
    window.location.assign(`/api/shopify/install?shop=${encodeURIComponent(result.domain as string)}`);
  }

  return (
    <Modal open onClose={onClose} title="Connect Shopify" description="Normalise and verify the admin URL before authorising" overlayId="connect-shopify-modal" size="lg">
      <form onSubmit={(event) => { event.preventDefault(); continueToShopify(); }} className="space-y-4">
        <p className="ua-text-body rounded-[10px] border border-[var(--uo-route-info-border)] bg-[var(--uo-route-info-bg)] p-3 text-[var(--uo-route-info)]">
          Shopify authorises against your admin domain, not your storefront domain. Unauth normalises what you type and shows the exact URL it will send you to.
        </p>
        <FormField label="Shopify Admin URL" error={inputError || undefined} hint="Find this address in Shopify Admin. It usually begins admin.shopify.com/store/.">
          <Input id="shopify-admin-url" value={value} onChange={(event) => { setValue(event.target.value); setInputError(""); }} placeholder="admin.shopify.com/store/your-store" autoComplete="off" spellCheck={false} data-testid="shopify-admin-url-input" />
        </FormField>
        <section className="rounded-[10px] border border-[var(--uo-route-border-default)] p-3">
          <p className="ua-text-label text-[var(--uo-route-text-secondary)]">Will authorise against</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--uo-route-text-primary)]">
            {normalized.domain ? `https://${normalized.domain}/admin/oauth` : '— Enter a valid Shopify admin URL'}
          </p>
          <div className="mt-3 grid gap-2 ua-text-body text-[var(--uo-route-text-secondary)]">
            <p>Read orders, customers and refunds <span className="float-right ua-text-metadata">Required</span></p>
            <p>Read fulfilments and shipments <span className="float-right ua-text-metadata">Required</span></p>
            <p>Write anything <span className="float-right ua-text-metadata">Never requested</span></p>
          </div>
        </section>
        <BeforeYouConfirm
          objectSummary={`New Shopify connection${normalized.domain ? ` · ${normalized.domain}` : ''}`}
          valueSummary="No financial value changes. Ingestion only."
          externalAction="Yes. You leave Unauth for Shopify to approve the displayed read-only scopes."
          reversible="Yes. Disconnecting stops ingestion and keeps canonical records already held."
          appendOnly="A connection record, Shopify authorization result and an audit entry. A first sync starts only after Shopify confirms access."
        />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="shopify-connect-submit">Continue to Shopify</Button></div>
      </form>
    </Modal>
  );
}
