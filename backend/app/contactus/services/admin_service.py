from app.contactus.repositories.contactus_repository import ContactUsRepository
from app.contactus.serializers.admin import ContactMessageAdminSerializer, CustomizeRequestAdminSerializer

class ContactUsAdminService:
    @staticmethod
    def get_contact_messages():
        try:
            messages = ContactUsRepository.get_all_contact_messages()
            data = ContactMessageAdminSerializer(messages, many=True).data
            return None, data
        except Exception as e:
            return str(e), None

    @staticmethod
    def get_customize_requests():
        try:
            requests = ContactUsRepository.get_all_customize_requests()
            data = CustomizeRequestAdminSerializer(requests, many=True).data
            return None, data
        except Exception as e:
            return str(e), None
