import logging

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db import models
from django.db.models import Prefetch, Q

from app.products.models import Category, Diety, Material, Product, ProductImage
from app.products.serializers.admin import (
    CategoryAdminSerializer,
    DietyAdminSerializer,
    MaterialAdminSerializer,
    ProductAdminSerializer,
    ProductImageAdminSerializer,
)
from app.products.serializers.customer import (
    CategoryCustomerSerializer,
    DietyCustomerSerializer,
    MaterialCustomerSerializer,
    ProductCardSerializer,
    ProductDetailSerializer,
)

logger = logging.getLogger(__name__)


def _pagination(queryset, page, page_size, serializer_class):
    total = queryset.count()
    start = (page - 1) * page_size
    return {
        'items': serializer_class(queryset[start:start + page_size], many=True).data,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_items': total,
            'total_pages': (total + page_size - 1) // page_size,
        },
    }


def _product_queryset(public=False):
    images = ProductImage.objects.order_by('display_order', 'id')
    queryset = Product.objects.select_related('category', 'material', 'diety').prefetch_related(
        Prefetch('images', queryset=images),
    )
    if public:
        queryset = queryset.filter(
            status=Product.Status.ACTIVE,
            is_active=True,
            category__is_active=True,
            material__is_active=True,
            diety__is_active=True,
        )
    return queryset


