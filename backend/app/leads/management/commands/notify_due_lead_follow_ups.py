from django.core.management.base import BaseCommand

from app.leads.services.follow_up_service import FollowUpService


class Command(BaseCommand):
    help = (
        'Create in-app reminders for open, assigned leads whose follow-up time is due. '
        'Safe to rerun: a reminder is stored once per follow-up timestamp and follow_up_at is kept. '
        'Schedule it with the existing host cron, for example every five minutes: '
        'python manage.py notify_due_lead_follow_ups. '
        'This repository does not register that schedule.'
    )

    def handle(self, *args, **options):
        sent = FollowUpService.notify_due()
        self.stdout.write(self.style.SUCCESS(f'Follow-up reminders sent: {sent}'))
