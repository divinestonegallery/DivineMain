from django.urls import path
from .views.admin_views import AdminContactMessageView, AdminCustomizeRequestView

urlpatterns = [
    path('/message', AdminContactMessageView.as_view(), name='admin-contact-message'),
    path('/customize', AdminCustomizeRequestView.as_view(), name='admin-customize-request'),
]
