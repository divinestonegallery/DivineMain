from django.db.models import Q

from app.accounts.models import Employee, User
from app.accounts.serializers import StaffSerializer, UserSerializer


class CustomerRepository:
    """User and employee lookups. The name stays so existing callers keep working."""

    @staticmethod
    def email_exists(email):
        return User.objects.filter(email__iexact=email).exists()

    @staticmethod
    def get_customer_by_clerk_id(clerk_id):
        return User.objects.filter(clerk_user_id=clerk_id).first()

    @staticmethod
    def get_customer_by_id(customer_id):
        return User.objects.filter(id=customer_id).first()

    @staticmethod
    def get_customer_dict_by_id(customer_id):
        customer = User.objects.filter(id=customer_id).first()
        return UserSerializer(customer).data if customer else None

    @staticmethod
    def get_customer_dict_by_email(email):
        customer = User.objects.filter(email__iexact=email.strip().lower()).first()
        return UserSerializer(customer).data if customer else None

    @staticmethod
    def get_customer_dict_by_clerk_id(clerk_id):
        customer = User.objects.filter(clerk_user_id=clerk_id).first()
        return UserSerializer(customer).data if customer else None

    @staticmethod
    def create_or_update_customer(clerk_id, email, name=None, phone=None, requested_role=None):
        """Sync a consumer Clerk subject onto a User. Never creates an employee."""
        del requested_role
        normalized_email = email.strip().lower()
        customer = User.objects.filter(clerk_user_id=clerk_id).first()
        created = customer is None

        if created:
            existing_by_email = User.objects.filter(email=normalized_email).first()
            if existing_by_email:
                if Employee.objects.filter(clerk_user_id=clerk_id).exists():
                    raise ValueError('This identity belongs to an employee.')
                customer = existing_by_email
                customer.clerk_user_id = clerk_id
                customer.name = name or customer.name
                customer.phone = phone or customer.phone
                created = False
            else:
                customer = User(
                    clerk_user_id=clerk_id,
                    email=normalized_email,
                    name=name,
                    phone=phone,
                )
        else:
            if User.objects.filter(email=normalized_email).exclude(id=customer.id).exists():
                raise ValueError('This email address is already associated with another account.')
            customer.email = normalized_email
            customer.name = name
            customer.phone = phone

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
        return {'customer': UserSerializer(customer).data, 'created': created}

    @staticmethod
    def get_or_create_authenticated_customer(clerk_id, email=None, name=None):
        customer = User.objects.filter(clerk_user_id=clerk_id).first()
        if customer:
            update_fields = []
            if email:
                normalized_email = email.strip().lower()
                if customer.email != normalized_email:
                    email_taken = User.objects.filter(email=normalized_email).exclude(id=customer.id).exists()
                    if email_taken:
                        raise ValueError('This email address is already associated with another account.')
                    customer.email = normalized_email
                    update_fields.append('email')
            if update_fields:
                update_fields.append('updated_at')
                customer.save(update_fields=update_fields)
            return customer

        safe_email = email or f'{clerk_id}@users.invalid'
        customer, _created = CustomerRepository.create_or_update_customer(
            clerk_id=clerk_id,
            email=safe_email,
            name=name,
        )
        return customer

    @staticmethod
    def deactivate_customer(clerk_id):
        return User.objects.filter(clerk_user_id=clerk_id).update(is_active=False)

    @staticmethod
    def deactivate_employee(clerk_id):
        return Employee.objects.filter(clerk_user_id=clerk_id).update(is_active=False)

    @staticmethod
    def get_active_employee_by_clerk_id(clerk_id):
        return Employee.objects.select_related('user').filter(
            clerk_user_id=clerk_id,
            is_active=True,
            user__is_active=True,
        ).first()

    @staticmethod
    def list_staff(page, page_size, search=''):
        queryset = Employee.objects.select_related('user')
        if search:
            queryset = queryset.filter(Q(user__email__icontains=search) | Q(user__name__icontains=search))
        queryset = queryset.order_by('user__email')
        total = queryset.count()
        start = (page - 1) * page_size
        return {
            'items': StaffSerializer(queryset[start:start + page_size], many=True).data,
            'pagination': _pagination(page, page_size, total),
        }

    @staticmethod
    def get_staff(employee_id):
        employee = Employee.objects.select_related('user').filter(id=employee_id).first()
        return StaffSerializer(employee).data if employee else None

    @staticmethod
    def count_active_admins():
        return Employee.objects.filter(role=Employee.Role.ADMIN, is_active=True, user__is_active=True).count()

    @staticmethod
    def update_staff(employee_id, data):
        employee = Employee.objects.select_related('user').filter(id=employee_id).first()
        if not employee:
            return None
        for key, value in data.items():
            setattr(employee, key, value)
        employee.save(update_fields=[*data.keys(), 'updated_at'])
        return StaffSerializer(employee).data

    @staticmethod
    def update_profile(customer_id, data):
        customer = User.objects.filter(id=customer_id).first()
        if not customer:
            return 'User not found.', None

        if 'email' in data:
            new_email = data['email'].strip().lower()
            if new_email != customer.email:
                if User.objects.filter(email=new_email).exclude(id=customer.id).exists():
                    return 'This email address is already associated with another account.', None
                customer.email = new_email

        for key in ('name', 'phone'):
            if key in data:
                setattr(customer, key, data[key])

        update_fields = [key for key in ('name', 'phone') if key in data]
        if 'email' in data:
            update_fields.append('email')
        update_fields.append('updated_at')
        customer.save(update_fields=update_fields)
        return None, UserSerializer(customer).data

    @staticmethod
    def list_users(page, page_size, search=''):
        queryset = User.objects.select_related('employee').all()
        if search:
            queryset = queryset.filter(Q(email__icontains=search) | Q(name__icontains=search))
        queryset = queryset.order_by('email', 'id')
        total = queryset.count()
        start = (page - 1) * page_size
        return {
            'items': [_user_management_row(user) for user in queryset[start:start + page_size]],
            'pagination': _pagination(page, page_size, total),
        }

    @staticmethod
    def promote_to_employee(user_id, role):
        if role not in {Employee.Role.STAFF, Employee.Role.ADMIN}:
            return 'Choose a valid employee role.', None
        user = User.objects.filter(id=user_id).first()
        if not user:
            return 'User not found.', None
        employee = Employee.objects.filter(user=user).first()
        created = employee is None
        if employee is None:
            employee = Employee(user=user, role=role, is_active=True)
            employee.save()
        elif employee.role != role:
            employee.role = role
            employee.save(update_fields=['role', 'updated_at'])
        return None, _employee_management_row(employee, created)


def _pagination(page, page_size, total):
    return {
        'page': page,
        'page_size': page_size,
        'total_items': total,
        'total_pages': (total + page_size - 1) // page_size if page_size else 0,
    }


def _user_management_row(user):
    employee = getattr(user, 'employee', None)
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'phone': user.phone,
        'is_active': user.is_active,
        'is_employee': employee is not None,
        'employee_id': employee.id if employee else None,
        'employee_role': employee.role if employee else None,
        'employee_is_active': employee.is_active if employee else None,
        'login_ready': bool(employee and employee.clerk_user_id),
        'created_at': user.created_at,
    }


def _employee_management_row(employee, created):
    row = _user_management_row(employee.user)
    row['created'] = created
    return row

