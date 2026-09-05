// @ts-nocheck
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-muted": "var(--surface-muted)",
        "ink-muted": "var(--ink-muted)",
        gold: "var(--gold)",
        "gold-deep": "var(--gold-deep)",
        "gold-soft": "var(--gold-soft)",
        "temple-brown": "var(--temple-brown)",
        border: "var(--border)",
        success: "var(--success)",
        danger: "var(--danger)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lifted: "var(--shadow-lifted)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        base: "var(--transition-base)",
      },
      fontFamily: {
        sans: "var(--font-geist-sans, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)",
        mono: "var(--font-geist-mono, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace)",
      },
      maxWidth: {
        container: "var(--container-width)",
      },
      spacing: {
        gutter: "var(--page-gutter)",
      },
    },
  },
  plugins: [],
};

export default config;
