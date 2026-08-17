from django.urls import path
from .views.admin_views import AdminReviewView

urlpatterns = [
    path('', AdminReviewView.as_view(), name='admin-reviews'),
]
