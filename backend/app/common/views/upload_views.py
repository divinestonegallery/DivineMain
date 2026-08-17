from framework.core.base_apiviews import ServiceAuthenticatedAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.common.services.upload_service import UploadService
import logging

logger = logging.getLogger(__name__)

class PresignedUrlView(ServiceAuthenticatedAPIView):
    def get(self, request):
        filename = request.query_params.get('filename')
        file_type = request.query_params.get('file_type', 'application/octet-stream')
        folder = request.query_params.get('folder', 'uploads')
        
        if not filename:
            return get_response(ErrorResponse(message="filename query parameter is required", status_code=status.HTTP_400_BAD_REQUEST))
            
        try:
            error, data = UploadService.generate_presigned_url(filename, file_type, folder)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            
            return get_response(SuccessResponse(data=data, message="Presigned URL generated successfully"))
        except Exception as e:
            logger.error(f"Error in PresignedUrlView: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
