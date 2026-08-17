FROM python:3.13-slim

WORKDIR /app

# Install PostgreSQL client dependencies and build tools
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput || true

EXPOSE 8080

CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 divine_main.wsgi:application
