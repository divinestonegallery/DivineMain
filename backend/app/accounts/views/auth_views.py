from rest_framework import status

from app.accounts.identity import acting_user_id
from app.accounts.services.auth_service import CUSTOMER_AUTH_ONLY, AuthService
from app.common.authentication import ApplicationAuthentication
from app.accounts.validators import (
    ForgotPasswordValidator,
    LoginValidator,
    RefreshTokenValidator,
    ResetPasswordValidator,
    SignupValidator,
    UpdateProfileValidator,
    VerifySignupValidator,
)
from framework.core.base_apiviews import AuthenticatedAPIView, OpenAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response

_LOGIN_UNAUTHORIZED = (
    'Invalid email or password.',
    'Employee access is required.',
    'User account is inactive.',
    'User account not found.',
)


def _customer_auth_status(error, default):
    if error == CUSTOMER_AUTH_ONLY:
        return 404
    return default


class CustomerApplicationOnlyView(OpenAPIView):
    """Signup and password recovery stay on the customer application."""

    def post(self, request, *args, **kwargs):
        return get_response(ErrorResponse(message=CUSTOMER_AUTH_ONLY, status_code=404))

    def get(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)

    def patch(self, request, *args, **kwargs):
        return self.post(request, *args, **kwargs)


class SignupView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = SignupValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.signup(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=_customer_auth_status(error, 400)))
        return get_response(SuccessResponse(data=data, message=data.get('message', 'User registered successfully'), status_code=status.HTTP_201_CREATED))


class VerifySignupView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = VerifySignupValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.verify_signup(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=_customer_auth_status(error, 400)))
        return get_response(SuccessResponse(data=data, message=data.get('message', 'Account verified successfully'), status_code=status.HTTP_201_CREATED))


class LoginView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = LoginValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.login(validator.validated_data)
        if error:
            unauthorized = error in _LOGIN_UNAUTHORIZED or 'Invalid email' in error or 'inactive' in error or 'not found' in error
            code = status.HTTP_401_UNAUTHORIZED if unauthorized else _customer_auth_status(error, 400)
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
            return get_response(ErrorResponse(message=error, status_code=_customer_auth_status(error, 400)))
        return get_response(SuccessResponse(data=data, message=data.get('message', 'Password reset instructions sent.')))


class ResetPasswordView(OpenAPIView):
    throttle_scope = 'auth'

    def post(self, request):
        validator = ResetPasswordValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Validation failed', err=validator.errors, status_code=400))
        error, data = AuthService.reset_password(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=_customer_auth_status(error, 400)))
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
        error, data = AuthService.get_current_user_profile(acting_user_id(request.user))
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='Current user fetched successfully'))

    def patch(self, request):
        validator = UpdateProfileValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid profile update', err=validator.errors, status_code=400))
        error, data = AuthService.update_profile(acting_user_id(request.user), validator.validated_data)
        if error:
            code = 409 if 'already associated' in error else 404
            return get_response(ErrorResponse(message=error, status_code=code))
        return get_response(SuccessResponse(data=data, message='Profile updated successfully'))


class LogoutView(AuthenticatedAPIView):
    authentication_classes = [ApplicationAuthentication]

    def post(self, request):
        error, data = AuthService.logout(acting_user_id(request.user), token=request.auth)
        return get_response(SuccessResponse(data=data, message='Logged out successfully'))
