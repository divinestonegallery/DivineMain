from django.urls import path

from app.leads.views.api import (
    LeadAccessView,
    LeadActivityListView,
    LeadAssigneeListView,
    LeadAssignmentView,
    LeadCollectionView,
    LeadDetailView,
    LeadNoteCreateView,
)

urlpatterns = [
    path('/access', LeadAccessView.as_view(), name='admin-lead-access'),
    path('/assignees', LeadAssigneeListView.as_view(), name='admin-lead-assignees'),
    path('', LeadCollectionView.as_view(), name='admin-lead-list'),
    path('/<uuid:lead_uid>', LeadDetailView.as_view(), name='admin-lead-detail'),
    path('/<uuid:lead_uid>/notes', LeadNoteCreateView.as_view(), name='admin-lead-notes'),
    path('/<uuid:lead_uid>/assignment', LeadAssignmentView.as_view(), name='admin-lead-assignment'),
    path('/<uuid:lead_uid>/activity', LeadActivityListView.as_view(), name='admin-lead-activity'),
]
