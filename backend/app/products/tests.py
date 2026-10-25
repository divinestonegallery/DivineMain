import base64
import json
from types import SimpleNamespace
from unittest.mock import patch

import httpx
from django.test import SimpleTestCase, override_settings
from openai import APITimeoutError, AuthenticationError, RateLimitError
from rest_framework.test import APIClient

from app.accounts.models import Customer


@override_settings(REST_FRAMEWORK={'DEFAULT_THROTTLE_CLASSES': ()})
class ProductDraftEndpointTests(SimpleTestCase):
    def setUp(self):
        self.admin = Customer(
            clerk_user_id='product-ai-admin',
            email='product-ai-admin@example.com',
            role=Customer.Role.ADMIN,
            is_active=True,
        )
        self.category_id = 42
        self.material_id = 24
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        audit_patcher = patch(
            'app.common.middlewares.logging_middleware.OperationsRepository.write_audit'
        )
        error_patcher = patch(
            'app.common.middlewares.logging_middleware.OperationsRepository.write_error'
        )
        audit_patcher.start()
        error_patcher.start()
        self.addCleanup(audit_patcher.stop)
        self.addCleanup(error_patcher.stop)

    def post_generation(self, data=None):
        with (
            patch('app.products.views.admin_ai_views.Category.objects.filter') as category_filter,
            patch('app.products.views.admin_ai_views.Material.objects.filter') as material_filter,
        ):
            category_filter.return_value.values_list.return_value.first.return_value = 'Sculptures'
            material_filter.return_value.values_list.return_value.first.return_value = 'Marble'
            return self.client.post(
                '/api/admin/products/generate-draft',
                data or self.request_data(),
                format='json',
            )

    def request_data(self):
        return {
            'mode': 'ai',
            'name': 'Hand-carved Ganesh',
            'category': self.category_id,
            'material': self.material_id,
            'paragraph': 'A hand-carved Ganesh sculpture.',
            'images': [{
                'mime_type': 'image/jpeg',
                'data': base64.b64encode(b'image-bytes').decode('ascii'),
            }],
            'keywords': 'ganesh, marble, ganesh',
        }

    @staticmethod
    def generated_response():
        return {
            'name': 'Model changed title',
            'short_description': 'A Ganesh sculpture.',
            'description': 'A hand-carved Ganesh sculpture made from the provided material.',
            'seo_title': 'Hand-carved Ganesh Sculpture',
            'seo_description': 'Explore this hand-carved Ganesh sculpture.',
            'keywords': ['generated keyword'],
        }

    @staticmethod
    def completion_for(data):
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(content=json.dumps(data)),
                ),
            ],
        )

    @override_settings(OPENAI_API_KEY='test-openai-key', OPENAI_MODEL='gpt-4.1-mini')
    @patch('app.products.services.ai_service.OpenAI')
    def test_generate_draft_returns_validated_content_and_preserves_input(self, openai_client):
        openai_client.return_value.chat.completions.create.return_value = self.completion_for(
            self.generated_response()
        )

        response = self.post_generation()

        self.assertEqual(response.status_code, 200)
        data = response.json()['data']
        self.assertEqual(data['name'], 'Hand-carved Ganesh')
        self.assertEqual(data['category'], self.category_id)
        self.assertEqual(data['material'], self.material_id)
        self.assertEqual(data['keywords'], ['ganesh', 'marble'])
        self.assertEqual(data['seo_title'], self.generated_response()['seo_title'])
        self.assertNotIn('test-openai-key', response.content.decode())
        openai_client.return_value.chat.completions.create.assert_called_once()
        request = openai_client.return_value.chat.completions.create.call_args.kwargs
        self.assertEqual(request['model'], 'gpt-4.1-mini')
        self.assertEqual(
            request['messages'][1]['content'][1]['image_url']['url'],
            'data:image/jpeg;base64,aW1hZ2UtYnl0ZXM=',
        )

    @override_settings(OPENAI_API_KEY='test-openai-key', OPENAI_MODEL='gpt-4.1-mini')
    @patch('app.products.services.ai_service.OpenAI')
    def test_paragraph_mode_generates_a_title(self, openai_client):
        openai_client.return_value.chat.completions.create.return_value = self.completion_for(
            self.generated_response()
        )
        data = self.request_data()
        data.update({'mode': 'paragraph', 'name': ''})

        response = self.post_generation(data)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['data']['name'], 'Model changed title')

    @override_settings(OPENAI_API_KEY='')
    def test_missing_key_returns_safe_configuration_error(self):
        response = self.post_generation()

        self.assertEqual(response.status_code, 503)
        self.assertIn('not configured', response.json()['message'])

    @override_settings(OPENAI_API_KEY='invalid-key')
    @patch('app.products.services.ai_service.OpenAI')
    def test_invalid_key_is_reported_without_provider_details(self, openai_client):
        request = httpx.Request('POST', 'https://api.openai.com/v1/chat/completions')
        provider_response = httpx.Response(401, request=request)
        openai_client.side_effect = AuthenticationError(
            'invalid API key', response=provider_response, body=None
        )

        response = self.post_generation()

        self.assertEqual(response.status_code, 503)
        self.assertNotIn('invalid API key', response.content.decode())
        self.assertNotIn('invalid-key', response.content.decode())

    @override_settings(OPENAI_API_KEY='test-openai-key')
    @patch('app.products.services.ai_service.OpenAI')
    def test_rate_limit_returns_retryable_error(self, openai_client):
        request = httpx.Request('POST', 'https://api.openai.com/v1/chat/completions')
        provider_response = httpx.Response(429, request=request)
        openai_client.side_effect = RateLimitError(
            'rate limited', response=provider_response, body=None
        )

        response = self.post_generation()

        self.assertEqual(response.status_code, 429)
        self.assertIn('wait and try again', response.json()['message'])

    @override_settings(OPENAI_API_KEY='test-openai-key')
    @patch('app.products.services.ai_service.OpenAI')
    def test_timeout_returns_retryable_error(self, openai_client):
        request = httpx.Request('POST', 'https://api.openai.com/v1/chat/completions')
        openai_client.side_effect = APITimeoutError(request=request)

        response = self.post_generation()

        self.assertEqual(response.status_code, 504)
        self.assertIn('timed out', response.json()['message'])

    @override_settings(OPENAI_API_KEY='test-openai-key')
    @patch('app.products.services.ai_service.OpenAI')
    def test_malformed_model_json_returns_safe_error(self, openai_client):
        openai_client.return_value.chat.completions.create.return_value = (
            self.completion_for({})
        )
        openai_client.return_value.chat.completions.create.return_value.choices[0].message.content = (
            'not json'
        )

        response = self.post_generation()

        self.assertEqual(response.status_code, 502)
        self.assertIn('invalid product draft', response.json()['message'])

    @override_settings(OPENAI_API_KEY='')
    @patch('app.products.services.admin_service.ProductRepository.taxonomy_is_valid')
    @patch('app.products.services.admin_service.ProductRepository.create')
    def test_manual_product_creation_does_not_require_openai(self, create_product, taxonomy_valid):
        taxonomy_valid.return_value = {'category': True, 'material': True}
        create_product.return_value = (
            None,
            {'id': 1, 'seo_title': 'Manual sculpture SEO title'},
        )
        with patch('app.products.services.ai_service.OpenAI') as openai_client:
            response = self.client.post(
                '/api/admin/products',
                {
                    'name': 'Manual marble sculpture',
                    'category': self.category_id,
                    'material': self.material_id,
                    'keywords': 'marble, handmade, marble',
                    'seo_title': 'Manual sculpture SEO title',
                    'seo_description': 'A manually written product description for search.',
                },
                format='json',
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['data']['seo_title'], 'Manual sculpture SEO title')
        self.assertEqual(
            create_product.call_args.args[0]['keywords'],
            ['marble', 'handmade'],
        )
        openai_client.assert_not_called()
