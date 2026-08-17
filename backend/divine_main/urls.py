from django.contrib import admin
from django.urls import path, include
from .views import HealthCheckView

urlpatterns = [
    # Global health check for testing deployment and configuration
    path('api/v1/health', HealthCheckView.as_view(), name='health'),
    
    # Customer APIs (v1)
    path('api/v1/products', include('app.products.urls_customer')),
    path('api/v1/reviews', include('app.reviews.urls_customer')),
    path('api/v1/contact', include('app.contactus.urls_customer')),
    path('api/v1/faqs', include('app.faq.urls_customer')),
    path('api/v1/application', include('app.applicationmodule.urls')),
    path('api/v1/common', include('app.common.urls')),

    # Admin APIs
    path('api/admin/products', include('app.products.urls_admin')),
    path('api/admin/reviews', include('app.reviews.urls_admin')),
    path('api/admin/contact', include('app.contactus.urls_admin')),
    path('api/admin/faqs', include('app.faq.urls_admin')),

    # Webhooks
    path('api/webhooks/accounts', include('app.accounts.urls_webhooks')),
]