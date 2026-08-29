// @ts-nocheck
"use client";

import React, { createContext, useContext, ReactNode } from "react";

// Facade replacing @clerk/react for DivineMain migration

const AuthContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  user: null as any,
});

export function useAuth() {
  const context = useContext(AuthContext);
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    userId: context.user?.id || null,
    getToken: async () => null,
  };
}

export function useUser() {
  const context = useContext(AuthContext);
  return {
    isLoaded: context.isLoaded,
    isSignedIn: context.isSignedIn,
    user: context.user,
  };
}

export function SignedIn({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return <>{children}</>;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  if (isSignedIn) return null;
  return <>{children}</>;
}

export function Show({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return <>{children}</>;
}

export function UserButton() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;
  return <div>[User Menu]</div>;
}

export function ClerkProvider({ children }: { children: ReactNode; [key: string]: any }) {
  // In a full implementation, fetch session state from Django API here
  return (
    <AuthContext.Provider value={{ isLoaded: true, isSignedIn: false, user: null }}>
      {children}
    </AuthContext.Provider>
  );
}

export function SignIn({ routing, path }: any) {
  return <div>Sign in to your account. (Connected to Django Backend)</div>;
}

export function SignUp({ routing, path }: any) {
  return <div>Create an account. (Connected to Django Backend)</div>;
}
