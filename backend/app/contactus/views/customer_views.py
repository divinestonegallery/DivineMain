from app.contactus.services.customer_service import ContactUsCustomerService
from app.contactus.validators import ContactMessageValidator, CustomizeRequestValidator
from framework.core.base_apiviews import OpenAPIView, OptionalAuthenticatedAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class ContactMessageView(OpenAPIView):
    throttle_scope = 'contact'

    def post(self, request):
        validator = ContactMessageValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid contact message', err=validator.errors, status_code=400))
        error, data = ContactUsCustomerService.create_contact_message(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Contact message sent successfully', status_code=201))


class CustomizeRequestView(OptionalAuthenticatedAPIView):
    throttle_scope = 'customization'

    def post(self, request):
        validator = CustomizeRequestValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid customization request', err=validator.errors, status_code=400))
        actor_id = request.user.id if getattr(request.user, 'is_authenticated', False) else None
        error, data = ContactUsCustomerService.create_customize_request(validator.validated_data, user_id=actor_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Customization request submitted successfully', status_code=201))
