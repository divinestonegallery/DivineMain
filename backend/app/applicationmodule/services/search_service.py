from app.products.repositories.product_repository import CategoryRepository, DietyRepository, ProductRepository


class SearchService:
    @staticmethod
    def global_search(query):
        return None, {
            'products': ProductRepository.search_public(query, limit=20),
            'categories': CategoryRepository.search_active(query, limit=5),
            'deities': DietyRepository.search_active(query, limit=5),
        }
