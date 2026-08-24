import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env', override=False)


def csv_environment(name, default=""):
    return [value.strip() for value in os.getenv(name, default).split(",") if value.strip()]


def optional_environment(name):
    value = os.getenv(name, "").strip()
    if (
        not value
        or "your_" in value.lower()
        or "your-" in value.lower()
        or "replace-with" in value.lower()
        or "<" in value
    ):
        return ""
    return value

# Core settings
DEBUG = os.getenv('DEBUG', 'true').lower() == 'true'
IS_TESTING = 'test' in sys.argv
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'default-insecure-key-for-dev')
ALLOWED_HOSTS = csv_environment(
    'ALLOWED_HOSTS',
    'divinestonegallery.com,www.divinestonegallery.com,localhost,127.0.0.1',
)
APPEND_SLASH = False

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'drf_spectacular',
    'corsheaders',

    # V1 Business Domains
    'app.common',
    'app.accounts',
    'app.products',
    'app.reviews',
    'app.contactus',
    'app.faq',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'app.common.middlewares.logging_middleware.ObservabilityMiddleware',
]

ROOT_URLCONF = 'divine_main.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'divine_main.wsgi.application'

# Database Setup (Neon PostgreSQL)
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL', f"sqlite:///{BASE_DIR / 'db.sqlite3'}"),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'static'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Browser origins allowed to call this API.
CORS_ALLOWED_ORIGINS = csv_environment(
    'CORS_ALLOWED_ORIGINS',
    'https://divinestonegallery.com,https://www.divinestonegallery.com',
)
if DEBUG:
    for local_origin in ('http://localhost:3000', 'http://127.0.0.1:3000'):
        if local_origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(local_origin)

# DRF configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'app.common.authentication.ClerkAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'app.common.handlers.custom_exception_handler',
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'app.common.throttling.PersistentScopedRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('THROTTLE_ANON_RATE', '120/min'),
        'user': os.getenv('THROTTLE_USER_RATE', '300/min'),
        'reviews': os.getenv('THROTTLE_REVIEW_RATE', '5/hour'),
        'contact': os.getenv('THROTTLE_CONTACT_RATE', '5/hour'),
        'customization': os.getenv('THROTTLE_CUSTOMIZATION_RATE', '3/hour'),
        'uploads': os.getenv('THROTTLE_UPLOAD_RATE', '30/hour'),
        'clerk_webhook': os.getenv('THROTTLE_WEBHOOK_RATE', '300/min'),
        'auth': os.getenv('THROTTLE_AUTH_RATE', '30/min'),
    },
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Divine Stone Gallery API',
    'DESCRIPTION': 'Catalogue, enquiries and secure gallery administration API.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# Clerk authentication and authorization
CLERK_SECRET_KEY = optional_environment('CLERK_SECRET_KEY')
CLERK_WEBHOOK_SECRET = optional_environment('CLERK_WEBHOOK_SECRET')
CLERK_JWT_ISSUER = optional_environment('CLERK_JWT_ISSUER').rstrip('/')
CLERK_JWT_KEY = optional_environment('CLERK_JWT_KEY')
CLERK_JWT_AUDIENCE = optional_environment('CLERK_JWT_AUDIENCE')
CLERK_AUTHORIZED_PARTIES = set(csv_environment(
    'CLERK_AUTHORIZED_PARTIES',
    'https://divinestonegallery.com,https://www.divinestonegallery.com,http://localhost:3000,http://127.0.0.1:3000',
))
CLERK_JWKS_TIMEOUT_SECONDS = float(os.getenv('CLERK_JWKS_TIMEOUT_SECONDS', '5'))
CLERK_JWT_LEEWAY_SECONDS = int(os.getenv('CLERK_JWT_LEEWAY_SECONDS', '5'))
ADMIN_EMAILS = {
    email.lower()
    for email in csv_environment('ADMIN_EMAILS', 'divinestonegallery@gmail.com')
}
CLERK_INVITATION_REDIRECT_URL = os.getenv(
    'CLERK_INVITATION_REDIRECT_URL',
    'https://divinestonegallery.com/sign-up',
)

