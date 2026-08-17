from app.faq.repositories.faq_repository import FAQRepository


class FAQAdminService:
    @staticmethod
    def get_all_faqs():
        return None, FAQRepository.get_all_faqs()

    @staticmethod
    def get_faq(faq_id):
        faq = FAQRepository.get_faq_by_id(faq_id)
        return (None, faq) if faq else ('FAQ not found.', None)

    @staticmethod
    def create_faq(data):
        if not data.get('question') or not data.get('answer'):
            return 'Question and answer are required.', None
        return FAQRepository.create_faq(data)

    @staticmethod
    def update_faq(faq_id, data):
        return FAQRepository.update_faq(faq_id, data)

    @staticmethod
    def delete_faq(faq_id):
        return (None, {'id': faq_id, 'deactivated': True}) if FAQRepository.deactivate_faq(faq_id) else ('FAQ not found.', None)
