from app.reviews.services.customer_service import ReviewCustomerService
from app.reviews.validators import ReviewCreateValidator
from framework.core.base_apiviews import AuthenticatedAPIView, OpenAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class CustomerProductReviewListView(OpenAPIView):
    def get(self, request, product_id):
        error, data = ReviewCustomerService.get_product_reviews(product_id)
        return get_response(SuccessResponse(data=data, message='Reviews fetched successfully'))


class CustomerReviewCreateView(AuthenticatedAPIView):
    throttle_scope = 'reviews'

    def post(self, request):
        validator = ReviewCreateValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid review', err=validator.errors, status_code=400))
        error, data = ReviewCustomerService.create_review(validator.validated_data, request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Review submitted for moderation', status_code=201))
