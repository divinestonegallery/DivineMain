import time
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import TestCase, override_settings
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework.test import APIClient

from app.accounts.models import Customer
from app.accounts.services.webhook_service import AccountWebhookService
from app.common.permissions import IsAdmin, IsStaffOrAdmin


TEST_ISSUER = "https://test-instance.clerk.accounts.dev"
TEST_ORIGIN = "https://divinestonegallery.com"


def iter_url_patterns(patterns, prefix=""):
    for pattern in patterns:
        route = prefix + str(pattern.pattern)
        if isinstance(pattern, URLResolver):
            yield from iter_url_patterns(pattern.url_patterns, route)
        elif isinstance(pattern, URLPattern):
            yield route, pattern


class AdminAuthorizationTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        cls.private_key = private_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        cls.public_key = private_key.public_key().public_bytes(
            serialization.Encoding.PEM,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()

    def setUp(self):
        self.client = APIClient()

    def token(self, *, subject, email, origin=TEST_ORIGIN, expired=False):
        now = int(time.time())
        payload = {
            "iss": TEST_ISSUER,
            "sub": subject,
            "azp": origin,
            "iat": now - 120 if expired else now,
            "nbf": now - 120 if expired else now - 1,
            "exp": now - 60 if expired else now + 300,
            "email": email,
            "name": "Authorization Test",
        }
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    def clerk_settings(self):
        return override_settings(
            CLERK_JWT_ISSUER=TEST_ISSUER,
            CLERK_JWT_KEY=self.public_key,
            CLERK_JWT_AUDIENCE="",
            CLERK_AUTHORIZED_PARTIES={TEST_ORIGIN},
            CLERK_JWT_LEEWAY_SECONDS=5,
            ADMIN_EMAILS={"divinestonegallery@gmail.com"},
        )

    def assert_standard_error(self, response, expected_status):
        self.assertEqual(response.status_code, expected_status)
        self.assertEqual(set(response.json()), {"success", "message", "data"})
        self.assertFalse(response.json()["success"])

    def test_missing_token_is_unauthorized(self):
        response = self.client.get("/api/admin/products")
        self.assert_standard_error(response, 401)

    def test_malformed_token_is_unauthorized(self):
        response = self.client.get(
            "/api/admin/products",
            HTTP_AUTHORIZATION="Bearer malformed-token",
        )
        self.assert_standard_error(response, 401)

    def test_valid_customer_is_forbidden(self):
        with self.clerk_settings():
            token = self.token(
                subject="user_customer",
                email="customer@example.com",
            )
            response = self.client.get(
                "/api/admin/products",
                HTTP_AUTHORIZATION=f"Bearer {token}",
            )
        self.assert_standard_error(response, 403)

    def test_allowlisted_owner_is_bootstrapped_as_admin(self):
        with self.clerk_settings():
            token = self.token(
                subject="user_owner",
                email="divinestonegallery@gmail.com",
            )
            response = self.client.get(
                "/api/admin/products",
                HTTP_AUTHORIZATION=f"Bearer {token}",
            )

        self.assertEqual(response.status_code, 200)
        owner = Customer.objects.get(clerk_user_id="user_owner")
        self.assertEqual(owner.role, Customer.Role.ADMIN)

    def test_existing_placeholder_user_is_promoted_when_verified_email_arrives(self):
        Customer.objects.create(
            clerk_user_id="user_owner_late_email",
            email="user_owner_late_email@users.invalid",
        )
        with self.clerk_settings():
            token = self.token(
                subject="user_owner_late_email",
                email="divinestonegallery@gmail.com",
            )
            response = self.client.get(
                "/api/admin/products",
                HTTP_AUTHORIZATION=f"Bearer {token}",
            )

        self.assertEqual(response.status_code, 200)
        owner = Customer.objects.get(clerk_user_id="user_owner_late_email")
        self.assertEqual(owner.email, "divinestonegallery@gmail.com")
        self.assertEqual(owner.role, Customer.Role.ADMIN)

    def test_clerk_deleted_user_is_deactivated_and_loses_admin_access(self):
        owner = Customer.objects.create(
            clerk_user_id="user_deleted_owner",
            email="deleted-owner@example.com",
            role=Customer.Role.ADMIN,
        )
        error, result = AccountWebhookService.process_clerk_webhook(
            {"type": "user.deleted", "data": {"id": owner.clerk_user_id}},
            event_id="evt_deleted_owner",
        )
        owner.refresh_from_db()

        self.assertIsNone(error)
        self.assertTrue(result["updated"])
        self.assertFalse(owner.is_active)

        self.client.force_authenticate(user=owner)
        response = self.client.get("/api/admin/products")
        self.assert_standard_error(response, 403)

    def test_staff_and_admin_are_allowed_but_inactive_staff_is_forbidden(self):
        for role, is_active, expected_status in (
            (Customer.Role.STAFF, True, 200),
            (Customer.Role.ADMIN, True, 200),
            (Customer.Role.STAFF, False, 403),
        ):
            with self.subTest(role=role, is_active=is_active):
                user = Customer.objects.create(
                    clerk_user_id=f"{role}-{is_active}",
                    email=f"{role}-{is_active}@example.com",
                    role=role,
                    is_active=is_active,
                )
                self.client.force_authenticate(user=user)
                response = self.client.get("/api/admin/products")
                self.assertEqual(response.status_code, expected_status)
                self.client.force_authenticate(user=None)

    def test_expired_and_wrong_origin_tokens_are_unauthorized(self):
        cases = (
            self.token(
                subject="user_expired",
                email="expired@example.com",
                expired=True,
            ),
            self.token(
                subject="user_wrong_origin",
                email="origin@example.com",
                origin="https://attacker.example",
            ),
        )
        with self.clerk_settings():
            for token in cases:
                with self.subTest(token=token[:12]):
                    response = self.client.get(
                        "/api/admin/products",
                        HTTP_AUTHORIZATION=f"Bearer {token}",
                    )
                    self.assert_standard_error(response, 401)

    def test_every_admin_and_upload_route_has_staff_permission(self):
        protected_routes = []
        for route, pattern in iter_url_patterns(get_resolver().url_patterns):
            if route.startswith("api/admin") or route == "api/v1/common/upload/presigned-url":
                protected_routes.append(route)
                view_class = pattern.callback.view_class
                self.assertTrue(
                    IsStaffOrAdmin in view_class.permission_classes
                    or IsAdmin in view_class.permission_classes,
                    msg=f"{route} is missing a staff authorization policy",
                )

        self.assertGreaterEqual(len(protected_routes), 14)

    def test_faq_write_and_upload_signing_reject_anonymous_requests(self):
        faq_response = self.client.post(
            "/api/admin/faqs",
            {"question": "Blocked", "answer": "Blocked"},
            format="json",
        )
        upload_response = self.client.get(
            "/api/v1/common/upload/presigned-url?filename=test.jpg&file_type=image/jpeg"
        )
        self.assert_standard_error(faq_response, 401)
        self.assert_standard_error(upload_response, 401)

    def test_clerk_webhook_rejects_unsigned_requests(self):
        with override_settings(CLERK_WEBHOOK_SECRET="whsec_test-only-secret"):
            response = self.client.post(
                "/api/webhooks/accounts/clerk",
                {"type": "user.created", "data": {}},
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["success"])

    def test_public_catalogue_remains_public(self):
        response = self.client.post("/api/v1/products", {}, format='json')
        self.assertEqual(response.status_code, 200)
