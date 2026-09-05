// @ts-nocheck
"use client";

import { useAuth } from "@/components/Auth/auth-facade";
import { useEffect, useRef } from "react";
import { getCurrentUser } from "@/api/auth";

export function AccountBootstrap() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const synchronized = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || synchronized.current) return;
    synchronized.current = true;

    void getToken()
      .then(() => getCurrentUser())
      .catch(() => {
        synchronized.current = false;
      });
  }, [getToken, isLoaded, isSignedIn]);

  return null;
}
