import json
import threading
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.mail import EmailMessage
from django.core.management import call_command
from django.db import connection, connections
from django.db.utils import OperationalError
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from app.accounts.serializers import UserSerializer
from app.accounts.services.auth_service import AuthService
from app.common.repositories import OperationsRepository
from app.common.request_context import request_id_var
from app.contactus.models import ContactMessage, CustomizeRequest
from app.integrations.tests.test_google_ads_webhook import KEY, WEBHOOK, lead_payload
from app.leads.constants import SESSION_EVENT_LOGIN, SESSION_EVENT_SIGNUP, SESSION_EVENT_VERIFICATION
from app.leads.models import Lead, LeadFailureAlert, LeadNote
from app.leads.services.failure_notification_service import (
    LeadFailureNotificationService,
    sanitize_error_message,
)
from app.leads.tests.helpers import LeadApiTestCase, create_account, seed_lead
from app.leads.tests.test_session_leads import make_customer


RECIPIENTS = ['ops@example.com']
OPS = override_settings(LEAD_FAILURE_NOTIFICATION_EMAILS=RECIPIENTS)


def notify(**overrides):
    payload = {
        'source': 'google_ads',
        'flow': 'google_ads_lead_webhook',
        'operation': 'GoogleAdsLeadIntegrationService.ingest',
        'stage': 'persistence',
        'error': RuntimeError('database unavailable'),
        'external_reference': 'lead-100',
        'dedupe_on_reference': True,
    }
    payload.update(overrides)
    LeadFailureNotificationService.notify(**payload)


