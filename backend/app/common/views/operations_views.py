from rest_framework import status

from app.common.services.operations_service import OperationsService
from app.common.validators import LogListValidator
from framework.core.base_apiviews import AdminAPIView, OpenAPIView
from framework.core.responses import ErrorResponse, SuccessResponse
from framework.utils import get_response


class AuditLogListView(AdminAPIView):
    def get(self, request):
        validator = LogListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid query parameters', err=validator.errors, status_code=400))
        error, data = OperationsService.list_audits(validator.validated_data)
        return get_response(ErrorResponse(message=error, status_code=400)) if error else get_response(SuccessResponse(data=data))


class APIErrorLogListView(AdminAPIView):
    def get(self, request):
        validator = LogListValidator(data=request.query_params)
        if not validator.is_valid():
            return get_response(ErrorResponse(message='Invalid query parameters', err=validator.errors, status_code=400))
        error, data = OperationsService.list_errors(validator.validated_data)
        return get_response(ErrorResponse(message=error, status_code=400)) if error else get_response(SuccessResponse(data=data))


class ReadinessView(OpenAPIView):
    throttle_scope = 'anon'

    def get(self, request):
        error, data = OperationsService.readiness()
        if error:
            return get_response(ErrorResponse(message=error, status_code=status.HTTP_503_SERVICE_UNAVAILABLE))
        return get_response(SuccessResponse(data=data, message='Service is ready'))
