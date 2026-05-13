/**
 * In-memory mock Supabase client for the local tuning harness.
 * Implements the subset of the Supabase query API used by processProfilesForBatch.
 */
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Domain types (mirror customer_profiles + appearances table shapes)
// ---------------------------------------------------------------------------

export interface MockProfile {
  id: string;
  primary_email: string | null;
  emails: string[];
  ips: string[];
  addresses: string[];
  card_last4s: string[];
  phones: string[];
  names: string[];
  risk_score: number;
  risk_level: string;
  fraud_flags: string[];
  total_orders: number;
  total_refund_claims: number;
  total_chargebacks: number;
  total_merchants_seen_at: number;
  refund_rate: number;
  refund_timestamps: string[];
  fastest_claim_days: number | null;
  avg_claim_days: number | null;
  refund_acceleration_score: number;
  merchant_ids: string[];
  first_seen: string;
  last_seen: string;
  last_audit_id: string | null;
  profile_confidence: number;
  manually_reviewed: boolean;
  merchant_notes: string | null;
  on_watchlist: boolean;
  identity_confidence_grade: string | null;
  identity_signals_summary: string[];
  identity_cluster_id: string | null;
  identity_status: string | null;
}

export interface MockAppearance {
  id: string;
  profile_id: string;
  audit_id: string;
  transaction_id: string | null;
  score_at_time: number;
  flags_at_time: string[];
  appeared_at: string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class MockStore {
  profiles: Map<string, MockProfile> = new Map();
  appearances: MockAppearance[] = [];

  reset(): void {
    this.profiles.clear();
    this.appearances = [];
  }

  snapshot(): { profiles: Map<string, MockProfile>; appearances: MockAppearance[] } {
    const clone = (v: MockProfile): MockProfile => ({
      ...v,
      emails: [...v.emails],
      ips: [...v.ips],
      addresses: [...v.addresses],
      card_last4s: [...v.card_last4s],
      phones: [...v.phones],
      names: [...v.names],
      fraud_flags: [...v.fraud_flags],
      merchant_ids: [...v.merchant_ids],
      refund_timestamps: [...v.refund_timestamps],
      identity_signals_summary: [...v.identity_signals_summary],
    });
    return {
      profiles: new Map(Array.from(this.profiles.entries()).map(([k, v]) => [k, clone(v)])),
      appearances: this.appearances.map(a => ({ ...a })),
    };
  }

  restore(snap: { profiles: Map<string, MockProfile>; appearances: MockAppearance[] }): void {
    this.profiles = snap.profiles;
    this.appearances = snap.appearances;
  }
}

// ---------------------------------------------------------------------------
// PostgREST OR-expression parser
// Handles patterns like: emails.cs.["foo@bar.com"],ips.cs.["1.2.3.4"]
// ---------------------------------------------------------------------------

interface OrTerm {
  col: string;
  values: string[];
}

function parseOrContains(expr: string): OrTerm[] {
  const byCol = new Map<string, string[]>();
  const re = /(\w+)\.cs\.\["([^"]+)"\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr)) !== null) {
    const existing = byCol.get(m[1]) ?? [];
    existing.push(m[2]);
    byCol.set(m[1], existing);
  }
  return Array.from(byCol.entries()).map(([col, values]) => ({ col, values }));
}

function profileMatchesOr(p: MockProfile, terms: OrTerm[]): boolean {
  return terms.some(({ col, values }) => {
    const arr = (p as unknown as Record<string, unknown>)[col];
    return Array.isArray(arr) && values.some(v => (arr as string[]).includes(v));
  });
}

// ---------------------------------------------------------------------------
// Profile factory
// ---------------------------------------------------------------------------

