from django.urls import path

from app.orders.views.admin_views import AdminOrderDetailView, AdminOrderListView

urlpatterns = [
    path('', AdminOrderListView.as_view(), name='admin-orders-list'),
    path('/<str:uid>', AdminOrderDetailView.as_view(), name='admin-orders-detail'),
]
