import gzip
import os
import shutil
# pg_dump is invoked below without a shell or user-controlled flags.
import subprocess  # nosec B404
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from app.common.services.upload_service import UploadService


class Command(BaseCommand):
    help = 'Create a database backup and upload it to the private R2 bucket.'

    def add_arguments(self, parser):
        parser.add_argument('--local-output', help='Also copy the backup to this directory.')
        parser.add_argument('--skip-r2', action='store_true', help='Create only a local backup.')

    def handle(self, *args, **options):
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        with tempfile.TemporaryDirectory(prefix='divine-backup-') as temporary_directory:
            temporary = Path(temporary_directory)
            backup_path = self._create_backup(temporary, timestamp)

            local_output = options.get('local_output')
            if local_output:
                destination = Path(local_output).expanduser().resolve()
                destination.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backup_path, destination / backup_path.name)
                self.stdout.write(f'Local backup: {destination / backup_path.name}')

            if not options['skip_r2']:
                if not UploadService.r2_client_configured() or not settings.BACKUP_R2_BUCKET_NAME:
                    raise CommandError('R2 is not fully configured; use --skip-r2 for a local-only backup.')
                if settings.BACKUP_R2_BUCKET_NAME == settings.R2_BUCKET_NAME:
                    raise CommandError('Backups cannot be stored in the public media bucket.')
                object_key = f"{settings.BACKUP_R2_PREFIX.strip('/')}/{backup_path.name}"
                client = UploadService.get_s3_client()
                client.upload_file(
                    str(backup_path),
                    settings.BACKUP_R2_BUCKET_NAME,
                    object_key,
                    ExtraArgs={'ContentType': 'application/octet-stream'},
                )
                self._prune_old_backups(client)
                self.stdout.write(self.style.SUCCESS(f'Private R2 backup created: {object_key}'))
            elif not local_output:
                raise CommandError('--skip-r2 requires --local-output so the backup is preserved.')

    def _create_backup(self, temporary, timestamp):
        engine = connection.settings_dict['ENGINE']
        if engine.endswith('sqlite3'):
            source = Path(connection.settings_dict['NAME'])
            if str(source) == ':memory:' or not source.exists():
                raise CommandError('An in-memory SQLite database cannot be backed up.')
            target = temporary / f'divine-stone-gallery-{timestamp}.sqlite3.gz'
            with source.open('rb') as source_file, gzip.open(target, 'wb') as target_file:
                shutil.copyfileobj(source_file, target_file)
            return target

        database_url = os.getenv('DATABASE_URL', '')
        parsed = urlparse(database_url)
        if parsed.scheme not in {'postgres', 'postgresql'}:
            raise CommandError('DATABASE_URL must be PostgreSQL or SQLite.')
        target = temporary / f'divine-stone-gallery-{timestamp}.dump'
        environment = os.environ.copy()
        environment['PGPASSWORD'] = unquote(parsed.password or '')
        query = parse_qs(parsed.query)
        if query.get('sslmode'):
            environment['PGSSLMODE'] = query['sslmode'][-1]
        if query.get('channel_binding'):
            environment['PGCHANNELBINDING'] = query['channel_binding'][-1]
        command = [
            'pg_dump', '--format=custom', '--no-owner', '--no-acl',
            '--host', parsed.hostname or '', '--port', str(parsed.port or 5432),
            '--username', unquote(parsed.username or ''), '--file', str(target),
            unquote(parsed.path.lstrip('/')),
        ]
        try:
            # Fixed executable/flags; configuration values remain separate argv entries.
            subprocess.run(  # nosec B603
                command,
                env=environment,
                check=True,
                capture_output=True,
                timeout=900,
            )
        except FileNotFoundError as exc:
            raise CommandError('pg_dump is not installed on this server.') from exc
        except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
            raise CommandError('Database backup failed; inspect server logs.') from exc
        return target

    @staticmethod
    def _prune_old_backups(client):
        cutoff = datetime.now(timezone.utc) - timedelta(days=settings.BACKUP_RETENTION_DAYS)
        prefix = f"{settings.BACKUP_R2_PREFIX.strip('/')}/"
        paginator = client.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=settings.BACKUP_R2_BUCKET_NAME, Prefix=prefix):
            old = [
                {'Key': item['Key']}
                for item in page.get('Contents', [])
                if item.get('LastModified') and item['LastModified'] < cutoff
            ]
            if old:
                client.delete_objects(Bucket=settings.BACKUP_R2_BUCKET_NAME, Delete={'Objects': old, 'Quiet': True})
