"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/components/Auth/auth-facade";

export function CustomMurtiAccess({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("dsg:open-auth", {
        detail: { pendingPath: "/custom-murti", reason: "custom-murti" },
      }));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  return isLoaded && isSignedIn ? <>{children}</> : null;
}