# Cloudflare R2
R2_ACCESS_KEY_ID = optional_environment('R2_ACCESS_KEY_ID')
R2_SECRET_ACCESS_KEY = optional_environment('R2_SECRET_ACCESS_KEY')
R2_BUCKET_NAME = optional_environment('R2_BUCKET_NAME')
R2_ENDPOINT = optional_environment('R2_ENDPOINT')
R2_PUBLIC_BASE_URL = optional_environment('R2_PUBLIC_BASE_URL')
R2_UPLOAD_URL_TTL_SECONDS = int(os.getenv('R2_UPLOAD_URL_TTL_SECONDS', '600'))
R2_UPLOAD_SESSION_TTL_MINUTES = int(os.getenv('R2_UPLOAD_SESSION_TTL_MINUTES', '30'))
R2_FINALIZATION_TTL_MINUTES = int(os.getenv('R2_FINALIZATION_TTL_MINUTES', '10'))
R2_MAX_IMAGE_BYTES = int(os.getenv('R2_MAX_IMAGE_BYTES', str(10 * 1024 * 1024)))
R2_MAX_PRODUCT_IMAGES = int(os.getenv('R2_MAX_PRODUCT_IMAGES', '12'))
R2_MIN_IMAGE_WIDTH = int(os.getenv('R2_MIN_IMAGE_WIDTH', '400'))
R2_MIN_IMAGE_HEIGHT = int(os.getenv('R2_MIN_IMAGE_HEIGHT', '400'))
R2_MAX_IMAGE_WIDTH = int(os.getenv('R2_MAX_IMAGE_WIDTH', '8000'))
R2_MAX_IMAGE_HEIGHT = int(os.getenv('R2_MAX_IMAGE_HEIGHT', '8000'))
R2_ALLOWED_IMAGE_TYPES = set(csv_environment(
    'R2_ALLOWED_IMAGE_TYPES',
    'image/jpeg,image/png,image/webp',
))
BACKUP_R2_PREFIX = os.getenv('BACKUP_R2_PREFIX', 'database-backups')
BACKUP_R2_BUCKET_NAME = optional_environment('BACKUP_R2_BUCKET_NAME')
BACKUP_RETENTION_DAYS = int(os.getenv('BACKUP_RETENTION_DAYS', '30'))
AUDIT_LOG_RETENTION_DAYS = int(os.getenv('AUDIT_LOG_RETENTION_DAYS', '365'))
ERROR_LOG_RETENTION_DAYS = int(os.getenv('ERROR_LOG_RETENTION_DAYS', '90'))
WEBHOOK_EVENT_RETENTION_DAYS = int(os.getenv('WEBHOOK_EVENT_RETENTION_DAYS', '30'))
UPLOAD_SESSION_RETENTION_DAYS = int(os.getenv('UPLOAD_SESSION_RETENTION_DAYS', '30'))

# Request and deployment security.
DATA_UPLOAD_MAX_MEMORY_SIZE = int(os.getenv('DATA_UPLOAD_MAX_MEMORY_SIZE', str(2 * 1024 * 1024)))
FILE_UPLOAD_MAX_MEMORY_SIZE = DATA_UPLOAD_MAX_MEMORY_SIZE
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = not DEBUG and os.getenv('SECURE_SSL_REDIRECT', 'true').lower() == 'true'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '0' if DEBUG else '31536000'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'divine-stone-gallery-api',
    }
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'structured': {
            'format': 'time={asctime} level={levelname} logger={name} message={message}',
            'style': '{',
        },
    },
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'structured'}},
    'root': {'handlers': ['console'], 'level': os.getenv('LOG_LEVEL', 'INFO')},
}

# Notification / Email
EMAIL_API_KEY = os.getenv('EMAIL_API_KEY')
