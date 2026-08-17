from django.conf import settings
from django.core.checks import Error, register


@register()
def production_configuration_check(app_configs, **kwargs):
    if settings.DEBUG or settings.IS_TESTING:
        return []
    errors = []
    secret = settings.SECRET_KEY.lower()
    if (
        # This literal is a rejected sentinel, never an accepted credential.
        settings.SECRET_KEY == 'default-insecure-key-for-dev'  # nosec B105
        or len(settings.SECRET_KEY) < 50
        or 'replace-with' in secret
        or 'insecure' in secret
    ):
        errors.append(Error('DJANGO_SECRET_KEY must be a random value of at least 50 characters.', id='divine.E001'))
    if not settings.CLERK_JWT_ISSUER:
        errors.append(Error('CLERK_JWT_ISSUER is required in production.', id='divine.E002'))
    if not settings.CLERK_SECRET_KEY:
        errors.append(Error('CLERK_SECRET_KEY is required for staff invitations.', id='divine.E003'))
    if not settings.CLERK_WEBHOOK_SECRET:
        errors.append(Error('CLERK_WEBHOOK_SECRET is required for customer synchronization.', id='divine.E004'))
    if not all((settings.R2_ENDPOINT, settings.R2_BUCKET_NAME, settings.R2_ACCESS_KEY_ID, settings.R2_SECRET_ACCESS_KEY, settings.R2_PUBLIC_BASE_URL)):
        errors.append(Error('All R2 settings are required in production.', id='divine.E005'))
    if '*' in settings.CORS_ALLOWED_ORIGINS:
        errors.append(Error('Wildcard CORS is forbidden in production.', id='divine.E006'))
    if not settings.SECURE_SSL_REDIRECT:
        errors.append(Error('HTTPS redirect must be enabled in production.', id='divine.E007'))
    if '*' in settings.ALLOWED_HOSTS:
        errors.append(Error('Wildcard ALLOWED_HOSTS is forbidden in production.', id='divine.E008'))
    if settings.CLERK_JWT_ISSUER and not settings.CLERK_JWT_ISSUER.startswith('https://'):
        errors.append(Error('CLERK_JWT_ISSUER must use HTTPS.', id='divine.E009'))
    if any(not origin.startswith('https://') for origin in settings.CORS_ALLOWED_ORIGINS):
        errors.append(Error('All production CORS origins must use HTTPS.', id='divine.E010'))
    if settings.R2_PUBLIC_BASE_URL and not settings.R2_PUBLIC_BASE_URL.startswith('https://'):
        errors.append(Error('R2_PUBLIC_BASE_URL must use HTTPS.', id='divine.E011'))
    if settings.DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql':
        errors.append(Error('Production DATABASE_URL must use PostgreSQL.', id='divine.E012'))
    if settings.SECURE_HSTS_SECONDS < 31536000:
        errors.append(Error('Production HSTS must be at least one year.', id='divine.E013'))
    if not settings.ADMIN_EMAILS:
        errors.append(Error('At least one owner email is required.', id='divine.E014'))
    if not settings.BACKUP_R2_BUCKET_NAME:
        errors.append(Error('BACKUP_R2_BUCKET_NAME is required.', id='divine.E015'))
    elif settings.BACKUP_R2_BUCKET_NAME == settings.R2_BUCKET_NAME:
        errors.append(Error('Database backups must use a separate private R2 bucket.', id='divine.E016'))
    return errors
