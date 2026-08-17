from app.products.models import Product
from django.db.models import Q

class ProductRepository:
    @staticmethod
    def get_all_products():
        return Product.objects.all().order_by('-created_at')

    @staticmethod
    def get_active_products():
        return Product.objects.filter(is_active=True).select_related('category', 'material', 'diety').prefetch_related('images')

    @staticmethod
    def search_products(filters=None, sort_by=None, search_query=None):
        queryset = ProductRepository.get_active_products()

        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(keywords__icontains=search_query) |
                Q(short_description__icontains=search_query)
            )

        if filters:
            if 'category' in filters and filters['category']:
                queryset = queryset.filter(category__slug=filters['category'])
            if 'diety' in filters and filters['diety']:
                queryset = queryset.filter(diety__slug=filters['diety'])
            if 'material' in filters and filters['material']:
                queryset = queryset.filter(material__slug=filters['material'])
            if 'height' in filters and filters['height']:
                queryset = queryset.filter(height__icontains=filters['height'])

        if sort_by:
            if sort_by == 'featured':
                queryset = queryset.order_by('-is_featured', '-created_at')
            elif sort_by == 'height':
                queryset = queryset.order_by('height')
            elif sort_by == 'price':
                queryset = queryset.order_by('selling_price')
            elif sort_by == '-price':
                queryset = queryset.order_by('-selling_price')
            else:
                queryset = queryset.order_by('-created_at')
        else:
            queryset = queryset.order_by('-created_at')

        from app.products.serializers.customer import ProductCardSerializer
        return None, ProductCardSerializer(queryset, many=True).data

    @staticmethod
    def get_product_by_slug(slug):
        product = ProductRepository.get_active_products().filter(slug=slug).first()
        if not product: return "Not found", None
        from app.products.serializers.customer import ProductDetailSerializer
        return None, ProductDetailSerializer(product).data

    @staticmethod
    def get_product_by_id(product_id):
        return Product.objects.filter(id=product_id).first()

    @staticmethod
    def soft_delete_product(product_id):
        product = ProductRepository.get_product_by_id(product_id)
        if product:
            product.is_active = False
            product.save()
            return True
        return False

    @staticmethod
    def get_active_categories():
        from app.products.models import Category
        return Category.objects.filter(is_active=True).order_by('name')

    @staticmethod
    def get_top_products_by_diety(limit_per_diety=5):
        from app.products.models import Diety
        from app.products.serializers.customer import ProductCardSerializer
        dieties = Diety.objects.filter(is_active=True)
        result = []
        for diety in dieties:
            products = ProductRepository.get_active_products().filter(diety=diety).order_by('-is_featured', '-created_at')[:limit_per_diety]
            if products.exists():
                result.append({
                    "diety_id": diety.id,
                    "diety_name": diety.name,
                    "diety_slug": diety.slug,
                    "products": ProductCardSerializer(products, many=True).data
                })
        return result

    @staticmethod
    def get_popular_moorti_data():
        from app.products.serializers.customer import ProductCardSerializer
        products = Product.objects.filter(is_active=True, is_featured=True).order_by('-created_at')[:10]
        return None, ProductCardSerializer(products, many=True).data

    @staticmethod
    def get_dream_temples_data():
        from app.products.serializers.customer import ProductCardSerializer
        products = Product.objects.filter(is_active=True, category__slug='temples').order_by('-is_featured', '-created_at')[:10]
        return None, ProductCardSerializer(products, many=True).data

    @staticmethod
    def get_home_decors_data():
        from app.products.serializers.customer import ProductCardSerializer
        products = Product.objects.filter(is_active=True, category__slug='home-decor').order_by('-is_featured', '-created_at')[:10]
        return None, ProductCardSerializer(products, many=True).data

class BaseRepository:
    model = None
    admin_serializer = None
    customer_serializer = None

    @classmethod
    def get_all(cls):
        items = cls.model.objects.all().order_by('-created_at')
        return None, cls.admin_serializer(items, many=True).data

    @classmethod
    def get_active(cls):
        items = cls.model.objects.filter(is_active=True).order_by('name')
        return None, cls.customer_serializer(items, many=True).data

    @classmethod
    def get_by_id(cls, id):
        item = cls.model.objects.filter(id=id).first()
        if not item: return "Not found", None
        return None, cls.admin_serializer(item).data

    @classmethod
    def create(cls, data):
        item = cls.model.objects.create(**data)
        return None, cls.admin_serializer(item).data

    @classmethod
    def update(cls, id, data):
        item = cls.model.objects.filter(id=id).first()
        if not item: return "Not found", None
        for k, v in data.items():
            setattr(item, k, v)
        item.save()
        return None, cls.admin_serializer(item).data

    @classmethod
    def soft_delete(cls, id):
        item = cls.model.objects.filter(id=id).first()
        if item:
            item.is_active = False
            item.save()
            return None, {"id": id}
        return "Not found", None

from app.products.models import Category, Material, Diety
from app.products.serializers.admin import CategoryAdminSerializer, MaterialAdminSerializer, DietyAdminSerializer
from app.products.serializers.customer import CategoryCustomerSerializer, MaterialCustomerSerializer, DietyCustomerSerializer

class CategoryRepository(BaseRepository):
    model = Category
    admin_serializer = CategoryAdminSerializer
    customer_serializer = CategoryCustomerSerializer

class MaterialRepository(BaseRepository):
    model = Material
    admin_serializer = MaterialAdminSerializer
    customer_serializer = MaterialCustomerSerializer

class DietyRepository(BaseRepository):
    model = Diety
    admin_serializer = DietyAdminSerializer
    customer_serializer = DietyCustomerSerializer

    @classmethod
    def create(cls, data):
        categories_data = data.pop('categories', [])
        item = cls.model.objects.create(**data)
        if categories_data:
            item.categories.set(categories_data)
        return None, cls.admin_serializer(item).data

    @classmethod
    def update(cls, id, data):
        categories_data = data.pop('categories', None)
        item = cls.model.objects.filter(id=id).first()
        if not item: return "Not found", None
        for k, v in data.items():
            setattr(item, k, v)
        if categories_data is not None:
            item.categories.set(categories_data)
        item.save()
        return None, cls.admin_serializer(item).data
