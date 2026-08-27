from django.urls import path
from .views.customer_views import (
    ProductListingView,
    ProductDetailView,
    CustomerCategoryListView,
    CustomerMaterialListView,
    CustomerDietyListView,
)

urlpatterns = [
    path('', ProductListingView.as_view(), name='product-list'),
    path('/categories', CustomerCategoryListView.as_view(), name='customer-category-list'),
    path('/materials', CustomerMaterialListView.as_view(), name='customer-material-list'),
    path('/deities', CustomerDietyListView.as_view(), name='customer-deity-list'),
    path('/<slug:slug>', ProductDetailView.as_view(), name='product-detail'),
]
