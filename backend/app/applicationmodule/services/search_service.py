from app.products.repositories.product_repository import CategoryRepository, DietyRepository, ProductRepository


class SearchService:
    @staticmethod
    def global_search(query):
        return None, {
            'products': ProductRepository.search_public_products(query, limit=5),
            'categories': CategoryRepository.search_active_categories(query, limit=5),
            'deities': DietyRepository.search_active_deities(query, limit=5),
        }
