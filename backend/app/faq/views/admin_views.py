from rest_framework import status
from framework.core.base_apiviews import OpenAPIView # In production, change to AuthenticatedAPIView or AdminAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from app.faq.services.admin_service import FAQAdminService
import logging

logger = logging.getLogger(__name__)

class AdminFAQListView(OpenAPIView):
    def get(self, request):
        try:
            error, data = FAQAdminService.get_all_faqs()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQs fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminFAQListView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def post(self, request):
        try:
            error, data = FAQAdminService.create_faq(request.data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQ created successfully", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in AdminFAQListView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

class AdminFAQDetailView(OpenAPIView):
    def get(self, request, faq_id):
        try:
            error, data = FAQAdminService.get_faq(faq_id)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND if error == "FAQ not found" else status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQ details fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminFAQDetailView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def patch(self, request, faq_id):
        try:
            error, data = FAQAdminService.update_faq(faq_id, request.data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND if error == "FAQ not found" else status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQ updated successfully"))
        except Exception as e:
            logger.error(f"Error in AdminFAQDetailView PATCH: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def delete(self, request, faq_id):
        try:
            error, data = FAQAdminService.delete_faq(faq_id)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND))
            return get_response(SuccessResponse(data=data, message="FAQ deleted successfully"))
        except Exception as e:
            logger.error(f"Error in AdminFAQDetailView DELETE: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
