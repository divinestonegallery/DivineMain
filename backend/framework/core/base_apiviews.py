from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics, serializers
from app.common.authentication import ApplicationAuthentication
from app.common.permissions import IsAdmin, IsStaffOrAdmin


class EmptySerializer(serializers.Serializer):
    """Schema fallback for endpoints with envelope-only responses."""


class BaseAPIView(generics.GenericAPIView):
    """Base API View for all views"""
    serializer_class = EmptySerializer

class AuthenticatedAPIView(BaseAPIView):
    """API View that requires user authentication"""
    authentication_classes = [ApplicationAuthentication]
    permission_classes = [IsAuthenticated]

class OpenAPIView(BaseAPIView):
    """Public API View without authentication - useful for webhooks"""
    authentication_classes = []
    permission_classes = [AllowAny]


class OptionalAuthenticatedAPIView(BaseAPIView):
    """Public endpoint that resolves a valid authenticated user when a token is supplied."""

    authentication_classes = [ApplicationAuthentication]
    permission_classes = [AllowAny]

class AdminAPIView(BaseAPIView):
    """API View restricted to active staff and administrators."""

    authentication_classes = [ApplicationAuthentication]
    permission_classes = [IsAuthenticated, IsStaffOrAdmin]


class ServiceAuthenticatedAPIView(AdminAPIView):
    """Deprecated compatibility alias. New admin views should use AdminAPIView."""

    pass


class OwnerAPIView(BaseAPIView):
    """API View restricted to active administrators."""

    authentication_classes = [ApplicationAuthentication]
    permission_classes = [IsAuthenticated, IsAdmin]
