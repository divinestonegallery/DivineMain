import requests
from django.conf import settings

from app.accounts.repositories.customer_repository import CustomerRepository


class StaffService:
    @staticmethod
    def list_staff(params):
        return None, CustomerRepository.list_staff(
            params['page'], params['page_size'], params.get('search', '')
        )

    @staticmethod
    def invite_staff(data):
        if not settings.CLERK_SECRET_KEY:
            return 'Clerk secret key is not configured.', None
        if CustomerRepository.email_exists(data['email']):
            return 'This email already has an account.', None
        try:
            response = requests.post(
                'https://api.clerk.com/v1/invitations',
                headers={
                    'Authorization': f'Bearer {settings.CLERK_SECRET_KEY}',
                    'Content-Type': 'application/json',
                },
                json={
                    'email_address': data['email'],
                    'redirect_url': settings.CLERK_INVITATION_REDIRECT_URL,
                    'public_metadata': {'role': data['role']},
                    'notify': True,
                },
                timeout=10,
            )
        except requests.RequestException:
            return 'Unable to contact Clerk. Please try again.', None

        if response.status_code not in (200, 201):
            if response.status_code == 429:
                return 'Clerk invitation limit reached. Please retry later.', None
            if response.status_code in (400, 409, 422):
                return 'This email is already registered or invited.', None
            return 'Clerk could not create the invitation.', None
        payload = response.json()
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
            if not settings.CLERK_SECRET_KEY:
                return 'Clerk secret key is not configured.', None
            try:
                response = requests.patch(
                    f"https://api.clerk.com/v1/users/{current['clerk_user_id']}/metadata",
                    headers={
                        'Authorization': f'Bearer {settings.CLERK_SECRET_KEY}',
                        'Content-Type': 'application/json',
                    },
                    json={'public_metadata': {'role': data['role']}},
                    timeout=10,
                )
            except requests.RequestException:
                return 'Unable to synchronize the role with Clerk. No local change was made.', None
            if response.status_code not in (200, 201):
                return 'Clerk rejected the role update. No local change was made.', None
        updated = CustomerRepository.update_staff(customer_id, data)
        return None, updated
