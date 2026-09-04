from django.urls import path

from app.accounts.views.admin_views import StaffView

urlpatterns = [
    path('', StaffView.as_view(), name='admin-staff-list-create'),
    path('/<int:customer_id>', StaffView.as_view(), name='admin-staff-detail'),
]
