import logging

from django.db import IntegrityError, transaction
from django.db.models import Count, F, OuterRef, Prefetch, Q, Subquery, Window
from django.db.models.functions import RowNumber

from app.products.enums import ProductStatus
from app.products.models import (
    Category, CategoryImage, Diety, DietyImage,
    Image, Material, Product, ProductImage, ProductVariant,
)
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
    images = ProductImage.objects.select_related('image').order_by('display_order', 'id')
    variants = ProductVariant.objects.order_by('display_order', 'id')
    queryset = Product.objects.select_related(
        'category', 'category__category_image__image',
        'material',
        'diety', 'diety__diety_image__image',
    ).prefetch_related(
        Prefetch('images', queryset=images),
        Prefetch('variants', queryset=variants),
    )
    if public:
        queryset = queryset.filter(
            status=ProductStatus.ACTIVE.value,
            is_active=True,
            category__is_active=True,
            material__is_active=True,
        ).filter(
            Q(diety__isnull=True) | Q(diety__is_active=True)
        )
    return queryset


class ProductRepository:
    @staticmethod
    def get_admin_product_list(params):
        queryset = _product_queryset()
        queryset = ProductRepository._apply_filters(queryset, params, include_status=True)
        queryset = ProductRepository._apply_sort(queryset, params['sort'])
        return _pagination(queryset, params['page'], params['page_size'], ProductAdminSerializer)

    @staticmethod
    def get_product_list(filters=None, sort='display_order', offset=0, limit=24):
        try:
            filters = filters or {}
            cover_photo = ProductImage.objects.filter(
                product_id=OuterRef('pk'),
                cover_photo=True,
            ).order_by('display_order', 'id').values('image__image_url')[:1]
            active_variant_price = ProductVariant.objects.filter(
                product_id=OuterRef('pk'),
                is_active=True,
            ).order_by('display_order', 'id').values('price_before_gst')[:1]
            queryset = Product.objects.select_related('category', 'material', 'diety').filter(
                status=ProductStatus.ACTIVE.value,
                is_active=True,
                category__is_active=True,
                material__is_active=True,
            ).filter(
                Q(diety__isnull=True) | Q(diety__is_active=True)
            )
            queryset = ProductRepository._apply_filters(queryset, filters, include_status=False)
            queryset = queryset.annotate(
                _cover_photo_url=Subquery(cover_photo),
                _variant_price_before_gst=Subquery(active_variant_price),
                _total_items=Window(expression=Count('id')),
            )
            queryset = ProductRepository._apply_sort(queryset, sort)

            rows = list(queryset[offset:offset + limit])
            total_items = rows[0]._total_items if rows else queryset.count()
            return None, {
                'items': ProductCardSerializer(rows, many=True).data,
                'total_items': total_items,
            }
        except Exception as exc:
            logger.exception('ProductRepository.get_product_list failed: %s', exc)
            return 'Failed to fetch products from database.', None

    @staticmethod
    def get_product_details_by_slug(slug):
        try:
            product = _product_queryset(public=True).filter(slug=slug).first()
            if not product:
                return None, None
            return None, ProductDetailSerializer(product).data
        except Exception as exc:
            logger.exception('ProductRepository.get_product_details_by_slug failed: %s', exc)
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
        if params.get('min_price') is not None:
            queryset = queryset.filter(selling_price__gte=params['min_price'])
        if params.get('max_price') is not None:
            queryset = queryset.filter(selling_price__lte=params['max_price'])
        if include_status and params.get('status'):
            queryset = queryset.filter(status=params['status'])
        return queryset

    @staticmethod
    def _apply_sort(queryset, sort):
        annotated = queryset.query.annotations
        if sort == 'price_asc':
            if '_variant_price_before_gst' in annotated:
                return queryset.order_by(F('_variant_price_before_gst').asc(nulls_last=True), 'display_order')
            return queryset.order_by(F('selling_price').asc(nulls_last=True), 'display_order')
        if sort == 'price_desc':
            if '_variant_price_before_gst' in annotated:
                return queryset.order_by(F('_variant_price_before_gst').desc(nulls_last=True), 'display_order')
            return queryset.order_by(F('selling_price').desc(nulls_last=True), 'display_order')
        orders = {
            'newest': ('-created_at',),
            'oldest': ('created_at',),
            'featured': ('-is_featured', 'display_order', '-created_at'),
            'display_order': ('display_order', '-is_featured', '-created_at'),
        }
        return queryset.order_by(*orders.get(sort, orders['display_order']))

    @staticmethod
    def get_admin_product_by_id(product_id):
        product = _product_queryset().filter(id=product_id).first()
        return ProductAdminSerializer(product).data if product else None

    @staticmethod
    def product_exists(product_id):
        return Product.objects.filter(id=product_id).exists()

    @staticmethod
    def get_product_status(product_id):
        return Product.objects.filter(id=product_id).values_list('status', flat=True).first()

    @staticmethod
    def search_public_products(query, limit=20):
        queryset = _product_queryset(public=True).filter(
            Q(name__icontains=query)
            | Q(keywords__icontains=query)
            | Q(short_description__icontains=query)
        ).order_by('-is_featured', 'display_order').distinct()[:limit]
        return ProductCardSerializer(queryset, many=True).data

    @staticmethod
    def taxonomy_is_valid(category_id, material_id, deity_id):
        result = {
            'category': Category.objects.filter(id=category_id, is_active=True).exists(),
            'material': Material.objects.filter(id=material_id, is_active=True).exists(),
        }
        if deity_id is not None:
            result['diety'] = Diety.objects.filter(id=deity_id, is_active=True).exists()
        return result

    @staticmethod
    def create(data):
        data = dict(data)
        data['category_id'] = data.pop('category')
        data['material_id'] = data.pop('material')
        diety_id = data.pop('diety', None)
        data.pop('deity', None)
        data['diety_id'] = diety_id
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
            if key == 'deity':
                product.diety_id = value
            elif key in relation_fields:
                setattr(product, f'{key}_id', value)
            else:
                setattr(product, key, value)
        try:
            with transaction.atomic():
                product.save()
        except IntegrityError:
            return 'A product with the generated URL already exists.', None
        return None, ProductAdminSerializer(_product_queryset().get(id=product.id)).data

    @staticmethod
    def archive(product_id):
        updated = Product.objects.filter(id=product_id).update(
            status=ProductStatus.ARCHIVED.value,
            is_active=False,
        )
        return bool(updated)

    @staticmethod
    def publish_readiness(product_id):
        product = Product.objects.select_related('category', 'material', 'diety').filter(id=product_id).first()
        if not product:
            return None
        diety_active = product.diety is None or product.diety.is_active
        return {
            'status': product.status,
            'sales_mode': product.sales_mode,
            'taxonomy_active': product.category.is_active and product.material.is_active and diety_active,
            'has_cover': ProductImage.objects.filter(product_id=product_id, cover_photo=True).exists(),
            'image_count': ProductImage.objects.filter(product_id=product_id).count(),
        }

    @staticmethod
    def get_home_product_sections(limit_per_deity=5):
        public_products = Product.objects.filter(
            status=ProductStatus.ACTIVE.value,
            is_active=True,
            category__is_active=True,
            material__is_active=True,
        ).filter(
            Q(diety__isnull=True) | Q(diety__is_active=True)
        )
        rank_order = [
            F('is_featured').desc(),
            F('home_page_display_order').asc(),
            F('created_at').desc(),
        ]
        top_by_deity_ids = public_products.annotate(
            _deity_rank=Window(
                expression=RowNumber(),
                partition_by=[F('diety_id')],
                order_by=rank_order,
            ),
        ).filter(_deity_rank__lte=limit_per_deity).values('id')
        home_decor_ids = public_products.filter(category__slug='home-decor').annotate(
            _deity_rank=Window(
                expression=RowNumber(),
                partition_by=[F('diety_id')],
                order_by=rank_order,
            ),
        ).filter(_deity_rank__lte=limit_per_deity).values('id')
        popular_ids = public_products.filter(is_featured=True).order_by(
            'home_page_display_order', '-created_at'
        ).values('id')[:10]
        temple_ids = public_products.filter(category__slug='temple').order_by(
            '-is_featured', 'home_page_display_order', 'id'
        ).values('id')[:10]

        products = list(_product_queryset(public=True).filter(
            Q(id__in=Subquery(popular_ids))
            | Q(id__in=Subquery(temple_ids))
            | Q(id__in=Subquery(top_by_deity_ids))
            | Q(id__in=Subquery(home_decor_ids))
        ))

        popular = sorted(
            (product for product in products if product.is_featured),
            key=lambda product: (product.home_page_display_order, -product.created_at.timestamp()),
        )[:10]
        temples = sorted(
            (product for product in products if product.category.slug == 'temple'),
            key=lambda product: (-int(product.is_featured), product.home_page_display_order, product.id),
        )[:10]

        def grouped(category_slug=None):
            candidates = [
                product for product in products
                if product.diety is not None
                and (category_slug is None or product.category.slug == category_slug)
            ]
            candidates.sort(key=lambda product: (
                product.diety.name.lower(),
                -int(product.is_featured),
                product.home_page_display_order,
                -product.created_at.timestamp(),
            ))
            groups = {}
            for product in candidates:
                items = groups.setdefault(product.diety_id, [])
                if len(items) < limit_per_deity:
                    items.append(product)
            return [
                {
                    'deity_id': items[0].diety_id,
                    'deity_name': items[0].diety.name,
                    'deity_slug': items[0].diety.slug,
                    'products': ProductCardSerializer(items, many=True).data,
                }
                for items in groups.values()
            ]

        return {
            'popular': ProductCardSerializer(popular, many=True).data,
            'temples': ProductCardSerializer(temples, many=True).data,
            'deities': grouped(),
            'home_decors': grouped('home-decor'),
        }


