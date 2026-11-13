import logging

import jwt
from django.core.cache import cache
from django.db import DataError, IntegrityError
from rest_framework.exceptions import AuthenticationFailed, ValidationError

from django.conf import settings

from app.accounts.identity import ADMIN_AUDIENCE, CONSUMER_AUDIENCE
from app.accounts.models import Employee
from app.accounts.repositories.customer_repository import CustomerRepository
from app.accounts.services.clerk_client import ClerkClient
from app.common.token_service import TokenService
from app.leads.constants import (
    SESSION_EVENT_LOGIN,
    SESSION_EVENT_SIGNUP,
    SESSION_EVENT_VERIFICATION,
)
from app.leads.services.lead_service import LeadService

logger = logging.getLogger(__name__)

CUSTOMER_AUTH_ONLY = 'This account action is only available on the customer application.'

_UPSTREAM_ERROR_MARKERS = (
    'Unable to contact authentication service',
    'Clerk secret key is not configured',
    'Too many requests',
    'Failed to query user',
    'Failed to retrieve user',
    'Failed to create user account',
    'Failed to send verification',
    'Password verification failed',
    'Failed to obtain Clerk user ID',
)


def _upstream_error(error):
    """Return a Clerk/transport failure unchanged so it is not shown as a bad password."""
    if not error:
        return None
    for marker in _UPSTREAM_ERROR_MARKERS:
        if marker in error:
            return error
    return None


def _email_record(clerk_user, email):
    addresses = (clerk_user or {}).get('email_addresses') or []
    for item in addresses:
        if item.get('email_address', '').lower() == email.lower():
            return item
    return addresses[0] if addresses else None


def _verification_cache_key(email):
    return f"email_ver_{email.lower()}"


def _needs_email_verification(clerk_user, email):
    """True only when Clerk explicitly says this address is not verified.

    Payloads that omit verification stay usable. Tests and older sessions
    do that, and treating them as unverified would lock those accounts out.
    """
    record = _email_record(clerk_user, email)
    if not record:
        return False
    # Reserved addresses are unverified. Clerk sends verification as null.
    if record.get('reserved') is True:
        return True
    status = (record.get('verification') or {}).get('status')
    if not status:
        return False
    return status != 'verified'


