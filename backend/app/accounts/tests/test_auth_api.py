import json
from unittest.mock import patch

import jwt
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from app.accounts.models import Employee, User
from app.accounts.serializers import UserSerializer
from app.accounts.services.auth_service import AuthService
from app.common.token_service import TokenService


class AuthAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.test_email = "testuser@example.com"
        self.test_password = "StrongPassword123!"
        self.test_clerk_id = "user_test_clerk_12345"

    def test_signup_success(self):
        clerk_user_payload = {
            'id': self.test_clerk_id,
            'email_addresses': [{'email_address': self.test_email}],
            'first_name': 'Test',
            'last_name': 'User',
        }
        with patch('app.accounts.services.clerk_client.ClerkClient.create_user', return_value=(None, clerk_user_payload)):
            response = self.client.post(
                '/api/v1/auth/signup',
                {
                    'email': self.test_email,
                    'password': self.test_password,
                    'name': 'Test User',
                    'phone': '+1234567890',
                },
                format='json',
            )

        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data['data'])
        self.assertIn('refresh_token', data['data'])
        self.assertEqual(data['data']['user']['email'], self.test_email)
        self.assertTrue(User.objects.filter(email=self.test_email, clerk_user_id=self.test_clerk_id).exists())

    def test_signup_duplicate_email(self):
        User.objects.create(
            clerk_user_id='user_existing_111',
            email=self.test_email,
            name='Existing User',
        )
        response = self.client.post(
            '/api/v1/auth/signup',
            {
                'email': self.test_email,
                'password': self.test_password,
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('already exists', data['message'])

    def test_signup_validation_error(self):
        response = self.client.post(
            '/api/v1/auth/signup',
            {
                'email': 'not-an-email',
                'password': 'short',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])

    def test_login_success(self):
        clerk_user_payload = {
            'id': self.test_clerk_id,
            'email_addresses': [{'email_address': self.test_email}],
            'first_name': 'Test',
            'last_name': 'User',
            'phone_numbers': [{'phone_number': '+1234567890'}],
        }
        with patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email', return_value=(None, clerk_user_payload)), \
             patch('app.accounts.services.clerk_client.ClerkClient.verify_password', return_value=(None, True)):
            response = self.client.post(
                '/api/v1/auth/login',
                {
                    'email': self.test_email,
                    'password': self.test_password,
                },
                format='json',
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data['data'])
        self.assertIn('refresh_token', data['data'])
        self.assertEqual(data['data']['user']['email'], self.test_email)

    def test_login_invalid_password(self):
        clerk_user_payload = {
            'id': self.test_clerk_id,
            'email_addresses': [{'email_address': self.test_email}],
        }
        with patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email', return_value=(None, clerk_user_payload)), \
             patch('app.accounts.services.clerk_client.ClerkClient.verify_password', return_value=('Invalid email or password.', False)):
            response = self.client.post(
                '/api/v1/auth/login',
                {
                    'email': self.test_email,
                    'password': 'WrongPassword123!',
                },
                format='json',
            )

        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['message'], 'Invalid email or password.')

    def test_login_user_not_found_in_clerk(self):
        with patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email', return_value=(None, None)):
            response = self.client.post(
                '/api/v1/auth/login',
                {
                    'email': 'nonexistent@example.com',
                    'password': self.test_password,
                },
                format='json',
            )

        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertFalse(data['success'])

    def test_forgot_password_and_reset_password_flow(self):
        customer = User.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
            name='Reset Test',
        )

        # 1. Forgot password request
        response = self.client.post(
            '/api/v1/auth/forgot-password',
            {'email': self.test_email},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        reset_token = data['data']['reset_token']
        self.assertIsNotNone(reset_token)

        # 2. Reset password using valid token
        with patch('app.accounts.services.clerk_client.ClerkClient.update_password', return_value=(None, {'id': self.test_clerk_id})):
            reset_response = self.client.post(
                '/api/v1/auth/reset-password',
                {
                    'token': reset_token,
                    'new_password': 'BrandNewPassword123!',
                },
                format='json',
            )
        self.assertEqual(reset_response.status_code, 200)
        reset_data = reset_response.json()
        self.assertTrue(reset_data['success'])
        self.assertIn('Password has been reset successfully', reset_data['message'])

    def test_reset_password_with_otp(self):
        clerk_user = {
            'id': self.test_clerk_id,
            'email_addresses': [{'id': 'idn_test', 'email_address': self.test_email}],
        }
        with patch('app.accounts.services.auth_service.ClerkClient.get_user_by_email', return_value=(None, clerk_user)), \
             patch('app.accounts.services.auth_service.ClerkClient.attempt_email_verification', return_value=(None, True)) as attempt, \
             patch('app.accounts.services.auth_service.ClerkClient.update_password', return_value=(None, {'id': self.test_clerk_id})):
            response = self.client.post(
                '/api/v1/auth/reset-password',
                {
                    'email': self.test_email,
                    'code': '123456',
                    'new_password': 'BrandNewPassword123!',
                },
                format='json',
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('Password has been reset successfully', data['message'])
        self.assertEqual(attempt.call_args.args[1], '123456')

    def test_reset_password_invalid_token(self):
        response = self.client.post(
            '/api/v1/auth/reset-password',
            {
                'token': 'invalid.token.structure',
                'new_password': 'BrandNewPassword123!',
            },
            format='json',
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('Invalid or expired', data['message'])

    def test_refresh_token_success(self):
        customer = User.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
            name='Refresh Test',
        )
        customer_dict = UserSerializer(customer).data
        refresh_token = TokenService.generate_refresh_token(customer_dict)

        response = self.client.post(
            '/api/v1/auth/refresh',
            {'refresh_token': refresh_token},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data['data'])
        self.assertIn('refresh_token', data['data'])

    def test_refresh_token_invalid(self):
        response = self.client.post(
            '/api/v1/auth/refresh',
            {'refresh_token': 'garbage_refresh_token'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertFalse(data['success'])

    def test_me_endpoint_authenticated(self):
        customer = User.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
            name='Authenticated User',
        )
        customer_dict = UserSerializer(customer).data
        access_token = TokenService.generate_access_token(customer_dict)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/v1/auth/profile')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['email'], self.test_email)
        self.assertEqual(data['data']['name'], 'Authenticated User')

    def test_me_endpoint_unauthorized(self):
        response = self.client.get('/api/v1/auth/profile')
        self.assertEqual(response.status_code, 401)

    def test_logout_endpoint(self):
        customer = User.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
        )
        customer_dict = UserSerializer(customer).data
        access_token = TokenService.generate_access_token(customer_dict)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.post('/api/v1/auth/logout')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['message'], 'Logged out successfully.')

    def test_logout_revokes_clerk_session_when_token_has_sid(self):
        customer = User.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
        )
        token = jwt.encode({'sid': 'sess_123', 'sub': self.test_clerk_id}, 'unused', algorithm='HS256')
        with patch(
            'app.accounts.services.auth_service.ClerkClient.revoke_session',
            return_value=(None, {}),
        ) as revoke:
            error, data = AuthService.logout(customer.id, token=token)
        self.assertIsNone(error)
        self.assertEqual(data['message'], 'Logged out successfully.')
        revoke.assert_called_once_with('sess_123')

    def test_logout_skips_clerk_revoke_for_backend_tokens(self):
        customer = User.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
        )
        customer_dict = UserSerializer(customer).data
        access_token = TokenService.generate_access_token(customer_dict)
        with patch(
            'app.accounts.services.auth_service.ClerkClient.revoke_session',
            return_value=(None, {}),
        ) as revoke:
            error, data = AuthService.logout(customer.id, token=access_token)
        self.assertIsNone(error)
        self.assertEqual(data['message'], 'Logged out successfully.')
        revoke.assert_not_called()


