from rest_framework import exceptions, status, views
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = views.exception_handler(exc, context)

    if response is None:
        return None

    if isinstance(exc, (exceptions.AuthenticationFailed, exceptions.NotAuthenticated)):
        response.status_code = status.HTTP_401_UNAUTHORIZED

    original_data = response.data
    if isinstance(original_data, dict) and 'detail' in original_data:
        message = str(original_data['detail'])
        error_data = None
    else:
        message = 'Request validation failed.'
        error_data = original_data

    return Response(
        {
            'success': False,
            'message': message,
            'data': error_data,
        },
        status=response.status_code,
        headers=response.headers,
    )
