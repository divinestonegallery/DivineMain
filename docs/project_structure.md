# Divine Stone Gallery project structure

This workspace is deliberately split into two independent applications:

```text
ANSHUL 2/
├── backend/                  Django REST API
│   ├── app/
│   │   ├── accounts/        Clerk customer sync and staff access
│   │   ├── applicationmodule/ Home-page aggregation and global search
│   │   ├── common/          Uploads, logs, health, security and operations
│   │   ├── contactus/       Contact and customization workflows
│   │   ├── faq/             FAQ administration and public delivery
│   │   ├── products/        Catalogue, taxonomies, variants and images
│   │   └── reviews/         Review submission and moderation
│   ├── divine_main/         Active Django settings, URLs, WSGI and ASGI
│   ├── framework/           Shared API views and response envelope
│   ├── Dockerfile
│   ├── manage.py
│   └── requirements.txt
├── frontend/                 Next.js application (kept separate)
└── docs/
    ├── backend_guidelines.md
    ├── mvp_backend.md
    └── project_structure.md
```

## Backend request lifecycle

Every business endpoint follows the mandatory lifecycle documented in
`backend_guidelines.md`:

```text
URL -> View -> Validator -> Service -> Repository -> Serializer
```

- Views handle HTTP only.
- Validators validate untrusted input without database access.
- Services own business rules and use plain data only.
- Repositories are the only layer using Django ORM.
- Repositories serialize ORM objects before returning them.

`backend/config/` is legacy compatibility code and is not referenced by the
active `manage.py`, WSGI, ASGI or root URL configuration. The active project
package is `backend/divine_main/`.
