from django.urls import path
from .views.admin_views import AdminReviewDetailView, AdminReviewView

urlpatterns = [
    path('', AdminReviewView.as_view(), name='admin-reviews'),
    path('/<int:review_id>', AdminReviewDetailView.as_view(), name='admin-review-detail'),
]
