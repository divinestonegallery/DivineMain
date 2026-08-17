from datetime import timedelta

from django.utils import timezone

from app.contactus.models import ContactMessage, CustomizeRequest
from app.contactus.serializers.admin import ContactMessageAdminSerializer, CustomizeRequestAdminSerializer
from app.contactus.serializers.customer import ContactMessageCustomerSerializer, CustomizeRequestCustomerSerializer


def _paginate(queryset, params, serializer):
    total = queryset.count()
    start = (params['page'] - 1) * params['page_size']
    return {
        'items': serializer(queryset[start:start + params['page_size']], many=True).data,
        'pagination': {
            'page': params['page'], 'page_size': params['page_size'],
            'total_items': total,
            'total_pages': (total + params['page_size'] - 1) // params['page_size'],
        },
    }


class ContactUsRepository:
    @staticmethod
    def list_contact_messages(params):
        queryset = ContactMessage.objects.all().order_by('-created_at')
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        return _paginate(queryset, params, ContactMessageAdminSerializer)

    @staticmethod
    def list_customize_requests(params):
        queryset = CustomizeRequest.objects.select_related('user').order_by('-created_at')
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        return _paginate(queryset, params, CustomizeRequestAdminSerializer)

    @staticmethod
    def recent_contact_duplicate(email, message):
        return ContactMessage.objects.filter(
            email__iexact=email,
            message=message,
            created_at__gte=timezone.now() - timedelta(minutes=10),
        ).exists()

    @staticmethod
    def recent_customize_duplicate(data):
        filters = {
            'city__iexact': data['city'],
            'description': data.get('description'),
            'approximate_height': data.get('approximate_height'),
            'preferred_material': data.get('preferred_material'),
            'created_at__gte': timezone.now() - timedelta(minutes=10),
        }
        email = data.get('email')
        phone = data.get('phone')
        if email:
            filters['email__iexact'] = email
        elif phone:
            filters['phone'] = phone
        return CustomizeRequest.objects.filter(**filters).exists()

    @staticmethod
    def create_contact(data):
        item = ContactMessage.objects.create(**data)
        return ContactMessageCustomerSerializer(item).data

    @staticmethod
    def create_customize(data, user_id=None):
        item = CustomizeRequest.objects.create(user_id=user_id, **data)
        return CustomizeRequestCustomerSerializer(item).data

    @staticmethod
    def get_contact(message_id):
        item = ContactMessage.objects.filter(id=message_id).first()
        return ContactMessageAdminSerializer(item).data if item else None

    @staticmethod
    def get_customize(request_id):
        item = CustomizeRequest.objects.select_related('user').filter(id=request_id).first()
        return CustomizeRequestAdminSerializer(item).data if item else None

    @staticmethod
    def update_contact_status(message_id, status):
        item = ContactMessage.objects.filter(id=message_id).first()
        if not item:
            return None
        item.status = status
        item.save(update_fields=['status', 'updated_at'])
        return ContactMessageAdminSerializer(item).data

    @staticmethod
    def update_customize_status(request_id, status):
        item = CustomizeRequest.objects.select_related('user').filter(id=request_id).first()
        if not item:
            return None
        item.status = status
        item.save(update_fields=['status', 'updated_at'])
        return CustomizeRequestAdminSerializer(item).data
