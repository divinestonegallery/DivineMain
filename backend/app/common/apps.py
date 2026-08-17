from django.apps import AppConfig


class CommonConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app.common'

    def ready(self):
        from app.common import checks  # noqa: F401
        from app.common import schema  # noqa: F401
