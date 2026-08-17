from decimal import Decimal

from app.products.repositories.product_repository import (
    CategoryRepository,
    DietyRepository,
    MaterialRepository,
    ProductImageRepository,
    ProductRepository,
    ProductVariantRepository,
)


PURCHASE_VARIANT_FIELDS = (
    'price_before_gst', 'gst_rate', 'sculpture_height_inches',
    'sculpture_width_inches', 'sculpture_depth_inches', 'min_weight_kg',
    'packed_length_inches', 'packed_width_inches', 'packed_height_inches',
)


def _missing_variant_fields(variant):
    return [field for field in PURCHASE_VARIANT_FIELDS if variant.get(field) is None]


def _variant_is_purchase_ready(variant):
    if _missing_variant_fields(variant):
        return False
    stock = variant.get('stock_quantity', 0)
    availability = variant.get('availability', 'in_stock')
    if availability == 'in_stock' and stock < 1:
        return False
    if availability == 'out_of_stock' and stock != 0:
        return False
    return True


def _has_purchase_ready_variant(product_id, exclude_id=None, replacement=None):
    candidates = ProductVariantRepository.active_purchase_candidates(
        product_id,
        exclude_id=exclude_id,
        replacement=replacement,
    )
    return any(_variant_is_purchase_ready(candidate) for candidate in candidates)


def _weight_range_is_valid(variant):
    minimum = variant.get('min_weight_kg')
    maximum = variant.get('max_weight_kg')
    return minimum is None or maximum is None or Decimal(str(maximum)) >= Decimal(str(minimum))


class ProductAdminService:
    @staticmethod
    def list_products(params):
        return None, ProductRepository.list_admin(params)

    @staticmethod
    def get_product(product_id):
        product = ProductRepository.get_admin(product_id)
        return (None, product) if product else ('Product not found.', None)

    @staticmethod
    def create_product(data):
        required = ('category', 'material', 'diety', 'name')
        missing = [field for field in required if not data.get(field)]
        if missing:
            return f"Missing required fields: {', '.join(missing)}.", None
        if data.get('status') == 'active':
            return 'Create the product as draft, add its image and selling details, then publish it.', None
        taxonomy = ProductRepository.taxonomy_is_valid(data['category'], data['material'], data['diety'])
        invalid = [name for name, valid in taxonomy.items() if not valid]
        if invalid:
            return f"Invalid or inactive taxonomy: {', '.join(invalid)}.", None
        return ProductRepository.create(data)

    @staticmethod
    def update_product(product_id, data):
        current = ProductRepository.get_admin(product_id)
        if not current:
            return 'Product not found.', None
        taxonomy_ids = {
            'category': data.get('category', current['category']),
            'material': data.get('material', current['material']),
            'diety': data.get('diety', current['deity']),
        }
        taxonomy = ProductRepository.taxonomy_is_valid(
            taxonomy_ids['category'], taxonomy_ids['material'], taxonomy_ids['diety']
        )
        invalid = [name for name, valid in taxonomy.items() if not valid]
        if invalid:
            return f"Invalid or inactive taxonomy: {', '.join(invalid)}.", None

        target_status = data.get('status', current['status'])
        target_sales_mode = data.get('sales_mode', current['sales_mode'])
        if target_status == 'active':
            error = ProductAdminService._publish_error(product_id, target_sales_mode)
            if error:
                return error, None
        return ProductRepository.update(product_id, data)

    @staticmethod
    def archive_product(product_id):
        return (None, {'id': product_id, 'status': 'archived'}) if ProductRepository.archive(product_id) else ('Product not found.', None)

    @staticmethod
    def _publish_error(product_id, sales_mode):
        readiness = ProductRepository.publish_readiness(product_id)
        if not readiness:
            return 'Product not found.'
        if not readiness['taxonomy_active']:
            return 'Category, material and deity must all be active before publishing.'
        if not readiness['has_cover']:
            return 'Add and select a cover image before publishing.'
        if sales_mode != 'quote_only':
            complete = [variant for variant in readiness['variants'] if _variant_is_purchase_ready(variant)]
            if not complete:
                return 'Add an active variant with price, GST, valid stock, dimensions, weight and packed dimensions before enabling purchase.'
        return None