class ProductRepository:
    @staticmethod
    def get_admin_product_list(params):
        """Return a paginated, serialized list of all products for the Admin dashboard."""
        queryset = _product_queryset()
        queryset = ProductRepository._apply_filters(queryset, params, include_status=True)
        queryset = ProductRepository._apply_sort(queryset, params['sort'])
        return _pagination(queryset, params['page'], params['page_size'], ProductAdminSerializer)

    @staticmethod
    def get_product_list(filters=None, sort='display_order', offset=0, limit=24):
        """Return a sliced, serialized list of active public catalogue products."""
        try:
            filters = filters or {}
            queryset = _product_queryset(public=True)
            queryset = ProductRepository._apply_filters(queryset, filters, include_status=False)
            queryset = ProductRepository._apply_sort(queryset, sort).distinct()

            total_items = queryset.count()
            rows = list(queryset[offset:offset + limit])
            return None, {
                'items': ProductCardSerializer(rows, many=True).data,
                'total_items': total_items,
            }
        except Exception as exc:
            logger.error('ProductRepository.get_product_list error: %s', exc)
            return 'Failed to fetch products from database.', None

    @staticmethod
    def get_product_details_by_slug(slug):
        """Return full serialized details for a single active public product by its slug."""
        try:
            product = _product_queryset(public=True).filter(slug=slug).first()
            if not product:
                return None, None
            return None, ProductDetailSerializer(product).data
        except Exception as exc:
            logger.error('ProductRepository.get_product_details_by_slug error: %s', exc)
            return 'Failed to fetch product from database.', None

    @staticmethod
    def _apply_filters(queryset, params, include_status):
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(keywords__icontains=search)
                | Q(short_description__icontains=search)
                | Q(uid__icontains=search)
            )
        if params.get('category'):
            queryset = queryset.filter(category__slug=params['category'])
        if params.get('material'):
            queryset = queryset.filter(material__slug=params['material'])
        if params.get('deity'):
            queryset = queryset.filter(diety__slug=params['deity'])
        if params.get('availability'):
            queryset = queryset.filter(availability=params['availability'])
        if include_status and params.get('status'):
            queryset = queryset.filter(status=params['status'])
        return queryset.distinct()

    @staticmethod
    def _apply_sort(queryset, sort):
        orders = {
            'newest': ('-created_at',),
            'oldest': ('created_at',),
            'featured': ('-is_featured', 'display_order', '-created_at'),
            'display_order': ('display_order', '-is_featured', '-created_at'),
        }
        return queryset.order_by(*orders.get(sort, orders['display_order']))

    @staticmethod
    def get_admin_product_by_id(product_id):
        """Return serialized admin detail for a single product by its primary key."""
        product = _product_queryset().filter(id=product_id).first()
        return ProductAdminSerializer(product).data if product else None

    @staticmethod
    def search_public_products(query, limit=20):
        """Full-text search across active catalogue products. Returns card serialized results."""
        queryset = _product_queryset(public=True).filter(
            Q(name__icontains=query)
            | Q(keywords__icontains=query)
            | Q(short_description__icontains=query)
        ).order_by('-is_featured', 'display_order').distinct()[:limit]
        return ProductCardSerializer(queryset, many=True).data

    @staticmethod
    def taxonomy_is_valid(category_id, material_id, deity_id):
        return {
            'category': Category.objects.filter(id=category_id, is_active=True).exists(),
            'material': Material.objects.filter(id=material_id, is_active=True).exists(),
            'diety': Diety.objects.filter(id=deity_id, is_active=True).exists(),
        }

    @staticmethod
    def create(data):
        data = dict(data)
        data['category_id'] = data.pop('category')
        data['material_id'] = data.pop('material')
        data['diety_id'] = data.pop('diety')
        data['is_active'] = data.get('status', Product.Status.DRAFT) != Product.Status.ARCHIVED
        try:
            with transaction.atomic():
                product = Product.objects.create(**data)
        except IntegrityError:
            return 'A product with the generated URL already exists.', None
        return None, ProductAdminSerializer(product).data

    @staticmethod
    def update(product_id, data):
        product = Product.objects.filter(id=product_id).first()
        if not product:
            return 'Product not found.', None
        relation_fields = {'category', 'material', 'diety'}
        for key, value in data.items():
            setattr(product, f'{key}_id' if key in relation_fields else key, value)
        if 'status' in data:
            product.is_active = data['status'] != Product.Status.ARCHIVED
        try:
            with transaction.atomic():
                product.save()
        except IntegrityError:
            return 'A product with the generated URL already exists.', None
        return None, ProductAdminSerializer(_product_queryset().get(id=product.id)).data

    @staticmethod
    def archive(product_id):
        updated = Product.objects.filter(id=product_id).update(
            status=Product.Status.ARCHIVED,
            is_active=False,
        )
        return bool(updated)

    @staticmethod
    def publish_readiness(product_id):
        product = Product.objects.select_related('category', 'material', 'diety').filter(id=product_id).first()
        if not product:
            return None
        return {
            'status': product.status,
            'sales_mode': product.sales_mode,
            'taxonomy_active': product.category.is_active and product.material.is_active and product.diety.is_active,
            'has_cover': ProductImage.objects.filter(product_id=product_id, cover_photo=True).exists(),
            'image_count': ProductImage.objects.filter(product_id=product_id).count(),
        }

    @staticmethod
    def get_top_products_by_diety(limit_per_diety=5):
        result = []
        for deity in Diety.objects.filter(is_active=True).order_by('name'):
            products = _product_queryset(public=True).filter(diety=deity).order_by(
                '-is_featured', 'display_order', '-created_at'
            )[:limit_per_diety]
            if products:
                result.append({
                    'deity_id': deity.id,
                    'deity_name': deity.name,
                    'deity_slug': deity.slug,
                    'products': ProductCardSerializer(products, many=True).data,
                })
        return result

    @staticmethod
    def get_popular_moorti_data():
        products = _product_queryset(public=True).filter(is_featured=True).order_by('display_order', '-created_at')[:10]
        return None, ProductCardSerializer(products, many=True).data

    @staticmethod
    def get_dream_temples_data():
        products = _product_queryset(public=True).filter(category__slug='temples').order_by('-is_featured', 'display_order')[:10]
        return None, ProductCardSerializer(products, many=True).data

    @staticmethod
    def get_home_decors_by_diety(limit_per_diety=5):
        result = []
        for deity in Diety.objects.filter(is_active=True).order_by('name'):
            products = _product_queryset(public=True).filter(
                category__slug='home-decor', diety=deity
            ).order_by('-is_featured', 'display_order', '-created_at')[:limit_per_diety]
            if products:
                result.append({
                    'deity_id': deity.id,
                    'deity_name': deity.name,
                    'deity_slug': deity.slug,
                    'products': ProductCardSerializer(products, many=True).data,
                })
        return result




