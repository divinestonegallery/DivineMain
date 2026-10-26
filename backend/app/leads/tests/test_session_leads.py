"""Rule A: a successful customer session creates, reuses or suppresses one organic lead."""

import threading
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.db import connection, connections
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from app.accounts.models import Employee, User
from app.accounts.serializers import UserSerializer
from app.accounts.services.auth_service import AuthService
from app.leads.constants import (
    LOGIN_RECENT_LEAD_DAYS,
    SESSION_EVENT_LOGIN,
    SESSION_EVENT_SIGNUP,
    SESSION_EVENT_VERIFICATION,
)
from app.leads.models import Lead, LeadActivity, LeadNote
from app.leads.repositories.lead_repository import LeadRepository
from app.leads.services.lead_service import LeadService
from app.leads.tests.helpers import seed_lead


CONSUMER_URLS = 'divine_main.urls_consumer'
EMAIL = 'asha@example.com'
PHONE = '+919845011111'
CLERK_ID = 'user_session_lead'


def make_customer(email=EMAIL, phone=PHONE, role='customer', name='Asha Rao'):
    return User.objects.create(
        clerk_user_id=f'clerk-{email}-{role}',
        email=email,
        name=name,
        phone=phone,
    )


class SessionLeadDecisionTests(TestCase):
    """The decision order is active lead, then the 30-day window, then creation."""

    def setUp(self):
        self.customer = UserSerializer(make_customer()).data

    def record(self, event=SESSION_EVENT_LOGIN):
        return LeadService.record_customer_session(self.customer, event)

    def test_no_lead_at_all_creates_one_organic_login_lead(self):
        error, result = self.record()
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'created')
        lead = Lead.objects.get()
        self.assertEqual(lead.touchpoint, 'login')
        self.assertEqual(lead.source, 'website')
        self.assertEqual(lead.status, 'new')
        self.assertEqual(lead.email, EMAIL)
        self.assertEqual(lead.phone, PHONE)
        self.assertIsNone(lead.assigned_to_id)
        self.assertIn('signed in', lead.summary)
        self.assertEqual(LeadNote.objects.count(), 0)
        self.assertTrue(LeadActivity.objects.filter(lead=lead, action='created').exists())

    def test_every_active_status_is_reused_and_noted(self):
        for status in ('new', 'contacted', 'qualified', 'quoted'):
            with self.subTest(status=status):
                Lead.objects.all().delete()
                existing = seed_lead(email=EMAIL, phone=PHONE, status=status)
                error, result = self.record()
                self.assertIsNone(error)
                self.assertEqual(result['outcome'], 'note_added')
                self.assertEqual(Lead.objects.count(), 1)
                note = LeadNote.objects.get(lead=existing)
                self.assertEqual(note.body, 'Customer signed in.')
                self.assertIsNone(note.author_id)
                existing.refresh_from_db()
                self.assertEqual(existing.status, status)

    def test_an_active_lead_older_than_the_window_is_still_reused(self):
        existing = seed_lead(email=EMAIL, phone=PHONE, status='contacted', days_old=400)
        error, result = self.record()
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'note_added')
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)

    def test_a_recent_non_active_lead_suppresses_creation_and_changes_nothing(self):
        for status in ('won', 'lost'):
            with self.subTest(status=status):
                Lead.objects.all().delete()
                existing = seed_lead(email=EMAIL, phone=PHONE, status=status, days_old=5)
                error, result = self.record()
                self.assertIsNone(error)
                self.assertEqual(result['outcome'], 'skipped_recent_lead')
                self.assertEqual(Lead.objects.count(), 1)
                self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 0)
                self.assertEqual(LeadActivity.objects.filter(lead=existing).count(), 0)
                existing.refresh_from_db()
                self.assertEqual(existing.status, status)

    def test_a_lead_just_inside_the_window_suppresses_creation(self):
        seed_lead(email=EMAIL, phone=PHONE, status='lost', days_old=LOGIN_RECENT_LEAD_DAYS - 1)
        error, result = self.record()
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'skipped_recent_lead')
        self.assertEqual(Lead.objects.count(), 1)

    def test_a_lead_just_outside_the_window_allows_a_new_lead(self):
        old = seed_lead(email=EMAIL, phone=PHONE, status='won', days_old=LOGIN_RECENT_LEAD_DAYS + 1)
        error, result = self.record()
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'created')
        self.assertEqual(Lead.objects.count(), 2)
        self.assertEqual(Lead.objects.exclude(id=old.id).get().touchpoint, 'login')
        self.assertEqual(LeadNote.objects.count(), 0)

    def test_the_boundary_is_measured_against_created_at_not_updated_at(self):
        old = seed_lead(email=EMAIL, phone=PHONE, status='won', days_old=LOGIN_RECENT_LEAD_DAYS + 1)
        old.lost_reason = 'touched recently by staff'
        old.save(update_fields=['lost_reason', 'updated_at'])
        error, result = self.record()
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'created')

    def test_repeated_logins_with_an_active_lead_append_one_note_each(self):
        existing = seed_lead(email=EMAIL, phone=PHONE, status='contacted')
        for _attempt in range(3):
            self.record()
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 3)
        self.assertEqual(LeadActivity.objects.filter(lead=existing, action='note_added').count(), 3)

    def test_repeated_logins_without_a_lead_create_only_the_first_one(self):
        first = self.record()[1]
        second = self.record()[1]
        self.assertEqual(first['outcome'], 'created')
        self.assertEqual(second['outcome'], 'note_added')
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.count(), 1)

    def test_staff_and_admin_sessions_never_touch_leads(self):
        for role in ('staff', 'admin'):
            with self.subTest(role=role):
                Lead.objects.all().delete()
                existing = seed_lead(email=EMAIL, phone=PHONE, status='contacted')
                # Same contact details as the active lead, so only the role
                # keeps this session away from it.
                employee = {**self.customer, 'role': role}
                error, result = LeadService.record_customer_session(employee, SESSION_EVENT_LOGIN)
                self.assertIsNone(error)
                self.assertEqual(result['outcome'], 'skipped_not_a_customer')
                self.assertEqual(Lead.objects.count(), 1)
                self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 0)

    def test_a_customer_without_contact_details_is_skipped(self):
        customer = UserSerializer(make_customer(email='', phone='')).data
        error, result = LeadService.record_customer_session(customer, SESSION_EVENT_LOGIN)
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'skipped_no_contact_details')
        self.assertEqual(Lead.objects.count(), 0)

    def test_conflicting_identity_evidence_mutates_nothing(self):
        by_email = seed_lead(email=EMAIL, status='contacted')
        by_phone = seed_lead(phone=PHONE, status='quoted')
        error, result = self.record()
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'skipped_identity_conflict')
        self.assertEqual(Lead.objects.count(), 2)
        self.assertEqual(LeadNote.objects.count(), 0)
        self.assertEqual(LeadActivity.objects.filter(lead__in=[by_email, by_phone]).count(), 0)

    def test_an_unnormalized_account_phone_still_matches_the_stored_lead(self):
        existing = seed_lead(phone=PHONE, status='contacted')
        customer = UserSerializer(make_customer(email='', phone=' +91 98450 11111 ')).data
        error, result = LeadService.record_customer_session(customer, SESSION_EVENT_LOGIN)
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'note_added')
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)

    def test_a_failed_activity_write_rolls_the_new_lead_back(self):
        with patch.object(LeadRepository, 'add_activity', side_effect=RuntimeError('activity write failed')):
            with self.assertRaises(RuntimeError):
                self.record()
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(LeadActivity.objects.count(), 0)

    def test_signup_and_verification_events_are_recorded_in_the_note(self):
        existing = seed_lead(email=EMAIL, phone=PHONE, status='new')
        self.record(SESSION_EVENT_SIGNUP)
        self.record(SESSION_EVENT_VERIFICATION)
        bodies = list(LeadNote.objects.filter(lead=existing).values_list('body', flat=True))
        self.assertEqual(bodies, ['Customer completed signup.', 'Customer verified their email address.'])


