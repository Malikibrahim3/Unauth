/**
 * Minimal in-memory Supabase client fake for support-intake integration tests.
 *
 * Supports the query shapes the intake pipeline actually uses:
 *   from(t).upsert(payload, { onConflict }).select().single()
 *   from(t).insert(payload).select('id').single()
 *   from(t).select(cols).eq(...).eq(...).maybeSingle()
 *   from(t).select(cols).eq(...).neq(...).in(...)  (awaited -> { data })
 *   from(t).update(values).eq(...).eq(...)         (awaited -> { error })
 *
 * Rows are stored per-table; upsert de-dupes by the onConflict key list and
 * preserves the existing row id. Generated ids are valid v4-style UUIDs so they
 * pass the zod uuid() validators in the store layer.
 */

let idCounter = 0;

function genUuid(): string {
  idCounter += 1;
  const hex = idCounter.toString(16).padStart(12, '0');
  return `${hex.slice(0, 8)}-0000-4000-8000-${hex}`;
}

type Row = Record<string, unknown>;
type Filter =
  | ['eq' | 'neq' | 'ilike' | 'is' | 'gte' | 'contains', string, unknown]
  | ['not', string, { operator: string; value: unknown }]
  | ['in', string, unknown[]]
  | ['or', Array<['eq', string, unknown]>, null];

export type MemoryStore = Map<string, Row[]>;

class QueryBuilder {
  private filters: Filter[] = [];
  private mode: 'select' | 'insert' | 'upsert' | 'update' = 'select';
  private payload: Row | Row[] | null = null;
  private values: Row | null = null;
  private onConflict: string[] = [];
  private ignoreDuplicates = false;
  private executed: Row[] | null = null;

  constructor(
    private readonly store: MemoryStore,
    private readonly table: string
  ) {}

  private rows(): Row[] {
    if (!this.store.has(this.table)) this.store.set(this.table, []);
    return this.store.get(this.table)!;
  }

  insert(payload: Row | Row[]): this {
    this.mode = 'insert';
    this.payload = payload;
    return this;
  }

  upsert(payload: Row | Row[], opts: { onConflict: string; ignoreDuplicates?: boolean }): this {
    this.mode = 'upsert';
    this.payload = payload;
    this.onConflict = opts.onConflict.split(',').map((s) => s.trim());
    this.ignoreDuplicates = opts.ignoreDuplicates === true;
    return this;
  }

  update(values: Row): this {
    this.mode = 'update';
    this.values = values;
    return this;
  }

  select(_cols?: string): this {
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push(['eq', col, val]);
    return this;
  }

  neq(col: string, val: unknown): this {
    this.filters.push(['neq', col, val]);
    return this;
  }

  is(col: string, val: unknown): this {
    this.filters.push(['is', col, val]);
    return this;
  }

  not(col: string, operator: string, val: unknown): this {
    this.filters.push(['not', col, { operator, value: val }]);
    return this;
  }

  gte(col: string, val: unknown): this {
    this.filters.push(['gte', col, val]);
    return this;
  }

  in(col: string, vals: unknown[]): this {
    this.filters.push(['in', col, vals]);
    return this;
  }

  ilike(col: string, val: unknown): this {
    this.filters.push(['ilike', col, val]);
    return this;
  }

  contains(col: string, val: Record<string, unknown>): this {
    this.filters.push(['contains', col, val]);
    return this;
  }

  /**
   * Supports the simple disjunction shapes the intake pipeline issues, e.g.
   * `or('order_number.eq.1008,external_id.eq.1008')`. Only `.eq.` operands are
   * parsed — that is all production uses here.
   */
  or(filter: string): this {
    const clauses = filter.split(',').flatMap((part) => {
      const match = part.match(/^([^.]+)\.eq\.(.*)$/);
      return match ? [['eq', match[1], match[2]] as ['eq', string, unknown]] : [];
    });
    this.filters.push(['or', clauses, null]);
    return this;
  }

  order(_col: string, _opts?: { ascending?: boolean }): this {
    return this;
  }

  limit(_count: number): this {
    return this;
  }

