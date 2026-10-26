from pathlib import Path

from django.urls import URLPattern, URLResolver

from app.leads.models import Lead, LeadActivity
from app.leads.tests.helpers import LeadApiTestCase, create_account
from divine_main.test_runner import DEFAULT_TEST_LABELS
from divine_main.urls_consumer import urlpatterns as consumer_patterns


def flatten_routes(patterns, prefix=''):
    routes = []
    for pattern in patterns:
        route = prefix + str(pattern.pattern)
        if isinstance(pattern, URLResolver):
            routes.extend(flatten_routes(pattern.url_patterns, route))
        elif isinstance(pattern, URLPattern):
            routes.append(route)
    return routes


class LeadAuthorizationTests(LeadApiTestCase):
    def test_default_runner_discovers_lead_tests(self):
        self.assertIn('app.leads.tests', DEFAULT_TEST_LABELS)

    def test_consumer_urls_do_not_expose_lead_routes(self):
        routes = flatten_routes(consumer_patterns)
        self.assertFalse(any('leads' in route or 'notifications' in route for route in routes))
        admin_urls = Path(__file__).resolve().parents[3] / 'divine_main' / 'urls_admin.py'
        consumer_urls = Path(__file__).resolve().parents[3] / 'divine_main' / 'urls_consumer.py'
        admin_text = admin_urls.read_text()
        consumer_text = consumer_urls.read_text()
        self.assertIn("include('app.leads.urls_admin')", admin_text)
        self.assertIn("include('app.leads.urls_notifications')", admin_text)
        self.assertNotIn('app.leads', consumer_text)

    def test_anonymous_and_customer_and_inactive_staff_are_rejected(self):
        anonymous = self.client.get('/api/admin/leads')
        self.assertEqual(anonymous.status_code, 401)
        self.assertFalse(anonymous.json()['success'])

        customer = create_account('buyer@example.com', role='customer', sales=False)
        self.as_user(customer)
        forbidden = self.client.get('/api/admin/leads')
        self.assertEqual(forbidden.status_code, 403)

        inactive = create_account('inactive@example.com', active=False, sales=True)
        self.as_user(inactive)
        inactive_response = self.client.get('/api/admin/leads')
        self.assertEqual(inactive_response.status_code, 403)

    def test_staff_without_lead_access_is_denied(self):
        staff = create_account('plain@example.com', sales=False)
        self.as_user(staff)
        response = self.client.get('/api/admin/leads')
        self.assertEqual(response.status_code, 403)
        self.assertIn('permission', response.json()['message'].lower())

    def test_sales_staff_cannot_read_another_employees_lead_by_uid(self):
        owner = create_account('owner@example.com', name='Lead Owner')
        other = create_account('other@example.com', name='Other Staff')
        created = self.create_lead(owner, email='owner-lead@example.com', phone='9845011111')
        self.assertEqual(created.status_code, 201, created.content)
        uid = created.json()['data']['uid']

        self.as_user(other)
        detail = self.client.get(f'/api/admin/leads/{uid}')
        update = self.client.patch(
            f'/api/admin/leads/{uid}',
            {'status': 'contacted'},
            format='json',
        )
        note = self.client.post(
            f'/api/admin/leads/{uid}/notes',
            {'body': 'Should not be saved'},
            format='json',
        )
        assignment = self.client.post(
            f'/api/admin/leads/{uid}/assignment',
            {'assigned_to': other.id},
            format='json',
        )
        follow_up = self.client.patch(
            f'/api/admin/leads/{uid}',
            {'follow_up_at': '2026-10-22T09:00:00Z'},
            format='json',
        )
        activity = self.client.get(f'/api/admin/leads/{uid}/activity')
        listing = self.client.get('/api/admin/leads')

        for response in (detail, update, note, follow_up, activity):
            self.assertEqual(response.status_code, 404, response.content)
        self.assertEqual(assignment.status_code, 403)
        self.assertEqual(listing.json()['data']['pagination']['total_items'], 0)
        self.assertFalse(LeadActivity.objects.filter(new_value='Should not be saved').exists())

    def test_view_all_does_not_grant_assignment_or_group_management(self):
        admin = create_account('admin@example.com', role='admin', sales=False, name='Gallery Admin')
        wide = create_account('wide@example.com', sales=False, name='Wide Staff')
        owner = create_account('source@example.com', name='Source Staff')
        created = self.create_lead(owner, email='hidden@example.com', phone='9845022222')
        uid = created.json()['data']['uid']

        self.as_user(admin)
        group = self.client.post('/api/admin/staff/groups', {
            'name': 'Sales Manager',
            'description': 'Company-wide lead visibility',
            'permissions': ['leads.access', 'leads.view_all'],
        }, format='json')
        self.assertEqual(group.status_code, 201, group.content)
        membership = self.client.post('/api/admin/staff/memberships', {
            'employee_id': wide.id,
            'user_id': wide.user_id,
            'group_id': group.json()['data']['id'],
        }, format='json')
        self.assertEqual(membership.status_code, 201, membership.content)

        self.as_user(wide)
        visible = self.client.get(f'/api/admin/leads/{uid}')
        self.assertEqual(visible.status_code, 200)
        self.assertEqual(visible.json()['data']['email'], 'hidden@example.com')
        denied_assign = self.client.post(
            f'/api/admin/leads/{uid}/assignment',
            {'assigned_to': wide.id},
            format='json',
        )
        denied_group = self.client.post('/api/admin/staff/groups', {
            'name': 'Should Fail',
            'permissions': ['leads.access'],
        }, format='json')
        self.assertEqual(denied_assign.status_code, 403)
        self.assertEqual(denied_group.status_code, 403)

    def test_customer_cannot_be_assigned(self):
        admin = create_account('assign-admin@example.com', role='admin', sales=False)
        buyer = create_account('buyer-assign@example.com', role='customer', sales=False)
        created = self.create_lead(admin, email='assign@example.com', phone='9845033333', assigned_to=None)
        self.assertEqual(created.status_code, 201, created.content)
        uid = created.json()['data']['uid']
        response = self.client.post(
            f'/api/admin/leads/{uid}/assignment',
            {'assigned_to': buyer.id},
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsNone(Lead.objects.get(uid=uid).assigned_to_id)

    def test_deactivating_an_assignee_keeps_the_lead_and_history(self):
        staff = create_account('kept@example.com', name='Kept Staff')
        created = self.create_lead(staff, email='kept-lead@example.com', phone='9845044444')
        uid = created.json()['data']['uid']
        staff.is_active = False
        staff.save(update_fields=['is_active', 'updated_at'])
        lead = Lead.objects.get(uid=uid)
        self.assertEqual(lead.assigned_to_id, staff.id)
        self.assertGreaterEqual(lead.activities.count(), 1)
