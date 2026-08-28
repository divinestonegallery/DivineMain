from rest_framework import status

from app.faq.services.admin_service import FAQAdminService
from app.faq.validators import FAQValidator
from framework.core.base_apiviews import AdminAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class AdminFAQListView(AdminAPIView):
    def get(self, request):
        error, data = FAQAdminService.list_all_faqs()
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='FAQs fetched successfully'))

    def post(self, request):
        validator = FAQValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid FAQ', err=validator.errors, status_code=400))
        error, data = FAQAdminService.create_faq(validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='FAQ created successfully', status_code=status.HTTP_201_CREATED))


class AdminFAQDetailView(AdminAPIView):
    def get(self, request, faq_id):
        error, data = FAQAdminService.get_faq_details_by_id(faq_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='FAQ fetched successfully'))

    def patch(self, request, faq_id):
        validator = FAQValidator(data=request.data, partial=True)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid FAQ update', err=validator.errors, status_code=400))
        error, data = FAQAdminService.update_faq(faq_id, validator.validated_data)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404 if 'not found' in error.lower() else 400))
        return get_response(SuccessResponse(data=data, message='FAQ updated successfully'))

    put = patch

    def delete(self, request, faq_id):
        error, data = FAQAdminService.deactivate_faq(faq_id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=404))
        return get_response(SuccessResponse(data=data, message='FAQ deactivated successfully'))
