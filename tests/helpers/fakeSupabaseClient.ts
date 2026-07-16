/**
 * A small in-memory, chainable, table-aware fake for the subset of the
 * Supabase query builder this repo's read paths actually use
 * (select/eq/in/order/limit/maybeSingle, thenable like the real client).
 *
 * This is NOT a real Postgres/RLS test harness — no such harness exists in
 * this repo. It exists so tests can call the REAL loader/route functions
 * (e.g. loadConnectorCatalogue) against multiple tables and multiple
 * merchants' rows in one fixture, instead of hand-rolling a bespoke
 * single-table mock per test file.
 */

export type FakeRow = Record<string, unknown>;
export type FakeTables = Record<string, FakeRow[]>;

type Builder = {
  select: (cols?: string) => Builder;
  eq: (col: string, val: unknown) => Builder;
  in: (col: string, vals: unknown[]) => Builder;
  order: (col: string, opts?: { ascending?: boolean }) => Builder;
  limit: (n: number) => Builder;
  maybeSingle: () => Promise<{ data: FakeRow | null; error: null }>;
  then: <T>(resolve: (value: { data: FakeRow[]; error: null }) => T) => Promise<T>;
};

export function createFakeSupabaseClient(tables: FakeTables) {
  return {
    from(table: string) {
      let filtered = [...(tables[table] ?? [])];
      const builder: Builder = {
        select() {
          return builder;
        },
        eq(col, val) {
          filtered = filtered.filter((row) => row[col] === val);
          return builder;
        },
        in(col, vals) {
          filtered = filtered.filter((row) => vals.includes(row[col]));
          return builder;
        },
        order(col, opts) {
          const ascending = opts?.ascending !== false;
          filtered = [...filtered].sort((a, b) => {
            const av = a[col] as string | number | null;
            const bv = b[col] as string | number | null;
            if (av === bv) return 0;
            if (av === null || av === undefined) return ascending ? -1 : 1;
            if (bv === null || bv === undefined) return ascending ? 1 : -1;
            const cmp = av < bv ? -1 : 1;
            return ascending ? cmp : -cmp;
          });
          return builder;
        },
        limit(n) {
          filtered = filtered.slice(0, n);
          return builder;
        },
        maybeSingle() {
          return Promise.resolve({ data: filtered[0] ?? null, error: null });
        },
        then(resolve) {
          return Promise.resolve(resolve({ data: filtered, error: null }));
        },
      };
      return builder;
    },
  };
}
