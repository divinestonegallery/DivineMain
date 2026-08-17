from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.applicationmodule.services.home_service import HomeService
import logging

logger = logging.getLogger(__name__)

class HomeView(OpenAPIView):
    def get(self, request):
        try:
            error, data = HomeService.get_home()
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Home page blocks fetched successfully"))
        except Exception as e:
            logger.error(f"Error in HomeView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
