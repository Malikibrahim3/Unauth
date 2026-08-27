export type IntegrationCategory =
  | 'commerce'
  | 'helpdesk'
  | 'tracking'
  | 'carrier'
  | 'warehouse_3pl'
  | 'returns'
  | 'payments_disputes'
  | 'documents';

export type IntegrationAuthMode = 'oauth' | 'api_key' | 'manual_upload';
/**
 * `partial` is connectable for its implemented read-only paths, but must not be
 * presented as a full connector lifecycle (sync + webhook + reconciliation).
 */
/** Internal implementation maturity. Merchant-facing labels are always derived. */
export type IntegrationCodeMaturity = 'complete' | 'partial' | 'slot_only';

/**
 * The ten independently-verifiable dimensions of a provider's operational
 * lifecycle. This is the merchant-facing truth about what actually works —
 * `deriveProviderDisplayStage` (lib/integrations/registry.ts) derives the
 * single Live/Beta/Partial/Planned label from this matrix rather than from a
 * hand-set flag, so a provider can never be labelled beyond what it can prove.
 */
export type LifecycleCapabilityId =
  | 'connect'
  | 'account_verification'
  | 'initial_import'
  | 'incremental_pull'
  | 'webhook'
  | 'reconciliation'
  | 'reconnect'
  | 'disconnect'
  | 'freshness_health'
  | 'bounded_writeback';

/**
 * The strength of evidence behind a capability claim. These are an ORDERED
 * ladder and MUST NOT be conflated — located code is not a passing test, and a
 * passing automated test is not a controlled runtime run against a real
 * account/environment.
 *
 * - `unavailable`: not implemented / no evidence at all.
 * - `implemented`: implementation located in source, but no dedicated
 *   automated test and no controlled runtime run.
 * - `automated_tested`: a contract/integration (jest) test in THIS repo
 *   exercises it and passes. Still not a run against a real provider or the
 *   live/staging application stack.
 * - `controlled_runtime_verified`: executed end-to-end in a controlled
 *   local/staging environment against a controlled account, with a dated,
 *   build-stamped evidence record (`runtimeEvidence`). This is the only level
 *   that can contribute to a `live` label.
 */
export type CapabilityEvidenceLevel =
  | 'unavailable'
  | 'implemented'
  | 'automated_tested'
  | 'controlled_runtime_verified';

/**
 * Whether a capability is part of this provider's product model. `not_applicable`
 * dimensions are excluded from the `live` requirement (e.g. carriers have no
 * ongoing sync/webhook lifecycle by design).
 */
export type CapabilityApplicability = 'applicable' | 'not_applicable';

/**
 * A dated, build-stamped record of a controlled runtime run. REQUIRED whenever
 * a capability claims `controlled_runtime_verified`; a claim without a complete
 * passing record and artifact here is treated as invalid (missing/stale proof
 * downgrades truthfully — see `hasValidControlledRuntimeEvidence`). Never
 * contains secrets.
 */
export type ControlledRuntimeEvidence = {
  /** e.g. "local-isolated", "staging". Never a production environment. */
  environment: string;
  /** Controlled account/merchant identifier used for the run (never a secret). */
  account: string;
  /** ISO date the controlled run was executed. */
  verifiedAt: string;
  /** Commit/build the run was executed against. */
  build: string;
  /** The scenario that was executed end-to-end. */
  scenario: string;
  /** The observed result. */
  result: 'passed' | 'failed';
  /** Known limitations of the run; empty only when the scenario was complete. */
  limitations: string[];
  /** Path to the persisted log/report that makes the run independently checkable. */
  artifactRef: string;
};

export type LifecycleCapability = {
  id: LifecycleCapabilityId;
  applicability: CapabilityApplicability;
  /** Highest evidence level GENUINELY achieved for this capability today. */
  evidence: CapabilityEvidenceLevel;
  /** Plain merchant-facing explanation of what this evidence means. */
  detail: string;
  /** REQUIRED iff `evidence === 'controlled_runtime_verified'`. */
  runtimeEvidence?: ControlledRuntimeEvidence;
};

/**
 * Merchant-facing build-maturity label, derived (never hand-set) from a
 * provider's lifecycle matrix by `deriveProviderDisplayStage`.
 * - `live`: EVERY applicable lifecycle dimension is `controlled_runtime_verified`
 *   with a valid evidence record. Code presence, automated tests, or a
 *   hand-authored citation are NOT sufficient, and provider kind
 *   (`manual_upload`) confers no shortcut.
 * - `beta`: has a genuinely-exercised ongoing sync relationship (webhook or
 *   incremental pull) proven at least by an automated test, but is not fully
 *   runtime-verified across every dimension. Shows "Runtime verification pending".
 * - `partial`: connects and does something real, but has no ongoing sync
 *   lifecycle and is not fully runtime-verified. Shows "Runtime verification pending".
 * - `planned`: not connectable yet.
 */
export type ProviderDisplayStage = 'live' | 'beta' | 'partial' | 'planned';
export type IntegrationConnectionStatus =
  | 'connected'
  | 'not_connected'
  | 'connection_error'
  | 'degraded'
  | 'revoked'
  | 'syncing'
  | 'disabled'
  /** Legacy database status, mapped to connection_error in new UI copy. */
  | 'error';