function makeDefaultProfile(overrides: Partial<MockProfile>): MockProfile {
  const now = new Date().toISOString();
  const base: MockProfile = {
    id: randomUUID(),
    primary_email: null,
    emails: [],
    ips: [],
    addresses: [],
    card_last4s: [],
    phones: [],
    names: [],
    risk_score: 0,
    risk_level: 'low',
    fraud_flags: [],
    total_orders: 0,
    total_refund_claims: 0,
    total_chargebacks: 0,
    total_merchants_seen_at: 0,
    refund_rate: 0,
    refund_timestamps: [],
    fastest_claim_days: null,
    avg_claim_days: null,
    refund_acceleration_score: 0,
    merchant_ids: [],
    first_seen: now,
    last_seen: now,
    last_audit_id: null,
    profile_confidence: 100,
    manually_reviewed: false,
    merchant_notes: null,
    on_watchlist: false,
    identity_confidence_grade: null,
    identity_signals_summary: [],
    identity_cluster_id: null,
    identity_status: null,
  };
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// Query builder (chainable, resolves via PromiseLike)
// ---------------------------------------------------------------------------

type QueryResult = { data: unknown; error: null };

class MockQueryBuilder implements PromiseLike<QueryResult> {
  private readonly _table: string;
  private readonly _store: MockStore;
  private _op = 'select';
  private _filters: Array<(p: MockProfile) => boolean> = [];
  private _payload: unknown = null;
  private _upsertOptions: unknown = null;

  constructor(table: string, store: MockStore) {
    this._table = table;
    this._store = store;
  }

  select(_columns: string): this {
    this._op = 'select';
    return this;
  }

  or(expr: string): this {
    const terms = parseOrContains(expr);
    if (terms.length > 0) {
      this._filters.push(p => profileMatchesOr(p, terms));
    }
    return this;
  }

  gte(col: string, val: number): this {
    this._filters.push(p => {
      const v = (p as unknown as Record<string, unknown>)[col];
      return typeof v === 'number' && v >= val;
    });
    return this;
  }

  eq(col: string, val: unknown): this {
    this._filters.push(p => (p as unknown as Record<string, unknown>)[col] === val);
    return this;
  }

  insert(data: unknown): this {
    this._op = 'insert';
    this._payload = data;
    return this;
  }

  upsert(data: unknown, options?: unknown): this {
    this._op = 'upsert';
    this._payload = data;
    this._upsertOptions = options;
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  single(): this { return this; }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  limit(_n: number): this { return this; }

  private _execute(): QueryResult {
    if (this._table === 'customer_profiles') {
      return this._execProfiles();
    }
    if (this._table === 'customer_profile_audit_appearances') {
      return this._execAppearances();
    }
    return { data: null, error: null };
  }

  private _execProfiles(): QueryResult {
    if (this._op === 'select') {
      let rows = Array.from(this._store.profiles.values());
      for (const f of this._filters) rows = rows.filter(f);
      return { data: rows, error: null };
    }

    if (this._op === 'upsert') {
      const rows = (Array.isArray(this._payload) ? this._payload : [this._payload]) as Partial<MockProfile>[];
      for (const row of rows) {
        const existingId = row.id;
        if (existingId && this._store.profiles.has(existingId)) {
          const existing = this._store.profiles.get(existingId)!;
          this._store.profiles.set(existingId, { ...existing, ...row });
        } else {
          const newId = row.id ?? randomUUID();
          this._store.profiles.set(newId, makeDefaultProfile({ ...row, id: newId }));
        }
      }
      return { data: null, error: null };
    }

    if (this._op === 'insert') {
      const rows = (Array.isArray(this._payload) ? this._payload : [this._payload]) as Partial<MockProfile>[];
      const inserted: { id: string; emails: string[]; card_last4s: string[]; ips: string[] }[] = [];
      for (const row of rows) {
        const newId = randomUUID();
        const profile = makeDefaultProfile({ ...row, id: newId });
        this._store.profiles.set(newId, profile);
        inserted.push({ id: newId, emails: profile.emails, card_last4s: profile.card_last4s, ips: profile.ips });
      }
      return { data: inserted, error: null };
    }

    return { data: null, error: null };
  }

  private _execAppearances(): QueryResult {
    if (this._op === 'insert') {
      const rows = (Array.isArray(this._payload) ? this._payload : [this._payload]) as Partial<MockAppearance>[];
      for (const row of rows) {
        this._store.appearances.push({
          id: randomUUID(),
          profile_id: row.profile_id ?? '',
          audit_id: row.audit_id ?? '',
          transaction_id: row.transaction_id ?? null,
          score_at_time: row.score_at_time ?? 0,
          flags_at_time: row.flags_at_time ?? [],
          appeared_at: new Date().toISOString(),
        });
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }

  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    _onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    const result = this._execute();
    return Promise.resolve(result).then(onfulfilled ?? (v => v as unknown as T1));
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createMockClient(store: MockStore): unknown {
  return {
    from: (table: string) => new MockQueryBuilder(table, store),
  };
}
