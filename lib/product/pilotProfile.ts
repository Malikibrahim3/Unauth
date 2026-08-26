/**
 * Frozen MR0 implementation profile.
 *
 * Asterlane is the synthetic controlled certification merchant, not a real
 * design partner and not controlled-provider proof. It freezes one build path
 * before recruitment so MR1-MR5 do not branch across payment or carrier stacks.
 * A real merchant and named human contacts are invitation/release gates, not
 * prerequisites for implementing or accepting MR0.
 */
export const MVP_PLUS_PILOT_PROFILE = {
  id: 'asterlane-controlled-certification-merchant',
  merchant: {
    name: 'Asterlane Commerce Group',
    kind: 'synthetic-controlled-certification',
    owner: 'Avery Mercer (synthetic certification operator)',
  },
  supportOwner: 'Unauth product owner (controlled-certification role)',
  rollbackOwner: 'Unauth release operator (controlled-certification role)',
  legalOwner: 'Deferred until real-pilot invitation',
  dataAgreementOwner: 'Deferred until real-pilot invitation',
  environment: {
    application: 'controlled local or staging only',
    providerMode: 'controlled sandbox/test accounts where available',
  },
  stack: {
    commerce: 'shopify',
    helpdesk: 'gorgias',
    fulfilment: 'shipbob',
    carrier: 'ups',
    paymentAuthority: 'shopify_payments',
  },
  providerAccounts: {
    shopify: 'Asterlane Commerce online store (synthetic account identity)',
    gorgias: 'Asterlane Commerce Support (synthetic account identity)',
    shipbob: 'Asterlane UK Fulfilment (synthetic account identity)',
    ups: 'Asterlane UPS business account (synthetic account identity)',
    shopifyPayments: 'Same selected Shopify shop; controlled proof pending',
  },
  limitations: [
    'This profile is controlled certification context, not a signed design-partner merchant.',
    'No selected provider has a complete current controlled-runtime evidence matrix.',
    'Shopify Payments is the only selected payment authority; Stripe remains planned.',
    'UPS is read-only, on-demand carrier evidence with manual recovery handoff.',
    'Refund issuance, request denial, and provider claim submission remain unsupported.',
    'A named real merchant, named human contacts, and signed legal/data agreements are required only before invitation or release to that merchant.',
  ],
} as const;

export const MVP_PLUS_SELECTED_PROVIDER_IDS = ['shopify', 'gorgias', 'shipbob', 'ups'] as const;

export function isMvpPlusSelectedProvider(providerId: string): boolean {
  return (MVP_PLUS_SELECTED_PROVIDER_IDS as readonly string[]).includes(providerId);
}
