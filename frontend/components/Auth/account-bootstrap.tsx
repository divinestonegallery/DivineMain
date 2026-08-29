// @ts-nocheck
"use client";

import { useAuth } from "@/components/Auth/auth-facade";
import { useEffect, useRef } from "react";

export function AccountBootstrap() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const synchronized = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synchronized.current) return;
    synchronized.current = true;

    void getToken()
      .then((token) =>
        fetch("/api/v1/auth/sync", {
          method: "POST",
          headers: token ? { authorization: `Bearer ${token}` } : undefined,
        }),
      )
      .then((response) => {
        if (!response.ok) synchronized.current = false;
      })
      .catch(() => {
        synchronized.current = false;
      });
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}
