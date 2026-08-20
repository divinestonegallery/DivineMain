from app.contactus.services.admin_service import ContactUsAdminService
from app.contactus.validators import ContactStatusValidator, CustomizeStatusValidator, RequestListValidator
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class AdminContactMessageView(AdminAPIView):
    def get(self, request):
        validator = RequestListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid contact filters', err=validator.errors, status_code=400))
        error, data = ContactUsAdminService.get_contact_messages(validator.validated_data)
        return get_response(SuccessResponse(data=data, message='Contact messages fetched successfully'))


class AdminContactMessageDetailView(AdminAPIView):
    def patch(self, request, message_id):
        validator = ContactStatusValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid contact status', err=validator.errors, status_code=400))
        error, data = ContactUsAdminService.update_contact_status(message_id, validator.validated_data['status'])
        if error:
            return get_response(ErrorResponse(message=error, status_code=404 if 'not found' in error else 400))
        return get_response(SuccessResponse(data=data, message='Contact status updated'))


class AdminCustomizeRequestView(AdminAPIView):
    def get(self, request):
        validator = RequestListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid customization filters', err=validator.errors, status_code=400))
        error, data = ContactUsAdminService.get_customize_requests(validator.validated_data)
        return get_response(SuccessResponse(data=data, message='Customization requests fetched successfully'))


class AdminCustomizeRequestDetailView(AdminAPIView):
    def patch(self, request, request_id):
        validator = CustomizeStatusValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid customization status', err=validator.errors, status_code=400))
        error, data = ContactUsAdminService.update_customize_status(request_id, validator.validated_data['status'])
        if error:
            return get_response(ErrorResponse(message=error, status_code=404 if 'not found' in error else 400))
        return get_response(SuccessResponse(data=data, message='Customization status updated'))