@OPS
class LeadFailureNotificationServiceTests(TestCase):
    def test_email_includes_environment_request_id_and_safe_fields(self):
        token = request_id_var.set('req-lead-failure')
        try:
            notify(stage='post_persistence')
        finally:
            request_id_var.reset(token)

        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, RECIPIENTS)
        self.assertIn('Lead Creation Failure - Google Ads', message.subject)
        self.assertTrue(message.subject.startswith('['))
        body = message.body
        self.assertIn('Source: google_ads', body)
        self.assertIn('Flow: google_ads_lead_webhook', body)
        self.assertIn('Operation: GoogleAdsLeadIntegrationService.ingest', body)
        self.assertIn('Stage: post_persistence', body)
        self.assertIn('Error category: RuntimeError', body)
        self.assertIn('Request ID: req-lead-failure', body)
        self.assertIn('External reference: lead-100', body)
        self.assertIn('database unavailable', body)
        self.assertNotIn('<html', body.lower())
        self.assertIn('locmem', self.settings_backend())

    def settings_backend(self):
        from django.conf import settings
        return settings.EMAIL_BACKEND

    def test_sensitive_values_are_removed_from_the_message(self):
        raw = (
            'failed for buyer@example.com phone +919845011111 '
            'google_key=abc123 secret re_live_secretvalue '
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signaturevalue'
        )
        cleaned = sanitize_error_message(raw)
        self.assertNotIn('buyer@example.com', cleaned)
        self.assertNotIn('+919845011111', cleaned)
        self.assertNotIn('abc123', cleaned)
        self.assertNotIn('re_live_secretvalue', cleaned)
        self.assertNotIn('eyJhbGci', cleaned)
        notify(error=RuntimeError(raw), external_reference='lead-safe')
        stored = LeadFailureAlert.objects.get().safe_error_summary
        self.assertNotIn('buyer@example.com', stored)
        self.assertNotIn('buyer@example.com', mail.outbox[0].body)

    def test_empty_recipient_list_stores_the_event_and_sends_nothing(self):
        with override_settings(LEAD_FAILURE_NOTIFICATION_EMAILS=[]):
            with self.assertLogs('app.leads.services.failure_notification_service', level='ERROR') as captured:
                notify(external_reference='lead-unconfigured')
        self.assertEqual(mail.outbox, [])
        alert = LeadFailureAlert.objects.get()
        self.assertEqual(alert.delivery_status, LeadFailureAlert.STATUS_UNCONFIGURED)
        self.assertTrue(any('reason=recipients' in line for line in captured.output))

    def test_email_provider_failure_is_stored_and_does_not_replace_the_original_error(self):
        def fail():
            try:
                raise RuntimeError('lead write failed')
            except RuntimeError:
                notify(error=RuntimeError('lead write failed'), external_reference='lead-mail-down')
                raise

        with patch.object(EmailMessage, 'send', side_effect=ConnectionError('smtp down')):
            with self.assertRaisesMessage(RuntimeError, 'lead write failed'):
                fail()
        alert = LeadFailureAlert.objects.get()
        self.assertEqual(alert.delivery_status, LeadFailureAlert.STATUS_FAILED)
        self.assertIsNotNone(alert.last_attempt_at)

    def test_same_provider_event_sends_one_email(self):
        notify(external_reference='lead-dup')
        notify(external_reference='lead-dup')
        alert = LeadFailureAlert.objects.get()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(alert.occurrence_count, 2)
        self.assertEqual(alert.suppressed_count, 1)
        self.assertEqual(alert.delivery_status, LeadFailureAlert.STATUS_SENT)

    def test_burst_window_suppresses_failures_without_an_external_reference(self):
        start = timezone.now()
        with patch('app.leads.services.failure_notification_service.timezone.now', return_value=start):
            notify(external_reference='', dedupe_on_reference=False, error=OperationalError('down'))
            notify(external_reference='', dedupe_on_reference=False, error=OperationalError('down'))
            notify(external_reference='', dedupe_on_reference=False, error=OperationalError('down'))
        alert = LeadFailureAlert.objects.get()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(alert.occurrence_count, 3)
        self.assertEqual(alert.suppressed_count, 2)
        later = start + timedelta(minutes=16)
        with patch('app.leads.services.failure_notification_service.timezone.now', return_value=later):
            notify(external_reference='', dedupe_on_reference=False, error=OperationalError('down'))
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(LeadFailureAlert.objects.count(), 2)

    def test_database_outage_sends_one_direct_email_without_a_stored_row(self):
        with patch(
            'app.leads.services.failure_notification_service._insert_or_suppress',
            side_effect=OperationalError('database down'),
        ):
            notify(external_reference='lead-db-down')
        self.assertEqual(LeadFailureAlert.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 1)

    def test_retry_command_sends_a_failed_alert_once(self):
        with patch.object(EmailMessage, 'send', side_effect=ConnectionError('smtp down')):
            notify(external_reference='lead-retry')
        self.assertEqual(LeadFailureAlert.objects.get().delivery_status, LeadFailureAlert.STATUS_FAILED)
        call_command('retry_lead_failure_notifications', limit=10)
        self.assertEqual(LeadFailureAlert.objects.get().delivery_status, LeadFailureAlert.STATUS_SENT)
        self.assertEqual(len(mail.outbox), 1)
        call_command('retry_lead_failure_notifications', limit=10)
        self.assertEqual(len(mail.outbox), 1)

    def test_retry_limit_and_retention(self):
        with patch.object(EmailMessage, 'send', side_effect=ConnectionError('smtp down')):
            notify(external_reference='lead-a')
            notify(external_reference='lead-b')
            notify(external_reference='lead-c')
        call_command('retry_lead_failure_notifications', limit=1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            LeadFailureAlert.objects.filter(delivery_status=LeadFailureAlert.STATUS_SENT).count(),
            1,
        )
        old = LeadFailureAlert.objects.order_by('id').first()
        LeadFailureAlert.objects.filter(id=old.id).update(created_at=timezone.now() - timedelta(days=120))
        call_command('retry_lead_failure_notifications', prune=True, retention_days=90)
        self.assertFalse(LeadFailureAlert.objects.filter(id=old.id).exists())
        self.assertGreaterEqual(LeadFailureAlert.objects.count(), 1)

    def test_operational_cleanup_deletes_expired_failure_alerts(self):
        notify(external_reference='lead-retain')
        LeadFailureAlert.objects.update(created_at=timezone.now() - timedelta(days=120))
        now = timezone.now()
        deleted = OperationsRepository.cleanup_retained_data(
            audit_cutoff=now,
            error_cutoff=now,
            webhook_cutoff=now,
            upload_cutoff=now,
            failure_alert_cutoff=now - timedelta(days=90),
        )
        self.assertEqual(deleted['lead_failure_alerts'], 1)
        self.assertEqual(LeadFailureAlert.objects.count(), 0)


