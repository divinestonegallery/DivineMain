// @ts-nocheck
"use client";

import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/api/auth";

export function AccountControl({ className }: { className?: string }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(user => {
        if (active) setIsSignedIn(!!user);
      })
      .catch(() => {
        if (active) setIsSignedIn(false);
      });
      
    return () => { active = false; };
  }, []);

  return (
    <Link className={className} href={isSignedIn ? "/account" : "/sign-in"} aria-label="Customer account">
      <CircleUserRound aria-hidden="true" size={21} strokeWidth={1.6} />
    </Link>
  );
}
