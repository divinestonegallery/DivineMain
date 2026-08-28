from rest_framework import status

from app.accounts.services.auth_service import AuthService
from app.accounts.validators import (
    ForgotPasswordValidator,
    LoginValidator,
    RefreshTokenValidator,
    ResetPasswordValidator,
    SignupValidator,
)
from framework.core.base_apiviews import AuthenticatedAPIView, OpenAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class SignupView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = SignupValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.signup(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='User registered successfully', status_code=status.HTTP_201_CREATED))


class LoginView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = LoginValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.login(validator.validated_data)
        if error:
            code = status.HTTP_401_UNAUTHORIZED if ('Invalid email' in error or 'inactive' in error or 'not found' in error) else 400
            return get_response(ErrorResponse(message=error, status_code=code))
        return get_response(SuccessResponse(data=data, message='Logged in successfully'))


class ForgotPasswordView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = ForgotPasswordValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.forgot_password(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message=data.get('message', 'Password reset instructions sent.')))


class ResetPasswordView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = ResetPasswordValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.reset_password(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message=data.get('message', 'Password reset successfully.')))


class RefreshTokenView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = RefreshTokenValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.refresh_token(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=status.HTTP_401_UNAUTHORIZED))
        return get_response(SuccessResponse(data=data, message='Token refreshed successfully'))


class CurrentProfileView(AuthenticatedAPIView):
    def get(self, request):
        error, data = AuthService.get_current_user_profile(request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='Current user fetched successfully'))


class LogoutView(AuthenticatedAPIView):
    def post(self, request):
        error, data = AuthService.logout(request.user.id)
        return get_response(SuccessResponse(data=data, message='Logged out successfully'))
