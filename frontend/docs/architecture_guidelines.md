# Frontend Architecture & Developer Guidelines

Welcome to the Next.js frontend project! This document outlines our custom folder structure, the purpose of each directory, and the strict conventions all team members must follow when creating new files, components, and routes.

---

## 1. Directory Overview

At the root of the `frontend` directory, we have the following core folders:

```text
frontend/
├── api/          # Client-side API and service integration logic
├── app/          # Next.js App Router (all application routes & pages)
├── components/   # Route-specific UI components
├── docs/         # Frontend-specific documentation and guidelines
├── public/       # Static assets (fonts, images, videos)
└── src/          # Shared utilities, hooks, types, and generic source code
```

---

## 2. Folder Rules & Constraints

### 📁 `app/` (Routing)
**Purpose**: This is the Next.js App Router directory. It **strictly** dictates the URLs of our application. 
**Rules**:
- **Only** routing files should live here (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`).
- **Do NOT** put UI components here. UI components must go in the `components/` folder.
- *Example*: To create a `/dashboard` route, you create `app/dashboard/page.tsx`. 

### 📁 `components/` (UI Components)
**Purpose**: Houses all React components. We organize this folder **route-wise** to keep related components together.
**Rules**:
- Create a subfolder for each major route or feature (e.g., `components/Home/`, `components/Admin/`, `components/Products/`).
- Shared/global components (like buttons, navbars, modals used across multiple routes) should go in a `components/common/` or `components/ui/` folder.
- **Do NOT** put business logic or API calls directly inside UI components if they can be extracted to `api/` or `src/hooks/`.
- *Example*: The hero section for the Home page goes in `components/Home/HeroSection.tsx`.

### 📁 `api/` (Services & API Calls)
**Purpose**: Contains all client-side logic for communicating with the backend/external APIs.
**Rules**:
- Group API calls logically by domain (e.g., `auth.ts`, `products.ts`, `users.ts`).
- **Do NOT** use `.tsx` here, as these files should only contain TypeScript/JavaScript logic (no JSX).
- *Example*: Login, registration, and token refresh logic belongs in `api/auth.ts`.

### 📁 `public/` (Static Assets)
**Purpose**: Publicly accessible static files that don't need webpack/Turbopack processing.
**Rules**:
- Categorize assets into subfolders: `public/fonts/`, `public/images/`, `public/videos/`.
- Reference these files in code using absolute paths starting from the root (e.g., `<img src="/images/logo.png" />`).

### 📁 `src/` (Global Utilities)
**Purpose**: A catch-all for shared frontend logic that doesn't fit into components or API calls.
**Rules**:
- Suggested subdirectories: `src/hooks/` (custom React hooks), `src/utils/` (helper functions, formatting), `src/types/` (TypeScript interfaces), `src/context/` (React Context providers).
- Keep functions pure and highly reusable.

---

## 3. Workflow Example: Creating a New Feature

**Scenario**: You are assigned to build a new "User Profile" page (`/profile`).

1. **Create the Route**:
   - Make a folder `app/profile/`.
   - Create `app/profile/page.tsx`. This file will serve as the entry point and layout assembler for the page.

2. **Create the Components**:
   - Make a folder `components/Profile/`.
   - Create `components/Profile/ProfileHeader.tsx`, `components/Profile/UserSettings.tsx`, etc.
   - Import and use these components inside `app/profile/page.tsx`.

3. **Create the API Service**:
   - If the profile needs to fetch user data, create or update `api/users.ts`.
   - Add a function `export const fetchUserProfile = async (userId: string) => { ... }`.

4. **Use Assets**:
   - If there is a default avatar image, place it in `public/images/default-avatar.png`.

By adhering strictly to these constraints, we ensure the codebase remains highly predictable, modular, and easy to navigate as the project scales.
