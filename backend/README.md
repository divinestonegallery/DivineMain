# Divine Stone Gallery API

The backend is a Django REST API. The frontend is a separate application in
`../frontend`.

## Local setup

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

The consumer process reads `.env.consumer`. Start the admin process with
`DEPLOYMENT_MODE=admin` so it reads `.env.admin`. Never commit either file.
See `../docs/mvp_backend.md` for endpoints, publishing rules, image uploads,
security and production operations.
