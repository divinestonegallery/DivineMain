from framework.core.base_apiviews import OpenAPIView
from framework.core.responses import SuccessResponse, ErrorResponse
from framework.utils import get_response
from rest_framework import status
from app.applicationmodule.services.search_service import SearchService
import logging

logger = logging.getLogger(__name__)

class GlobalSearchView(OpenAPIView):
    def get(self, request):
        try:
            query = request.query_params.get('q', '').strip()
            if not query:
                return get_response(SuccessResponse(data={"products": [], "categories": [], "dieties": []}, message="Empty search query"))
            
            error, data = SearchService.global_search(query)
            if error:
                return get_response(ErrorResponse(message=error, status_code=status.HTTP_400_BAD_REQUEST))
            return get_response(SuccessResponse(data=data, message="Search results fetched successfully"))
        except Exception as e:
            logger.error(f"Error in GlobalSearchView GET: {str(e)}", exc_info=True)
            return get_response(ErrorResponse(message="An unexpected error occurred", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR))
