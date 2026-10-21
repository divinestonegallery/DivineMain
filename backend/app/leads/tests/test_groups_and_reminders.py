import importlib
from datetime import timedelta

from django.apps import apps
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.utils import timezone
from unittest.mock import patch

from app.accounts.models import Customer
from app.accounts.services.staff_service import StaffService
from app.accounts.services.webhook_service import AccountWebhookService
from app.common.models import StaffAuditLog
provision_sales_group = importlib.import_module(
    'app.leads.migrations.0002_provision_sales_group'
).provision_sales_group
from app.leads.models import Lead, LeadNotification, StaffGroupMembership, StaffGroupPermission, StaffSecurityGroup
from app.leads.services.follow_up_service import FollowUpService
from app.leads.tests.helpers import LeadApiTestCase, create_account


class SecurityGroupTests(LeadApiTestCase):
    def test_admin_can_manage_groups_and_staff_cannot(self):
        admin = create_account('group-admin@example.com', role=Customer.Role.ADMIN, sales=False, name='Group Admin')
        staff = create_account('group-staff@example.com', name='Group Staff')
        self.as_user(staff)
        denied = self.client.get('/api/admin/staff/groups')
        self.assertEqual(denied.status_code, 403)

        self.as_user(admin)
        created = self.client.post('/api/admin/staff/groups', {
            'name': 'Floor Leads',
            'description': 'Showroom team',
            'permissions': ['leads.access', 'leads.view_own', 'leads.create'],
        }, format='json')
        self.assertEqual(created.status_code, 201, created.content)
        group_id = created.json()['data']['id']
        self.assertTrue(StaffAuditLog.objects.filter(path='/api/admin/staff/groups', method='POST').exists())

        membership = self.client.post('/api/admin/staff/memberships', {
            'customer_id': staff.id,
            'group_id': group_id,
        }, format='json')
        self.assertEqual(membership.status_code, 201, membership.content)
        listed = self.client.get(f'/api/admin/staff/memberships?group_id={group_id}')
        self.assertEqual(listed.json()['data']['items'][0]['customer']['id'], staff.id)

        buyer = create_account('group-buyer@example.com', role=Customer.Role.CUSTOMER, sales=False)
        rejected = self.client.post('/api/admin/staff/memberships', {
            'customer_id': buyer.id,
            'group_id': group_id,
        }, format='json')
        self.assertEqual(rejected.status_code, 400)

        removed = self.client.delete(f"/api/admin/staff/memberships/{membership.json()['data']['id']}")
        self.assertEqual(removed.status_code, 200, removed.content)
        self.assertFalse(StaffGroupMembership.objects.filter(customer=staff, group_id=group_id).exists())

    def test_new_and_existing_staff_receive_the_sales_group(self):
        existing = create_account('existing@example.com', sales=False)
        inactive = create_account('sleeping@example.com', active=False, sales=False)
        buyer = create_account('shopper@example.com', role=Customer.Role.CUSTOMER, sales=False)
        provision_sales_group(apps, None)
        provision_sales_group(apps, None)
        sales = StaffSecurityGroup.objects.get(code='sales')
        self.assertEqual(StaffGroupMembership.objects.filter(customer=existing, group=sales).count(), 1)
        self.assertFalse(StaffGroupMembership.objects.filter(customer=inactive, group=sales).exists())
        self.assertFalse(StaffGroupMembership.objects.filter(customer=buyer, group=sales).exists())
        self.assertEqual(sales.permissions.count(), 7)

        error, result = AccountWebhookService.process_clerk_webhook({
            'type': 'user.created',
            'data': {
                'id': 'user_invited_staff',
                'first_name': 'Invited',
                'last_name': 'Staff',
                'primary_email_address_id': 'email_invited',
                'email_addresses': [{'id': 'email_invited', 'email_address': 'invited@example.com'}],
                'public_metadata': {'role': 'staff'},
            },
        }, 'evt_invited_staff')
        self.assertIsNone(error)
        invited = Customer.objects.get(email='invited@example.com')
        self.assertEqual(invited.role, Customer.Role.STAFF)
        self.assertTrue(StaffGroupMembership.objects.filter(customer=invited, group=sales).exists())

        error, _result = AccountWebhookService.process_clerk_webhook({
            'type': 'user.created',
            'data': {
                'id': 'user_invited_customer',
                'first_name': 'Invited',
                'last_name': 'Buyer',
                'primary_email_address_id': 'email_buyer',
                'email_addresses': [{'id': 'email_buyer', 'email_address': 'invited-buyer@example.com'}],
                'public_metadata': {'role': 'customer'},
            },
        }, 'evt_invited_customer')
        self.assertIsNone(error)
        self.assertFalse(
            StaffGroupMembership.objects.filter(customer__email='invited-buyer@example.com').exists()
        )

    @patch('app.accounts.services.staff_service.ClerkClient.update_user_public_metadata', return_value=(None, {}))
    @patch('app.accounts.services.staff_service.ClerkClient.is_configured', return_value=True)
    def test_promoting_an_account_to_staff_adds_the_sales_group(self, _configured, _metadata):
        admin = create_account('promoter@example.com', role=Customer.Role.ADMIN, sales=False)
        account = create_account('promoted@example.com', role=Customer.Role.CUSTOMER, sales=False)
        error, _data = StaffService.update_staff(account.id, {'role': 'staff'}, admin.id)
        self.assertIsNone(error)
        account.refresh_from_db()
        self.assertEqual(account.role, Customer.Role.STAFF)
        self.assertTrue(StaffGroupMembership.objects.filter(customer=account, group__code='sales').exists())


