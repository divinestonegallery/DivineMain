from rest_framework import status

from app.common.services.upload_service import UploadService
from app.common.validators import CustomerPresignedUploadValidator, PresignedUploadValidator
from framework.core.base_apiviews import AdminAPIView, AuthenticatedAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class PresignedUrlView(AdminAPIView):
    throttle_scope = 'uploads'

    def post(self, request):
        validator = PresignedUploadValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid upload request', err=validator.errors, status_code=400))
        error, data = UploadService.create_presigned_upload(validator.validated_data, request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Presigned upload URL generated'))


class CustomizationPresignedUrlView(AuthenticatedAPIView):
    throttle_scope = 'uploads'

    def post(self, request):
        validator = CustomerPresignedUploadValidator(data=request.data)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid upload request', err=validator.errors, status_code=400))
        payload = {**validator.validated_data, 'purpose': 'customization_reference'}
        error, data = UploadService.create_presigned_upload(payload, request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Customization upload URL generated'))

    def get(self, request):
        legacy = {
            'filename': request.query_params.get('filename'),
            'content_type': request.query_params.get('content_type') or request.query_params.get('file_type'),
            'file_size': request.query_params.get('file_size'),
            'purpose': request.query_params.get('purpose', 'product_image'),
        }
        validator = PresignedUploadValidator(data=legacy)
        if not validator.is_valid():
            return get_response(ErrorResponse(
                message='filename, content_type and file_size are required. POST JSON is recommended.',
                err=validator.errors,
                status_code=status.HTTP_400_BAD_REQUEST,
            ))
        error, data = UploadService.create_presigned_upload(validator.validated_data, request.user.id)
        if error:
            return get_response(ErrorResponse(message=error, status_code=400))
        return get_response(SuccessResponse(data=data, message='Presigned upload URL generated'))
