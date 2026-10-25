from django.urls import path

from app.accounts.views.admin_views import StaffDetailView, StaffListView
from app.leads.views.api import (
    StaffGroupCollectionView,
    StaffGroupDetailView,
    StaffMembershipCollectionView,
    StaffMembershipDetailView,
)

urlpatterns = [
    path('', StaffListView.as_view(), name='admin-staff-list-create'),
    path('/groups', StaffGroupCollectionView.as_view(), name='admin-staff-groups'),
    path('/groups/<int:group_id>', StaffGroupDetailView.as_view(), name='admin-staff-group-detail'),
    path('/memberships', StaffMembershipCollectionView.as_view(), name='admin-staff-memberships'),
    path('/memberships/<int:membership_id>', StaffMembershipDetailView.as_view(), name='admin-staff-membership-detail'),
    path('/<int:customer_id>', StaffDetailView.as_view(), name='admin-staff-detail'),
]