class FollowUpReminderTests(LeadApiTestCase):
    def test_reminder_command_is_idempotent_and_keeps_the_follow_up_time(self):
        staff = create_account('reminder@example.com', name='Reminder Staff')
        due = timezone.now() - timedelta(minutes=5)
        lead = Lead.objects.create(
            name='Due Buyer',
            email='due@example.com',
            phone='9845000099',
            summary='Follow up on the sandstone order',
            assigned_to=staff,
            created_by=staff,
            follow_up_at=due,
        )
        unassigned = Lead.objects.create(
            name='Unassigned Buyer',
            email='open@example.com',
            phone='9845000098',
            summary='No owner yet',
            follow_up_at=due,
        )
        closed = Lead.objects.create(
            name='Closed Buyer',
            email='closed@example.com',
            phone='9845000097',
            summary='Already won',
            status='won',
            assigned_to=staff,
            created_by=staff,
            follow_up_at=due,
        )

        self.assertEqual(FollowUpService.notify_due(), 1)
        lead.refresh_from_db()
        self.assertEqual(lead.follow_up_at, due)
        self.assertEqual(lead.follow_up_notified_at, due)
        self.assertEqual(LeadNotification.objects.filter(kind='follow_up_due').count(), 1)
        self.assertFalse(LeadNotification.objects.filter(lead=unassigned).exists())
        self.assertFalse(LeadNotification.objects.filter(lead=closed).exists())

        call_command('notify_due_lead_follow_ups')
        self.assertEqual(LeadNotification.objects.filter(kind='follow_up_due').count(), 1)

        self.as_user(staff)
        later = timezone.now() - timedelta(minutes=1)
        moved = self.client.patch(
            f'/api/admin/leads/{lead.uid}',
            {'follow_up_at': later.isoformat()},
            format='json',
        )
        self.assertEqual(moved.status_code, 200, moved.content)
        lead.refresh_from_db()
        self.assertIsNone(lead.follow_up_notified_at)
        self.assertEqual(FollowUpService.notify_due(), 1)
        lead.refresh_from_db()
        self.assertEqual(lead.follow_up_at, later)
        self.assertEqual(lead.follow_up_notified_at, later)
        self.assertEqual(LeadNotification.objects.filter(lead=lead, kind='follow_up_due').count(), 2)


class LeadConstraintTests(LeadApiTestCase):
    def test_source_and_external_id_are_unique_when_present(self):
        shared = {
            'name': 'External Buyer',
            'summary': 'Imported later',
            'source': 'manual',
            'external_id': 'provider-1',
        }
        Lead.objects.create(**shared)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Lead.objects.create(**shared)
        Lead.objects.create(name='Blank One', summary='No external id', external_id=None)
        Lead.objects.create(name='Blank Two', summary='No external id', external_id=None)
        self.assertEqual(Lead.objects.filter(external_id__isnull=True).count(), 2)
        self.assertFalse(StaffGroupPermission.objects.filter(code='leads.view_all', group__code='sales').exists())
