import {
  shopifyCustomerUrl,
  shopifyOrderUrl,
  shipBobOrdersUrl,
  shipBobShipmentUrl,
} from "@/lib/links/providerDeepLinks";

type SourceLinkDbClient = { from: (table: string) => any };

export type SourceLinkRow = Record<string, unknown>;

export type SourceLinkContext = {
  storeConnections: Array<{
    id: string;
    storeKey: string | null;
    storeUrl: string | null;
  }>;
  integrations: Array<{
    id: string;
    providerId: string;
    providerBaseUrl: string | null;
    environment: string | null;
  }>;
  sourceAccounts: Array<{
    id: string;
    connectionId: string | null;
    providerId: string;
    baseUrl: string | null;
    environment: string | null;
  }>;
};

export type DerivedSourceLink = {
  sourceSystem: string;
  externalId: string;
  sourceUrl: string | null;
};

function value(row: SourceLinkRow | null | undefined, key: string): string | null {
  const raw = row?.[key];
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return null;
}

function providerId(
  row: SourceLinkRow | null | undefined,
  sourceRecord: SourceLinkRow | null | undefined,
  parentOrder: SourceLinkRow | null | undefined,
): string | null {
  return (
    value(sourceRecord, "source_system") ??
    value(row, "source") ??
    value(row, "provider") ??
    value(parentOrder, "source") ??
    value(parentOrder, "provider")
  )?.toLowerCase() ?? null;
}

function isShopify(provider: string | null): boolean {
  return provider === "shopify" || provider?.startsWith("shopify_") === true;
}

function isShipBob(provider: string | null): boolean {
  return provider === "shipbob";
}

function connectionId(
  row: SourceLinkRow | null | undefined,
  sourceRecord: SourceLinkRow | null | undefined,
  parentOrder: SourceLinkRow | null | undefined,
): string | null {
  return (
    value(sourceRecord, "connection_id") ??
    value(row, "connection_id") ??
    value(parentOrder, "connection_id")
  );
}

function sourceAccountId(
  row: SourceLinkRow | null | undefined,
  sourceRecord: SourceLinkRow | null | undefined,
  parentOrder: SourceLinkRow | null | undefined,
): string | null {
  return (
    value(sourceRecord, "source_account_id") ??
    value(row, "source_account_id") ??
    value(parentOrder, "source_account_id")
  );
}

function integrationFor(
  context: SourceLinkContext,
  id: string | null,
  provider: string | null,
) {
  if (id) {
    const exact = context.integrations.find((item) => item.id === id);
    if (exact) return exact;
  }
  return provider
    ? context.integrations.find((item) => item.providerId.toLowerCase() === provider)
    : undefined;
}

function accountFor(context: SourceLinkContext, id: string | null, provider: string | null) {
  if (id) {
    const exact = context.sourceAccounts.find((item) => item.id === id);
    if (exact) return exact;
  }
  return provider
    ? context.sourceAccounts.find((item) => item.providerId.toLowerCase() === provider)
    : undefined;
}

