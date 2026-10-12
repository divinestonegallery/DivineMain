import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables, manrope } from "./fonts";
import { GalleryAuthProvider } from "@/components/auth/auth-provider";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Divine Stone Gallery Admin",
  icons: { icon: [{ url: "/brand/metalogo.png", type: "image/png" }] },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body className={manrope.className}>
        <GalleryAuthProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? null}>
          {children}
        </GalleryAuthProvider>
      </body>
    </html>
  );
}
