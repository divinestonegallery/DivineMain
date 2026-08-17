import logging
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied
from django.db import DatabaseError
from rest_framework.exceptions import APIException,status

logger = logging.getLogger(__name__)

class ExceptionMiddleware:
    """
    Custom middleware to catch uncaught exceptions and return a structured response.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        """
        This method is called for every request before the view is called.
        It wraps the view execution and handles exceptions before returning the response.
        """
        try:
            response = self.get_response(request)
        except PermissionDenied as exc:
            response = self.handle_permission_denied(exc)
        except DatabaseError as exc:
            response = self.handle_database_error(exc)
        except APIException as exc:
            response = self.handle_api_exception(exc)
        except Exception as exc:
            response = self.handle_generic_exception(exc)

        return response

    def handle_permission_denied(self,exc):
        logger.error(f"Permission Denied: {exc}")
        return JsonResponse(
            {"detail": "You do not have permission to perform this action."},
            status=status.HTTP_403_FORBIDDEN
        )

    def handle_database_error(self,exc):
        logger.error(f"Database Error: {exc}")
        return JsonResponse(
            {"detail": "Internal Server Error. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    def handle_api_exception(self,exc):
        logger.error(f"APIException: {exc}")
        return JsonResponse(
            {"detail": str(exc)},
            status=exc.status_code
        )

    def handle_generic_exception(self,exc):
        logger.error(f"Uncaught Exception: {exc}")
        return JsonResponse(
            #{"detail": "An unexpected error occurred. Please try again later."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )