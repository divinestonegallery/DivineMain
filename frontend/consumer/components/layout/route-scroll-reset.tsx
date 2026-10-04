"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function RouteScrollReset() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;

    if (typeof window === "undefined") return;

    const hasHashTarget = typeof window.location.hash === "string" && window.location.hash.length > 1;
    if (hasHashTarget) return;

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    root.style.scrollBehavior = previousScrollBehavior;
  }, [pathname]);

  return null;
}
