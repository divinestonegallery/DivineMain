import json
from unittest.mock import Mock, patch

import requests

from django.test import SimpleTestCase, override_settings

from app.products.services.ai_service import generate_product_draft


class GenerateProductDraftTests(SimpleTestCase):
    def setUp(self):
        for target, selected_name in (
            ('app.products.services.ai_service.Diety.objects.filter', 'Selected deity'),
            ('app.products.services.ai_service.Category.objects.filter', 'Selected category'),
            ('app.products.services.ai_service.Material.objects.filter', 'Selected material'),
        ):
            lookup_patcher = patch(target)
            lookup = lookup_patcher.start()
            lookup.return_value.values_list.return_value.first.return_value = selected_name
            self.addCleanup(lookup_patcher.stop)

    @override_settings(GEMINI_API_KEY=' test-api-key ', GEMINI_MODEL='models/gemini-test')
    @patch('app.products.services.ai_service.requests.post')
    def test_uses_gemini_api_key_header_and_normalizes_model_path(self, post):
        response = post.return_value
        response.json.return_value = {
            'candidates': [{'content': {'parts': [{'text': json.dumps({})}]}}],
        }
        payload = {
            'name': 'Test product',
            'category_id': 1,
            'material_id': 1,
            'deity_id': 2,
            'image_base64': 'data:image/png;base64,aW1hZ2U=',
            'image_mime_type': 'image/png',
        }

        error, draft = generate_product_draft(payload)

        self.assertIsNone(error)
        self.assertEqual(draft['name'], 'Test product')
        self.assertEqual(
            post.call_args.args[0],
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
        )
        self.assertEqual(post.call_args.kwargs['headers']['x-goog-api-key'], 'test-api-key')
        self.assertEqual(post.call_args.kwargs['headers']['Content-Type'], 'application/json')
        parts = post.call_args.kwargs['json']['contents'][0]['parts']
        self.assertEqual(parts[1]['inline_data']['mime_type'], 'image/png')
        self.assertEqual(parts[1]['inline_data']['data'], 'aW1hZ2U=')
        self.assertIn('deity: Selected deity', parts[0]['text'])
        self.assertIn('category: Selected category', parts[0]['text'])
        self.assertIn('material: Selected material', parts[0]['text'])
        self.assertNotIn('params', post.call_args.kwargs)

    @override_settings(GEMINI_API_KEY='test-api-key', GEMINI_MODEL='')
    @patch('app.products.services.ai_service.requests.post')
    def test_uses_supported_default_model(self, post):
        payload = {
            'name': 'Test product',
            'category_id': 1,
            'material_id': 1,
            'image_base64': 'data:image/png;base64,aW1hZ2U=',
            'image_mime_type': 'image/png',
        }

        generate_product_draft(payload)

        self.assertEqual(
            post.call_args.args[0],
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',
        )

    @override_settings(GEMINI_API_KEY='')
    @patch('app.products.services.ai_service.requests.post')
    def test_missing_key_returns_configuration_error_without_request(self, post):
        error, draft = generate_product_draft({})

        self.assertIn('Set GEMINI_API_KEY', error)
        self.assertIsNone(draft)
        post.assert_not_called()

    @override_settings(GEMINI_API_KEY='test-api-key')
    @patch('app.products.services.ai_service.requests.post')
    def test_malformed_image_returns_upload_error_without_request(self, post):
        payload = {
            'name': 'Test product',
            'category_id': 1,
            'material_id': 1,
            'image_base64': 'data:image/png;base64,not valid base64',
            'image_mime_type': 'image/png',
        }

        error, draft = generate_product_draft(payload)

        self.assertEqual(error, 'Product image data is invalid. Please upload the image again.')
        self.assertIsNone(draft)
        post.assert_not_called()

    @override_settings(GEMINI_API_KEY='test-api-key')
    @patch('app.products.services.ai_service.requests.post')
    def test_provider_errors_are_translated_without_raw_http_details(self, post):
        payload = {
            'name': 'Test product',
            'category_id': 1,
            'material_id': 1,
            'image_base64': 'data:image/png;base64,aW1hZ2U=',
            'image_mime_type': 'image/png',
        }
        expected_messages = {
            400: 'Gemini rejected the request. Check the image and product information, then try again.',
            404: 'Gemini model is unavailable or not enabled for this API key. Please check the configured Gemini model/API access.',
            429: 'Gemini rate limit reached. Please wait a moment and try again.',
            503: 'Gemini is temporarily unavailable or experiencing high demand. Please wait a moment and try again.',
            500: 'Gemini API request failed. Please try again.',
        }

        for status_code, expected_message in expected_messages.items():
            with self.subTest(status_code=status_code):
                post.return_value.raise_for_status.side_effect = requests.HTTPError(
                    response=Mock(status_code=status_code)
                )
                error, draft = generate_product_draft(payload)
                self.assertEqual(error, expected_message)
                self.assertIsNone(draft)

        post.return_value.raise_for_status.side_effect = requests.HTTPError(
            response=Mock(status_code=401)
        )
        error, draft = generate_product_draft(payload)
        self.assertIn('authentication failed', error)
        self.assertIsNone(draft)