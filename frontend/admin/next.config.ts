import path from "path";
import type { NextConfig } from "next";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api(?:\/v1)?$/i, "");

const nextConfig: NextConfig = {
  agentRules: false,
  outputFileTracingRoot: path.join(__dirname, ".."),
  // Shared source sits outside this app, so package lookup must start in this app.
  webpack(config) {
    const modules = path.join(__dirname, "node_modules");
    config.resolve.modules = [modules, ...(config.resolve.modules ?? ["node_modules"])];
    config.resolve.alias = {
      ...config.resolve.alias,
      "react$": path.join(modules, "react"),
      "react/jsx-runtime$": path.join(modules, "react/jsx-runtime"),
      "react/jsx-dev-runtime$": path.join(modules, "react/jsx-dev-runtime"),
      "lucide-react$": path.join(modules, "lucide-react"),
    };
    return config;
  },
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: "https", hostname: "media.divinestonegallery.com", pathname: "/**" },
      { protocol: "https", hostname: "media.dev.divinestonegallery.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
  async rewrites() {
    if (!apiBaseUrl) return [];
    return [{ source: "/api/:path*", destination: `${apiBaseUrl}/api/:path*` }];
  },
};

export default nextConfig;
