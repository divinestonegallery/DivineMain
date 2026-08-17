from django.urls import path
from .views.customer_views import CustomerFAQListView

urlpatterns = [
    path('', CustomerFAQListView.as_view(), name='customer-faq-list'),
]
