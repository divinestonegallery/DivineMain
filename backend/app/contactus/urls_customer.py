from django.urls import path
from .views.customer_views import ContactMessageView, CustomizeRequestView

urlpatterns = [
    path('/message', ContactMessageView.as_view(), name='contact-message'),
    path('/customize', CustomizeRequestView.as_view(), name='customize-request'),
]
