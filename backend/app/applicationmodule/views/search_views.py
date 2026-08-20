from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.applicationmodule.services.search_service import SearchService
from app.applicationmodule.validators import GlobalSearchValidator
import logging

logger = logging.getLogger(__name__)

class GlobalSearchView(OpenAPIView):
    def get(self, request):
        try:
            validator = GlobalSearchValidator(data=request.query_params)
            if not validator.is_valid():
                return get_response(ErrorResponse(message='Invalid search query', err=validator.errors, status_code=400))
            query = validator.validated_data.get('q', '')
            if not query:
                return get_response(SuccessResponse(data={"products": [], "categories": [], "deities": []}, message="Empty search query"))
            
            error, data = SearchService.global_search(query)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Search results fetched successfully"))
        except Exception as e:
            logger.error(f"Error in GlobalSearchView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
