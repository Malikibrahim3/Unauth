'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type FetchSnapshot<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
};

type StoreEntry = {
  data: unknown;
  error: string | null;
  loading: boolean;
  promise: Promise<void> | null;
  listeners: Set<() => void>;
  snapshot: FetchSnapshot<unknown>;
};

const SERVER_SNAPSHOT_LOADING: FetchSnapshot<unknown> = {
  data: undefined,
  error: null,
  loading: true,
};

const SERVER_SNAPSHOT_IDLE: FetchSnapshot<unknown> = {
  data: undefined,
  error: null,
  loading: false,
};

const store = new Map<string, StoreEntry>();

/*
 * RUN-10: the route-ready signal needs to know whether any shared client
 * resource is still in flight. Every panel that loads through this module
 * participates automatically, so readiness cannot be claimed while a required
 * panel is still showing "Loading …".
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
  let entry = store.get(key);
  if (!entry) {
    entry = {
      data: undefined,
      error: null,
      loading: false,
      promise: null,
      listeners: new Set(),
      snapshot: SERVER_SNAPSHOT_IDLE,
    };
    store.set(key, entry);
  }
  return entry;
}

function notify(entry: StoreEntry) {
  for (const listener of entry.listeners) {
    listener();
  }
}

async function defaultParse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function runLoad<T>(key: string, loader: () => Promise<T>) {
  const entry = getEntry(key);
  if (entry.promise) return;

  entry.loading = true;
  entry.error = null;
  markResourcePending(key);
  notify(entry);

  entry.promise = loader()
    .then((data) => {
      entry.data = data;
      entry.error = null;
    })
    .catch((err: unknown) => {
      entry.data = undefined;
      entry.error = err instanceof Error ? err.message : 'Request failed';
    })
    .finally(() => {
      entry.loading = false;
      entry.promise = null;
      markResourceSettled(key);
      notify(entry);
    });
}

function subscribeToLoad<T>(key: string, loader: () => Promise<T>, onStoreChange: () => void) {
  const entry = getEntry(key);
  entry.listeners.add(onStoreChange);
  if (!entry.promise && entry.data === undefined && entry.error === null) {
    runLoad(key, loader);
  }
  return () => {
    entry.listeners.delete(onStoreChange);
  };
}

function resetEntry(key: string) {
  const entry = getEntry(key);
  entry.data = undefined;
  entry.error = null;
  entry.loading = true;
  entry.promise = null;
  notify(entry);
}

function syncSnapshot<T>(entry: StoreEntry): FetchSnapshot<T> {
  const current = entry.snapshot;
  if (
    current.data === entry.data &&
    current.error === entry.error &&
    current.loading === entry.loading
  ) {
    return current as FetchSnapshot<T>;
  }
  entry.snapshot = {
    data: entry.data,
    error: entry.error,
    loading: entry.loading,
  };
  return entry.snapshot as FetchSnapshot<T>;
}

function getServerSnapshot<T>(enabled: boolean): FetchSnapshot<T> {
  return (enabled ? SERVER_SNAPSHOT_LOADING : SERVER_SNAPSHOT_IDLE) as FetchSnapshot<T>;
}

function getClientSnapshot<T>(key: string, enabled: boolean): FetchSnapshot<T> {
  if (!enabled) {
    return SERVER_SNAPSHOT_IDLE as FetchSnapshot<T>;
  }
  const entry = getEntry(key);
  // Match getServerSnapshot until the first load starts — avoids hydration mismatch
  // when client components use useFetchJson / useAsyncResource (e.g. Settings → Integrations).
  if (entry.data === undefined && entry.error === null && entry.promise === null && !entry.loading) {
    return SERVER_SNAPSHOT_LOADING as FetchSnapshot<T>;
  }
  return syncSnapshot<T>(entry);
}

function useResourceStore<T>(
  key: string,
  loader: () => Promise<T>,
  enabled: boolean,
): FetchSnapshot<T> & { reload: () => void } {
  const reload = useCallback(() => {
    if (!enabled) return;
    resetEntry(key);
    runLoad(key, loader);
  }, [enabled, key, loader]);

  const snapshot = useSyncExternalStore(
    (onStoreChange) => {
      if (!enabled) return () => {};
      return subscribeToLoad(key, loader, onStoreChange);
    },
    () => getClientSnapshot<T>(key, enabled),
    () => getServerSnapshot<T>(enabled),
  );

  return { ...snapshot, reload };
}

/**
 * Client-side JSON fetch without useEffect — uses useSyncExternalStore.
 */
export function useFetchJson<T>(
  url: string | null,
  options?: {
    enabled?: boolean;
    parse?: (response: Response) => Promise<T>;
  },
): FetchSnapshot<T> & { reload: () => void } {
  const enabled = options?.enabled !== false && url !== null;
  const parse = options?.parse ?? defaultParse<T>;
  const key = enabled && url ? url : '';
  const loader = useCallback(async () => parse(await fetch(url!)), [parse, url]);

  return useResourceStore(key, loader, enabled);
}

/**
 * Async resource loader without useEffect — uses useSyncExternalStore.
 */
export function useAsyncResource<T>(
  key: string,
  loader: () => Promise<T>,
  options?: { enabled?: boolean },
): FetchSnapshot<T> & { reload: () => void } {
  const enabled = options?.enabled !== false;
  return useResourceStore(key, loader, enabled);
}
