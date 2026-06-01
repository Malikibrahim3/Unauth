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
type Filter = ['eq' | 'neq', string, unknown] | ['in', string, unknown[]];

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

  in(col: string, vals: unknown[]): this {
    this.filters.push(['in', col, vals]);
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

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    const rows = this.execute();
    return Promise.resolve({ data: rows, error: null }).then(onfulfilled, onrejected);
  }
}

export type MemoryClient = {
  from: (table: string) => QueryBuilder;
  __store: MemoryStore;
};

export function createMemoryClient(seed?: MemoryStore): MemoryClient {
  const store: MemoryStore = seed ?? new Map();
  return {
    from: (table: string) => new QueryBuilder(store, table),
    __store: store,
  };
}

/** Convenience: read all rows for a table from a client. */
export function rowsOf(client: MemoryClient, table: string): Row[] {
  return client.__store.get(table) ?? [];
}
