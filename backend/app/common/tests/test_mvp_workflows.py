import gzip
import io
import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import Mock, patch

from django.core import checks
from django.core.cache import cache
from django.db import connection
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from app.accounts.models import Customer
from app.accounts.services.webhook_service import AccountWebhookService
from app.common.checks import production_configuration_check
from app.common.management.commands.backup_database import Command as BackupCommand
from app.common.models import APIErrorLog, StaffAuditLog, UploadSession
from app.common.repositories import UploadRepository
from app.common.services.upload_service import UploadService
from app.contactus.models import ContactMessage, CustomizeRequest
from app.faq.models import FAQ
from app.products.models import Category, Diety, Material, Product, ProductImage
from app.reviews.models import Review



class MVPTestCase(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = Customer.objects.create(
            clerk_user_id='admin_1',
            email='admin@example.com',
            role=Customer.Role.ADMIN,
        )
        self.staff = Customer.objects.create(
            clerk_user_id='staff_1',
            email='staff@example.com',
            role=Customer.Role.STAFF,
        )
        self.customer = Customer.objects.create(
            clerk_user_id='customer_1',
            email='customer@example.com',
            role=Customer.Role.CUSTOMER,
        )
        self.category = Category.objects.create(name='Deity Idol')
        self.material = Material.objects.create(name='White Marble')
        self.deity = Diety.objects.create(name='Ganesh Ji')
        self.deity.categories.add(self.category)

    def authenticate(self, user=None):
        self.client.force_authenticate(user=user or self.admin)

    def create_product(self, **overrides):
        payload = {
            'category': self.category.id,
            'material': self.material.id,
            'diety': self.deity.id,
            'name': 'Lord Ganesh Ji',
            'status': 'draft',
            'sales_mode': 'direct_purchase',
        }
        payload.update(overrides)
        self.authenticate()
        response = self.client.post('/api/admin/products', payload, format='json')
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()['data']

    def attach_image(self, product_id, suffix='a', cover=True):
        object_key = f"product-images/{suffix * 32}.jpg"
        UploadSession.objects.create(
            object_key=object_key,
            purpose=UploadSession.Purpose.PRODUCT_IMAGE,
            expected_content_type='image/jpeg',
            expected_size=1000,
            expires_at=timezone.now() + timedelta(minutes=30),
            created_by=self.admin,
        )
        with (
            patch.object(UploadService, 'inspect_image', return_value=(None, {
                'content_type': 'image/jpeg', 'file_size': 1000, 'width': 1200, 'height': 1200,
            })),
            patch.object(UploadService, 'public_url', return_value=f'https://media.example/{object_key}'),
        ):
            response = self.client.post(
                f'/api/admin/products/{product_id}/images',
                {'object_key': object_key, 'alt_text': 'Ganesh moorti', 'cover_photo': cover},
                format='json',
            )
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()['data'], object_key

    def test_draft_publish_gate_and_public_visibility(self):
        product = self.create_product()
        self.client.force_authenticate(user=None)
        hidden = self.client.get('/api/v1/products')
        self.assertEqual(hidden.json()['data']['pagination']['total_items'], 0)

        self.authenticate()
        rejected = self.client.patch(
            f"/api/admin/products/{product['id']}", {'status': 'active'}, format='json'
        )
        self.assertEqual(rejected.status_code, 400)
        self.assertIn('cover image', rejected.json()['message'])

        image, _ = self.attach_image(product['id'])
        published = self.client.patch(
            f"/api/admin/products/{product['id']}", {'status': 'active'}, format='json'
        )
        self.assertEqual(published.status_code, 200, published.content)

        self.client.force_authenticate(user=None)
        visible = self.client.get('/api/v1/products?search=Ganesh&sort=newest')
        self.assertEqual(visible.status_code, 200)
        self.assertEqual(visible.json()['data']['pagination']['total_items'], 1)
        detail = self.client.get(f"/api/v1/products/{product['slug']}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()['data']['images'][0]['image_url'], image['image_url'])

    def test_static_catalogue_routes_are_not_treated_as_product_slugs(self):
        for path in ('categories', 'materials', 'deities'):
            response = self.client.get(f'/api/v1/products/{path}')
            self.assertEqual(response.status_code, 200, path)
            self.assertIsInstance(response.json()['data'], list)

    def test_image_claim_is_owner_bound_single_use_and_delete_removes_r2(self):
        product = self.create_product()
        image, key = self.attach_image(product['id'])
        second, _second_key = self.attach_image(product['id'], suffix='b', cover=False)
        self.assertEqual(UploadSession.objects.get(object_key=key).status, UploadSession.Status.ATTACHED)
        self.assertIsNone(UploadRepository.claim_pending_session(key, self.admin.id))

        reordered = self.client.post(
            f"/api/admin/products/{product['id']}/images/reorder",
            {'image_ids': [second['id'], image['id']]},
            format='json',
        )
        self.assertEqual(reordered.status_code, 200)
        self.assertEqual(
            list(ProductImage.objects.filter(product_id=product['id']).order_by('display_order').values_list('id', flat=True)),
            [second['id'], image['id']],
        )
        cover = self.client.patch(
            f"/api/admin/products/{product['id']}/images/{second['id']}",
            {'cover_photo': True},
            format='json',
        )
        self.assertEqual(cover.status_code, 200)
        self.assertTrue(ProductImage.objects.get(id=second['id']).cover_photo)

        with patch.object(UploadService, 'delete_object', return_value=None) as delete:
            response = self.client.delete(f"/api/admin/products/{product['id']}/images/{image['id']}")
        self.assertEqual(response.status_code, 200)
        delete.assert_called_once_with(key)
        self.assertFalse(ProductImage.objects.filter(id=image['id']).exists())
        self.assertEqual(UploadSession.objects.get(object_key=key).status, UploadSession.Status.DELETED)

    def test_deity_rejects_unknown_category_and_names_are_case_insensitive_unique(self):
        self.authenticate()
        invalid = self.client.post(
            '/api/admin/products/deities', {'name': 'Hanuman Ji', 'categories': [999999]}, format='json'
        )
        self.assertEqual(invalid.status_code, 400)
        duplicate = self.client.post(
            '/api/admin/products/categories', {'name': 'deity idol'}, format='json'
        )
        self.assertEqual(duplicate.status_code, 400)

    def test_staff_management_is_admin_only_and_preserves_last_admin(self):
        self.authenticate(self.staff)
        self.assertEqual(self.client.get('/api/admin/staff').status_code, 403)

        self.authenticate(self.admin)
        with override_settings(CLERK_SECRET_KEY='sk_test_value'):
            with patch('app.accounts.services.staff_service.requests.post') as request:
                request.return_value.status_code = 201
                request.return_value.json.return_value = {'id': 'inv_1', 'status': 'pending'}
                invited = self.client.post(
                    '/api/admin/staff', {'email': 'newstaff@example.com', 'role': 'staff'}, format='json'
                )
        self.assertEqual(invited.status_code, 201)
        self.assertEqual(request.call_args.kwargs['json']['public_metadata']['role'], 'staff')

        with override_settings(CLERK_SECRET_KEY='sk_test_value'):
            with patch('app.accounts.services.staff_service.requests.patch') as role_request:
                role_request.return_value.status_code = 200
                promoted = self.client.patch(
                    f'/api/admin/staff/{self.staff.id}', {'role': 'admin'}, format='json'
                )
        self.assertEqual(promoted.status_code, 200)
        self.staff.refresh_from_db()
        self.assertEqual(self.staff.role, Customer.Role.ADMIN)
        self.assertEqual(role_request.call_args.kwargs['json'], {'public_metadata': {'role': 'admin'}})

        response = self.client.patch(
            f'/api/admin/staff/{self.admin.id}', {'is_active': False}, format='json'
        )
        self.assertEqual(response.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_clerk_sync_is_idempotent_and_honors_signed_role_metadata(self):
        payload = {
            'type': 'user.created',
            'data': {
                'id': 'user_webhook',
                'primary_email_address_id': 'email_1',
                'email_addresses': [{'id': 'email_1', 'email_address': 'newstaff@example.com'}],
                'first_name': 'New',
                'last_name': 'Staff',
                'public_metadata': {'role': 'staff'},
            },
        }
        first = AccountWebhookService.process_clerk_webhook(payload, 'evt_1')
        second = AccountWebhookService.process_clerk_webhook(payload, 'evt_1')
        self.assertIsNone(first[0])
        self.assertTrue(second[1]['duplicate'])
        self.assertEqual(Customer.objects.filter(clerk_user_id='user_webhook').count(), 1)
        self.assertEqual(Customer.objects.get(clerk_user_id='user_webhook').role, Customer.Role.STAFF)

    def test_review_moderation_duplicate_protection_and_public_visibility(self):
        product = Product.objects.create(
            category=self.category, material=self.material, diety=self.deity,
            name='Reviewable', status=Product.Status.ACTIVE,
        )
        self.authenticate(self.customer)
        created = self.client.post(
            '/api/v1/reviews', {'product': product.id, 'rating': 5, 'comment': 'Beautiful work'}, format='json'
        )
        self.assertEqual(created.status_code, 201)
        duplicate = self.client.post(
            '/api/v1/reviews', {'product': product.id, 'rating': 4, 'comment': 'Second review'}, format='json'
        )
        self.assertEqual(duplicate.status_code, 400)
        review = Review.objects.get(product=product, user=self.customer)

        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(f'/api/v1/reviews/product/{product.id}').json()['data'], [])
        self.authenticate(self.admin)
        approved = self.client.patch(
            f'/api/admin/reviews/{review.id}', {'status': 'approved'}, format='json'
        )
        self.assertEqual(approved.status_code, 200)
        self.client.force_authenticate(user=None)
        self.assertEqual(len(self.client.get(f'/api/v1/reviews/product/{product.id}').json()['data']), 1)

    def test_contact_duplicate_guard_workflow_and_scoped_rate_limit(self):
        payload = {
            'name': 'Mohit Singh', 'email': 'buyer@example.com',
            'phone': '+919166138566', 'message': 'Please contact me about a custom moorti.',
        }
        first = self.client.post('/api/v1/contact/message', payload, format='json')
        second = self.client.post('/api/v1/contact/message', payload, format='json')
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 400)
        self.assertEqual(ContactMessage.objects.count(), 1)

        custom = CustomizeRequest.objects.create(city='Alwar', email='buyer@example.com', description='Custom Ganesh')
        self.authenticate(self.admin)
        invalid = self.client.patch(
            f'/api/admin/contact/customize/{custom.id}', {'status': 'quoted'}, format='json'
        )
        self.assertEqual(invalid.status_code, 400)

        cache.clear()
        product = Product.objects.create(
            category=self.category, material=self.material, diety=self.deity,
            name='Throttle Product', status=Product.Status.ACTIVE,
        )
        self.authenticate(self.customer)
        responses = [
            self.client.post('/api/v1/reviews', {
                'product': product.id, 'rating': 5, 'comment': f'Attempt number {index}'
            }, format='json')
            for index in range(6)
        ]
        self.assertEqual(responses[-1].status_code, 429)

    def test_audit_and_error_logs_capture_safe_metadata(self):
        self.authenticate(self.admin)
        created = self.client.post(
            '/api/admin/faqs', {'question': 'How is it shipped?', 'answer': 'In secure packaging.'}, format='json'
        )
        self.assertEqual(created.status_code, 201)
        audit = StaffAuditLog.objects.get()
        self.assertEqual(audit.actor, self.admin)
        self.assertEqual(audit.path, '/api/admin/faqs')

        with patch('app.faq.services.customer_service.FAQCustomerService.get_active_faqs', side_effect=RuntimeError('private detail')):
            response = self.client.get('/api/v1/faqs')
        self.assertEqual(response.status_code, 500)
        error = APIErrorLog.objects.get()
        self.assertEqual(error.status_code, 500)
        self.assertNotIn('In secure packaging', error.message)

    def test_health_readiness_schema_and_swagger_are_public(self):
        for path in ('/api/v1/health', '/api/v1/health/ready', '/api/schema', '/api/docs', '/api/v1/application/home', '/api/v1/application/search'):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)

    def test_home_page_and_global_search_workflows(self):
        home_res = self.client.get('/api/v1/application/home')
        self.assertEqual(home_res.status_code, 200)
        self.assertTrue(home_res.json()['success'])
        self.assertIn('blocks', home_res.json()['data'])

        search_res = self.client.get('/api/v1/application/search?q=Ganesh')
        self.assertEqual(search_res.status_code, 200)
        self.assertTrue(search_res.json()['success'])
        self.assertIn('products', search_res.json()['data'])
        self.assertIn('categories', search_res.json()['data'])
        self.assertIn('deities', search_res.json()['data'])

    def test_customer_upsert_handles_email_conflict(self):
        Customer.objects.create(
            clerk_user_id='user_original',
            email='recreated@example.com',
            name='Original Name',
        )
        payload = {
            'type': 'user.created',
            'data': {
                'id': 'user_new_clerk_id',
                'primary_email_address_id': 'email_1',
                'email_addresses': [{'id': 'email_1', 'email_address': 'recreated@example.com'}],
                'first_name': 'Recreated',
                'last_name': 'User',
            },
        }
        error, result = AccountWebhookService.process_clerk_webhook(payload, 'evt_recreated')
        self.assertIsNone(error)
        customer = Customer.objects.get(email='recreated@example.com')
        self.assertEqual(customer.clerk_user_id, 'user_new_clerk_id')


    @override_settings(
        R2_ENDPOINT='https://account.r2.cloudflarestorage.com',
        R2_BUCKET_NAME='bucket',
        R2_ACCESS_KEY_ID='access',
        R2_SECRET_ACCESS_KEY='secret',
        R2_PUBLIC_BASE_URL='https://media.example',
        R2_MIN_IMAGE_WIDTH=400,
        R2_MIN_IMAGE_HEIGHT=400,
        R2_MAX_IMAGE_WIDTH=8000,
        R2_MAX_IMAGE_HEIGHT=8000,
        R2_MAX_IMAGE_BYTES=1024 * 1024,
        R2_ALLOWED_IMAGE_TYPES={'image/jpeg', 'image/png', 'image/webp'},
    )
    def test_actual_image_content_size_type_dimensions_and_cleanup(self):
        raw = io.BytesIO()
        Image.new('RGB', (500, 600), 'white').save(raw, format='JPEG')
        content = raw.getvalue()
        client = Mock()
        client.head_object.return_value = {'ContentLength': len(content), 'ContentType': 'image/jpeg'}
        client.get_object.return_value = {'Body': io.BytesIO(content)}
        session = {'expected_size': len(content), 'expected_content_type': 'image/jpeg'}
        with patch.object(UploadService, 'get_s3_client', return_value=client):
            error, metadata = UploadService.inspect_image('product-images/a.jpg', session)
        self.assertIsNone(error)
        self.assertEqual((metadata['width'], metadata['height']), (500, 600))

        expired = UploadSession.objects.create(
            object_key='product-images/expired.jpg',
            purpose=UploadSession.Purpose.PRODUCT_IMAGE,
            expected_content_type='image/jpeg', expected_size=100,
            expires_at=timezone.now() - timedelta(minutes=1), created_by=self.admin,
        )
        with patch.object(UploadService, 'delete_object', return_value=None):
            self.assertEqual(UploadService.cleanup_expired(), 1)
        expired.refresh_from_db()
        self.assertEqual(expired.status, UploadSession.Status.DELETED)

    def test_sqlite_backup_is_gzipped_and_production_checks_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.sqlite3'
            source.write_bytes(b'sqlite-backup-data')
            original = connection.settings_dict.copy()
            connection.settings_dict.update({'ENGINE': 'django.db.backends.sqlite3', 'NAME': str(source)})
            try:
                backup = BackupCommand()._create_backup(Path(directory), '20260818T000000Z')
            finally:
                connection.settings_dict.clear()
                connection.settings_dict.update(original)
            with gzip.open(backup, 'rb') as handle:
                self.assertEqual(handle.read(), b'sqlite-backup-data')

        with override_settings(
            DEBUG=False,
            IS_TESTING=False,
            SECRET_KEY='short',
            CLERK_JWT_ISSUER='',
            CLERK_SECRET_KEY='',
            CLERK_WEBHOOK_SECRET='',
            R2_ENDPOINT='', R2_BUCKET_NAME='', R2_ACCESS_KEY_ID='',
            R2_SECRET_ACCESS_KEY='', R2_PUBLIC_BASE_URL='',
            SECURE_SSL_REDIRECT=False,
        ):
            identifiers = {error.id for error in production_configuration_check(None)}
        self.assertTrue({'divine.E001', 'divine.E002', 'divine.E003', 'divine.E004', 'divine.E005', 'divine.E007'} <= identifiers)
