from django.db import transaction

from app.leads.constants import GROUP_NOT_FOUND, MEMBER_REJECTED, MEMBERSHIP_NOT_FOUND, PERMISSION_DENIED
from app.leads.repositories.group_repository import GroupRepository
from app.leads.services.access_service import AccessService


class GroupService:
    @staticmethod
    def _guard(actor):
        if not AccessService.can_manage_groups(actor):
            return PERMISSION_DENIED
        return None

    @staticmethod
    def list_groups(actor):
        error = GroupService._guard(actor)
        if error:
            return error, None
        return None, GroupRepository.list_groups()

    @staticmethod
    def create_group(actor, data):
        error = GroupService._guard(actor)
        if error:
            return error, None
        with transaction.atomic():
            group = GroupRepository.create_group(
                data['name'],
                data.get('description', ''),
                data.get('permissions', []),
            )
        if not group:
            return 'A security group with this name already exists.', None
        return None, group

    @staticmethod
    def update_group(actor, group_id, data):
        error = GroupService._guard(actor)
        if error:
            return error, None
        with transaction.atomic():
            group = GroupRepository.update_group(group_id, data)
        if group is None:
            return GROUP_NOT_FOUND, None
        if group == 'duplicate':
            return 'A security group with this name already exists.', None
        return None, group

    @staticmethod
    def list_memberships(actor, group_id=None):
        error = GroupService._guard(actor)
        if error:
            return error, None
        return None, {'items': GroupRepository.list_memberships(group_id)}

    @staticmethod
    def add_membership(actor, customer_id, group_id):
        error = GroupService._guard(actor)
        if error:
            return error, None
        if not GroupRepository.active_staff_or_admin(customer_id):
            return MEMBER_REJECTED, None
        with transaction.atomic():
            result = GroupRepository.add_membership(customer_id, group_id)
        if result == 'missing-group':
            return GROUP_NOT_FOUND, None
        if result == 'duplicate':
            return 'This person is already in that group.', None
        return None, {'id': result, 'customer_id': customer_id, 'group_id': group_id}

    @staticmethod
    def remove_membership(actor, membership_id):
        error = GroupService._guard(actor)
        if error:
            return error, None
        with transaction.atomic():
            deleted = GroupRepository.delete_membership(membership_id)
        if not deleted:
            return MEMBERSHIP_NOT_FOUND, None
        return None, {'id': membership_id, 'removed': True}