@override_settings(ROOT_URLCONF=CONSUMER_URLS)
class SessionLeadAuthenticationCoverageTests(TestCase):
    """Only the endpoints that establish a session reach the lead rules."""

    def setUp(self):
        self.client = APIClient()
        self.password = 'StrongPassword123!'

    def clerk_user(self, verified=True):
        return {
            'id': CLERK_ID,
            'email_addresses': [{
                'id': 'idn_1',
                'email_address': EMAIL,
                'verification': {'status': 'verified' if verified else 'unverified'},
            }],
            'first_name': 'Asha',
            'last_name': 'Rao',
            'phone_numbers': [{'phone_number': PHONE}],
        }

    def login(self, password_ok=True):
        with patch(
            'app.accounts.services.clerk_client.ClerkClient.get_user_by_email',
            return_value=(None, self.clerk_user()),
        ), patch(
            'app.accounts.services.clerk_client.ClerkClient.verify_password',
            return_value=(None, password_ok),
        ):
            return self.client.post(
                '/api/v1/auth/login',
                {'email': EMAIL, 'password': self.password},
                format='json',
            )

    def test_successful_customer_login_creates_the_organic_lead(self):
        response = self.login()
        self.assertEqual(response.status_code, 200, response.content)
        lead = Lead.objects.get()
        self.assertEqual(lead.touchpoint, 'login')
        self.assertEqual(lead.email, EMAIL)
        self.assertEqual(lead.created_by_id, User.objects.get(clerk_user_id=CLERK_ID).id)
        self.assertEqual(lead.user_id, lead.created_by_id)

    def test_a_second_login_reuses_the_lead_and_adds_a_note(self):
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(self.login().status_code, 200)
        lead = Lead.objects.get()
        self.assertEqual(LeadNote.objects.filter(lead=lead).count(), 1)

    def test_failed_login_does_not_touch_leads(self):
        response = self.login(password_ok=False)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(LeadNote.objects.count(), 0)

    def test_signup_that_establishes_a_session_creates_the_lead(self):
        with patch(
            'app.accounts.services.clerk_client.ClerkClient.create_user',
            return_value=(None, self.clerk_user()),
        ):
            response = self.client.post(
                '/api/v1/auth/signup',
                {'email': EMAIL, 'password': self.password, 'name': 'Asha Rao', 'phone': PHONE},
                format='json',
            )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertIn('access_token', response.json()['data'])
        lead = Lead.objects.get()
        self.assertEqual(lead.touchpoint, 'login')
        self.assertIn('completed signup', lead.summary)

    def test_signup_awaiting_verification_establishes_no_session_and_no_lead(self):
        with patch(
            'app.accounts.services.clerk_client.ClerkClient.create_user',
            return_value=(None, self.clerk_user(verified=False)),
        ), patch(
            'app.accounts.services.clerk_client.ClerkClient.prepare_email_verification',
            return_value=(None, {'status': 'sent'}),
        ):
            response = self.client.post(
                '/api/v1/auth/signup',
                {'email': EMAIL, 'password': self.password},
                format='json',
            )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(response.json()['data']['requires_verification'])
        self.assertNotIn('access_token', response.json()['data'])
        self.assertEqual(Lead.objects.count(), 0)

    def test_successful_verification_creates_the_lead(self):
        with patch(
            'app.accounts.services.clerk_client.ClerkClient.get_user_by_email',
            return_value=(None, self.clerk_user(verified=False)),
        ), patch(
            'app.accounts.services.clerk_client.ClerkClient.attempt_email_verification',
            return_value=(None, True),
        ):
            response = self.client.post(
                '/api/v1/auth/verify-signup',
                {'email': EMAIL, 'code': '123456', 'name': 'Asha Rao', 'phone': PHONE},
                format='json',
            )
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        self.assertIn('verified their email address', lead.summary)

    def test_failed_verification_does_not_touch_leads(self):
        with patch(
            'app.accounts.services.clerk_client.ClerkClient.get_user_by_email',
            return_value=(None, self.clerk_user(verified=False)),
        ), patch(
            'app.accounts.services.clerk_client.ClerkClient.attempt_email_verification',
            return_value=('Invalid or expired OTP.', False),
        ):
            response = self.client.post(
                '/api/v1/auth/verify-signup',
                {'email': EMAIL, 'code': '000000'},
                format='json',
            )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)

    def test_token_refresh_does_not_touch_leads(self):
        self.assertEqual(self.login().status_code, 200)
        refresh = self.login().json()['data']['refresh_token']
        Lead.objects.all().delete()
        LeadNote.objects.all().delete()
        response = self.client.post('/api/v1/auth/refresh', {'refresh_token': refresh}, format='json')
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(LeadNote.objects.count(), 0)

    def test_profile_read_and_update_do_not_touch_leads(self):
        self.assertEqual(self.login().status_code, 200)
        customer = User.objects.get(clerk_user_id=CLERK_ID)
        Lead.objects.all().delete()
        self.client.force_authenticate(user=customer)
        self.assertEqual(self.client.get('/api/v1/auth/profile').status_code, 200)
        self.client.patch('/api/v1/auth/profile', {'name': 'Asha R'}, format='json')
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(LeadNote.objects.count(), 0)

    @override_settings(DEPLOYMENT_MODE='admin')
    def test_staff_login_creates_no_customer_lead(self):
        user = User.objects.create(email=EMAIL, name='Staff Member')
        Employee.objects.create(user=user, clerk_user_id=CLERK_ID, role='staff', is_active=True)
        response = self.login()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(Lead.objects.count(), 0)

    def test_a_lead_service_failure_still_returns_a_successful_login(self):
        with patch.object(
            LeadService,
            'record_customer_session',
            side_effect=RuntimeError('lead desk unavailable'),
        ):
            response = self.login()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn('access_token', response.json()['data'])
        self.assertEqual(Lead.objects.count(), 0)

    def test_a_lead_service_error_result_still_returns_a_successful_login(self):
        with patch.object(
            LeadService,
            'record_customer_session',
            return_value=('Lead desk rejected the session.', None),
        ):
            response = self.login()
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIn('access_token', response.json()['data'])

    def test_clerk_webhook_synchronisation_creates_no_login_lead(self):
        from app.accounts.services.webhook_service import AccountWebhookService

        payload = {
            'type': 'user.created',
            'data': {
                'id': CLERK_ID,
                'primary_email_address_id': 'idn_1',
                'email_addresses': [{'id': 'idn_1', 'email_address': EMAIL}],
                'first_name': 'Asha',
            },
        }
        error, result = AccountWebhookService.process_clerk_webhook(payload, 'evt_session_lead')
        self.assertIsNone(error)
        self.assertFalse(result['duplicate'])
        self.assertEqual(Lead.objects.count(), 0)


