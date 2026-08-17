# Backend Architecture Guidelines

This document strictly defines the request lifecycle and layer responsibilities for the Django REST API. All endpoints must adhere to this structure to ensure business logic is decoupled from database operations.

## Request Lifecycle

The flow of an incoming API request must follow this exact sequence:

**`urls` -> `views` -> `validators` -> `services` -> `repositories` -> `serializers`**

---

## Layer Responsibilities

### 1. `urls`
- Responsible only for mapping an endpoint (e.g., `/api/v1/products/`) to a specific View function or class.
- Separated logically into `urls_customer.py` (for `/api/v1/`) and `urls_admin.py` (for `/api/admin/`).

### 2. `views`
- Responsible for HTTP interaction (request/response).
- Extracts parameters, headers, and body from the incoming request.
- Passes the raw data to the `validators` (for POST/PUT requests).
- Calls the appropriate `services` method to handle business logic.
- Formats the successful data or catches exceptions to return proper HTTP JSON responses (e.g., 200 OK, 400 Bad Request).
- **No business logic or database queries allowed.**

### 3. `validators`
- Validates the incoming request body data.
- Ensures required fields are present and data formats are correct.
- If validation fails, it raises an exception which the View catches.
- **No database queries allowed.**

### 4. `services`
- The core of the application. Contains **all business logic**.
- Coordinates operations (e.g., "if product is available, then process order").
- **CRITICAL RESTRICTION**: 
  - **No database queries or commits allowed.** 
  - **No ORM models allowed.** You cannot import or interact with Django ORM models here. All data must be passed as plain Python dictionaries or dataclasses.
- Calls methods in `repositories` to fetch or save data.

### 5. `repositories`
- The only layer allowed to interact directly with the database.
- Contains all Django ORM queries (e.g., `Model.objects.filter(...)`).
- Translates database operations into pure data.
- **CRITICAL RESTRICTION**: 
  - Cannot return Django ORM objects back to the `services` layer.
  - Must call the `serializers` layer to transform ORM objects into pure Python dictionaries/lists before returning the data.

### 6. `serializers`
- Responsible strictly for data transformation.
- Takes Django ORM model instances (provided by the `repository`) and converts them into JSON-serializable Python dictionaries.
- Called **only** by the `repositories` layer, never by the `views` layer.

---

## Standard Response Format

Instead of manually crafting dictionaries or relying on implicit DRF formatting, you must strictly use the custom `framework/core/responses.py` wrappers and return them via `framework.utils.get_response`.

This ensures all API endpoints output the strict `{"success": true, "message": "...", "data": ...}` schema.

### Standard View Pattern
```python
from framework.core.base_apiviews import ServiceAuthenticatedAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response
from rest_framework import status

class MyCustomView(ServiceAuthenticatedAPIView):
    def post(self, request):
        error, data = MyService.do_something(request.data)

        if error:
            # Renders: {"success": false, "message": "error msg", "data": null}
            return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))

        # Renders: {"success": true, "message": "Success", "data": {...}}
        return get_response(SuccessResponse(data=data, status_code=status.HTTP_200_OK))
```

All API views should inherit from one of the base views in `framework/core/base_apiviews.py` (e.g. `OpenAPIView`, `AuthenticatedAPIView`, `ServiceAuthenticatedAPIView`).

---

## Standard App Structure
Every domain-driven app (e.g., `products`, `reviews`, `contactus`) must have the following internal structure:

```text
app/[domain]/
├── repositories/
│   └── __init__.py
├── serializers/
│   └── __init__.py
├── services/
│   └── __init__.py
├── validators/
│   └── __init__.py
├── views/
│   └── __init__.py
├── urls_admin.py
└── urls_customer.py
```
