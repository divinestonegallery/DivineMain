from django.urls import path

from app.leads.views.api import NotificationListView, NotificationReadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='admin-notification-list'),
    path('/<int:notification_id>/read', NotificationReadView.as_view(), name='admin-notification-read'),
]