class SessionLeadWindowBoundaryTests(TestCase):
    """The window is relative to the current time, so freeze it to hit the edge.

    A real elapsed-time test cannot land on exactly 30 days, which is why the
    boundary is asserted against a fixed `now` rather than a sleep.
    """

    def setUp(self):
        self.customer = UserSerializer(make_customer()).data
        self.frozen = timezone.now()
        seed_lead(email=EMAIL, phone=PHONE, status='lost')

    def record_at_age(self, **age):
        Lead.objects.filter(status='lost').update(created_at=self.frozen - timedelta(**age))
        with patch('app.leads.services.lead_service.timezone.now', return_value=self.frozen):
            return LeadService.record_customer_session(self.customer, SESSION_EVENT_LOGIN)

    def test_a_lead_created_exactly_thirty_days_ago_still_suppresses_creation(self):
        error, result = self.record_at_age(days=LOGIN_RECENT_LEAD_DAYS)
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'skipped_recent_lead')
        self.assertEqual(Lead.objects.count(), 1)

    def test_one_second_past_the_boundary_allows_a_new_lead(self):
        error, result = self.record_at_age(days=LOGIN_RECENT_LEAD_DAYS, seconds=1)
        self.assertIsNone(error)
        self.assertEqual(result['outcome'], 'created')
        self.assertEqual(Lead.objects.filter(touchpoint='login').count(), 1)


