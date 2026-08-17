from app.accounts.models import Customer

class CustomerRepository:
    @staticmethod
    def get_customer_by_clerk_id(clerk_id):
        return Customer.objects.filter(clerk_user_id=clerk_id).first()

    @staticmethod
    def create_or_update_customer(clerk_id, email, name=None, phone=None):
        customer, created = Customer.objects.update_or_create(
            clerk_user_id=clerk_id,
            defaults={
                'email': email,
                'name': name,
                'phone': phone
            }
        )
        return customer, created
