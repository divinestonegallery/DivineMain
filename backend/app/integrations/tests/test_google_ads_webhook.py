import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from app.common.models import ProcessedWebhook
from app.integrations.google_ads.repository import GoogleAdsIngestionRepository
from app.leads.constants import LEAD_SOURCE_GOOGLE_ADS
from app.leads.models import Lead
from divine_main.urls_consumer import urlpatterns as consumer_patterns
from django.urls import URLPattern, URLResolver


WEBHOOK = '/api/integrations/google-ads/lead-webhook'
KEY = 'test-google-ads-webhook-key'


def flatten_routes(patterns, prefix=''):
    routes = []
    for pattern in patterns:
        route = prefix + str(pattern.pattern)
        if isinstance(pattern, URLResolver):
            routes.extend(flatten_routes(pattern.url_patterns, route))
        elif isinstance(pattern, URLPattern):
            routes.append(route)
    return routes


def lead_payload(**overrides):
    payload = {
        'lead_id': 'lead-100',
        'google_key': KEY,
        'form_id': 55,
        'campaign_id': 77,
        'gcl_id': 'click-1',
        'lead_submit_time': '2024-09-26T12:30:00Z',
        'user_column_data': [
            {'column_id': 'FULL_NAME', 'string_value': 'Asha Rao'},
            {'column_id': 'EMAIL', 'string_value': 'Asha@Example.com'},
            {'column_id': 'PHONE_NUMBER', 'string_value': '+919845011111'},
            {'column_id': 'CITY', 'string_value': 'Jaipur'},
            {'column_id': 'PRODUCT', 'string_value': 'Marble Ganesh'},
        ],
        'future_field': {'ignored': True},
    }
    payload.update(overrides)
    return payload


