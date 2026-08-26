<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Next.js B2C Architecture Rules

- **Server Components by Default**: Never add `"use client"` unless interactive state, event handlers, or browser APIs are strictly required. Keep client boundaries as leaf nodes.
- **Strict Backend Boundary**: The Next.js app is a UI layer. Never connect directly to databases or ORMs from Next.js. All data access must pass through the `api/` client layer.
- **Centralized API Client**: Use `api/client.ts` and feature modules (e.g., `api/products.ts`, `api/auth.ts`). Never make raw Axios/fetch calls inside presentation components.
- **Performance & Core Web Vitals**: Use `next/image`, `next/font`, and `next/link`. Eliminate request waterfalls with parallel fetching. Avoid shipping unnecessary client JavaScript.
- **Semantic HTML & Accessibility**: Every interactive element must be keyboard accessible with visible focus states.

