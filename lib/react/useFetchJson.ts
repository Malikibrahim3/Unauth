'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

/** §7.5's resource lifecycle. `refreshing` and the trailing `error` variant both keep `data`. */
export type ResourceStatus = 'idle' | 'initial-loading' | 'success' | 'refreshing' | 'error';

/**
 * §7.5's discriminated resource contract. `FetchSnapshot` below is the same
 * shape plus back-compatible derived fields (`loading`, `isInitialLoading`,
 * `isRefreshing`, `hasStaleData`) so the ~20 existing `useFetchJson`/
 * `useAsyncResource` call sites keep working unchanged while consumers that
 * want the richer contract can read `status`/`dataAsOf` directly.
 */
export type ResourceSnapshot<T> =
  | { status: 'idle' | 'initial-loading'; data: undefined; error: null; dataAsOf: null }
  | { status: 'success' | 'refreshing'; data: T; error: null; dataAsOf: string | null }
  | { status: 'error'; data: T | undefined; error: string; dataAsOf: string | null };

export type FetchSnapshot<T> = ResourceSnapshot<T> & {
  /** Derived from `status === 'initial-loading'`. Kept for existing call sites. */
  loading: boolean;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  /** True while an `error` snapshot still carries the last-known-good `data`. */
  hasStaleData: boolean;
};

type StoreEntry = {
  status: ResourceStatus;
  data: unknown;
  error: string | null;
  dataAsOf: string | null;
  /** Bumped on every load start; a load applies its result only if it is still current. */
  generation: number;
  controller: AbortController | null;
  listeners: Set<() => void>;
  snapshot: FetchSnapshot<unknown> | null;
  lastAccessedAt: number;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
};

const IDLE_SNAPSHOT: FetchSnapshot<unknown> = {
  status: 'idle',
  data: undefined,
  error: null,
  dataAsOf: null,
  loading: false,
  isInitialLoading: false,
  isRefreshing: false,
  hasStaleData: false,
};

const SERVER_LOADING_SNAPSHOT: FetchSnapshot<unknown> = {
  status: 'initial-loading',
  data: undefined,
  error: null,
  dataAsOf: null,
  loading: true,
  isInitialLoading: true,
  isRefreshing: false,
  hasStaleData: false,
};

const store = new Map<string, StoreEntry>();
const RESOURCE_TIMEOUT_MS = 12_000;
const RESOURCE_TTL_MS = 5 * 60_000;
const MAX_RESOURCE_ENTRIES = 100;

function pruneStore(nowMs = Date.now()) {
  for (const [key, entry] of store) {
    if (
      entry.listeners.size === 0
      && entry.controller === null
      && nowMs - entry.lastAccessedAt > RESOURCE_TTL_MS
    ) {
      store.delete(key);
    }
  }
  if (store.size <= MAX_RESOURCE_ENTRIES) return;
  const removable = [...store.entries()]
    .filter(([, entry]) => entry.listeners.size === 0 && entry.controller === null)
    .sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
  for (const [key] of removable.slice(0, store.size - MAX_RESOURCE_ENTRIES)) {
    store.delete(key);
  }
}

/*
 * RUN-10: the route-ready signal needs to know whether any shared client
 * resource is still in flight. Every panel that loads through this module
 * participates automatically, so readiness cannot be claimed while a required
 * panel is still showing "Loading …". A `refreshing` resource does NOT count
 * as pending — it already has data on screen; only `initial-loading` blocks
 * route readiness.
 */
const pendingKeys = new Set<string>();
const pendingListeners = new Set<() => void>();

function notifyPending() {
  for (const listener of pendingListeners) listener();
}

export function markResourcePending(key: string) {
  if (pendingKeys.has(key)) return;
  pendingKeys.add(key);
  notifyPending();
}

export function markResourceSettled(key: string) {
  if (!pendingKeys.delete(key)) return;
  notifyPending();
}

export function pendingResourceCount(): number {
  return pendingKeys.size;
}

export function subscribeToPendingResources(listener: () => void): () => void {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
}

