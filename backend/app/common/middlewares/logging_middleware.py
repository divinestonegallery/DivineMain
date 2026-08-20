import logging
import uuid

from app.common.repositories import OperationsRepository

logger = logging.getLogger(__name__)


class ObservabilityMiddleware:
    """Attach a request ID and persist only safe operational metadata."""

    MUTATING_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = uuid.uuid4()
        request.request_id = request_id
        exception_type = ''
        exception_message = ''

        try:
            response = self.get_response(request)
        except Exception as exc:
            exception_type = exc.__class__.__name__
            exception_message = str(exc)[:1000]
            self._write_error(request, request_id, 500, exception_type, exception_message)
            raise

        response['X-Request-ID'] = str(request_id)
        actor = getattr(request, 'user', None)
        if not getattr(actor, 'is_authenticated', False):
            actor = None

        if (
            request.path.startswith('/api/admin/')
            and request.method in self.MUTATING_METHODS
            and actor is not None
            and getattr(actor, 'role', None) in {'staff', 'admin'}
        ):
            try:
                OperationsRepository.write_audit({
                    'actor': actor,
                    'request_id': request_id,
                    'method': request.method,
                    'path': request.path[:500],
                    'status_code': response.status_code,
                    'ip_address': request.META.get('REMOTE_ADDR'),
                })
            except Exception:
                logger.exception('Unable to persist staff audit log')

        if response.status_code >= 500:
            self._write_error(
                request,
                request_id,
                response.status_code,
                exception_type or 'HTTPServerError',
                exception_message or 'Request returned a server error',
            )
        return response

    @staticmethod
    def _write_error(request, request_id, status_code, error_type, message):
        actor = getattr(request, 'user', None)
        if not getattr(actor, 'is_authenticated', False):
            actor = None
        try:
            OperationsRepository.write_error({
                'actor': actor,
                'request_id': request_id,
                'method': request.method,
                'path': request.path[:500],
                'status_code': status_code,
                'error_type': error_type[:150],
                'message': message[:1000],
                'ip_address': request.META.get('REMOTE_ADDR'),
            })
        except Exception:
            logger.exception('Unable to persist API error log')