  private matches(row: Row): boolean {
    return this.filters.every(([op, col, val]) => {
      if (op === 'eq') return row[col] === val;
      if (op === 'neq') return row[col] !== val;
      if (op === 'is') return row[col] === val || (val === null && row[col] == null);
      if (op === 'not') {
        const predicate = val as { operator: string; value: unknown };
        if (predicate.operator === 'is') {
          return predicate.value === null ? row[col] != null : row[col] !== predicate.value;
        }
        if (predicate.operator === 'eq') return row[col] !== predicate.value;
        throw new Error(`Unsupported not operator: ${predicate.operator}`);
      }
      if (op === 'gte') return String(row[col] ?? '') >= String(val ?? '');
      if (op === 'ilike') {
        // `.or.eq.` operands compare as exact strings; the `%`-free email
        // pattern intake uses is case-insensitive equality.
        return String(row[col] ?? '').toLowerCase() === String(val ?? '').toLowerCase();
      }
      if (op === 'contains') {
        const actual = row[col];
        if (!actual || typeof actual !== 'object' || Array.isArray(actual)) return false;
        return Object.entries(val as Record<string, unknown>).every(
          ([key, expected]) => (actual as Record<string, unknown>)[key] === expected,
        );
      }
      if (op === 'or') {
        const clauses = col as unknown as Array<['eq', string, unknown]>;
        return clauses.some(([, c, v]) => String(row[c]) === String(v));
      }
      return Array.isArray(val) && (val as unknown[]).includes(row[col]);
    });
  }

  private conflictKey(row: Row): string {
    return this.onConflict.map((k) => String(row[k])).join('|');
  }

  private execute(): Row[] {
    if (this.executed) return this.executed;
    const rows = this.rows();

    if (this.mode === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const inserted = items.map((item) => {
        const row = { id: item.id ?? genUuid(), ...item };
        rows.push(row);
        return row;
      });
      this.executed = inserted;
    } else if (this.mode === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!];
      const affected = items.map((item) => {
        const key = this.conflictKey(item);
        const existing = rows.find((r) => this.conflictKey(r) === key);
        if (existing) {
          if (this.ignoreDuplicates) return existing;
          Object.assign(existing, item);
          return existing;
        }
        const row = { id: item.id ?? genUuid(), ...item };
        rows.push(row);
        return row;
      });
      this.executed = affected;
    } else if (this.mode === 'update') {
      const matched = rows.filter((r) => this.matches(r));
      for (const row of matched) Object.assign(row, this.values);
      this.executed = matched;
    } else {
      this.executed = rows.filter((r) => this.matches(r));
    }

    return this.executed;
  }

  async single(): Promise<{ data: Row | null; error: null }> {
    const rows = this.execute();
    return { data: rows[0] ?? null, error: null };
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    const rows = this.execute();
    return { data: rows[0] ?? null, error: null };
  }

  then<TResult1 = { data: Row[]; error: null; count: number }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[]; error: null; count: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const rows = this.execute();
    return Promise.resolve({ data: rows, error: null, count: rows.length }).then(onfulfilled, onrejected);
  }
}

export type MemoryClient = {
  from: (table: string) => QueryBuilder;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
  __store: MemoryStore;
};

let rpcSeq = 0;

