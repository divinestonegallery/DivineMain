import importlib
import uuid
from datetime import timedelta

from django.apps import apps
from django.test import TestCase
from django.utils import timezone

from app.accounts.models import Employee, User
from app.common.models import StaffAuditLog, UploadSession
from app.contactus.models import ContactMessage, CustomizeRequest
from app.faq.models import FAQ
from app.integrations.google_ads.models import GoogleAdsLeadForm
from app.leads.models import (
    Lead,
    LeadActivity,
    LeadNote,
    LeadNotification,
    StaffGroupMembership,
    StaffSecurityGroup,
)
from app.orders.models import Order
from app.products.models import Category, Material, Product
from app.reviews.models import Review


class LegacyAccountMigrationTests(TestCase):
    def test_account_data_steps_drop_identities_and_keep_business_records(self):
        buyer = User.objects.create(
            clerk_user_id='legacy-consumer-subject',
            email='legacy-buyer@example.com',
            name='Legacy Buyer',
        )
        admin_user = User.objects.create(
            clerk_user_id='legacy-admin-subject',
            email='legacy-admin@example.com',
            name='Legacy Admin',
        )
        admin = Employee.objects.create(
            user=admin_user,
            clerk_user_id='legacy-admin-subject-copy',
            role='admin',
        )
        category = Category.objects.create(name='Migration Stone', slug='migration-stone')
        material = Material.objects.create(name='Migration Marble', slug='migration-marble')
        product = Product.objects.create(
            category=category,
            material=material,
            name='Migration Hanuman',
            slug='migration-hanuman',
            uid='MIGRATE1',
            keywords=[],
        )
        FAQ.objects.create(question='Will this carving last?', answer='Yes.')
        owned = Lead.objects.create(
            name='Legacy Buyer',
            email='legacy-buyer@example.com',
            summary='A preserved website enquiry',
            source='website',
            touchpoint='contact_us',
            user=buyer,
            created_by=buyer,
            assigned_to=admin,
        )
        attributed = Lead.objects.create(
            name='Ads Buyer',
            email='ads-buyer@example.com',
            summary='A preserved Google Ads lead',
            source='google_ads',
            touchpoint='lead_form',
            external_id='gads-event-a',
        )
        GoogleAdsLeadForm.objects.create(lead=attributed, external_id='gads-event-a', form_id='form-a')
        GoogleAdsLeadForm.objects.create(lead=attributed, external_id='gads-event-b', form_id='form-b')
        LeadNote.objects.create(lead=owned, author=admin, body='Staff note that stays')
        LeadActivity.objects.create(lead=owned, actor=admin, action='status_changed', new_value='contacted')
        LeadNotification.objects.create(
            lead=owned,
            recipient=admin,
            kind='assigned',
            title='Assigned',
            message='This delivery row is account data.',
        )
        group = StaffSecurityGroup.objects.create(code='migration-sales', name='Migration Sales')
        StaffGroupMembership.objects.create(employee=admin, group=group)
        Order.objects.create(
            uid='DSG-ORD-KEEP01',
            product=product,
            customer=buyer,
            quantity=1,
            sales_mode='quote_only',
            unit_price='100.00',
            gst_rate='0.00',
            total_amount='100.00',
            shipping_name='Legacy Buyer',
            shipping_phone='9845000000',
            shipping_address_line1='Gallery Road',
            shipping_city='Jaipur',
            shipping_state='Rajasthan',
            shipping_pincode='302001',
        )
        Review.objects.create(product=product, user=buyer, rating=5, comment='Kept review', status='approved')
        ContactMessage.objects.create(
            name='Legacy Buyer',
            email='legacy-buyer@example.com',
            message='Kept contact message',
            status='new',
            lead=owned,
        )
        CustomizeRequest.objects.create(
            user=buyer,
            city='Jaipur',
            description='Kept customization',
            status='new',
            lead=owned,
        )
        UploadSession.objects.create(
            object_key='migration/reference.jpg',
            purpose='customization_reference',
            expected_content_type='image/jpeg',
            expected_size=1024,
            expires_at=timezone.now() + timedelta(hours=1),
            created_by=buyer,
        )
        StaffAuditLog.objects.create(
            actor=admin,
            request_id=uuid.uuid4(),
            method='POST',
            path='/api/admin/leads',
            status_code=201,
        )

        clear_links = importlib.import_module('app.leads.migrations.0006_user_employee_links')
        discard_accounts = importlib.import_module('app.accounts.migrations.0004_discard_legacy_accounts')
        clear_links.clear_legacy_staff_links(apps, None)
        discard_accounts.discard_legacy_accounts(apps, None)

        self.assertFalse(User.objects.exists())
        self.assertFalse(Employee.objects.exists())
        self.assertNotIn('role', {field.name for field in User._meta.fields})

        product = Product.objects.get(slug='migration-hanuman')
        self.assertEqual(product.name, 'Migration Hanuman')
        self.assertEqual(Category.objects.filter(slug='migration-stone').count(), 1)
        self.assertEqual(Material.objects.filter(slug='migration-marble').count(), 1)
        self.assertEqual(FAQ.objects.filter(question='Will this carving last?').count(), 1)

        owned = Lead.objects.get(email='legacy-buyer@example.com')
        self.assertEqual(owned.summary, 'A preserved website enquiry')
        self.assertIsNone(owned.user_id)
        self.assertIsNone(owned.created_by_id)
        self.assertIsNone(owned.assigned_to_id)
        self.assertIsNone(owned.created_by_employee_id)
        note = LeadNote.objects.get(lead=owned)
        self.assertEqual(note.body, 'Staff note that stays')
        self.assertIsNone(note.author_id)
        activity = LeadActivity.objects.get(lead=owned)
        self.assertEqual(activity.new_value, 'contacted')
        self.assertIsNone(activity.actor_id)
        self.assertFalse(LeadNotification.objects.exists())

        attributed = Lead.objects.get(external_id='gads-event-a')
        forms = set(GoogleAdsLeadForm.objects.filter(lead=attributed).values_list('external_id', flat=True))
        self.assertEqual(forms, {'gads-event-a', 'gads-event-b'})

        order = Order.objects.get(uid='DSG-ORD-KEEP01')
        self.assertIsNone(order.customer_id)
        self.assertEqual(order.product_id, product.id)
        self.assertEqual(str(order.total_amount), '100.00')
        review = Review.objects.get(comment='Kept review')
        self.assertIsNone(review.user_id)
        self.assertEqual(review.product_id, product.id)
        self.assertEqual(ContactMessage.objects.get().message, 'Kept contact message')
        customize = CustomizeRequest.objects.get()
        self.assertEqual(customize.city, 'Jaipur')
        self.assertIsNone(customize.user_id)
        upload = UploadSession.objects.get(object_key='migration/reference.jpg')
        self.assertIsNone(upload.created_by_id)
        audit = StaffAuditLog.objects.get(path='/api/admin/leads')
        self.assertIsNone(audit.actor_id)
        self.assertTrue(StaffSecurityGroup.objects.filter(code='migration-sales').exists())
        self.assertFalse(StaffGroupMembership.objects.exists())
