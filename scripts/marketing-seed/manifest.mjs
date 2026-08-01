/**
 * @typedef {Object} MarketingStoryManifest
 * @property {number} version
 * @property {string} namespace
 * @property {number} randomSeed
 * @property {{id:string,name:string,currency:'GBP',timezone:'Europe/London',storeDomain:string}} merchant
 * @property {{id:string,name:string,email:string,role:'owner'}} operator
 * @property {{merchant:{id:string,name:string,currency:'GBP',timezone:'Europe/London',storeDomain:string},operator:{id:string,name:string,email:string,role:'owner'}}} onboarding
 * @property {ReadonlyArray<{id:string,name:string,email:string,role:string}>} team
 * @property {{commerce:{provider:'shopify',accountName:string},support:{provider:'gorgias',accountName:string},fulfilment:{provider:string,accountName:string},carrier:{provider:string,accountName:string}}} connections
 * @property {{caseDecisionReady:string,caseActiveRecovery:string,caseResolvedRecovered:string,customer:string,recovery:string,loss:string,rule:string,flow:string,flowRun:string,connection:string,shipbobSelection:string,workView:string,order:string,ticket:string,shipment:string,dispute:string,refund:string,return:string,reportRange:string}} capture
 */

export const DEFAULT_AS_OF = '2026-07-26T12:00:00.000Z';
export const MARKETING_IDENTITY_SALT = 'a17dea5a6d3c912645b497346514ec566927297d9408169d8de0ea1a82dc1f85';

/** @type {Readonly<MarketingStoryManifest>} */
export const MARKETING_STORY = Object.freeze({
  version: 1,
  namespace: 'alder-ash-marketing-v1',
  randomSeed: 271828,
  merchant: {
    id: 'aa000000-0000-4000-8000-000000000001',
    name: 'Alder & Ash',
    currency: 'GBP',
    timezone: 'Europe/London',
    storeDomain: 'alder-and-ash.myshopify.com',
  },
  operator: {
    id: 'aa000000-0000-4000-8000-000000000002',
    name: 'Morgan Ellis',
    email: 'operations@alderandash.invalid',
    role: 'owner',
  },
  onboarding: {
    merchant: {
      id: 'aa000000-0000-4000-8000-000000000011',
      name: 'Rowan Goods',
      currency: 'GBP',
      timezone: 'Europe/London',
      storeDomain: 'rowan-goods.myshopify.com',
    },
    operator: {
      id: 'aa000000-0000-4000-8000-000000000012',
      name: 'Taylor Rowan',
      email: 'setup@rowangoods.invalid',
      role: 'owner',
    },
  },
  team: [
    { id: 'aa000000-0000-4000-8000-000000000002', name: 'Morgan Ellis', email: 'operations@alderandash.invalid', role: 'owner' },
    { id: 'aa000000-0000-4000-8000-000000000003', name: 'Avery Shah', email: 'support@alderandash.invalid', role: 'admin' },
    { id: 'aa000000-0000-4000-8000-000000000004', name: 'Jordan Bell', email: 'fulfilment@alderandash.invalid', role: 'analyst' },
  ],
  connections: {
    commerce: { provider: 'shopify', accountName: 'Alder & Ash online store' },
    support: { provider: 'gorgias', accountName: 'Alder & Ash Support' },
    fulfilment: { provider: 'shipbob', accountName: 'Alder & Ash UK fulfilment' },
    carrier: { provider: 'ups', accountName: 'Alder & Ash UPS tracking' },
  },
  capture: {
    caseDecisionReady: 'aa100000-0000-4000-8000-000000000001',
    caseActiveRecovery: 'aa100000-0000-4000-8000-000000000002',
    caseResolvedRecovered: 'aa100000-0000-4000-8000-000000000003',
    customer: 'aa200000-0000-4000-8000-000000000001',
    recovery: 'aa300000-0000-4000-8000-000000000002',
    loss: 'aa400000-0000-4000-8000-000000000003',
    rule: 'aa500000-0000-4000-8000-000000000001',
    flow: 'aa600000-0000-4000-8000-000000000001',
    flowRun: 'aa610000-0000-4000-8000-000000000001',
    connection: 'aa700000-0000-4000-8000-000000000001',
    shipbobSelection: 'aa7a0000-0000-4000-8000-000000000001',
    workView: 'aa800000-0000-4000-8000-000000000001',
    order: 'aa210000-0000-4000-8000-000000000001',
    ticket: 'aa230000-0000-4000-8000-000000000001',
    shipment: 'aa720000-0000-4000-8000-000000000001',
    dispute: 'aa770000-0000-4000-8000-000000000001',
    refund: 'aa780000-0000-4000-8000-000000000001',
    return: 'aa790000-0000-4000-8000-000000000001',
    reportRange: 'last_30_days',
  },
});

export const CAPTURE_URLS = Object.freeze({
  overview: '/dashboard',
  cases: '/claims',
  decisionReadyCase: `/claims/${MARKETING_STORY.capture.caseDecisionReady}`,
  activeRecoveryCase: `/claims/${MARKETING_STORY.capture.caseActiveRecovery}`,
  resolvedCase: `/claims/${MARKETING_STORY.capture.caseResolvedRecovered}`,
  customers: '/customers',
  customer: `/customers/${MARKETING_STORY.capture.customer}`,
  recovery: '/recoveries',
  recoveryDetail: `/recoveries/${MARKETING_STORY.capture.recovery}`,
  reports: `/reports?range=${MARKETING_STORY.capture.reportRange}`,
  integrations: '/integrations',
});
