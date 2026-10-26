from django.urls import path

from app.accounts.views.admin_views import PromoteEmployeeView, UserListView

urlpatterns = [
    path('', UserListView.as_view(), name='admin-user-list'),
    path('/<int:user_id>/employee', PromoteEmployeeView.as_view(), name='admin-user-promote'),
]