class AuthService:
    """Service handling all authentication workflows delegating to Clerk and issuing JWT tokens."""

    @staticmethod
    def _issue_session(customer_dict, event, audience=CONSUMER_AUDIENCE):
        """Issue tokens for a session that has just been established.

        Every flow that hands a customer their first working token pair goes
        through here, so the organic lead rules cannot drift between login,
        signup and verification. Token refresh and profile reads do not
        establish a session and must not call this.

        Lead bookkeeping must never turn a valid session into an
        authentication failure, so its errors are logged and dropped.
        """
        try:
            error, _result = LeadService.record_customer_session(customer_dict, event)
            if error:
                logger.warning('Organic lead skipped after a %s session: %s', event, error)
        except Exception:
            logger.exception('Organic lead handling failed after a %s session', event)
        return TokenService.generate_token_pair(customer_dict, audience=audience)

    @classmethod
    def _reject_unless_consumer(cls):
        if settings.DEPLOYMENT_MODE != 'consumer':
            return CUSTOMER_AUTH_ONLY
        return None

    @classmethod
    def _sync_customer(cls, **kwargs):
        try:
            return None, CustomerRepository.sync_customer(**kwargs)
        except ValueError as exc:
            return str(exc), None
        except IntegrityError:
            return 'An account with this email address already exists.', None
        except DataError:
            return 'One of the profile fields is too long.', None

    @classmethod
    def _pending_verification(cls, clerk_user, email):
        record = _email_record(clerk_user, email)
        email_id = record.get('id') if record else None
        if not email_id:
            return 'Email address not found.', None
        prep_err, prep_data = ClerkClient.prepare_email_verification(email_id)
        if prep_err:
            return prep_err, None
        verification_id = prep_data.get('id') if isinstance(prep_data, dict) else None
        payload = {
            'requires_verification': True,
            'email': email,
            'message': 'Please verify your email address with the OTP sent.',
        }
        if verification_id:
            payload['verification_id'] = verification_id
            cache.set(_verification_cache_key(email), verification_id, timeout=900)
        return None, payload

    @classmethod
    def signup(cls, data):
        rejected = cls._reject_unless_consumer()
        if rejected:
            return rejected, None
        email = data['email']
        password = data['password']
        name = data.get('name', '')
        phone = data.get('phone', '')

        # A finished local account already has a Clerk subject. An employee
        # shell without one can still claim this email on the customer app.
        existing = CustomerRepository.get_customer_dict_by_email(email)
        if existing and existing.get('clerk_user_id'):
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
            if 'already exists' in error.lower():
                lookup_error, existing_clerk = ClerkClient.get_user_by_email(email)
                if _upstream_error(lookup_error):
                    return lookup_error, None
                if existing_clerk and _needs_email_verification(existing_clerk, email):
                    return cls._pending_verification(existing_clerk, email)
                return 'An account with this email address already exists.', None
            return error, None

        clerk_user_id = clerk_user.get('id')
        if not clerk_user_id:
            return 'Failed to obtain Clerk user ID.', None

        # Check if email verification is required by Clerk
        email_addresses = clerk_user.get('email_addresses', [])
        email_id = None
        is_verified = False
        for ea in email_addresses:
            if ea.get('email_address', '').lower() == email.lower():
                email_id = ea.get('id')
                if (ea.get('verification') or {}).get('status') == 'verified':
                    is_verified = True
                break
        if not email_id and email_addresses:
            email_id = email_addresses[0].get('id')
            if (email_addresses[0].get('verification') or {}).get('status') == 'verified':
                is_verified = True

        if email_id and not is_verified:
            pending_error, pending = cls._pending_verification(clerk_user, email)
            if pending:
                return None, pending
            if _needs_email_verification(clerk_user, email):
                return pending_error or 'Unable to send the verification email. Please try again later.', None

        # 2. Sync local Customer record
        sync_error, sync_result = cls._sync_customer(
            clerk_id=clerk_user_id,
            email=email,
            name=name if name else None,
            phone=phone if phone else None,
        )
        if sync_error:
            return sync_error, None
        customer_dict = sync_result.get('customer')

        # 3. Generate token pair
        tokens = cls._issue_session(customer_dict, SESSION_EVENT_SIGNUP)

        return None, {
            'user': customer_dict,
            **tokens,
        }

    @classmethod
    def verify_signup(cls, data):
        rejected = cls._reject_unless_consumer()
        if rejected:
            return rejected, None
        email = data['email']
        code = data['code']
        name = data.get('name', '')
        phone = data.get('phone', '')

        # 1. Lookup user in Clerk
        error, clerk_user = ClerkClient.get_user_by_email(email)
        if _upstream_error(error):
            return error, None
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

        # 2. Verify OTP code with Clerk. The id is the one returned when the code was sent.
        verification_id = data.get('verification_id') or cache.get(_verification_cache_key(email))
        if not verification_id:
            return 'Please request a new verification code.', None
        ver_err, is_verified = ClerkClient.attempt_email_verification(
            email_id, code, verification_id=verification_id
        )
        if ver_err and 'verification_id' in ver_err.lower():
            return 'Please request a new verification code.', None
        if ver_err or not is_verified:
            return ver_err or 'Invalid or expired OTP.', None

        # 3. Create/Sync local customer
        sync_error, sync_result = cls._sync_customer(
            clerk_id=clerk_user_id,
            email=email,
            name=name if name else None,
            phone=phone if phone else None,
        )
        if sync_error:
            return sync_error, None
        customer_dict = sync_result.get('customer')

        if not customer_dict.get('is_active', True):
            return 'User account is inactive.', None

        # 4. Generate tokens
        tokens = cls._issue_session(customer_dict, SESSION_EVENT_VERIFICATION)

        return None, {
            'user': customer_dict,
            'message': 'Account verified and created successfully.',
            **tokens,
        }

    @classmethod
    def login(cls, data):
        email = data['email']
        password = data['password']

        # 1. Query Clerk for user by email
        error, clerk_user = ClerkClient.get_user_by_email(email)
        if _upstream_error(error):
            return error, None
        if error or not clerk_user:
            return 'Invalid email or password.', None

        clerk_user_id = clerk_user.get('id')
        if not clerk_user_id:
            return 'Invalid email or password.', None

        # 2. Verify password with Clerk
        error, verified = ClerkClient.verify_password(clerk_user_id, password)
        if _upstream_error(error):
            return error, None
        if error or not verified:
            return 'Invalid email or password.', None

        if _needs_email_verification(clerk_user, email):
            if settings.DEPLOYMENT_MODE == 'admin':
                return 'Please verify your email address before signing in.', None
            return cls._pending_verification(clerk_user, email)

        # 3. Resolve user profile fields from Clerk
        first_name = clerk_user.get('first_name') or ''
        last_name = clerk_user.get('last_name') or ''
        full_name = f"{first_name} {last_name}".strip() or None

        phone_numbers = clerk_user.get('phone_numbers', [])
        phone = phone_numbers[0].get('phone_number') if phone_numbers else None

        if settings.DEPLOYMENT_MODE == 'admin':
            return cls._issue_admin_login(clerk_user_id, email, full_name)

        sync_error, sync_result = cls._sync_customer(
            clerk_id=clerk_user_id,
            email=email,
            name=full_name,
            phone=phone,
        )
        if sync_error:
            return sync_error, None
        customer_dict = sync_result.get('customer')

        if not customer_dict.get('is_active', True):
            return 'User account is inactive.', None

        tokens = cls._issue_session(customer_dict, SESSION_EVENT_LOGIN)
        return None, {
            'user': customer_dict,
            **tokens,
        }

    @classmethod
    def _issue_admin_login(cls, clerk_user_id, email, full_name):
        """Admin login resolves an existing employee. It does not create one."""
        employee = CustomerRepository.get_active_employee_by_clerk_id(clerk_user_id)
        if employee is None:
            return 'Employee access is required.', None
        employee_dict = {
            'id': employee.user_id,
            'clerk_user_id': employee.clerk_user_id,
            'email': employee.email,
            'name': employee.name or full_name or '',
            'phone': employee.phone,
            'role': employee.role,
            'is_active': employee.is_active,
        }
        tokens = TokenService.generate_token_pair(employee_dict, audience=ADMIN_AUDIENCE)
        return None, {
            'user': {
                **employee_dict,
                'employee_id': employee.id,
            },
            **tokens,
        }

    @classmethod
    def forgot_password(cls, data):
        rejected = cls._reject_unless_consumer()
        if rejected:
            return rejected, None
        email = data['email']

        # Look up customer in Clerk and locally
        error, clerk_user = ClerkClient.get_user_by_email(email)
        if _upstream_error(error):
            return error, None
        customer_dict = CustomerRepository.get_customer_dict_by_email(email)

        clerk_subject = (customer_dict or {}).get('clerk_user_id') or (customer_dict or {}).get('clerk_id')
        if not clerk_user and clerk_subject:
            error, clerk_user = ClerkClient.get_user_by_id(clerk_subject)
            if _upstream_error(error):
                return error, None

        if clerk_user and not customer_dict and not _needs_email_verification(clerk_user, email):
            sync_error, sync_result = cls._sync_customer(
                clerk_id=clerk_user['id'],
                email=email,
            )
            if sync_error:
                return sync_error, None
            customer_dict = sync_result.get('customer')

        email_sent = False
        verification_id = None
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
                if prep_err:
                    if _upstream_error(prep_err):
                        return prep_err, None
                    logger.warning("Clerk prepare_email_verification failed for %s: %s", email, prep_err)
                else:
                    email_sent = True
                    verification_id = prep_data.get('id') if isinstance(prep_data, dict) else None
                    if verification_id:
                        cache.set(f"pwd_reset_ver_{email.lower()}", verification_id, timeout=900)
                        cache.set(_verification_cache_key(email), verification_id, timeout=900)

        reset_token = None
        if customer_dict and customer_dict.get('is_active', True):
            reset_token = TokenService.generate_password_reset_token(customer_dict)

        from django.conf import settings
        response_data = {
            'message': 'Password reset OTP has been sent to your email.' if email_sent else 'If an account exists with this email address, password reset instructions have been sent.',
        }
        if email_sent and verification_id:
            response_data['verification_id'] = verification_id
        if getattr(settings, 'IS_TESTING', False) and reset_token:
            response_data['reset_token'] = reset_token

        return None, response_data

    @classmethod
    def reset_password(cls, data):
        rejected = cls._reject_unless_consumer()
        if rejected:
            return rejected, None
        token = data.get('token')
        code = data.get('code')
        email = data.get('email')
        verification_id = data.get('verification_id')
        new_password = data['new_password']

        clerk_user_id = None

        if code and email:
            # 1. Lookup user in Clerk
            error, clerk_user = ClerkClient.get_user_by_email(email)
            if _upstream_error(error):
                return error, None
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
            if ver_err and 'verification_id' in ver_err.lower():
                return 'Please request a new verification code.', None
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

        audience = payload.get('aud') or CONSUMER_AUDIENCE
        clerk_id = payload.get('sub')
        if settings.DEPLOYMENT_MODE == 'admin' and audience != ADMIN_AUDIENCE:
            return 'Employee access is required.', None
        if settings.DEPLOYMENT_MODE != 'admin' and audience == ADMIN_AUDIENCE:
            return 'Employee access is required.', None
        if audience == ADMIN_AUDIENCE:
            employee = CustomerRepository.get_active_employee_by_clerk_id(clerk_id)
            if employee is None:
                return 'Employee access is required.', None
            employee_dict = {
                'id': employee.user_id,
                'clerk_user_id': employee.clerk_user_id,
                'email': employee.email,
                'name': employee.name or '',
                'role': employee.role,
                'is_active': True,
            }
            return None, TokenService.generate_token_pair(employee_dict, audience=ADMIN_AUDIENCE)

        customer_id = payload.get('customer_id')
        customer_dict = None
        if customer_id:
            customer_dict = CustomerRepository.get_customer_dict_by_id(customer_id)
        if not customer_dict and clerk_id:
            customer_dict = CustomerRepository.get_customer_dict_by_clerk_id(clerk_id)
        if not customer_dict:
            return 'User account not found.', None
        if not customer_dict.get('is_active', True):
            return 'User account is inactive.', None
        return None, TokenService.generate_token_pair(customer_dict, audience=CONSUMER_AUDIENCE)

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
        if token:
            try:
                session_id = jwt.decode(
                    token,
                    options={'verify_signature': False, 'verify_exp': False},
                    algorithms=['RS256', 'HS256'],
                ).get('sid')
            except jwt.PyJWTError:
                session_id = None
            if session_id:
                error, _ = ClerkClient.revoke_session(session_id)
                if error:
                    logger.warning("Clerk session revoke failed during logout: %s", error)
        return None, {
            'message': 'Logged out successfully.',
        }
