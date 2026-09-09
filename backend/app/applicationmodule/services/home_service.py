import logging

from django.conf import settings
from django.core.cache import cache

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
            cache_key = 'application:home:v1'
            cached = cache.get(cache_key)
            if cached is not None:
                return None, cached

            product_sections = ProductRepository.get_home_product_sections()
            _, categories = CategoryRepository.get_all_active_categories_list()
            data = {'blocks': [
                {'type': HOME_PAGE_POPULAR_MOORTI_BLOCK, 'data': {'title': HOME_PAGE_POPULAR_MOORTI_BLOCK_TITLE, 'products': product_sections['popular']}},
                {'type': HOME_PAGE_DREAM_MOORTI_BLOCK, 'data': {'title': HOME_PAGE_DREAM_MOORTI_BLOCK_TITLE, 'deities': product_sections['deities']}},
                {'type': HOME_PAGE_DREAM_TEMPLES_BLOCK, 'data': {'title': HOME_PAGE_DREAM_TEMPLES_BLOCK_TITLE, 'products': product_sections['temples']}},
                {'type': HOME_PAGE_CATEGORIES_BLOCK, 'data': {'title': HOME_PAGE_CATEGORIES_BLOCK_TITLE, 'categories': categories}},
                {'type': HOME_PAGE_HOME_DECORS_BLOCK, 'data': {'title': HOME_PAGE_HOME_DECORS_BLOCK_TITLE, 'deities': product_sections['home_decors']}},
                {'type': HOME_PAGE_REVIEWS_BLOCK, 'data': {'title': HOME_PAGE_REVIEWS_BLOCK_TITLE, 'reviews': ReviewRepository.get_approved_reviews(10)}},
            ]}
            cache.set(cache_key, data, timeout=settings.HOME_CACHE_TTL)
            return None, data
        except Exception as exc:
            logger.error("Unexpected error in HomeService.get_home: %s", exc, exc_info=True)
            return "An unexpected error occurred while fetching home data.", None
