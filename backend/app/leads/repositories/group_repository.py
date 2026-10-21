from django.db import IntegrityError, transaction

from app.accounts.models import Customer
from app.leads.constants import PERMISSION_CATALOGUE, SALES_GROUP_CODE, SALES_GROUP_NAME, SALES_PERMISSIONS
from app.leads.models import StaffGroupMembership, StaffGroupPermission, StaffSecurityGroup
from app.leads.serializers import LeadPersonSerializer


def _permission_codes(group):
    return list(group.permissions.order_by('code').values_list('code', flat=True))


def _member_payload(membership):
    person = LeadPersonSerializer(membership.customer).data
    person['membership_id'] = membership.id
    person['is_active'] = membership.customer.is_active
    return person


def _group_payload(group):
    memberships = group.memberships.select_related('customer').order_by('customer__email')
    return {
        'id': group.id,
        'code': group.code,
        'name': group.name,
        'description': group.description,
        'is_system': group.is_system,
        'permissions': _permission_codes(group),
        'members': [_member_payload(membership) for membership in memberships],
    }


class GroupRepository:
    @staticmethod
    def permission_codes_for_customer(customer_id):
        return set(
            StaffGroupPermission.objects.filter(
                group__memberships__customer_id=customer_id,
            ).values_list('code', flat=True)
        )

    @staticmethod
    def ensure_sales_group():
        group, created = StaffSecurityGroup.objects.get_or_create(
            code=SALES_GROUP_CODE,
            defaults={
                'name': SALES_GROUP_NAME,
                'description': 'Default access for staff who work leads.',
                'is_system': True,
            },
        )
        if created:
            StaffGroupPermission.objects.bulk_create([
                StaffGroupPermission(group=group, code=code)
                for code in SALES_PERMISSIONS
            ])
        return group

    @staticmethod
    def ensure_sales_membership(customer_id):
        group = GroupRepository.ensure_sales_group()
        StaffGroupMembership.objects.get_or_create(customer_id=customer_id, group=group)

    @staticmethod
    def list_groups():
        groups = StaffSecurityGroup.objects.prefetch_related(
            'permissions', 'memberships__customer',
        ).order_by('name')
        eligible = Customer.objects.filter(
            is_active=True,
            role__in=(Customer.Role.STAFF, Customer.Role.ADMIN),
        ).order_by('name', 'email')
        return {
            'groups': [_group_payload(group) for group in groups],
            'catalogue': [
                {'code': code, 'label': label}
                for code, label in PERMISSION_CATALOGUE
            ],
            'eligible_staff': LeadPersonSerializer(eligible, many=True).data,
        }

    @staticmethod
    def get_group(group_id):
        group = StaffSecurityGroup.objects.prefetch_related(
            'permissions', 'memberships__customer',
        ).filter(id=group_id).first()
        return _group_payload(group) if group else None

    @staticmethod
    def create_group(name, description, permissions):
        try:
            with transaction.atomic():
                group = StaffSecurityGroup.objects.create(
                    code=_unique_code(name),
                    name=name,
                    description=description,
                    is_system=False,
                )
                StaffGroupPermission.objects.bulk_create([
                    StaffGroupPermission(group=group, code=code)
                    for code in permissions
                ])
        except IntegrityError:
            return None
        return GroupRepository.get_group(group.id)

    @staticmethod
    def update_group(group_id, changes):
        group = StaffSecurityGroup.objects.filter(id=group_id).first()
        if not group:
            return None
        try:
            with transaction.atomic():
                if 'name' in changes:
                    group.name = changes['name']
                if 'description' in changes:
                    group.description = changes['description']
                group.save(update_fields=['name', 'description', 'updated_at'])
                if 'permissions' in changes:
                    group.permissions.all().delete()
                    StaffGroupPermission.objects.bulk_create([
                        StaffGroupPermission(group=group, code=code)
                        for code in changes['permissions']
                    ])
        except IntegrityError:
            return 'duplicate'
        return GroupRepository.get_group(group.id)

    @staticmethod
    def list_memberships(group_id=None):
        queryset = StaffGroupMembership.objects.select_related('customer', 'group').order_by(
            'group__name', 'customer__email',
        )
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        return [
            {
                'id': membership.id,
                'group_id': membership.group_id,
                'group_name': membership.group.name,
                'customer': {
                    **LeadPersonSerializer(membership.customer).data,
                    'is_active': membership.customer.is_active,
                },
            }
            for membership in queryset
        ]

    @staticmethod
    def active_staff_or_admin(customer_id):
        return Customer.objects.filter(
            id=customer_id,
            is_active=True,
            role__in=(Customer.Role.STAFF, Customer.Role.ADMIN),
        ).exists()

    @staticmethod
    def add_membership(customer_id, group_id):
        if not StaffSecurityGroup.objects.filter(id=group_id).exists():
            return 'missing-group'
        if StaffGroupMembership.objects.filter(customer_id=customer_id, group_id=group_id).exists():
            return 'duplicate'
        membership = StaffGroupMembership.objects.create(customer_id=customer_id, group_id=group_id)
        return membership.id

    @staticmethod
    def delete_membership(membership_id):
        deleted, _ = StaffGroupMembership.objects.filter(id=membership_id).delete()
        return bool(deleted)


def _unique_code(name):
    base = ''.join(character.lower() if character.isalnum() else '-' for character in name).strip('-')
    base = '-'.join(part for part in base.split('-') if part)[:24] or 'group'
    code = base
    suffix = 2
    while StaffSecurityGroup.objects.filter(code=code).exists():
        code = f'{base}-{suffix}'[:40]
        suffix += 1
    return code
