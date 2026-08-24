import logging
from functools import lru_cache

import jwt
from django.conf import settings
from jwt import PyJWKClient
from rest_framework import authentication, exceptions

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
            clerk_user_id = payload.get("sub")
            if not clerk_user_id:
                raise exceptions.AuthenticationFailed("Token contains no valid subject.")

            customer = CustomerRepository.get_or_create_authenticated_customer(
                clerk_id=clerk_user_id,
                email=payload.get("email"),
                name=payload.get("name", ""),
            )
            if not customer.is_active:
                raise exceptions.AuthenticationFailed("User account is inactive.")

            return customer, token
        except exceptions.AuthenticationFailed:
            raise
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
            return TokenService.decode_hs256_token(token, expected_type="access")

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