function getEntry(key: string): StoreEntry {
  pruneStore();
  let entry = store.get(key);
  if (!entry) {
    entry = {
      status: 'idle',
      data: undefined,
      error: null,
      dataAsOf: null,
      generation: 0,
      controller: null,
      listeners: new Set(),
      snapshot: null,
      lastAccessedAt: Date.now(),
      cleanupTimer: null,
    };
    store.set(key, entry);
  }
  entry.lastAccessedAt = Date.now();
  return entry;
}

function notify(entry: StoreEntry) {
  for (const listener of entry.listeners) listener();
}

async function defaultParse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Starts a load unless one is already in flight for this generation. A
 * `refresh` keeps the entry's existing `data`/`dataAsOf` visible throughout —
 * §7.5 forbids the old data-deleting reset on reload.
 */
function runLoad<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  getDataAsOf: ((data: T) => string | null) | undefined,
  isRefresh: boolean,
  timeoutMs: number,
  blocksReadiness: boolean,
) {
  const entry = getEntry(key);
  if (entry.controller) return; // A load is already in flight; let it finish.

  const generation = ++entry.generation;
  const controller = new AbortController();
  entry.controller = controller;
  entry.status = isRefresh && entry.data !== undefined ? 'refreshing' : 'initial-loading';
  entry.error = null;
  if (blocksReadiness) markResourcePending(key);
  notify(entry);
  const timeoutError = new DOMException('Request timed out', 'TimeoutError');
  let timeout!: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort(timeoutError);
      reject(timeoutError);
    }, timeoutMs);
  });

  Promise.race([loader(controller.signal), deadline])
    .then((data) => {
      if (entry.generation !== generation) return; // Superseded by a newer request.
      entry.data = data;
      entry.error = null;
      entry.dataAsOf = getDataAsOf?.(data) ?? null;
      entry.status = 'success';
    })
    .catch((err: unknown) => {
      if (entry.generation !== generation) return;
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (!(reason instanceof DOMException) || reason.name !== 'TimeoutError') return;
        entry.error = 'Request timed out. Try again.';
        entry.status = 'error';
        return;
      }
      // Initial error may have no data; refresh error retains the stale data.
      entry.error = err instanceof Error ? err.message : 'Request failed';
      entry.status = 'error';
    })
    .finally(() => {
      clearTimeout(timeout);
      if (entry.generation !== generation) return;
      entry.controller = null;
      entry.lastAccessedAt = Date.now();
      if (blocksReadiness) markResourceSettled(key);
      notify(entry);
      pruneStore();
    });
}

function subscribeToLoad<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  getDataAsOf: ((data: T) => string | null) | undefined,
  timeoutMs: number,
  blocksReadiness: boolean,
  onStoreChange: () => void,
) {
  const entry = getEntry(key);
  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }
  entry.listeners.add(onStoreChange);
  if (!entry.controller && entry.data === undefined && entry.error === null) {
    runLoad(key, loader, getDataAsOf, false, timeoutMs, blocksReadiness);
  }
  return () => {
    entry.listeners.delete(onStoreChange);
    if (entry.listeners.size === 0) {
      entry.cleanupTimer = setTimeout(() => {
        entry.cleanupTimer = null;
        if (entry.listeners.size === 0) entry.controller?.abort();
      }, 0);
    }
  };
}

function syncSnapshot<T>(entry: StoreEntry): FetchSnapshot<T> {
  const current = entry.snapshot;
  if (
    current &&
    current.status === entry.status &&
    current.data === entry.data &&
    current.error === entry.error &&
    current.dataAsOf === entry.dataAsOf
  ) {
    return current as FetchSnapshot<T>;
  }
  const next: FetchSnapshot<unknown> = {
    status: entry.status,
    data: entry.data,
    error: entry.error,
    dataAsOf: entry.dataAsOf,
    loading: entry.status === 'initial-loading',
    isInitialLoading: entry.status === 'initial-loading',
    isRefreshing: entry.status === 'refreshing',
    hasStaleData: entry.status === 'error' && entry.data !== undefined,
  } as FetchSnapshot<unknown>;
  entry.snapshot = next;
  return next as FetchSnapshot<T>;
}

