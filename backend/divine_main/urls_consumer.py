from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from app.common.views.operations_views import ReadinessView
from divine_main.views import HealthCheckView

urlpatterns = [
    path('api/v1/health', HealthCheckView.as_view(), name='health'),
    path('api/v1/health/ready', ReadinessView.as_view(), name='readiness'),
    path('api/schema', SpectacularAPIView.as_view(), name='api-schema'),
    path('api/docs', SpectacularSwaggerView.as_view(url_name='api-schema'), name='api-docs'),

    path('api/v1/auth', include('app.accounts.urls_auth')),
    path('api/v1/products', include('app.products.urls_customer')),
    path('api/v1/reviews', include('app.reviews.urls_customer')),
    path('api/v1/contact', include('app.contactus.urls_customer')),
    path('api/v1/faqs', include('app.faq.urls_customer')),
    path('api/v1/application', include('app.applicationmodule.urls')),
    path('api/v1/orders', include('app.orders.urls_customer')),

    path('api/webhooks/accounts', include('app.accounts.urls_webhooks')),
]
