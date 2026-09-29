from django.urls import path

from .views.operations_views import APIErrorLogListView, AuditLogListView

urlpatterns = [
    path("/audit-logs", AuditLogListView.as_view(), name="audit-log-list"),
    path("/error-logs", APIErrorLogListView.as_view(), name="api-error-log-list"),
]
