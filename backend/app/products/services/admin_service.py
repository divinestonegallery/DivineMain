from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.core.cache import cache

from app.applicationmodule.constants import HOME_CACHE_KEY
from app.common.repositories import UploadRepository
from app.common.services.upload_service import UploadService
from app.products.enums import ProductStatus
from app.products.repositories.product_repository import (
    CategoryRepository,
    DietyRepository,
    MaterialRepository,
    ProductImageRepository,
    ProductRepository,
)


def _flush_catalog_cache():
    """Invalidate customer listing and taxonomy caches after catalog writes."""
    try:
        cache.incr('catalog:gen')
    except ValueError:
        cache.set('catalog:gen', 1, timeout=None)
    cache.delete_many([
        'catalog:taxonomy:categories',
        'catalog:taxonomy:materials',
        'catalog:taxonomy:deities',
        HOME_CACHE_KEY,
    ])


class ProductAdminService:
    @staticmethod
    def list_products(params):
        return None, ProductRepository.get_admin_product_list(params)

    @staticmethod
    def get_product(product_id):
        product = ProductRepository.get_admin_product_by_id(product_id)
        return (None, product) if product else ('Product not found.', None)

    @staticmethod
    def create_product(data):
        required = ('category', 'material', 'name')
        missing = [field for field in required if not data.get(field)]
        if missing:
            return f"Missing required fields: {', '.join(missing)}.", None
        taxonomy = ProductRepository.taxonomy_is_valid(
            data['category'], data['material'], data.get('diety')
        )
        invalid = [name for name, valid in taxonomy.items() if not valid]
        if invalid:
            return f"Invalid or inactive taxonomy: {', '.join(invalid)}.", None

        payload = dict(data)
        payload['is_active'] = payload.get('status', ProductStatus.DRAFT.value) != ProductStatus.ARCHIVED.value
        payload['discount_percentage'] = ProductAdminService._discount_percentage(
            payload.get('original_price'), payload.get('selling_price')
        )
        result = ProductRepository.create(payload)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def update_product(product_id, data):
        product = ProductRepository.get_writable_product(product_id)
        if not product:
            return 'Product not found.', None
        if any(field in data for field in ('category', 'material', 'diety')):
            taxonomy = ProductRepository.taxonomy_is_valid(
                data.get('category', product.category_id),
                data.get('material', product.material_id),
                data.get('diety', product.diety_id),
            )
            invalid = [name for name, valid in taxonomy.items() if not valid]
            if invalid:
                return f"Invalid or inactive taxonomy: {', '.join(invalid)}.", None
        target_status = data.get('status', product.status)
        if target_status == ProductStatus.ACTIVE.value and product.status != ProductStatus.ACTIVE.value:
            error = ProductAdminService._publish_error(product_id)
            if error:
                return error, None

        payload = dict(data)
        if 'status' in payload:
            payload['is_active'] = payload['status'] != ProductStatus.ARCHIVED.value
        payload['discount_percentage'] = ProductAdminService._discount_percentage(
            payload.get('original_price', product.original_price),
            payload.get('selling_price', product.selling_price),
        )
        result = ProductRepository.update(product, payload)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def archive_product(product_id):
        archived = ProductRepository.archive(product_id)
        if archived:
            _flush_catalog_cache()
        return (None, {'id': product_id, 'status': ProductStatus.ARCHIVED.value}) if archived else ('Product not found.', None)

    @staticmethod
    def _publish_error(product_id):
        readiness = ProductRepository.publish_readiness(product_id)
        if not readiness:
            return 'Product not found.'
        if not readiness['taxonomy_active']:
            return 'Category, material and deity must all be active before publishing.'
        if not readiness['has_cover']:
            return 'Add and select a cover image before publishing.'
        return None

    @staticmethod
    def _discount_percentage(original_price, selling_price):
        if not original_price or not selling_price:
            return None
        try:
            original = Decimal(str(original_price))
            selling = Decimal(str(selling_price))
        except (InvalidOperation, TypeError, ValueError):
            return None
        if original <= 0:
            return None
        return ((original - selling) / original * 100).quantize(Decimal('0.01'))


