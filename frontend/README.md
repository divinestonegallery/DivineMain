# Divine Stone Gallery frontend

Two Next.js applications in this directory, deployed separately.

```text
frontend/
├── consumer/   storefront
├── admin/      gallery administration
└── shared/     brand tokens, transport, and the few components both apps use
```

```bash
cd consumer && pnpm dev
cd admin && pnpm dev
```

Each app has its own `.env.example`. Set `NEXT_PUBLIC_API_URL` to that app's backend. Consumer and admin point at different Django deployments.

Vercel project roots are `frontend/consumer` and `frontend/admin`. Enable "Include source files outside of the Root Directory" so the build can read `frontend/shared`.
