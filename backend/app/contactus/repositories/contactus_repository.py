from app.contactus.models import ContactMessage, CustomizeRequest

class ContactUsRepository:
    @staticmethod
    def get_all_contact_messages():
        return ContactMessage.objects.all().order_by('-created_at')

    @staticmethod
    def get_all_customize_requests():
        return CustomizeRequest.objects.all().select_related('user').order_by('-created_at')
