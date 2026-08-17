from rest_framework import status

from app.accounts.services.staff_service import StaffService
from app.accounts.validators import StaffInviteValidator, StaffListValidator, StaffUpdateValidator
from framework.core.base_apiviews import OwnerAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class StaffListCreateView(OwnerAPIView):
    def get(self, request):
        validator = StaffListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid query parameters', err=validator.errors, status_code=400))
        error, data = StaffService.list_staff(validator.validated_data)
        return get_response(SuccessResponse(data=data, message='Staff fetched successfully'))

    def post(self, request):
        validator = StaffInviteValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid invitation', err=validator.errors, status_code=400))
        error, data = StaffService.invite_staff(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Staff invitation sent', status_code=status.HTTP_201_CREATED))


class StaffDetailView(OwnerAPIView):
    def patch(self, request, customer_id):
        validator = StaffUpdateValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid staff update', err=validator.errors, status_code=400))
        error, data = StaffService.update_staff(customer_id, validator.validated_data, request.user.id)
        if error:
            code = 404 if error == 'Staff member not found.' else 400
            return get_response(ErrorResponse(message=error, status_code=code))
        return get_response(SuccessResponse(data=data, message='Staff access updated'))