@override_settings(DEPLOYMENT_MODE='admin', ROOT_URLCONF='divine_main.urls_admin')
class AdminAuthBoundaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_customer_account_routes_do_not_create_a_user(self):
        with patch('app.accounts.services.clerk_client.ClerkClient.create_user') as create_user, \
             patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email') as lookup, \
             patch('app.accounts.services.clerk_client.ClerkClient.update_password') as update_password:
            signup = self.client.post('/api/v1/auth/signup', {
                'email': 'new-admin-person@example.com',
                'password': 'StrongPassword123!',
                'name': 'New Person',
            }, format='json')
            verify = self.client.post('/api/v1/auth/verify-signup', {
                'email': 'new-admin-person@example.com',
                'code': '123456',
            }, format='json')
            forgot = self.client.post('/api/v1/auth/forgot-password', {
                'email': 'new-admin-person@example.com',
            }, format='json')
            reset = self.client.post('/api/v1/auth/reset-password', {
                'email': 'new-admin-person@example.com',
                'code': '123456',
                'new_password': 'StrongPassword123!',
            }, format='json')
        for response in (signup, verify, forgot, reset):
            self.assertEqual(response.status_code, 404, response.content)
            self.assertIn('customer application', response.json()['message'])
        create_user.assert_not_called()
        lookup.assert_not_called()
        update_password.assert_not_called()
        self.assertFalse(User.objects.exists())
        self.assertFalse(Employee.objects.exists())

    def test_missing_or_inactive_employee_login_is_unauthorized(self):
        clerk_user = {
            'id': 'admin_subject_missing',
            'email_addresses': [{'email_address': 'missing@example.com'}],
            'first_name': 'Missing',
            'last_name': 'Admin',
        }
        with patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email', return_value=(None, clerk_user)), \
             patch('app.accounts.services.clerk_client.ClerkClient.verify_password', return_value=(None, True)):
            missing = self.client.post('/api/v1/auth/login', {
                'email': 'missing@example.com',
                'password': 'StrongPassword123!',
            }, format='json')
        self.assertEqual(missing.status_code, 401, missing.content)
        self.assertEqual(missing.json()['message'], 'Employee access is required.')
        self.assertFalse(User.objects.filter(email='missing@example.com').exists())
        self.assertFalse(Employee.objects.exists())

        user = User.objects.create(email='inactive-admin@example.com', name='Inactive')
        Employee.objects.create(user=user, clerk_user_id='admin_subject_inactive', role='admin', is_active=False)
        inactive_clerk = {
            'id': 'admin_subject_inactive',
            'email_addresses': [{'email_address': user.email}],
            'first_name': 'Inactive',
        }
        with patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email', return_value=(None, inactive_clerk)), \
             patch('app.accounts.services.clerk_client.ClerkClient.verify_password', return_value=(None, True)):
            inactive = self.client.post('/api/v1/auth/login', {
                'email': user.email,
                'password': 'StrongPassword123!',
            }, format='json')
        self.assertEqual(inactive.status_code, 401, inactive.content)
        user.refresh_from_db()
        self.assertIsNone(user.clerk_user_id)

    def test_unlinked_employee_cannot_authenticate(self):
        user = User.objects.create(email='unlinked@example.com', clerk_user_id='consumer-subject')
        Employee.objects.create(user=user, clerk_user_id=None, role='staff', is_active=True)
        clerk_user = {
            'id': 'admin_subject_unlinked',
            'email_addresses': [{'email_address': user.email}],
            'first_name': 'Unlinked',
        }
        with patch('app.accounts.services.clerk_client.ClerkClient.get_user_by_email', return_value=(None, clerk_user)), \
             patch('app.accounts.services.clerk_client.ClerkClient.verify_password', return_value=(None, True)):
            response = self.client.post('/api/v1/auth/login', {
                'email': user.email,
                'password': 'StrongPassword123!',
            }, format='json')
        self.assertEqual(response.status_code, 401, response.content)
        user.refresh_from_db()
        self.assertEqual(user.clerk_user_id, 'consumer-subject')
        self.assertFalse(Employee.objects.filter(clerk_user_id='admin_subject_unlinked').exists())
