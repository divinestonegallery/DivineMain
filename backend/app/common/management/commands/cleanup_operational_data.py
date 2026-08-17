from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from app.common.repositories import OperationsRepository


class Command(BaseCommand):
    help = 'Apply configured retention periods to operational logs and completed event records.'

    def handle(self, *args, **options):
        now = timezone.now()
        deleted = OperationsRepository.cleanup_retained_data(
            audit_cutoff=now - timedelta(days=settings.AUDIT_LOG_RETENTION_DAYS),
            error_cutoff=now - timedelta(days=settings.ERROR_LOG_RETENTION_DAYS),
            webhook_cutoff=now - timedelta(days=settings.WEBHOOK_EVENT_RETENTION_DAYS),
            upload_cutoff=now - timedelta(days=settings.UPLOAD_SESSION_RETENTION_DAYS),
        )
        summary = ', '.join(f'{name}={count}' for name, count in deleted.items())
        self.stdout.write(self.style.SUCCESS(f'Operational cleanup complete: {summary}'))
