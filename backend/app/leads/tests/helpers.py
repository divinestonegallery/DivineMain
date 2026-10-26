from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from app.accounts.models import Employee, User
from app.leads.models import Lead
from app.leads.services.provisioning import ensure_default_sales_membership


ADMIN_URLCONF = 'app.leads.tests.urls'


def seed_lead(email='', phone='', status='new', days_old=0, **overrides):
    """Create a lead directly and backdate created_at, without sleeping.

    created_at is auto_now_add, so an aged lead has to be rewritten after the
    insert. Tests that need a specific age stay deterministic this way.
    """
    fields = {
        'name': 'Seeded Person',
        'email': email,
        'phone': phone,
        'summary': 'Seeded enquiry',
        'source': 'website',
        'touchpoint': 'contact_us',
        'status': status,
    }
    fields.update(overrides)
    lead = Lead.objects.create(**fields)
    if days_old:
        Lead.objects.filter(id=lead.id).update(created_at=timezone.now() - timedelta(days=days_old))
        lead.refresh_from_db()
    return lead


def create_account(email, role='staff', active=True, sales=None, name='', clerk_user_id=None):
    """Return an Employee for staff and admin, and a User for a customer."""
    display_name = name or email.split('@')[0]
    if role in ('staff', 'admin'):
        user = User.objects.create(
            email=email,
            name=display_name,
            is_active=True,
        )
        employee = Employee.objects.create(
            user=user,
            clerk_user_id=clerk_user_id or f'clerk-{email}',
            role=role,
            is_active=active,
        )
        if sales is None:
            sales = role == 'staff' and active
        if sales:
            ensure_default_sales_membership(employee.id)
        return employee
    return User.objects.create(
        clerk_user_id=clerk_user_id or f'clerk-{email}',
        email=email,
        name=display_name,
        is_active=active,
    )


class LeadApiTestCase(TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.settings_override = override_settings(ROOT_URLCONF=ADMIN_URLCONF)
        self.settings_override.enable()

    def tearDown(self):
        self.settings_override.disable()
        super().tearDown()

    def as_user(self, account):
        self.client.force_authenticate(user=account)

    def create_lead(self, account, **overrides):
        self.as_user(account)
        payload = {
            'name': 'Meera Iyer',
            'email': 'meera@example.com',
            'phone': '+91 98450 11111',
            'city': 'Chennai',
            'summary': 'Custom granite murti for a home shrine',
        }
        payload.update(overrides)
        return self.client.post('/api/admin/leads', payload, format='json')
