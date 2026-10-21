import json
import os
import threading
import uuid
from pathlib import Path
from unittest import skipUnless
from unittest.mock import patch

from django.db import connection, connections
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework.test import APIClient

from app.common.models import ProcessedWebhook
from app.contactus.models import ContactMessage, CustomizeRequest
from app.integrations.google_ads.models import GoogleAdsLeadForm
from app.integrations.google_ads.repository import GoogleAdsIngestionRepository
from app.leads.constants import LEAD_SOURCE_GOOGLE_ADS
from app.leads.models import Lead, LeadActivity
from app.orders.models import Order
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


def assert_isolated_test_database(test):
    """Reject anything other than SQLite memory or a local PostgreSQL test database."""
    name = str(connection.settings_dict.get('NAME') or '')
    host = str(connection.settings_dict.get('HOST') or '')
    if connection.vendor == 'sqlite':
        test.assertIn('memory', name)
        return
    if connection.vendor == 'postgresql':
        test.assertIn(host, {'127.0.0.1', 'localhost'})
        test.assertTrue(name.startswith('test_'))
        test.assertNotIn('neon', name.lower())
        test.assertNotIn('neon', host.lower())
        return
    test.fail('Refusing database vendor %s' % connection.vendor)


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


@override_settings(
    ROOT_URLCONF='app.leads.tests.urls',
    GOOGLE_ADS_LEAD_WEBHOOK_KEY=KEY,
)
class GoogleAdsWebhookMatrixTests(TestCase):
    """Extra contract checks. Each assertion is scoped to this test's synthetic lead id."""

    def setUp(self):
        self.client = APIClient()
        self.run_id = f'google-ads-e2e-{uuid.uuid4().hex[:10]}'
        # SQLite stays in a private memory database. PostgreSQL is accepted only
        # when Django is pointed at a local database whose name Django created
        # for this test run.
        assert_isolated_test_database(self)
        self.assertEqual(self._scoped_leads().count(), 0)

    def post(self, payload, content_type='application/json'):
        return self.client.post(
            WEBHOOK,
            data=json.dumps(payload) if not isinstance(payload, (bytes, str)) else payload,
            content_type=content_type,
        )

    def _scoped_leads(self):
        return Lead.objects.filter(external_id__startswith=self.run_id)

    def _id(self, label):
        return f'{self.run_id}-{label}'

    def _post_columns(self, label, columns, **overrides):
        return self.post(lead_payload(
            lead_id=self._id(label),
            user_column_data=columns,
            **overrides,
        ))

    def test_database_constraints_exist_on_the_isolated_database(self):
        with connection.cursor() as cursor:
            lead_constraints = connection.introspection.get_constraints(cursor, Lead._meta.db_table)
            webhook_constraints = connection.introspection.get_constraints(cursor, ProcessedWebhook._meta.db_table)
            form_constraints = connection.introspection.get_constraints(cursor, GoogleAdsLeadForm._meta.db_table)
        self.assertIn('lead_source_external_uniq', lead_constraints)
        self.assertTrue(lead_constraints['lead_source_external_uniq']['unique'])
        self.assertIn('unique_processed_webhook_event', webhook_constraints)
        self.assertTrue(webhook_constraints['unique_processed_webhook_event']['unique'])
        lead_uniques = [
            name for name, meta in form_constraints.items()
            if meta['unique'] and meta['columns'] == ['lead_id']
        ]
        self.assertTrue(lead_uniques)

    def test_omitted_is_test_is_a_production_lead_and_response_hides_the_key(self):
        payload = lead_payload(lead_id=self._id('omitted-test'))
        payload.pop('is_test', None)
        response = self.post(payload)
        body = response.content.decode()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {})
        self.assertNotIn(KEY, body)
        self.assertNotIn('asha@example.com', body.lower())
        lead = self._scoped_leads().get()
        self.assertEqual(lead.status, 'new')
        self.assertIsNone(lead.assigned_to_id)
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(CustomizeRequest.objects.count(), 0)
        self.assertEqual(Order.objects.count(), 0)

    def test_column_combinations_and_unknown_columns(self):
        named = self._post_columns('names', [
            {'column_id': 'FIRST_NAME', 'string_value': 'Ada'},
            {'column_id': 'LAST_NAME', 'string_value': 'Lovelace'},
            {'column_id': 'WORK_EMAIL', 'string_value': 'Ada@Example.com'},
            {'column_id': 'WORK_PHONE', 'string_value': '+44 20 7946 0991'},
            {'column_id': 'FAVORITE_BRAND', 'string_value': 'Ignored brand'},
        ])
        self.assertEqual(named.status_code, 200, named.content)
        lead = Lead.objects.get(external_id=self._id('names'))
        self.assertEqual(lead.name, 'Ada Lovelace')
        self.assertEqual(lead.email, 'ada@example.com')
        self.assertEqual(lead.phone, '+442079460991')
        self.assertNotIn('Ignored brand', lead.summary)

    def test_validation_matrix_creates_no_scoped_leads(self):
        cases = {
            'missing-key': (lead_payload(lead_id=self._id('missing-key')), 400),
            'non-object': ([1, 2, 3], 400),
            'columns-missing': ({'lead_id': self._id('columns-missing'), 'google_key': KEY}, 400),
            'columns-empty': (lead_payload(lead_id=self._id('columns-empty'), user_column_data=[]), 400),
            'columns-unknown': (lead_payload(
                lead_id=self._id('columns-unknown'),
                user_column_data=[{'column_id': 'FAVORITE_BRAND', 'string_value': 'Stone'}],
            ), 400),
            'bad-test-flag': (lead_payload(lead_id=self._id('bad-test-flag'), is_test='yes'), 400),
            'bad-columns-type': (lead_payload(lead_id=self._id('bad-columns-type'), user_column_data={'column_id': 'EMAIL'}), 400),
        }
        cases['missing-key'][0].pop('google_key')
        for label, (payload, expected) in cases.items():
            response = self.post(payload)
            self.assertEqual(response.status_code, expected, label)
            self.assertEqual(set(response.json()), {'message'})
            self.assertNotIn(KEY, response.content.decode())
        bad_type = self.client.post(WEBHOOK, data='not-json', content_type='text/plain')
        self.assertEqual(bad_type.status_code, 400)
        self.assertEqual(self._scoped_leads().count(), 0)
        self.assertEqual(
            ProcessedWebhook.objects.filter(event_id__contains=self.run_id).count(),
            0,
        )

    def test_malformed_optional_attribution_is_ignored(self):
        response = self.post(lead_payload(
            lead_id=self._id('optional'),
            form_id='not-a-number',
            campaign_id=True,
            lead_submit_time='not-a-date',
            gcl_id='   ',
        ))
        self.assertEqual(response.status_code, 200, response.content)
        form = Lead.objects.get(external_id=self._id('optional')).google_ads_form
        self.assertEqual(form.form_id, '')
        self.assertEqual(form.campaign_id, '')
        self.assertEqual(form.gcl_id, '')
        self.assertIsNone(form.submitted_at)

    def test_same_contact_with_a_new_provider_id_creates_a_second_lead(self):
        first = self._post_columns('first', [
            {'column_id': 'EMAIL', 'string_value': 'repeat@example.com'},
            {'column_id': 'PRODUCT', 'string_value': 'First murti'},
        ])
        second = self._post_columns('second', [
            {'column_id': 'EMAIL', 'string_value': 'repeat@example.com'},
            {'column_id': 'PRODUCT', 'string_value': 'Second murti'},
        ])
        self.assertEqual(first.status_code, 200, first.content)
        self.assertEqual(second.status_code, 200, second.content)
        self.assertNotIn('repeat@example.com', second.content.decode())
        leads = list(self._scoped_leads().order_by('id'))
        self.assertEqual(len(leads), 2)
        self.assertEqual({item.source for item in leads}, {LEAD_SOURCE_GOOGLE_ADS})
        self.assertIn('First murti', leads[0].summary)
        self.assertIn('Second murti', leads[1].summary)
        self.assertTrue(LeadActivity.objects.filter(lead=leads[1], action='possible_duplicate', new_value='1').exists())
        self.assertFalse(LeadActivity.objects.filter(lead=leads[0], action='possible_duplicate').exists())

    def test_attribution_or_event_failure_rolls_back_and_a_retry_succeeds(self):
        for method_name in ('save_form', 'mark_processed'):
            lead_id = self._id(method_name)
            with patch.object(GoogleAdsIngestionRepository, method_name, side_effect=RuntimeError('write failed')):
                failed = self.post(lead_payload(lead_id=lead_id))
            self.assertEqual(failed.status_code, 500, method_name)
            self.assertEqual(failed.json()['message'], 'Temporary processing failure.')
            self.assertFalse(Lead.objects.filter(external_id=lead_id).exists())
            self.assertFalse(GoogleAdsLeadForm.objects.filter(lead__external_id=lead_id).exists())
            self.assertFalse(ProcessedWebhook.objects.filter(event_id=lead_id).exists())
            recovered = self.post(lead_payload(lead_id=lead_id))
            self.assertEqual(recovered.status_code, 200, recovered.content)
            self.assertEqual(Lead.objects.filter(external_id=lead_id).count(), 1)
            self.assertEqual(GoogleAdsLeadForm.objects.filter(lead__external_id=lead_id).count(), 1)
            self.assertEqual(ProcessedWebhook.objects.filter(event_id=lead_id, event_type='lead').count(), 1)

    def test_admin_url_module_mounts_the_webhook_and_consumer_module_does_not(self):
        backend = Path(__file__).resolve().parents[3]
        admin_text = (backend / 'divine_main' / 'urls_admin.py').read_text()
        consumer_text = (backend / 'divine_main' / 'urls_consumer.py').read_text()
        self.assertIn("include('app.integrations.google_ads.urls')", admin_text)
        self.assertNotIn('google-ads', consumer_text)
        self.assertNotIn('app.leads', consumer_text)


