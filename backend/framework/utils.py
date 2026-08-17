from framework.core.responses import ErrorResponse
from django.http import JsonResponse
from rest_framework import status

def get_response(response, error_message=None):
    """
    Standardize the return of Response objects to Django JsonResponse.
    """
    if not response:
        response = ErrorResponse(message=error_message)
        return JsonResponse(response.dict, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Return the dictionary format with the corresponding status code
    return JsonResponse(response.dict, status=response.status_code)
