from django.core.management.base import BaseCommand

from app.common.services.upload_service import UploadService


class Command(BaseCommand):
    help = 'Delete expired, unattached R2 uploads and mark their sessions deleted.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=500)

    def handle(self, *args, **options):
        deleted = UploadService.cleanup_expired(limit=max(1, min(options['limit'], 5000)))
        self.stdout.write(self.style.SUCCESS(f'Cleaned {deleted} expired upload(s).'))
