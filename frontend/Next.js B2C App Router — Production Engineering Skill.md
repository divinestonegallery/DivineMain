# Next.js B2C App Router — Modular Engineering Skills Index

This document summarizes the modular skills and always-on architectural rules extracted from the Next.js Production Engineering guidelines.

Instead of injecting one monolithic file into every conversation turn, Antigravity uses **Progressive Disclosure**:
- **Always-On Rules** (`.agents/rules/nextjs-core-architecture.md` and `frontend/AGENTS.md`) define the universal architecture, boundaries, and definition of done.
- **Specialized Skills** (`.agents/skills/<skill_name>/SKILL.md`) are activated dynamically **one by one** based on the specific requirements of the user's prompt.

---

## Always-On Core Rules

- **Location**: [`.agents/rules/nextjs-core-architecture.md`](file:///Users/sachin/DivineMain/.agents/rules/nextjs-core-architecture.md) & [`frontend/AGENTS.md`](file:///Users/sachin/DivineMain/frontend/AGENTS.md)
- **Scope**: Always active across the entire Next.js workspace.
- **Includes**:
  - Core Engineering Principles (Correctness > Security > Performance > Accessibility > Maintainability).
  - App Router Directory Structure (`app/`, `components/`, `api/`, `public/`).
  - Strict Architectural Boundary (Next.js is purely a UI client; all DB access, ORMs, and core business rules belong to the dedicated backend; frontend communicates via the centralized `api/` layer).
  - Golden Rule & Definition of Done.

---

## Modular Skills Directory

| Skill Name | Location | Activation Trigger / Usage |
|---|---|---|
| **`nextjs-rsc-boundaries`** | [`.agents/skills/nextjs-rsc-boundaries/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-rsc-boundaries/SKILL.md) | Use when deciding or refactoring React Server Component (RSC) and Client Component boundaries, adding interactive UI, reducing client JavaScript bundle size, or using dynamic imports. |
| **`nextjs-data-fetching-api`** | [`.agents/skills/nextjs-data-fetching-api/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-data-fetching-api/SKILL.md) | Use when implementing data fetching, creating or modifying API client modules, integrating Next.js with backend endpoints, handling route handlers, or preventing request waterfalls. |
| **`nextjs-caching-revalidation`** | [`.agents/skills/nextjs-caching-revalidation/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-caching-revalidation/SKILL.md) | Use when configuring caching, data revalidation, tag invalidation, or handling cache updates after mutations and server actions. |
| **`nextjs-server-actions-forms`** | [`.agents/skills/nextjs-server-actions-forms/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-server-actions-forms/SKILL.md) | Use when creating Server Actions, building forms, handling form submissions, implementing server-side validation, or creating optimistic UI updates. |
| **`nextjs-performance-web-vitals`** | [`.agents/skills/nextjs-performance-web-vitals/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-performance-web-vitals/SKILL.md) | Use when optimizing page speed, Core Web Vitals, image and font loading, internal navigation, mobile performance, or analyzing performance anti-patterns. |
| **`nextjs-auth-security`** | [`.agents/skills/nextjs-auth-security/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-auth-security/SKILL.md) | Use when implementing authentication, route protection, authorization checks, managing environment variables, or writing security-sensitive middleware. |
| **`nextjs-seo-metadata`** | [`.agents/skills/nextjs-seo-metadata/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-seo-metadata/SKILL.md) | Use when implementing SEO metadata, Open Graph tags, canonical links, sitemaps, URL search parameters, filters, or paginated listings. |
| **`nextjs-accessibility-ux`** | [`.agents/skills/nextjs-accessibility-ux/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-accessibility-ux/SKILL.md) | Use when implementing accessible UI, semantic markup, keyboard interactions, loading skeletons, error boundaries, or not-found states. |
| **`nextjs-testing-quality`** | [`.agents/skills/nextjs-testing-quality/SKILL.md`](file:///Users/sachin/DivineMain/.agents/skills/nextjs-testing-quality/SKILL.md) | Use when writing tests (unit, integration, E2E), enforcing strict TypeScript types, reviewing code quality, or evaluating third-party dependencies. |

---

## How Skills Are Invoked
The agent will read the YAML frontmatter descriptions and automatically activate **only the single relevant skill** matching your specific task, saving context tokens and ensuring laser-focused execution.