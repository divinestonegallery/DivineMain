// @ts-nocheck
import type { Metadata } from "next";
import { JsonLd } from "@/components/common/json-ld";
import { getSiteUrl } from "@/src/config/site";
import "./globals.css";

export function generateMetadata(): Metadata {
  const metadataBase = new URL(getSiteUrl());
  const description = "Authentic hand-carved marble moorties by fourth-generation master moortikars from Alwar, Rajasthan.";

  return {
    metadataBase,
    title: {
      default: "Divine Stone Gallery | Hand-Carved Marble Moorties",
      template: "%s | Divine Stone Gallery",
    },
    description,
    icons: {
      icon: "/brand/lotus-mark.jpg",
      shortcut: "/brand/lotus-mark.jpg",
      apple: "/brand/lotus-mark.jpg",
    },
    openGraph: {
      type: "website",
      title: "Divine Stone Gallery",
      description,
      siteName: "Divine Stone Gallery",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Divine Stone Gallery — authentic hand-carved marble moorties" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Divine Stone Gallery",
      description,
      images: ["/og.png"],
    },
  };
}

import { ClerkCustomerCollectionsProvider } from "@/components/Customer/device-collections";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = getSiteUrl();
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Divine Stone Gallery",
    url: siteUrl,
    logo: `${siteUrl}/brand/lotus-mark.jpg`,
    foundingDate: "1960",
    description: "Fourth-generation family atelier creating hand-carved marble murtis in Alwar, Rajasthan.",
    areaServed: "IN",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-91661-38566",
      contactType: "customer service",
      availableLanguage: ["English", "Hindi"],
    },
  };

  return (
    <html
      lang="en"
      style={
        {
          "--font-brand-display":
            "'Iowan Old Style', Baskerville, 'Times New Roman', serif",
        } as React.CSSProperties
      }
    >
      <body className="antialiased">
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <JsonLd data={organizationSchema} />
        <ClerkCustomerCollectionsProvider>
          {children}
        </ClerkCustomerCollectionsProvider>
      </body>
    </html>
  );
}
