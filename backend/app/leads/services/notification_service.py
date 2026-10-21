from app.leads.constants import NOTIFICATION_NOT_FOUND
from app.leads.repositories.notification_repository import NotificationRepository
from app.leads.services.access_service import AccessService
from app.leads.constants import LEADS_ACCESS


class NotificationService:
    @staticmethod
    def list_notifications(actor, params):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        return None, NotificationRepository.list_for_recipient(actor['id'], params)

    @staticmethod
    def mark_read(actor, notification_id):
        error = AccessService.require(actor, LEADS_ACCESS)
        if error:
            return error, None
        notification = NotificationRepository.mark_read(notification_id, actor['id'])
        if not notification:
            return NOTIFICATION_NOT_FOUND, None
        return None, notification
