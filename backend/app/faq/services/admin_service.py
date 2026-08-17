from app.faq.repositories.faq_repository import FAQRepository
from app.faq.serializers.admin import AdminFAQSerializer

class FAQAdminService:
    @staticmethod
    def get_all_faqs():
        faqs = FAQRepository.get_all_faqs()
        serializer = AdminFAQSerializer(faqs, many=True)
        return None, serializer.data

    @staticmethod
    def get_faq(faq_id):
        faq = FAQRepository.get_faq_by_id(faq_id)
        if not faq:
            return "FAQ not found", None
        serializer = AdminFAQSerializer(faq)
        return None, serializer.data

    @staticmethod
    def create_faq(data):
        serializer = AdminFAQSerializer(data=data)
        if serializer.is_valid():
            faq = FAQRepository.create_faq(serializer.validated_data)
            return None, AdminFAQSerializer(faq).data
        return str(serializer.errors), None

    @staticmethod
    def update_faq(faq_id, data):
        faq = FAQRepository.get_faq_by_id(faq_id)
        if not faq:
            return "FAQ not found", None
            
        serializer = AdminFAQSerializer(faq, data=data, partial=True)
        if serializer.is_valid():
            faq = FAQRepository.update_faq(faq, serializer.validated_data)
            return None, AdminFAQSerializer(faq).data
        return str(serializer.errors), None

    @staticmethod
    def delete_faq(faq_id):
        faq = FAQRepository.get_faq_by_id(faq_id)
        if not faq:
            return "FAQ not found", None
            
        FAQRepository.delete_faq(faq)
        return None, {"deleted": True}