function getServerSnapshot<T>(enabled: boolean): FetchSnapshot<T> {
  return (enabled ? SERVER_LOADING_SNAPSHOT : IDLE_SNAPSHOT) as FetchSnapshot<T>;
}

function getClientSnapshot<T>(key: string, enabled: boolean): FetchSnapshot<T> {
  if (!enabled) return IDLE_SNAPSHOT as FetchSnapshot<T>;
  const entry = getEntry(key);
  // Match getServerSnapshot until the first load starts — avoids hydration mismatch
  // when client components use useFetchJson / useAsyncResource (e.g. Settings → Integrations).
  if (entry.status === 'idle' && !entry.controller) {
    return SERVER_LOADING_SNAPSHOT as FetchSnapshot<T>;
  }
  return syncSnapshot<T>(entry);
}

function useResourceStore<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
  getDataAsOf: ((data: T) => string | null) | undefined,
  timeoutMs: number,
  blocksReadiness: boolean,
): FetchSnapshot<T> & { reload: () => void } {
  const reload = useCallback(() => {
    if (!enabled) return;
    runLoad(key, loader, getDataAsOf, true, timeoutMs, blocksReadiness);
  }, [enabled, key, loader, getDataAsOf, timeoutMs, blocksReadiness]);

  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (!enabled) return () => {};
      return subscribeToLoad(key, loader, getDataAsOf, timeoutMs, blocksReadiness, onStoreChange);
    },
    () => getClientSnapshot<T>(key, enabled),
    () => getServerSnapshot<T>(enabled),
  );

  return { ...snapshot, reload };
}

/**
 * Client-side JSON fetch without useEffect — uses useSyncExternalStore.
 * `reload()` refreshes in place: existing `data` stays visible and `status`
 * becomes `refreshing`, never blanking to a loading state (§7.5).
 */
export function useFetchJson<T>(
  url: string | null,
  options?: {
    enabled?: boolean;
    parse?: (response: Response) => Promise<T>;
    /** Extracts a domain `dataAsOf` timestamp from the parsed response. Omit to leave it `null` — never fabricated from fetch-completion time. */
    getDataAsOf?: (data: T) => string | null;
    /** Hard deadline for the underlying request. Defaults to 12 seconds. */
    timeoutMs?: number;
    /** Non-critical chrome resources can load without delaying route readiness. */
    blocksReadiness?: boolean;
  },
): FetchSnapshot<T> & { reload: () => void } {
  const enabled = options?.enabled !== false && url !== null;
  const parse = options?.parse ?? defaultParse<T>;
  const key = enabled && url ? url : '';
  const stableLoader = useCallback(
    (signal: AbortSignal) => fetch(url!, { signal }).then((response) => parse(response)),
    [parse, url],
  );

  return useResourceStore(
    key,
    stableLoader,
    enabled,
    options?.getDataAsOf,
    options?.timeoutMs ?? RESOURCE_TIMEOUT_MS,
    options?.blocksReadiness !== false,
  );
}

/**
 * Async resource loader without useEffect — uses useSyncExternalStore.
 * `reload()` refreshes in place per the same §7.5 contract as `useFetchJson`.
 */
export function useAsyncResource<T>(
  key: string,
  loader: (signal?: AbortSignal) => Promise<T>,
  options?: {
    enabled?: boolean;
    getDataAsOf?: (data: T) => string | null;
    timeoutMs?: number;
    blocksReadiness?: boolean;
  },
): FetchSnapshot<T> & { reload: () => void } {
  const enabled = options?.enabled !== false;
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const stableLoader = useCallback((signal: AbortSignal) => loaderRef.current(signal), []);
  return useResourceStore(
    key,
    stableLoader,
    enabled,
    options?.getDataAsOf,
    options?.timeoutMs ?? RESOURCE_TIMEOUT_MS,
    options?.blocksReadiness !== false,
  );
}
