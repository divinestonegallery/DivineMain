from app.reviews.models import Review
from app.reviews.serializers.customer import CustomerReviewSerializer

class ReviewCustomerService:
    @staticmethod
    def get_product_reviews(product_id):
        # Only fetch approved/active reviews
        reviews = Review.objects.filter(product_id=product_id, is_approved=True).order_by('-created_at')
        serializer = CustomerReviewSerializer(reviews, many=True)
        return None, serializer.data

    @staticmethod
    def create_review(data, user):
        serializer = CustomerReviewSerializer(data=data)
        if serializer.is_valid():
            # In a real system, you'd link the review to the `user` object
            # Setting default status to pending (is_approved=False)
            review = serializer.save(is_approved=False)
            return None, CustomerReviewSerializer(review).data
        return str(serializer.errors), None
