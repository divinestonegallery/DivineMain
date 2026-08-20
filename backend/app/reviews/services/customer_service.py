from app.reviews.repositories.review_repository import ReviewRepository


class ReviewCustomerService:
    @staticmethod
    def get_product_reviews(product_id):
        return None, ReviewRepository.list_product_reviews(product_id)

    @staticmethod
    def create_review(data, user_id):
        return ReviewRepository.create(data, user_id)