@override_settings(
    ROOT_URLCONF='app.leads.tests.urls',
    GOOGLE_ADS_LEAD_WEBHOOK_KEY=KEY,
)
class GoogleAdsWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post(self, payload, content_type='application/json'):
        return self.client.post(
            WEBHOOK,
            data=json.dumps(payload) if not isinstance(payload, (bytes, str)) else payload,
            content_type=content_type,
        )

    def test_valid_payload_creates_one_attributed_lead(self):
        response = self.post(lead_payload())
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), {})
        lead = Lead.objects.get()
        self.assertEqual(lead.source, 'google_ads')
        self.assertEqual(lead.touchpoint, 'lead_form')
        self.assertEqual(lead.external_id, 'lead-100')
        self.assertEqual(lead.email, 'asha@example.com')
        self.assertEqual(lead.phone, '+919845011111')
        self.assertEqual(lead.city, 'Jaipur')
        self.assertIn('Marble Ganesh', lead.summary)
        self.assertIsNone(lead.assigned_to_id)
        self.assertEqual(lead.google_ads_form.campaign_id, '77')
        self.assertEqual(lead.google_ads_form.form_id, '55')
        self.assertEqual(lead.google_ads_form.gcl_id, 'click-1')
        self.assertIsNotNone(lead.google_ads_form.submitted_at)
        self.assertTrue(ProcessedWebhook.objects.filter(provider='google_ads', event_id='lead-100', event_type='lead').exists())

    def test_email_only_and_phone_only_submissions(self):
        email_only = self.post(lead_payload(
            lead_id='email-only',
            user_column_data=[{'column_id': 'EMAIL', 'string_value': 'only@example.com'}],
        ))
        phone_only = self.post(lead_payload(
            lead_id='phone-only',
            user_column_data=[{'column_id': 'PHONE_NUMBER', 'string_value': '+1 415 555 0134'}],
        ))
        self.assertEqual(email_only.status_code, 200, email_only.content)
        self.assertEqual(phone_only.status_code, 200, phone_only.content)
        self.assertEqual(Lead.objects.get(external_id='email-only').email, 'only@example.com')
        self.assertEqual(Lead.objects.get(external_id='phone-only').phone, '+14155550134')

    def test_missing_contact_malformed_json_and_missing_lead_id_are_permanent(self):
        missing_contact = self.post(lead_payload(
            lead_id='no-contact',
            user_column_data=[{'column_id': 'CITY', 'string_value': 'Pune'}],
        ))
        malformed = self.client.post(WEBHOOK, data='{', content_type='application/json')
        missing_id = self.post(lead_payload(lead_id=' '))
        self.assertEqual(missing_contact.status_code, 400)
        self.assertEqual(malformed.status_code, 400)
        self.assertEqual(missing_id.status_code, 400)
        self.assertIn('message', missing_contact.json())
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(ProcessedWebhook.objects.count(), 0)

    def test_wrong_key_and_missing_configuration(self):
        rejected = self.post(lead_payload(google_key='wrong-key'))
        self.assertEqual(rejected.status_code, 401)
        self.assertEqual(Lead.objects.count(), 0)
        with override_settings(GOOGLE_ADS_LEAD_WEBHOOK_KEY=''):
            unconfigured = self.post(lead_payload(lead_id='unconfigured'))
        self.assertEqual(unconfigured.status_code, 500)
        self.assertEqual(Lead.objects.count(), 0)

    def test_optional_fields_can_be_absent(self):
        payload = lead_payload()
        for field in ('form_id', 'campaign_id', 'gcl_id', 'adgroup_id', 'creative_id', 'lead_submit_time'):
            payload.pop(field, None)
        response = self.post(payload)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Lead.objects.get().google_ads_form.campaign_id, '')

    def test_duplicate_delivery_creates_no_second_lead(self):
        first = self.post(lead_payload())
        second = self.post(lead_payload(user_column_data=[
            {'column_id': 'EMAIL', 'string_value': 'other@example.com'},
        ]))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json(), {})
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(Lead.objects.get().email, 'asha@example.com')

    def test_integrity_conflict_returns_success_without_a_second_lead(self):
        self.post(lead_payload())
        real_lookup = GoogleAdsIngestionRepository.production_lead

        def miss_once(external_id):
            if not hasattr(miss_once, 'used'):
                miss_once.used = True
                return None
            return real_lookup(external_id)

        with patch.object(GoogleAdsIngestionRepository, 'production_lead', side_effect=miss_once):
            response = self.post(lead_payload())
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Lead.objects.filter(source=LEAD_SOURCE_GOOGLE_ADS, external_id='lead-100').count(), 1)

    def test_event_is_accepted_without_a_staff_session(self):
        response = self.post(lead_payload(lead_id='anonymous-delivery'))
        self.assertEqual(response.status_code, 200, response.content)

    def test_valid_test_event_is_recorded_without_a_sales_lead(self):
        response = self.post(lead_payload(is_test=True, lead_id='test-lead'))
        replay = self.post(lead_payload(is_test=True, lead_id='test-lead'))
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(replay.status_code, 200, replay.content)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(ProcessedWebhook.objects.filter(event_id='test:test-lead', event_type='test').count(), 1)
        production = self.post(lead_payload(lead_id='test-lead', is_test=False))
        self.assertEqual(production.status_code, 200, production.content)
        self.assertEqual(Lead.objects.filter(external_id='test-lead').count(), 1)

    def test_lead_creation_failure_does_not_mark_the_event_processed(self):
        with patch(
            'app.integrations.google_ads.service.LeadService.create_provider_lead',
            side_effect=RuntimeError('database unavailable'),
        ):
            response = self.post(lead_payload(lead_id='failed-lead'))
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()['message'], 'Temporary processing failure.')
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(ProcessedWebhook.objects.count(), 0)

    def test_consumer_urls_do_not_expose_the_webhook(self):
        routes = flatten_routes(consumer_patterns)
        self.assertFalse(any('google-ads' in route for route in routes))
        with override_settings(ROOT_URLCONF='divine_main.urls_consumer'):
            response = self.client.post(WEBHOOK, lead_payload(), format='json')
        self.assertEqual(response.status_code, 404)