@override_settings(
    ROOT_URLCONF='divine_main.urls_consumer',
    LEAD_FAILURE_NOTIFICATION_EMAILS=RECIPIENTS,
)
class WebsiteFailureNotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post_contact(self, **overrides):
        payload = {
            'name': 'Meera Iyer',
            'email': 'meera@example.com',
            'phone': '+919845022222',
            'message': 'Please help me choose a granite murti for the shrine.',
            'touchpoint': 'contact_us',
            'submission_id': str(uuid.uuid4()),
        }
        payload.update(overrides)
        return self.client.post('/api/v1/contact/message', payload, format='json')

    def test_database_failure_notifies_once_after_rollback(self):
        seen = {}
        baseline = len(connection.atomic_blocks)

        def explode(*args, **kwargs):
            raise OperationalError('connection failed meera@example.com +919845022222')

        def spy(message, fail_silently=False):
            # TestCase keeps one outer transaction. The lead transaction is an
            # extra savepoint, so depth 1 means that savepoint has already ended.
            seen['depth'] = len(connection.atomic_blocks)
            seen['body'] = message.body
            mail.outbox.append(message)
            return 1

        with patch(
            'app.leads.services.lead_service.LeadRepository.create_lead',
            side_effect=explode,
        ), patch.object(EmailMessage, 'send', spy):
            with self.assertRaises(OperationalError):
                self.post_contact()
        self.assertEqual(seen['depth'], baseline)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 1)
        self.assertNotIn('meera@example.com', seen['body'])
        self.assertNotIn('+919845022222', seen['body'])
        self.assertIn('Flow: contact_us', seen['body'])
        self.assertEqual(LeadFailureAlert.objects.get().delivery_status, LeadFailureAlert.STATUS_SENT)

    def test_product_enquiry_failure_uses_its_own_flow(self):
        with patch(
            'app.leads.services.lead_service.LeadRepository.create_lead',
            side_effect=OperationalError('database unavailable'),
        ):
            with self.assertRaises(OperationalError):
                self.post_contact(
                    touchpoint='product_enquiry',
                    message='Is the twenty four inch Ganesh available now?',
                )
        self.assertIn('Flow: product_enquiry', mail.outbox[0].body)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_duplicate_submission_and_active_reuse_do_not_notify(self):
        submission_id = str(uuid.uuid4())
        first = self.post_contact(submission_id=submission_id)
        replay = self.post_contact(
            submission_id=submission_id,
            message='A different retry body that is still long enough.',
        )
        identical = self.post_contact(message='Please help me choose a granite murti for the shrine.')
        reused = self.post_contact(message='I have another question about delivery to Chennai.')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(replay.status_code, 201, replay.content)
        self.assertEqual(identical.status_code, 400)
        self.assertEqual(reused.status_code, 201, reused.content)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(ContactMessage.objects.count(), 2)
        self.assertEqual(mail.outbox, [])
        self.assertEqual(LeadFailureAlert.objects.count(), 0)

    def test_identity_conflict_does_not_notify(self):
        seed_lead(email='meera@example.com', phone='', status='contacted')
        seed_lead(email='', phone='+919845022222', status='quoted')
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 3)
        self.assertEqual(mail.outbox, [])

    def test_custom_moorti_failure_rolls_back_and_notifies(self):
        with patch(
            'app.leads.services.lead_service.LeadRepository.create_lead',
            side_effect=RuntimeError('database unavailable'),
        ):
            with self.assertRaises(RuntimeError):
                self.client.post('/api/v1/contact/customize', {
                    'name': 'Meera Iyer',
                    'email': 'meera@example.com',
                    'city': 'Udaipur',
                    'description': 'A standing marble figure for a home shrine.',
                    'submission_id': str(uuid.uuid4()),
                }, format='json')
        self.assertEqual(CustomizeRequest.objects.count(), 0)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertIn('Flow: custom_moorti', mail.outbox[0].body)