class ProductImageRepository:
    @staticmethod
    def get_image_list(product_id):
        """Return all images for a product ordered by display_order, serialized for the Admin."""
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        images = ProductImage.objects.filter(product_id=product_id).order_by('display_order', 'id')
        return None, ProductImageAdminSerializer(images, many=True).data

    @staticmethod
    def get_image_by_id(product_id, image_id):
        """Return a single product image serialized for the Admin, or None if not found."""
        image = ProductImage.objects.filter(id=image_id, product_id=product_id).first()
        return ProductImageAdminSerializer(image).data if image else None

    @staticmethod
    def get_image_count(product_id):
        """Return the total number of images attached to a product."""
        return ProductImage.objects.filter(product_id=product_id).count()

    @staticmethod
    def create_image(product_id, data):
        """Attach a new image record to a product, enforcing cover-photo and count rules."""
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        if ProductImage.objects.filter(product_id=product_id).count() >= settings.R2_MAX_PRODUCT_IMAGES:
            return f'A product can have at most {settings.R2_MAX_PRODUCT_IMAGES} images.', None
        try:
            with transaction.atomic():
                if not ProductImage.objects.filter(product_id=product_id).exists():
                    data['cover_photo'] = True
                if data.get('cover_photo'):
                    ProductImage.objects.filter(product_id=product_id, cover_photo=True).update(cover_photo=False)
                image = ProductImage.objects.create(product_id=product_id, **data)
        except IntegrityError:
            return 'This uploaded image is already attached.', None
        return None, ProductImageAdminSerializer(image).data

    @staticmethod
    def update_image(product_id, image_id, data):
        """Apply a partial update to an image record, maintaining cover-photo consistency."""
        image = ProductImage.objects.filter(id=image_id, product_id=product_id).first()
        if not image:
            return 'Product image not found.', None
        with transaction.atomic():
            if data.get('cover_photo') is True:
                ProductImage.objects.filter(product_id=product_id, cover_photo=True).exclude(id=image_id).update(cover_photo=False)
            if data.get('cover_photo') is False and image.cover_photo:
                return 'Choose another cover image before removing this cover.', None
            for key, value in data.items():
                setattr(image, key, value)
            image.save()
        return None, ProductImageAdminSerializer(image).data

    @staticmethod
    def reorder_images(product_id, image_ids):
        """Bulk-update display_order for all images of a product given an ordered list of IDs."""
        existing = list(ProductImage.objects.filter(product_id=product_id).values_list('id', flat=True))
        if set(existing) != set(image_ids):
            return 'Provide every product image exactly once.', None
        with transaction.atomic():
            ProductImage.objects.bulk_update(
                [ProductImage(id=image_id, display_order=index) for index, image_id in enumerate(image_ids)],
                ['display_order'],
            )
        return ProductImageRepository.get_image_list(product_id)

    @staticmethod
    def delete_image(product_id, image_id):
        """Hard-delete an image record, promoting a replacement cover photo if needed."""
        image = ProductImage.objects.filter(id=image_id, product_id=product_id).first()
        if not image:
            return False
        was_cover = image.cover_photo
        image.delete()
        if was_cover:
            replacement = ProductImage.objects.filter(product_id=product_id).order_by('display_order', 'id').first()
            if replacement:
                replacement.cover_photo = True
                replacement.save(update_fields=['cover_photo', 'updated_at'])
        return True


class CategoryRepository:
    @staticmethod
    def get_all_categories_list():
        """Return all categories (active + inactive) serialized for the Admin dashboard."""
        items = Category.objects.all().order_by('name')
        return None, CategoryAdminSerializer(items, many=True).data

    @staticmethod
    def get_all_active_categories_list():
        """Return only active categories serialized for customer-facing endpoints."""
        items = Category.objects.filter(is_active=True).order_by('name')
        return None, CategoryCustomerSerializer(items, many=True).data

    @staticmethod
    def get_category_by_id(category_id):
        """Return a single category by its primary key."""
        item = Category.objects.filter(id=category_id).first()
        return (None, CategoryAdminSerializer(item).data) if item else ('Not found', None)

    @staticmethod
    def create_category(data):
        """Create a new category record."""
        try:
            with transaction.atomic():
                item = Category.objects.create(**data)
        except IntegrityError:
            return 'Category name must be unique.', None
        return None, CategoryAdminSerializer(item).data

    @staticmethod
    def update_category(category_id, data):
        """Apply a partial update to a category record."""
        item = Category.objects.filter(id=category_id).first()
        if not item:
            return 'Not found', None
        for key, value in data.items():
            setattr(item, key, value)
        try:
            with transaction.atomic():
                item.save()
        except IntegrityError:
            return 'Category name must be unique.', None
        return None, CategoryAdminSerializer(item).data

    @staticmethod
    def deactivate_category(category_id):
        """Soft-delete a category by marking it inactive."""
        updated = Category.objects.filter(id=category_id).update(is_active=False)
        return (None, {'id': category_id}) if updated else ('Not found', None)

    @staticmethod
    def search_active_categories(query, limit=5):
        """Partial name search across active categories."""
        items = Category.objects.filter(is_active=True, name__icontains=query).order_by('name')[:limit]
        return CategoryCustomerSerializer(items, many=True).data


