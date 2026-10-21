from django.utils import timezone

from app.leads.models import LeadNotification
from app.leads.serializers import LeadNotificationSerializer


def _paginate(queryset, page, page_size, serializer):
    total = queryset.count()
    start = (page - 1) * page_size
    return {
        'items': serializer(queryset[start:start + page_size], many=True).data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_items': total,
            'total_pages': (total + page_size - 1) // page_size if page_size else 0,
        },
    }


class NotificationRepository:
    @staticmethod
    def create_notification(recipient_id, lead_id, kind, title, message):
        notification = LeadNotification.objects.create(
            recipient_id=recipient_id,
            lead_id=lead_id,
            kind=kind,
            title=title,
            message=message,
        )
        notification = LeadNotification.objects.select_related('lead').get(pk=notification.pk)
        return LeadNotificationSerializer(notification).data

    @staticmethod
    def list_for_recipient(recipient_id, params):
        queryset = LeadNotification.objects.select_related('lead').filter(recipient_id=recipient_id)
        if params.get('unread'):
            queryset = queryset.filter(read_at__isnull=True)
        return _paginate(queryset, params['page'], params['page_size'], LeadNotificationSerializer)

    @staticmethod
    def mark_read(notification_id, recipient_id):
        notification = LeadNotification.objects.select_related('lead').filter(
            id=notification_id,
            recipient_id=recipient_id,
        ).first()
        if not notification:
            return None
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=['read_at', 'updated_at'])
        return LeadNotificationSerializer(notification).data