class ProductImageRepository:
    @staticmethod
    def get_image_list(product_id):
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        images = ProductImage.objects.filter(product_id=product_id).select_related('image').order_by('display_order', 'id')
        return None, ProductImageAdminSerializer(images, many=True).data

    @staticmethod
    def get_image_by_id(product_id, image_id):
        image = ProductImage.objects.filter(id=image_id, product_id=product_id).select_related('image').first()
        return ProductImageAdminSerializer(image).data if image else None

    @staticmethod
    def get_image_count(product_id):
        return ProductImage.objects.filter(product_id=product_id).count()

    @staticmethod
    def create_image(product_id, data):
        if not Product.objects.filter(id=product_id).exists():
            return 'Product not found.', None
        try:
            with transaction.atomic():
                image_obj = Image.objects.create(
                    image_url=data['image_url'],
                    object_key=data.get('object_key'),
                    alt_text=data.get('alt_text', ''),
                    content_type=data.get('content_type', ''),
                    file_size=data.get('file_size'),
                    width=data.get('width'),
                    height=data.get('height'),
                )
                if data.get('cover_photo'):
                    ProductImage.objects.filter(product_id=product_id, cover_photo=True).update(cover_photo=False)
                product_image = ProductImage.objects.create(
                    product_id=product_id,
                    image=image_obj,
                    display_order=data.get('display_order', 0),
                    cover_photo=data.get('cover_photo', False),
                )
        except IntegrityError:
            return 'This uploaded image is already attached.', None
        product_image = ProductImage.objects.select_related('image').get(id=product_image.id)
        return None, ProductImageAdminSerializer(product_image).data

    @staticmethod
    def update_image(product_id, image_id, data):
        product_image = ProductImage.objects.filter(
            id=image_id, product_id=product_id
        ).select_related('image').first()
        if not product_image:
            return 'Product image not found.', None
        with transaction.atomic():
            if data.get('cover_photo') is True:
                ProductImage.objects.filter(
                    product_id=product_id, cover_photo=True
                ).exclude(id=image_id).update(cover_photo=False)
            for key in ('display_order', 'cover_photo'):
                if key in data:
                    setattr(product_image, key, data[key])
            product_image.save()
            if 'alt_text' in data:
                product_image.image.alt_text = data['alt_text']
                product_image.image.save(update_fields=['alt_text', 'updated_at'])
        product_image.refresh_from_db()
        return None, ProductImageAdminSerializer(product_image).data

    @staticmethod
    def reorder_images(product_id, image_ids):
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
        product_image = ProductImage.objects.filter(
            id=image_id, product_id=product_id
        ).select_related('image').first()
        if not product_image:
            return False
        was_cover = product_image.cover_photo
        image_obj = product_image.image
        product_image.delete()
        if not ProductImage.objects.filter(image=image_obj).exists():
            image_obj.delete()
        if was_cover:
            replacement = ProductImage.objects.filter(product_id=product_id).order_by('display_order', 'id').first()
            if replacement:
                replacement.cover_photo = True
                replacement.save(update_fields=['cover_photo', 'updated_at'])
        return True


