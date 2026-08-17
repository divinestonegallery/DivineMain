FROM python:3.12-slim

WORKDIR /app

# Install PostgreSQL client dependencies and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    postgresql-client \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput \
    && addgroup --system django \
    && adduser --system --ingroup django django \
    && chown -R django:django /app

USER django

EXPOSE 8080
ENV PORT=8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os,urllib.request; url='http://127.0.0.1:%s/api/v1/health' % os.environ.get('PORT', '8080'); urllib.request.urlopen(urllib.request.Request(url, headers={'X-Forwarded-Proto':'https'}), timeout=3)"

CMD exec gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 60 --graceful-timeout 30 --max-requests 1000 --max-requests-jitter 100 --access-logfile - --error-logfile - divine_main.wsgi:application
