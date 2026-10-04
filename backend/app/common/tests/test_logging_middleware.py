from types import SimpleNamespace
from unittest.mock import patch

from django.db import OperationalError
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase

from app.common.middlewares.logging_middleware import ObservabilityMiddleware


class ObservabilityMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.staff_user = SimpleNamespace(is_authenticated=True, role='staff')

    @patch('app.common.middlewares.logging_middleware.OperationsRepository.write_audit')
    def test_audit_failure_does_not_replace_response(self, write_audit):
        write_audit.side_effect = OperationalError('database connection unavailable')
        request = self.factory.post('/api/admin/products/generate-draft')
        request.user = self.staff_user
        response = HttpResponse(status=429)
        middleware = ObservabilityMiddleware(lambda current_request: response)

        with self.assertLogs(
            'app.common.middlewares.logging_middleware', level='WARNING'
        ) as captured:
            result = middleware(request)

        self.assertIs(result, response)
        self.assertEqual(result.status_code, 429)
        self.assertNotIn('database connection unavailable', '\n'.join(captured.output))

    @patch('app.common.middlewares.logging_middleware.OperationsRepository.write_error')
    def test_error_log_failure_does_not_replace_original_exception(self, write_error):
        write_error.side_effect = OperationalError('database connection unavailable')
        request = self.factory.post('/api/admin/products/generate-draft')
        request.user = self.staff_user

        def raise_business_error(_request):
            raise RuntimeError('original request failure')

        middleware = ObservabilityMiddleware(raise_business_error)
        with self.assertLogs(
            'app.common.middlewares.logging_middleware', level='WARNING'
        ) as captured:
            with self.assertRaisesRegex(RuntimeError, 'original request failure'):
                middleware(request)

        self.assertNotIn('database connection unavailable', '\n'.join(captured.output))