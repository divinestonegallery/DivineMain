from django.urls import path

from app.accounts.views.auth_views import (
    CustomerApplicationOnlyView,
    LoginView,
    LogoutView,
    RefreshTokenView,
)

urlpatterns = [
    path('/signup', CustomerApplicationOnlyView.as_view(), name='admin-auth-signup'),
    path('/verify-signup', CustomerApplicationOnlyView.as_view(), name='admin-auth-verify-signup'),
    path('/login', LoginView.as_view(), name='admin-auth-login'),
    path('/forgot-password', CustomerApplicationOnlyView.as_view(), name='admin-auth-forgot-password'),
    path('/reset-password', CustomerApplicationOnlyView.as_view(), name='admin-auth-reset-password'),
    path('/refresh', RefreshTokenView.as_view(), name='admin-auth-refresh'),
    path('/profile', CustomerApplicationOnlyView.as_view(), name='admin-auth-profile'),
    path('/logout', LogoutView.as_view(), name='admin-auth-logout'),
]
