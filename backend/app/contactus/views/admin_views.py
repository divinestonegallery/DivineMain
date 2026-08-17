from framework.core.base_apiviews import ServiceAuthenticatedAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.contactus.services.admin_service import ContactUsAdminService
import logging

logger = logging.getLogger(__name__)

class AdminContactMessageView(ServiceAuthenticatedAPIView):
    def get(self, request):
        try:
            error, data = ContactUsAdminService.get_contact_messages()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Contact messages fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminContactMessageView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

class AdminCustomizeRequestView(ServiceAuthenticatedAPIView):
    def get(self, request):
        try:
            error, data = ContactUsAdminService.get_customize_requests()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Customize requests fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminCustomizeRequestView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
