import { readFileSync } from 'fs';
import { join } from 'path';
import type { NormalisedOrder, Signal, SignalResult, ScoringContext } from '../types';

let disposableDomains: Set<string> | null = null;

function getDisposableDomains(): Set<string> {
  if (!disposableDomains) {
    try {
      const filePath = join(process.cwd(), 'lib/engine/data/disposable-domains.txt');
      const contents = readFileSync(filePath, 'utf-8');
      disposableDomains = new Set(
        contents.split('\n').map((d: string) => d.trim().toLowerCase()).filter(Boolean)
      );
    } catch {
      disposableDomains = new Set();
    }
  }
  return disposableDomains;
}

function extractEmailParts(emailHash: string): null {
  return null;
}

function getRawEmailFromOrders(emailHash: string, allOrders: NormalisedOrder[]): string | null {
  return null;
}

export const emailPattern: Signal = (order: NormalisedOrder, context: ScoringContext): SignalResult => {
  const allOrders = context.allOrders;

  const sameHashOrders = allOrders.filter((o: NormalisedOrder) => o.emailHash === order.emailHash);
  const rawEmails = sameHashOrders
    .map((o: NormalisedOrder) => (o as NormalisedOrder & { _rawEmail?: string })._rawEmail)
    .filter((e): e is string => typeof e === 'string');

  if (rawEmails.length === 0) {
    return {
      name: 'emailPattern',
      fired: false,
      score: 0,
      reason: 'No raw email data available for pattern analysis.',
      evidence: {},
    };
  }

  const sampleEmail = rawEmails[0].toLowerCase();
  const [local, domain] = sampleEmail.split('@');

  if (!domain) {
    return {
      name: 'emailPattern',
      fired: false,
      score: 0,
      reason: 'Email address format invalid.',
      evidence: {},
    };
  }

  const disposables = getDisposableDomains();
  if (disposables.has(domain)) {
    return {
      name: 'emailPattern',
      fired: true,
      score: 60,
      reason: `Customer is using a known disposable email domain (${domain}).`,
      evidence: { domain, type: 'disposable' },
    };
  }

  if (local.includes('+')) {
    const rootLocal = local.split('+')[0];
    const aliasCount = rawEmails.filter((e: string) => {
      const [l] = e.toLowerCase().split('@');
      return l.startsWith(rootLocal + '+');
    }).length;

    if (aliasCount >= 2) {
      return {
        name: 'emailPattern',
        fired: true,
        score: 70,
        reason: `Customer is using plus-aliasing (${aliasCount} variations of the same root address detected).`,
        evidence: { rootLocal, domain, aliasCount, type: 'plus-alias' },
      };
    }
  }

  const numericSuffixMatch = local.match(/^([a-z]+)\d{3,}$/);
  if (numericSuffixMatch) {
    const prefix = numericSuffixMatch[1];
    const clusterCount = allOrders.filter((o: NormalisedOrder) => {
      const raw = (o as NormalisedOrder & { _rawEmail?: string })._rawEmail;
      if (!raw) return false;
      const [l, d] = raw.toLowerCase().split('@');
      return d === domain && l !== local && /^[a-z]+\d{3,}$/.test(l) && l.startsWith(prefix);
    }).length;

    if (clusterCount >= 2) {
      return {
        name: 'emailPattern',
        fired: true,
        score: 50,
        reason: `Email address follows a numeric-suffix pattern (${local}@${domain}) with ${clusterCount} similar addresses in the same dataset.`,
        evidence: { prefix, domain, clusterCount, type: 'numeric-suffix' },
      };
    }
  }

  return {
    name: 'emailPattern',
    fired: false,
    score: 0,
    reason: 'No suspicious email patterns detected.',
    evidence: {},
  };
};
