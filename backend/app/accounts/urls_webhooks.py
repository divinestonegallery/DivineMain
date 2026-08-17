from django.urls import path
from .views.webhook_views import ClerkWebhookView

urlpatterns = [
    path('/clerk', ClerkWebhookView.as_view(), name='webhook-clerk'),
]
