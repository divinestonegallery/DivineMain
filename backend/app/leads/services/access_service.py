from app.accounts.models import Customer
from app.leads.constants import (
    LEADS_ASSIGN,
    LEADS_VIEW_ALL,
    LEADS_VIEW_OWN,
    PERMISSION_CODES,
    PERMISSION_DENIED,
    STAFF_MANAGE_GROUPS,
)
from app.leads.repositories.group_repository import GroupRepository


def actor_from_user(user):
    return {
        'id': user.id,
        'role': getattr(user, 'role', None),
        'is_active': bool(getattr(user, 'is_active', False)),
        'name': getattr(user, 'name', '') or '',
        'email': getattr(user, 'email', '') or '',
    }


class AccessService:
    @staticmethod
    def permissions_for(actor):
        if not actor or not actor.get('is_active'):
            return set()
        if actor.get('role') == Customer.Role.ADMIN:
            return set(PERMISSION_CODES)
        if actor.get('role') != Customer.Role.STAFF:
            return set()
        return GroupRepository.permission_codes_for_customer(actor['id'])

    @staticmethod
    def require(actor, code):
        if code not in AccessService.permissions_for(actor):
            return PERMISSION_DENIED
        return None

    @staticmethod
    def can(actor, code):
        return code in AccessService.permissions_for(actor)

    @staticmethod
    def visibility_scope(actor):
        permissions = AccessService.permissions_for(actor)
        if actor.get('role') == Customer.Role.ADMIN or LEADS_VIEW_ALL in permissions:
            return {'unrestricted': True, 'actor_id': actor['id']}
        if LEADS_VIEW_OWN in permissions:
            return {'unrestricted': False, 'actor_id': actor['id']}
        return None

    @staticmethod
    def can_manage_groups(actor):
        return actor.get('role') == Customer.Role.ADMIN or AccessService.can(actor, STAFF_MANAGE_GROUPS)

    @staticmethod
    def can_assign_others(actor):
        return actor.get('role') == Customer.Role.ADMIN or AccessService.can(actor, LEADS_ASSIGN)

    @staticmethod
    def describe(actor):
        permissions = sorted(AccessService.permissions_for(actor))
        return {
            'id': actor['id'],
            'name': actor.get('name') or '',
            'email': actor.get('email') or '',
            'role': actor.get('role'),
            'permissions': permissions,
        }
