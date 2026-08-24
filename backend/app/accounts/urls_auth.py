from django.urls import path
from app.accounts.views.auth_views import (
    SignupView,
    LoginView,
    ForgotPasswordView,
    ResetPasswordView,
    RefreshTokenView,
    CurrentUserView,
    LogoutView,
)

urlpatterns = [
    path('/signup', SignupView.as_view(), name='auth-signup'),
    path('/login', LoginView.as_view(), name='auth-login'),
    path('/forgot-password', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('/reset-password', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('/refresh', RefreshTokenView.as_view(), name='auth-refresh'),
    path('/me', CurrentUserView.as_view(), name='auth-me'),
    path('/logout', LogoutView.as_view(), name='auth-logout'),
]