@OPS
class OrganicFailureNotificationTests(TestCase):
    def customer(self, **overrides):
        email = overrides.pop('email', None) or f'{uuid.uuid4().hex[:8]}@example.com'
        phone = overrides.pop('phone', '+919845011111')
        person = UserSerializer(make_customer(email=email, phone=phone)).data
        person.update(overrides)
        return person

    def test_bookkeeping_failure_notifies_and_authentication_still_succeeds(self):
        person = self.customer()
        start = timezone.now()
        events = (SESSION_EVENT_LOGIN, SESSION_EVENT_SIGNUP, SESSION_EVENT_VERIFICATION)
        with patch(
            'app.leads.services.lead_service.LeadRepository.create_lead',
            side_effect=RuntimeError('database unavailable'),
        ):
            for index, event in enumerate(events):
                # Same error category shares a 15-minute window, so each event
                # is moved into the next window to prove its own flow label.
                moment = start + timedelta(minutes=16 * index)
                with patch(
                    'app.leads.services.failure_notification_service.timezone.now',
                    return_value=moment,
                ):
                    tokens = AuthService._issue_session(person, event)
                self.assertIn('access_token', tokens)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 3)
        flows = [message.body for message in mail.outbox]
        self.assertTrue(any('Flow: login' in body for body in flows))
        self.assertTrue(any('Flow: signup' in body for body in flows))
        self.assertTrue(any('Flow: verification' in body for body in flows))

    def test_intentional_session_outcomes_do_not_notify(self):
        existing = seed_lead(email='asha@example.com', phone='+919845011111', status='contacted')
        tokens = AuthService._issue_session(
            self.customer(email='asha@example.com', phone='+919845011111'),
            SESSION_EVENT_LOGIN,
        )
        self.assertIn('access_token', tokens)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)

        seed_lead(email='recent@example.com', phone='+919845033333', status='lost')
        AuthService._issue_session(
            self.customer(email='recent@example.com', phone='+919845033333'),
            SESSION_EVENT_LOGIN,
        )

        seed_lead(email='split@example.com', phone='', status='new')
        seed_lead(email='', phone='+919845044444', status='qualified')
        AuthService._issue_session(
            self.customer(email='split@example.com', phone='+919845044444'),
            SESSION_EVENT_LOGIN,
        )

        employee = self.customer(email='staff-session@example.com', role='staff')
        AuthService._issue_session(employee, SESSION_EVENT_LOGIN)
        self.assertEqual(mail.outbox, [])


@OPS
@override_settings(ROOT_URLCONF='app.leads.tests.urls', GOOGLE_ADS_LEAD_WEBHOOK_KEY=KEY)
class GoogleAdsFailureNotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post(self, payload):
        return self.client.post(WEBHOOK, data=json.dumps(payload), content_type='application/json')

    def test_transient_failure_returns_500_and_retries_do_not_send_again(self):
        with patch(
            'app.integrations.google_ads.service.LeadService.create_provider_lead',
            side_effect=RuntimeError('database unavailable'),
        ):
            first = self.post(lead_payload(lead_id='failed-lead'))
            second = self.post(lead_payload(lead_id='failed-lead'))
        self.assertEqual(first.status_code, 500)
        self.assertEqual(first.json()['message'], 'Temporary processing failure.')
        self.assertEqual(second.status_code, 500)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 1)
        alert = LeadFailureAlert.objects.get()
        self.assertEqual(alert.external_reference, 'failed-lead')
        self.assertEqual(alert.suppressed_count, 1)

    def test_missing_contact_notifies_once(self):
        payload = lead_payload(
            lead_id='no-contact',
            user_column_data=[{'column_id': 'CITY', 'string_value': 'Pune'}],
        )
        first = self.post(payload)
        second = self.post(payload)
        self.assertEqual(first.status_code, 400)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('missing_contact', mail.outbox[0].body)
        self.assertNotIn('Pune', mail.outbox[0].body)

    def test_rejected_and_successful_events_do_not_notify(self):
        self.assertEqual(self.post(lead_payload(google_key='wrong-key')).status_code, 401)
        self.assertEqual(self.client.post(WEBHOOK, data='{', content_type='application/json').status_code, 400)
        self.assertEqual(self.post(lead_payload(is_test=True, lead_id='test-lead')).status_code, 200)
        created = self.post(lead_payload())
        replay = self.post(lead_payload())
        self.assertEqual(created.status_code, 200, created.content)
        self.assertEqual(replay.status_code, 200, replay.content)
        self.assertEqual(mail.outbox, [])
        self.assertEqual(LeadFailureAlert.objects.count(), 0)


