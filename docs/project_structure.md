# Project Architecture and Structure

This document provides a high-level overview of the complete file and code structure of the project.

## Code Structure

The project is divided into two main components: a **Django Backend** and a **Next.js Frontend (App Router)**.

### Backend (Django)
The backend is structured using Django apps, following a modular, domain-driven design pattern. Some apps appear to be structured traditionally (models/views/tests), while others utilize a more robust service-repository pattern.

*   **Core / Config Modules**:
    *   `config/`, `divine_main/`: Project settings, WSGI/ASGI configurations, and primary URL routing.
    *   `common/`: Shared utilities, decorators, middlewares (exception/logging), and common handlers.
    *   `framework/`: Core authentication and response middlewares.
*   **Traditional Django Apps**: 
    *   `accounts/`, `bookings/`, `contact/`, `dashboard/`, `products/`, `reviews/`: Follow the standard Django structure (`models.py`, `views.py`, `admin.py`, `tests.py`).
*   **Domain-Driven Apps**:
    *   `catalog/`, `customer/`, `module/`, `order/`, `payment/`, `pricing/`, `review/`: These apps encapsulate specific business domains and follow a layered architecture:
        *   `models.py`: Data layer.
        *   `repositories/`: Database abstraction layer.
        *   `services/`: Business logic layer.
        *   `views/` & `serializers/`: Presentation and data validation layer (typically using Django REST Framework).
*   **Infrastructure**:
    *   `Dockerfile` and `docker-compose.yml`: Containerization and orchestration configurations.
    *   `requirements.txt`: Python dependencies.
    *   `manage.py`: Django command-line utility.

### Frontend (Next.js App Router)
The frontend is a React application built with Next.js using the modern App Router architecture, customized with a strict directory structure.

*   **Configuration**: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `package.json`.
*   **Directories**:
    *   `app/`: Next.js App Router directory. Contains all page routes (`page.tsx`) and layouts (`layout.tsx`).
    *   `components/`: Reusable React components organized into route-wise subfolders (e.g., `components/Home/`).
    *   `api/`: Client-side API services and business logic (e.g., `api/auth.ts`).
    *   `public/`: Static assets like fonts, images, and videos.
    *   `src/`: Shared utilities, hooks, types, and generic source code.
    *   `docs/`: Contains frontend-specific documentation (e.g., `architecture_guidelines.md`).

## File Structure

```text
.
├── backend
│   ├── Integration
│   │   ├── communication
│   │   │   └── __init__.py
│   │   ├── payment
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── accounts
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── applicationmodules
│   │   ├── admin_app
│   │   │   └── __init__.py
│   │   ├── customer_app
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── bookings
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── catalog
│   │   ├── repositories
│   │   │   └── __init__.py
│   │   ├── serializers
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   └── __init__.py
│   │   ├── views
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── models.py
│   ├── common
│   │   ├── configs
│   │   │   └── __init__.py
│   │   ├── decorators
│   │   │   └── __init__.py
│   │   ├── middlewares
│   │   │   ├── __init__.py
│   │   │   ├── exception_middleware.py
│   │   │   └── logging_middleware.py
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── utils
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── handlers.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   ├── urls.py
│   │   └── views.py
│   ├── config
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── mongo.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── contact
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── customer
│   │   ├── repositories
│   │   │   └── __init__.py
│   │   ├── serializers
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   └── __init__.py
│   │   ├── views
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── models.py
│   ├── dashboard
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── divine_main
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── views.py
│   │   └── wsgi.py
│   ├── framework
│   │   ├── auth
│   │   │   └── __init__.py
│   │   ├── core
│   │   │   └── __init__.py
│   │   ├── middlewares
│   │   │   ├── __init__.py
│   │   │   └── response_middleware.py
│   │   └── __init__.py
│   ├── media
│   ├── module
│   │   ├── repositories
│   │   └── services
│   ├── order
│   │   ├── repositories
│   │   │   └── __init__.py
│   │   ├── serializers
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   └── __init__.py
│   │   ├── views
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── models.py
│   ├── payment
│   │   ├── repositories
│   │   │   └── __init__.py
│   │   ├── serializers
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   └── __init__.py
│   │   ├── views
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── models.py
│   ├── pricing
│   │   ├── repositories
│   │   │   └── __init__.py
│   │   ├── serializers
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   └── __init__.py
│   │   ├── views
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── models.py
│   ├── products
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── constants.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── review
│   │   ├── repositories
│   │   │   └── __init__.py
│   │   ├── serializers
│   │   │   └── __init__.py
│   │   ├── services
│   │   │   └── __init__.py
│   │   ├── views
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── models.py
│   ├── reviews
│   │   ├── migrations
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── tests.py
│   │   └── views.py
│   ├── static
│   ├── Dockerfile
│   ├── db.sqlite3
│   ├── docker-compose.yml
│   ├── manage.py
│   └── requirements.txt
├── docs
│   └── project_structure.md
└── frontend
    ├── api
    │   └── auth.ts
    ├── app
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.module.css
    │   └── page.tsx
    ├── docs
    │   └── architecture_guidelines.md
    ├── public
    │   ├── file.svg
    │   ├── globe.svg
    │   ├── next.svg
    │   ├── vercel.svg
    │   └── window.svg
    ├── AGENTS.md
    ├── CLAUDE.md
    ├── README.md
    ├── eslint.config.mjs
    ├── next-env.d.ts
    ├── next.config.ts
    ├── package-lock.json
    ├── package.json
    └── tsconfig.json
```

