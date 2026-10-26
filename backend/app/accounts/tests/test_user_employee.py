from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from app.accounts.services.staff_service import StaffService

from app.accounts.identity import ADMIN_AUDIENCE, CONSUMER_AUDIENCE
from app.accounts.models import Employee, User
from app.common.token_service import TokenService
from app.leads.models import Lead
from app.leads.tests.helpers import ADMIN_URLCONF, create_account


@override_settings(ROOT_URLCONF=ADMIN_URLCONF)
class UserEmployeeModelTests(TestCase):
    def test_a_user_can_exist_without_an_employee_record(self):
        user = create_account('buyer@example.com', role='customer', sales=False)
        self.assertIsInstance(user, User)
        self.assertFalse(Employee.objects.filter(user=user).exists())

    def test_an_employee_references_one_existing_user(self):
        employee = create_account('desk@example.com', role='staff', sales=False)
        self.assertEqual(employee.user.email, 'desk@example.com')
        self.assertIsNone(employee.user.clerk_user_id)
        self.assertTrue(employee.clerk_user_id)
        with self.assertRaises(Exception):
            Employee.objects.create(user=employee.user, role='admin', clerk_user_id='second-clerk')

    def test_a_lead_can_belong_to_a_user(self):
        user = create_account('owner@example.com', role='customer', sales=False)
        lead = Lead.objects.create(
            name='Owner',
            email=user.email,
            summary='A customer enquiry',
            source='website',
            touchpoint='contact_us',
            user=user,
            created_by=user,
        )
        self.assertEqual(lead.user_id, user.id)
        self.assertIsNone(lead.created_by_employee_id)


@override_settings(ROOT_URLCONF=ADMIN_URLCONF)
class UserAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = create_account('owner@example.com', role='admin', sales=False, name='Owner')
        self.customer = create_account('buyer@example.com', role='customer', sales=False, name='Buyer')
        self.staff = create_account('seller@example.com', role='staff', sales=True, name='Seller')

    def test_admin_lists_customers_and_employees_without_duplicates_or_secrets(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/admin/users?search=example.com')
        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()['data']
        emails = [item['email'] for item in payload['items']]
        self.assertEqual(emails, ['buyer@example.com', 'owner@example.com', 'seller@example.com'])
        self.assertEqual(payload['pagination']['total_items'], 3)
        self.assertEqual(payload['pagination']['page'], 1)
        buyer = payload['items'][0]
        self.assertFalse(buyer['is_employee'])
        self.assertIsNone(buyer['employee_role'])
        seller = payload['items'][2]
        self.assertTrue(seller['is_employee'])
        self.assertEqual(seller['employee_role'], 'staff')
        self.assertNotIn('clerk_user_id', buyer)
        self.assertNotIn('access_token', response.json()['data'])

    def test_admin_can_promote_a_user_once(self):
        self.client.force_authenticate(user=self.admin)
        first = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'staff'},
            format='json',
        )
        self.assertEqual(first.status_code, 200, first.content)
        self.assertTrue(first.json()['data']['created'])
        self.assertFalse(first.json()['data']['login_ready'])
        second = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'staff'},
            format='json',
        )
        self.assertEqual(second.status_code, 200, second.content)
        self.assertFalse(second.json()['data']['created'])
        self.assertEqual(Employee.objects.filter(user=self.customer).count(), 1)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.clerk_user_id, 'clerk-buyer@example.com')

    def test_promotion_and_role_change_do_not_reactivate_an_employee(self):
        self.client.force_authenticate(user=self.admin)
        created = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'staff'},
            format='json',
        )
        self.assertEqual(created.status_code, 200, created.content)
        employee = Employee.objects.get(user=self.customer)
        employee.is_active = False
        employee.save(update_fields=['is_active', 'updated_at'])

        changed = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'admin'},
            format='json',
        )
        self.assertEqual(changed.status_code, 200, changed.content)
        employee.refresh_from_db()
        self.assertEqual(employee.role, 'admin')
        self.assertFalse(employee.is_active)
        self.assertFalse(changed.json()['data']['login_ready'])

        repeated = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'admin'},
            format='json',
        )
        self.assertEqual(repeated.status_code, 200, repeated.content)
        self.assertFalse(repeated.json()['data']['created'])
        employee.refresh_from_db()
        self.assertFalse(employee.is_active)

    @patch('app.accounts.services.staff_service.ClerkClient.update_user_public_metadata', return_value=(None, {}))
    @patch('app.accounts.services.staff_service.ClerkClient.is_configured', return_value=True)
    def test_staff_role_update_does_not_reactivate(self, _configured, _metadata):
        self.staff.is_active = False
        self.staff.save(update_fields=['is_active', 'updated_at'])
        error, _data = StaffService.update_staff(self.staff.id, {'role': 'admin'}, self.admin.id)
        self.assertIsNone(error)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.role, 'admin')
        self.assertFalse(self.staff.is_active)

    def test_invalid_role_staff_and_customer_are_rejected(self):
        self.client.force_authenticate(user=self.admin)
        invalid = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'owner'},
            format='json',
        )
        self.assertEqual(invalid.status_code, 400)

        self.client.force_authenticate(user=self.staff)
        denied = self.client.post(
            f'/api/admin/users/{self.customer.id}/employee',
            {'role': 'admin'},
            format='json',
        )
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.customer)
        customer_denied = self.client.get('/api/admin/users')
        self.assertEqual(customer_denied.status_code, 403)
        self.assertEqual(Employee.objects.filter(user=self.customer).count(), 0)


class AudienceSeparationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            clerk_user_id='consumer-subject',
            email='buyer@example.com',
            name='Buyer',
        )
        admin_user = User.objects.create(email='admin@example.com', name='Admin')
        self.employee = Employee.objects.create(
            user=admin_user,
            clerk_user_id='admin-subject',
            role='admin',
            is_active=True,
        )

    def token(self, clerk_user_id, customer_id, audience):
        return TokenService.generate_access_token({
            'id': customer_id,
            'clerk_user_id': clerk_user_id,
            'email': 'person@example.com',
            'role': 'customer',
        }, audience=audience)

    @override_settings(ROOT_URLCONF='divine_main.urls_consumer')
    def test_admin_token_cannot_open_a_consumer_profile(self):
        token = self.token(self.employee.clerk_user_id, self.employee.user_id, ADMIN_AUDIENCE)
        response = self.client.get('/api/v1/auth/profile', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 401)

    @override_settings(ROOT_URLCONF='divine_main.urls_admin')
    def test_consumer_token_cannot_open_an_admin_route(self):
        token = self.token(self.user.clerk_user_id, self.user.id, CONSUMER_AUDIENCE)
        response = self.client.get('/api/admin/products', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 401)
        self.assertFalse(Employee.objects.filter(user=self.user).exists())

    @override_settings(ROOT_URLCONF='divine_main.urls_admin')
    def test_admin_token_resolves_the_employee(self):
        token = self.token(self.employee.clerk_user_id, self.employee.user_id, ADMIN_AUDIENCE)
        response = self.client.get('/api/admin/products', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 200, response.content)

    @override_settings(ROOT_URLCONF='divine_main.urls_admin')
    def test_missing_employee_fails_closed(self):
        token = self.token('unknown-admin-subject', self.user.id, ADMIN_AUDIENCE)
        response = self.client.get('/api/admin/products', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 401)

    @override_settings(ROOT_URLCONF='divine_main.urls_admin')
    def test_inactive_employee_token_is_rejected(self):
        self.employee.is_active = False
        self.employee.save(update_fields=['is_active', 'updated_at'])
        token = self.token(self.employee.clerk_user_id, self.employee.user_id, ADMIN_AUDIENCE)
        response = self.client.get('/api/admin/products', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(response.status_code, 401)

    @override_settings(DEPLOYMENT_MODE='admin')
    def test_profile_update_does_not_reactivate_a_deactivated_employee(self):
        from app.accounts.services.webhook_service import AccountWebhookService

        self.employee.is_active = False
        self.employee.role = 'staff'
        self.employee.save(update_fields=['is_active', 'role', 'updated_at'])
        error, result = AccountWebhookService.process_clerk_webhook({
            'type': 'user.updated',
            'data': {
                'id': self.employee.clerk_user_id,
                'first_name': 'Renamed',
                'last_name': 'Admin',
                'primary_email_address_id': 'email_admin',
                'email_addresses': [{'id': 'email_admin', 'email_address': self.employee.user.email}],
                'public_metadata': {'role': 'admin'},
            },
        }, 'evt_keep_inactive')
        self.assertIsNone(error)
        self.assertEqual(result['employee_id'], self.employee.id)
        self.employee.refresh_from_db()
        self.employee.user.refresh_from_db()
        self.assertFalse(self.employee.is_active)
        self.assertEqual(self.employee.role, 'staff')
        self.assertEqual(self.employee.user.name, 'Renamed Admin')
        self.assertIsNone(self.employee.user.clerk_user_id)
