from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from app.leads.services.failure_notification_service import LeadFailureNotificationService


class Command(BaseCommand):
    help = (
        'Retry operational emails for lead-creation failures that were not delivered. '
        'Pending, failed, and unconfigured alerts are sent once recipients and Resend '
        'are configured. A row already marked sent is left alone. '
        'Pass --prune to delete alerts older than LEAD_FAILURE_ALERT_RETENTION_DAYS '
        '(or --retention-days). This repository does not register a scheduler. '
        'Run it from the same host cron that calls the other operational commands, '
        'for example every five minutes: '
        'python manage.py retry_lead_failure_notifications'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=50,
            help='Maximum alerts to attempt on this run.',
        )
        parser.add_argument(
            '--prune',
            action='store_true',
            help='Delete failure alerts older than the retention period.',
        )
        parser.add_argument(
            '--retention-days',
            type=int,
            default=None,
            help='Retention used with --prune. Defaults to LEAD_FAILURE_ALERT_RETENTION_DAYS.',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        if limit < 1:
            raise CommandError('--limit must be at least 1.')
        summary = LeadFailureNotificationService.retry_pending(limit)
        pruned = 0
        if options['prune']:
            retention_days = options['retention_days']
            if retention_days is None:
                retention_days = settings.LEAD_FAILURE_ALERT_RETENTION_DAYS
            if retention_days < 1:
                raise CommandError('--retention-days must be at least 1.')
            pruned = LeadFailureNotificationService.prune(retention_days)
        reason = summary['reason'] or 'ok'
        self.stdout.write(self.style.SUCCESS(
            'Lead failure notifications: '
            f"sent={summary['sent']} failed={summary['failed']} "
            f"skipped={summary['skipped']} pruned={pruned} reason={reason}"
        ))