/** Load the small provider-configuration projection used by all deep links. */
export async function loadSourceLinkContext(
  client: SourceLinkDbClient,
  merchantId: string,
): Promise<SourceLinkContext> {
  const [storesResult, integrationsResult, accountsResult] = await Promise.all([
    client
      .from("store_connections")
      .select("id,store_key,store_url")
      .eq("merchant_id", merchantId)
      .eq("platform", "shopify"),
    client
      .from("merchant_integrations")
      .select("id,provider_id,provider_base_url,environment")
      .eq("merchant_id", merchantId),
    client
      .from("source_accounts")
      .select("id,connection_id,provider_id,base_url,environment")
      .eq("merchant_id", merchantId),
  ]);
  if (storesResult.error) throw new Error(`source_link_store_lookup_failed:${storesResult.error.message}`);
  if (integrationsResult.error) throw new Error(`source_link_integration_lookup_failed:${integrationsResult.error.message}`);
  if (accountsResult.error) throw new Error(`source_link_account_lookup_failed:${accountsResult.error.message}`);

  return {
    storeConnections: ((storesResult.data as SourceLinkRow[] | null) ?? []).map((row) => ({
      id: value(row, "id")!,
      storeKey: value(row, "store_key"),
      storeUrl: value(row, "store_url"),
    })),
    integrations: ((integrationsResult.data as SourceLinkRow[] | null) ?? []).map((row) => ({
      id: value(row, "id")!,
      providerId: value(row, "provider_id") ?? "",
      providerBaseUrl: value(row, "provider_base_url"),
      environment: value(row, "environment"),
    })),
    sourceAccounts: ((accountsResult.data as SourceLinkRow[] | null) ?? []).map((row) => ({
      id: value(row, "id")!,
      connectionId: value(row, "connection_id"),
      providerId: value(row, "provider_id") ?? "",
      baseUrl: value(row, "base_url"),
      environment: value(row, "environment"),
    })),
  };
}

/**
 * Derive a browser link from a canonical row and its provider provenance.
 * `relatedShipmentExternalId` is used for a ShipBob order when the caller has
 * already loaded its first shipment; that makes an order open directly on the
 * useful order/shipments detail page instead of only the orders list.
 */
export function deriveSourceLink(input: {
  context: SourceLinkContext;
  entityType: string;
  row?: SourceLinkRow | null;
  parentOrder?: SourceLinkRow | null;
  sourceRecord?: SourceLinkRow | null;
  relatedShipmentExternalId?: string | null;
}): DerivedSourceLink | null {
  const { context, entityType, row, parentOrder, sourceRecord } = input;
  const provider = providerId(row, sourceRecord, parentOrder);
  if (!provider) return null;

  const externalId =
    value(sourceRecord, "external_id") ??
    value(row, "external_id") ??
    (entityType === "customer" ? null : value(parentOrder, "external_id"));
  if (!externalId) return null;

  const storedSourceUrl = value(sourceRecord, "source_url");
  if (storedSourceUrl) {
    return { sourceSystem: provider, externalId, sourceUrl: storedSourceUrl };
  }

  if (isShopify(provider)) {
    const connection = connectionId(row, sourceRecord, parentOrder);
    const store = context.storeConnections.find((item) => item.id === connection);
    const integration = integrationFor(context, connection, provider);
    const storeBaseUrl = store?.storeUrl ?? store?.storeKey ?? integration?.providerBaseUrl;
    const sourceUrl = entityType === "customer"
      ? shopifyCustomerUrl(storeBaseUrl, externalId)
      : shopifyOrderUrl(
          storeBaseUrl,
          entityType === "order" ? externalId : value(parentOrder, "external_id"),
        );
    return { sourceSystem: "shopify", externalId, sourceUrl };
  }

  if (isShipBob(provider)) {
    const accountId = sourceAccountId(row, sourceRecord, parentOrder);
    const account = accountFor(context, accountId, provider);
    const integration = integrationFor(
      context,
      account?.connectionId ?? connectionId(row, sourceRecord, parentOrder),
      provider,
    );
    const environment = account?.environment ?? integration?.environment ??
      ((account?.baseUrl ?? integration?.providerBaseUrl)?.includes("sandbox")
        ? "sandbox"
        : "production");
    const orderExternalId = entityType === "order"
      ? externalId
      : value(parentOrder, "external_id");
    const shipmentExternalId = entityType === "shipment" || entityType === "fulfilment"
      ? value(row, "external_id")
      : input.relatedShipmentExternalId;
    const sourceUrl = orderExternalId && shipmentExternalId
      ? shipBobShipmentUrl(environment, orderExternalId, shipmentExternalId)
      : entityType === "order"
        ? shipBobOrdersUrl(environment)
        : null;
    return { sourceSystem: "shipbob", externalId, sourceUrl };
  }

  return { sourceSystem: provider, externalId, sourceUrl: null };
}
