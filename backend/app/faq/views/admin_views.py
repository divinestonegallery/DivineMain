from rest_framework import status
from drf_spectacular.utils import extend_schema
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from app.faq.services.admin_service import FAQAdminService
from app.faq.validators import FAQValidator
import logging

logger = logging.getLogger(__name__)

class AdminFAQListView(AdminAPIView):
    @extend_schema(operation_id='admin_faqs_list')
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
            validator = FAQValidator(data=request.data)
            if not validator.is_valid():
                return get_response(ErrorResponse(message='Invalid FAQ', err=validator.errors, status_code=400))
            error, data = FAQAdminService.create_faq(validator.validated_data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQ created successfully", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in AdminFAQListView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

class AdminFAQDetailView(AdminAPIView):
    @extend_schema(operation_id='admin_faqs_retrieve')
    def get(self, request, faq_id):
        try:
            error, data = FAQAdminService.get_faq(faq_id)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND if 'not found' in error.lower() else status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQ details fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminFAQDetailView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def patch(self, request, faq_id):
        try:
            validator = FAQValidator(data=request.data, partial=True)
            if not validator.is_valid():
                return get_response(ErrorResponse(message='Invalid FAQ update', err=validator.errors, status_code=400))
            error, data = FAQAdminService.update_faq(faq_id, validator.validated_data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_404_NOT_FOUND if 'not found' in error.lower() else status.HTTP_400_BAD_REQUEST))
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
