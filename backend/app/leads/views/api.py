from rest_framework import status

from app.leads.constants import DUPLICATE_CONFIRMATION
from app.leads.services.access_service import actor_from_user
from app.leads.services.group_service import GroupService
from app.leads.services.lead_service import LeadService
from app.leads.services.notification_service import NotificationService
from app.leads.validators import (
    ActivityListValidator,
    LeadAssignmentValidator,
    LeadListValidator,
    LeadNoteValidator,
    LeadUpdateValidator,
    LeadWriteValidator,
    MembershipListValidator,
    MembershipValidator,
    NotificationListValidator,
    StaffGroupUpdateValidator,
    StaffGroupWriteValidator,
)
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


def _actor(request):
    return actor_from_user(request.user)


def _status_for(error):
    lowered = error.lower()
    if 'not found' in lowered:
        return 404
    if 'permission' in lowered:
        return 403
    return 400


def service_response(error, data, message, success_status=status.HTTP_200_OK):
    if error == DUPLICATE_CONFIRMATION:
        return get_response(ErrorResponse(
            message='An open lead already matches this email or phone. Confirm to create another lead.',
            err=data,
            status_code=status.HTTP_409_CONFLICT,
        ))
    if error:
        return get_response(ErrorResponse(message=error, status_code=_status_for(error)))
    return get_response(SuccessResponse(data=data, message=message, status_code=success_status))


class LeadAccessView(AdminAPIView):
    def get(self, request):
        error, data = LeadService.access(_actor(request))
        return service_response(error, data, 'Lead access fetched')


class LeadAssigneeListView(AdminAPIView):
    def get(self, request):
        error, data = LeadService.list_assignees(_actor(request))
        return service_response(error, data, 'Assignees fetched')


class LeadCollectionView(AdminAPIView):
    def get(self, request):
        validator = LeadListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid lead filters', err=validator.errors, status_code=400))
        error, data = LeadService.list_leads(_actor(request), validator.validated_data)
        return service_response(error, data, 'Leads fetched')

    def post(self, request):
        validator = LeadWriteValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid lead', err=validator.errors, status_code=400))
        error, data = LeadService.create_lead(_actor(request), validator.validated_data)
        return service_response(error, data, 'Lead created', status.HTTP_201_CREATED)


class LeadDetailView(AdminAPIView):
    def get(self, request, lead_uid):
        error, data = LeadService.get_lead(_actor(request), lead_uid)
        return service_response(error, data, 'Lead fetched')

    def patch(self, request, lead_uid):
        validator = LeadUpdateValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid lead update', err=validator.errors, status_code=400))
        error, data = LeadService.update_lead(_actor(request), lead_uid, validator.validated_data)
        return service_response(error, data, 'Lead updated')


class LeadNoteCreateView(AdminAPIView):
    def post(self, request, lead_uid):
        validator = LeadNoteValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid note', err=validator.errors, status_code=400))
        error, data = LeadService.add_note(_actor(request), lead_uid, validator.validated_data['body'])
        return service_response(error, data, 'Note added', status.HTTP_201_CREATED)


class LeadAssignmentView(AdminAPIView):
    def post(self, request, lead_uid):
        validator = LeadAssignmentValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid assignment', err=validator.errors, status_code=400))
        error, data = LeadService.assign(_actor(request), lead_uid, validator.validated_data['assigned_to'])
        return service_response(error, data, 'Lead assignment updated')


class LeadActivityListView(AdminAPIView):
    def get(self, request, lead_uid):
        validator = ActivityListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid activity filters', err=validator.errors, status_code=400))
        error, data = LeadService.list_activity(_actor(request), lead_uid, validator.validated_data)
        return service_response(error, data, 'Lead activity fetched')


class NotificationListView(AdminAPIView):
    def get(self, request):
        validator = NotificationListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid notification filters', err=validator.errors, status_code=400))
        error, data = NotificationService.list_notifications(_actor(request), validator.validated_data)
        return service_response(error, data, 'Notifications fetched')


class NotificationReadView(AdminAPIView):
    def post(self, request, notification_id):
        error, data = NotificationService.mark_read(_actor(request), notification_id)
        return service_response(error, data, 'Notification marked read')


class StaffGroupCollectionView(AdminAPIView):
    def get(self, request):
        error, data = GroupService.list_groups(_actor(request))
        return service_response(error, data, 'Security groups fetched')

    def post(self, request):
        validator = StaffGroupWriteValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid security group', err=validator.errors, status_code=400))
        error, data = GroupService.create_group(_actor(request), validator.validated_data)
        return service_response(error, data, 'Security group created', status.HTTP_201_CREATED)


class StaffGroupDetailView(AdminAPIView):
    def patch(self, request, group_id):
        validator = StaffGroupUpdateValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid security group', err=validator.errors, status_code=400))
        error, data = GroupService.update_group(_actor(request), group_id, validator.validated_data)
        return service_response(error, data, 'Security group updated')


class StaffMembershipCollectionView(AdminAPIView):
    def get(self, request):
        validator = MembershipListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid membership filters', err=validator.errors, status_code=400))
        error, data = GroupService.list_memberships(_actor(request), validator.validated_data.get('group_id'))
        return service_response(error, data, 'Group memberships fetched')

    def post(self, request):
        validator = MembershipValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid membership', err=validator.errors, status_code=400))
        payload = validator.validated_data
        error, data = GroupService.add_membership(_actor(request), payload['customer_id'], payload['group_id'])
        return service_response(error, data, 'Group membership added', status.HTTP_201_CREATED)


class StaffMembershipDetailView(AdminAPIView):
    def delete(self, request, membership_id):
        error, data = GroupService.remove_membership(_actor(request), membership_id)
        return service_response(error, data, 'Group membership removed')