@skipUnless(
    os.environ.get('DIVINE_PGTEST_REQUIRED') == '1',
    'Disposable PostgreSQL target check runs only for the local PostgreSQL validation command.',
)
class DisposablePostgreSQLTargetTests(TestCase):
    def test_vendor_host_and_test_database_name(self):
        self.assertEqual(connection.vendor, 'postgresql')
        assert_isolated_test_database(self)


@skipUnless(connection.vendor == 'postgresql', 'Concurrent delivery is verified on PostgreSQL only.')
@override_settings(
    ROOT_URLCONF='app.leads.tests.urls',
    GOOGLE_ADS_LEAD_WEBHOOK_KEY=KEY,
)
class GoogleAdsPostgresConcurrencyTests(TransactionTestCase):
    """Two independent connections overlap the duplicate check, then both insert."""

    def test_overlapping_duplicate_deliveries_keep_one_lead(self):
        self.assertEqual(connection.vendor, 'postgresql')
        assert_isolated_test_database(self)
        rounds = 8
        for attempt in range(rounds):
            lead_id = f'google-ads-pg-race-{uuid.uuid4().hex[:12]}-{attempt}'
            statuses, bodies = _deliver_same_payload_concurrently(lead_id)
            self.assertEqual(statuses, [200, 200], bodies)
            self.assertEqual(bodies, ['{}', '{}'])
            self.assertEqual(Lead.objects.filter(external_id=lead_id).count(), 1)
            self.assertEqual(GoogleAdsLeadForm.objects.filter(lead__external_id=lead_id).count(), 1)
            self.assertEqual(
                ProcessedWebhook.objects.filter(
                    provider='google_ads',
                    event_id=lead_id,
                    event_type='lead',
                ).count(),
                1,
            )
        self.assertEqual(
            Lead.objects.filter(external_id__startswith='google-ads-pg-race-').count(),
            rounds,
        )


