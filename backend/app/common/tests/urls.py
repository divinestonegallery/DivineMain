from django.urls import include, path

# These workflow tests call admin and consumer routes in the same process.
# Production keeps those surfaces on separate deployments. This module is
# imported only by the test classes below it.
urlpatterns = [
    path('', include('divine_main.urls_admin')),
    path('', include('divine_main.urls_consumer')),
]