@OPS
class StaffFailureNotificationTests(LeadApiTestCase):
    def test_persistence_failure_notifies_and_returns_500(self):
        staff = create_account('sales@example.com')
        self.client.raise_request_exception = False
        with patch(
            'app.leads.services.lead_service.LeadRepository.create_lead',
            side_effect=OperationalError('database unavailable'),
        ):
            response = self.create_lead(staff, email='desk@example.com', phone='9845055555')
        self.assertEqual(response.status_code, 500)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Flow: staff_create', mail.outbox[0].body)

    def test_duplicate_confirmation_permission_and_validation_do_not_notify(self):
        staff = create_account('sales@example.com')
        created = self.create_lead(staff, email='desk@example.com', phone='9845055555')
        self.assertEqual(created.status_code, 201, created.content)
        warning = self.create_lead(staff, name='Second Person', email='desk@example.com', phone='9000000000')
        self.assertEqual(warning.status_code, 409)
        invalid = self.client.post('/api/admin/leads', {'name': 'A'}, format='json')
        self.assertEqual(invalid.status_code, 400)
        outsider = create_account('plain@example.com', sales=False)
        self.as_user(outsider)
        denied = self.client.post('/api/admin/leads', {
            'name': 'Meera Iyer',
            'email': 'other@example.com',
            'summary': 'A granite murti',
        }, format='json')
        self.assertEqual(denied.status_code, 403)
        self.assertEqual(mail.outbox, [])
        self.assertEqual(LeadFailureAlert.objects.count(), 0)


@OPS
class LeadFailureConcurrencyTests(TransactionTestCase):
    def test_parallel_provider_events_and_burst_failures_send_one_email_each(self):
        name = str(connection.settings_dict.get('NAME') or '')
        host = str(connection.settings_dict.get('HOST') or '')
        self.assertEqual(connection.vendor, 'postgresql')
        self.assertIn(host, {'127.0.0.1', 'localhost'})
        self.assertTrue(name.startswith('test_divine_pgtest'))
        errors = []

        def provider_worker():
            try:
                connections.close_all()
                notify(external_reference='lead-race')
            except Exception as exc:
                errors.append(f'{type(exc).__name__}: {exc}')
            finally:
                connections.close_all()

        def burst_worker():
            try:
                connections.close_all()
                notify(
                    source='website',
                    flow='contact_us',
                    operation='ContactUsCustomerService.create_contact_message',
                    external_reference='',
                    dedupe_on_reference=False,
                    error=OperationalError('database unavailable'),
                )
            except Exception as exc:
                errors.append(f'{type(exc).__name__}: {exc}')
            finally:
                connections.close_all()

        threads = [
            threading.Thread(target=provider_worker),
            threading.Thread(target=provider_worker),
            threading.Thread(target=burst_worker),
            threading.Thread(target=burst_worker),
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        self.assertEqual(errors, [])
        self.assertFalse(any(thread.is_alive() for thread in threads))
        provider = LeadFailureAlert.objects.get(external_reference='lead-race')
        self.assertEqual(provider.occurrence_count, 2)
        self.assertEqual(provider.suppressed_count, 1)
        burst = LeadFailureAlert.objects.get(source='website')
        self.assertEqual(burst.occurrence_count, 2)
        self.assertEqual(burst.suppressed_count, 1)
        self.assertEqual(len(mail.outbox), 2)
