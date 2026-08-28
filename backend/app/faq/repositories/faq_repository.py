from django.db import IntegrityError, transaction

from app.faq.models import FAQ
from app.faq.serializers.admin import AdminFAQSerializer
from app.faq.serializers.customer import CustomerFAQSerializer


class FAQRepository:
    @staticmethod
    def get_all_faqs_list():
        return AdminFAQSerializer(FAQ.objects.all().order_by('display_order', '-created_at'), many=True).data

    @staticmethod
    def get_active_faqs():
        return CustomerFAQSerializer(
            FAQ.objects.filter(is_active=True).order_by('display_order', '-created_at'), many=True
        ).data

    @staticmethod
    def get_faq_by_id(faq_id):
        faq = FAQ.objects.filter(id=faq_id).first()
        return AdminFAQSerializer(faq).data if faq else None

    @staticmethod
    def create_faq(data):
        try:
            with transaction.atomic():
                faq = FAQ.objects.create(**data)
        except IntegrityError:
            return 'FAQ question must be unique.', None
        return None, AdminFAQSerializer(faq).data

    @staticmethod
    def update_faq(faq_id, data):
        faq = FAQ.objects.filter(id=faq_id).first()
        if not faq:
            return 'FAQ not found.', None
        for key, value in data.items():
            setattr(faq, key, value)
        try:
            with transaction.atomic():
                faq.save()
        except IntegrityError:
            return 'FAQ question must be unique.', None
        return None, AdminFAQSerializer(faq).data

    @staticmethod
    def deactivate_faq(faq_id):
        return bool(FAQ.objects.filter(id=faq_id).update(is_active=False))
