from framework.core.base_apiviews import OpenAPIView, AuthenticatedAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.contactus.services.customer_service import ContactUsCustomerService
import logging

logger = logging.getLogger(__name__)

class ContactMessageView(OpenAPIView):
    def post(self, request):
        try:
            error, data = ContactUsCustomerService.create_contact_message(request.data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Contact message sent successfully", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in ContactMessageView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

class CustomizeRequestView(OpenAPIView):
    def post(self, request):
        try:
            # If user is authenticated via Clerk, their ID will be in request.user.username (assuming ClerkAuth sets it there)
            # For OpenAPIView, it's not strictly authenticated, so we pass None or check request headers if needed.
            # We'll just pass None for now; if they are logged in, we could extract clerk_id from a token.
            error, data = ContactUsCustomerService.create_customize_request(request.data, clerk_id=None)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Customize request submitted successfully", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in CustomizeRequestView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
