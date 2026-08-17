from app.reviews.models import Review
from app.reviews.serializers.admin import ReviewAdminSerializer
from app.reviews.serializers.customer import CustomerReviewSerializer
from django.db import IntegrityError, transaction
from app.products.models import Product

class ReviewRepository:
    @staticmethod
    def list_admin(params):
        queryset = Review.objects.all().select_related('product', 'user').order_by('-created_at')
        if params.get('status'):
            queryset = queryset.filter(status=params['status'])
        total = queryset.count()
        start = (params['page'] - 1) * params['page_size']
        return {
            'items': ReviewAdminSerializer(queryset[start:start + params['page_size']], many=True).data,
            'pagination': {
                'page': params['page'], 'page_size': params['page_size'],
                'total_items': total,
                'total_pages': (total + params['page_size'] - 1) // params['page_size'],
            },
        }

    @staticmethod
    def get_review_by_id(review_id):
        review = Review.objects.select_related('product', 'user').filter(id=review_id).first()
        return ReviewAdminSerializer(review).data if review else None

    @staticmethod
    def get_approved_reviews(limit=10):
        reviews = Review.objects.filter(status=Review.Status.APPROVED).select_related('product', 'user').order_by('-created_at')[:limit]
        return CustomerReviewSerializer(reviews, many=True).data

    @staticmethod
    def list_product_reviews(product_id):
        reviews = Review.objects.filter(
            product_id=product_id,
            status=Review.Status.APPROVED,
            product__status='active',
        ).order_by('-created_at')
        return CustomerReviewSerializer(reviews, many=True).data

    @staticmethod
    def create(data, user_id):
        if not Product.objects.filter(id=data.get('product'), status=Product.Status.ACTIVE, is_active=True).exists():
            return 'Product not found or is not available for review.', None
        payload = {**data, 'product_id': data['product']}
        payload.pop('product')
        try:
            with transaction.atomic():
                review = Review.objects.create(
                    user_id=user_id,
                    status=Review.Status.PENDING,
                    is_approved=False,
                    **payload,
                )
        except IntegrityError:
            return 'You have already reviewed this product.', None
        return None, CustomerReviewSerializer(review).data

    @staticmethod
    def update_status(review_id, review_status):
        review = Review.objects.filter(id=review_id).first()
        if not review:
            return None
        review.status = review_status
        review.is_approved = review_status == Review.Status.APPROVED
        review.save(update_fields=['status', 'is_approved', 'updated_at'])
        return ReviewAdminSerializer(Review.objects.select_related('product', 'user').get(id=review.id)).data

    @staticmethod
    def delete(review_id):
        deleted, _ = Review.objects.filter(id=review_id).delete()
        return bool(deleted)
