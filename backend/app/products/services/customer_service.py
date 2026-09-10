import hashlib
import json
import logging
import math
import traceback

from django.conf import settings
from django.core.cache import cache

from app.products.repositories.product_repository import (
    CategoryRepository,
    DietyRepository,
    MaterialRepository,
    ProductRepository,
)

logger = logging.getLogger(__name__)


def _catalog_cache_key(namespace, payload):
    serialized = json.dumps(payload, sort_keys=True, separators=(',', ':'), default=str)
    digest = hashlib.sha256(serialized.encode('utf-8')).hexdigest()
    return f'catalog:{namespace}:{digest}'


class ProductCustomerService:
    """Business logic service for customer-facing product catalogue operations."""

    @staticmethod
    def list_active_products(params):
        try:
            page = int(params.get('page', 1))
            page_size = int(params.get('page_size', 24))
            offset = (page - 1) * page_size
            sort = params.get('sort', 'display_order')
            cache_key = _catalog_cache_key('listing', dict(params))
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return None, cached_result

            error, result = ProductRepository.get_product_list(
                filters=params,
                sort=sort,
                offset=offset,
                limit=page_size,
            )
            if error:
                return error, None

            total_items = result['total_items']
            total_pages = math.ceil(total_items / page_size) if total_items else 0

            response = {
                'items': result['items'],
                'pagination': {
                    'page': page,
                    'page_size': page_size,
                    'total_items': total_items,
                    'total_pages': total_pages,
                    'has_next_page': page < total_pages,
                    'has_previous_page': page > 1,
                },
            }
            cache.set(cache_key, response, timeout=settings.CATALOG_CACHE_TTL)
            return None, response
        except Exception as exc:
            logger.error('ProductCustomerService.list_active_products error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active products', None

    @staticmethod
    def get_product_details(slug):
        try:
            cache_key = _catalog_cache_key('detail', {'slug': slug})
            cached_product = cache.get(cache_key)
            if cached_product is not None:
                return None, cached_product

            error, product = ProductRepository.get_product_details_by_slug(slug)
            if error:
                return error, None
            if not product:
                return 'Product not found', None
            cache.set(cache_key, product, timeout=settings.CATALOG_CACHE_TTL)
            return None, product
        except Exception as exc:
            logger.error('ProductCustomerService.get_product_details error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to fetch product details', None


class CategoryCustomerService:
    """Business logic service for customer category listing."""

    @staticmethod
    def list_active_categories():
        try:
            cache_key = 'catalog:taxonomy:categories'
            cached_categories = cache.get(cache_key)
            if cached_categories is not None:
                return None, cached_categories

            error, categories = CategoryRepository.get_all_active_categories_list()
            if error:
                return error, None
            cache.set(cache_key, categories, timeout=settings.TAXONOMY_CACHE_TTL)
            return None, categories
        except Exception as exc:
            logger.error('CategoryCustomerService.list_active_categories error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active categories', None


class MaterialCustomerService:
    """Business logic service for customer material listing."""

    @staticmethod
    def list_active_materials():
        try:
            cache_key = 'catalog:taxonomy:materials'
            cached_materials = cache.get(cache_key)
            if cached_materials is not None:
                return None, cached_materials

            error, materials = MaterialRepository.get_all_active_materials_list()
            if error:
                return error, None
            cache.set(cache_key, materials, timeout=settings.TAXONOMY_CACHE_TTL)
            return None, materials
        except Exception as exc:
            logger.error('MaterialCustomerService.list_active_materials error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active materials', None


class DietyCustomerService:
    """Business logic service for customer deity listing."""

    @staticmethod
    def list_active_deities():
        try:
            cache_key = 'catalog:taxonomy:deities'
            cached_deities = cache.get(cache_key)
            if cached_deities is not None:
                return None, cached_deities

            error, deities = DietyRepository.get_all_active_deities_list()
            if error:
                return error, None
            cache.set(cache_key, deities, timeout=settings.TAXONOMY_CACHE_TTL)
            return None, deities
        except Exception as exc:
            logger.error('DietyCustomerService.list_active_deities error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active deities', None
