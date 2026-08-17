from app.reviews.models import Review

class ReviewRepository:
    @staticmethod
    def get_all_reviews():
        return Review.objects.all().select_related('product', 'user').order_by('-created_at')

    @staticmethod
    def get_review_by_id(review_id):
        return Review.objects.filter(id=review_id).first()

    @staticmethod
    def get_approved_reviews(limit=10):
        return Review.objects.filter(is_approved=True).select_related('product', 'user').order_by('-created_at')[:limit]
