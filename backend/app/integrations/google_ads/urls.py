from django.urls import path

from app.integrations.google_ads.views import GoogleAdsLeadWebhookView

urlpatterns = [
    path('/lead-webhook', GoogleAdsLeadWebhookView.as_view(), name='google-ads-lead-webhook'),
]
