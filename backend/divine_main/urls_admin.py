from django.urls import include, path

from app.common.views.operations_views import ReadinessView
from divine_main.views import HealthCheckView

urlpatterns = [
    path('api/v1/health', HealthCheckView.as_view(), name='health'),
    path('api/v1/health/ready', ReadinessView.as_view(), name='readiness'),
    path('api/v1/auth', include('app.accounts.urls_auth_admin')),

    path('api/admin/products', include('app.products.urls_admin')),
    path('api/admin/reviews', include('app.reviews.urls_admin')),
    path('api/admin/contact', include('app.contactus.urls_admin')),
    path('api/admin/faqs', include('app.faq.urls_admin')),
    path('api/admin/staff', include('app.accounts.urls_admin')),
    path('api/admin/users', include('app.accounts.urls_users')),
    path('api/webhooks/accounts', include('app.accounts.urls_webhooks')),
    path('api/admin/leads', include('app.leads.urls_admin')),
    path('api/admin/notifications', include('app.leads.urls_notifications')),
    path('api/admin/orders', include('app.orders.urls_admin')),
    path('api/admin/operations', include('app.common.urls_admin')),
    path('api/integrations/google-ads', include('app.integrations.google_ads.urls')),
]
