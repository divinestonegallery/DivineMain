from django.urls import path
from .views.customer_views import CustomerProductReviewListView, CustomerReviewCreateView

urlpatterns = [
    path('/product/<int:product_id>', CustomerProductReviewListView.as_view(), name='customer-review-list'),
    path('', CustomerReviewCreateView.as_view(), name='customer-review-create'),
]
