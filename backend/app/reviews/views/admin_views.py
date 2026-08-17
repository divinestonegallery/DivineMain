from framework.core.base_apiviews import ServiceAuthenticatedAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.reviews.services.admin_service import ReviewAdminService
import logging

logger = logging.getLogger(__name__)

class AdminReviewView(ServiceAuthenticatedAPIView):
    def get(self, request):
        try:
            error, data = ReviewAdminService.get_all_reviews()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Reviews fetched successfully"))
        except Exception as e:
            logger.error(f"Error in AdminReviewView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

    def post(self, request):
        try:
            error, data = ReviewAdminService.create_review(request.data)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Review created successfully", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in AdminReviewView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
