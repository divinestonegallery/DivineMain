import json
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from app.accounts.models import Customer
from app.accounts.serializers import CustomerSerializer
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
        self.assertTrue(Customer.objects.filter(email=self.test_email, clerk_user_id=self.test_clerk_id).exists())

    def test_signup_duplicate_email(self):
        Customer.objects.create(
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
        customer = Customer.objects.create(
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
        customer = Customer.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
            name='Refresh Test',
        )
        customer_dict = CustomerSerializer(customer).data
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
        customer = Customer.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
            name='Authenticated User',
        )
        customer_dict = CustomerSerializer(customer).data
        access_token = TokenService.generate_access_token(customer_dict)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/api/v1/auth/me')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['email'], self.test_email)
        self.assertEqual(data['data']['name'], 'Authenticated User')

    def test_me_endpoint_unauthorized(self):
        response = self.client.get('/api/v1/auth/me')
        self.assertEqual(response.status_code, 401)

    def test_logout_endpoint(self):
        customer = Customer.objects.create(
            clerk_user_id=self.test_clerk_id,
            email=self.test_email,
        )
        customer_dict = CustomerSerializer(customer).data
        access_token = TokenService.generate_access_token(customer_dict)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.post('/api/v1/auth/logout')

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['message'], 'Logged out successfully.')
