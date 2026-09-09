import logging
from django.core.cache import cache
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

        # Look up customer in Clerk and locally
        error, clerk_user = ClerkClient.get_user_by_email(email)
        customer_dict = CustomerRepository.get_customer_dict_by_email(email)

        if not clerk_user and customer_dict and customer_dict.get('clerk_id'):
            error, clerk_user = ClerkClient.get_user_by_id(customer_dict['clerk_id'])

        if clerk_user and not customer_dict:
            sync_result = CustomerRepository.sync_customer(
                clerk_id=clerk_user['id'],
                email=email,
            )
            customer_dict = sync_result.get('customer')

        email_sent = False
        if clerk_user:
            # Trigger Clerk to send the OTP verification email to the user
            email_addresses = clerk_user.get('email_addresses', [])
            email_id = None
            for ea in email_addresses:
                if ea.get('email_address', '').lower() == email.lower():
                    email_id = ea.get('id')
                    break
            if not email_id and email_addresses:
                email_id = email_addresses[0].get('id')

            if email_id:
                prep_err, prep_data = ClerkClient.prepare_email_verification(email_id)
                if not prep_err:
                    email_sent = True
                    verification_id = prep_data.get('id') if isinstance(prep_data, dict) else None
                    if verification_id:
                        cache.set(f"pwd_reset_ver_{email.lower()}", verification_id, timeout=900)
                else:
                    logger.warning("Clerk prepare_email_verification failed for %s: %s", email, prep_err)

        reset_token = None
        if customer_dict and customer_dict.get('is_active', True):
            reset_token = TokenService.generate_password_reset_token(customer_dict)

        from django.conf import settings
        response_data = {
            'message': 'Password reset OTP has been sent to your email.' if email_sent else 'If an account exists with this email address, password reset instructions have been sent.',
        }
        if email_sent and verification_id:
            response_data['verification_id'] = verification_id
        if (getattr(settings, 'DEBUG', False) or getattr(settings, 'IS_TESTING', False)) and reset_token:
            response_data['reset_token'] = reset_token

        return None, response_data

    @classmethod
    def reset_password(cls, data):
        token = data.get('token')
        code = data.get('code')
        email = data.get('email')
        verification_id = data.get('verification_id')
        new_password = data['new_password']

        clerk_user_id = None

        if code and email:
            # 1. Lookup user in Clerk
            error, clerk_user = ClerkClient.get_user_by_email(email)
            if error or not clerk_user:
                return 'Invalid email or OTP.', None

            clerk_user_id = clerk_user.get('id')
            email_addresses = clerk_user.get('email_addresses', [])
            email_id = None
            for ea in email_addresses:
                if ea.get('email_address', '').lower() == email.lower():
                    email_id = ea.get('id')
                    break
            if not email_id and email_addresses:
                email_id = email_addresses[0].get('id')

            if not email_id:
                return 'Email address not found.', None

            # Retrieve verification_id from cache if not passed directly
            if not verification_id:
                verification_id = cache.get(f"pwd_reset_ver_{email.lower()}")

            # 2. Verify OTP code with Clerk
            ver_err, is_verified = ClerkClient.attempt_email_verification(
                email_id, code, verification_id=verification_id
            )
            if ver_err or not is_verified:
                return ver_err or 'Invalid or expired OTP.', None

        elif token:
            # Verify reset JWT token
            try:
                payload = TokenService.verify_reset_token(token)
            except (AuthenticationFailed, ValidationError):
                return 'Invalid or expired password reset token.', None

            clerk_user_id = payload.get('sub')
            if not clerk_user_id:
                return 'Invalid password reset token.', None

        if not clerk_user_id:
            return 'Invalid password reset request.', None

        # 3. Update password in Clerk
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
        error, customer_dict = CustomerRepository.update_profile(customer_id, data)
        if error:
            return error, None
        return None, customer_dict

    @classmethod
    def logout(cls, customer_id, token=None):
        return None, {
            'message': 'Logged out successfully.',
        }
