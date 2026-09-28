import base64
import json
from unittest.mock import Mock, patch

import requests
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from app.accounts.models import Customer
from app.products.models import Category, Diety, Material, Product
from app.products.services.ai_draft_service import generate_product_draft


class ProductAIDraftTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = Customer.objects.create(
            clerk_user_id='ai-draft-admin',
            email='ai-draft-admin@example.com',
            role=Customer.Role.ADMIN,
        )
        self.category = Category.objects.create(name='Sculpture')
        self.material = Material.objects.create(name='Green Stone')
        self.deity = Diety.objects.create(name='Sample Deity')
        self.payload = {
            'name': 'Temple Sculpture',
            'category_id': self.category.id,
            'material_id': self.material.id,
            'deity_id': self.deity.id,
            'image_base64': base64.b64encode(b'image-bytes').decode(),
            'image_mime_type': 'image/jpeg',
        }
        self.generated = {
            'short_description': 'A stone sculpture.',
            'description': 'A factual catalogue description.',
            'keywords': ['stone', 'sculpture'],
            'availability': 'made_to_order',
            'sales_mode': 'quote_only',
            'height': '',
            'min_weight': '',
            'max_weight': '',
        }

    @staticmethod
    def provider_response(generated=None):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {
            'candidates': [{'content': {'parts': [{'text': json.dumps(generated or {})}]}}],
        }
        response.raise_for_status.return_value = None
        return response

    @override_settings(GEMINI_API_KEY='test-server-key', GEMINI_MODEL='models/gemini-test-flash')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_endpoint_returns_draft_and_does_not_create_product(self, post):
        post.return_value = self.provider_response(self.generated)
        self.client.force_authenticate(user=self.admin)

        response = self.client.post('/api/admin/products/generate-draft', self.payload, format='json')

        self.assertEqual(response.status_code, 200, response.content)
        draft = response.json()['data']
        self.assertEqual(draft['status'], 'draft')
        self.assertEqual(draft['name'], self.payload['name'])
        self.assertEqual(draft['category'], self.category.id)
        self.assertEqual(draft['material'], self.material.id)
        self.assertEqual(draft['deity'], self.deity.id)
        self.assertNotIn('test-server-key', response.content.decode())
        self.assertFalse(Product.objects.exists())
        self.assertEqual(
            post.call_args.args[0],
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-test-flash:generateContent',
        )
        self.assertEqual(post.call_args.kwargs['headers']['x-goog-api-key'], 'test-server-key')
        self.assertEqual(post.call_args.kwargs['headers']['Content-Type'], 'application/json')
        self.assertNotIn('test-server-key', json.dumps(post.call_args.kwargs['json']))
        self.assertEqual(post.call_args.kwargs['timeout'], 45)
        request_parts = post.call_args.kwargs['json']['contents'][0]['parts']
        self.assertIn('deity: Sample Deity', request_parts[0]['text'])
        self.assertIn('category: Sculpture', request_parts[0]['text'])
        self.assertIn('material: Green Stone', request_parts[0]['text'])
        self.assertEqual(request_parts[1]['inline_data']['data'], self.payload['image_base64'])

    @override_settings(GEMINI_API_KEY='')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_missing_api_key_does_not_call_provider(self, post):
        error, draft = generate_product_draft(self.payload)
        self.assertEqual(error, 'AI product generation is not configured on the server. Set GEMINI_API_KEY and restart the backend.')
        self.assertIsNone(draft)
        post.assert_not_called()

    @override_settings(GEMINI_API_KEY='test-server-key', GEMINI_MODEL='models/')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_invalid_configured_model_does_not_silently_fallback(self, post):
        error, draft = generate_product_draft(self.payload)
        self.assertEqual(error, 'The configured Gemini model is invalid. Please check GEMINI_MODEL.')
        self.assertIsNone(draft)
        post.assert_not_called()

    @override_settings(GEMINI_API_KEY='test-server-key', GEMINI_MODEL='')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_default_model_and_data_url_mime_types(self, post):
        post.return_value = self.provider_response(self.generated)
        for mime_type in ('image/jpeg', 'image/png', 'image/webp'):
            with self.subTest(mime_type=mime_type):
                payload = {**self.payload, 'image_mime_type': mime_type}
                payload['image_base64'] = f'data:{mime_type};base64,{self.payload["image_base64"]}'
                error, _draft = generate_product_draft(payload)
                self.assertIsNone(error)
                sent_image = post.call_args.kwargs['json']['contents'][0]['parts'][1]['inline_data']
                self.assertEqual(sent_image, {'mime_type': mime_type, 'data': self.payload['image_base64']})
        self.assertIn('/models/gemini-3.8-flash:generateContent', post.call_args.args[0])

    @override_settings(GEMINI_API_KEY='test-server-key')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_invalid_image_or_classification_never_calls_provider(self, post):
        invalid_cases = (
            ({**self.payload, 'image_base64': '%%%not-base64%%%'}, 'Product image data is invalid.'),
            ({**self.payload, 'image_base64': ''}, 'Product image data is invalid.'),
            ({key: value for key, value in self.payload.items() if key != 'image_base64'}, 'Product image data is invalid.'),
            ({**self.payload, 'image_mime_type': 'image/gif'}, 'Unsupported product image format.'),
            ({**self.payload, 'image_base64': 'data:image/png;base64,' + self.payload['image_base64']}, 'Product image data is invalid.'),
            ({**self.payload, 'category_id': 999999}, 'selected category is invalid'),
            ({**self.payload, 'material_id': 999999}, 'selected material is invalid'),
            ({**self.payload, 'deity_id': 999999}, 'selected deity is invalid'),
        )
        for payload, expected in invalid_cases:
            with self.subTest(expected=expected):
                error, draft = generate_product_draft(payload)
                self.assertIn(expected.lower(), error.lower())
                self.assertIsNone(draft)
        post.assert_not_called()

    @override_settings(GEMINI_API_KEY='test-server-key')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_missing_deity_is_allowed_and_output_is_sanitized(self, post):
        generated = {
            **self.generated,
            'short_description': 'x' * 550,
            'description': 123,
            'keywords': ['k' * 130, '', *[f'keyword-{index}' for index in range(10)]],
            'availability': [],
            'sales_mode': [],
            'height': None,
            'min_weight': 12,
            'max_weight': {'unsupported': 'value'},
        }
        post.return_value = self.provider_response(generated)
        payload = {**self.payload, 'deity_id': None}

        error, draft = generate_product_draft(payload)

        self.assertIsNone(error)
        self.assertIsNone(draft['deity'])
        self.assertEqual(draft['availability'], 'made_to_order')
        self.assertEqual(draft['sales_mode'], 'quote_only')
        self.assertEqual(len(draft['short_description']), 500)
        self.assertEqual(draft['description'], '123')
        self.assertEqual(len(draft['keywords']), 8)
        self.assertEqual(len(draft['keywords'][0]), 100)
        self.assertEqual(draft['height'], '')
        self.assertEqual(draft['min_weight'], '12')
        self.assertEqual(draft['max_weight'], '')
        self.assertEqual(draft['status'], 'draft')
        self.assertFalse(draft['is_featured'])

    @override_settings(GEMINI_API_KEY='test-server-key')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_missing_generated_fields_use_safe_defaults(self, post):
        post.return_value = self.provider_response({})

        error, draft = generate_product_draft(self.payload)

        self.assertIsNone(error)
        self.assertEqual(draft['short_description'], '')
        self.assertEqual(draft['description'], '')
        self.assertEqual(draft['keywords'], [])
        self.assertEqual(draft['availability'], 'made_to_order')
        self.assertEqual(draft['sales_mode'], 'quote_only')
        self.assertEqual(draft['height'], '')
        self.assertEqual(draft['min_weight'], '')
        self.assertEqual(draft['max_weight'], '')

    @override_settings(GEMINI_API_KEY='test-server-key')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_unexpected_provider_content_returns_safe_error(self, post):
        for provider_content in (
            {},
            {'candidates': []},
            {'candidates': [{'content': {}}]},
            {'candidates': [{'content': {'parts': []}}]},
            {'candidates': [{'content': {'parts': [{'text': '{bad json'}]}}]},
            {'candidates': [{'content': {'parts': [{'text': '[]'}]}}]},
        ):
            with self.subTest(provider_content=provider_content):
                response = Mock()
                response.raise_for_status.return_value = None
                response.json.return_value = provider_content
                post.return_value = response
                error, draft = generate_product_draft(self.payload)
                self.assertEqual(error, 'Gemini returned an invalid response. Please try again.')
                self.assertIsNone(draft)

    @override_settings(GEMINI_API_KEY='test-server-key')
    @patch('app.products.services.ai_draft_service.requests.post')
    def test_provider_status_errors_are_mapped_without_credentials(self, post):
        expected = {
            400: 'Gemini rejected the request.',
            401: 'Gemini authentication failed.',
            403: 'Gemini authentication failed.',
            404: 'Gemini model is unavailable',
            429: 'Gemini rate limit reached.',
            502: 'Gemini is temporarily unavailable',
            503: 'Gemini is temporarily unavailable',
            504: 'Gemini is temporarily unavailable',
        }
        for status_code, message in expected.items():
            with self.subTest(status_code=status_code):
                response = Mock()
                response.status_code = status_code
                response.json.return_value = {'error': {'message': 'A provider detail'}}
                response.raise_for_status.side_effect = requests.HTTPError(response=response)
                post.return_value = response
                error, draft = generate_product_draft(self.payload)
                self.assertIn(message, error)
                self.assertIsNone(draft)

        response = Mock()
        response.status_code = 400
        response.json.return_value = {'error': {'status': 'UNAUTHENTICATED', 'message': 'invalid API key'}}
        response.raise_for_status.side_effect = requests.HTTPError(response=response)
        post.return_value = response
        error, _draft = generate_product_draft(self.payload)
        self.assertIn('authentication failed', error.lower())

    @override_settings(GEMINI_API_KEY='test-server-key')
    @patch('app.products.services.ai_draft_service.requests.post', side_effect=requests.Timeout)
    def test_network_failures_are_reported_safely(self, post):
        error, draft = generate_product_draft(self.payload)
        self.assertEqual(error, 'Could not reach Gemini API. Please try again.')
        self.assertIsNone(draft)
        post.assert_called_once()