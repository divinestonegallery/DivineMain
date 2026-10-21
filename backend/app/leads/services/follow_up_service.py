from django.db import transaction
from django.utils import timezone

from app.leads.constants import NOTIFICATION_FOLLOW_UP_DUE
from app.leads.repositories.lead_repository import LeadRepository
from app.leads.repositories.notification_repository import NotificationRepository


class FollowUpService:
    """Send one in-app reminder per follow-up timestamp.

    A reminder is due when follow_up_at is in the past, the lead is still open,
    and someone is assigned. follow_up_notified_at is set equal to that
    follow_up_at inside the same transaction as the notification. Rerunning the
    command does not send another reminder until the follow-up time changes,
    which clears follow_up_notified_at. Unassigned leads are skipped.
    The command is not registered with a production scheduler in this repository.
    Run it from the same cron host that already calls the operational management
    commands, for example every five minutes:
    python manage.py notify_due_lead_follow_ups
    """

    @staticmethod
    def notify_due(now=None):
        moment = now or timezone.now()
        sent = 0
        for lead_id, assignee_id in LeadRepository.due_follow_up_ids(moment):
            with transaction.atomic():
                claimed = LeadRepository.claim_due_follow_up(lead_id, assignee_id, moment)
                if not claimed:
                    continue
                NotificationRepository.create_notification(
                    recipient_id=assignee_id,
                    lead_id=lead_id,
                    kind=NOTIFICATION_FOLLOW_UP_DUE,
                    title='Follow-up due',
                    message='A follow-up on one of your leads is due.',
                )
                sent += 1
        return sent
