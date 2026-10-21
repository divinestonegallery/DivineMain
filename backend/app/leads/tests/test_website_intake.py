import uuid
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from app.accounts.models import Customer
from app.contactus.models import ContactMessage, CustomizeRequest
from app.contactus.services.admin_service import ContactUsAdminService
from app.leads.models import Lead, LeadActivity
from app.leads.tests.helpers import create_account


CONSUMER_URLS = 'divine_main.urls_consumer'
ADMIN_URLS = 'app.leads.tests.urls'


@override_settings(ROOT_URLCONF=CONSUMER_URLS)
class WebsiteIntakeTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def post_contact(self, **overrides):
        payload = {
            'name': 'Meera Iyer',
            'email': 'Meera@Example.com',
            'message': 'Please help me choose a granite murti.',
            'touchpoint': 'contact_us',
            'landing_path': '/contact?utm_source=ignored',
            'utm_source': 'newsletter',
            'utm_campaign': 'monsoon',
        }
        payload.update(overrides)
        return self.client.post('/api/v1/contact/message', payload, format='json')

    def test_email_only_contact_creates_an_unassigned_website_lead(self):
        response = self.post_contact(phone='')
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        message = ContactMessage.objects.get()
        self.assertEqual(lead.source, 'website')
        self.assertEqual(lead.touchpoint, 'contact_us')
        self.assertEqual(lead.email, 'meera@example.com')
        self.assertEqual(lead.phone, '')
        self.assertEqual(lead.landing_path, '/contact')
        self.assertEqual(lead.utm_source, 'newsletter')
        self.assertEqual(lead.utm_campaign, 'monsoon')
        self.assertIsNone(lead.assigned_to_id)
        self.assertIsNone(lead.created_by_id)
        self.assertEqual(message.lead_id, lead.id)
        self.assertEqual(message.email, 'meera@example.com')

    def test_phone_only_contact_is_normalized(self):
        response = self.post_contact(email='', phone='+91 98450 11111')
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        self.assertEqual(lead.phone, '+919845011111')
        self.assertEqual(lead.email, '')

    def test_contact_without_email_or_phone_is_rejected(self):
        response = self.post_contact(email='', phone='')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)
        self.assertEqual(ContactMessage.objects.count(), 0)

    def test_invalid_touchpoint_and_privileged_fields_are_rejected(self):
        invalid_touchpoint = self.post_contact(touchpoint='google_ads')
        privileged = self.post_contact(assigned_to=1, created_by=1, source='google_ads', role='admin')
        self.assertEqual(invalid_touchpoint.status_code, 400)
        self.assertEqual(privileged.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)

    def test_same_submission_id_does_not_create_a_second_lead(self):
        submission_id = str(uuid.uuid4())
        first = self.post_contact(submission_id=submission_id)
        second = self.post_contact(submission_id=submission_id, message='A different retry body that is still long enough.')
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(ContactMessage.objects.count(), 1)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(second.json()['data']['message'], first.json()['data']['message'])

    def test_repeated_genuine_enquiry_stays_separate_and_does_not_merge(self):
        first = self.post_contact(submission_id=str(uuid.uuid4()))
        second = self.post_contact(
            submission_id=str(uuid.uuid4()),
            message='I have another question about delivery to Chennai.',
        )
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 201, second.content)
        self.assertEqual(Lead.objects.count(), 2)
        original = Lead.objects.order_by('id').first()
        follow_up = Lead.objects.order_by('id').last()
        self.assertEqual(original.source, 'website')
        self.assertEqual(follow_up.source, 'website')
        self.assertNotEqual(original.summary, follow_up.summary)
        self.assertTrue(LeadActivity.objects.filter(lead=follow_up, action='possible_duplicate').exists())
        self.assertNotIn('uid', second.json()['data'])

    def test_identical_retry_without_a_submission_id_does_not_create_another_lead(self):
        first = self.post_contact()
        second = self.post_contact()
        self.assertEqual(first.status_code, 201, first.content)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(Lead.objects.count(), 1)

    def test_contact_record_failure_rolls_back_the_lead(self):
        with patch(
            'app.contactus.services.customer_service.ContactUsRepository.create_contact',
            side_effect=RuntimeError('db failed'),
        ):
            with self.assertRaises(RuntimeError):
                self.post_contact(submission_id=str(uuid.uuid4()))
        self.assertEqual(ContactMessage.objects.count(), 0)
        self.assertEqual(Lead.objects.count(), 0)

    def test_anonymous_custom_moorti_request_creates_an_unassigned_lead(self):
        response = self.client.post('/api/v1/contact/customize', {
            'name': 'Anonymous Example',
            'email': 'anonymous-moorti@example.com',
            'phone': '+919845011199',
            'city': 'Udaipur',
            'pincode': '313001',
            'description': 'A standing marble figure for a home shrine.',
            'submission_id': str(uuid.uuid4()),
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        request_row = CustomizeRequest.objects.get()
        self.assertEqual(lead.touchpoint, 'custom_moorti')
        self.assertEqual(lead.email, 'anonymous-moorti@example.com')
        self.assertIsNone(lead.created_by_id)
        self.assertIsNone(lead.assigned_to_id)
        self.assertIsNone(request_row.user_id)
        self.assertEqual(request_row.lead_id, lead.id)

    def test_custom_moorti_request_links_a_lead_without_assigning_it(self):
        customer = create_account('buyer@example.com', role=Customer.Role.CUSTOMER, sales=False, name='Buyer')
        self.client.force_authenticate(user=customer)
        response = self.client.post('/api/v1/contact/customize', {
            'name': 'Buyer',
            'phone': '9845012345',
            'city': 'Jaipur',
            'description': 'A seated Ganesh in white marble.',
            'submission_id': str(uuid.uuid4()),
            'utm_medium': 'organic',
        }, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        lead = Lead.objects.get()
        request_row = CustomizeRequest.objects.get()
        self.assertEqual(lead.touchpoint, 'custom_moorti')
        self.assertEqual(lead.phone, '9845012345')
        self.assertEqual(lead.city, 'Jaipur')
        self.assertEqual(lead.utm_medium, 'organic')
        self.assertEqual(lead.created_by_id, customer.id)
        self.assertIsNone(lead.assigned_to_id)
        self.assertEqual(request_row.lead_id, lead.id)
        self.assertEqual(request_row.user_id, customer.id)

    def test_contact_status_workflow_still_rejects_an_illegal_move(self):
        self.post_contact()
        message = ContactMessage.objects.get()
        error, _data = ContactUsAdminService.update_contact_status(message.id, 'contacted')
        self.assertIsNone(error)
        error, _data = ContactUsAdminService.update_contact_status(message.id, 'new')
        self.assertIsNotNone(error)

    def test_admin_can_list_the_unassigned_website_lead_and_consumers_cannot_open_admin_routes(self):
        self.post_contact(submission_id=str(uuid.uuid4()))
        hidden = self.client.get('/api/admin/leads')
        self.assertEqual(hidden.status_code, 404)
        admin = create_account('gallery-admin@example.com', role=Customer.Role.ADMIN, sales=False)
        with override_settings(ROOT_URLCONF=ADMIN_URLS):
            self.client.force_authenticate(user=admin)
            listing = self.client.get('/api/admin/leads?source=website&assignment=unassigned')
        self.assertEqual(listing.status_code, 200, listing.content)
        self.assertEqual(listing.json()['data']['pagination']['total_items'], 1)
        self.assertIsNone(listing.json()['data']['items'][0]['assigned_to'])

    def test_consumer_urls_do_not_mount_staff_group_routes(self):
        response = self.client.get('/api/admin/staff/groups')
        self.assertEqual(response.status_code, 404)
