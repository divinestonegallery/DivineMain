from app.products.repositories.product_repository import ProductRepository
from app.products.serializers.customer import ProductCardSerializer, ProductDetailSerializer

class ProductCustomerService:
    @staticmethod
    def get_product_listing(query_params):
        try:
            search_query = query_params.get('search')
            sort_by = query_params.get('sort')
            filters = {
                'category': query_params.get('category'),
                'diety': query_params.get('diety'),
                'material': query_params.get('material'),
                'height': query_params.get('height')
            }

            error, data = ProductRepository.search_products(filters=filters, sort_by=sort_by, search_query=search_query)
            return error, data
        except Exception as e:
            return str(e), None

    @staticmethod
    def get_product_details(slug):
        try:
            product = ProductRepository.get_product_by_slug(slug)
            error, data = ProductRepository.get_product_by_slug(slug)
            return error, data
        except Exception as e:
            return str(e), None

class CategoryCustomerService:
    @staticmethod
    def list_active():
        from app.products.repositories.product_repository import CategoryRepository
        return CategoryRepository.get_active()

class MaterialCustomerService:
    @staticmethod
    def list_active():
        from app.products.repositories.product_repository import MaterialRepository
        return MaterialRepository.get_active()

class DietyCustomerService:
    @staticmethod
    def list_active():
        from app.products.repositories.product_repository import DietyRepository
        return DietyRepository.get_active()
