# Backend MVP runbook

## Implemented domains

- Catalogue products with `draft`, `active` and `archived` states.
- Categories, materials and deities with case-insensitive duplicate protection.
- Product variants with unique SKU/name, price before GST, GST, stock,
  availability, sculpture dimensions, weight range and packed dimensions.
- Product images with R2 direct upload, actual-file verification, add, delete,
  reorder and one-cover-photo enforcement.
- Public product search, filtering, sorting and pagination.
- Clerk-only authentication, signed customer webhooks and replay protection.
- Admin/staff authorization and owner-only staff invitations/role management.
- Review submission, one-review-per-customer protection and moderation.
- FAQs, contact messages and customization-request workflows.
- Database-backed scoped throttling shared across workers, request IDs, staff audit
  logs and API error logs.
- Liveness/readiness endpoints and generated OpenAPI/Swagger documentation.
- PostgreSQL/SQLite backup command, R2 cleanup and retention commands.

## API entry points

All JSON business responses use:

```json
{"success": true, "message": "...", "data": {}}
```

### Public/customer

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Process liveness |
| GET | `/api/v1/health/ready` | Database readiness |
| GET | `/api/v1/products` | Filtered and paginated active products |
| GET | `/api/v1/products/{slug}` | Active product detail |
| GET | `/api/v1/products/categories` | Active categories |
| GET | `/api/v1/products/materials` | Active materials |
| GET | `/api/v1/products/deities` | Active deities |
| GET | `/api/v1/application/home` | Dynamic home blocks |
| GET | `/api/v1/application/search?q=...` | Global catalogue search |
| GET | `/api/v1/reviews/product/{product_id}` | Approved reviews |
| POST | `/api/v1/reviews` | Authenticated review submission |
| GET | `/api/v1/faqs` | Active FAQs grouped by category |
| POST | `/api/v1/contact/message` | Contact form |
| POST | `/api/v1/contact/customize` | Customization request |
| POST | `/api/v1/common/upload/customization-url` | Authenticated reference-image upload URL |

Product-list filters are `page`, `page_size`, `search`, `category`, `material`,
`deity`, `availability`, `min_price`, `max_price` and `sort`. Supported sorts
are `newest`, `oldest`, `featured`, `price_asc`, `price_desc` and
`display_order`.

### Staff/admin

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/admin/products` | List/create products |
| GET/PATCH/DELETE | `/api/admin/products/{id}` | Read/update/archive |
| GET/POST | `/api/admin/products/{id}/variants` | List/add variants |
| PATCH/DELETE | `/api/admin/products/{id}/variants/{variant_id}` | Update/delete variant |
| GET/POST | `/api/admin/products/{id}/images` | List/finalize an R2 image |
| PATCH/DELETE | `/api/admin/products/{id}/images/{image_id}` | Cover/alt/order update or delete |
| POST | `/api/admin/products/{id}/images/reorder` | Reorder every image atomically |
| GET/POST | `/api/admin/products/categories` | Category management |
| GET/POST | `/api/admin/products/materials` | Material management |
| GET/POST | `/api/admin/products/deities` | Deity management |
| GET/PATCH/DELETE | matching taxonomy `/{id}` paths | Read/update/deactivate |
| GET/PATCH/DELETE | `/api/admin/reviews` and `/{id}` | Review moderation |
| GET/POST/PATCH/DELETE | `/api/admin/faqs` and `/{id}` | FAQ management |
| GET/PATCH | `/api/admin/contact/message` and `/{id}` | Contact workflow |
| GET/PATCH | `/api/admin/contact/customize` and `/{id}` | Customization workflow |
| GET | `/api/admin/staff` | Owner-only staff list |
| POST | `/api/admin/staff` | Owner-only Clerk invitation |
| PATCH | `/api/admin/staff/{customer_id}` | Owner-only role/access update |
| POST | `/api/v1/common/upload/presigned-url` | Staff R2 upload URL |
| GET | `/api/v1/common/operations/audit-logs` | Staff activity log |
| GET | `/api/v1/common/operations/error-logs` | API server-error log |

The compatibility spelling `/dieties` remains routed, but all new clients
must use `/deities` and the `deity` request/filter name.

### Webhooks and docs

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/accounts/clerk` | Svix-verified Clerk customer sync |
| GET | `/api/schema` | OpenAPI schema |
| GET | `/api/docs` | Swagger UI |

## Product publishing contract

Create products as drafts. An `active` product must have active category,
material and deity records plus a cover image. A product with `buy_and_quote`
or `direct_purchase` must also retain at least one active variant containing:

1. Price before GST and GST rate (zero is accepted when legally appropriate).
2. Valid stock/availability combination.
3. Sculpture height, width and depth in inches.
4. Minimum weight in kilograms; maximum weight is optional.
5. Packed length, width and height in inches.

The service prevents publishing incomplete data and prevents later image or
variant changes that would make an active purchasable product invalid.

## Secure image workflow

1. Ask the backend for a presigned upload with `filename`, `content_type` and
   exact `file_size`.
2. Upload directly to the returned R2 URL using `PUT` and every returned
   required header.
3. Finalize using the returned `object_key` on the product-image endpoint, or
   submit it as `reference_object_key` with a customization request.

The finalizer performs an R2 `HEAD` and content read, verifies declared size
and MIME type, lets Pillow verify JPEG/PNG/WebP contents, enforces pixel limits,
binds the upload to its creator and atomically prevents reuse. Failed or
abandoned objects are deleted. Product-image deletion removes R2 first and
only then removes the database record.

Configure R2 CORS to allow `PUT`, `GET` and `HEAD` from the exact production
and local frontend origins, and allow the `Content-Type` and `Content-Length`
headers. Never expose the R2 secret key in the frontend.

## Clerk configuration

- Configure the issuer, backend secret, optional PEM JWT key, authorized
  parties and Svix webhook secret from `backend/.env.example`.
- Subscribe Clerk to `user.created`, `user.updated` and `user.deleted` at
  `/api/webhooks/accounts/clerk`.
- Staff invitations set backend-controlled `public_metadata.role`.
- Role changes update Clerk metadata before PostgreSQL, preventing a later
  webhook from restoring stale permissions.
- Deactivated local accounts are rejected immediately on every API call.

## Operations

Run migrations once during each release:

```bash
python manage.py migrate --noinput
```

Schedule these commands with the deployment platform:

```bash
# Daily; writes to a separate private R2 bucket.
python manage.py backup_database

# Every 15-30 minutes; removes abandoned direct uploads.
python manage.py cleanup_uploads --limit 500

# Daily; applies log, webhook and session retention settings.
python manage.py cleanup_operational_data
```

For a local-only backup:

```bash
python manage.py backup_database --skip-r2 --local-output ./backups
```

`BACKUP_R2_BUCKET_NAME` must be a private bucket and must never equal the
public `R2_BUCKET_NAME` used by product media. Test restoration regularly;
a backup is not proven until it has been restored successfully.

## Production gates

With `DEBUG=false`, Django system checks reject weak secrets, missing Clerk or
R2 configuration, wildcard hosts/CORS, non-HTTPS origins, SQLite, disabled
HTTPS/HSTS, a missing owner allowlist and an unsafe backup bucket. The Docker
image runs as a non-root user with bounded Gunicorn timeouts and request
recycling.

Before release:

```bash
python manage.py check --deploy
python manage.py makemigrations --check --dry-run
python manage.py test
python manage.py spectacular --file schema.yml --validate
```
