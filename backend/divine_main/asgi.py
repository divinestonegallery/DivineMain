import os

from django.core.asgi import get_asgi_application

# DEPLOYMENT_MODE selects .env.consumer or .env.admin in divine_main.settings.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'divine_main.settings')

application = get_asgi_application()
