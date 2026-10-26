from django.conf import settings

from app.accounts.models import Employee, User
from app.accounts.repositories.customer_repository import CustomerRepository
from app.common.repositories import WebhookRepository
from app.leads.services.provisioning import ensure_default_sales_membership


class AccountWebhookService:
    @staticmethod
    def process_clerk_webhook(payload, event_id):
        event_type = payload.get('type')
        data = payload.get('data') or {}
        if not event_id or not event_type:
            return 'Missing webhook event identity.', None

        prepared = _prepare(event_type, data)
        if isinstance(prepared, str):
            return prepared, None

        if not WebhookRepository.claim('clerk', event_id, event_type):
            return None, {'status': 'Duplicate event ignored', 'duplicate': True}

        try:
            if event_type in {'user.created', 'user.updated'}:
                if settings.DEPLOYMENT_MODE == 'admin':
                    result = _sync_admin_identity(prepared)
                else:
                    result = CustomerRepository.sync_customer(
                        clerk_id=prepared['clerk_id'],
                        email=prepared['email'],
                        name=prepared['name'],
                    )
                    result = {
                        'customer_id': result['customer']['id'],
                        'created': result['created'],
                        'duplicate': False,
                    }
                return None, result
            if event_type == 'user.deleted':
                updated = CustomerRepository.deactivate_customer(prepared['clerk_id'])
                updated = CustomerRepository.deactivate_employee(prepared['clerk_id']) or updated
                return None, {'status': 'User deactivated', 'updated': bool(updated), 'duplicate': False}
            return None, {'status': 'Event ignored', 'duplicate': False}
        except Exception:
            WebhookRepository.release('clerk', event_id)
            return 'Webhook processing failed.', None


def _prepare(event_type, data):
    if event_type in {'user.created', 'user.updated'}:
        clerk_id = data.get('id')
        email_addresses = data.get('email_addresses') or []
        email = next(
            (
                item.get('email_address')
                for item in email_addresses
                if item.get('id') == data.get('primary_email_address_id')
            ),
            None,
        )
        if not email and email_addresses:
            email = email_addresses[0].get('email_address')
        if not clerk_id or not email:
            return 'Missing required Clerk user fields.'
        return {
            'clerk_id': clerk_id,
            'email': email.strip().lower(),
            'name': f"{data.get('first_name') or ''} {data.get('last_name') or ''}".strip(),
            'requested_role': (data.get('public_metadata') or {}).get('role'),
        }
    if event_type == 'user.deleted':
        if not data.get('id'):
            return 'Missing required Clerk user ID.'
        return {'clerk_id': data['id']}
    return None


def _sync_admin_identity(prepared):
    """Link an admin Clerk subject to an employee an administrator already created.

    The admin subject is never written onto User.clerk_user_id. Clerk role
    metadata does not create an employee, change a role, or turn access back
    on. A deactivated employee stays deactivated.
    """
    user = User.objects.filter(email__iexact=prepared['email']).first()
    if user is None:
        user = User.objects.create(
            email=prepared['email'],
            name=prepared['name'] or None,
            clerk_user_id=None,
        )
        created_user = True
    else:
        created_user = False
        if prepared['name'] and user.name != prepared['name']:
            user.name = prepared['name']
            user.save(update_fields=['name', 'updated_at'])

    employee = Employee.objects.filter(clerk_user_id=prepared['clerk_id']).first()
    if employee is not None and employee.user_id != user.id:
        return {
            'customer_id': user.id,
            'created': created_user,
            'duplicate': False,
            'employee_id': None,
        }
    if employee is None:
        employee = Employee.objects.filter(user=user).first()
    if employee is None:
        return {
            'customer_id': user.id,
            'created': created_user,
            'duplicate': False,
            'employee_id': None,
        }
    if not employee.clerk_user_id:
        employee.clerk_user_id = prepared['clerk_id']
        employee.save(update_fields=['clerk_user_id', 'updated_at'])
    if employee.is_active and employee.role == Employee.Role.STAFF:
        ensure_default_sales_membership(employee.id)
    return {
        'customer_id': user.id,
        'employee_id': employee.id,
        'created': created_user,
        'duplicate': False,
    }
