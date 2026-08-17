from app.products.repositories.product_repository import ProductRepository
from app.products.serializers.admin import ProductAdminSerializer

class ProductAdminService:
    @staticmethod
    def list_products():
        try:
            products = ProductRepository.get_all_products()
            serializer = ProductAdminSerializer(products, many=True)
            return None, serializer.data
        except Exception as e:
            return str(e), None

    @staticmethod
    def get_product(product_id):
        try:
            product = ProductRepository.get_product_by_id(product_id)
            if not product:
                return "Product not found", None
            serializer = ProductAdminSerializer(product)
            return None, serializer.data
        except Exception as e:
            return str(e), None

    @staticmethod
    def create_product(data):
        try:
            serializer = ProductAdminSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return None, serializer.data
            return serializer.errors, None
        except Exception as e:
            return str(e), None

    @staticmethod
    def update_product(product_id, data):
        try:
            product = ProductRepository.get_product_by_id(product_id)
            if not product:
                return "Product not found", None
            
            serializer = ProductAdminSerializer(product, data=data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return None, serializer.data
            return serializer.errors, None
        except Exception as e:
            return str(e), None

    @staticmethod
    def soft_delete_product(product_id):
        try:
            if ProductRepository.soft_delete_product(product_id):
                return None, {"id": product_id}
            return "Product not found", None
        except Exception as e:
            return str(e), None

class CategoryAdminService:
    @staticmethod
    def list_categories():
        from app.products.repositories.product_repository import CategoryRepository
        return CategoryRepository.get_all()

    @staticmethod
    def create_category(data):
        from app.products.repositories.product_repository import CategoryRepository
        return CategoryRepository.create(data)

    @staticmethod
    def get_category(id):
        from app.products.repositories.product_repository import CategoryRepository
        return CategoryRepository.get_by_id(id)

    @staticmethod
    def update_category(id, data):
        from app.products.repositories.product_repository import CategoryRepository
        return CategoryRepository.update(id, data)

    @staticmethod
    def soft_delete_category(id):
        from app.products.repositories.product_repository import CategoryRepository
        return CategoryRepository.soft_delete(id)


class MaterialAdminService:
    @staticmethod
    def list_materials():
        from app.products.repositories.product_repository import MaterialRepository
        return MaterialRepository.get_all()

    @staticmethod
    def create_material(data):
        from app.products.repositories.product_repository import MaterialRepository
        return MaterialRepository.create(data)

    @staticmethod
    def get_material(id):
        from app.products.repositories.product_repository import MaterialRepository
        return MaterialRepository.get_by_id(id)

    @staticmethod
    def update_material(id, data):
        from app.products.repositories.product_repository import MaterialRepository
        return MaterialRepository.update(id, data)

    @staticmethod
    def soft_delete_material(id):
        from app.products.repositories.product_repository import MaterialRepository
        return MaterialRepository.soft_delete(id)


class DietyAdminService:
    @staticmethod
    def list_dieties():
        from app.products.repositories.product_repository import DietyRepository
        return DietyRepository.get_all()

    @staticmethod
    def create_diety(data):
        from app.products.repositories.product_repository import DietyRepository
        return DietyRepository.create(data)

    @staticmethod
    def get_diety(id):
        from app.products.repositories.product_repository import DietyRepository
        return DietyRepository.get_by_id(id)

    @staticmethod
    def update_diety(id, data):
        from app.products.repositories.product_repository import DietyRepository
        return DietyRepository.update(id, data)

    @staticmethod
    def soft_delete_diety(id):
        from app.products.repositories.product_repository import DietyRepository
        return DietyRepository.soft_delete(id)
