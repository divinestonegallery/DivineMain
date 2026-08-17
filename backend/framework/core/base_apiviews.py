from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from app.common.authentication import ClerkAuthentication

class BaseAPIView(APIView):
    """Base API View for all views"""
    pass

class AuthenticatedAPIView(APIView):
    """API View that requires user authentication"""
    authentication_classes = [ClerkAuthentication]

class OpenAPIView(APIView):
    """Public API View without authentication - useful for webhooks"""
    authentication_classes = []
    permission_classes = [AllowAny]

class ServiceAuthenticatedAPIView(APIView):
    """
    For V1, we rely on ClerkAuthentication.
    (Kept name for compatibility with Nexus conventions)
    """
    authentication_classes = [ClerkAuthentication]
