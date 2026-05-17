/**
 * Customer Intelligence — single-merchant identity clustering.
 *
 * Takes all audit_transactions for one job (CSV upload) and groups them
 * into customer profiles, linking accounts that share delivery addresses
 * or card details, and flagging identity changes (name variations,
 * address tweaks, high refund rates).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransactionRow {
  id: string;
  order_id: string;
  customer_email: string | null;
  customer_name: string | null;
  shipping_address: string | null;
  device_ip: string | null;
  card_last4: string | null;
  payment_method: string | null;
  order_value: number | null;
  match_score: number;
  risk_level: string;
  fraud_flags: unknown;
  refund_claimed: boolean | null;
  refund_reason: string | null;
  processed_at: string;
  identity_confidence_grade?: string | null;
  identity_score?: number | null;
  signals_matched?: unknown;
  behavioural_flags?: unknown;
  cluster_id?: string | null;
}

export interface OrderSummary {
  orderId: string;
  date: string;
  amount: number;
  email: string;
  name: string;
  address: string;
  refunded: boolean;
  refundReason: string | null;
  fraudScore: number;
  riskLevel: string;
}

export interface IdentityLink {
  type: 'shared_address' | 'shared_card' | 'shared_ip';
  sharedValue: string;
  linkedEmails: string[];
  description: string;
}

export interface ObfuscationFlag {
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  evidence: string[];
}

export interface CustomerProfile {
  id: string;
  emails: string[];
  names: string[];
  addresses: string[];
  ips: string[];
  cards: string[];
  paymentMethods: string[];

  links: IdentityLink[];
  flags: ObfuscationFlag[];

  orderCount: number;
  totalSpend: number;
  refundCount: number;
  refundRate: number;
  maxScore: number;
  avgScore: number;
  highestRisk: string;

  orders: OrderSummary[];
  suspicionScore: number;
}

export interface CustomerEventStreamItem {
  id: string;
  type:
    | 'order_placed'
    | 'order_refunded'
    | 'chargeback_filed'
    | 'identity_change'
    | 'watchlist_add'
    | 'cross_merchant_signal'
    | 'note_added';
  date: string;
  title: string;
  subtitle?: string;
  amount?: number | null;
  tier?: string;
  evidence?: string[];
  detail?: string;
}

// ---------------------------------------------------------------------------
// Union-Find
// ---------------------------------------------------------------------------

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    if (this.rank[rx] < this.rank[ry]) this.parent[rx] = ry;
    else if (this.rank[rx] > this.rank[ry]) this.parent[ry] = rx;
    else {
      this.parent[ry] = rx;
      this.rank[rx]++;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function norm(s: string | null | undefined): string {
  if (!s) return '';
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normAddress(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(lane|ln)\b/g, 'ln')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(close|cl)\b/g, 'cl')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(arr: string[]): string[] {
  return Array.from(new Set(arr)).filter(Boolean);
}

const RISK_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

function highestRisk(levels: string[]): string {
  let max = 'low';
  for (const l of levels) {
    if ((RISK_ORDER[l] ?? 0) > (RISK_ORDER[max] ?? 0)) max = l;
  }
  return max;
}

function gradeToRiskLevel(grade: string | null | undefined): string | null {
  switch (grade) {
    case 'weak':
      return 'low';
    case 'possible':
      return 'medium';
    case 'probable':
      return 'high';
    case 'definite':
      return 'critical';
    default:
      return null;
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];
}

function humaniseFlag(flag: string): string {
  return flag
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function buildCustomerProfiles(transactions: TransactionRow[]): CustomerProfile[] {
  if (transactions.length === 0) return [];

  // Step 1: index unique emails
  const emailIndex = new Map<string, number>();
  const uniqueEmails: string[] = [];
  for (const tx of transactions) {
    const email = norm(tx.customer_email);
    if (!email) continue;
    if (!emailIndex.has(email)) {
      emailIndex.set(email, uniqueEmails.length);
      uniqueEmails.push(email);
    }
  }
  if (uniqueEmails.length === 0) return [];

  // Step 2: build attribute → email-index maps
  const addressToEmails = new Map<string, Set<number>>();
  const cardToEmails = new Map<string, Set<number>>();
  const ipToEmails = new Map<string, Set<number>>();
  const clusterIdToEmails = new Map<string, Set<number>>();

  for (const tx of transactions) {
    const emailIdx = emailIndex.get(norm(tx.customer_email));
    if (emailIdx === undefined) continue;

    const clusterId = tx.cluster_id?.trim();
    if (clusterId) {
      if (!clusterIdToEmails.has(clusterId)) clusterIdToEmails.set(clusterId, new Set());
      clusterIdToEmails.get(clusterId)!.add(emailIdx);
    }

    const addr = normAddress(tx.shipping_address);
    if (addr) {
      if (!addressToEmails.has(addr)) addressToEmails.set(addr, new Set());
      addressToEmails.get(addr)!.add(emailIdx);
    }

    if (tx.card_last4) {
      const card = tx.card_last4.replace(/\D/g, '').slice(-4);
      if (card.length === 4) {
        if (!cardToEmails.has(card)) cardToEmails.set(card, new Set());
        cardToEmails.get(card)!.add(emailIdx);
      }
    }

    if (tx.device_ip) {
      const ip = tx.device_ip.trim();
      if (ip) {
        if (!ipToEmails.has(ip)) ipToEmails.set(ip, new Set());
        ipToEmails.get(ip)!.add(emailIdx);
      }
    }
  }

  // Step 3: union-find merges
  const uf = new UnionFind(uniqueEmails.length);

  // Only merge identities that the persisted linker/scorer output explicitly
  // grouped together. Legacy address/card merging is too broad for this view:
  // it can visually attach clean neighbours or family members to a flagged ring.
  for (const idxs of Array.from(clusterIdToEmails.values())) {
    const arr = Array.from(idxs);
    for (let i = 1; i < arr.length; i++) uf.union(arr[0], arr[i]);
  }

  // Step 4: group emails into clusters
  const clusters = new Map<number, number[]>();
  for (let i = 0; i < uniqueEmails.length; i++) {
    const root = uf.find(i);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root)!.push(i);
  }

  // Step 5: build profiles
  const profiles: CustomerProfile[] = [];

  for (const [root, emailIndices] of Array.from(clusters.entries())) {
    const clusterEmailArr = emailIndices.map((i: number) => uniqueEmails[i]);
    const clusterTxs = transactions.filter((tx) => clusterEmailArr.includes(norm(tx.customer_email)));
    if (clusterTxs.length === 0) continue;

    const emails = unique(clusterTxs.map((tx) => norm(tx.customer_email)));
    const names = unique(clusterTxs.map((tx) => norm(tx.customer_name)));
    const addresses = unique(clusterTxs.map((tx) => tx.shipping_address?.trim() ?? '').filter(Boolean));
    const ips = unique(clusterTxs.map((tx) => tx.device_ip?.trim() ?? '').filter(Boolean));
    const cards = unique(
      clusterTxs
        .map((tx) => tx.card_last4?.replace(/\D/g, '').slice(-4) ?? '')
        .filter((c) => c.length === 4)
    );
    const paymentMethods = unique(clusterTxs.map((tx) => tx.payment_method ?? '').filter(Boolean));

    const orders: OrderSummary[] = clusterTxs
      .map((tx) => ({
        orderId: tx.order_id,
        date: tx.processed_at,
        amount: tx.order_value ?? 0,
        email: norm(tx.customer_email),
        name: tx.customer_name?.trim() ?? '',
        address: tx.shipping_address?.trim() ?? '',
        refunded: !!tx.refund_claimed,
        refundReason: tx.refund_reason,
        fraudScore: tx.identity_score ?? tx.match_score,
        riskLevel: gradeToRiskLevel(tx.identity_confidence_grade) ?? tx.risk_level,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const refundCount = orders.filter((o) => o.refunded).length;
    const totalSpend = orders.reduce((s, o) => s + o.amount, 0);
    const scores = orders.map((o) => o.fraudScore);
    const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;

    // Explain links inside this persisted profile only. This avoids showing a
    // clean customer as linked merely because they share a noisy address or IP.
    const clusterLinks: IdentityLink[] = [];
    if (emails.length > 1) {
      for (const [card, idxs] of Array.from(cardToEmails.entries())) {
        const linkedEmails = Array.from(idxs).map((i) => uniqueEmails[i]).filter((e) => clusterEmailArr.includes(e));
        if (linkedEmails.length > 1) {
          clusterLinks.push({
            type: 'shared_card',
            sharedValue: `****${card}`,
            linkedEmails,
            description: `Same card ending ${card} used across ${linkedEmails.length} email addresses`,
          });
        }
      }
      for (const [addr, idxs] of Array.from(addressToEmails.entries())) {
        const linkedEmails = Array.from(idxs).map((i) => uniqueEmails[i]).filter((e) => clusterEmailArr.includes(e));
        if (linkedEmails.length > 1) {
          clusterLinks.push({
            type: 'shared_address',
            sharedValue: addr,
            linkedEmails,
            description: `Same delivery address used by ${linkedEmails.length} linked accounts`,
          });
        }
      }
      for (const [ip, idxs] of Array.from(ipToEmails.entries())) {
        const linkedEmails = Array.from(idxs).map((i) => uniqueEmails[i]).filter((e) => clusterEmailArr.includes(e));
        if (linkedEmails.length > 1) {
          clusterLinks.push({
            type: 'shared_ip',
            sharedValue: ip,
            linkedEmails,
            description: `Same IP address ${ip} used by ${linkedEmails.length} linked accounts`,
          });
        }
      }
    }

    // Detect obfuscation flags
    const flags: ObfuscationFlag[] = [];
    const persistedFlags = unique(clusterTxs.flatMap((tx) => asStringArray(tx.behavioural_flags)));
    for (const flag of persistedFlags) {
      flags.push({
        severity: 'high',
        title: humaniseFlag(flag),
        description: 'Detected by the identity scoring pipeline for this linked cluster',
        evidence: [],
      });
    }

    if (names.length > 1) {
      flags.push({
        severity: 'high',
        title: 'Name variations detected',
        description: `Used ${names.length} different names across orders`,
        evidence: names,
      });
    }

    const normAddrs = unique(addresses.map(normAddress));
    if (addresses.length > 1 && normAddrs.length === 1) {
      flags.push({
        severity: 'medium',
        title: 'Address slightly modified',
        description: 'Same address entered with small formatting differences',
        evidence: addresses,
      });
    } else if (normAddrs.length > 1) {
      flags.push({
        severity: 'medium',
        title: 'Multiple delivery addresses',
        description: `Used ${normAddrs.length} different delivery addresses`,
        evidence: addresses,
      });
    }

    if (emails.length > 1) {
      flags.push({
        severity: 'high',
        title: 'Multiple email accounts linked',
        description: `${emails.length} different email addresses identified as the same person`,
        evidence: emails,
      });
    }

    const refundRate = orders.length > 0 ? refundCount / orders.length : 0;
    if (refundRate > 0.5 && refundCount >= 2) {
      flags.push({
        severity: 'high',
        title: 'High refund rate',
        description: `${refundCount} out of ${orders.length} orders refunded (${Math.round(refundRate * 100)}%)`,
        evidence: orders.filter((o) => o.refunded).map((o) => `${o.orderId}: ${o.refundReason ?? 'No reason given'}`),
      });
    } else if (refundRate > 0.3 && refundCount >= 2) {
      flags.push({
        severity: 'medium',
        title: 'Elevated refund rate',
        description: `${refundCount} out of ${orders.length} orders refunded (${Math.round(refundRate * 100)}%)`,
        evidence: [],
      });
    }

    if (ips.length > 2) {
      flags.push({
        severity: 'low',
        title: 'Multiple IP addresses',
        description: `Orders placed from ${ips.length} different IP addresses`,
        evidence: ips,
      });
    }

    // Suspicion score for sorting — composite of risk indicators
    let suspicionScore = maxScore;
    if (emails.length > 1) suspicionScore += 20;
    if (names.length > 1) suspicionScore += 15;
    if (refundRate > 0.5) suspicionScore += 25;
    else if (refundRate > 0.3) suspicionScore += 10;
    if (flags.length > 0) suspicionScore += flags.length * 5;

    profiles.push({
      id: `cluster-${root}`,
      emails,
      names,
      addresses,
      ips,
      cards,
      paymentMethods,
      links: clusterLinks,
      flags,
      orderCount: orders.length,
      totalSpend,
      refundCount,
      refundRate,
      maxScore,
      avgScore,
      highestRisk: highestRisk(orders.map((o) => o.riskLevel)),
      orders,
      suspicionScore,
    });
  }

  // Sort: highest suspicion first
  profiles.sort((a, b) => b.suspicionScore - a.suspicionScore);
  return profiles;
}

export function getEventStream(input: {
  orderHistory?: Array<{
    orderId: string;
    processedAt: string;
    orderValue?: number | null;
    riskLevel?: string | null;
    refundRequested?: boolean;
    refundReason?: string | null;
    chargebackFiled?: boolean;
    chargebackReasonCode?: string | null;
    fraudFlags?: string[];
    address?: string | null;
    email?: string | null;
    cardLast4?: string | null;
  }>;
  identityTimeline?: Array<{
    date: string;
    field: string;
    value: string;
    isVariant: boolean;
  }>;
  linkedAccounts?: Array<{ entityType: string; entityValue: string; confidence: number }>;
  notes?: Array<{ id: string; created_at: string; body?: string | null }>;
}): CustomerEventStreamItem[] {
  const events: CustomerEventStreamItem[] = [];

  for (const order of input.orderHistory ?? []) {
    events.push({
      id: `order-${order.orderId}-${order.processedAt}`,
      type: order.chargebackFiled ? 'chargeback_filed' : order.refundRequested ? 'order_refunded' : 'order_placed',
      date: order.processedAt,
      title: order.chargebackFiled
        ? `Chargeback ${order.orderId}`
        : order.refundRequested
        ? `Refund ${order.orderId}`
        : `Order ${order.orderId}`,
      subtitle: order.chargebackFiled
        ? order.chargebackReasonCode ?? 'Chargeback filed'
        : order.refundRequested
        ? order.refundReason ?? 'Refund requested'
        : order.address ?? order.email ?? undefined,
      amount: order.orderValue ?? null,
      tier: order.riskLevel ?? undefined,
      evidence: order.fraudFlags?.slice(0, 3) ?? [],
      detail: order.cardLast4 ? `Payment ending ${order.cardLast4}` : undefined,
    });
  }

  for (const change of input.identityTimeline ?? []) {
    if (!change.isVariant) continue;
    events.push({
      id: `identity-${change.field}-${change.value}`,
      type: 'identity_change',
      date: change.date,
      title: `New ${change.field}: ${change.value}`,
      subtitle: 'Identity change observed',
      evidence: [`Variant ${change.field}`],
    });
  }

  for (const linked of input.linkedAccounts ?? []) {
    events.push({
      id: `linked-${linked.entityType}-${linked.entityValue}`,
      type: 'cross_merchant_signal',
      date: new Date().toISOString(),
      title: `${linked.entityType.toUpperCase()} linked`,
      subtitle: linked.entityValue,
      tier: linked.confidence >= 80 ? 'high' : 'medium',
      evidence: [`Confidence ${linked.confidence}%`],
    });
  }

  for (const note of input.notes ?? []) {
    events.push({
      id: `note-${note.id}`,
      type: 'note_added',
      date: note.created_at,
      title: 'Analyst note added',
      subtitle: note.body?.slice(0, 80) ?? 'Case note recorded',
    });
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}
