from django.core.cache import cache

from app.applicationmodule.constants import HOME_CACHE_KEY
from app.reviews.repositories.review_repository import ReviewRepository


class ReviewAdminService:
    @staticmethod
    def list_reviews(params):
        return None, ReviewRepository.list_admin(params)

    @staticmethod
    def update_status(review_id, review_status):
        review = ReviewRepository.update_status(review_id, review_status)
        if not review:
            return 'Review not found.', None
        cache.delete(HOME_CACHE_KEY)
        return None, review

    @staticmethod
    def delete(review_id):
        if not ReviewRepository.delete(review_id):
            return 'Review not found.', None
        cache.delete(HOME_CACHE_KEY)
        return None, {'id': review_id, 'deleted': True}
