from app.products.repositories.product_repository import (
    CategoryRepository,
    DietyRepository,
    MaterialRepository,
    ProductRepository,
)


class ProductCustomerService:
    @staticmethod
    def get_product_listing(params):
        return None, ProductRepository.list_public(params)

    @staticmethod
    def get_product_details(slug):
        product = ProductRepository.get_public(slug)
        return (None, product) if product else ('Product not found', None)


class CategoryCustomerService:
    list_active = staticmethod(CategoryRepository.get_active)


class MaterialCustomerService:
    list_active = staticmethod(MaterialRepository.get_active)


class DietyCustomerService:
    list_active = staticmethod(DietyRepository.get_active)
