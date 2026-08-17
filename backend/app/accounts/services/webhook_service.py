from app.accounts.repositories.customer_repository import CustomerRepository

class AccountWebhookService:
    @staticmethod
    def process_clerk_webhook(payload):
        try:
            event_type = payload.get('type')
            data = payload.get('data', {})

            if event_type in ['user.created', 'user.updated']:
                clerk_id = data.get('id')
                
                # Extract email (primary email address)
                email_addresses = data.get('email_addresses', [])
                email = None
                for em in email_addresses:
                    if em.get('id') == data.get('primary_email_address_id'):
                        email = em.get('email_address')
                if not email and email_addresses:
                    email = email_addresses[0].get('email_address')
                
                # Extract name
                first_name = data.get('first_name', '') or ''
                last_name = data.get('last_name', '') or ''
                name = f"{first_name} {last_name}".strip()

                if not clerk_id or not email:
                    return "Missing required Clerk fields", None

                customer, created = CustomerRepository.create_or_update_customer(
                    clerk_id=clerk_id,
                    email=email,
                    name=name
                )
                return None, {"customer_id": customer.id, "created": created}
            elif event_type == 'user.deleted':
                # Handle soft delete or hard delete if necessary
                return None, {"status": "User deletion ignored for now"}
            else:
                return None, {"status": "Event ignored"}
        except Exception as e:
            return str(e), None