class SessionLeadPostgresConcurrencyTests(TransactionTestCase):
    def test_overlapping_first_sessions_create_one_lead_and_one_note(self):
        name = str(connection.settings_dict.get('NAME') or '')
        host = str(connection.settings_dict.get('HOST') or '')
        self.assertEqual(connection.vendor, 'postgresql')
        self.assertIn(host, {'127.0.0.1', 'localhost'})
        self.assertTrue(name.startswith('test_divine_pgtest'))
        self.assertNotIn('neon', name.lower())
        email = f'race-{uuid.uuid4().hex[:10]}@example.com'
        customer = UserSerializer(make_customer(email=email, phone='+919845033333')).data
        outcomes = []
        errors = []

        def worker():
            try:
                connections.close_all()
                error, result = LeadService.record_customer_session(customer, SESSION_EVENT_LOGIN)
                if error:
                    errors.append(error)
                else:
                    outcomes.append(result['outcome'])
            except Exception as exc:
                errors.append(f'{type(exc).__name__}: {exc}')
            finally:
                connections.close_all()

        threads = [threading.Thread(target=worker), threading.Thread(target=worker)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        self.assertEqual(errors, [])
        self.assertFalse(any(thread.is_alive() for thread in threads))
        self.assertEqual(sorted(outcomes), ['created', 'note_added'])
        self.assertEqual(Lead.objects.filter(email=email).count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead__email=email).count(), 1)
