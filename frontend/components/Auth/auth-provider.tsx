// @ts-nocheck
"use client";

import { ClerkProvider } from "@/components/Auth/auth-facade";
import { useRouter } from "next/navigation";
import { createContext, ReactNode, useContext } from "react";
import {
  ClerkCustomerCollectionsProvider,
  DeviceCollectionsProvider,
} from "@/components/Customer/device-collections";

const AuthConfigurationContext = createContext(false);

export function useAuthConfigured() {
  return useContext(AuthConfigurationContext);
}

export function GalleryAuthProvider({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey: string | null;
}) {
  const router = useRouter();

  if (!publishableKey) {
    return (
      <AuthConfigurationContext.Provider value={false}>
        <DeviceCollectionsProvider>{children}</DeviceCollectionsProvider>
      </AuthConfigurationContext.Provider>
    );
  }

  return (
    <AuthConfigurationContext.Provider value>
      <ClerkProvider
        publishableKey={publishableKey}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        signInFallbackRedirectUrl="/account"
        signUpFallbackRedirectUrl="/account"
        afterSignOutUrl="/"
        routerPush={(to) => router.push(to)}
        routerReplace={(to) => router.replace(to)}
        appearance={{
          variables: {
            colorPrimary: "#8a6428",
            colorForeground: "#26231f",
            colorBackground: "#fffdf9",
            colorInput: "#fffdf9",
            colorInputForeground: "#26231f",
            borderRadius: "12px",
          },
        }}
      >
        <ClerkCustomerCollectionsProvider>
          {children}
        </ClerkCustomerCollectionsProvider>
      </ClerkProvider>
    </AuthConfigurationContext.Provider>
  );
}
