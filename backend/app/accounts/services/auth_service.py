import logging
from app.accounts.repositories.customer_repository import CustomerRepository
from app.accounts.services.clerk_client import ClerkClient
from app.common.token_service import TokenService
from rest_framework.exceptions import AuthenticationFailed, ValidationError

logger = logging.getLogger(__name__)


class AuthService:
    """Service handling all authentication workflows delegating to Clerk and issuing JWT tokens."""

    @classmethod
    def signup(cls, data):
        email = data['email']
        password = data['password']
        name = data.get('name', '')
        phone = data.get('phone', '')

        # Check for local customer existence first
        if CustomerRepository.email_exists(email):
            return 'An account with this email address already exists.', None

        # Split full name into first and last name for Clerk
        first_name, last_name = None, None
        if name:
            parts = name.strip().split(' ', 1)
            first_name = parts[0]
            if len(parts) > 1:
                last_name = parts[1]

        # 1. Create user in Clerk
        error, clerk_user = ClerkClient.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone if phone else None,
        )
        if error:
            return error, None

        clerk_user_id = clerk_user.get('id')
        if not clerk_user_id:
            return 'Failed to obtain Clerk user ID.', None

        # 2. Sync local Customer record
        sync_result = CustomerRepository.sync_customer(
            clerk_id=clerk_user_id,
            email=email,
            name=name if name else None,
            phone=phone if phone else None,
        )
        customer_dict = sync_result.get('customer')

        # 3. Generate token pair
        tokens = TokenService.generate_token_pair(customer_dict)

        return None, {
            'user': customer_dict,
            **tokens,
        }

    @classmethod
    def login(cls, data):
        email = data['email']
        password = data['password']

        # 1. Query Clerk for user by email
        error, clerk_user = ClerkClient.get_user_by_email(email)
        if error or not clerk_user:
            return 'Invalid email or password.', None

        clerk_user_id = clerk_user.get('id')
        if not clerk_user_id:
            return 'Invalid email or password.', None

        # 2. Verify password with Clerk
        error, verified = ClerkClient.verify_password(clerk_user_id, password)
        if error or not verified:
            return 'Invalid email or password.', None

        # 3. Resolve user profile fields from Clerk
        first_name = clerk_user.get('first_name') or ''
        last_name = clerk_user.get('last_name') or ''
        full_name = f"{first_name} {last_name}".strip() or None

        phone_numbers = clerk_user.get('phone_numbers', [])
        phone = phone_numbers[0].get('phone_number') if phone_numbers else None

        # 4. Upsert/sync local Customer record
        sync_result = CustomerRepository.sync_customer(
            clerk_id=clerk_user_id,
            email=email,
            name=full_name,
            phone=phone,
        )
        customer_dict = sync_result.get('customer')

        if not customer_dict.get('is_active', True):
            return 'User account is inactive.', None

        # 5. Generate token pair
        tokens = TokenService.generate_token_pair(customer_dict)

        return None, {
            'user': customer_dict,
            **tokens,
        }

    @classmethod
    def forgot_password(cls, data):
        email = data['email']

        # Look up customer locally or in Clerk
        customer_dict = CustomerRepository.get_customer_dict_by_email(email)
        if not customer_dict:
            error, clerk_user = ClerkClient.get_user_by_email(email)
            if clerk_user:
                sync_result = CustomerRepository.sync_customer(
                    clerk_id=clerk_user['id'],
                    email=email,
                )
                customer_dict = sync_result.get('customer')

        reset_token = None
        if customer_dict and customer_dict.get('is_active', True):
            reset_token = TokenService.generate_password_reset_token(customer_dict)

        # Prevent exposing password reset token to unauthenticated clients in production.
        # Included in development/testing for API testing.
        from django.conf import settings
        response_data = {
            'message': 'If an account exists with this email address, password reset instructions have been generated.',
        }
        if (getattr(settings, 'DEBUG', False) or getattr(settings, 'IS_TESTING', False)) and reset_token:
            response_data['reset_token'] = reset_token

        return None, response_data

    @classmethod
    def reset_password(cls, data):
        token = data['token']
        new_password = data['new_password']

        # 1. Verify reset token
        try:
            payload = TokenService.verify_reset_token(token)
        except (AuthenticationFailed, ValidationError) as exc:
            return 'Invalid or expired password reset token.', None

        clerk_user_id = payload.get('sub')
        if not clerk_user_id:
            return 'Invalid password reset token.', None

        # 2. Update password in Clerk
        error, updated_user = ClerkClient.update_password(clerk_user_id, new_password)
        if error:
            return error, None

        return None, {
            'message': 'Password has been reset successfully. You can now log in with your new password.',
        }

    @classmethod
    def refresh_token(cls, data):
        refresh_token = data['refresh_token']

        # 1. Verify refresh token
        try:
            payload = TokenService.verify_refresh_token(refresh_token)
        except AuthenticationFailed as exc:
            return str(exc), None

        customer_id = payload.get('customer_id')
        clerk_id = payload.get('sub')

        # 2. Fetch customer
        customer_dict = None
        if customer_id:
            customer_dict = CustomerRepository.get_customer_dict_by_id(customer_id)
        if not customer_dict and clerk_id:
            customer_dict = CustomerRepository.get_customer_dict_by_clerk_id(clerk_id)

        if not customer_dict:
            return 'User account not found.', None

        if not customer_dict.get('is_active', True):
            return 'User account is inactive.', None

        # 3. Issue fresh tokens
        tokens = TokenService.generate_token_pair(customer_dict)
        return None, tokens

    @classmethod
    def get_current_user_profile(cls, customer_id):
        customer_dict = CustomerRepository.get_customer_dict_by_id(customer_id)
        if not customer_dict:
            return 'User not found.', None
        return None, customer_dict

    @classmethod
    def update_profile(cls, customer_id, data):
        customer = CustomerRepository.get_customer_by_id(customer_id)
        if not customer:
            return 'User not found.', None
        if 'name' in data:
            customer.name = data['name']
        if 'phone' in data:
            customer.phone = data['phone']
        update_fields = [k for k in ('name', 'phone') if k in data] + ['updated_at']
        customer.save(update_fields=update_fields)
        from app.accounts.serializers import CustomerSerializer
        return None, CustomerSerializer(customer).data

    @classmethod
    def logout(cls, customer_id, token=None):
        return None, {
            'message': 'Logged out successfully.',
        }
