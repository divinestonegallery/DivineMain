from app.faq.models import FAQ

class FAQRepository:
    @staticmethod
    def get_all_faqs():
        return FAQ.objects.all().order_by('display_order', '-created_at')

    @staticmethod
    def get_active_faqs():
        return FAQ.objects.filter(is_active=True).order_by('display_order', '-created_at')

    @staticmethod
    def get_faq_by_id(faq_id):
        return FAQ.objects.filter(id=faq_id).first()

    @staticmethod
    def create_faq(data):
        return FAQ.objects.create(**data)

    @staticmethod
    def update_faq(faq, data):
        for key, value in data.items():
            setattr(faq, key, value)
        faq.save()
        return faq

    @staticmethod
    def delete_faq(faq):
        faq.delete()
        return True
