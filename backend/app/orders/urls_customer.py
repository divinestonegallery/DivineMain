from django.urls import path

from app.orders.views.customer_views import (
    CustomerOrderCancelView,
    CustomerOrderDetailView,
    CustomerOrderListCreateView,
    PaymentVerifyView,
)

urlpatterns = [
    path('', CustomerOrderListCreateView.as_view(), name='customer-orders-list-create'),
    path('/payment/verify', PaymentVerifyView.as_view(), name='customer-payment-verify'),
    path('/<str:uid>', CustomerOrderDetailView.as_view(), name='customer-order-detail'),
    path('/<str:uid>/cancel', CustomerOrderCancelView.as_view(), name='customer-order-cancel'),
]
