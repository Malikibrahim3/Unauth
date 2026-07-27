/**
 * Customer aggregates (RUN-17).
 *
 * The registry and the detail page disagreed — blank spend beside a populated
 * order history, "seven orders" beside "Latest 3 of 3" — because each derived
 * its own totals. Both now call this projection over the same merchant-scoped
 * linked orders, so a disagreement is impossible by construction rather than by
 * discipline.
 *
 * Money is integer minor units of one currency. A customer whose orders span
 * currencies has no single lifetime value, and that is reported rather than
 * papered over with a sum that means nothing.
 */

export type LinkedOrder = {
  orderId: string;
  /** Integer minor units. Null when the order total was never observed. */
  totalMinor: number | null;
  currency: string | null;
  processedAt: string | null;
};

export type CustomerAggregates = {
  /** Total linked orders, and the denominator any "N of M" label must use. */
  orderCount: number;
  /** Null when no order carried a usable amount, or currencies are mixed. */
  lifetimeValueMinor: number | null;
  averageOrderValueMinor: number | null;
  currency: string | null;
  lastOrderAt: string | null;
  /** True when linked orders span more than one currency. */
  mixedCurrency: boolean;
  /** Orders excluded from the money totals, and why. */
  excludedFromTotals: number;
};

export function aggregateCustomerOrders(orders: LinkedOrder[]): CustomerAggregates {
  const orderCount = orders.length;

  const currencies = new Set(
    orders.map((order) => order.currency?.toUpperCase()).filter((code): code is string => !!code),
  );
  const mixedCurrency = currencies.size > 1;
  const currency = currencies.size === 1 ? [...currencies][0] : null;

  const countable = currency
    ? orders.filter(
        (order) => order.currency?.toUpperCase() === currency && order.totalMinor !== null,
      )
    : [];
  const excludedFromTotals = orderCount - countable.length;

  const lifetimeValueMinor = countable.length
    ? countable.reduce((total, order) => total + (order.totalMinor ?? 0), 0)
    : null;

  const averageOrderValueMinor =
    lifetimeValueMinor === null ? null : Math.round(lifetimeValueMinor / countable.length);

  const timestamps = orders
    .map((order) => order.processedAt)
    .filter((value): value is string => !!value && !Number.isNaN(Date.parse(value)))
    .sort();
  const lastOrderAt = timestamps.length ? timestamps[timestamps.length - 1] : null;

  return {
    orderCount,
    lifetimeValueMinor,
    averageOrderValueMinor,
    currency,
    lastOrderAt,
    mixedCurrency,
    excludedFromTotals,
  };
}

export class CustomerAggregateMismatch extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerAggregateMismatch';
  }
}

/**
 * Asserts that a registry row and a detail page describe the same customer.
 * Called by the reconciliation checks; a mismatch is a contract failure, not a
 * rounding difference to tolerate.
 */
export function assertAggregatesAgree(
  label: string,
  registry: Pick<CustomerAggregates, 'orderCount' | 'lifetimeValueMinor' | 'lastOrderAt'>,
  detail: Pick<CustomerAggregates, 'orderCount' | 'lifetimeValueMinor' | 'lastOrderAt'>,
): void {
  const differences: string[] = [];
  if (registry.orderCount !== detail.orderCount) {
    differences.push(`order count ${registry.orderCount} vs ${detail.orderCount}`);
  }
  if (registry.lifetimeValueMinor !== detail.lifetimeValueMinor) {
    differences.push(`lifetime value ${registry.lifetimeValueMinor} vs ${detail.lifetimeValueMinor}`);
  }
  if (registry.lastOrderAt !== detail.lastOrderAt) {
    differences.push(`last order ${registry.lastOrderAt} vs ${detail.lastOrderAt}`);
  }
  if (differences.length) {
    throw new CustomerAggregateMismatch(`${label}: registry and detail disagree on ${differences.join('; ')}`);
  }
}
