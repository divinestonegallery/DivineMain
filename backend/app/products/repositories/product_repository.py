from django.conf import settings
from django.db import IntegrityError, transaction
from django.db import models
from django.db.models import Min, Prefetch, Q

from app.products.models import Category, Diety, Material, Product, ProductImage, ProductVariant
from app.products.serializers.admin import (
    CategoryAdminSerializer,
    DietyAdminSerializer,
    MaterialAdminSerializer,
    ProductAdminSerializer,
    ProductImageAdminSerializer,
    ProductVariantAdminSerializer,
)
from app.products.serializers.customer import (
    CategoryCustomerSerializer,
    DietyCustomerSerializer,
    MaterialCustomerSerializer,
    ProductCardSerializer,
    ProductDetailSerializer,
)


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
    variants = ProductVariant.objects.order_by('display_order', 'id')
    if public:
        variants = variants.filter(is_active=True)
    queryset = Product.objects.select_related('category', 'material', 'diety').prefetch_related(
        Prefetch('images', queryset=images),
        Prefetch('variants', queryset=variants),
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
    def list_admin(params):
        queryset = _product_queryset()
        queryset = ProductRepository._apply_filters(queryset, params, include_status=True)
        queryset = ProductRepository._apply_sort(queryset, params['sort'])
        return _pagination(queryset, params['page'], params['page_size'], ProductAdminSerializer)

    @staticmethod
    def list_public(params):
        queryset = _product_queryset(public=True)
        queryset = ProductRepository._apply_filters(queryset, params, include_status=False)
        queryset = ProductRepository._apply_sort(queryset, params['sort']).distinct()
        return _pagination(queryset, params['page'], params['page_size'], ProductCardSerializer)

    @staticmethod
    def _apply_filters(queryset, params, include_status):
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(keywords__icontains=search)
                | Q(short_description__icontains=search)
                | Q(uid__icontains=search)
                | Q(variants__sku__icontains=search)
            )
        if params.get('category'):
            queryset = queryset.filter(category__slug=params['category'])
        if params.get('material'):
            queryset = queryset.filter(material__slug=params['material'])
        if params.get('deity'):
            queryset = queryset.filter(diety__slug=params['deity'])
        if params.get('availability'):
            if include_status:
                queryset = queryset.filter(availability=params['availability'])
            else:
                queryset = queryset.filter(
                    variants__availability=params['availability'],
                    variants__is_active=True,
                )
        if include_status and params.get('status'):
            queryset = queryset.filter(status=params['status'])
        if params.get('min_price') is not None:
            queryset = queryset.filter(variants__price_before_gst__gte=params['min_price'], variants__is_active=True)
        if params.get('max_price') is not None:
            queryset = queryset.filter(variants__price_before_gst__lte=params['max_price'], variants__is_active=True)
        return queryset.distinct()

    @staticmethod
    def _apply_sort(queryset, sort):
        if sort in {'price_asc', 'price_desc'}:
            queryset = queryset.annotate(
                minimum_price=Min('variants__price_before_gst', filter=Q(variants__is_active=True))
            )
            price_order = (
                models.F('minimum_price').asc(nulls_last=True)
                if sort == 'price_asc'
                else models.F('minimum_price').desc(nulls_last=True)
            )
            return queryset.order_by(price_order, 'id')
        orders = {
            'newest': ('-created_at',),
            'oldest': ('created_at',),
            'featured': ('-is_featured', 'display_order', '-created_at'),
            'display_order': ('display_order', '-is_featured', '-created_at'),
        }
        return queryset.order_by(*orders.get(sort, orders['display_order']))

    @staticmethod
    def get_admin(product_id):
        product = _product_queryset().filter(id=product_id).first()
        return ProductAdminSerializer(product).data if product else None

    @staticmethod
    def get_public(slug):
        product = _product_queryset(public=True).filter(slug=slug).first()
        return ProductDetailSerializer(product).data if product else None

    @staticmethod
    def search_public(query, limit=20):
        queryset = _product_queryset(public=True).filter(
            Q(name__icontains=query)
            | Q(keywords__icontains=query)
            | Q(short_description__icontains=query)
            | Q(variants__sku__icontains=query)
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
        variants = list(
            ProductVariant.objects.filter(product_id=product_id, is_active=True).values(
                'id', 'name', 'sku', 'price_before_gst', 'gst_rate', 'stock_quantity',
                'availability', 'sculpture_height_inches', 'sculpture_width_inches',
                'sculpture_depth_inches', 'min_weight_kg', 'max_weight_kg',
                'packed_length_inches', 'packed_width_inches', 'packed_height_inches',
            )
        )
        return {
            'status': product.status,
            'sales_mode': product.sales_mode,
            'taxonomy_active': product.category.is_active and product.material.is_active and product.diety.is_active,
            'has_cover': ProductImage.objects.filter(product_id=product_id, cover_photo=True).exists(),
            'image_count': ProductImage.objects.filter(product_id=product_id).count(),
            'variants': variants,
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
    def get_home_decors_data():
        products = _product_queryset(public=True).filter(category__slug='home-decor').order_by('-is_featured', 'display_order')[:10]
        return None, ProductCardSerializer(products, many=True).data


class ProductVariantRepository:
    @staticmethod
    def list(product_id):
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        variants = ProductVariant.objects.filter(product_id=product_id).order_by('display_order', 'id')
        return None, ProductVariantAdminSerializer(variants, many=True).data

    @staticmethod
    def get(product_id, variant_id):
        variant = ProductVariant.objects.filter(id=variant_id, product_id=product_id).first()
        return ProductVariantAdminSerializer(variant).data if variant else None

    @staticmethod
    def create(product_id, data):
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        try:
            with transaction.atomic():
                variant = ProductVariant.objects.create(product_id=product_id, **data)
        except IntegrityError:
            return 'Variant name and SKU must be unique.', None
        return None, ProductVariantAdminSerializer(variant).data

    @staticmethod
    def update(product_id, variant_id, data):
        variant = ProductVariant.objects.filter(id=variant_id, product_id=product_id).first()
        if not variant:
            return 'Variant not found.', None
        for key, value in data.items():
            setattr(variant, key, value)
        try:
            with transaction.atomic():
                variant.save()
        except IntegrityError:
            return 'Variant name and SKU must be unique.', None
        return None, ProductVariantAdminSerializer(variant).data

    @staticmethod
    def delete(product_id, variant_id):
        deleted, _ = ProductVariant.objects.filter(id=variant_id, product_id=product_id).delete()
        return bool(deleted)

    @staticmethod
    def active_purchase_candidates(product_id, exclude_id=None, replacement=None):
        queryset = ProductVariant.objects.filter(product_id=product_id, is_active=True)
        if exclude_id is not None:
            queryset = queryset.exclude(id=exclude_id)
        candidates = list(queryset.values(
            'id', 'price_before_gst', 'gst_rate', 'stock_quantity', 'availability',
            'sculpture_height_inches', 'sculpture_width_inches',
            'sculpture_depth_inches', 'min_weight_kg', 'max_weight_kg',
            'packed_length_inches', 'packed_width_inches', 'packed_height_inches',
            'is_active',
        ))
        if replacement and replacement.get('is_active', True):
            candidates.append(replacement)
        return candidates


class ProductImageRepository:
    @staticmethod
    def list(product_id):
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        images = ProductImage.objects.filter(product_id=product_id).order_by('display_order', 'id')
        return None, ProductImageAdminSerializer(images, many=True).data

    @staticmethod
    def get(product_id, image_id):
        image = ProductImage.objects.filter(id=image_id, product_id=product_id).first()
        return ProductImageAdminSerializer(image).data if image else None

    @staticmethod
    def count(product_id):
        return ProductImage.objects.filter(product_id=product_id).count()

    @staticmethod
    def create(product_id, data):
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
    def update(product_id, image_id, data):
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
    def reorder(product_id, image_ids):
        existing = list(ProductImage.objects.filter(product_id=product_id).values_list('id', flat=True))
        if set(existing) != set(image_ids):
            return 'Provide every product image exactly once.', None
        with transaction.atomic():
            ProductImage.objects.bulk_update(
                [ProductImage(id=image_id, display_order=index) for index, image_id in enumerate(image_ids)],
                ['display_order'],
            )
        return ProductImageRepository.list(product_id)

    @staticmethod
    def delete_record(product_id, image_id):
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


class BaseTaxonomyRepository:
    model = None
    admin_serializer = None
    customer_serializer = None

    @classmethod
    def get_all(cls):
        items = cls.model.objects.all().order_by('name')
        return None, cls.admin_serializer(items, many=True).data

    @classmethod
    def get_active(cls):
        items = cls.model.objects.filter(is_active=True).order_by('name')
        return None, cls.customer_serializer(items, many=True).data

    @classmethod
    def get_by_id(cls, item_id):
        item = cls.model.objects.filter(id=item_id).first()
        return (None, cls.admin_serializer(item).data) if item else ('Not found', None)

    @classmethod
    def create(cls, data):
        try:
            with transaction.atomic():
                item = cls.model.objects.create(**data)
        except IntegrityError:
            return f'{cls.model.__name__} name must be unique.', None
        return None, cls.admin_serializer(item).data

    @classmethod
    def update(cls, item_id, data):
        item = cls.model.objects.filter(id=item_id).first()
        if not item:
            return 'Not found', None
        for key, value in data.items():
            setattr(item, key, value)
        try:
            with transaction.atomic():
                item.save()
        except IntegrityError:
            return f'{cls.model.__name__} name must be unique.', None
        return None, cls.admin_serializer(item).data

    @classmethod
    def soft_delete(cls, item_id):
        updated = cls.model.objects.filter(id=item_id).update(is_active=False)
        return (None, {'id': item_id}) if updated else ('Not found', None)

    @classmethod
    def search_active(cls, query, limit=5):
        items = cls.model.objects.filter(is_active=True, name__icontains=query).order_by('name')[:limit]
        return cls.customer_serializer(items, many=True).data


class CategoryRepository(BaseTaxonomyRepository):
    model = Category
    admin_serializer = CategoryAdminSerializer
    customer_serializer = CategoryCustomerSerializer


class MaterialRepository(BaseTaxonomyRepository):
    model = Material
    admin_serializer = MaterialAdminSerializer
    customer_serializer = MaterialCustomerSerializer


class DietyRepository(BaseTaxonomyRepository):
    model = Diety
    admin_serializer = DietyAdminSerializer
    customer_serializer = DietyCustomerSerializer

    @classmethod
    def create(cls, data):
        categories = data.pop('categories', [])
        if len(set(categories)) != Category.objects.filter(id__in=categories).count():
            return 'One or more categories do not exist.', None
        error, result = super().create(data)
        if error:
            return error, result
        item = cls.model.objects.get(id=result['id'])
        item.categories.set(categories)
        return None, cls.admin_serializer(item).data

    @classmethod
    def update(cls, item_id, data):
        categories = data.pop('categories', None)
        if categories is not None and len(set(categories)) != Category.objects.filter(id__in=categories).count():
            return 'One or more categories do not exist.', None
        error, result = super().update(item_id, data)
        if error:
            return error, result
        if categories is not None:
            item = cls.model.objects.get(id=item_id)
            item.categories.set(categories)
            result = cls.admin_serializer(item).data
        return None, result
