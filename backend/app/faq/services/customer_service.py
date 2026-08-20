from collections import defaultdict

from app.faq.repositories.faq_repository import FAQRepository


class FAQCustomerService:
    @staticmethod
    def get_active_faqs():
        grouped = defaultdict(list)
        for item in FAQRepository.get_active_faqs():
            grouped[item.get('category') or 'General'].append(item)
        return None, dict(grouped)