class MaterialRepository:
    @staticmethod
    def get_all_materials_list():
        """Return all materials (active + inactive) serialized for the Admin dashboard."""
        items = Material.objects.all().order_by('name')
        return None, MaterialAdminSerializer(items, many=True).data

    @staticmethod
    def get_all_active_materials_list():
        """Return only active materials serialized for customer-facing endpoints."""
        items = Material.objects.filter(is_active=True).order_by('name')
        return None, MaterialCustomerSerializer(items, many=True).data

    @staticmethod
    def get_material_by_id(material_id):
        """Return a single material by its primary key."""
        item = Material.objects.filter(id=material_id).first()
        return (None, MaterialAdminSerializer(item).data) if item else ('Not found', None)

    @staticmethod
    def create_material(data):
        """Create a new material record."""
        try:
            with transaction.atomic():
                item = Material.objects.create(**data)
        except IntegrityError:
            return 'Material name must be unique.', None
        return None, MaterialAdminSerializer(item).data

    @staticmethod
    def update_material(material_id, data):
        """Apply a partial update to a material record."""
        item = Material.objects.filter(id=material_id).first()
        if not item:
            return 'Not found', None
        for key, value in data.items():
            setattr(item, key, value)
        try:
            with transaction.atomic():
                item.save()
        except IntegrityError:
            return 'Material name must be unique.', None
        return None, MaterialAdminSerializer(item).data

    @staticmethod
    def deactivate_material(material_id):
        """Soft-delete a material by marking it inactive."""
        updated = Material.objects.filter(id=material_id).update(is_active=False)
        return (None, {'id': material_id}) if updated else ('Not found', None)

    @staticmethod
    def search_active_materials(query, limit=5):
        """Partial name search across active materials."""
        items = Material.objects.filter(is_active=True, name__icontains=query).order_by('name')[:limit]
        return MaterialCustomerSerializer(items, many=True).data


class DietyRepository:
    @staticmethod
    def get_all_deities_list():
        """Return all deities (active + inactive) serialized for the Admin dashboard."""
        items = Diety.objects.all().order_by('name')
        return None, DietyAdminSerializer(items, many=True).data

    @staticmethod
    def get_all_active_deities_list():
        """Return only active deities serialized for customer-facing endpoints."""
        items = Diety.objects.filter(is_active=True).order_by('name')
        return None, DietyCustomerSerializer(items, many=True).data

    @staticmethod
    def get_deity_by_id(deity_id):
        """Return a single deity by its primary key."""
        item = Diety.objects.filter(id=deity_id).first()
        return (None, DietyAdminSerializer(item).data) if item else ('Not found', None)

    @staticmethod
    def create_deity(data):
        """Create a new deity record, validating and associating the given category IDs."""
        categories = data.pop('categories', [])
        if len(set(categories)) != Category.objects.filter(id__in=categories).count():
            return 'One or more categories do not exist.', None
        try:
            with transaction.atomic():
                item = Diety.objects.create(**data)
                item.categories.set(categories)
        except IntegrityError:
            return 'Deity name must be unique.', None
        return None, DietyAdminSerializer(item).data

    @staticmethod
    def update_deity(deity_id, data):
        """Apply a partial update to a deity record, re-syncing category associations when supplied."""
        categories = data.pop('categories', None)
        if categories is not None and len(set(categories)) != Category.objects.filter(id__in=categories).count():
            return 'One or more categories do not exist.', None
        item = Diety.objects.filter(id=deity_id).first()
        if not item:
            return 'Not found', None
        for key, value in data.items():
            setattr(item, key, value)
        try:
            with transaction.atomic():
                item.save()
                if categories is not None:
                    item.categories.set(categories)
        except IntegrityError:
            return 'Deity name must be unique.', None
        return None, DietyAdminSerializer(item).data

    @staticmethod
    def deactivate_deity(deity_id):
        """Soft-delete a deity by marking it inactive."""
        updated = Diety.objects.filter(id=deity_id).update(is_active=False)
        return (None, {'id': deity_id}) if updated else ('Not found', None)

    @staticmethod
    def search_active_deities(query, limit=5):
        """Partial name search across active deities."""
        items = Diety.objects.filter(is_active=True, name__icontains=query).order_by('name')[:limit]
        return DietyCustomerSerializer(items, many=True).data
