from django.urls import path
from .views.admin_views import (
    AdminProductCreateView, AdminProductDetailView,
    AdminCategoryListCreateView, AdminCategoryDetailView,
    AdminMaterialListCreateView, AdminMaterialDetailView,
    AdminDietyListCreateView, AdminDietyDetailView
)

urlpatterns = [
    # Products
    path('', AdminProductCreateView.as_view(), name='admin-product-create'),
    path('/<int:product_id>', AdminProductDetailView.as_view(), name='admin-product-detail'),
    
    # Categories
    path('/categories', AdminCategoryListCreateView.as_view(), name='admin-category-list'),
    path('/categories/<int:category_id>', AdminCategoryDetailView.as_view(), name='admin-category-detail'),

    # Materials
    path('/materials', AdminMaterialListCreateView.as_view(), name='admin-material-list'),
    path('/materials/<int:material_id>', AdminMaterialDetailView.as_view(), name='admin-material-detail'),

    # Dieties
    path('/dieties', AdminDietyListCreateView.as_view(), name='admin-diety-list'),
    path('/dieties/<int:diety_id>', AdminDietyDetailView.as_view(), name='admin-diety-detail'),
]
