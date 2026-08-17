from app.contactus.serializers.customer import ContactMessageCustomerSerializer, CustomizeRequestCustomerSerializer
from app.accounts.repositories.customer_repository import CustomerRepository

class ContactUsCustomerService:
    @staticmethod
    def create_contact_message(data):
        try:
            serializer = ContactMessageCustomerSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return None, serializer.data
            return serializer.errors, None
        except Exception as e:
            return str(e), None

    @staticmethod
    def create_customize_request(data, clerk_id=None):
        try:
            serializer = CustomizeRequestCustomerSerializer(data=data)
            if serializer.is_valid():
                user = None
                if clerk_id:
                    user = CustomerRepository.get_customer_by_clerk_id(clerk_id)
                serializer.save(user=user)
                return None, serializer.data
            return serializer.errors, None
        except Exception as e:
            return str(e), None
