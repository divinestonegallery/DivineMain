from app.products.repositories.product_repository import ProductRepository
from app.products.models import Category, Diety
from app.products.serializers.customer import ProductCardSerializer
from app.applicationmodule.serializers import CategoryCardSerializer

class SearchService:
    @staticmethod
    def global_search(query):
        try:
            # 1. Search Products
            products_qs = ProductRepository.search_products(search_query=query)[:20]
            products = ProductCardSerializer(products_qs, many=True).data

            # 2. Search Categories
            categories_qs = Category.objects.filter(is_active=True, name__icontains=query)[:5]
            categories = CategoryCardSerializer(categories_qs, many=True).data

            # 3. Search Dieties (just returning matched names/slugs for frontend redirect)
            dieties_qs = Diety.objects.filter(is_active=True, name__icontains=query)[:5]
            dieties = [{"id": d.id, "name": d.name, "slug": d.slug} for d in dieties_qs]

            data = {
                "products": products,
                "categories": categories,
                "dieties": dieties
            }
            return None, data
        except Exception as e:
            return str(e), None
