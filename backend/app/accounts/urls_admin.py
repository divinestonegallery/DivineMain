from django.urls import path

from app.accounts.views.admin_views import StaffDetailView, StaffListCreateView

urlpatterns = [
    path('', StaffListCreateView.as_view(), name='admin-staff-list-create'),
    path('/<int:customer_id>', StaffDetailView.as_view(), name='admin-staff-detail'),
]