class CategoryRepository:
    @staticmethod
    def get_all_categories_list():
        items = Category.objects.select_related('category_image__image').all().order_by('name')
        return None, CategoryAdminSerializer(items, many=True).data

    @staticmethod
    def get_all_active_categories_list():
        items = Category.objects.select_related('category_image__image').filter(is_active=True).order_by('name')
        return None, CategoryCustomerSerializer(items, many=True).data

    @staticmethod
    def get_category_by_id(category_id):
        item = Category.objects.select_related('category_image__image').filter(id=category_id).first()
        return (None, CategoryAdminSerializer(item).data) if item else ('Not found', None)

    @staticmethod
    def create_category(data):
        try:
            with transaction.atomic():
                item = Category.objects.create(**data)
        except IntegrityError:
            return 'Category name must be unique.', None
        return None, CategoryAdminSerializer(item).data

    @staticmethod
    def update_category(category_id, data):
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
        item = Category.objects.select_related('category_image__image').get(id=category_id)
        return None, CategoryAdminSerializer(item).data

    @staticmethod
    def set_category_image(category_id, image_data):
        category = Category.objects.filter(id=category_id).first()
        if not category:
            return 'Category not found.', None
        with transaction.atomic():
            image_obj = Image.objects.create(
                image_url=image_data['image_url'],
                object_key=image_data.get('object_key'),
                alt_text=image_data.get('alt_text', category.name),
                content_type=image_data.get('content_type', ''),
                file_size=image_data.get('file_size'),
                width=image_data.get('width'),
                height=image_data.get('height'),
            )
            old_link = CategoryImage.objects.filter(category=category).select_related('image').first()
            CategoryImage.objects.filter(category=category).delete()
            CategoryImage.objects.create(category=category, image=image_obj)
            if old_link and not CategoryImage.objects.filter(image=old_link.image).exists():
                old_link.image.delete()
        category = Category.objects.select_related('category_image__image').get(id=category_id)
        return None, CategoryAdminSerializer(category).data

    @staticmethod
    def deactivate_category(category_id):
        updated = Category.objects.filter(id=category_id).update(is_active=False)
        return (None, {'id': category_id}) if updated else ('Not found', None)

    @staticmethod
    def search_active_categories(query, limit=5):
        items = Category.objects.select_related('category_image__image').filter(
            is_active=True, name__icontains=query
        ).order_by('name')[:limit]
        return CategoryCustomerSerializer(items, many=True).data