class ProductImageService:
    @staticmethod
    def generate_upload_url(data, actor_id):
        payload = {**data, 'purpose': 'product_image'}
        return UploadService.create_presigned_upload(payload, actor_id)

    @staticmethod
    def list_images(product_id):
        return ProductImageRepository.get_image_list(product_id)

    @staticmethod
    def attach_image(product_id, data, actor_id):
        if not ProductRepository.product_exists(product_id):
            return 'Product not found.', None
        image_count = ProductImageRepository.get_image_count(product_id)
        if image_count >= settings.R2_MAX_PRODUCT_IMAGES:
            return f'A product can have at most {settings.R2_MAX_PRODUCT_IMAGES} images.', None

        session = UploadRepository.claim_pending_session(data['object_key'], actor_id)
        if not session or session['purpose'] != 'product_image':
            return 'Upload session is invalid, expired or already used.', None
        error, metadata = UploadService.inspect_image(data['object_key'], session)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None

        payload = {
            **data,
            **metadata,
            'image_url': UploadService.public_url(data['object_key']),
        }
        if image_count == 0:
            payload['cover_photo'] = True
        error, image = ProductImageRepository.create_image(product_id, payload)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None
        UploadRepository.mark_attached(data['object_key'])
        _flush_catalog_cache()
        return None, image

    @staticmethod
    def update_image(product_id, image_id, data):
        if data.get('cover_photo') is False:
            current = ProductImageRepository.get_image_by_id(product_id, image_id)
            if current and current['cover_photo']:
                return 'Choose another cover image before removing this cover.', None
        result = ProductImageRepository.update_image(product_id, image_id, data)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def reorder_images(product_id, image_ids):
        result = ProductImageRepository.reorder_images(product_id, image_ids)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def delete_image(product_id, image_id):
        image = ProductImageRepository.get_image_by_id(product_id, image_id)
        if not image:
            return 'Product image not found.', None
        status = ProductRepository.get_product_status(product_id)
        if status == ProductStatus.ACTIVE.value and ProductImageRepository.get_image_count(product_id) <= 1:
            return 'A published product must keep at least one image.', None
        error = UploadService.delete_object(image['object_key'])
        if error:
            return error, None
        if not ProductImageRepository.delete_image(product_id, image_id):
            return 'Product image not found.', None
        UploadRepository.mark_deleted(image['object_key'])
        _flush_catalog_cache()
        return None, {'id': image_id, 'deleted': True}


class CategoryAdminService:
    @staticmethod
    def generate_upload_url(data, actor_id):
        payload = {**data, 'purpose': 'category_image'}
        return UploadService.create_presigned_upload(payload, actor_id)

    @staticmethod
    def finalize_image(category_id, data, actor_id):
        session = UploadRepository.claim_pending_session(data['object_key'], actor_id)
        if not session or session['purpose'] != 'category_image':
            return 'Upload session is invalid, expired or already used.', None
        error, metadata = UploadService.inspect_image(data['object_key'], session)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None
        image_data = {
            **metadata,
            'object_key': data['object_key'],
            'image_url': UploadService.public_url(data['object_key']),
            'alt_text': data.get('alt_text', ''),
        }
        error, category = CategoryRepository.set_category_image(category_id, image_data)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None
        UploadRepository.mark_attached(data['object_key'])
        _flush_catalog_cache()
        return None, category

    @staticmethod
    def get_all_categories():
        return CategoryRepository.get_all_categories_list()

    @staticmethod
    def create_category(data):
        if not data.get('name'):
            return 'Category name is required.', None
        result = CategoryRepository.create_category(data)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def get_category_by_id(category_id):
        return CategoryRepository.get_category_by_id(category_id)

    @staticmethod
    def update_category(category_id, data):
        if 'name' in data and not data['name'].strip():
            return 'Category name cannot be empty.', None
        result = CategoryRepository.update_category(category_id, data)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def deactivate_category(category_id):
        result = CategoryRepository.deactivate_category(category_id)
        if result[0] is None:
            _flush_catalog_cache()
        return result


class MaterialAdminService:
    @staticmethod
    def get_all_materials():
        return MaterialRepository.get_all_materials_list()

    @staticmethod
    def create_material(data):
        if not data.get('name'):
            return 'Material name is required.', None
        result = MaterialRepository.create_material(data)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def get_material_by_id(material_id):
        return MaterialRepository.get_material_by_id(material_id)

    @staticmethod
    def update_material(material_id, data):
        if 'name' in data and not data['name'].strip():
            return 'Material name cannot be empty.', None
        result = MaterialRepository.update_material(material_id, data)
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def deactivate_material(material_id):
        result = MaterialRepository.deactivate_material(material_id)
        if result[0] is None:
            _flush_catalog_cache()
        return result


class DietyAdminService:
    @staticmethod
    def generate_upload_url(data, actor_id):
        payload = {**data, 'purpose': 'deity_image'}
        return UploadService.create_presigned_upload(payload, actor_id)

    @staticmethod
    def finalize_image(deity_id, data, actor_id):
        session = UploadRepository.claim_pending_session(data['object_key'], actor_id)
        if not session or session['purpose'] != 'deity_image':
            return 'Upload session is invalid, expired or already used.', None
        error, metadata = UploadService.inspect_image(data['object_key'], session)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None
        image_data = {
            **metadata,
            'object_key': data['object_key'],
            'image_url': UploadService.public_url(data['object_key']),
            'alt_text': data.get('alt_text', ''),
        }
        error, deity = DietyRepository.set_deity_image(deity_id, image_data)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None
        UploadRepository.mark_attached(data['object_key'])
        _flush_catalog_cache()
        return None, deity

    @staticmethod
    def get_all_deities():
        return DietyRepository.get_all_deities_list()

    @staticmethod
    def create_deity(data):
        if not data.get('name'):
            return 'Deity name is required.', None
        result = DietyRepository.create_deity(dict(data))
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def get_deity_by_id(deity_id):
        return DietyRepository.get_deity_by_id(deity_id)

    @staticmethod
    def update_deity(deity_id, data):
        if 'name' in data and not data['name'].strip():
            return 'Deity name cannot be empty.', None
        result = DietyRepository.update_deity(deity_id, dict(data))
        if result[0] is None:
            _flush_catalog_cache()
        return result

    @staticmethod
    def deactivate_deity(deity_id):
        result = DietyRepository.deactivate_deity(deity_id)
        if result[0] is None:
            _flush_catalog_cache()
        return result
