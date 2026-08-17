from django.urls import path
from .views.admin_views import AdminFAQListView, AdminFAQDetailView

urlpatterns = [
    path('', AdminFAQListView.as_view(), name='admin-faq-list'),
    path('/<int:faq_id>', AdminFAQDetailView.as_view(), name='admin-faq-detail'),
]
