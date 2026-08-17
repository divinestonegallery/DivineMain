from django.urls import path
from .views.home_views import HomeView
from .views.search_views import GlobalSearchView

urlpatterns = [
    path('/home', HomeView.as_view(), name='application-home'),
    path('/search', GlobalSearchView.as_view(), name='application-search'),
]
