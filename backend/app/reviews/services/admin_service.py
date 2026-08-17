from app.reviews.repositories.review_repository import ReviewRepository
from app.reviews.serializers.admin import ReviewAdminSerializer

class ReviewAdminService:
    @staticmethod
    def create_review(data):
        try:
            serializer = ReviewAdminSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return None, serializer.data
            return serializer.errors, None
        except Exception as e:
            return str(e), None

    @staticmethod
    def get_all_reviews():
        try:
            reviews = ReviewRepository.get_all_reviews()
            data = ReviewAdminSerializer(reviews, many=True).data
            return None, data
        except Exception as e:
            return str(e), None