export function createMemoryClient(seed?: MemoryStore): MemoryClient {
  const store: MemoryStore = seed ?? new Map();
  return {
    from: (table: string) => new QueryBuilder(store, table),
    // Minimal RPC shim. `record_domain_event` appends a domain_events row and
    // returns its id, so code paths that emit domain events run end-to-end.
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'transition_payout_case') {
        const cases = store.get('support_payout_cases') ?? [];
        const payoutCase = cases.find(
          (row) => row.id === args.p_case_id && row.merchant_id === args.p_merchant_id,
        );
        if (!payoutCase) return { data: null, error: { message: 'case_not_found' } };
        if (Number(payoutCase.state_version ?? 1) !== Number(args.p_expected_version)) {
          return { data: null, error: { message: 'case_version_conflict', code: '40001' } };
        }
        const events = store.get('domain_events') ?? [];
        const existing = events.find(
          (row) => row.merchant_id === args.p_merchant_id && row.idempotency_key === args.p_idempotency_key,
        );
        if (existing) {
          return { data: { ...(existing.transition_result as Row), domain_event_id: existing.id, replayed: true }, error: null };
        }
        const patch = (args.p_patch ?? {}) as Row;
        const nextVersion = Number(args.p_expected_version) + 1;
        Object.assign(payoutCase, patch, { state_version: nextVersion });
        const result = {
          case_id: payoutCase.id,
          new_version: nextVersion,
          status: payoutCase.status,
          payout_decision_state: payoutCase.payout_decision_state,
          recovery_state: payoutCase.recovery_state,
          replayed: false,
        };
        const eventId = genUuid();
        events.push({
          id: eventId,
          merchant_id: args.p_merchant_id,
          event_type: args.p_event_type,
          aggregate_type: 'case',
          aggregate_id: args.p_case_id,
          idempotency_key: args.p_idempotency_key,
          payload: args.p_event_payload,
          transition_result: result,
        });
        store.set('domain_events', events);
        const claimEvents = store.get('claim_events') ?? [];
        claimEvents.push({
          id: genUuid(),
          claim_id: args.p_case_id,
          merchant_id: args.p_merchant_id,
          event_type: args.p_claim_event_type,
          note: args.p_reason,
          metadata: args.p_claim_event_metadata,
        });
        store.set('claim_events', claimEvents);
        return { data: { ...result, domain_event_id: eventId }, error: null };
      }
      if (fn === 'record_case_source_outcome') {
        const outcomes = store.get('case_outcomes') ?? [];
        const idempotencyKey = String(args.p_idempotency_key);
        const existing = outcomes.find(
          (row) => row.merchant_id === args.p_merchant_id && row.idempotency_key === idempotencyKey,
        );
        if (existing) {
          return {
            data: {
              outcome_id: existing.id,
              domain_event_id: existing.domain_event_id,
              replayed: true,
            },
            error: null,
          };
        }

        const outcomeId = genUuid();
        const domainEventId = genUuid();
        const payload = {
          outcome_id: outcomeId,
          outcome_type: args.p_outcome_type,
          action: args.p_action,
          amount_minor: args.p_amount_minor,
          confirmed_loss_minor: args.p_confirmed_loss_minor,
          currency: args.p_currency,
          reason: args.p_reason,
          source_record_id: args.p_source_record_id,
          source_metadata: args.p_source_metadata,
        };
        outcomes.push({
          id: outcomeId,
          merchant_id: args.p_merchant_id,
          support_payout_case_id: args.p_case_id,
          outcome_type: args.p_outcome_type,
          action: args.p_action,
          amount_minor: args.p_amount_minor,
          confirmed_loss_minor: args.p_confirmed_loss_minor,
          currency: args.p_currency,
          reason: args.p_reason,
          source_record_id: args.p_source_record_id,
          source_metadata: args.p_source_metadata,
          occurred_at: args.p_occurred_at,
          idempotency_key: idempotencyKey,
          domain_event_id: domainEventId,
        });
        store.set('case_outcomes', outcomes);

        const events = store.get('domain_events') ?? [];
        events.push({
          id: domainEventId,
          merchant_id: args.p_merchant_id,
          event_type: 'case.outcome_reconciled',
          aggregate_type: 'case',
          aggregate_id: args.p_case_id,
          idempotency_key: `case-outcome:${idempotencyKey}`,
          payload,
          occurred_at: args.p_occurred_at,
        });
        store.set('domain_events', events);
        return { data: { outcome_id: outcomeId, domain_event_id: domainEventId, replayed: false }, error: null };
      }
      if (fn === 'record_domain_event') {
        const events = store.get('domain_events') ?? [];
        const idem = args.p_idempotency_key as string;
        const existing = events.find((e) => e.idempotency_key === idem);
        if (existing) return { data: existing.id, error: null };
        const id = `evt-${++rpcSeq}`;
        events.push({
          id,
          merchant_id: args.p_merchant_id,
          event_type: args.p_event_type,
          aggregate_type: args.p_aggregate_type,
          aggregate_id: args.p_aggregate_id,
          idempotency_key: idem,
          payload: args.p_payload,
        });
        store.set('domain_events', events);
        return { data: id, error: null };
      }
      return { data: null, error: null };
    },
    __store: store,
  };
}

/** Convenience: read all rows for a table from a client. */
export function rowsOf(client: MemoryClient, table: string): Row[] {
  return client.__store.get(table) ?? [];
}
