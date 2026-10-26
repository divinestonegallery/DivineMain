import logging
from functools import lru_cache

import jwt
from django.conf import settings
from jwt import PyJWKClient
from rest_framework import authentication, exceptions

from django.conf import settings

from app.accounts.identity import ADMIN_AUDIENCE, CONSUMER_AUDIENCE
from app.accounts.models import Employee, User
from app.accounts.repositories.customer_repository import CustomerRepository

logger = logging.getLogger(__name__)


class ClerkAuthentication(authentication.BaseAuthentication):
    """Verify Clerk session JWTs and resolve the local customer principal."""

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None

        parts = auth_header.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer" and parts[1]:
            token = parts[1]
        elif len(parts) == 1 and parts[0].count(".") == 2:
            token = parts[0]
        else:
            raise exceptions.AuthenticationFailed("Invalid Authorization header.")
        try:
            payload = self._decode_token(token)
            principal = self._principal(payload)
            return principal, token
        except exceptions.AuthenticationFailed:
            raise
        except ValueError as exc:
            raise exceptions.AuthenticationFailed(str(exc)) from exc
        except jwt.ExpiredSignatureError as exc:
            raise exceptions.AuthenticationFailed("Token has expired.") from exc
        except jwt.PyJWTError as exc:
            logger.warning("Clerk JWT verification failed: %s", exc.__class__.__name__)
            raise exceptions.AuthenticationFailed("Invalid token.") from exc
        except Exception as exc:
            logger.exception("Unexpected Clerk authentication failure")
            raise exceptions.AuthenticationFailed("Authentication failed.") from exc

    def authenticate_header(self, request):
        return "Bearer"

    def _decode_token(self, token):
        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg")
        except Exception:
            alg = "RS256"

        if alg == "HS256":
            from app.common.token_service import TokenService
            payload = TokenService.decode_hs256_token(token, expected_type="access")
            audience = payload.get("aud")
            if audience not in {CONSUMER_AUDIENCE, ADMIN_AUDIENCE}:
                raise exceptions.AuthenticationFailed("Token audience is not accepted.")
            return payload

        if not settings.CLERK_JWT_ISSUER:
            raise exceptions.AuthenticationFailed("Clerk issuer not configured.")

        public_key = self._get_verification_key(token)
        decode_options = {"verify_aud": bool(settings.CLERK_JWT_AUDIENCE)}
        decode_arguments = {
            "jwt": token,
            "key": public_key,
            "algorithms": ["RS256"],
            "issuer": settings.CLERK_JWT_ISSUER,
            "leeway": settings.CLERK_JWT_LEEWAY_SECONDS,
            "options": decode_options,
        }
        if settings.CLERK_JWT_AUDIENCE:
            decode_arguments["audience"] = settings.CLERK_JWT_AUDIENCE

        payload = jwt.decode(**decode_arguments)
        authorized_party = payload.get("azp")
        if (
            authorized_party
            and settings.CLERK_AUTHORIZED_PARTIES
            and authorized_party not in settings.CLERK_AUTHORIZED_PARTIES
        ):
            raise exceptions.AuthenticationFailed("Token origin is not authorized.")
        return payload

    def _principal(self, payload):
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise exceptions.AuthenticationFailed("Token contains no valid subject.")
        audience = payload.get("aud")
        if settings.DEPLOYMENT_MODE == "admin" and audience == CONSUMER_AUDIENCE:
            raise exceptions.AuthenticationFailed("Token audience is not accepted.")
        if settings.DEPLOYMENT_MODE != "admin" and audience == ADMIN_AUDIENCE:
            raise exceptions.AuthenticationFailed("Token audience is not accepted.")
        if audience == ADMIN_AUDIENCE or (
            audience is None and settings.DEPLOYMENT_MODE == "admin"
        ):
            employee = CustomerRepository.get_active_employee_by_clerk_id(clerk_user_id)
            if employee is None:
                raise exceptions.AuthenticationFailed("Employee access is required.")
            return employee
        if audience not in {None, CONSUMER_AUDIENCE}:
            raise exceptions.AuthenticationFailed("Token audience is not accepted.")
        user = CustomerRepository.get_or_create_authenticated_customer(
            clerk_id=clerk_user_id,
            email=payload.get("email"),
            name=payload.get("name", ""),
        )
        if not isinstance(user, User) or not user.is_active:
            raise exceptions.AuthenticationFailed("User account is inactive.")
        return user

    @staticmethod
    def _get_verification_key(token):
        if settings.CLERK_JWT_KEY:
            return settings.CLERK_JWT_KEY.replace("\\n", "\n")

        jwks_url = f"{settings.CLERK_JWT_ISSUER.rstrip('/')}/.well-known/jwks.json"
        return _get_jwks_client(
            jwks_url,
            settings.CLERK_JWKS_TIMEOUT_SECONDS,
        ).get_signing_key_from_jwt(token).key


@lru_cache(maxsize=4)
def _get_jwks_client(jwks_url, timeout):
    return PyJWKClient(
        jwks_url,
        cache_keys=True,
        cache_jwk_set=True,
        lifespan=300,
        timeout=timeout,
    )


class ConsumerAuthentication(ClerkAuthentication):
    """Consumer sessions resolve to a User and never to an Employee."""

    def _principal(self, payload):
        if payload.get("aud") == ADMIN_AUDIENCE:
            raise exceptions.AuthenticationFailed("Token audience is not accepted.")
        clerk_user_id = payload.get("sub")
        if clerk_user_id and Employee.objects.filter(clerk_user_id=clerk_user_id).exists():
            raise exceptions.AuthenticationFailed("Token audience is not accepted.")
        return super()._principal(payload)


class AdminAuthentication(ClerkAuthentication):
    """Admin sessions resolve to an active Employee. A missing row does not grant access."""

    def _principal(self, payload):
        if payload.get("aud") == CONSUMER_AUDIENCE:
            raise exceptions.AuthenticationFailed("Token audience is not accepted.")
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise exceptions.AuthenticationFailed("Token contains no valid subject.")
        employee = CustomerRepository.get_active_employee_by_clerk_id(clerk_user_id)
        if employee is None:
            raise exceptions.AuthenticationFailed("Employee access is required.")
        return employee


# Framework base views depend on this name so they do not import Clerk.
ApplicationAuthentication = ClerkAuthentication