export type EvidenceCapability =
  | 'ticket_messages'
  | 'ticket_attachments'
  | 'customer_claim_reason'
  | 'requested_action'
  | 'order_value'
  | 'line_items'
  | 'customer_history'
  | 'refund_history'
  | 'reship_history'
  | 'tracking_number'
  | 'tracking_events'
  | 'delivery_status'
  | 'delivery_photo'
  | 'signature'
  | 'dispute_status'
  | 'chargeback_evidence'
  | 'contract_terms'
  | 'recovery_deadline'
  | 'return_request_status'
  | 'return_inspection_outcome'
  | 'warehouse_pick_pack'
  | 'warehouse_exception'
  | 'three_pl_sla_claim_status'
  | 'carrier_claim_submission_status'
  | 'carrier_claim_outcome'
  | 'recovery_amount_approved'
  | 'recovery_amount_paid'
  | 'self_reported_pack_confirmation'
  | 'self_reported_pack_photo';

export type ConnectorCapabilityMap = {
  readOrders?: boolean;
  readRefunds?: boolean;
  readDisputes?: boolean;
  readReturns?: boolean;
  readTracking?: boolean;
  readFulfilment?: boolean;
  readWarehouseEvents?: boolean;
  readCorrespondence?: boolean;
  sendCorrespondence?: boolean;
  readAttachments?: boolean;
  readClaimStatus?: boolean;
  createClaim?: boolean;
  uploadEvidence?: boolean;
  readSettlements?: boolean;
  readVendorCredits?: boolean;
};

export type IntegrationProvider = {
  id: string;
  name: string;
  /** Public brand asset used by every provider-facing surface. */
  logoSrc?: string;
  category: IntegrationCategory;
  authMode: IntegrationAuthMode;
  codeMaturity: IntegrationCodeMaturity;
  evidenceCapabilities: EvidenceCapability[];
  capabilities?: ConnectorCapabilityMap;
  requiredScopes?: string[];
  description?: string;
  /** Canonical merchant-facing setup or management route, when available. */
  setupHref?: string;
  /**
   * The ten-dimension lifecycle evidence matrix. Optional so pre-existing test
   * fixtures typed as IntegrationProvider/ProviderConnectionView don't need
   * unrelated updates; every real entry in INTEGRATION_PROVIDERS populates it
   * (enforced by a contract test) and `deriveProviderDisplayStage` treats a
   * missing/empty matrix as no evidence at all. Any dated controlled-runtime
   * proof lives per-capability in `LifecycleCapability.runtimeEvidence`.
   */
  lifecycle?: LifecycleCapability[];
};

export type ConnectorDescriptor = {
  id: string;
  name: string;
  category: IntegrationCategory;
  state: Exclude<IntegrationConnectionStatus, 'error'>;
  capabilities: ConnectorCapabilityMap;
  requiredScopes: string[];
  authType: IntegrationAuthMode;
  lastSyncAt: string | null;
};

export type DocumentType =
  | 'carrier_agreement'
  | 'three_pl_sla'
  | 'supplier_terms'
  | 'insurance_policy';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  carrier_agreement: 'Carrier Agreement',
  three_pl_sla: '3PL SLA',
  supplier_terms: 'Supplier Terms',
  insurance_policy: 'Insurance Policy',
};

export type ApplicableIntegrationCategory = 'warehouse_3pl' | 'returns';
export type CategoryApplicabilityStatus = 'applicable' | 'not_applicable';

export type CategoryApplicabilityView = {
  category: ApplicableIntegrationCategory;
  status: CategoryApplicabilityStatus;
  setBy: string | null;
  setAt: string | null;
};

export type NormalizedEvidenceItem = {
  id: string;
  merchantId: string;
  supportPayoutCaseId?: string;
  sourceProvider: string;
  sourceCategory: IntegrationCategory;
  evidenceType: EvidenceCapability;
  title: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  value?: string | number | boolean | null;
  occurredAt?: string;
  rawReference?: string;
  createdAt: string;
};

export type IntegrationCredentialPayload = {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  accountNumber?: string;
  environment?: 'sandbox' | 'production';
  providerAccountId?: string;
  providerAccountName?: string;
  [key: string]: unknown;
};

export type ProviderConnectionView = IntegrationProvider & {
  status: IntegrationConnectionStatus;
  lastSyncAt: string | null;
  lastError: string | null;
  detail: string | null;
  /** Derived from real sync fields (see lib/integrations/syncState.ts). */
  syncState?: import('@/lib/integrations/syncState').ConnectionSyncState;
  importedRecordCount?: number | null;
};

export type MissingEvidenceReason =
  | 'not_connected'
  | 'not_found'
  | 'attempted_unavailable';

export type MissingEvidenceItem = {
  providerId: string;
  providerName: string;
  category: IntegrationCategory;
  capability: EvidenceCapability;
  reason: MissingEvidenceReason;
  message: string;
  attempted: boolean;
};

export type EvidencePack = {
  merchantId: string;
  supportPayoutCaseId?: string;
  generatedAt: string;
  items: NormalizedEvidenceItem[];
  groups: {
    ticket: NormalizedEvidenceItem[];
    orderAndRefund: NormalizedEvidenceItem[];
    tracking: NormalizedEvidenceItem[];
    deliveryProof: NormalizedEvidenceItem[];
    dispute: NormalizedEvidenceItem[];
    contractTerms: NormalizedEvidenceItem[];
    selfFulfillment: NormalizedEvidenceItem[];
  };
  missingEvidence: MissingEvidenceItem[];
  connectedSources: Array<{
    providerId: string;
    providerName: string;
    status: IntegrationConnectionStatus;
    summaries: string[];
  }>;
};
