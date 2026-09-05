// @ts-nocheck
"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const EMPTY_SNAPSHOT = "[]";
const savedWorksKey = "dsg-saved-works";
const enquiryBagKey = "dsg-enquiry-bag";
const savedWorksEvent = "dsg:saved-works-change";
const enquiryBagEvent = "dsg:enquiry-bag-change";

type CustomerCollection = {
  ids: Set<string>;
  count: number;
  toggle: (id: string) => boolean;
  remove: (id: string) => void;
  clear: () => void;
  isAccountBacked: boolean;
  isSyncing: boolean;
};

type CollectionsContextValue = {
  savedWorks: CustomerCollection;
  enquiryBag: CustomerCollection;
};

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

function readSnapshot(key: string) {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  return window.localStorage.getItem(key) ?? EMPTY_SNAPSHOT;
}

function parseSnapshot(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return new Set<string>(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function subscribe(eventName: string, listener: () => void) {
  const handleStorage = () => listener();
  window.addEventListener(eventName, listener);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(eventName, listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function useDeviceCollection(key: string, eventName: string): CustomerCollection {
  const subscribeToCollection = useCallback((listener: () => void) => subscribe(eventName, listener), [eventName]);
  const getSnapshot = useCallback(() => readSnapshot(key), [key]);
  const snapshot = useSyncExternalStore(subscribeToCollection, getSnapshot, () => EMPTY_SNAPSHOT);
  const ids = useMemo(() => parseSnapshot(snapshot), [snapshot]);

  const update = useCallback((next: Set<string>) => {
    window.localStorage.setItem(key, JSON.stringify([...next]));
    window.dispatchEvent(new Event(eventName));
  }, [eventName, key]);

  const toggle = useCallback((id: string) => {
    const next = parseSnapshot(readSnapshot(key));
    const added = !next.has(id);
    if (added) next.add(id);
    else next.delete(id);
    update(next);
    return added;
  }, [key, update]);

  const remove = useCallback((id: string) => {
    const next = parseSnapshot(readSnapshot(key));
    next.delete(id);
    update(next);
  }, [key, update]);

  const clear = useCallback(() => update(new Set()), [update]);

  return {
    ids,
    count: ids.size,
    toggle,
    remove,
    clear,
    isAccountBacked: false,
    isSyncing: false,
  };
}

function useDeviceCollections() {
  const savedWorks = useDeviceCollection(savedWorksKey, savedWorksEvent);
  const enquiryBag = useDeviceCollection(enquiryBagKey, enquiryBagEvent);
  return useMemo(() => ({ savedWorks, enquiryBag }), [savedWorks, enquiryBag]);
}

export function DeviceCollectionsProvider({ children }: { children: ReactNode }) {
  const collections = useDeviceCollections();
  return <CollectionsContext.Provider value={collections}>{children}</CollectionsContext.Provider>;
}

export function ClerkCustomerCollectionsProvider({ children }: { children: ReactNode }) {
  return <DeviceCollectionsProvider>{children}</DeviceCollectionsProvider>;
}

function useCollections() {
  const collections = useContext(CollectionsContext);
  if (!collections) {
    throw new Error("Customer collection hooks require a collections provider.");
  }
  return collections;
}

export function useSavedWorks() {
  return useCollections().savedWorks;
}

export function useEnquiryBag() {
  return useCollections().enquiryBag;
}
