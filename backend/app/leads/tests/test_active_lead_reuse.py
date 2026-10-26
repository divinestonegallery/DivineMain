"""Rule B: a website enquiry reuses the person's active lead instead of adding one."""

import threading
import uuid
from unittest.mock import patch

from django.db import connection, connections
from django.test import TestCase, TransactionTestCase, override_settings
from rest_framework.test import APIClient

from app.contactus.models import ContactMessage, CustomizeRequest
from app.contactus.repositories.contactus_repository import ContactUsRepository
from app.leads.models import Lead, LeadActivity, LeadNote
from app.leads.tests.helpers import create_account, seed_lead


CONSUMER_URLS = 'divine_main.urls_consumer'
EMAIL = 'asha@example.com'
PHONE = '+919845011111'


def _assert_isolated_test_database(test):
    name = str(connection.settings_dict.get('NAME') or '')
    host = str(connection.settings_dict.get('HOST') or '')
    test.assertEqual(connection.vendor, 'postgresql')
    test.assertIn(host, {'127.0.0.1', 'localhost'})
    test.assertTrue(name.startswith('test_divine_pgtest'))
    test.assertNotIn('neon', name.lower())


def _post_identical_payloads(path, payload):
    """Both requests pass the first duplicate check, then the lock decides."""
    barrier = threading.Barrier(2)
    entered = {'count': 0}
    entered_lock = threading.Lock()
    method_name = 'recent_contact_duplicate' if path.endswith('/message') else 'recent_customize_duplicate'
    real = getattr(ContactUsRepository, method_name)

    def overlap_then_real(*args, **kwargs):
        with entered_lock:
            entered['count'] += 1
            should_wait = entered['count'] <= 2
        if should_wait:
            barrier.wait(timeout=15)
            return False
        return real(*args, **kwargs)

    statuses = []
    bodies = []
    errors = []

    def worker():
        try:
            connections.close_all()
            with override_settings(ROOT_URLCONF=CONSUMER_URLS):
                response = APIClient().post(path, payload, format='json')
            statuses.append(response.status_code)
            bodies.append(response.content.decode())
        except Exception as exc:
            errors.append(f'{type(exc).__name__}: {exc}')
        finally:
            connections.close_all()

    with patch.object(ContactUsRepository, method_name, side_effect=overlap_then_real):
        threads = [threading.Thread(target=worker), threading.Thread(target=worker)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
    if errors:
        raise AssertionError('Concurrent enquiry failed: ' + '; '.join(errors))
    if any(thread.is_alive() for thread in threads):
        raise AssertionError('Concurrent enquiry did not finish.')
    return sorted(statuses), sorted(bodies)


@override_settings(ROOT_URLCONF=CONSUMER_URLS)
class WebsiteEnquiryReuseTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post_contact(self, **overrides):
        payload = {
            'name': 'Asha Rao',
            'email': EMAIL,
            'message': 'Please quote a granite Ganesh for my shrine.',
            'touchpoint': 'contact_us',
            'submission_id': str(uuid.uuid4()),
        }
        payload.update(overrides)
        return self.client.post('/api/v1/contact/message', payload, format='json')

    def post_customize(self, **overrides):
        payload = {
            'name': 'Asha Rao',
            'email': EMAIL,
            'city': 'Jaipur',
            'description': 'A seated Ganesh in white marble, about three feet.',
            'submission_id': str(uuid.uuid4()),
        }
        payload.update(overrides)
        return self.client.post('/api/v1/contact/customize', payload, format='json')

    def test_contact_creates_a_lead_when_there_is_no_active_lead(self):
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        self.assertEqual(lead.touchpoint, 'contact_us')
        self.assertEqual(ContactMessage.objects.get().lead_id, lead.id)
        self.assertEqual(LeadNote.objects.count(), 0)

    def test_contact_reuses_an_active_lead_and_appends_one_note(self):
        existing = seed_lead(email=EMAIL, status='contacted')
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 1)
        note = LeadNote.objects.get(lead=existing)
        self.assertIn('Contact us enquiry received.', note.body)
        self.assertIn('granite Ganesh', note.body)
        self.assertEqual(ContactMessage.objects.get().lead_id, existing.id)

    def test_custom_moorti_reuses_an_active_lead_and_appends_one_note(self):
        existing = seed_lead(email=EMAIL, status='qualified')
        response = self.post_customize()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 1)
        note = LeadNote.objects.get(lead=existing)
        self.assertIn('Custom moorti enquiry received.', note.body)
        self.assertIn('white marble', note.body)
        self.assertEqual(CustomizeRequest.objects.get().lead_id, existing.id)

    def test_product_enquiry_follows_the_same_active_lead_rule(self):
        existing = seed_lead(email=EMAIL, status='quoted')
        response = self.post_contact(touchpoint='product_enquiry', message='Is the 24 inch Ganesh in stock?')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 1)
        note = LeadNote.objects.get(lead=existing)
        self.assertIn('Product enquiry received.', note.body)
        self.assertEqual(existing.touchpoint, 'contact_us')

    def test_phone_only_submission_reuses_the_active_lead_matched_by_phone(self):
        existing = seed_lead(phone=PHONE, status='new')
        response = self.post_contact(email='', phone=PHONE)
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)

    def test_a_recent_non_active_lead_does_not_block_a_new_website_lead(self):
        for status in ('won', 'lost'):
            with self.subTest(status=status):
                ContactMessage.objects.all().delete()
                Lead.objects.all().delete()
                seed_lead(email=EMAIL, status=status, days_old=1)
                response = self.post_contact()
                self.assertEqual(response.status_code, 201, response.content)
                self.assertEqual(Lead.objects.filter(status='new').count(), 1)
                self.assertEqual(LeadNote.objects.count(), 0)

    def test_an_active_lead_older_than_thirty_days_is_still_reused(self):
        existing = seed_lead(email=EMAIL, status='contacted', days_old=400)
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)

    def test_reuse_leaves_status_assignment_and_summary_untouched(self):
        owner = create_account('owner@example.com')
        existing = seed_lead(
            email=EMAIL,
            status='quoted',
            assigned_to=owner,
            summary='Original enquiry text',
            source='manual',
            touchpoint='',
        )
        before = Lead.objects.values().get(id=existing.id)
        self.assertEqual(self.post_contact().status_code, 201)
        after = Lead.objects.values().get(id=existing.id)
        unchanged = {key: value for key, value in before.items() if key != 'updated_at'}
        self.assertEqual({key: after[key] for key in unchanged}, unchanged)
        self.assertEqual(after['assigned_to_id'], owner.id)
        self.assertEqual(after['status'], 'quoted')
        self.assertEqual(after['summary'], 'Original enquiry text')

    def test_replaying_a_submission_id_adds_no_second_note_or_record(self):
        existing = seed_lead(email=EMAIL, status='contacted')
        submission_id = str(uuid.uuid4())
        first = self.post_contact(submission_id=submission_id)
        second = self.post_contact(submission_id=submission_id, message='A different retry body entirely.')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)
        self.assertEqual(LeadActivity.objects.filter(lead=existing, action='note_added').count(), 1)

    def test_replaying_a_customize_submission_id_adds_no_second_note(self):
        existing = seed_lead(email=EMAIL, status='new')
        submission_id = str(uuid.uuid4())
        first = self.post_customize(submission_id=submission_id)
        second = self.post_customize(submission_id=submission_id, description='Another description entirely.')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(CustomizeRequest.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)

    def test_duplicate_content_protection_still_blocks_a_retry_without_a_submission_id(self):
        seed_lead(email=EMAIL, status='contacted')
        first = self.post_contact(submission_id=None)
        second = self.post_contact(submission_id=None)
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(LeadNote.objects.count(), 1)

    def test_a_failed_enquiry_write_rolls_the_note_back(self):
        existing = seed_lead(email=EMAIL, status='contacted')
        with patch.object(ContactUsRepository, 'create_contact', side_effect=RuntimeError('db failed')):
            with self.assertRaises(RuntimeError):
                self.post_contact()
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 0)
        self.assertEqual(LeadActivity.objects.filter(lead=existing).count(), 0)

    def test_anonymous_enquiry_still_works_without_a_session(self):
        response = self.post_customize(phone=PHONE)
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        self.assertIsNone(lead.created_by_id)
        self.assertIsNone(CustomizeRequest.objects.get().user_id)


