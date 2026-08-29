// @ts-nocheck
"use client";

import { useAuth } from "@/components/Auth/auth-facade";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

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

type CollectionResponse = {
  data?: {
    wishlistProductIds?: unknown;
    bagProductIds?: unknown;
    productIds?: unknown;
  };
};

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

function readSnapshot(key: string) {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;
  return window.localStorage.getItem(key) ?? EMPTY_SNAPSHOT;
}

function parseSnapshot(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return new Set<string>(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function stringSet(value: unknown) {
  return new Set<string>(
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [],
  );
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
  const subscribeToCollection = useCallback(
    (listener: () => void) => subscribe(eventName, listener),
    [eventName],
  );
  const getSnapshot = useCallback(() => readSnapshot(key), [key]);
  const snapshot = useSyncExternalStore(
    subscribeToCollection,
    getSnapshot,
    () => EMPTY_SNAPSHOT,
  );
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
  return (
    <CollectionsContext.Provider value={collections}>
      {children}
    </CollectionsContext.Provider>
  );
}

async function authenticatedRequest(
  getToken: () => Promise<string | null>,
  path: string,
  init?: RequestInit,
) {
  const token = await getToken();
  if (!token) throw new Error("Authentication token unavailable.");
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error("Collection request failed.");
  return response.json() as Promise<CollectionResponse>;
}

function setWithChange(current: Set<string>, id: string, add: boolean) {
  const next = new Set(current);
  if (add) next.add(id);
  else next.delete(id);
  return next;
}

export function ClerkCustomerCollectionsProvider({ children }: { children: ReactNode }) {
  const local = useDeviceCollections();
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [remoteSaved, setRemoteSaved] = useState<Set<string>>(new Set());
  const [remoteBag, setRemoteBag] = useState<Set<string>>(new Set());
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const localSavedSignature = useMemo(
    () => [...local.savedWorks.ids].sort().join("\u0000"),
    [local.savedWorks.ids],
  );
  const localBagSignature = useMemo(
    () => [...local.enquiryBag.ids].sort().join("\u0000"),
    [local.enquiryBag.ids],
  );
  const clearLocalSaved = local.savedWorks.clear;
  const clearLocalBag = local.enquiryBag.clear;
  const accountReady = Boolean(isSignedIn && userId && readyUserId === userId);

  const refreshAccount = useCallback(async () => {
    const payload = await authenticatedRequest(
      () => getToken(),
      "/api/v1/me/collections",
    );
    setRemoteSaved(stringSet(payload.data?.wishlistProductIds));
    setRemoteBag(stringSet(payload.data?.bagProductIds));
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    let cancelled = false;
    const wishlistProductIds = localSavedSignature
      ? localSavedSignature.split("\u0000")
      : [];
    const bagProductIds = localBagSignature ? localBagSignature.split("\u0000") : [];

    void authenticatedRequest(
      () => getToken(),
      "/api/v1/me/collections/migrate",
      {
        method: "POST",
        body: JSON.stringify({ wishlistProductIds, bagProductIds }),
      },
    ).then((payload) => {
      if (cancelled) return;
      setRemoteSaved(stringSet(payload.data?.wishlistProductIds));
      setRemoteBag(stringSet(payload.data?.bagProductIds));
      setReadyUserId(userId);
      clearLocalSaved();
      clearLocalBag();
    }).catch(() => {
      // Keep the device collections intact so a later sign-in refresh can retry safely.
    });

    return () => {
      cancelled = true;
    };
  }, [
    getToken,
    clearLocalBag,
    clearLocalSaved,
    isLoaded,
    isSignedIn,
    localBagSignature,
    localSavedSignature,
    userId,
  ]);

  useEffect(() => {
    if (!accountReady) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshAccount().catch(() => undefined);
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [accountReady, refreshAccount]);

  const reconcileAfterFailure = useCallback(() => {
    void refreshAccount().catch(() => undefined);
  }, [refreshAccount]);

  const toggleRemoteSaved = useCallback((id: string) => {
    const added = !remoteSaved.has(id);
    setRemoteSaved((current) => setWithChange(current, id, added));
    const request = added
      ? authenticatedRequest(() => getToken(), "/api/v1/me/wishlist", {
        method: "PUT",
        body: JSON.stringify({ productId: id }),
      })
      : authenticatedRequest(
        () => getToken(),
        `/api/v1/me/wishlist/items/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
    void request.then((payload) => {
      setRemoteSaved(stringSet(payload.data?.productIds));
    }).catch(reconcileAfterFailure);
    return added;
  }, [getToken, reconcileAfterFailure, remoteSaved]);

  const removeRemoteSaved = useCallback((id: string) => {
    setRemoteSaved((current) => setWithChange(current, id, false));
    void authenticatedRequest(
      () => getToken(),
      `/api/v1/me/wishlist/items/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ).then((payload) => {
      setRemoteSaved(stringSet(payload.data?.productIds));
    }).catch(reconcileAfterFailure);
  }, [getToken, reconcileAfterFailure]);

  const clearRemoteSaved = useCallback(() => {
    setRemoteSaved(new Set());
    void authenticatedRequest(() => getToken(), "/api/v1/me/wishlist", {
      method: "DELETE",
    }).catch(reconcileAfterFailure);
  }, [getToken, reconcileAfterFailure]);

  const toggleRemoteBag = useCallback((id: string) => {
    const added = !remoteBag.has(id);
    setRemoteBag((current) => setWithChange(current, id, added));
    const request = added
      ? authenticatedRequest(() => getToken(), "/api/v1/me/cart", {
        method: "POST",
        body: JSON.stringify({ productId: id }),
      })
      : authenticatedRequest(
        () => getToken(),
        `/api/v1/me/cart/items/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
    void request.then((payload) => {
      setRemoteBag(stringSet(payload.data?.productIds));
    }).catch(reconcileAfterFailure);
    return added;
  }, [getToken, reconcileAfterFailure, remoteBag]);

  const removeRemoteBag = useCallback((id: string) => {
    setRemoteBag((current) => setWithChange(current, id, false));
    void authenticatedRequest(
      () => getToken(),
      `/api/v1/me/cart/items/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    ).then((payload) => {
      setRemoteBag(stringSet(payload.data?.productIds));
    }).catch(reconcileAfterFailure);
  }, [getToken, reconcileAfterFailure]);

  const clearRemoteBag = useCallback(() => {
    setRemoteBag(new Set());
    void authenticatedRequest(() => getToken(), "/api/v1/me/cart", {
      method: "DELETE",
    }).catch(reconcileAfterFailure);
  }, [getToken, reconcileAfterFailure]);

  const collections = useMemo<CollectionsContextValue>(() => {
    if (!accountReady) {
      return {
        savedWorks: { ...local.savedWorks, isSyncing: Boolean(isSignedIn) },
        enquiryBag: { ...local.enquiryBag, isSyncing: Boolean(isSignedIn) },
      };
    }

    return {
      savedWorks: {
        ids: remoteSaved,
        count: remoteSaved.size,
        toggle: toggleRemoteSaved,
        remove: removeRemoteSaved,
        clear: clearRemoteSaved,
        isAccountBacked: true,
        isSyncing: false,
      },
      enquiryBag: {
        ids: remoteBag,
        count: remoteBag.size,
        toggle: toggleRemoteBag,
        remove: removeRemoteBag,
        clear: clearRemoteBag,
        isAccountBacked: true,
        isSyncing: false,
      },
    };
  }, [
    accountReady,
    clearRemoteBag,
    clearRemoteSaved,
    isSignedIn,
    local.enquiryBag,
    local.savedWorks,
    remoteBag,
    remoteSaved,
    removeRemoteBag,
    removeRemoteSaved,
    toggleRemoteBag,
    toggleRemoteSaved,
  ]);

  return (
    <CollectionsContext.Provider value={collections}>
      {children}
    </CollectionsContext.Provider>
  );
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
