import logging

from app.applicationmodule.constants import (
    HOME_PAGE_CATEGORIES_BLOCK,
    HOME_PAGE_CATEGORIES_BLOCK_TITLE,
    HOME_PAGE_DREAM_MOORTI_BLOCK,
    HOME_PAGE_DREAM_MOORTI_BLOCK_TITLE,
    HOME_PAGE_DREAM_TEMPLES_BLOCK,
    HOME_PAGE_DREAM_TEMPLES_BLOCK_TITLE,
    HOME_PAGE_HOME_DECORS_BLOCK,
    HOME_PAGE_HOME_DECORS_BLOCK_TITLE,
    HOME_PAGE_POPULAR_MOORTI_BLOCK,
    HOME_PAGE_POPULAR_MOORTI_BLOCK_TITLE,
    HOME_PAGE_REVIEWS_BLOCK,
    HOME_PAGE_REVIEWS_BLOCK_TITLE,
)
from app.products.repositories.product_repository import CategoryRepository, ProductRepository
from app.reviews.repositories.review_repository import ReviewRepository

logger = logging.getLogger(__name__)


class HomeService:
    @staticmethod
    def get_home_blocks():
        return [
            HOME_PAGE_POPULAR_MOORTI_BLOCK,
            HOME_PAGE_DREAM_MOORTI_BLOCK,
            HOME_PAGE_DREAM_TEMPLES_BLOCK,
            HOME_PAGE_CATEGORIES_BLOCK,
            HOME_PAGE_HOME_DECORS_BLOCK,
            HOME_PAGE_REVIEWS_BLOCK,
        ]

    @staticmethod
    def get_home():
        try:
            _, popular = ProductRepository.get_popular_moorti_data()
            _, temples = ProductRepository.get_dream_temples_data()
            _, categories = CategoryRepository.get_active()
            _, decor = ProductRepository.get_home_decors_data()
            blocks = [
                {'type': HOME_PAGE_POPULAR_MOORTI_BLOCK, 'data': {'title': HOME_PAGE_POPULAR_MOORTI_BLOCK_TITLE, 'products': popular}},
                {'type': HOME_PAGE_DREAM_MOORTI_BLOCK, 'data': {'title': HOME_PAGE_DREAM_MOORTI_BLOCK_TITLE, 'deities': ProductRepository.get_top_products_by_diety(5)}},
                {'type': HOME_PAGE_DREAM_TEMPLES_BLOCK, 'data': {'title': HOME_PAGE_DREAM_TEMPLES_BLOCK_TITLE, 'products': temples}},
                {'type': HOME_PAGE_CATEGORIES_BLOCK, 'data': {'title': HOME_PAGE_CATEGORIES_BLOCK_TITLE, 'categories': categories}},
                {'type': HOME_PAGE_HOME_DECORS_BLOCK, 'data': {'title': HOME_PAGE_HOME_DECORS_BLOCK_TITLE, 'products': decor}},
                {'type': HOME_PAGE_REVIEWS_BLOCK, 'data': {'title': HOME_PAGE_REVIEWS_BLOCK_TITLE, 'reviews': ReviewRepository.get_approved_reviews(10)}},
            ]
            return None, {'blocks': blocks}
        except Exception as exc:
            logger.error("Unexpected error in HomeService.get_home: %s", exc, exc_info=True)
            return "An unexpected error occurred while fetching home data.", None