def _deliver_same_payload_concurrently(lead_id):
    barrier = threading.Barrier(2)
    entered = {'count': 0}
    entered_lock = threading.Lock()
    real_lookup = GoogleAdsIngestionRepository.production_lead

    def lookup_then_overlap(external_id):
        found = real_lookup(external_id)
        if external_id == lead_id and found is None:
            with entered_lock:
                entered['count'] += 1
                should_wait = entered['count'] <= 2
            if should_wait:
                barrier.wait(timeout=15)
        return found

    statuses = []
    bodies = []
    errors = []
    payload = lead_payload(
        lead_id=lead_id,
        user_column_data=[
            {'column_id': 'FULL_NAME', 'string_value': 'Concurrent Example'},
            {'column_id': 'EMAIL', 'string_value': f'{lead_id}@example.com'},
        ],
    )

    def worker():
        try:
            connections.close_all()
            with override_settings(
                ROOT_URLCONF='app.leads.tests.urls',
                GOOGLE_ADS_LEAD_WEBHOOK_KEY=KEY,
            ):
                response = APIClient().post(
                    WEBHOOK,
                    data=json.dumps(payload),
                    content_type='application/json',
                )
            statuses.append(response.status_code)
            bodies.append(response.content.decode())
        except Exception as exc:
            errors.append(f'{type(exc).__name__}: {exc}')
        finally:
            connections.close_all()

    with patch.object(GoogleAdsIngestionRepository, 'production_lead', side_effect=lookup_then_overlap):
        threads = [threading.Thread(target=worker), threading.Thread(target=worker)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)

    if errors:
        raise AssertionError('Concurrent delivery failed: ' + '; '.join(errors))
    if any(thread.is_alive() for thread in threads):
        raise AssertionError('Concurrent delivery did not finish.')
    return sorted(statuses), sorted(bodies)
