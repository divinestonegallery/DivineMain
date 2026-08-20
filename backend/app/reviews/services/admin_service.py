from app.reviews.repositories.review_repository import ReviewRepository


class ReviewAdminService:
    @staticmethod
    def list_reviews(params):
        return None, ReviewRepository.list_admin(params)

    @staticmethod
    def update_status(review_id, review_status):
        review = ReviewRepository.update_status(review_id, review_status)
        return (None, review) if review else ('Review not found.', None)

    @staticmethod
    def delete(review_id):
        return (None, {'id': review_id, 'deleted': True}) if ReviewRepository.delete(review_id) else ('Review not found.', None)