@override_settings(ROOT_URLCONF=CONSUMER_URLS)
class WebsiteEnquiryIdentityTests(TestCase):
    """Fail closed when the matching leads could describe more than one person."""

    def setUp(self):
        self.client = APIClient()

    def post_contact(self, **overrides):
        payload = {
            'name': 'Asha Rao',
            'email': EMAIL,
            'phone': PHONE,
            'message': 'Please quote a granite Ganesh for my shrine.',
            'touchpoint': 'contact_us',
            'submission_id': str(uuid.uuid4()),
        }
        payload.update(overrides)
        return self.client.post('/api/v1/contact/message', payload, format='json')

    def test_email_and_phone_pointing_at_different_leads_mutates_neither(self):
        by_email = seed_lead(email=EMAIL, status='contacted')
        by_phone = seed_lead(phone=PHONE, status='quoted')
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 3)
        self.assertEqual(LeadNote.objects.count(), 0)
        created = Lead.objects.exclude(id__in=[by_email.id, by_phone.id]).get()
        conflict = LeadActivity.objects.get(lead=created, action='identity_conflict')
        self.assertIn(str(by_email.uid), conflict.new_value)
        self.assertIn(str(by_phone.uid), conflict.new_value)
        self.assertNotIn(EMAIL, conflict.new_value)
        self.assertNotIn(PHONE, conflict.new_value)
        self.assertEqual(ContactMessage.objects.get().lead_id, created.id)
        self.assertEqual(LeadActivity.objects.filter(lead__in=[by_email, by_phone]).count(), 0)

    def test_a_matching_lead_with_a_contradicting_phone_is_not_reused(self):
        other = seed_lead(email=EMAIL, phone='+919845099999', status='contacted')
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 2)
        self.assertEqual(LeadNote.objects.filter(lead=other).count(), 0)

    def test_two_active_leads_for_the_same_person_reuse_the_newest(self):
        seed_lead(email=EMAIL, phone=PHONE, status='contacted', days_old=10)
        newest = seed_lead(email=EMAIL, phone=PHONE, status='quoted')
        response = self.post_contact()
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 2)
        self.assertEqual(LeadNote.objects.filter(lead=newest).count(), 1)
        self.assertEqual(LeadNote.objects.exclude(lead=newest).count(), 0)

    def test_a_blank_contact_field_does_not_match_other_leads_that_left_it_blank(self):
        unrelated = seed_lead(phone='+919845000000', status='contacted')
        response = self.post_contact(phone='')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(LeadNote.objects.filter(lead=unrelated).count(), 0)

    def test_signed_in_customize_without_an_email_matches_on_the_account_email(self):
        customer = create_account('buyer@example.com', role='customer', sales=False)
        existing = seed_lead(email='buyer@example.com', status='contacted')
        self.client.force_authenticate(user=customer)
        response = self.client.post('/api/v1/contact/customize', {
            'name': 'Buyer',
            'phone': PHONE,
            'city': 'Jaipur',
            'description': 'A seated Ganesh in white marble.',
            'submission_id': str(uuid.uuid4()),
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead=existing).count(), 1)
        self.assertEqual(CustomizeRequest.objects.get().lead_id, existing.id)

    def test_signed_in_customize_with_a_different_email_does_not_reuse_either_lead(self):
        customer = create_account('buyer@example.com', role='customer', sales=False)
        account_lead = seed_lead(email='buyer@example.com', status='contacted')
        typed_lead = seed_lead(email=EMAIL, status='contacted')
        self.client.force_authenticate(user=customer)
        response = self.client.post('/api/v1/contact/customize', {
            'name': 'Buyer',
            'email': EMAIL,
            'city': 'Jaipur',
            'description': 'A seated Ganesh in white marble.',
            'submission_id': str(uuid.uuid4()),
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(Lead.objects.count(), 3)
        self.assertEqual(LeadNote.objects.count(), 0)
        self.assertEqual(LeadActivity.objects.filter(lead__in=[account_lead, typed_lead]).count(), 0)

    def test_repeated_distinct_enquiries_stay_separate_while_phones_disagree(self):
        """Two open leads share an email and have different phones.

        Each new message creates its own lead. The original leads gain no
        notes, and the activity names their uids without the contact details.
        """
        first = seed_lead(email=EMAIL, phone='+919845011111', status='contacted')
        second = seed_lead(email=EMAIL, phone='+919845022222', status='quoted')
        first_response = self.post_contact(
            phone='+919845011111',
            message='First shrine enquiry for the seated Ganesh.',
            submission_id=None,
        )
        second_response = self.post_contact(
            phone='+919845011111',
            message='Second shrine enquiry for the standing Ganesh.',
            submission_id=None,
        )
        self.assertEqual(first_response.status_code, 201, first_response.content)
        self.assertEqual(second_response.status_code, 201, second_response.content)
        self.assertEqual(Lead.objects.count(), 4)
        self.assertEqual(LeadNote.objects.count(), 0)
        self.assertEqual(first.notes.count(), 0)
        self.assertEqual(second.notes.count(), 0)
        created = list(Lead.objects.exclude(id__in=[first.id, second.id]).order_by('id'))
        self.assertEqual(len(created), 2)
        for lead in created:
            conflict = LeadActivity.objects.get(lead=lead, action='identity_conflict')
            self.assertIn(str(first.uid), conflict.new_value)
            self.assertIn(str(second.uid), conflict.new_value)
            self.assertNotIn(EMAIL, conflict.new_value)
            self.assertNotIn('+919845011111', conflict.new_value)
        self.assertEqual(ContactMessage.objects.count(), 2)
        self.assertEqual(
            set(ContactMessage.objects.values_list('lead_id', flat=True)),
            {created[0].id, created[1].id},
        )


@override_settings(ROOT_URLCONF=CONSUMER_URLS)
class WebsiteEnquiryPostgresConcurrencyTests(TransactionTestCase):
    """Identical posts without a submission id must not both create an enquiry."""

    def setUp(self):
        self.assertEqual(connection.vendor, 'postgresql')
        _assert_isolated_test_database(self)

    def test_overlapping_identical_contact_and_product_posts_create_one_enquiry(self):
        for touchpoint, message in (
            ('contact_us', 'Please quote a granite Ganesh for the shrine.'),
            ('product_enquiry', 'Is the 24 inch Ganesh still available?'),
        ):
            email = f'{touchpoint}-{uuid.uuid4().hex[:8]}@example.com'
            payload = {
                'name': 'Concurrent Buyer',
                'email': email,
                'message': message,
                'touchpoint': touchpoint,
            }
            statuses, bodies = _post_identical_payloads('/api/v1/contact/message', payload)
            self.assertEqual(statuses, [201, 400], bodies)
            self.assertEqual(ContactMessage.objects.filter(email=email).count(), 1)
            self.assertEqual(Lead.objects.filter(email=email).count(), 1)
            self.assertEqual(LeadNote.objects.filter(lead__email=email).count(), 0)
            ContactMessage.objects.filter(email=email).delete()
            Lead.objects.filter(email=email).delete()

    def test_overlapping_identical_customize_posts_create_one_request(self):
        email = f'custom-{uuid.uuid4().hex[:8]}@example.com'
        payload = {
            'name': 'Concurrent Buyer',
            'email': email,
            'city': 'Jaipur',
            'description': 'A seated Ganesh in white marble, about three feet.',
        }
        statuses, bodies = _post_identical_payloads('/api/v1/contact/customize', payload)
        self.assertEqual(statuses, [201, 400], bodies)
        self.assertEqual(CustomizeRequest.objects.filter(email=email).count(), 1)
        self.assertEqual(Lead.objects.filter(email=email).count(), 1)
        self.assertEqual(LeadNote.objects.filter(lead__email=email).count(), 0)
