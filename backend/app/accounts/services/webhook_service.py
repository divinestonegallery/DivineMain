from app.accounts.repositories.customer_repository import CustomerRepository
from app.common.repositories import WebhookRepository


class AccountWebhookService:
    @staticmethod
    def process_clerk_webhook(payload, event_id):
        event_type = payload.get('type')
        data = payload.get('data') or {}
        if not event_id or not event_type:
            return 'Missing webhook event identity.', None

        prepared = None
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
                return 'Missing required Clerk user fields.', None
            prepared = {
                'clerk_id': clerk_id,
                'email': email,
                'name': f"{data.get('first_name') or ''} {data.get('last_name') or ''}".strip(),
                'requested_role': (data.get('public_metadata') or {}).get('role'),
            }
        elif event_type == 'user.deleted':
            if not data.get('id'):
                return 'Missing required Clerk user ID.', None
            prepared = {'clerk_id': data['id']}

        if not WebhookRepository.claim('clerk', event_id, event_type):
            return None, {'status': 'Duplicate event ignored', 'duplicate': True}

        try:
            if event_type in {'user.created', 'user.updated'}:
                result = CustomerRepository.sync_customer(**prepared)
                return None, {
                    'customer_id': result['customer']['id'],
                    'created': result['created'],
                    'duplicate': False,
                }
            if event_type == 'user.deleted':
                updated = CustomerRepository.deactivate_customer(prepared['clerk_id'])
                return None, {'status': 'User deactivated', 'updated': bool(updated), 'duplicate': False}
            return None, {'status': 'Event ignored', 'duplicate': False}
        except Exception:
            WebhookRepository.release('clerk', event_id)
            return 'Webhook processing failed.', None
