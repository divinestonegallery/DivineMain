from rest_framework import status
from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from app.faq.services.customer_service import FAQCustomerService
import logging

logger = logging.getLogger(__name__)

class CustomerFAQListView(OpenAPIView):
    def get(self, request):
        try:
            error, data = FAQCustomerService.get_active_faqs()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="FAQs fetched successfully"))
        except Exception as e:
            logger.error(f"Error in CustomerFAQListView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
