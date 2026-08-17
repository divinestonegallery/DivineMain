from concurrent.futures import ThreadPoolExecutor
from django.db import connections
from app.applicationmodule.constants import *
from app.products.repositories.product_repository import ProductRepository
from app.reviews.repositories.review_repository import ReviewRepository
from app.reviews.serializers.admin import ReviewAdminSerializer
import logging

logger = logging.getLogger(__name__)

def fetch_popular_moorti_data():
    error, products_data = ProductRepository.get_popular_moorti_data()
    return {
        "type": HOME_PAGE_POPULAR_MOORTI_BLOCK,
        "data": {
            "title": HOME_PAGE_POPULAR_MOORTI_BLOCK_TITLE,
            "products": products_data or []
        }
    }

def fetch_dream_moorti_data():
    diety_grouped_data = ProductRepository.get_top_products_by_diety(limit_per_diety=5)
        
    return {
        "type": HOME_PAGE_DREAM_MOORTI_BLOCK,
        "data": {
            "title": HOME_PAGE_DREAM_MOORTI_BLOCK_TITLE,
            "dieties": diety_grouped_data
        }
    }

def fetch_dream_temples_data():
    error, products_data = ProductRepository.get_dream_temples_data()
    return {
        "type": HOME_PAGE_DREAM_TEMPLES_BLOCK,
        "data": {
            "title": HOME_PAGE_DREAM_TEMPLES_BLOCK_TITLE,
            "products": products_data or []
        }
    }

def fetch_categories_data():
    from app.products.repositories.product_repository import CategoryRepository
    error, categories_data = CategoryRepository.get_active()
    return {
        "type": HOME_PAGE_CATEGORIES_BLOCK,
        "data": {
            "title": HOME_PAGE_CATEGORIES_BLOCK_TITLE,
            "categories": categories_data or []
        }
    }

def fetch_home_decors_data():
    error, products_data = ProductRepository.get_home_decors_data()
    return {
        "type": HOME_PAGE_HOME_DECORS_BLOCK,
        "data": {
            "title": HOME_PAGE_HOME_DECORS_BLOCK_TITLE,
            "products": products_data or []
        }
    }

def fetch_reviews_data():
    reviews = ReviewRepository.get_approved_reviews(limit=10)
    return {
        "type": HOME_PAGE_REVIEWS_BLOCK,
        "data": {
            "title": HOME_PAGE_REVIEWS_BLOCK_TITLE,
            "reviews": ReviewAdminSerializer(reviews, many=True).data
        }
    }

blocks_handlers_map = {
    HOME_PAGE_POPULAR_MOORTI_BLOCK: fetch_popular_moorti_data,
    HOME_PAGE_DREAM_MOORTI_BLOCK: fetch_dream_moorti_data,
    HOME_PAGE_DREAM_TEMPLES_BLOCK: fetch_dream_temples_data,
    HOME_PAGE_CATEGORIES_BLOCK: fetch_categories_data,
    HOME_PAGE_HOME_DECORS_BLOCK: fetch_home_decors_data,
    HOME_PAGE_REVIEWS_BLOCK: fetch_reviews_data,
}

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
            blocks = []
            with ThreadPoolExecutor(max_workers=len(HomeService.get_home_blocks())) as executor:
                def wrapper(func):
                    try:
                        return func()
                    finally:
                        connections.close_all()

                futures = {executor.submit(wrapper, blocks_handlers_map[block]): block for block in HomeService.get_home_blocks()}
                
                for future in futures:
                    try:
                        blocks.append(future.result())
                    except Exception as e:
                        logger.error(f"Error processing future for block {futures[future]}: {e}", exc_info=True)
            
            return None, {"blocks": blocks}
        except Exception as e:
            logger.error(f"Unexpected error in get_home: {e}", exc_info=True)
            return str(e), None
