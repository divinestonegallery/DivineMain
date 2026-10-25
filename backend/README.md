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

The protected admin product-draft endpoint uses OpenAI. Set `OPENAI_API_KEY`
in the backend process environment (or the ignored backend `.env` for local
development); never expose it to the frontend. `OPENAI_MODEL` optionally
selects another compatible model and defaults to `gpt-4.1-mini`. Deployments
must provide this key to the admin API runtime for AI generation; manual
product creation remains available without it. Apply the product SEO schema
migration with `python manage.py migrate` during deployment.
