from rest_framework import status
from framework.core.base_apiviews import OpenAPIView # In production, change to AuthenticatedAPIView for create
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from app.reviews.services.customer_service import ReviewCustomerService
import logging

logger = logging.getLogger(__name__)

class CustomerProductReviewListView(OpenAPIView):
    def get(self, request, product_id):
        try:
            error, data = ReviewCustomerService.get_product_reviews(product_id)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Reviews fetched successfully"))
        except Exception as e:
            logger.error(f"Error in CustomerProductReviewListView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))

class CustomerReviewCreateView(OpenAPIView): # Using OpenAPIView for ease of testing in Postman without auth
    def post(self, request):
        try:
            error, data = ReviewCustomerService.create_review(request.data, request.user)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Review submitted successfully and is pending approval", status_code=status.HTTP_201_CREATED))
        except Exception as e:
            logger.error(f"Error in CustomerReviewCreateView POST: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
