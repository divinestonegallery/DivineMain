import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from django.conf import settings
from django.core.cache import cache

from app.applicationmodule.constants import (
    HOME_CACHE_KEY,
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
    HOME_PAGE_SUBCATEGORIES_BLOCK,
    HOME_PAGE_SUBCATEGORIES_BLOCK_TITLE,
)
from app.products.repositories.product_repository import CategoryRepository, DietyRepository, ProductRepository
from app.reviews.repositories.review_repository import ReviewRepository

logger = logging.getLogger(__name__)

_EMPTY_PRODUCT_SECTIONS = {
    'popular': [],
    'temples': [],
    'deities': [],
    'home_decors': [],
}


def _load_product_sections(store, lock):
    """Load product home sections once per request. Four blocks share one query."""
    with lock:
        if 'value' not in store:
            store['value'] = ProductRepository.get_home_product_sections() or _EMPTY_PRODUCT_SECTIONS
        return store['value']


def fetch_popular_moorti_data(load_product_sections):
    try:
        sections = load_product_sections()
    except Exception as exc:
        logger.error(exc)
        sections = _EMPTY_PRODUCT_SECTIONS
    return {
        'type': HOME_PAGE_POPULAR_MOORTI_BLOCK,
        'data': {
            'title': HOME_PAGE_POPULAR_MOORTI_BLOCK_TITLE,
            'products': sections.get('popular', []),
        },
    }


def fetch_dream_moorti_data(load_product_sections):
    try:
        sections = load_product_sections()
    except Exception as exc:
        logger.error(exc)
        sections = _EMPTY_PRODUCT_SECTIONS
    return {
        'type': HOME_PAGE_DREAM_MOORTI_BLOCK,
        'data': {
            'title': HOME_PAGE_DREAM_MOORTI_BLOCK_TITLE,
            'deities': sections.get('deities', []),
        },
    }


def fetch_dream_temples_data(load_product_sections):
    try:
        sections = load_product_sections()
    except Exception as exc:
        logger.error(exc)
        sections = _EMPTY_PRODUCT_SECTIONS
    return {
        'type': HOME_PAGE_DREAM_TEMPLES_BLOCK,
        'data': {
            'title': HOME_PAGE_DREAM_TEMPLES_BLOCK_TITLE,
            'products': sections.get('temples', []),
        },
    }


def fetch_categories_data():
    try:
        error, categories = CategoryRepository.get_all_active_categories_list()
        if error:
            logger.error(error)
            return {'type': HOME_PAGE_CATEGORIES_BLOCK, 'data': {}}
        return {
            'type': HOME_PAGE_CATEGORIES_BLOCK,
            'data': {
                'title': HOME_PAGE_CATEGORIES_BLOCK_TITLE,
                'categories': categories,
            },
        }
    except Exception as exc:
        logger.error(exc)
        return {'type': HOME_PAGE_CATEGORIES_BLOCK, 'data': {}}


def fetch_subcategories_data():
    try:
        error, subcategories = DietyRepository.get_all_active_deities_list()
        if error:
            logger.error(error)
            return {'type': HOME_PAGE_SUBCATEGORIES_BLOCK, 'data': {}}
        return {
            'type': HOME_PAGE_SUBCATEGORIES_BLOCK,
            'data': {
                'title': HOME_PAGE_SUBCATEGORIES_BLOCK_TITLE,
                'subcategories': subcategories,
            },
        }
    except Exception as exc:
        logger.error(exc)
        return {'type': HOME_PAGE_SUBCATEGORIES_BLOCK, 'data': {}}


def fetch_home_decors_data(load_product_sections):
    try:
        sections = load_product_sections()
    except Exception as exc:
        logger.error(exc)
        sections = _EMPTY_PRODUCT_SECTIONS
    return {
        'type': HOME_PAGE_HOME_DECORS_BLOCK,
        'data': {
            'title': HOME_PAGE_HOME_DECORS_BLOCK_TITLE,
            'deities': sections.get('home_decors', []),
        },
    }


def fetch_reviews_data():
    try:
        reviews = ReviewRepository.get_approved_reviews(10)
    except Exception as exc:
        logger.error(exc)
        return {'type': HOME_PAGE_REVIEWS_BLOCK, 'data': {}}
    return {
        'type': HOME_PAGE_REVIEWS_BLOCK,
        'data': {
            'title': HOME_PAGE_REVIEWS_BLOCK_TITLE,
            'reviews': reviews,
        },
    }


def get_home_blocks():
    return [
        HOME_PAGE_POPULAR_MOORTI_BLOCK,
        HOME_PAGE_DREAM_MOORTI_BLOCK,
        HOME_PAGE_DREAM_TEMPLES_BLOCK,
        HOME_PAGE_CATEGORIES_BLOCK,
        HOME_PAGE_SUBCATEGORIES_BLOCK,
        HOME_PAGE_HOME_DECORS_BLOCK,
        HOME_PAGE_REVIEWS_BLOCK,
    ]


def get_home():
    error = None
    resp = {}
    cached = cache.get(HOME_CACHE_KEY)
    if cached is not None:
        return None, cached

    try:
        product_store = {}
        load_product_sections = partial(
            _load_product_sections, product_store, threading.Lock()
        )
        blocks_handlers_map = {
            HOME_PAGE_POPULAR_MOORTI_BLOCK: partial(fetch_popular_moorti_data, load_product_sections),
            HOME_PAGE_DREAM_MOORTI_BLOCK: partial(fetch_dream_moorti_data, load_product_sections),
            HOME_PAGE_DREAM_TEMPLES_BLOCK: partial(fetch_dream_temples_data, load_product_sections),
            HOME_PAGE_CATEGORIES_BLOCK: fetch_categories_data,
            HOME_PAGE_SUBCATEGORIES_BLOCK: fetch_subcategories_data,
            HOME_PAGE_HOME_DECORS_BLOCK: partial(fetch_home_decors_data, load_product_sections),
            HOME_PAGE_REVIEWS_BLOCK: fetch_reviews_data,
        }

        with ThreadPoolExecutor(max_workers=len(get_home_blocks())) as executor:
            from django.db import connections
            def wrapper(func):
                try:
                    return func()
                finally:
                    connections.close_all()
            futures = {executor.submit(wrapper, blocks_handlers_map[block]): block for block in get_home_blocks()}
            blocks = []
            for future in futures:
                try:
                    blocks.append(future.result())
                except Exception as e:
                    logger.error(f"Error processing future for block {futures[future]}", exc_info=True)
        resp = {
            "blocks": blocks
        }
        cache.set(HOME_CACHE_KEY, resp, timeout=settings.HOME_CACHE_TTL)
        return error, resp
    except Exception as e:
        error = f"An unexpected error occurred in handler for block': {e}"
        logger.error(error, exc_info=True)
        return error, None


class HomeService:
    @staticmethod
    def get_home_blocks():
        return get_home_blocks()

    @staticmethod
    def get_home():
        return get_home()