class MaterialRepository:
    @staticmethod
    def get_all_materials_list():
        items = Material.objects.all().order_by('name')
        return None, MaterialAdminSerializer(items, many=True).data

    @staticmethod
    def get_all_active_materials_list():
        items = Material.objects.filter(is_active=True).order_by('name')
        return None, MaterialCustomerSerializer(items, many=True).data

    @staticmethod
    def get_material_by_id(material_id):
        item = Material.objects.filter(id=material_id).first()
        return (None, MaterialAdminSerializer(item).data) if item else ('Not found', None)

    @staticmethod
    def create_material(data):
        try:
            with transaction.atomic():
                item = Material.objects.create(**data)
        except IntegrityError:
            return 'Material name must be unique.', None
        return None, MaterialAdminSerializer(item).data

    @staticmethod
    def update_material(material_id, data):
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
        updated = Material.objects.filter(id=material_id).update(is_active=False)
        return (None, {'id': material_id}) if updated else ('Not found', None)

    @staticmethod
    def search_active_materials(query, limit=5):
        items = Material.objects.filter(is_active=True, name__icontains=query).order_by('name')[:limit]
        return MaterialCustomerSerializer(items, many=True).data


class DietyRepository:
    @staticmethod
    def get_all_deities_list():
        items = Diety.objects.select_related('diety_image__image').all().order_by('display_order', 'name')
        return None, DietyAdminSerializer(items, many=True).data

    @staticmethod
    def get_all_active_deities_list():
        items = Diety.objects.select_related('diety_image__image').filter(is_active=True).order_by('display_order', 'name')
        return None, DietyCustomerSerializer(items, many=True).data

    @staticmethod
    def get_deity_by_id(deity_id):
        item = Diety.objects.select_related('diety_image__image').filter(id=deity_id).first()
        return (None, DietyAdminSerializer(item).data) if item else ('Not found', None)

    @staticmethod
    def create_deity(data):
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
        item = Diety.objects.select_related('diety_image__image').get(id=deity_id)
        return None, DietyAdminSerializer(item).data

    @staticmethod
    def set_deity_image(deity_id, image_data):
        diety = Diety.objects.filter(id=deity_id).first()
        if not diety:
            return 'Deity not found.', None
        with transaction.atomic():
            image_obj = Image.objects.create(
                image_url=image_data['image_url'],
                object_key=image_data.get('object_key'),
                alt_text=image_data.get('alt_text', diety.name),
                content_type=image_data.get('content_type', ''),
                file_size=image_data.get('file_size'),
                width=image_data.get('width'),
                height=image_data.get('height'),
            )
            old_link = DietyImage.objects.filter(diety=diety).select_related('image').first()
            DietyImage.objects.filter(diety=diety).delete()
            DietyImage.objects.create(diety=diety, image=image_obj)
            if old_link and not DietyImage.objects.filter(image=old_link.image).exists():
                old_link.image.delete()
        diety = Diety.objects.select_related('diety_image__image').get(id=deity_id)
        return None, DietyAdminSerializer(diety).data

    @staticmethod
    def deactivate_deity(deity_id):
        updated = Diety.objects.filter(id=deity_id).update(is_active=False)
        return (None, {'id': deity_id}) if updated else ('Not found', None)

    @staticmethod
    def search_active_deities(query, limit=5):
        items = Diety.objects.select_related('diety_image__image').filter(
            is_active=True, name__icontains=query
        ).order_by('display_order', 'name')[:limit]
        return DietyCustomerSerializer(items, many=True).data
