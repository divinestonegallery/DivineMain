from django.urls import include, path

# Admin lead routes without importing the full admin URLconf.
# The product admin URLs import the optional Gemini client at import time.
urlpatterns = [
    path('api/admin/staff', include('app.accounts.urls_admin')),
    path('api/admin/users', include('app.accounts.urls_users')),
    path('api/admin/leads', include('app.leads.urls_admin')),
    path('api/admin/notifications', include('app.leads.urls_notifications')),
    path('api/integrations/google-ads', include('app.integrations.google_ads.urls')),
]
