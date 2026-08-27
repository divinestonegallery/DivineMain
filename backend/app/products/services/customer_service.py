import logging
import math
import traceback

from app.products.repositories.product_repository import (
    CategoryRepository,
    DietyRepository,
    MaterialRepository,
    ProductRepository,
)

logger = logging.getLogger(__name__)


class ProductCustomerService:
    """Business logic service for customer-facing product catalogue operations."""

    @staticmethod
    def list_active_products(params):
        try:
            page = int(params.get('page', 1))
            page_size = int(params.get('page_size', 24))
            offset = (page - 1) * page_size
            sort = params.get('sort', 'display_order')

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

            return None, {
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
        except Exception as exc:
            logger.error('ProductCustomerService.list_active_products error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active products', None

    @staticmethod
    def get_product_details(slug):
        try:
            error, product = ProductRepository.get_product_details_by_slug(slug)
            if error:
                return error, None
            if not product:
                return 'Product not found', None
            return None, product
        except Exception as exc:
            logger.error('ProductCustomerService.get_product_details error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to fetch product details', None


class CategoryCustomerService:
    """Business logic service for customer category listing."""

    @staticmethod
    def list_active_categories():
        try:
            error, categories = CategoryRepository.get_all_active_categories_list()
            if error:
                return error, None
            return None, categories
        except Exception as exc:
            logger.error('CategoryCustomerService.list_active_categories error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active categories', None


class MaterialCustomerService:
    """Business logic service for customer material listing."""

    @staticmethod
    def list_active_materials():
        try:
            error, materials = MaterialRepository.get_all_active_materials_list()
            if error:
                return error, None
            return None, materials
        except Exception as exc:
            logger.error('MaterialCustomerService.list_active_materials error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active materials', None


class DietyCustomerService:
    """Business logic service for customer deity listing."""

    @staticmethod
    def list_active_deities():
        try:
            error, deities = DietyRepository.get_all_active_deities_list()
            if error:
                return error, None
            return None, deities
        except Exception as exc:
            logger.error('DietyCustomerService.list_active_deities error: %s', exc, exc_info=traceback.format_exc())
            return 'Failed to list active deities', None