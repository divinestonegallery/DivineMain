# Divine Stone Gallery API

The backend is a Django REST API. The frontend is a separate application in
`../frontend`.

## Local setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Fill real local Clerk/PostgreSQL/R2 values in `.env`; never commit `.env`.
See `../docs/mvp_backend.md` for endpoints, publishing rules, image uploads,
security and production operations.
