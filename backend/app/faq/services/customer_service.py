from collections import defaultdict
from app.faq.repositories.faq_repository import FAQRepository
from app.faq.serializers.customer import CustomerFAQSerializer

class FAQCustomerService:
    @staticmethod
    def get_active_faqs():
        faqs = FAQRepository.get_active_faqs()
        serializer = CustomerFAQSerializer(faqs, many=True)
        
        # Group by category
        grouped_faqs = defaultdict(list)
        for item in serializer.data:
            category = item.get('category') or 'General'
            grouped_faqs[category].append(item)
            
        return None, dict(grouped_faqs)
