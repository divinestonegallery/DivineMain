import os

from django.core.asgi import get_asgi_application

from dotenv import load_dotenv
load_dotenv()

# DEPLOYMENT_MODE (consumer|admin) is read by divine_main.settings.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'divine_main.settings')

application = get_asgi_application()
