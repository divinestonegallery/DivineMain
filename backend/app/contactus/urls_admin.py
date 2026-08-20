from django.urls import path
from .views.admin_views import (
    AdminContactMessageDetailView,
    AdminContactMessageView,
    AdminCustomizeRequestDetailView,
    AdminCustomizeRequestView,
)

urlpatterns = [
    path('/message', AdminContactMessageView.as_view(), name='admin-contact-message'),
    path('/message/<int:message_id>', AdminContactMessageDetailView.as_view(), name='admin-contact-message-detail'),
    path('/customize', AdminCustomizeRequestView.as_view(), name='admin-customize-request'),
    path('/customize/<int:request_id>', AdminCustomizeRequestDetailView.as_view(), name='admin-customize-request-detail'),
]
