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
    // This endpoint starts an external Shopify OAuth navigation, so it must be a top-level browser navigation.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/shopify/install?shop=${encodeURIComponent(result.domain as string)}`);
  }

  return (
    <Modal open onClose={onClose} title="Connect Shopify" description="Normalise and verify the admin URL before authorising" overlayId="connect-shopify-modal" size="lg">
      <form onSubmit={(event) => { event.preventDefault(); continueToShopify(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ margin: 0, color: "#247388", fontSize: 13, lineHeight: "20px", border: "1px solid #c4dfe5", borderRadius: 10, background: "#edf6f8", padding: 12 }}>
          Shopify authorises against your admin domain, not your storefront domain. Unauth normalises what you type and shows the exact URL it will send you to.
        </p>
        <FormField label="Shopify Admin URL" error={inputError || undefined} hint="Find this address in Shopify Admin. It usually begins admin.shopify.com/store/.">
          <Input id="shopify-admin-url" value={value} onChange={(event) => { setValue(event.target.value); setInputError(""); }} placeholder="admin.shopify.com/store/your-store" autoComplete="off" spellCheck={false} data-testid="shopify-admin-url-input" />
        </FormField>
        <section style={{ border: "1px solid #e4e3e0", borderRadius: 10, padding: 12 }}>
          <p style={{ margin: 0, color: "#64686d", fontSize: 11, fontWeight: 500, lineHeight: "16px" }}>Will authorise against</p>
          <p style={{ margin: "8px 0 0", wordBreak: "break-all", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace", fontSize: 12, lineHeight: "16px", color: "#1c1f23" }}>
            {normalized.domain ? `https://${normalized.domain}/admin/oauth` : '— Enter a valid Shopify admin URL'}
          </p>
          <div style={{ marginTop: 12, display: "grid", gap: 8, fontSize: 13, lineHeight: "20px", color: "#64686d" }}>
            <p style={{ margin: 0 }}>Read orders, customers and refunds <span style={{ float: "right", fontSize: 10.5, lineHeight: "16px", color: "#6f6a63" }}>Required</span></p>
            <p style={{ margin: 0 }}>Read fulfilments and shipments <span style={{ float: "right", fontSize: 10.5, lineHeight: "16px", color: "#6f6a63" }}>Required</span></p>
            <p style={{ margin: 0 }}>Write anything <span style={{ float: "right", fontSize: 10.5, lineHeight: "16px", color: "#6f6a63" }}>Never requested</span></p>
          </div>
        </section>
        <BeforeYouConfirm
          objectSummary={`New Shopify connection${normalized.domain ? ` · ${normalized.domain}` : ''}`}
          valueSummary="No financial value changes. Ingestion only."
          externalAction="Yes. You leave Unauth for Shopify to approve the displayed read-only scopes."
          reversible="Yes. Disconnecting stops ingestion and keeps canonical records already held."
          appendOnly="A connection record, Shopify authorization result and an audit entry. A first sync starts only after Shopify confirms access."
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" data-testid="shopify-connect-submit">Continue to Shopify</Button></div>
      </form>
    </Modal>
  );
}
