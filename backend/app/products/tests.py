import json
from types import SimpleNamespace
from unittest.mock import call, patch

from django.test import SimpleTestCase, override_settings

from app.products.services.ai_service import AIService, AIServiceError
from app.products.views.admin_ai_views import AdminProductGenerateDraftView


@override_settings(GEMINI_API_KEY='unit-test-key', GEMINI_MODEL='gemini-test-model')
class AIServiceTests(SimpleTestCase):
    def test_generate_draft_returns_structured_rate_limit_error(self):
        request = SimpleNamespace(data={'mode': 'ai'})
        provider_error = AIServiceError(
            'AI_RATE_LIMITED',
            'AI generation is temporarily rate limited. Please try again shortly.',
            429,
            retryable=True,
        )

        with patch(
            'app.products.views.admin_ai_views.AIService.generate_product_draft',
            side_effect=provider_error,
        ):
            response = AdminProductGenerateDraftView().post(request)

        payload = json.loads(response.content)
        self.assertEqual(response.status_code, 429)
        self.assertFalse(payload['success'])
        self.assertEqual(payload['error']['code'], 'AI_RATE_LIMITED')
        self.assertTrue(payload['error']['retryable'])

    def test_generate_draft_returns_structured_validation_error(self):
        request = SimpleNamespace(data={})

        response = AdminProductGenerateDraftView().post(request)

        payload = json.loads(response.content)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(payload['error']['code'], 'VALIDATION_ERROR')
        self.assertFalse(payload['error']['retryable'])

    def test_generate_draft_success_keeps_existing_data_envelope(self):
        request = SimpleNamespace(data={'mode': 'ai'})
        generated = {'name': 'Generated product', 'description': 'Generated copy'}

        with patch(
            'app.products.views.admin_ai_views.AIService.generate_product_draft',
            return_value=(None, generated),
        ):
            response = AdminProductGenerateDraftView().post(request)

        payload = json.loads(response.content)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(payload['success'])
        self.assertEqual(payload['data'], generated)

    @patch('app.products.services.ai_service.time.sleep')
    @patch('app.products.services.ai_service.genai.GenerativeModel')
    @patch('app.products.services.ai_service.genai.configure')
    def test_retries_transient_rate_limit_with_bounded_backoff(
        self, configure, generative_model, sleep
    ):
        response = SimpleNamespace(text='{"name": "Test product"}')
        model = generative_model.return_value
        model.generate_content.side_effect = [
            RuntimeError('429 RESOURCE_EXHAUSTED temporary rate limit'),
            RuntimeError('429 RESOURCE_EXHAUSTED temporary rate limit'),
            response,
        ]

        error, generated = AIService.generate_product_draft(
            'Test product', None, None, None, None, []
        )

        self.assertIsNone(error)
        self.assertEqual(generated, {'name': 'Test product'})
        self.assertEqual(model.generate_content.call_count, 3)
        self.assertEqual(sleep.call_args_list, [call(1), call(2)])

    @patch('app.products.services.ai_service.time.sleep')
    @patch('app.products.services.ai_service.genai.GenerativeModel')
    @patch('app.products.services.ai_service.genai.configure')
    def test_permanent_quota_failure_is_not_retried(
        self, configure, generative_model, sleep
    ):
        model = generative_model.return_value
        model.generate_content.side_effect = RuntimeError(
            '429 RESOURCE_EXHAUSTED Quota exceeded for metric '
            'generate_content_free_tier_requests limit: 5'
        )

        with self.assertRaises(AIServiceError) as context:
            AIService.generate_product_draft('Test product', None, None, None, None, [])

        self.assertEqual(context.exception.code, 'AI_QUOTA_EXCEEDED')
        self.assertEqual(context.exception.status_code, 429)
        self.assertFalse(context.exception.retryable)
        self.assertEqual(model.generate_content.call_count, 1)
        sleep.assert_not_called()

    @patch('app.products.services.ai_service.time.sleep')
    @patch('app.products.services.ai_service.genai.GenerativeModel')
    @patch('app.products.services.ai_service.genai.configure')
    def test_transient_rate_limit_stops_after_three_attempts(
        self, configure, generative_model, sleep
    ):
        model = generative_model.return_value
        model.generate_content.side_effect = RuntimeError(
            '429 RESOURCE_EXHAUSTED temporary rate limit'
        )

        with self.assertRaises(AIServiceError) as context:
            AIService.generate_product_draft('Test product', None, None, None, None, [])

        self.assertEqual(context.exception.code, 'AI_RATE_LIMITED')
        self.assertEqual(context.exception.status_code, 429)
        self.assertTrue(context.exception.retryable)
        self.assertEqual(model.generate_content.call_count, 3)
        self.assertEqual(sleep.call_count, 2)