from django.conf import settings

from app.accounts.repositories.customer_repository import CustomerRepository
from app.accounts.services.clerk_client import ClerkClient


class StaffService:
    @staticmethod
    def list_staff(params):
        return None, CustomerRepository.list_staff(
            params['page'], params['page_size'], params.get('search', '')
        )

    @staticmethod
    def invite_staff(data):
        if not ClerkClient.is_configured():
            return 'Clerk secret key is not configured.', None
        if CustomerRepository.email_exists(data['email']):
            return 'This email already has an account.', None
        error, payload = ClerkClient.create_invitation(
            email=data['email'],
            role=data['role'],
            redirect_url=settings.CLERK_INVITATION_REDIRECT_URL,
        )
        if error:
            return error, None
        return None, {
            'id': payload.get('id'),
            'email': data['email'],
            'role': data['role'],
            'status': payload.get('status', 'pending'),
        }

    @staticmethod
    def update_staff(customer_id, data, actor_id):
        current = CustomerRepository.get_staff(customer_id)
        if not current:
            return 'Staff member not found.', None
        if current['id'] == actor_id and data.get('is_active') is False:
            return 'You cannot deactivate your own account.', None
        removing_last_admin = (
            current['role'] == 'admin'
            and current['is_active']
            and (data.get('role') == 'staff' or data.get('is_active') is False)
            and CustomerRepository.count_active_admins() <= 1
        )
        if removing_last_admin:
            return 'At least one active administrator is required.', None

        if 'role' in data and data['role'] != current['role']:
            if not ClerkClient.is_configured():
                return 'Clerk secret key is not configured.', None
            error, _ = ClerkClient.update_user_public_metadata(
                current['clerk_user_id'],
                {'role': data['role']},
            )
            if error:
                return error, None
        updated = CustomerRepository.update_staff(customer_id, data)
        return None, updated
