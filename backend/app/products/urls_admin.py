from django.urls import path
from .views.admin_views import (
    AdminProductCreateView, AdminProductDetailView,
    AdminCategoryListCreateView, AdminCategoryDetailView,
    AdminMaterialListCreateView, AdminMaterialDetailView,
    AdminDietyListCreateView, AdminDietyDetailView,
    AdminProductImageListCreateView, AdminProductImageDetailView,
    AdminProductImageReorderView,
)

urlpatterns = [
    # Products
    path('', AdminProductCreateView.as_view(), name='admin-product-create'),
    path('/<int:product_id>', AdminProductDetailView.as_view(), name='admin-product-detail'),
    path('/<int:product_id>/images', AdminProductImageListCreateView.as_view(), name='admin-product-images'),
    path('/<int:product_id>/images/reorder', AdminProductImageReorderView.as_view(), name='admin-product-images-reorder'),
    path('/<int:product_id>/images/<int:image_id>', AdminProductImageDetailView.as_view(), name='admin-product-image-detail'),

    # Categories
    path('/categories', AdminCategoryListCreateView.as_view(), name='admin-category-list'),
    path('/categories/<int:category_id>', AdminCategoryDetailView.as_view(), name='admin-category-detail'),

    # Materials
    path('/materials', AdminMaterialListCreateView.as_view(), name='admin-material-list'),
    path('/materials/<int:material_id>', AdminMaterialDetailView.as_view(), name='admin-material-detail'),

    # Deities
    path('/deities', AdminDietyListCreateView.as_view(), name='admin-deity-list'),
    path('/deities/<int:diety_id>', AdminDietyDetailView.as_view(), name='admin-deity-detail'),
]
