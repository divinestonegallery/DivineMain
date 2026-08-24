import logging
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse

from framework.core.base_apiviews import OpenAPIView, AuthenticatedAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response

from app.accounts.services.auth_service import AuthService
from app.accounts.validators import (
    SignupValidator,
    LoginValidator,
    ForgotPasswordValidator,
    ResetPasswordValidator,
    RefreshTokenValidator,
)

logger = logging.getLogger(__name__)


class SignupView(OpenAPIView):
    """
    Register a new customer account using Clerk as the identity store.
    Issues JWT access & refresh tokens immediately upon registration.
    """
    throttle_scope = 'auth'
    serializer_class = SignupValidator

    @extend_schema(
        summary="Register customer",
        description="Creates a new customer account in Clerk and local database, returning JWT token pair.",
        request=SignupValidator,
        responses={
            201: OpenApiResponse(description="User registered successfully"),
            400: OpenApiResponse(description="Validation error or duplicate account"),
        },
    )
    def post(self, request):
        validator = SignupValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='Validation failed',
                err=validator.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        error, data = AuthService.signup(validator.validated_data)
        if error:
            return get_response(ErrorResponse(
                message=error,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        return get_response(SuccessResponse(
            data=data,
            message='User registered successfully',
            status_code=status.HTTP_201_CREATED,
        ))


class LoginView(OpenAPIView):
    """
    Authenticate a customer with email and password via Clerk.
    Returns JWT access & refresh tokens upon successful verification.
    """
    throttle_scope = 'auth'
    serializer_class = LoginValidator

    @extend_schema(
        summary="Customer login",
        description="Verifies credentials via Clerk and returns JWT access & refresh tokens.",
        request=LoginValidator,
        responses={
            200: OpenApiResponse(description="Login successful"),
            401: OpenApiResponse(description="Invalid credentials or inactive account"),
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request):
        validator = LoginValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='Validation failed',
                err=validator.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        error, data = AuthService.login(validator.validated_data)
        if error:
            status_code = status.HTTP_401_UNAUTHORIZED if (
                'Invalid email' in error or 'inactive' in error or 'not found' in error
            ) else status.HTTP_400_BAD_REQUEST
            return get_response(ErrorResponse(
                message=error,
                status_code=status_code,
            ))

        return get_response(SuccessResponse(
            data=data,
            message='Logged in successfully',
            status_code=status.HTTP_200_OK,
        ))


class ForgotPasswordView(OpenAPIView):
    """
    Initiate password reset request for a customer email.
    """
    throttle_scope = 'auth'
    serializer_class = ForgotPasswordValidator

    @extend_schema(
        summary="Forgot password",
        description="Generates a password reset token for the given account email.",
        request=ForgotPasswordValidator,
        responses={
            200: OpenApiResponse(description="Reset instructions generated"),
            400: OpenApiResponse(description="Validation error"),
        },
    )
    def post(self, request):
        validator = ForgotPasswordValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='Validation failed',
                err=validator.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        error, data = AuthService.forgot_password(validator.validated_data)
        if error:
            return get_response(ErrorResponse(
                message=error,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        return get_response(SuccessResponse(
            data=data,
            message=data.get('message', 'Password reset instructions sent.'),
            status_code=status.HTTP_200_OK,
        ))


class ResetPasswordView(OpenAPIView):
    """
    Reset account password using a validated password reset token.
    Updates the credential directly in Clerk.
    """
    throttle_scope = 'auth'
    serializer_class = ResetPasswordValidator

    @extend_schema(
        summary="Reset password",
        description="Resets the user's password in Clerk using a valid reset token.",
        request=ResetPasswordValidator,
        responses={
            200: OpenApiResponse(description="Password reset successful"),
            400: OpenApiResponse(description="Invalid token or password format"),
        },
    )
    def post(self, request):
        validator = ResetPasswordValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='Validation failed',
                err=validator.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        error, data = AuthService.reset_password(validator.validated_data)
        if error:
            return get_response(ErrorResponse(
                message=error,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        return get_response(SuccessResponse(
            data=data,
            message=data.get('message', 'Password reset successfully.'),
            status_code=status.HTTP_200_OK,
        ))


class RefreshTokenView(OpenAPIView):
    """
    Exchange a valid refresh token for a fresh pair of access and refresh tokens.
    """
    throttle_scope = 'auth'
    serializer_class = RefreshTokenValidator

    @extend_schema(
        summary="Refresh access token",
        description="Issues fresh access and refresh tokens given a valid refresh token.",
        request=RefreshTokenValidator,
        responses={
            200: OpenApiResponse(description="Tokens refreshed successfully"),
            401: OpenApiResponse(description="Invalid or expired refresh token"),
        },
    )
    def post(self, request):
        validator = RefreshTokenValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='Validation failed',
                err=validator.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))

        error, data = AuthService.refresh_token(validator.validated_data)
        if error:
            return get_response(ErrorResponse(
                message=error,
                status_code=status.HTTP_401_UNAUTHORIZED,
            ))

        return get_response(SuccessResponse(
            data=data,
            message='Token refreshed successfully',
            status_code=status.HTTP_200_OK,
        ))


class CurrentUserView(AuthenticatedAPIView):
    """
    Retrieve current authenticated customer profile.
    """
    @extend_schema(
        summary="Get current user",
        description="Returns the profile details of the authenticated customer.",
        responses={
            200: OpenApiResponse(description="Current user profile"),
            401: OpenApiResponse(description="Unauthorized"),
        },
    )
    def get(self, request):
        error, data = AuthService.get_me(request.user.id)
        if error:
            return get_response(ErrorResponse(
                message=error,
                status_code=status.HTTP_404_NOT_FOUND,
            ))

        return get_response(SuccessResponse(
            data=data,
            message='Current user fetched successfully',
            status_code=status.HTTP_200_OK,
        ))


class LogoutView(AuthenticatedAPIView):
    """
    Log out customer and invalidate session.
    """
    @extend_schema(
        summary="Log out",
        description="Invalidates current authenticated user session.",
        responses={
            200: OpenApiResponse(description="Logged out successfully"),
            401: OpenApiResponse(description="Unauthorized"),
        },
    )
    def post(self, request):
        error, data = AuthService.logout(request.user.id)
        return get_response(SuccessResponse(
            data=data,
            message='Logged out successfully',
            status_code=status.HTTP_200_OK,
        ))
