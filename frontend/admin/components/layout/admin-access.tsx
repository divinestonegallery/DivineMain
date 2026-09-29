"use client";

import type { ReactNode } from "react";
import { SignIn, useUser } from "@/components/auth/auth-facade";
import { hasAdminRole } from "@/components/common/admin-records";
import { AdminShell } from "./admin-shell";
import { AdminState } from "./admin-state";
import dashboardStyles from "./admin-dashboard.module.css";

export function AdminAccess({ redirect, children }: { redirect: string; children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) return <AdminShell><AdminState reason="loading" /></AdminShell>;
  if (!isSignedIn) {
    return (
      <AdminShell>
        <section className={dashboardStyles.auth}>
          <div>
            <small>Gallery administration</small>
            <h1>Sign in to continue</h1>
            <p>Use the existing account flow. Your backend role determines whether this workspace is available.</p>
          </div>
          <SignIn fallbackRedirectUrl={redirect} />
        </section>
      </AdminShell>
    );
  }
  // Presentation only. Django AdminAPIView still rejects unauthorized API calls.
  if (!hasAdminRole(user)) return <AdminShell><AdminState reason="forbidden" /></AdminShell>;
  return <>{children}</>;
}
