from django.urls import path
from .views.upload_views import CustomizationPresignedUrlView, PresignedUrlView
from .views.operations_views import APIErrorLogListView, AuditLogListView

urlpatterns = [
    # DEPRECATED: Use POST /products/images/upload-url instead.
    path("/upload/presigned-url", PresignedUrlView.as_view(), name="presigned-url"),
    # DEPRECATED: Use POST /customize/upload-url instead.
    path("/upload/customization-url", CustomizationPresignedUrlView.as_view(), name="customization-presigned-url"),
    path("/operations/audit-logs", AuditLogListView.as_view(), name="audit-log-list"),
    path("/operations/error-logs", APIErrorLogListView.as_view(), name="api-error-log-list"),
]
