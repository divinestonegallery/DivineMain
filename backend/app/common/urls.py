from django.urls import path
from .views.upload_views import PresignedUrlView

urlpatterns = [
    path("/upload/presigned-url", PresignedUrlView.as_view(), name="presigned-url"),
]