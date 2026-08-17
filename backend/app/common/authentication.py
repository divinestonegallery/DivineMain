import jwt
import requests
from django.conf import settings
from rest_framework import authentication, exceptions
from app.accounts.models import Customer
import logging

logger = logging.getLogger(__name__)

class ClerkAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class that verifies Clerk JWTs.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        
        if not settings.CLERK_JWT_ISSUER:
            # During early dev, if not set, we might bypass or raise error
            raise exceptions.AuthenticationFailed('Clerk issuer not configured.')

        jwks_url = f"{settings.CLERK_JWT_ISSUER}/.well-known/jwks.json"

        try:
            # Get the unverified header to find the kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get('kid')

            # Fetch JWKS
            # Note: In production, caching the JWKS response is highly recommended
            # to avoid a network call on every request.
            jwks_response = requests.get(jwks_url)
            jwks = jwks_response.json()

            # Find the correct key
            rsa_key = {}
            for key in jwks.get('keys', []):
                if key['kid'] == kid:
                    rsa_key = {
                        'kty': key['kty'],
                        'kid': key['kid'],
                        'use': key['use'],
                        'n': key['n'],
                        'e': key['e']
                    }
                    break

            if not rsa_key:
                raise exceptions.AuthenticationFailed('Unable to find appropriate key')

            # Verify the token
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(rsa_key)
            payload = jwt.decode(
                token,
                public_key,
                algorithms=['RS256'],
                options={"verify_aud": False}, # Adjust based on your Clerk config
                issuer=settings.CLERK_JWT_ISSUER
            )
            
            clerk_user_id = payload.get('sub')
            if not clerk_user_id:
                raise exceptions.AuthenticationFailed('Token contains no valid subject')

            # Get or create the local customer record
            # We can extract emails from the token if included by Clerk (often in payload['email'] or payload['email_addresses'])
            email = payload.get('email', f"{clerk_user_id}@placeholder.com") # Adjust as per Clerk token claims
            name = payload.get('name', '')
            
            customer, created = Customer.objects.get_or_create(
                clerk_user_id=clerk_user_id,
                defaults={'email': email, 'name': name}
            )
            
            return (customer, token)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.PyJWTError as e:
            logger.error(f"JWT decode error: {str(e)}")
            raise exceptions.AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            raise exceptions.AuthenticationFailed('Authentication failed')
