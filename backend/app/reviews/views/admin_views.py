from app.reviews.services.admin_service import ReviewAdminService
from app.reviews.validators import ReviewAdminUpdateValidator, ReviewListValidator
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class AdminReviewView(AdminAPIView):
    def get(self, request):
        validator = ReviewListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid review filters', err=validator.errors, status_code=400))
        error, data = ReviewAdminService.list_reviews(validator.validated_data)
        return get_response(SuccessResponse(data=data, message='Reviews fetched successfully'))


class AdminReviewDetailView(AdminAPIView):
    def patch(self, request, review_id):
        validator = ReviewAdminUpdateValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid review status', err=validator.errors, status_code=400))
        error, data = ReviewAdminService.update_status(review_id, validator.validated_data['status'])
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='Review moderation updated'))

    def delete(self, request, review_id):
        error, data = ReviewAdminService.delete(review_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='Review deleted'))
