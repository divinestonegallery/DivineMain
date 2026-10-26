from django.test import TestCase

from app.products.models import Category, Material, Product


class ProductKeywordsRoundTripTests(TestCase):
    """Keywords stay a list on the PostgreSQL array column."""

    def test_empty_and_non_empty_keywords_round_trip(self):
        category = Category.objects.create(name='Keyword Category', slug='keyword-category')
        material = Material.objects.create(name='Keyword Marble', slug='keyword-marble')
        empty = Product.objects.create(
            category=category,
            material=material,
            name='Empty Keywords',
            slug='empty-keywords',
            uid='EMPTYKW01',
            keywords=[],
        )
        filled = Product.objects.create(
            category=category,
            material=material,
            name='Filled Keywords',
            slug='filled-keywords',
            uid='FILLEDKW1',
            keywords=['ganesh', 'marble'],
        )
        empty.refresh_from_db()
        filled.refresh_from_db()
        self.assertEqual(list(empty.keywords), [])
        self.assertEqual(list(filled.keywords), ['ganesh', 'marble'])
