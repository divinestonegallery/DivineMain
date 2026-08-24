import datetime
import logging
import jwt
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed, ValidationError

logger = logging.getLogger(__name__)

ACCESS_TOKEN_LIFETIME_SECONDS = getattr(settings, 'AUTH_ACCESS_TOKEN_LIFETIME', 3600)  # 1 hour
REFRESH_TOKEN_LIFETIME_SECONDS = getattr(settings, 'AUTH_REFRESH_TOKEN_LIFETIME', 30 * 86400)  # 30 days
RESET_TOKEN_LIFETIME_SECONDS = getattr(settings, 'AUTH_RESET_TOKEN_LIFETIME', 900)  # 15 minutes
TOKEN_ISSUER = getattr(settings, 'AUTH_TOKEN_ISSUER', 'divinestonegallery-backend')


class TokenService:
    """Service to issue and verify JWT tokens (Access, Refresh, Password Reset)."""

    @classmethod
    def _get_secret_key(cls):
        return getattr(settings, 'DJANGO_SECRET_KEY', None) or getattr(settings, 'SECRET_KEY', 'default-key')

    @classmethod
    def generate_token_pair(cls, customer_dict):
        """
        Generate both access and refresh tokens for an authenticated customer.
        customer_dict is expected to be a dictionary with id, clerk_user_id, email, role, etc.
        """
        access_token = cls.generate_access_token(customer_dict)
        refresh_token = cls.generate_refresh_token(customer_dict)
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'Bearer',
            'expires_in': ACCESS_TOKEN_LIFETIME_SECONDS,
        }

    @classmethod
    def generate_access_token(cls, customer_dict):
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'sub': customer_dict.get('clerk_user_id'),
            'customer_id': customer_dict.get('id'),
            'email': customer_dict.get('email'),
            'name': customer_dict.get('name', ''),
            'role': customer_dict.get('role', 'customer'),
            'token_type': 'access',
            'iss': TOKEN_ISSUER,
            'iat': int(now.timestamp()),
            'exp': int((now + datetime.timedelta(seconds=ACCESS_TOKEN_LIFETIME_SECONDS)).timestamp()),
        }
        return jwt.encode(payload, cls._get_secret_key(), algorithm='HS256')

    @classmethod
    def generate_refresh_token(cls, customer_dict):
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'sub': customer_dict.get('clerk_user_id'),
            'customer_id': customer_dict.get('id'),
            'email': customer_dict.get('email'),
            'token_type': 'refresh',
            'iss': TOKEN_ISSUER,
            'iat': int(now.timestamp()),
            'exp': int((now + datetime.timedelta(seconds=REFRESH_TOKEN_LIFETIME_SECONDS)).timestamp()),
        }
        return jwt.encode(payload, cls._get_secret_key(), algorithm='HS256')

    @classmethod
    def generate_password_reset_token(cls, customer_dict):
        now = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'sub': customer_dict.get('clerk_user_id'),
            'customer_id': customer_dict.get('id'),
            'email': customer_dict.get('email'),
            'token_type': 'password_reset',
            'iss': TOKEN_ISSUER,
            'iat': int(now.timestamp()),
            'exp': int((now + datetime.timedelta(seconds=RESET_TOKEN_LIFETIME_SECONDS)).timestamp()),
        }
        return jwt.encode(payload, cls._get_secret_key(), algorithm='HS256')

    @classmethod
    def decode_hs256_token(cls, token, expected_type='access'):
        """Decode and validate an HS256 token issued by this backend."""
        try:
            payload = jwt.decode(
                token,
                cls._get_secret_key(),
                algorithms=['HS256'],
                issuer=TOKEN_ISSUER,
                options={'verify_exp': True},
            )
            token_type = payload.get('token_type')
            if token_type != expected_type:
                raise AuthenticationFailed(f"Invalid token type. Expected {expected_type}, got {token_type}.")
            return payload
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationFailed("Token has expired.") from exc
        except jwt.InvalidTokenError as exc:
            raise AuthenticationFailed("Invalid token.") from exc

    @classmethod
    def verify_refresh_token(cls, refresh_token):
        """Validate a refresh token and return payload."""
        return cls.decode_hs256_token(refresh_token, expected_type='refresh')

    @classmethod
    def verify_reset_token(cls, reset_token):
        """Validate a password reset token and return payload."""
        try:
            return cls.decode_hs256_token(reset_token, expected_type='password_reset')
        except AuthenticationFailed as exc:
            raise ValidationError(str(exc))
