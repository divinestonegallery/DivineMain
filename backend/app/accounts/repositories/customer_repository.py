from app.accounts.models import Customer
from app.accounts.serializers import CustomerSerializer, StaffSerializer
from django.conf import settings
from django.db.models import Q

class CustomerRepository:
    @staticmethod
    def email_exists(email):
        return Customer.objects.filter(email__iexact=email).exists()

    @staticmethod
    def get_customer_by_clerk_id(clerk_id):
        return Customer.objects.filter(clerk_user_id=clerk_id).first()

    @staticmethod
    def get_customer_by_id(customer_id):
        return Customer.objects.filter(id=customer_id).first()

    @staticmethod
    def get_customer_dict_by_id(customer_id):
        customer = Customer.objects.filter(id=customer_id).first()
        return CustomerSerializer(customer).data if customer else None

    @staticmethod
    def get_customer_dict_by_email(email):
        customer = Customer.objects.filter(email__iexact=email.strip().lower()).first()
        return CustomerSerializer(customer).data if customer else None

    @staticmethod
    def get_customer_dict_by_clerk_id(clerk_id):
        customer = Customer.objects.filter(clerk_user_id=clerk_id).first()
        return CustomerSerializer(customer).data if customer else None

    @staticmethod
    def create_or_update_customer(clerk_id, email, name=None, phone=None, requested_role=None):
        normalized_email = email.strip().lower()
        customer = Customer.objects.filter(clerk_user_id=clerk_id).first()
        created = customer is None

        if created:
            existing_by_email = Customer.objects.filter(email=normalized_email).first()
            if existing_by_email:
                customer = existing_by_email
                customer.clerk_user_id = clerk_id
                customer.name = name or customer.name
                customer.phone = phone or customer.phone
                if normalized_email in settings.ADMIN_EMAILS:
                    customer.role = Customer.Role.ADMIN
                elif requested_role in {Customer.Role.STAFF, Customer.Role.ADMIN}:
                    customer.role = requested_role
                created = False
            else:
                customer = Customer(
                    clerk_user_id=clerk_id,
                    email=normalized_email,
                    name=name,
                    phone=phone,
                    role=(
                        Customer.Role.ADMIN
                        if normalized_email in settings.ADMIN_EMAILS
                        else requested_role
                        if requested_role in {Customer.Role.STAFF, Customer.Role.ADMIN}
                        else Customer.Role.CUSTOMER
                    ),
                )
        else:
            customer.email = normalized_email
            customer.name = name
            customer.phone = phone
            # Verified Clerk data may bootstrap an explicitly allowlisted owner,
            # but must never downgrade an existing staff or admin role.
            if normalized_email in settings.ADMIN_EMAILS:
                customer.role = Customer.Role.ADMIN
            elif requested_role in {Customer.Role.STAFF, Customer.Role.ADMIN}:
                customer.role = requested_role

        customer.save()
        return customer, created

    @staticmethod
    def sync_customer(clerk_id, email, name=None, phone=None, requested_role=None):
        customer, created = CustomerRepository.create_or_update_customer(
            clerk_id=clerk_id,
            email=email,
            name=name,
            phone=phone,
            requested_role=requested_role,
        )
        return {'customer': CustomerSerializer(customer).data, 'created': created}

    @staticmethod
    def get_or_create_authenticated_customer(clerk_id, email=None, name=None):
        customer = Customer.objects.filter(clerk_user_id=clerk_id).first()
        if customer and not email:
            return customer

        # Clerk session templates can include verified profile claims. When an
        # email is present, run the same upsert used by the signed webhook so
        # an allowlisted owner is promoted even if their first token did not
        # contain an email address.
        safe_email = email or f"{clerk_id}@users.invalid"
        customer, _ = CustomerRepository.create_or_update_customer(
            clerk_id=clerk_id,
            email=safe_email,
            name=name,
        )
        return customer

    @staticmethod
    def deactivate_customer(clerk_id):
        return Customer.objects.filter(clerk_user_id=clerk_id).update(is_active=False)

    @staticmethod
    def list_staff(page, page_size, search=''):
        queryset = Customer.objects.filter(role__in=(Customer.Role.STAFF, Customer.Role.ADMIN))
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(name__icontains=search))
        queryset = queryset.order_by('email')
        total = queryset.count()
        start = (page - 1) * page_size
        return {
            'items': StaffSerializer(queryset[start:start + page_size], many=True).data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_items': total,
                'total_pages': (total + page_size - 1) // page_size,
            },
        }

    @staticmethod
    def get_staff(customer_id):
        customer = Customer.objects.filter(id=customer_id).first()
        return StaffSerializer(customer).data if customer else None

    @staticmethod
    def count_active_admins():
        return Customer.objects.filter(role=Customer.Role.ADMIN, is_active=True).count()

    @staticmethod
    def update_staff(customer_id, data):
        customer = Customer.objects.filter(id=customer_id).first()
        if not customer:
            return None
        for key, value in data.items():
            setattr(customer, key, value)
        customer.save(update_fields=[*data.keys(), 'updated_at'])
        return StaffSerializer(customer).data

    @staticmethod
    def update_profile(customer_id, data):
        customer = Customer.objects.filter(id=customer_id).first()
        if not customer:
            return None
        allowed = ('name', 'phone')
        for key in allowed:
            if key in data:
                setattr(customer, key, data[key])
        update_fields = [k for k in allowed if k in data] + ['updated_at']
        customer.save(update_fields=update_fields)
        return CustomerSerializer(customer).data