class ProductVariantService:
    @staticmethod
    def list(product_id):
        return ProductVariantRepository.list(product_id)

    @staticmethod
    def create(product_id, data):
        if not data.get('name') or not data.get('sku'):
            return 'Variant name and SKU are required.', None
        product = ProductRepository.get_admin(product_id)
        if not product:
            return 'Product not found.', None
        if product['status'] == 'active' and product['sales_mode'] != 'quote_only' and not _variant_is_purchase_ready(data):
            return 'Active purchasable products require complete price, GST, valid stock, dimensions, weight and packed dimensions.', None
        return ProductVariantRepository.create(product_id, data)

    @staticmethod
    def update(product_id, variant_id, data):
        current = ProductVariantRepository.get(product_id, variant_id)
        if not current:
            return 'Variant not found.', None
        merged = {**current, **data}
        if not _weight_range_is_valid(merged):
            return 'Maximum weight must be greater than or equal to minimum weight.', None
        product = ProductRepository.get_admin(product_id)
        if product['status'] == 'active' and product['sales_mode'] != 'quote_only':
            if not _has_purchase_ready_variant(
                product_id,
                exclude_id=variant_id,
                replacement=merged,
            ):
                return 'A published purchasable product must retain one active variant with complete selling and shipping details.', None
        return ProductVariantRepository.update(product_id, variant_id, data)

    @staticmethod
    def delete(product_id, variant_id):
        product = ProductRepository.get_admin(product_id)
        variant = ProductVariantRepository.get(product_id, variant_id)
        if not product or not variant:
            return 'Variant not found.', None
        if (
            product['status'] == 'active'
            and product['sales_mode'] != 'quote_only'
            and not _has_purchase_ready_variant(product_id, exclude_id=variant_id)
        ):
            return 'A published purchasable product must keep at least one active variant.', None
        if not ProductVariantRepository.delete(product_id, variant_id):
            return 'Variant not found.', None
        return None, {'id': variant_id, 'deleted': True}


class ProductImageService:
    @staticmethod
    def list(product_id):
        return ProductImageRepository.list(product_id)

    @staticmethod
    def attach(product_id, data, actor_id):
        from app.common.repositories import UploadRepository
        from app.common.services.upload_service import UploadService

        if not ProductRepository.get_admin(product_id):
            return 'Product not found.', None
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
        error, image = ProductImageRepository.create(product_id, payload)
        if error:
            UploadService.delete_object(data['object_key'])
            UploadRepository.mark_rejected(data['object_key'])
            return error, None
        UploadRepository.mark_attached(data['object_key'])
        return None, image

    @staticmethod
    def update(product_id, image_id, data):
        return ProductImageRepository.update(product_id, image_id, data)

    @staticmethod
    def reorder(product_id, image_ids):
        return ProductImageRepository.reorder(product_id, image_ids)

    @staticmethod
    def delete(product_id, image_id):
        from app.common.repositories import UploadRepository
        from app.common.services.upload_service import UploadService

        image = ProductImageRepository.get(product_id, image_id)
        if not image:
            return 'Product image not found.', None
        product = ProductRepository.get_admin(product_id)
        if product and product['status'] == 'active' and ProductImageRepository.count(product_id) <= 1:
            return 'A published product must keep at least one image.', None
        error = UploadService.delete_object(image['object_key'])
        if error:
            return error, None
        if not ProductImageRepository.delete_record(product_id, image_id):
            return 'Product image not found.', None
        UploadRepository.mark_deleted(image['object_key'])
        return None, {'id': image_id, 'deleted': True}


class BaseTaxonomyService:
    repository = None
    label = 'Item'

    @classmethod
    def list_items(cls):
        return cls.repository.get_all()

    @classmethod
    def create(cls, data):
        if not data.get('name'):
            return f'{cls.label} name is required.', None
        return cls.repository.create(data)

    @classmethod
    def get(cls, item_id):
        return cls.repository.get_by_id(item_id)

    @classmethod
    def update(cls, item_id, data):
        if 'name' in data and not data['name'].strip():
            return f'{cls.label} name cannot be empty.', None
        return cls.repository.update(item_id, data)

    @classmethod
    def delete(cls, item_id):
        return cls.repository.soft_delete(item_id)


class CategoryAdminService(BaseTaxonomyService):
    repository = CategoryRepository
    label = 'Category'
    list_categories = BaseTaxonomyService.list_items.__func__
    create_category = BaseTaxonomyService.create.__func__
    get_category = BaseTaxonomyService.get.__func__
    update_category = BaseTaxonomyService.update.__func__
    soft_delete_category = BaseTaxonomyService.delete.__func__


class MaterialAdminService(BaseTaxonomyService):
    repository = MaterialRepository
    label = 'Material'
    list_materials = BaseTaxonomyService.list_items.__func__
    create_material = BaseTaxonomyService.create.__func__
    get_material = BaseTaxonomyService.get.__func__
    update_material = BaseTaxonomyService.update.__func__
    soft_delete_material = BaseTaxonomyService.delete.__func__


class DietyAdminService(BaseTaxonomyService):
    repository = DietyRepository
    label = 'Deity'
    list_dieties = BaseTaxonomyService.list_items.__func__
    create_diety = BaseTaxonomyService.create.__func__
    get_diety = BaseTaxonomyService.get.__func__
    update_diety = BaseTaxonomyService.update.__func__
    soft_delete_diety = BaseTaxonomyService.delete.__func__
