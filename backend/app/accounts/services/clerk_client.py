import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class ClerkClient:
    """Wrapper client for Clerk Backend API (BAPI)."""

    BASE_URL = 'https://api.clerk.com/v1'

    @classmethod
    def _get_headers(cls):
        secret_key = settings.CLERK_SECRET_KEY
        if not secret_key:
            return None
        return {
            'Authorization': f'Bearer {secret_key}',
            'Content-Type': 'application/json',
        }

    @classmethod
    def is_configured(cls):
        return bool(settings.CLERK_SECRET_KEY)

    @classmethod
    def create_user(cls, email, password, first_name=None, last_name=None, phone=None):
        """Create a new user in Clerk."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', None

        payload = {
            'email_address': [email.strip().lower()],
            'password': password,
            'skip_password_checks': getattr(settings, 'CLERK_SKIP_PASSWORD_CHECKS', False),
        }
        if first_name:
            payload['first_name'] = first_name.strip()
        if last_name:
            payload['last_name'] = last_name.strip()
        if phone:
            payload['public_metadata'] = {'phone': phone.strip()}

        try:
            response = requests.post(
                f'{cls.BASE_URL}/users',
                headers=headers,
                json=payload,
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk create_user: %s", exc)
            return 'Unable to contact authentication service. Please try again later.', None

        if response.status_code in (200, 201):
            return None, response.json()

        return cls._format_error(response, default_msg='Failed to create user account with Clerk.')

    @classmethod
    def get_user_by_email(cls, email):
        """Retrieve user from Clerk by email address."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', None

        try:
            response = requests.get(
                f'{cls.BASE_URL}/users',
                headers=headers,
                params={'email_address': [email.strip().lower()]},
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk get_user_by_email: %s", exc)
            return 'Unable to contact authentication service. Please try again later.', None

        if response.status_code == 200:
            users = response.json()
            if isinstance(users, list) and len(users) > 0:
                return None, users[0]
            return None, None

        return cls._format_error(response, default_msg='Failed to query user by email.')

    @classmethod
    def get_user_by_id(cls, user_id):
        """Retrieve user from Clerk by user ID."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', None

        try:
            response = requests.get(
                f'{cls.BASE_URL}/users/{user_id}',
                headers=headers,
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk get_user_by_id: %s", exc)
            return 'Unable to contact authentication service. Please try again later.', None

        if response.status_code == 200:
            return None, response.json()

        if response.status_code == 404:
            return 'User not found in authentication service.', None

        return cls._format_error(response, default_msg='Failed to retrieve user.')

    @classmethod
    def verify_password(cls, user_id, password):
        """Verify user password with Clerk."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', False

        try:
            response = requests.post(
                f'{cls.BASE_URL}/users/{user_id}/verify_password',
                headers=headers,
                json={'password': password},
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk verify_password: %s", exc)
            return 'Unable to contact authentication service. Please try again later.', False

        if response.status_code == 200:
            data = response.json()
            if data.get('verified') is True:
                return None, True
            return 'Invalid email or password.', False

        if response.status_code in (400, 422):
            return 'Invalid email or password.', False

        return cls._format_error(response, default_msg='Password verification failed.'), False

    @classmethod
    def update_password(cls, user_id, new_password):
        """Update/reset a user password in Clerk."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', None

        try:
            response = requests.patch(
                f'{cls.BASE_URL}/users/{user_id}',
                headers=headers,
                json={
                    'password': new_password,
                    'skip_password_checks': getattr(settings, 'CLERK_SKIP_PASSWORD_CHECKS', False),
                },
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk update_password: %s", exc)
            return 'Unable to contact authentication service. Please try again later.', None

        if response.status_code in (200, 201):
            return None, response.json()

        return cls._format_error(response, default_msg='Failed to update password.')

    @classmethod
    def create_sign_in_token(cls, user_id, expires_in_seconds=2592000):
        """Create a sign-in token in Clerk."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', None

        try:
            response = requests.post(
                f'{cls.BASE_URL}/sign_in_tokens',
                headers=headers,
                json={'user_id': user_id, 'expires_in_seconds': expires_in_seconds},
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk create_sign_in_token: %s", exc)
            return 'Unable to contact authentication service. Please try again later.', None

        if response.status_code in (200, 201):
            return None, response.json()

        return cls._format_error(response, default_msg='Failed to create sign-in token.')

    @classmethod
    def revoke_session(cls, session_id):
        """Revoke a Clerk session."""
        headers = cls._get_headers()
        if not headers:
            return 'Clerk secret key is not configured.', None

        try:
            response = requests.post(
                f'{cls.BASE_URL}/sessions/{session_id}/revoke',
                headers=headers,
                timeout=10,
            )
        except requests.RequestException as exc:
            logger.error("Failed to connect to Clerk revoke_session: %s", exc)
            return 'Unable to contact authentication service.', None

        if response.status_code == 200:
            return None, response.json()

        return cls._format_error(response, default_msg='Failed to revoke session.')

    @staticmethod
    def _format_error(response, default_msg):
        try:
            data = response.json()
            errors = data.get('errors', [])
            if errors and isinstance(errors, list):
                messages = []
                for err in errors:
                    msg = err.get('long_message') or err.get('message')
                    code = err.get('code')
                    if code == 'form_identifier_exists':
                        messages.append('An account with this email address already exists.')
                    elif code == 'form_password_pwned':
                        messages.append('This password has been compromised in an external data breach. Please choose a safer password.')
                    elif code == 'form_password_length_too_short':
                        messages.append('Password is too short.')
                    elif code == 'form_password_validation_failed':
                        messages.append(msg or 'Password does not meet security requirements.')
                    elif msg:
                        messages.append(msg)
                if messages:
                    return '; '.join(messages), None
        except Exception:
            pass

        if response.status_code == 429:
            return 'Too many requests. Please try again in a few minutes.', None

        return default_msg, None
